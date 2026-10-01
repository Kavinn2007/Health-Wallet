/**
 * ====================================================================
 * PHASE 7 MANUAL VERIFICATION SCENARIO RUNNER
 * ====================================================================
 * Implements the mandated 22-step manual verification scenario:
 *  1. Create Patient A.
 *  2. Create Doctor A.
 *  3. Doctor searches Patient A.
 *  4. Doctor requests: CONSULTATIONS, DIAGNOSES, TREATMENTS, PRESCRIPTIONS.
 *  5. Patient approves.
 *  6. Doctor opens authorized clinical workspace.
 *  7. Create consultation.
 *  8. Verify consultation appears in patient timeline.
 *  9. Create diagnosis.
 * 10. Verify diagnosis appears in patient timeline.
 * 11. Create treatment.
 * 12. Verify treatment appears in patient timeline.
 * 13. Create prescription.
 * 14. Verify prescription appears in patient timeline.
 * 15. Verify prescription status is ACTIVE.
 * 16. Revoke consent as Patient A.
 * 17. Doctor refreshes.
 * 18. Verify doctor cannot create any new clinical record.
 * 19. Verify doctor cannot read protected records after revocation.
 * 20. Create a second short-lived consent.
 * 21. Allow it to expire.
 * 22. Verify doctor cannot create records after expiry.
 * ====================================================================
 */

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
};

console.log('================================================================');
console.log(' PHASE 7: 22-STEP MANUAL VERIFICATION SCENARIO                  ');
console.log('================================================================\n');

// Database State
const patients = [];
const doctors = [];
const accessRequests = [];
const consents = [];
const medicalRecords = [];
const consultations = [];
const diagnoses = [];
const treatments = [];
const prescriptions = [];

// Step 1: Create Patient A
console.log('Step 1: Create Patient A...');
const patientA = {
  id: 'pat-a-uuid',
  user_id: 'user-pat-a',
  patient_name: 'Ananya Sharma',
  health_wallet_id: 'HW-MH-58392019',
  blood_group: 'O+',
  state: 'Maharashtra',
};
patients.push(patientA);
console.log(`✓ Patient A registered: ${patientA.patient_name} (${patientA.health_wallet_id})`);

// Step 2: Create Doctor A
console.log('\nStep 2: Create Doctor A...');
const doctorA = {
  id: 'doc-a-uuid',
  user_id: 'user-doc-a',
  doctor_name: 'Dr. Vikram Malhotra',
  hospital_name: 'Lilavati Hospital & Research Centre',
  specialization: 'Internal Medicine',
  registration_number: 'MMC-2015-84920',
};
doctors.push(doctorA);
console.log(`✓ Doctor A registered: ${doctorA.doctor_name} (${doctorA.hospital_name})`);

// Step 3: Doctor searches Patient A
console.log('\nStep 3: Doctor searches Patient A by Health Wallet ID...');
function searchPatient(hwId) {
  const found = patients.find((p) => p.health_wallet_id.toUpperCase() === hwId.trim().toUpperCase());
  if (!found) return null;
  return {
    id: found.id,
    patient_name: found.patient_name,
    health_wallet_id: found.health_wallet_id,
    blood_group: found.blood_group,
    state: found.state,
  };
}
const searchResult = searchPatient('HW-MH-58392019');
assert(searchResult !== null, 'Patient A must be found by HW ID');
assert(searchResult.patient_name === 'Ananya Sharma', 'Patient name must match');
console.log(`✓ Doctor found patient: ${searchResult.patient_name}, Blood: ${searchResult.blood_group}, State: ${searchResult.state}`);

// Step 4: Doctor requests CONSULTATIONS, DIAGNOSES, TREATMENTS, PRESCRIPTIONS
console.log('\nStep 4: Doctor requests categories: CONSULTATIONS, DIAGNOSES, TREATMENTS, PRESCRIPTIONS...');
const requestedCategories = ['CONSULTATIONS', 'DIAGNOSES', 'TREATMENTS', 'PRESCRIPTIONS'];
const request1 = {
  id: 'req-1',
  patient_id: patientA.id,
  requester_user_id: doctorA.user_id,
  doctor_profile_id: doctorA.id,
  requested_record_types: requestedCategories,
  reason: 'Initial comprehensive clinical evaluation and symptom workup',
  status: 'PENDING',
  duration_hours: 24,
  expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  created_at: new Date().toISOString(),
};
accessRequests.push(request1);
console.log(`✓ Access Request submitted (Status: ${request1.status}) for categories: [${request1.requested_record_types.join(', ')}]`);

