import { getSupabase, isSupabaseConfigured, initDatabaseConfig } from './supabaseClient.js';

/**
 * Fetch all medical records for a patient ordered by visit_date DESC
 */
export async function getPatientRecords(patientId) {
  await initDatabaseConfig();
  if (!patientId) return [];

  // 1. SUPABASE POSTGRESQL PATH
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('medical_records')
      .select(`
        *,
        doctors (
          id,
          full_name,
          organization,
          specialization,
          medical_registration_number
        )
      `)
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false });

    if (error) {
      console.error('Error fetching medical records from Supabase:', error.message);
      throw new Error('Unable to connect to Health Wallet database. Please try again.');
    }

    return (data || []).map(record => ({
      ...record,
      doctor: record.doctors ? {
        id: record.doctors.id,
        full_name: record.doctors.full_name,
        organization: record.doctors.organization,
        specialization: record.doctors.specialization,
        medical_registration_number: record.doctors.medical_registration_number
      } : null
    }));
  }

  // 2. PERSISTENT REST DATABASE API PATH
  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/db/medical_records?patient_id=${encodeURIComponent(patientId)}`);
    if (!res.ok) {
      throw new Error('Unable to connect to Health Wallet database. Please try again.');
    }
    return await res.json();
  } else {
    // Node environment
    const { getDb } = await import('../../serverDb.js');
    const db = getDb();
    const records = db.prepare(`
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

    return records.map(r => ({
      ...r,
      doctor: r.doctor_name ? {
        id: r.doctor_id,
        full_name: r.doctor_name,
        organization: r.doctor_organization,
        specialization: r.doctor_specialization,
        medical_registration_number: r.doctor_reg_no
      } : null
    }));
  }
}

/**
 * Save a new medical record to the database
 */
export async function createMedicalRecord({
  patientId,
  doctorId,
  visitDate,
  date,
  recordType = 'Consultation',
  symptoms = '',
  chiefComplaint = '',
  diagnosis,
  clinicalFindings = '',
  treatment = '',
  medicine = '',
  dosage = '',
  frequency = '',
  followUpDate = '',
  follow_up_date = '',
  doctorNotes = '',
  notes = '',
  prescription = ''
}) {
  await initDatabaseConfig();

  if (!patientId || !doctorId) {
    throw new Error('Medical record could not be saved. Missing patient or doctor link.');
  }
  if (!diagnosis || !diagnosis.trim()) {
    throw new Error('Medical record could not be saved. Diagnosis is required.');
  }

  const cleanDate = visitDate || date || new Date().toISOString().split('T')[0];
  const cleanSymptoms = symptoms || chiefComplaint || '';
  const cleanNotes = doctorNotes || notes || '';
  const cleanFollowUp = followUpDate || follow_up_date || '';
  const cleanPrescription = prescription || medicine || '';

  // 1. SUPABASE POSTGRESQL PATH
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const insertPayload = {
      patient_id: patientId,
      doctor_id: doctorId,
      visit_date: cleanDate,
      record_type: recordType,
      chief_complaint: cleanSymptoms,
      diagnosis: diagnosis.trim(),
      clinical_findings: clinicalFindings || '',
      treatment: treatment || '',
      prescription: cleanPrescription,
      doctor_notes: cleanNotes
    };

    const { data, error } = await supabase
      .from('medical_records')
      .insert(insertPayload)
      .select(`
        *,
        doctors (
          id,
          full_name,
          organization,
          specialization
        )
      `)
      .single();

    if (error) {
      throw new Error('Medical record could not be saved.');
    }

    return { ...data, doctor: data.doctors || null };
  }

  // 2. PERSISTENT REST DATABASE API PATH
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/db/medical_records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId,
        doctor_id: doctorId,
        visit_date: cleanDate,
        record_type: recordType,
        symptoms: cleanSymptoms,
        chief_complaint: cleanSymptoms,
        diagnosis: diagnosis.trim(),
        clinical_findings: clinicalFindings,
        treatment,
        medicine,
        dosage,
        frequency,
        follow_up_date: cleanFollowUp,
        doctor_notes: cleanNotes,
        prescription: cleanPrescription
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Medical record could not be saved.');
    }
    return data;
  } else {
    // Node environment
    const { getDb } = await import('../../serverDb.js');
    const crypto = await import('node:crypto');
    const db = getDb();

    const recordId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO medical_records (
        id, patient_id, doctor_id, visit_date, record_type,
        symptoms, chief_complaint, diagnosis, clinical_findings,
        treatment, medicine, dosage, frequency, follow_up_date,
        doctor_notes, prescription, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      recordId,
      patientId,
      doctorId,
      cleanDate,
      recordType,
      cleanSymptoms,
      cleanSymptoms,
      diagnosis.trim(),
      clinicalFindings,
      treatment,
      medicine,
      dosage,
      frequency,
      cleanFollowUp,
      cleanNotes,
      cleanPrescription,
      now,
      now
    );

    // Auto-link prescription
    const medName = medicine || cleanPrescription;
    if (medName && medName.trim()) {
      db.prepare(`
        INSERT INTO prescriptions (id, patient_id, doctor_id, medicine, dosage, frequency, duration, instructions, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)
      `).run(
        crypto.randomUUID(),
        patientId,
        doctorId,
        medName.trim(),
        dosage,
        frequency,
        '30 days',
        cleanNotes || treatment,
        now
      );
    }

    const doc = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);
    const inserted = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(recordId);

    return {
      ...inserted,
      doctor: doc ? {
        id: doc.id,
        full_name: doc.full_name,
        organization: doc.organization,
        specialization: doc.specialization
      } : null
    };
  }
}
