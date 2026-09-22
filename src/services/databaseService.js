import { getSupabase, isSupabaseConfigured, initDatabaseConfig } from './supabaseClient.js';
import { generateHealthWalletId } from './patientService.js';
import * as localAuth from './authService.js';
import * as localPatient from './patientService.js';
import * as localRecord from './recordService.js';
import * as localLab from './labService.js';
import * as localRx from './prescriptionService.js';
import * as localAudit from './accessLogService.js';

function normalizeRole(role) {
  if (!role) return 'patient';
  const r = role.toLowerCase().replace('-', '_').trim();
  if (r === 'pharmacy' || r === 'pharmacist') return 'pharmacist';
  if (r === 'records' || r === 'recordkeeper' || r === 'record_keeper') return 'record_keeper';
  if (r === 'doc' || r === 'doctor') return 'doctor';
  if (r === 'lab') return 'lab';
  if (r === 'pat' || r === 'patient') return 'patient';
  return r;
}

function roleToDb(role) {
  const norm = normalizeRole(role);
  if (norm === 'doctor') return 'DOCTOR';
  if (norm === 'patient') return 'PATIENT';
  if (norm === 'pharmacist') return 'PHARMACIST';
  if (norm === 'lab') return 'LAB';
  if (norm === 'record_keeper') return 'RECORD_KEEPER';
  return norm.toUpperCase();
}

/**
 * ========================================================
 * HEALTH WALLET — CENTRAL DATABASE SERVICE
 * Connects directly to Supabase PostgreSQL:
 * - users
 * - patients
 * - medical_records
 * - lab_reports
 * - medications
 * - audit_logs
 *
 * Seamlessly interfaces with Supabase PostgreSQL with
 * transparent fallback to local persistent storage.
 * ========================================================
 */
export class CentralDatabaseService {
  /**
   * 1. USER AUTHENTICATION WITH ROLE VALIDATION
   * Authenticates against Supabase users table and validates selected role.
   */
  async login(loginId, password, selectedRole = null) {
    await initDatabaseConfig();
    const cleanUsername = (loginId || '').trim();
    const cleanPass = password || '';

    if (!cleanUsername || !cleanPass) {
      throw new Error('Username and Password are required.');
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();

      // Look up user by login_id (username) first
      let { data: user, error } = await supabase
        .from('users')
        .select('*')
        .ilike('login_id', cleanUsername)
        .maybeSingle();

      // If not found by login_id, check by health_wallet_id
      if (!user) {
        const { data: userByHw } = await supabase
          .from('users')
          .select('*')
          .ilike('health_wallet_id', cleanUsername)
          .maybeSingle();
        user = userByHw;
      }

      let patient = null;

      // If user still not found directly, check patients table
      if (!user) {
        const { data: pat } = await supabase
          .from('patients')
          .select('*')
          .ilike('health_wallet_id', cleanUsername)
          .maybeSingle();

        if (pat) {
          patient = pat;
          const { data: linkedUser } = await supabase
            .from('users')
            .select('*')
            .eq('health_wallet_id', pat.health_wallet_id)
            .maybeSingle();
          user = linkedUser;
        }
      }

      if (error || !user) {
        throw new Error('Invalid username or password.');
      }

      if (user.password !== cleanPass) {
        throw new Error('Invalid username or password.');
      }

      // Check Role Validation
      const userNormRole = normalizeRole(user.role);
      if (selectedRole) {
        const expectedNormRole = normalizeRole(selectedRole);
        if (userNormRole !== expectedNormRole) {
          const registeredRoleLabel = user.role.toUpperCase();
          const selectedRoleLabel = selectedRole.toUpperCase();
          throw new Error(`Role mismatch: This account is registered as ${registeredRoleLabel}, not ${selectedRoleLabel}. Please select the correct account type to sign in.`);
        }
      }

      // Load patient profile if patient
      if (!patient && userNormRole === 'patient') {
        const { data: patProfile } = await supabase
          .from('patients')
          .select('*')
          .eq('health_wallet_id', user.health_wallet_id || user.login_id)
          .maybeSingle();
        patient = patProfile || null;
      }

      // Shape doctor profile if doctor
      let doctor = null;
      if (userNormRole === 'doctor') {
        doctor = {
          id: user.doctor_id || user.login_id || user.id,
          user_id: user.id,
          full_name: user.name,
          doctor_id: user.doctor_id || user.login_id,
          medical_registration_number: user.doctor_id || user.login_id,
          specialization: user.specialization || 'Attending Physician',
          organization: user.organization || 'Medical Center'
        };
      }

      // Log audit
      try {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          actor: user.name,
          role: user.role.toUpperCase(),
          action: 'LOGIN',
          purpose: `User authenticated as ${user.role}`
        });
      } catch (e) {
        console.warn('Audit error:', e.message);
      }

