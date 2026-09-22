import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'health_wallet.sqlite');

let _dbInstance = null;

export function getDb() {
  if (!_dbInstance) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    _dbInstance = new DatabaseSync(DB_PATH);
    // Initialize schema
    initSchema(_dbInstance);
    // Ensure demo accounts exist
    seedDemoAccounts(_dbInstance);
  }
  return _dbInstance;
}

function initSchema(db) {
  // Enable WAL mode for high performance and concurrency
  db.exec('PRAGMA journal_mode = WAL;');

  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      login_id TEXT UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      doctor_id TEXT,
      pharmacy_id TEXT,
      lab_id TEXT,
      record_keeper_id TEXT,
      health_wallet_id TEXT,
      organization TEXT,
      created_at TEXT NOT NULL
    );
  `);
  try { db.exec('ALTER TABLE users ADD COLUMN doctor_id TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN pharmacy_id TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN lab_id TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN record_keeper_id TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN health_wallet_id TEXT;'); } catch (e) {}

  // 2. Patients Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      health_wallet_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      date_of_birth TEXT,
      gender TEXT,
      phone TEXT,
      mobile_number TEXT,
      aadhaar_number TEXT,
      blood_group TEXT,
      allergies TEXT,
      current_medicines TEXT,
      state TEXT,
      state_code TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  try { db.exec('ALTER TABLE patients ADD COLUMN mobile_number TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE patients ADD COLUMN aadhaar_number TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE patients ADD COLUMN state TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE patients ADD COLUMN state_code TEXT;'); } catch (e) {}

  // 3. Doctors Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      full_name TEXT NOT NULL,
      medical_registration_number TEXT UNIQUE NOT NULL,
      specialization TEXT,
      organization TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // 4. Medical Records Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS medical_records (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      record_type TEXT DEFAULT 'Consultation',
      symptoms TEXT,
      chief_complaint TEXT,
      diagnosis TEXT NOT NULL,
      clinical_findings TEXT,
      treatment TEXT,
      medicine TEXT,
      dosage TEXT,
      frequency TEXT,
      follow_up_date TEXT,
      doctor_notes TEXT,
      prescription TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    );
  `);

  // 5. Lab Reports Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS lab_reports (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      lab_user_id TEXT,
      lab_name TEXT,
      doctor_id TEXT,
      test_name TEXT NOT NULL,
      test_date TEXT NOT NULL,
      result TEXT NOT NULL,
      reference_range TEXT,
      notes TEXT,
      status TEXT DEFAULT 'Verified Provider',
      report_file_path TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
  `);
  try { db.exec('ALTER TABLE lab_reports ADD COLUMN lab_name TEXT;'); } catch (e) {}
  try { db.exec('ALTER TABLE lab_reports ADD COLUMN doctor_id TEXT;'); } catch (e) {}
  try { db.exec("ALTER TABLE lab_reports ADD COLUMN status TEXT DEFAULT 'Verified Provider';"); } catch (e) {}
  try { db.exec('ALTER TABLE lab_reports ADD COLUMN report_file_path TEXT;'); } catch (e) {}


  // 6. Prescriptions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      doctor_id TEXT,
      medicine TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT,
      duration TEXT,
      instructions TEXT,
      status TEXT DEFAULT 'Active',
      dispensed_at TEXT,
      dispensed_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
  `);

  // 7. Audit Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT,
      role TEXT,
      patient_hw_id TEXT,
      patient_id TEXT,
      action TEXT NOT NULL,
      purpose TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

/**
 * Requirement 8: NO DEFAULT DATA
 * System starts completely empty without any predefined users or credentials.
 */
function seedDemoAccounts(db) {
  // Empty: Users must be created via New User / Activate Account
}

export function seedProviders(db) {
  // Empty: No predefined users
}

/**
 * Reset database to clean zero-user state
 */
export function resetDb() {
  const db = getDb();
  db.exec(`
    DELETE FROM medical_records;
    DELETE FROM lab_reports;
    DELETE FROM prescriptions;
    DELETE FROM audit_logs;
    DELETE FROM patients;
    DELETE FROM doctors;
    DELETE FROM users;
  `);
  return { success: true, message: 'Database reset to clean state' };
}

/**
 * Reads DB state helper (for test runners / status)
 */