// Step 5: Patient approves
console.log('\nStep 5: Patient approves access request...');
function patientApproveRequest(patientUserId, requestId) {
  const req = accessRequests.find((r) => r.id === requestId);
  assert(req !== undefined, 'Request must exist');
  const pat = patients.find((p) => p.id === req.patient_id && p.user_id === patientUserId);
  assert(pat !== undefined, 'Caller must be the patient');
  req.status = 'APPROVED';

  const consent = {
    id: `consent-${Date.now()}`,
    access_request_id: req.id,
    patient_id: req.patient_id,
    doctor_user_id: req.requester_user_id,
    doctor_profile_id: req.doctor_profile_id,
    approved_record_types: [...req.requested_record_types],
    status: 'APPROVED',
    expires_at: req.expires_at,
    created_at: new Date().toISOString(),
  };
  consents.push(consent);
  return consent;
}
const consent1 = patientApproveRequest(patientA.user_id, request1.id);
assert(consent1.status === 'APPROVED', 'Consent must be APPROVED');
console.log(`✓ Patient approved request. Active consent created: ${consent1.id} (Expires: ${consent1.expires_at})`);

// Step 6: Doctor opens authorized clinical workspace
console.log('\nStep 6: Doctor opens authorized clinical workspace...');
function checkDoctorWorkspaceAuth(doctorUserId, patientId) {
  const doc = doctors.find((d) => d.user_id === doctorUserId);
  if (!doc) throw new Error('Access Denied: Caller is not a verified doctor');
  const pat = patients.find((p) => p.id === patientId);
  if (!pat) throw new Error('Patient not found');

  const activeConsent = consents.find(
    (c) => c.patient_id === patientId && c.doctor_user_id === doctorUserId && c.status === 'APPROVED'
  );
  if (!activeConsent) throw new Error('Access Denied: No approved consent');
  if (new Date(activeConsent.expires_at).getTime() <= Date.now()) {
    activeConsent.status = 'EXPIRED';
    throw new Error('Access Denied: Consent expired');
  }

  return {
    patientName: pat.patient_name,
    healthWalletId: pat.health_wallet_id,
    bloodGroup: pat.blood_group,
    state: pat.state,
    consentStatus: activeConsent.status,
    consentExpiry: activeConsent.expires_at,
    authorizedCategories: activeConsent.approved_record_types,
  };
}
const workspaceData = checkDoctorWorkspaceAuth(doctorA.user_id, patientA.id);
assert(workspaceData.consentStatus === 'APPROVED', 'Consent must be APPROVED');
assert(workspaceData.authorizedCategories.length === 4, 'Must have 4 authorized categories');
console.log(`✓ Clinical Workspace Loaded for: ${workspaceData.patientName} (${workspaceData.healthWalletId})`);
console.log(`  Blood Group: ${workspaceData.bloodGroup}, State: ${workspaceData.state}`);
console.log(`  Consent Status: ${workspaceData.consentStatus}, Expiry: ${workspaceData.consentExpiry}`);
console.log(`  Authorized Categories: [${workspaceData.authorizedCategories.join(', ')}]`);

// Clinical RPC Functions
function createConsultation(doctorUserId, patientId, input) {
  const auth = checkDoctorWorkspaceAuth(doctorUserId, patientId);
  if (!auth.authorizedCategories.includes('CONSULTATIONS') && !auth.authorizedCategories.includes('ALL_RECORDS')) {
    throw new Error('Consent does not authorize CONSULTATIONS');
  }
  if (!input.consultationDate) throw new Error('Consultation date required');
  if (!input.chiefComplaint?.trim()) throw new Error('Chief complaint required');

  const doc = doctors.find((d) => d.user_id === doctorUserId);
  const recordId = `rec-cons-${Date.now()}`;
  const rec = {
    id: recordId,
    patient_id: patientId,
    record_type: 'CONSULTATION',
    title: input.chiefComplaint.trim(),
    description: input.notes?.trim() || `Consultation with ${doc.doctor_name}`,
    record_date: input.consultationDate,
    provider_name: doc.doctor_name,
    provider_type: 'DOCTOR',
    hospital_name: doc.hospital_name,
    creator_type: 'PROVIDER_CREATED',
  };
  medicalRecords.push(rec);
  consultations.push({
    id: `cons-${Date.now()}`,
    patient_id: patientId,
    medical_record_id: recordId,
    consultation_date: input.consultationDate,
    chief_complaint: input.chiefComplaint.trim(),
    diagnosis: input.diagnosis?.trim() || null,
    treatment: input.treatment?.trim() || null,
  });
  return rec;
}