      const safeUser = {
        ...user,
        full_name: user.name,
        role: userNormRole,
        db_role: user.role,
        entity_id: user.doctor_id || user.pharmacy_id || user.lab_id || user.record_keeper_id || user.health_wallet_id || user.login_id
      };
      delete safeUser.password;

      return {
        currentUser: safeUser,
        currentDoctor: doctor,
        currentPatient: patient ? { ...patient, full_name: patient.name, bloodGroup: patient.blood_group } : null
      };
    }

    // Local fallback via server
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/db/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginId: cleanUsername,
          password: cleanPass,
          role: selectedRole
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid username or password.');
      }
      return {
        currentUser: { ...data.user, role: normalizeRole(data.user.role) },
        currentDoctor: data.doctor,
        currentPatient: data.patient ? { ...data.patient, full_name: data.patient.full_name || data.patient.name } : null
      };
    } else {
      const { getDb } = await import('../../serverDb.js');
      const db = getDb();
      let user = db.prepare('SELECT * FROM users WHERE LOWER(login_id) = LOWER(?)').get(cleanUsername);
      if (!user) {
        const pat = db.prepare('SELECT * FROM patients WHERE LOWER(health_wallet_id) = LOWER(?)').get(cleanUsername);
        if (pat) {
          user = db.prepare('SELECT * FROM users WHERE id = ?').get(pat.user_id);
        }
      }
      if (!user || user.password !== cleanPass) {
        throw new Error('Invalid username or password.');
      }
      const userNormRole = normalizeRole(user.role);
      if (selectedRole) {
        const expectedNormRole = normalizeRole(selectedRole);
        if (userNormRole !== expectedNormRole) {
          throw new Error(`Role mismatch: This account is registered as ${user.role.toUpperCase()}, not ${selectedRole.toUpperCase()}.`);
        }
      }
      let patient = null;
      let doctor = null;
      if (userNormRole === 'patient') {
        patient = db.prepare('SELECT * FROM patients WHERE user_id = ? OR LOWER(health_wallet_id) = LOWER(?)').get(user.id, cleanUsername);
      }
      if (userNormRole === 'doctor') {
        doctor = db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(user.id);
        if (!doctor) {
          doctor = {
            id: user.doctor_id || user.login_id,
            user_id: user.id,
            full_name: user.full_name || user.name,
            medical_registration_number: user.doctor_id || user.login_id,
            organization: user.organization || 'Medical Center'
          };
        }
      }
      const safeUser = { ...user, full_name: user.full_name || user.name, role: userNormRole };
      delete safeUser.password;
      return {
        currentUser: safeUser,
        currentDoctor: doctor,
        currentPatient: patient ? { ...patient, full_name: patient.full_name || patient.name } : null
      };
    }
  }

  /**
   * 2. NEW USER / ACTIVATE ACCOUNT
   * Registers a brand new account for any of the 5 roles in Supabase.
   */
  async registerAccount({
    role,
    name,
    fullName,
    username,
    loginId,
    password,
    doctorId = null,
    healthWalletId = null,
    pharmacyId = null,
    labId = null,
    recordKeeperId = null,
    organization = null,
    dateOfBirth = null,
    gender = null,
    bloodGroup = 'O+',
    allergies = 'None',
    phone = null,
    mobileNumber = null,
    aadhaarNumber = null,
    state = null,
    stateCode = 'TN'
  }) {
    await initDatabaseConfig();
    const cleanName = (name || fullName || '').trim();
    const cleanUsername = (username || loginId || '').trim();
    const cleanPass = password || '';
    const cleanPhone = (mobileNumber || phone || '').trim();
    const cleanAadhaar = (aadhaarNumber || '').replace(/\D/g, '');
    const cleanState = (state || '').trim();
    const cleanStateCode = (stateCode || 'TN').toUpperCase().trim();
    const normRole = normalizeRole(role);
    const dbRole = roleToDb(normRole);

    if (!cleanName || !cleanUsername || !cleanPass) {
      throw new Error('Name, Username, and Password are required.');
    }

    if (normRole === 'patient') {
      if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
        throw new Error('Please enter a valid 10-digit Indian mobile number.');
      }
      if (!cleanAadhaar || !/^\d{12}$/.test(cleanAadhaar)) {
        throw new Error('Please enter a valid 12-digit Aadhaar number.');
      }
      if (!cleanState) {
        throw new Error('Please select a State.');
      }
    }

    let hwId = healthWalletId ? healthWalletId.trim() : null;
    if (normRole === 'patient' && !hwId) {
      hwId = generateHealthWalletId(cleanStateCode);
    }

    const assignedEntityId = (
      doctorId ||
      pharmacyId ||
      labId ||
      recordKeeperId ||
      hwId ||
      cleanUsername
    );

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();

      // Check if username already taken
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .ilike('login_id', cleanUsername)
        .maybeSingle();

      if (existing) {
        throw new Error(`Username "${cleanUsername}" is already taken. Please choose another.`);
      }

      // Check if Aadhaar already taken for patient
      if (normRole === 'patient' && cleanAadhaar) {
        const { data: existingAadhaar } = await supabase
          .from('patients')
          .select('id')
          .eq('aadhaar_number', cleanAadhaar)
          .maybeSingle();
        if (existingAadhaar) {
          throw new Error('An account with this Aadhaar Number already exists. Duplicate patient accounts are not allowed.');
        }
      }

      // Generate and verify unique Health Wallet ID for patient
      if (normRole === 'patient') {
        let attempts = 0;
        let isUnique = false;
        while (attempts < 30 && !isUnique) {
          if (!hwId) {
            hwId = generateHealthWalletId(cleanStateCode);
          }
          const { data: existingHw } = await supabase
            .from('patients')
            .select('id')
            .ilike('health_wallet_id', hwId)
            .maybeSingle();
          if (existingHw) {
            hwId = generateHealthWalletId(cleanStateCode);
            attempts++;
          } else {
            isUnique = true;
          }
        }
        if (!isUnique) {
          throw new Error('Failed to generate a unique Health Wallet ID. Please try again.');
        }
      }

      // Insert user account
      const { data: user, error: userErr } = await supabase
        .from('users')
        .insert({
          name: cleanName,
          login_id: cleanUsername,
          role: dbRole,
          password: cleanPass,
          health_wallet_id: hwId,
          doctor_id: normRole === 'doctor' ? assignedEntityId : null,
          pharmacy_id: normRole === 'pharmacist' ? assignedEntityId : null,
          lab_id: normRole === 'lab' ? assignedEntityId : null,
          record_keeper_id: normRole === 'record_keeper' ? assignedEntityId : null,
          organization: organization || (
            normRole === 'doctor' ? 'Healthcare Provider' :
            normRole === 'pharmacist' ? 'Licensed Pharmacy' :
            normRole === 'lab' ? 'Diagnostic Laboratory' :
            normRole === 'record_keeper' ? 'Medical Records Dept' : 'Personal Portal'
          )
        })
        .select()
        .single();

      if (userErr) {
        throw new Error(`Failed to create account: ${userErr.message}`);
      }

      // If patient, insert into patients table
      let patient = null;
      if (normRole === 'patient') {

        const { data: pat, error: patErr } = await supabase
          .from('patients')
          .insert({
            health_wallet_id: hwId,
            name: cleanName,
            date_of_birth: dateOfBirth || null,
            gender: gender || null,
            blood_group: bloodGroup || 'O+',
            allergies: allergies || 'None',
            phone: cleanPhone,
            mobile_number: cleanPhone,
            aadhaar_number: cleanAadhaar,
            state: cleanState,
            state_code: cleanStateCode
          })
          .select()
          .single();

        if (patErr) {
          throw new Error(`Failed to activate patient record: ${patErr.message}`);
        }
        patient = pat;
      }

      // Audit log
      try {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          actor: cleanName,
          role: dbRole,
          patient_hw_id: hwId,
          action: 'ACCOUNT_CREATED',
          purpose: `Created ${dbRole} account for ${cleanName}`
        });
      } catch (e) {
        console.warn('Audit error:', e.message);
      }

      return {
        user: { ...user, full_name: cleanName, role: normRole },
        patient: patient ? { ...patient, full_name: cleanName, bloodGroup: patient.blood_group } : null,
        role: dbRole,
        roleId: normRole,
        name: cleanName,
        username: cleanUsername,
        healthWalletId: hwId,
        entityId: assignedEntityId
      };
    }

    // Local server fallback
    if (typeof window !== 'undefined') {
      const res = await fetch('/api/db/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: dbRole,
          name: cleanName,
          username: cleanUsername,
          password: cleanPass,
          health_wallet_id: hwId,
          doctor_id: normRole === 'doctor' ? assignedEntityId : null,
          pharmacy_id: normRole === 'pharmacist' ? assignedEntityId : null,
          lab_id: normRole === 'lab' ? assignedEntityId : null,
          record_keeper_id: normRole === 'record_keeper' ? assignedEntityId : null,
          date_of_birth: dateOfBirth,
          gender,
          blood_group: bloodGroup,
          allergies,
          phone: cleanPhone,
          mobile_number: cleanPhone,
          aadhaar_number: cleanAadhaar,
          state: cleanState,
          state_code: cleanStateCode
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }
      return data;
    } else {
      const { getDb } = await import('../../serverDb.js');
      const crypto = await import('node:crypto');
      const db = getDb();
      const existing = db.prepare('SELECT id FROM users WHERE LOWER(login_id) = LOWER(?)').get(cleanUsername);
      if (existing) {
        throw new Error(`Username "${cleanUsername}" is already taken.`);
      }

      if (normRole === 'patient' && cleanAadhaar) {
        const existingAadhaar = db.prepare('SELECT id FROM patients WHERE aadhaar_number = ?').get(cleanAadhaar);
        if (existingAadhaar) {
          throw new Error('An account with this Aadhaar Number already exists. Duplicate patient accounts are not allowed.');
        }
      }

      // Ensure unique Health Wallet ID for patient in local SQLite
      if (normRole === 'patient') {
        let attempts = 0;
        let isUnique = false;
        while (attempts < 30 && !isUnique) {
          if (!hwId) {
            hwId = generateHealthWalletId(cleanStateCode);
          }
          const clash = db.prepare('SELECT id FROM patients WHERE LOWER(health_wallet_id) = LOWER(?)').get(hwId);
          if (clash) {
            hwId = generateHealthWalletId(cleanStateCode);
            attempts++;
          } else {
            isUnique = true;
          }
        }
        if (!isUnique) {
          throw new Error('Failed to generate a unique Health Wallet ID. Please try again.');
        }
      }

      const userId = crypto.randomUUID();
      const now = new Date().toISOString();

      const assignedDocId = doctorId || (normRole === 'doctor' ? assignedEntityId : null);
      const assignedPharmId = pharmacyId || (normRole === 'pharmacist' ? assignedEntityId : null);
      const assignedLabId = labId || (normRole === 'lab' ? assignedEntityId : null);
      const assignedRkId = recordKeeperId || (normRole === 'record_keeper' ? assignedEntityId : null);

      db.prepare(`
        INSERT INTO users (id, login_id, full_name, password, role, doctor_id, pharmacy_id, lab_id, record_keeper_id, health_wallet_id, organization, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, cleanUsername, cleanName, cleanPass, normRole, assignedDocId, assignedPharmId, assignedLabId, assignedRkId, hwId, organization || 'Institutional Node', now);

      let patient = null;
      if (normRole === 'patient') {
        const patId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO patients (id, user_id, health_wallet_id, full_name, date_of_birth, gender, phone, mobile_number, aadhaar_number, blood_group, allergies, current_medicines, state, state_code, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(patId, userId, hwId, cleanName, dateOfBirth, gender, cleanPhone, cleanPhone, cleanAadhaar, bloodGroup, allergies, '', cleanState, cleanStateCode, now, now);
        patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patId);
      } else if (normRole === 'doctor') {
        const docId = assignedEntityId || crypto.randomUUID();
        db.prepare(`
          INSERT INTO doctors (id, user_id, full_name, medical_registration_number, specialization, organization, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(docId, userId, cleanName, assignedEntityId, 'Attending Physician', 'Healthcare Clinic', now);
      }

      return {
        user: {
          id: userId,
          login_id: cleanUsername,
          full_name: cleanName,
          role: normRole,
          doctor_id: assignedDocId,
          pharmacy_id: assignedPharmId,
          lab_id: assignedLabId,
          record_keeper_id: assignedRkId,
          health_wallet_id: hwId,
          entity_id: assignedEntityId
        },
        patient,
        role: dbRole,
        roleId: normRole,
        name: cleanName,
        username: cleanUsername,
        healthWalletId: hwId,
        entityId: assignedEntityId
      };
    }
  }

  /**
   * Compatibility wrapper for patient activation
   */
  async activatePatient(data) {
    return this.registerAccount({
      ...data,
      role: 'PATIENT',
      name: data.fullName || data.name,
      username: data.username || data.loginId || data.healthWalletId || generateHealthWalletId(),
      healthWalletId: data.healthWalletId || null
    });
  }

  /**
   * 3. PATIENT SEARCH BY HEALTH WALLET ID
   */
  async searchPatientByHealthWalletId(healthWalletId, currentUserId = null, currentUserRole = 'doctor') {
    await initDatabaseConfig();
    const cleanId = (healthWalletId || '').trim();
    if (!cleanId) return null;

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data: patient, error } = await supabase
        .from('patients')
        .select('*')
        .ilike('health_wallet_id', cleanId)
        .maybeSingle();

      if (error || !patient) return null;

      // Audit Log
      if (currentUserId) {
        try {
          await supabase.from('audit_logs').insert({
            user_id: currentUserId,
            role: currentUserRole.toUpperCase(),
            patient_hw_id: cleanId,
            patient_id: patient.id,
            action: 'PATIENT_SEARCH',
            purpose: 'Clinical Evaluation & Records Inspection'
          });
        } catch (e) {
          console.warn('Audit error:', e.message);
        }
      }

      return {
        ...patient,
        full_name: patient.name,
        bloodGroup: patient.blood_group
      };
    }

    return await localPatient.getPatientByHealthWalletId(cleanId);
  }

  /**
   * 4. MEDICAL RECORDS (GET & SAVE)
   */
  async getPatientMedicalRecords(patientId) {
    await initDatabaseConfig();
    if (!patientId) return [];

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data: records, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('visit_date', { ascending: false });

      if (error) {
        console.error('Supabase records fetch error:', error.message);
        return [];
      }

      // Retrieve real doctor profiles from users
      const doctorIds = [...new Set((records || []).map(r => r.doctor_id).filter(Boolean))];
      let docMap = {};
      if (doctorIds.length > 0) {
        try {
          const { data: docUsers } = await supabase
            .from('users')
            .select('id, login_id, name, organization, doctor_id');
          if (docUsers) {
            docUsers.forEach(u => {
              if (u.login_id) docMap[u.login_id] = u;
              if (u.id) docMap[u.id] = u;
              if (u.doctor_id) docMap[u.doctor_id] = u;
            });
          }
        } catch (e) {}
      }

      return (records || []).map(r => {
        const matched = docMap[r.doctor_id];
        const docName = matched?.name || r.doctor_name || 'Attending Physician';
        const docOrg = matched?.organization || r.doctor_organization || 'Medical Center';

        return {
          ...r,
          doctor_name: docName,
          doctor_organization: docOrg,
          medicine: r.prescription,
          doctor_notes: r.notes,
          doctor: {
            id: r.doctor_id,
            full_name: docName,
            organization: docOrg,
            specialization: 'Clinical Specialist'
          }
        };
      });
    }

    return await localRecord.getPatientRecords(patientId);
  }

  async saveMedicalRecord({
    patientId,
    doctorId,
    doctorName = null,
    doctorOrg = null,
    visitDate,
    symptoms = '',
    diagnosis,
    treatment = '',
    prescription = '',
    followUpDate = '',
    notes = '',
    medicineName = '',
    dosage = '',
    frequency = '',
    duration = ''
  }) {
    await initDatabaseConfig();

    if (!patientId || !doctorId || !diagnosis) {
      throw new Error('Patient ID, Doctor ID, and Diagnosis are required.');
    }

    const cleanDate = visitDate || new Date().toISOString().split('T')[0];
    const medName = medicineName || prescription || '';

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();

      // 1. Insert into medical_records table
      const { data: record, error: recErr } = await supabase
        .from('medical_records')
        .insert({
          patient_id: patientId,
          doctor_id: doctorId,
          visit_date: cleanDate,
          symptoms: symptoms || '',
          diagnosis: diagnosis.trim(),
          treatment: treatment || '',
          prescription: medName,
          follow_up_date: followUpDate || null,
          notes: notes || ''
        })
        .select()
        .single();

      if (recErr) {
        throw new Error(`Failed to save medical record: ${recErr.message}`);
      }

      // 2. Insert into medications table if medicine prescribed
      if (medName.trim()) {
        try {
          await supabase.from('medications').insert({
            patient_id: patientId,
            medical_record_id: record.id,
            medicine_name: medName.trim(),
            dosage: dosage || '',
            frequency: frequency || '',
            duration: duration || '30 days',
            status: 'Active'
          });
        } catch (mErr) {
          console.warn('Medication insert warning:', mErr.message);
        }
      }

      // 3. Audit log
      try {
        await supabase.from('audit_logs').insert({
          user_id: doctorId,
          actor: doctorName || doctorId,
          role: 'DOCTOR',
          patient_id: patientId,
          action: 'MEDICAL_RECORD_CREATED',
          purpose: 'Clinical Treatment Documentation'
        });
      } catch (aErr) {
        console.warn('Audit error:', aErr.message);
      }

      return {
        ...record,
        medicine: medName,
        doctor_notes: notes,
        doctor: {
          id: doctorId,
          full_name: doctorName || 'Attending Physician',
          organization: doctorOrg || 'Medical Center'
        }
      };
    }

    return await localRecord.createMedicalRecord({
      patientId,
      doctorId,
      visitDate: cleanDate,
      symptoms,
      diagnosis,
      treatment,
      prescription: medName,
      followUpDate,
      doctorNotes: notes,
      medicine: medName,
      dosage,
      frequency
    });
  }

  /**
   * 5. LAB REPORTS (GET & SAVE)
   */
  async getPatientLabReports(patientId) {
    await initDatabaseConfig();
    if (!patientId) return [];

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data: labs, error } = await supabase
        .from('lab_reports')
        .select('*')
        .eq('patient_id', patientId)
        .order('test_date', { ascending: false });

      if (error) return [];
      return (labs || []).map(l => ({
        ...l,
        lab_name: l.lab_name || 'Apex Diagnostics',
        test_date: l.test_date || l.report_date,
        reference_range: l.reference_range || l.notes || '',
        status: l.status || 'Verified Provider',
        report_file_path: l.report_file_path || null
      }));
    }

    return await localLab.getPatientLabReports(patientId);
  }

  async saveLabReport({
    patientId,
    labName = 'Diagnostic Lab',
    testName,
    result,
    reportDate,
    testDate,
    notes = '',
    referenceRange = '',
    doctorId = null,
    doctorName = null,
    status = 'Verified Provider',
    reportFilePath = null,
    file = null
  }) {
    await initDatabaseConfig();
    const cleanDate = testDate || reportDate || new Date().toISOString().split('T')[0];

    if (!patientId || !testName || !result) {
      throw new Error('Patient ID, Test Name, and Result are required.');
    }

    let finalFilePath = reportFilePath;

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();

      // Upload file to Supabase Storage if provided
      if (file && typeof file === 'object' && file.name) {
        try {
          const fileExt = file.name.split('.').pop() || 'pdf';
          const storagePath = `${patientId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('lab-reports')
            .upload(storagePath, file, { cacheControl: '3600', upsert: true });

          if (!uploadErr) {
            const { data: signedData } = await supabase.storage
              .from('lab-reports')
              .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
            finalFilePath = signedData?.signedUrl || storagePath;
          }
        } catch (storageErr) {
          console.warn('Storage upload error:', storageErr.message);
        }
      }

      const { data: report, error } = await supabase
        .from('lab_reports')
        .insert({
          patient_id: patientId,
          lab_name: labName.trim(),
          test_name: testName.trim(),
          result: result.trim(),
          test_date: cleanDate,
          report_date: cleanDate,
          reference_range: referenceRange || '',
          notes: notes || '',
          doctor_id: doctorId,
          status: status || 'Verified Provider',
          report_file_path: finalFilePath || null
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save lab report: ${error.message}`);
      }

      try {
        await supabase.from('audit_logs').insert({
          user_id: doctorId || labName,
          actor: doctorName || doctorId || labName,
          role: doctorId ? 'DOCTOR' : 'LAB',
          patient_id: patientId,
          action: 'Lab report added',
          purpose: `Test: ${testName.trim()}, Result: ${result.trim()}`
        });
      } catch (e) {
        console.warn('Audit error:', e.message);
      }

      return {
        ...report,
        lab_name: report.lab_name || labName,
        test_date: report.test_date || report.report_date,
        reference_range: report.reference_range || report.notes,
        status: report.status || 'Verified Provider',
        report_file_path: report.report_file_path || finalFilePath
      };
    }

    return await localLab.createLabReport({
      patientId,
      labName,
      testName,
      result,
      testDate: cleanDate,
      referenceRange,
      notes,
      doctorId,
      status,
      reportFilePath: finalFilePath
    });
  }

  /**
   * 6. MEDICATIONS & PRESCRIPTIONS
   */
  async getPatientMedications(patientId) {
    await initDatabaseConfig();
    if (!patientId) return [];

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();

      const { data: meds } = await supabase
        .from('medications')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (meds && meds.length > 0) {
        return meds.map(m => ({
          ...m,
          medicine: m.medicine_name,
          status: m.status || 'Active'
        }));
      }

      const { data: records } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .not('prescription', 'is', null)
        .order('visit_date', { ascending: false });

      return (records || []).map(r => ({
        id: r.id,
        patient_id: r.patient_id,
        medicine: r.prescription,
        medicine_name: r.prescription,
        status: 'Active',
        created_at: r.created_at
      }));
    }

    return await localRx.getPatientPrescriptions(patientId);
  }

  async dispenseMedication({ medicationId, patientId, dispensedBy = 'Licensed Pharmacy' }) {
    await initDatabaseConfig();
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();

      await supabase
        .from('medications')
        .update({
          status: 'DISPENSED',
          dispensed_at: now,
          dispensed_by: dispensedBy
        })
        .eq('id', medicationId);

      try {
        await supabase.from('audit_logs').insert({
          user_id: dispensedBy,
          actor: dispensedBy,
          role: 'PHARMACY',
          patient_id: patientId,
          action: 'MEDICATION_DISPENSED',
          purpose: `Dispensed Rx ID ${medicationId}`
        });
      } catch (e) {
        console.warn('Audit log error:', e.message);
      }

      return true;
    }

    return await localRx.dispensePrescription({
      prescriptionId: medicationId,
      patientId,
      dispensedBy
    });
  }

  /**
   * 7. AUDIT LOGS
   */
  async getAuditLogs(patientId = null) {
    await initDatabaseConfig();

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(25);

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    }

    const targetPid = typeof patientId === 'object' && patientId !== null ? patientId.patientId : patientId;
    return await localAudit.getAccessLogs(targetPid);
  }
}

export const databaseService = new CentralDatabaseService();