export function readDb() {
  const db = getDb();
  const users = db.prepare('SELECT * FROM users').all();
  const patients = db.prepare('SELECT * FROM patients').all();
  const doctors = db.prepare('SELECT * FROM doctors').all();
  const medical_records = db.prepare('SELECT * FROM medical_records').all();
  const lab_reports = db.prepare('SELECT * FROM lab_reports').all();
  const prescriptions = db.prepare('SELECT * FROM prescriptions').all();
  const access_logs = db.prepare('SELECT * FROM audit_logs').all();
  return { users, patients, doctors, medical_records, lab_reports, prescriptions, access_logs };
}

/**
 * Handles /api/db/* REST requests
 */
export async function handleDbRequest(req, res, pathname, query) {
  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
  };

  if (req.method === 'OPTIONS') {
    sendJson(204, {});
    return true;
  }

  // Helper to read JSON request body
  const readBody = () => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });

  const db = getDb();

  // Route: /api/db/status
  if (pathname === '/api/db/status' && req.method === 'GET') {
    const counts = {
      usersCount: db.prepare('SELECT count(*) as c FROM users').get().c,
      patientsCount: db.prepare('SELECT count(*) as c FROM patients').get().c,
      doctorsCount: db.prepare('SELECT count(*) as c FROM doctors').get().c,
      recordsCount: db.prepare('SELECT count(*) as c FROM medical_records').get().c,
      labReportsCount: db.prepare('SELECT count(*) as c FROM lab_reports').get().c,
      prescriptionsCount: db.prepare('SELECT count(*) as c FROM prescriptions').get().c,
      auditLogsCount: db.prepare('SELECT count(*) as c FROM audit_logs').get().c
    };
    sendJson(200, counts);
    return true;
  }

  // Route: /api/db/reset
  if (pathname === '/api/db/reset' && req.method === 'POST') {
    resetDb();
    sendJson(200, { success: true, message: 'Database reset to clean state' });
    return true;
  }

  // Route: /api/db/auth/signup
  if (pathname === '/api/db/auth/signup' && req.method === 'POST') {
    const payload = await readBody();
    const loginId = (payload.login_id || payload.loginId || payload.email || '').trim();
    const email = (payload.email || '').trim();
    const password = payload.password || '';
    const fullName = payload.fullName || payload.full_name || '';
    const role = payload.role || 'patient';
    const organization = payload.organization || 'Personal Portal';

    if (!password) {
      sendJson(400, { error: 'Password is required.' });
      return true;
    }

    // Check if loginId or email already exists
    const existing = db.prepare(`
      SELECT id FROM users 
      WHERE (login_id = ? AND login_id != '') 
         OR (email = ? AND email != '')
    `).get(loginId, email);

    if (existing) {
      sendJson(400, { error: 'An account with this ID or email already exists.' });
      return true;
    }

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, login_id, full_name, email, password, role, organization, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, loginId || email, fullName, email, password, role, organization, now);

    sendJson(201, {
      user: {
        id: userId,
        login_id: loginId || email,
        full_name: fullName,
        email,
        role,
        organization,
        created_at: now
      }
    });
    return true;
  }

  // Route: /api/db/auth/register
  if (pathname === '/api/db/auth/register' && req.method === 'POST') {
    const payload = await readBody();
    const role = (payload.role || 'PATIENT').toUpperCase();
    const name = (payload.name || payload.full_name || '').trim();
    const username = (payload.username || payload.login_id || '').trim();
    const password = payload.password || '';
    const doctorId = payload.doctor_id || null;
    const pharmacyId = payload.pharmacy_id || null;
    const labId = payload.lab_id || null;
    const recordKeeperId = payload.record_keeper_id || null;

    // Patient-specific fields
    const mobileNumber = (payload.mobile_number || payload.phone || '').trim();
    const aadhaarNumber = (payload.aadhaar_number || '').replace(/\D/g, '');
    const bloodGroup = payload.blood_group || 'O+';
    const gender = payload.gender || '';
    const stateName = payload.state || '';
    const STATE_CODE_MAP = {
      'ANDHRA PRADESH': 'AP',
      'ARUNACHAL PRADESH': 'AR',
      'ASSAM': 'AS',
      'BIHAR': 'BR',
      'CHHATTISGARH': 'CG',
      'GOA': 'GA',
      'GUJARAT': 'GJ',
      'HARYANA': 'HR',
      'HIMACHAL PRADESH': 'HP',
      'JHARKHAND': 'JH',
      'KARNATAKA': 'KA',
      'KERALA': 'KL',
      'MADHYA PRADESH': 'MP',
      'MAHARASHTRA': 'MH',
      'MANIPUR': 'MN',
      'MEGHALAYA': 'ML',
      'MIZORAM': 'MZ',
      'NAGALAND': 'NL',
      'ODISHA': 'OD',
      'PUNJAB': 'PB',
      'RAJASTHAN': 'RJ',
      'SIKKIM': 'SK',
      'TAMIL NADU': 'TN',
      'TELANGANA': 'TS',
      'TRIPURA': 'TR',
      'UTTAR PRADESH': 'UP',
      'UTTARAKHAND': 'UK',
      'WEST BENGAL': 'WB'
    };

    let stateCode = (payload.state_code || '').toUpperCase().trim();
    if (stateCode === 'TG') stateCode = 'TS';
    if (stateName && STATE_CODE_MAP[stateName.toUpperCase().trim()]) {
      stateCode = STATE_CODE_MAP[stateName.toUpperCase().trim()];
    } else if (!stateCode && stateName) {
      stateCode = STATE_CODE_MAP[stateName.toUpperCase().trim()] || 'TN';
    }
    if (!stateCode) stateCode = 'TN';

    if (!name || !username || !password) {
      sendJson(400, { error: 'Name, Username, and Password are required.' });
      return true;
    }

    if (role === 'PATIENT') {
      if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
        sendJson(400, { error: 'Please enter a valid 10-digit Indian mobile number.' });
        return true;
      }
      if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
        sendJson(400, { error: 'Please enter a valid 12-digit Aadhaar number.' });
        return true;
      }
      if (!bloodGroup) {
        sendJson(400, { error: 'Please select a Blood Group.' });
        return true;
      }
      if (!gender) {
        sendJson(400, { error: 'Please select a Gender.' });
        return true;
      }
      if (!stateName) {
        sendJson(400, { error: 'Please select a State.' });
        return true;
      }

      // Prevent duplicate accounts for same Aadhaar number
      const existingAadhaar = db.prepare('SELECT id FROM patients WHERE aadhaar_number = ?').get(aadhaarNumber);
      if (existingAadhaar) {
        sendJson(400, { error: 'An account with this Aadhaar Number already exists. Duplicate patient accounts are not allowed.' });
        return true;
      }
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(login_id) = LOWER(?)').get(username);
    if (existingUser) {
      sendJson(400, { error: `Username "${username}" is already taken. Please choose another.` });
      return true;
    }

    // Determine unique Health Wallet ID for patient
    let finalHwId = null;
    if (role === 'PATIENT') {
      let attempts = 0;
      while (attempts < 30) {
        const candidate = `HW-${stateCode}-${Math.floor(10000000 + Math.random() * 90000000)}`;
        const clash = db.prepare('SELECT id FROM patients WHERE LOWER(health_wallet_id) = LOWER(?)').get(candidate);
        if (!clash) {
          finalHwId = candidate;
          break;
        }
        attempts++;
      }
      if (!finalHwId) {
        sendJson(500, { error: 'Failed to generate a unique Health Wallet ID. Please try again.' });
        return true;
      }
    }

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const assignedId = doctorId || pharmacyId || labId || recordKeeperId || finalHwId || username;

    db.prepare(`
      INSERT INTO users (id, login_id, full_name, password, role, doctor_id, pharmacy_id, lab_id, record_keeper_id, health_wallet_id, organization, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      username,
      name,
      password,
      role.toLowerCase(),
      doctorId,
      pharmacyId,
      labId,
      recordKeeperId,
      finalHwId,
      payload.organization || 'Institutional Node',
      now
    );

    let patient = null;
    let doctor = null;

    if (role === 'PATIENT' && finalHwId) {
      const patId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO patients (id, user_id, health_wallet_id, full_name, date_of_birth, gender, phone, mobile_number, aadhaar_number, blood_group, allergies, current_medicines, state, state_code, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        patId,
        userId,
        finalHwId,
        name,
        payload.date_of_birth || null,
        gender,
        mobileNumber,
        mobileNumber,
        aadhaarNumber,
        bloodGroup,
        payload.allergies || 'None',
        '',
        stateName,
        stateCode,
        now,
        now
      );
      patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patId);
    } else if (role === 'DOCTOR') {
      const docId = assignedId;
      db.prepare(`
        INSERT INTO doctors (id, user_id, full_name, medical_registration_number, specialization, organization, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        docId,
        userId,
        name,
        assignedId,
        'Attending Physician',
        'Healthcare Provider',
        now
      );
      doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(docId);
    }

    sendJson(201, {
      user: {
        id: userId,
        login_id: username,
        full_name: name,
        role: role.toLowerCase(),
        doctor_id: doctorId,
        pharmacy_id: pharmacyId,
        lab_id: labId,
        record_keeper_id: recordKeeperId,
        health_wallet_id: finalHwId
      },
      patient,
      doctor,
      role,
      roleId: role.toLowerCase(),
      name,
      username,
      healthWalletId: finalHwId,
      entityId: assignedId
    });
    return true;
  }

  // Route: /api/db/auth/login
  if (pathname === '/api/db/auth/login' && req.method === 'POST') {
    const payload = await readBody();
    const rawLoginId = (payload.loginId || payload.login_id || payload.email || '').trim();
    const password = payload.password || '';
    const selectedRole = (payload.role || payload.selectedRole || '').trim().toLowerCase();

    if (!rawLoginId || !password) {
      sendJson(401, { error: 'Invalid Login ID or Password' });
      return true;
    }

    // Lookup user by login_id, email, or linked patient/doctor
    let user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(login_id) = LOWER(?) 
         OR LOWER(email) = LOWER(?)
    `).get(rawLoginId, rawLoginId);

    let patient = null;
    let doctor = null;

    if (!user) {
      // Check if rawLoginId matches a Health Wallet ID
      patient = db.prepare(`
        SELECT * FROM patients WHERE LOWER(health_wallet_id) = LOWER(?)
      `).get(rawLoginId);

      if (patient) {
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(patient.user_id);
      }
    }

    if (!user) {
      // Check if rawLoginId matches doctor medical registration number
      doctor = db.prepare(`
        SELECT * FROM doctors WHERE LOWER(medical_registration_number) = LOWER(?)
      `).get(rawLoginId);

      if (doctor) {
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(doctor.user_id);
      }
    }

    if (!user || user.password !== password) {
      sendJson(401, { error: 'Invalid username or password.' });
      return true;
    }

    // Role validation
    if (selectedRole) {
      const normalize = (r) => {
        if (!r) return '';
        const norm = r.toLowerCase().replace('-', '_');
        if (norm === 'pharmacy' || norm === 'pharmacist') return 'pharmacist';
        if (norm === 'records' || norm === 'record_keeper' || norm === 'recordkeeper') return 'record_keeper';
        return norm;
      };

      const userRole = normalize(user.role);
      const expectedRole = normalize(selectedRole);

      if (userRole !== expectedRole) {
        sendJson(403, {
          error: `Role mismatch: This account is registered as ${user.role.toUpperCase()}, not ${selectedRole.toUpperCase()}. Please select the correct account type to sign in.`
        });
        return true;
      }
    }

    // Attach role profiles
    if (!patient && user.role === 'patient') {
      patient = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(user.id) || null;
    }
    if (!doctor && user.role === 'doctor') {
      doctor = db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(user.id) || null;
    }

    // Log login event in audit_logs
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, user_id, user_name, role, patient_hw_id, patient_id, action, purpose, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        new Date().toISOString(),
        user.id ?? null,
        user.full_name ?? null,
        user.role ?? null,
        (patient ? patient.health_wallet_id : null) ?? null,
        (patient ? patient.id : null) ?? null,
        'LOGIN',
        'User Authentication',
        `Successful sign-in as ${user.role}`,
        new Date().toISOString()
      );
    } catch (e) {
      console.warn('Audit log write error:', e.message);
    }

    const safeUser = { ...user };
    delete safeUser.password;

    sendJson(200, {
      user: safeUser,
      patient,
      doctor
    });
    return true;
  }

  // Route: /api/db/patients
  if (pathname === '/api/db/patients') {
    if (req.method === 'GET') {
      const hwId = query.get('health_wallet_id');
      const userId = query.get('user_id');
      const id = query.get('id');

      if (hwId) {
        const patient = db.prepare(`
          SELECT * FROM patients WHERE LOWER(health_wallet_id) = LOWER(?)
        `).get(hwId.trim());

        if (!patient) {
          sendJson(404, { error: 'Patient not found.' });
        } else {
          sendJson(200, patient);
        }
        return true;
      }

      if (userId) {
        const patient = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(userId);
        sendJson(200, patient || null);
        return true;
      }

      if (id) {
        const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
        sendJson(200, patient || null);
        return true;
      }

      const all = db.prepare('SELECT * FROM patients ORDER BY created_at DESC').all();
      sendJson(200, all);
      return true;
    }

    if (req.method === 'POST') {
      const payload = await readBody();
      const patientId = crypto.randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO patients (id, user_id, health_wallet_id, full_name, date_of_birth, gender, phone, blood_group, allergies, current_medicines, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        patientId,
        payload.user_id,
        payload.health_wallet_id,
        payload.full_name,
        payload.date_of_birth || null,
        payload.gender || null,
        payload.phone || null,
        payload.blood_group || 'O+',
        payload.allergies || 'None',
        payload.current_medicines || '',
        now,
        now
      );

      const created = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
      sendJson(201, created);
      return true;
    }
  }

  // Route: /api/db/doctors
  if (pathname === '/api/db/doctors') {
    if (req.method === 'GET') {
      const userId = query.get('user_id');
      const id = query.get('id');

      if (userId) {
        const doc = db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(userId);
        sendJson(200, doc || null);
        return true;
      }
      if (id) {
        const doc = db.prepare('SELECT * FROM doctors WHERE id = ?').get(id);
        sendJson(200, doc || null);
        return true;
      }

      const all = db.prepare('SELECT * FROM doctors').all();
      sendJson(200, all);
      return true;
    }

    if (req.method === 'POST') {
      const payload = await readBody();
      const docId = crypto.randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO doctors (id, user_id, full_name, medical_registration_number, specialization, organization, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        docId,
        payload.user_id,
        payload.full_name,
        payload.medical_registration_number,
        payload.specialization,
        payload.organization,
        now
      );

      const created = db.prepare('SELECT * FROM doctors WHERE id = ?').get(docId);
      sendJson(201, created);
      return true;
    }
  }

  // Route: /api/db/medical_records
  if (pathname === '/api/db/medical_records') {
    if (req.method === 'GET') {
      const patientId = query.get('patient_id');
      let records;
      if (patientId) {
        records = db.prepare(`
          SELECT mr.*, 
                 d.full_name as doctor_name, 
                 d.organization as doctor_organization, 
                 d.specialization as doctor_specialization,
                 d.medical_registration_number as doctor_reg_no
          FROM medical_records mr
          LEFT JOIN doctors d ON mr.doctor_id = d.id
          WHERE mr.patient_id = ?
          ORDER BY mr.visit_date DESC, mr.created_at DESC
        `).all(patientId);
      } else {
        records = db.prepare(`
          SELECT mr.*, 
                 d.full_name as doctor_name, 
                 d.organization as doctor_organization, 
                 d.specialization as doctor_specialization,
                 d.medical_registration_number as doctor_reg_no
          FROM medical_records mr
          LEFT JOIN doctors d ON mr.doctor_id = d.id
          ORDER BY mr.visit_date DESC, mr.created_at DESC
        `).all();
      }

      // Shape response with nested doctor object for frontend
      const formatted = records.map(r => ({
        ...r,
        doctor: r.doctor_name ? {
          id: r.doctor_id,
          full_name: r.doctor_name,
          organization: r.doctor_organization,
          specialization: r.doctor_specialization,
          medical_registration_number: r.doctor_reg_no
        } : null
      }));

      sendJson(200, formatted);
      return true;
    }

    if (req.method === 'POST') {
      const payload = await readBody();
      if (!payload.patient_id || !payload.doctor_id || !payload.diagnosis) {
        sendJson(400, { error: 'Medical record could not be saved. Missing required fields.' });
        return true;
      }

      const recordId = crypto.randomUUID();
      const now = new Date().toISOString();
      const visitDate = payload.visit_date || now.split('T')[0];

      db.prepare(`
        INSERT INTO medical_records (
          id, patient_id, doctor_id, visit_date, record_type,
          symptoms, chief_complaint, diagnosis, clinical_findings,
          treatment, medicine, dosage, frequency, follow_up_date,
          doctor_notes, prescription, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        recordId,
        payload.patient_id,
        payload.doctor_id,
        visitDate,
        payload.record_type || 'Consultation',
        payload.symptoms || payload.chief_complaint || '',
        payload.chief_complaint || payload.symptoms || '',
        payload.diagnosis.trim(),
        payload.clinical_findings || '',
        payload.treatment || '',
        payload.medicine || '',
        payload.dosage || '',
        payload.frequency || '',
        payload.follow_up_date || '',
        payload.doctor_notes || '',
        payload.prescription || payload.medicine || '',
        now,
        now
      );

      // If medicine or prescription given, also add to prescriptions table
      const medName = payload.medicine || payload.prescription;
      if (medName && medName.trim()) {
        try {
          db.prepare(`
            INSERT INTO prescriptions (id, patient_id, doctor_id, medicine, dosage, frequency, duration, instructions, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PRESCRIBED', ?)
          `).run(
            crypto.randomUUID(),
            payload.patient_id,
            payload.doctor_id,
            medName.trim(),
            payload.dosage || '',
            payload.frequency || '',
            payload.duration || '30 days',
            payload.instructions || payload.doctor_notes || '',
            now
          );
        } catch (e) {
          console.warn('Auto prescription link error:', e.message);
        }
      }

      // Update patient current_medicines if provided
      if (payload.medicine) {
        try {
          db.prepare(`
            UPDATE patients SET current_medicines = ?, updated_at = ? WHERE id = ?
          `).run(payload.medicine, now, payload.patient_id);
        } catch (e) {
          console.warn('Patient medicine update warning:', e.message);
        }
      }

      const doc = db.prepare('SELECT * FROM doctors WHERE id = ?').get(payload.doctor_id);
      const inserted = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(recordId);

      sendJson(201, {
        ...inserted,
        doctor: doc ? {
          id: doc.id,
          full_name: doc.full_name,
          organization: doc.organization,
          specialization: doc.specialization
        } : null
      });
      return true;
    }
  }

  // Route: /api/db/lab_reports
  if (pathname === '/api/db/lab_reports') {
    if (req.method === 'GET') {
      const patientId = query.get('patient_id');
      let reports;
      if (patientId) {
        reports = db.prepare(`
          SELECT * FROM lab_reports WHERE patient_id = ? ORDER BY test_date DESC, created_at DESC
        `).all(patientId);
      } else {
        reports = db.prepare('SELECT * FROM lab_reports ORDER BY test_date DESC, created_at DESC').all();
      }
      sendJson(200, reports);
      return true;
    }

    if (req.method === 'POST') {
      const payload = await readBody();
      if (!payload.patient_id || !payload.test_name || !payload.result) {
        sendJson(400, { error: 'Test name, result, and patient ID are required.' });
        return true;
      }

      const reportId = crypto.randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO lab_reports (
          id, patient_id, lab_user_id, lab_name, doctor_id,
          test_name, test_date, result, reference_range,
          notes, status, report_file_path, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reportId,
        payload.patient_id,
        payload.lab_user_id || null,
        payload.lab_name || 'Apex Diagnostics',
        payload.doctor_id || null,
        payload.test_name.trim(),
        payload.test_date || payload.report_date || now.split('T')[0],
        payload.result.trim(),
        payload.reference_range || '',
        payload.notes || '',
        payload.status || 'Verified Provider',
        payload.report_file_path || null,
        now
      );


      try {
        db.prepare(`
          INSERT INTO audit_logs (id, timestamp, user_id, user_name, role, patient_id, action, purpose, details, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          now,
          payload.doctor_id || payload.lab_user_id || 'DOC-ATTENDING',
          payload.lab_name || 'Apex Diagnostics',
          payload.doctor_id ? 'DOCTOR' : 'LAB',
          payload.patient_id,
          'LAB_REPORT_SAVED',
          `Lab test: ${payload.test_name.trim()}`,
          `Result: ${payload.result.trim()} (${payload.status || 'Verified Provider'})`,
          now
        );
      } catch (e) {
        console.warn('Audit log write error for lab report:', e.message);
      }

      const inserted = db.prepare('SELECT * FROM lab_reports WHERE id = ?').get(reportId);
      sendJson(201, inserted);
      return true;
    }
  }

  // Route: /api/db/prescriptions
  if (pathname === '/api/db/prescriptions') {
    if (req.method === 'GET') {
      const patientId = query.get('patient_id');
      let prescriptions;
      if (patientId) {
        prescriptions = db.prepare(`
          SELECT p.*, d.full_name as prescribing_doctor, d.organization as doctor_org
          FROM prescriptions p
          LEFT JOIN doctors d ON p.doctor_id = d.id
          WHERE p.patient_id = ?
          ORDER BY p.created_at DESC
        `).all(patientId);
      } else {
        prescriptions = db.prepare(`
          SELECT p.*, d.full_name as prescribing_doctor, d.organization as doctor_org
          FROM prescriptions p
          LEFT JOIN doctors d ON p.doctor_id = d.id
          ORDER BY p.created_at DESC
        `).all();
      }
      sendJson(200, prescriptions);
      return true;
    }

    if (req.method === 'POST') {
      const payload = await readBody();
      if (!payload.patient_id || !payload.medicine) {
        sendJson(400, { error: 'Patient ID and Medicine are required.' });
        return true;
      }

      const rxId = crypto.randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO prescriptions (id, patient_id, doctor_id, medicine, dosage, frequency, duration, instructions, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)
      `).run(
        rxId,
        payload.patient_id,
        payload.doctor_id || null,
        payload.medicine.trim(),
        payload.dosage || '',
        payload.frequency || '',
        payload.duration || '',
        payload.instructions || '',
        now
      );

      const inserted = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(rxId);
      sendJson(201, inserted);
      return true;
    }
  }

  // Route: /api/db/prescriptions/dispense
  if (pathname === '/api/db/prescriptions/dispense' && req.method === 'POST') {
    const payload = await readBody();
    if (!payload.prescription_id) {
      sendJson(400, { error: 'Prescription ID required.' });
      return true;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE prescriptions 
      SET status = 'Dispensed', dispensed_at = ?, dispensed_by = ? 
      WHERE id = ?
    `).run(now, payload.dispensed_by || 'MedPlus Pharmacy', payload.prescription_id);

    const updated = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(payload.prescription_id);

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, user_id, user_name, role, patient_hw_id, patient_id, action, purpose, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        now,
        payload.user_id || 'pharmacy-user',
        payload.dispensed_by || 'MedPlus Care Pharmacy',
        'pharmacy',
        payload.patient_hw_id || null,
        updated?.patient_id || null,
        'PRESCRIPTION_DISPENSED',
        'Medication Dispensing Fulfillment',
        `Dispensed ${updated?.medicine || 'medication'}`,
        now
      );
    } catch (e) {
      console.warn('Audit log write error:', e.message);
    }

    sendJson(200, { success: true, prescription: updated });
    return true;
  }

  // Route: /api/db/audit_logs
  if (pathname === '/api/db/audit_logs') {
    if (req.method === 'GET') {
      const patientId = query.get('patient_id');
      let logs;
      if (patientId) {
        logs = db.prepare(`
          SELECT * FROM audit_logs WHERE patient_id = ? OR patient_hw_id = ? ORDER BY timestamp DESC
        `).all(patientId, patientId);
      } else {
        logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50').all();
      }
      sendJson(200, logs);
      return true;
    }

    if (req.method === 'POST') {
      const payload = await readBody();
      const logId = crypto.randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, user_id, user_name, role, patient_hw_id, patient_id, action, purpose, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        payload.timestamp || now,
        payload.user_id || null,
        payload.user_name || null,
        payload.role || null,
        payload.patient_hw_id || null,
        payload.patient_id || null,
        payload.action || 'ACCESS',
        payload.purpose || '',
        payload.details || '',
        now
      );

      const inserted = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(logId);
      sendJson(201, inserted);
      return true;
    }
  }

  return false;
}