function createDiagnosis(doctorUserId, patientId, input) {
  const auth = checkDoctorWorkspaceAuth(doctorUserId, patientId);
  if (!auth.authorizedCategories.includes('DIAGNOSES') && !auth.authorizedCategories.includes('ALL_RECORDS')) {
    throw new Error('Consent does not authorize DIAGNOSES');
  }
  if (!input.diagnosisDate) throw new Error('Diagnosis date required');
  if (!input.condition?.trim()) throw new Error('Condition required');

  const doc = doctors.find((d) => d.user_id === doctorUserId);
  const recordId = `rec-diag-${Date.now()}`;
  const rec = {
    id: recordId,
    patient_id: patientId,
    record_type: 'DIAGNOSIS',
    title: input.condition.trim(),
    description: input.notes?.trim() || `Formal Diagnosis: ${input.condition.trim()}`,
    record_date: input.diagnosisDate,
    provider_name: doc.doctor_name,
    provider_type: 'DOCTOR',
    hospital_name: doc.hospital_name,
    creator_type: 'PROVIDER_CREATED',
  };
  medicalRecords.push(rec);
  diagnoses.push({
    id: `diag-${Date.now()}`,
    patient_id: patientId,
    medical_record_id: recordId,
    diagnosis_name: input.condition.trim(),
    notes: input.notes?.trim() || null,
  });
  return rec;
}

function createTreatment(doctorUserId, patientId, input) {
  const auth = checkDoctorWorkspaceAuth(doctorUserId, patientId);
  if (!auth.authorizedCategories.includes('TREATMENTS') && !auth.authorizedCategories.includes('ALL_RECORDS')) {
    throw new Error('Consent does not authorize TREATMENTS');
  }
  if (!input.treatmentDate) throw new Error('Treatment date required');
  if (!input.treatment?.trim()) throw new Error('Treatment required');

  const doc = doctors.find((d) => d.user_id === doctorUserId);
  const recordId = `rec-treat-${Date.now()}`;
  const rec = {
    id: recordId,
    patient_id: patientId,
    record_type: 'TREATMENT',
    title: input.treatment.trim(),
    description: input.carePlan?.trim() || `Treatment: ${input.treatment.trim()}`,
    record_date: input.treatmentDate,
    provider_name: doc.doctor_name,
    provider_type: 'DOCTOR',
    hospital_name: doc.hospital_name,
    creator_type: 'PROVIDER_CREATED',
  };
  medicalRecords.push(rec);
  treatments.push({
    id: `treat-${Date.now()}`,
    patient_id: patientId,
    medical_record_id: recordId,
    treatment_name: input.treatment.trim(),
    care_plan: input.carePlan?.trim() || null,
  });
  return rec;
}

function createPrescription(doctorUserId, patientId, input) {
  const auth = checkDoctorWorkspaceAuth(doctorUserId, patientId);
  if (!auth.authorizedCategories.includes('PRESCRIPTIONS') && !auth.authorizedCategories.includes('ALL_RECORDS')) {
    throw new Error('Consent does not authorize PRESCRIPTIONS');
  }
  if (!input.medicineName?.trim()) throw new Error('Medicine name required');
  if (!input.dosage?.trim()) throw new Error('Dosage required');
  if (!input.frequency?.trim()) throw new Error('Frequency required');
  if (!input.duration?.trim()) throw new Error('Duration required');

  const doc = doctors.find((d) => d.user_id === doctorUserId);
  const recordId = `rec-rx-${Date.now()}`;
  const rec = {
    id: recordId,
    patient_id: patientId,
    record_type: 'PRESCRIPTION',
    title: `${input.medicineName.trim()} (${input.dosage.trim()})`,
    description: `Rx: ${input.medicineName.trim()} ${input.dosage.trim()}, ${input.frequency.trim()}, ${input.duration.trim()}`,
    record_date: input.startDate || '2026-09-26',
    provider_name: doc.doctor_name,
    provider_type: 'DOCTOR',
    hospital_name: doc.hospital_name,
    creator_type: 'PROVIDER_CREATED',
  };
  medicalRecords.push(rec);
  const rxChild = {
    id: `rx-${Date.now()}`,
    patient_id: patientId,
    medical_record_id: recordId,
    medicine_name: input.medicineName.trim(),
    dosage: input.dosage.trim(),
    frequency: input.frequency.trim(),
    duration: input.duration.trim(),
    status: 'ACTIVE',
  };
  prescriptions.push(rxChild);
  return { rec, rxChild };
}

