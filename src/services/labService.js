/**
 * Lab Report Service for Diagnostic Telemetry
 */

export async function getPatientLabReports(patientId) {
  if (!patientId) return [];

  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/db/lab_reports?patient_id=${encodeURIComponent(patientId)}`);
    if (!res.ok) return [];
    return await res.json();
  } else {
    const { getDb } = await import('../../serverDb.js');
    const db = getDb();
    return db.prepare('SELECT * FROM lab_reports WHERE patient_id = ? ORDER BY test_date DESC, created_at DESC').all(patientId);
  }
}

export async function createLabReport({
  patientId,
  labUserId = null,
  labName = 'Apex Diagnostics',
  doctorId = null,
  testName,
  testDate,
  result,
  referenceRange = '',
  notes = '',
  status = 'Verified Provider',
  reportFilePath = null
}) {
  if (!patientId || !testName || !result) {
    throw new Error('Test Name, Result, and Patient ID are required.');
  }

  const cleanDate = testDate || new Date().toISOString().split('T')[0];

  if (typeof window !== 'undefined') {
    const res = await fetch('/api/db/lab_reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId,
        lab_user_id: labUserId,
        lab_name: labName,
        doctor_id: doctorId,
        test_name: testName.trim(),
        test_date: cleanDate,
        result: result.trim(),
        reference_range: referenceRange,
        notes,
        status,
        report_file_path: reportFilePath
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save lab report.');
    }
    return data;
  } else {
    const { getDb } = await import('../../serverDb.js');
    const crypto = await import('node:crypto');
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO lab_reports (
        id, patient_id, lab_user_id, lab_name, doctor_id,
        test_name, test_date, result, reference_range,
        notes, status, report_file_path, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      patientId,
      labUserId,
      labName,
      doctorId,
      testName.trim(),
      cleanDate,
      result.trim(),
      referenceRange,
      notes,
      status,
      reportFilePath,
      now
    );

    return db.prepare('SELECT * FROM lab_reports WHERE id = ?').get(id);
  }
}
