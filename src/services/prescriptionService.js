/**
 * Prescription Service for Doctor Creation and Pharmacy Dispensing
 */

export async function getPatientPrescriptions(patientId) {
  if (!patientId) return [];

  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/db/prescriptions?patient_id=${encodeURIComponent(patientId)}`);
    if (!res.ok) return [];
    return await res.json();
  } else {
    const { getDb } = await import('../../serverDb.js');
    const db = getDb();
    return db.prepare(`
      SELECT p.*, d.full_name as prescribing_doctor, d.organization as doctor_org
      FROM prescriptions p
      LEFT JOIN doctors d ON p.doctor_id = d.id
      WHERE p.patient_id = ?
      ORDER BY p.created_at DESC
    `).all(patientId);
  }
}

export async function createPrescription({
  patientId,
  doctorId = null,
  medicine,
  dosage = '',
  frequency = '',
  duration = '',
  instructions = ''
}) {
  if (!patientId || !medicine) {
    throw new Error('Patient ID and Medicine name are required.');
  }

  if (typeof window !== 'undefined') {
    const res = await fetch('/api/db/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId,
        doctor_id: doctorId,
        medicine: medicine.trim(),
        dosage,
        frequency,
        duration,
        instructions
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save prescription.');
    }
    return data;
  } else {
    const { getDb } = await import('../../serverDb.js');
    const crypto = await import('node:crypto');
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO prescriptions (id, patient_id, doctor_id, medicine, dosage, frequency, duration, instructions, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)
    `).run(id, patientId, doctorId, medicine.trim(), dosage, frequency, duration, instructions, now);

    return db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(id);
  }
}

export async function dispensePrescription({
  prescriptionId,
  dispensedBy = 'MedPlus Care Pharmacy',
  userId = null,
  patientHwId = null
}) {
  if (!prescriptionId) {
    throw new Error('Prescription ID is required to dispense.');
  }

  if (typeof window !== 'undefined') {
    const res = await fetch('/api/db/prescriptions/dispense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prescription_id: prescriptionId,
        dispensed_by: dispensedBy,
        user_id: userId,
        patient_hw_id: patientHwId
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to dispense prescription.');
    }
    return data;
  } else {
    const { getDb } = await import('../../serverDb.js');
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE prescriptions 
      SET status = 'Dispensed', dispensed_at = ?, dispensed_by = ? 
      WHERE id = ?
    `).run(now, dispensedBy, prescriptionId);

    return db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(prescriptionId);
  }
}