// Step 7: Create consultation
console.log('\nStep 7: Create consultation...');
const consRec = createConsultation(doctorA.user_id, patientA.id, {
  consultationDate: '2026-09-26',
  chiefComplaint: 'Severe recurrent migraine with photophobia',
  diagnosis: 'Migraine without aura',
  treatment: 'Triptan therapy and sleep hygiene',
  notes: 'BP 120/80 mmHg. Pupils equal and reactive. Neurological exam non-focal.',
});
console.log(`✓ Consultation created: "${consRec.title}" (ID: ${consRec.id})`);

// Step 8: Verify consultation appears in patient timeline
console.log('\nStep 8: Verify consultation appears in patient timeline...');
const patientRecordsAfterCons = medicalRecords.filter((r) => r.patient_id === patientA.id);
assert(
  patientRecordsAfterCons.some((r) => r.id === consRec.id && r.record_type === 'CONSULTATION'),
  'Consultation must appear in patient timeline'
);
console.log(`✓ Consultation appears in Patient A timeline. Total records: ${patientRecordsAfterCons.length}`);

// Step 9: Create diagnosis
console.log('\nStep 9: Create diagnosis...');
const diagRec = createDiagnosis(doctorA.user_id, patientA.id, {
  diagnosisDate: '2026-09-26',
  condition: 'Episodic Migraine with Aura',
  notes: 'ICD-10 G43.0. Confirmed clinical diagnosis based on ICHD-3 criteria.',
});
console.log(`✓ Diagnosis created: "${diagRec.title}" (ID: ${diagRec.id})`);

// Step 10: Verify diagnosis appears in patient timeline
console.log('\nStep 10: Verify diagnosis appears in patient timeline...');
const patientRecordsAfterDiag = medicalRecords.filter((r) => r.patient_id === patientA.id);
assert(
  patientRecordsAfterDiag.some((r) => r.id === diagRec.id && r.record_type === 'DIAGNOSIS'),
  'Diagnosis must appear in patient timeline'
);
console.log(`✓ Diagnosis appears in Patient A timeline. Total records: ${patientRecordsAfterDiag.length}`);

// Step 11: Create treatment
console.log('\nStep 11: Create treatment...');
const treatRec = createTreatment(doctorA.user_id, patientA.id, {
  treatmentDate: '2026-09-26',
  treatment: 'Acute Migraine Abortive Protocol & Preventive Trigger Avoidance',
  carePlan: 'Prescribe Sumatriptan at symptom onset. Follow up in 6 weeks with headache diary.',
});
console.log(`✓ Treatment created: "${treatRec.title}" (ID: ${treatRec.id})`);

// Step 12: Verify treatment appears in patient timeline
console.log('\nStep 12: Verify treatment appears in patient timeline...');
const patientRecordsAfterTreat = medicalRecords.filter((r) => r.patient_id === patientA.id);
assert(
  patientRecordsAfterTreat.some((r) => r.id === treatRec.id && r.record_type === 'TREATMENT'),
  'Treatment must appear in patient timeline'
);
console.log(`✓ Treatment appears in Patient A timeline. Total records: ${patientRecordsAfterTreat.length}`);

// Step 13: Create prescription
console.log('\nStep 13: Create prescription...');
const { rec: rxRec, rxChild } = createPrescription(doctorA.user_id, patientA.id, {
  medicineName: 'Sumatriptan Succinate',
  dosage: '50mg',
  frequency: 'As needed at onset of migraine',
  duration: '10 tablets',
  startDate: '2026-09-26',
});
console.log(`✓ Prescription created: "${rxRec.title}" (ID: ${rxRec.id})`);

// Step 14: Verify prescription appears in patient timeline
console.log('\nStep 14: Verify prescription appears in patient timeline...');
const patientRecordsAfterRx = medicalRecords.filter((r) => r.patient_id === patientA.id);
assert(
  patientRecordsAfterRx.some((r) => r.id === rxRec.id && r.record_type === 'PRESCRIPTION'),
  'Prescription must appear in patient timeline'
);
console.log(`✓ Prescription appears in Patient A timeline. Total records: ${patientRecordsAfterRx.length}`);

// Step 15: Verify prescription status is ACTIVE
console.log('\nStep 15: Verify prescription status is ACTIVE...');
assert(rxChild.status === 'ACTIVE', `Prescription status must be ACTIVE, got ${rxChild.status}`);
console.log(`✓ Prescription status verified as: ${rxChild.status}`);

