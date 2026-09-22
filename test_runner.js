import { store } from './src/state/store.js';
import { renderLoginView } from './src/components/LoginView.js';
import { renderAccountActivationModal } from './src/components/AccountActivationModal.js';
import { renderDoctorPortalView } from './src/components/DoctorPortalView.js';
import { renderPatientDashboardView } from './src/components/PatientDashboardView.js';
import { renderLabPortalView } from './src/components/LabPortalView.js';
import { renderPharmacyPortalView } from './src/components/PharmacyPortalView.js';
import { renderRecordKeeperPortalView } from './src/components/RecordKeeperPortalView.js';
import { resetDb, getDb } from './serverDb.js';
import { INDIAN_STATES, generateHealthWalletId } from './src/services/patientService.js';

console.log('================================================================');
console.log(' HEALTH WALLET — PATIENT REGISTRATION & 5-ROLE WORKFLOW TEST ');
console.log('================================================================\n');

async function runAcceptanceTests() {
  // -----------------------------------------------------------------
  // Step 0: Clean State & Zero Predefined Accounts
  // -----------------------------------------------------------------
  console.log('--- Step 0: Reset Database to Clean Zero-Account State ---');
  resetDb();
  const db = getDb();
  const initialUsersCount = db.prepare('SELECT count(*) as c FROM users').get().c;
  if (initialUsersCount !== 0) {
    throw new Error(`Database must start with 0 users, found ${initialUsersCount}`);
  }
  console.log('✓ Verified: Zero predefined accounts. System starts completely empty.\n');

  // -----------------------------------------------------------------
  // Step 1: Verify 28 Indian States with Official Short Codes
  // -----------------------------------------------------------------
  console.log('--- Step 1: Verify 28 Indian States & Short Codes ---');
  if (INDIAN_STATES.length !== 28) {
    throw new Error(`Expected exactly 28 Indian states, found ${INDIAN_STATES.length}`);
  }
  const sampleStates = ['TN', 'KA', 'KL', 'AP', 'TS', 'MH', 'UP', 'WB', 'GJ', 'RJ'];
  for (const code of sampleStates) {
    const found = INDIAN_STATES.find(s => s.code === code);
    if (!found) throw new Error(`Missing expected state code: ${code}`);
    const generatedId = generateHealthWalletId(code);
    if (!generatedId.startsWith(`HW-${code}-`) || !/^HW-[A-Z]{2}-\d{8}$/.test(generatedId)) {
      throw new Error(`Generated ID does not match HW-[STATE_CODE]-[RANDOM_NUMBERS] format: ${generatedId}`);
    }
  }
  console.log('✓ Verified: All 28 States loaded with official codes (including Telangana -> TS).');
  console.log('✓ Verified: State-based HW ID format verified (e.g. HW-TN-XXXXXXXX, HW-TS-XXXXXXXX).\n');

  // -----------------------------------------------------------------
  // Step 1.5: UI Verification — NO HW ID in Patient Registration Form
  // -----------------------------------------------------------------
  console.log('--- Step 1.5: Verify Patient Registration Form UI Rules ---');
  const patientModalHtml = renderAccountActivationModal({
    isActivationModalOpen: true,
    activationRole: 'patient',
    activationSuccessData: null
  });

  if (patientModalHtml.includes('reg-patient-hwid')) {
    throw new Error('FAIL: Patient registration form contains #reg-patient-hwid input field!');
  }
  if (patientModalHtml.toLowerCase().includes('auto-generate') || patientModalHtml.includes('Generate ID')) {
    throw new Error('FAIL: Patient registration form contains auto-generate / generate ID button!');
  }
  if (!patientModalHtml.includes('Create / Activate Patient Account')) {
    throw new Error('FAIL: Patient registration form must end with "Create / Activate Patient Account" button!');
  }
  console.log('✓ Verified: NO Health Wallet ID input field in Patient form.');
  console.log('✓ Verified: NO auto-generate or generate ID button before submission.');
  console.log('✓ Verified: Submit button says "Create / Activate Patient Account".\n');

  // -----------------------------------------------------------------
  // Step 2: Patient Registration Validation Tests
  // -----------------------------------------------------------------
  console.log('--- Step 2: Patient Field Validation (Mobile, Aadhaar, State) ---');

  // 2A. Test Invalid Mobile Number (9 digits)
  let invalidMobileCaught = false;
  try {
    await store.registerNewAccount({
      role: 'PATIENT',
      fullName: 'Test Patient',
      mobileNumber: '987654321', // 9 digits
      aadhaarNumber: '123456789012',
      bloodGroup: 'O+',
      gender: 'Male',
      state: 'Tamil Nadu',
      stateCode: 'TN',
      username: 'test_pat1',
      password: 'Password@123'
    });
  } catch (err) {
    invalidMobileCaught = true;
    console.log(`✓ Rejected invalid mobile number (<10 digits): "${err.message}"`);
  }
  if (!invalidMobileCaught) throw new Error('Failed to reject 9-digit mobile number');

  // 2B. Test Invalid Aadhaar Number (11 digits)
  let invalidAadhaarCaught = false;
  try {
    await store.registerNewAccount({
      role: 'PATIENT',
      fullName: 'Test Patient',
      mobileNumber: '9876543210',
      aadhaarNumber: '12345678901', // 11 digits
      bloodGroup: 'O+',
      gender: 'Male',
      state: 'Tamil Nadu',
      stateCode: 'TN',
      username: 'test_pat2',
      password: 'Password@123'
    });
  } catch (err) {
    invalidAadhaarCaught = true;
    console.log(`✓ Rejected invalid Aadhaar number (<12 digits): "${err.message}"`);
  }
  if (!invalidAadhaarCaught) throw new Error('Failed to reject 11-digit Aadhaar number');

  // -----------------------------------------------------------------
  // Step 3: Register Actual Accounts Across Multiple States & Roles
  // -----------------------------------------------------------------
  console.log('\n--- Step 3: Register Actual Patients across Multiple States & Roles ---');

  // 3A. Patient 1: Tamil Nadu (Sunita Patil)
  const p1Reg = await store.registerNewAccount({
    role: 'PATIENT',
    fullName: 'Sunita Patil',
    mobileNumber: '9845122334',
    aadhaarNumber: '556677889901',
    bloodGroup: 'B+',
    gender: 'Female',
    state: 'Tamil Nadu',
    stateCode: 'TN',
    username: 'sunita_patil',
    password: 'PatientPass@123'
  });
  const p1HwId = p1Reg.healthWalletId;
  if (!p1HwId.startsWith('HW-TN-') || !/^HW-TN-\d{8}$/.test(p1HwId)) {
    throw new Error(`Patient 1 HW ID format invalid: ${p1HwId}`);
  }
  console.log(`✓ Registered Patient 1 (Tamil Nadu): Sunita Patil -> ${p1HwId}`);

  // 3B. Patient 2: Karnataka (Ramesh Hegde)
  const p2Reg = await store.registerNewAccount({
    role: 'PATIENT',
    fullName: 'Ramesh Hegde',
    mobileNumber: '9731234567',
    aadhaarNumber: '667788990012',
    bloodGroup: 'O+',
    gender: 'Male',
    state: 'Karnataka',
    stateCode: 'KA',
    username: 'ramesh_k',
    password: 'PatientPass@456'
  });
  const p2HwId = p2Reg.healthWalletId;
  if (!p2HwId.startsWith('HW-KA-') || !/^HW-KA-\d{8}$/.test(p2HwId)) {
    throw new Error(`Patient 2 HW ID format invalid: ${p2HwId}`);
  }
  console.log(`✓ Registered Patient 2 (Karnataka): Ramesh Hegde -> ${p2HwId}`);

  // 3C. Patient 3: Kerala (Ananya Nair)
  const p3Reg = await store.registerNewAccount({
    role: 'PATIENT',
    fullName: 'Ananya Nair',
    mobileNumber: '9447123890',
    aadhaarNumber: '778899001123',
    bloodGroup: 'A+',
    gender: 'Female',
    state: 'Kerala',
    stateCode: 'KL',
    username: 'ananya_kl',
    password: 'PatientPass@789'
  });
  const p3HwId = p3Reg.healthWalletId;
  if (!p3HwId.startsWith('HW-KL-') || !/^HW-KL-\d{8}$/.test(p3HwId)) {
    throw new Error(`Patient 3 HW ID format invalid: ${p3HwId}`);
  }
  console.log(`✓ Registered Patient 3 (Kerala): Ananya Nair -> ${p3HwId}`);

  // 3D. Patient 4: Telangana (Karthik Rao)
  const p4Reg = await store.registerNewAccount({
    role: 'PATIENT',
    fullName: 'Karthik Rao',
    mobileNumber: '9100112233',
    aadhaarNumber: '889900112234',
    bloodGroup: 'B+',
    gender: 'Male',
    state: 'Telangana',
    stateCode: 'TS',
    username: 'karthik_ts',
    password: 'PatientPass@101'
  });
  const p4HwId = p4Reg.healthWalletId;
  if (!p4HwId.startsWith('HW-TS-') || !/^HW-TS-\d{8}$/.test(p4HwId)) {
    throw new Error(`Patient 4 HW ID format invalid for Telangana: ${p4HwId}`);
  }
  console.log(`✓ Registered Patient 4 (Telangana): Karthik Rao -> ${p4HwId}`);

  // Verify that success screen displays "Patient Account Created Successfully" and "Your Health Wallet ID"
  const successModalHtml = renderAccountActivationModal({
    isActivationModalOpen: true,
    activationRole: 'patient',
    activationSuccessData: store.getState().activationSuccessData
  });
  if (!successModalHtml.includes('Patient Account Created Successfully')) {
    throw new Error('FAIL: Success modal does not display "Patient Account Created Successfully"');
  }
  if (!successModalHtml.includes('Your Health Wallet ID')) {
    throw new Error('FAIL: Success modal does not display "Your Health Wallet ID"');
  }
  if (!successModalHtml.includes(p4HwId)) {
    throw new Error(`FAIL: Success modal does not contain generated HW ID ${p4HwId}`);
  }
  console.log('✓ Verified: Success screen displays "Patient Account Created Successfully" and "Your Health Wallet ID".');

  // Verify all 4 patients have distinct unique IDs
  const uniqueHwIds = new Set([p1HwId, p2HwId, p3HwId, p4HwId]);
  if (uniqueHwIds.size !== 4) {
    throw new Error('Health Wallet IDs must be distinct and unique');
  }
  console.log('✓ Verified: Multiple states generated distinct, unique Health Wallet IDs.');

  // 3E. Verify Duplicate Aadhaar Rejection
  let duplicateAadhaarCaught = false;
  try {
    await store.registerNewAccount({
      role: 'PATIENT',
      fullName: 'Duplicate Patient',
      mobileNumber: '9988776655',
      aadhaarNumber: '556677889901', // Same as Sunita Patil
      bloodGroup: 'AB+',
      gender: 'Male',
      state: 'Tamil Nadu',
      stateCode: 'TN',
      username: 'duplicate_user',
      password: 'Password@123'
    });
  } catch (err) {
    duplicateAadhaarCaught = true;
    console.log(`✓ Duplicate Aadhaar correctly rejected: "${err.message}"`);
  }
  if (!duplicateAadhaarCaught) throw new Error('Duplicate Aadhaar account was incorrectly allowed!');

  // 3E. Register Doctor (Dr. Arvind Kumar)
  const docReg = await store.registerNewAccount({
    role: 'DOCTOR',
    fullName: 'Dr. Arvind Kumar',
    doctorId: 'DOC-AK-8821',
    username: 'dr_arvind',
    password: 'DoctorPass@123'
  });
  console.log('✓ Registered Doctor: Dr. Arvind Kumar (dr_arvind, DOC-AK-8821)');

  // 3F. Register Pharmacist (Rajesh Gupta)
  const pharmReg = await store.registerNewAccount({
    role: 'PHARMACIST',
    fullName: 'Rajesh Gupta',
    pharmacyId: 'PH-KA-4412',
    username: 'rajesh_pharm',
    password: 'PharmacyPass@123'
  });
  console.log('✓ Registered Pharmacist: Rajesh Gupta (rajesh_pharm, PH-KA-4412)');

  // 3G. Register Lab (Kavita Sharma)
  const labReg = await store.registerNewAccount({
    role: 'LAB',
    fullName: 'Kavita Sharma',
    labId: 'LAB-KA-1029',
    username: 'kavita_lab',
    password: 'LabPass@123'
  });
  console.log('✓ Registered Lab User: Kavita Sharma (kavita_lab, LAB-KA-1029)');

  // 3H. Register Record Keeper (Suresh Nair)
  const rkReg = await store.registerNewAccount({
    role: 'RECORD_KEEPER',
    fullName: 'Suresh Nair',
    recordKeeperId: 'RK-REG-5501',
    username: 'suresh_records',
    password: 'RecordsPass@123'
  });
  console.log('✓ Registered Record Keeper: Suresh Nair (suresh_records, RK-REG-5501)\n');

  // -----------------------------------------------------------------
  // Step 4: Patient Login & Dashboard Verification
  // -----------------------------------------------------------------
  console.log('--- Step 4: Patient Login & Dashboard State Verification ---');
  const patLogin = await store.login('sunita_patil', 'PatientPass@123', 'patient');
  if (!patLogin) throw new Error('Patient login failed');

  let state = store.getState();
  const patDashboardHtml = renderPatientDashboardView(state);
  if (!patDashboardHtml.includes('Sunita Patil') || !patDashboardHtml.includes(p1HwId)) {
    throw new Error('Patient dashboard missing patient name or generated HW ID');
  }
  if (!patDashboardHtml.includes('Tamil Nadu') || !patDashboardHtml.includes('B+')) {
    throw new Error('Patient dashboard missing state or blood group');
  }
  if (!patDashboardHtml.includes('XXXX-XXXX-9901')) {
    throw new Error('Patient dashboard missing masked Aadhaar protection (XXXX-XXXX-9901)');
  }
  console.log(`✓ Patient logged in: ${state.currentPatient.full_name}`);
  console.log(`✓ Verified: Patient dashboard displays State: Tamil Nadu (TN), Blood Group: B+, Masked Aadhaar: XXXX-XXXX-9901`);
  console.log(`✓ Verified: Sensitive Aadhaar protected. Health Wallet ID: ${p1HwId}\n`);
  await store.logout();

  // -----------------------------------------------------------------
  // Step 5: Clinical Workflow: Doctor Searches Generated HW ID -> Adds Record
  // -----------------------------------------------------------------
  console.log('--- Step 5: Doctor Searches Generated HW ID & Adds Record ---');
  await store.login('dr_arvind', 'DoctorPass@123', 'doctor');
  
  const foundByDoc = await store.searchPatient(p1HwId);
  if (!foundByDoc) throw new Error(`Doctor could not find patient with generated HW ID: ${p1HwId}`);

  state = store.getState();
  if (state.searchedPatient.full_name !== 'Sunita Patil') {
    throw new Error('Doctor retrieved wrong patient');
  }
  console.log(`✓ Doctor found patient by generated ID: ${state.searchedPatient.full_name} (${p1HwId})`);

  // Doctor adds consultation & prescription
  const addedRecord = await store.addMedicalRecord({
    visitDate: '2026-09-07',
    symptoms: 'Fever, sore throat, cough',
    diagnosis: 'Acute Pharyngitis',
    treatment: 'Antibiotic course & warm saline gargles',
    medicine: 'Azithromycin 500mg',
    dosage: '500mg',
    frequency: 'Once daily for 3 days',
    followUpDate: '2026-09-12',
    doctorNotes: 'Patient advised rest and hydration.'
  });
  if (!addedRecord) throw new Error('Doctor failed to save consultation record');
  console.log('✓ Doctor added consultation & prescription for Azithromycin 500mg.');
  await store.logout();

  // -----------------------------------------------------------------
  // Step 6: Pharmacy Searches Same HW ID & Dispenses
  // -----------------------------------------------------------------
  console.log('\n--- Step 6: Pharmacy Searches Generated HW ID & Dispenses ---');
  await store.login('rajesh_pharm', 'PharmacyPass@123', 'pharmacist');
  await store.searchPatient(p1HwId);
  state = store.getState();
  if (state.patientPrescriptions.length === 0) {
    throw new Error('Pharmacy could not find prescription for patient');
  }
  const rx = state.patientPrescriptions[0];
  console.log(`✓ Pharmacy found prescription: ${rx.medicine} (${rx.status})`);
  const dispenseOk = await store.dispenseMedication(rx.id);
  if (!dispenseOk) throw new Error('Failed to dispense medication');
  console.log('✓ Pharmacy marked medication as Dispensed.');
  await store.logout();

  // -----------------------------------------------------------------
  // Step 7: Patient Confirms Updated Record
  // -----------------------------------------------------------------
  console.log('\n--- Step 7: Patient Confirms Updated Longitudinal Record ---');
  await store.login('sunita_patil', 'PatientPass@123', 'patient');
  state = store.getState();
  if (state.patientRecords.length !== 1 || state.patientRecords[0].diagnosis !== 'Acute Pharyngitis') {
    throw new Error('Patient cannot see updated medical record');
  }
  if (state.patientPrescriptions.length !== 1 || state.patientPrescriptions[0].status !== 'Dispensed') {
    throw new Error('Prescription status not updated to Dispensed in patient view');
  }
  console.log('✓ Patient dashboard displays diagnosis: "Acute Pharyngitis" and Dispensed prescription.');
  await store.logout();

  console.log('\n================================================================');
  console.log(' ALL PATIENT REGISTRATION & 5-ROLE WORKFLOW TESTS PASSED! ✓');
  console.log('================================================================\n');
}

runAcceptanceTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