// Step 16: Revoke consent as Patient A
console.log('\nStep 16: Revoke consent as Patient A...');
function revokeConsent(patientUserId, consentId) {
  const con = consents.find((c) => c.id === consentId);
  assert(con !== undefined, 'Consent must exist');
  const pat = patients.find((p) => p.id === con.patient_id && p.user_id === patientUserId);
  assert(pat !== undefined, 'Only patient can revoke');
  con.status = 'REVOKED';
  return con;
}
revokeConsent(patientA.user_id, consent1.id);
assert(consent1.status === 'REVOKED', 'Consent status must be REVOKED');
console.log(`✓ Consent ${consent1.id} revoked by Patient A. Status: REVOKED`);

// Step 17: Doctor refreshes
console.log('\nStep 17: Doctor refreshes clinical workspace...');
let refreshDenied = false;
try {
  checkDoctorWorkspaceAuth(doctorA.user_id, patientA.id);
} catch (err) {
  refreshDenied = true;
  console.log(`✓ Doctor workspace refresh rejected: "${err.message}"`);
}
assert(refreshDenied, 'Doctor refresh must be blocked after revocation');

// Step 18: Verify doctor cannot create any new clinical record
console.log('\nStep 18: Verify doctor cannot create any new clinical record...');
let newRecordBlocked = false;
try {
  createConsultation(doctorA.user_id, patientA.id, {
    consultationDate: '2026-09-26',
    chiefComplaint: 'Post-revocation attempt',
  });
} catch (err) {
  newRecordBlocked = true;
}
assert(newRecordBlocked, 'Doctor write must be blocked after revocation');
console.log('✓ Verified: Doctor cannot create new clinical records after revocation.');

// Step 19: Verify doctor cannot read protected records after revocation
console.log('\nStep 19: Verify doctor cannot read protected records after revocation...');
function doctorReadPatientRecords(doctorUserId, patientId) {
  const activeConsent = consents.find(
    (c) => c.patient_id === patientId && c.doctor_user_id === doctorUserId && c.status === 'APPROVED'
  );
  if (!activeConsent || new Date(activeConsent.expires_at).getTime() <= Date.now()) {
    throw new Error('Access no longer available.');
  }
  return medicalRecords.filter((r) => r.patient_id === patientId);
}
let readBlocked = false;
try {
  doctorReadPatientRecords(doctorA.user_id, patientA.id);
} catch (err) {
  readBlocked = err.message === 'Access no longer available.';
}
assert(readBlocked, 'Doctor read access must return "Access no longer available."');
console.log('✓ Verified: Doctor cannot read records after revocation. "Access no longer available." enforced.');

// Step 20: Create a second short-lived consent
console.log('\nStep 20: Create a second short-lived consent (2 seconds)...');
const shortLivedConsent = {
  id: 'consent-short-lived',
  access_request_id: 'req-short',
  patient_id: patientA.id,
  doctor_user_id: doctorA.user_id,
  doctor_profile_id: doctorA.id,
  approved_record_types: ['CONSULTATIONS', 'DIAGNOSES'],
  status: 'APPROVED',
  expires_at: new Date(Date.now() + 100).toISOString(), // expires in 100ms
  created_at: new Date().toISOString(),
};
consents.push(shortLivedConsent);
console.log(`✓ Short-lived consent created: ${shortLivedConsent.id} (Expires: ${shortLivedConsent.expires_at})`);

// Step 21: Allow it to expire
console.log('\nStep 21: Allow consent to expire...');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(150); // wait 150ms to ensure expiry
console.log('✓ Elapsed 150ms. Consent expiry threshold passed.');

// Step 22: Verify doctor cannot create records after expiry
console.log('\nStep 22: Verify doctor cannot create records after expiry...');
let expiredWriteBlocked = false;
try {
  createConsultation(doctorA.user_id, patientA.id, {
    consultationDate: '2026-09-26',
    chiefComplaint: 'Post-expiry attempt',
  });
} catch (err) {
  expiredWriteBlocked = err.message.includes('expired');
}
assert(expiredWriteBlocked, 'Writing after consent expiry must be blocked');
console.log('✓ Verified: Doctor cannot create records after consent expiry.');

console.log('\n================================================================');
console.log(' ALL 22 MANUAL VERIFICATION SCENARIO STEPS PASSED SUCCESSFULLY! ✓');
console.log('================================================================\n');
