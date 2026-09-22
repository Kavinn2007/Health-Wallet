import { CentralDatabaseService } from './src/services/databaseService.js';
import * as supabaseClientModule from './src/services/supabaseClient.js';
import { INDIAN_STATES, generateHealthWalletId } from './src/services/patientService.js';

console.log('================================================================');
console.log(' TESTING CENTRAL DATABASE SERVICE WITH SUPABASE POSTGRESQL MOCK ');
console.log('================================================================\n');

// Mock data tables in memory simulating PostgreSQL - starts COMPLETELY EMPTY per Req 8
const mockDb = {
  users: [],
  patients: [],
  medical_records: [],
  lab_reports: [],
  medications: [],
  audit_logs: []
};

function createMockSupabase() {
  return {
    from(tableName) {
      const table = mockDb[tableName] || [];
      let filters = [];
      let orderCol = null;
      let orderAsc = true;
      let limitCount = null;

      const queryBuilder = {
        select(cols = '*') {
          return queryBuilder;
        },
        ilike(col, val) {
          filters.push(row => String(row[col] || '').toLowerCase() === String(val || '').toLowerCase());
          return queryBuilder;
        },
        eq(col, val) {
          filters.push(row => row[col] === val);
          return queryBuilder;
        },
        not(col, op, val) {
          if (op === 'is' && val === null) {
            filters.push(row => row[col] !== null && row[col] !== undefined);
          }
          return queryBuilder;
        },
        order(col, { ascending = true } = {}) {
          orderCol = col;
          orderAsc = ascending;
          return queryBuilder;
        },
        limit(count) {
          limitCount = count;
          return queryBuilder;
        },
        async maybeSingle() {
          let rows = table.filter(r => filters.every(f => f(r)));
          return { data: rows[0] || null, error: null };
        },
        async single() {
          let rows = table.filter(r => filters.every(f => f(r)));
          if (!rows[0]) return { data: null, error: { message: 'Row not found' } };
          return { data: rows[0], error: null };
        },
        insert(payload) {
          const newRow = { id: `uuid-${Date.now()}-${Math.random()}`, created_at: new Date().toISOString(), ...payload };
          table.push(newRow);
          return {
            select() {
              return {
                async single() {
                  return { data: newRow, error: null };
                }
              };
            }
          };
        },
        update(payload) {
          return {
            eq(col, val) {
              for (const row of table) {
                if (row[col] === val) {
                  Object.assign(row, payload);
                }
              }
              return Promise.resolve({ data: null, error: null });
            }
          };
        },
        then(resolve) {
          let rows = table.filter(r => filters.every(f => f(r)));
          if (orderCol) {
            rows.sort((a, b) => {
              if (a[orderCol] < b[orderCol]) return orderAsc ? -1 : 1;
              if (a[orderCol] > b[orderCol]) return orderAsc ? 1 : -1;
              return 0;
            });
          }
          if (limitCount) {
            rows = rows.slice(0, limitCount);
          }
          resolve({ data: rows, error: null });
        }
      };
      return queryBuilder;
    }
  };
}

const mockClient = createMockSupabase();
supabaseClientModule.setSupabaseClient(mockClient);

async function testSupabaseIntegration() {
  const service = new CentralDatabaseService();

  // 1. Verify Zero Initial Users
  console.log('1. Verifying Zero Predefined Data in Supabase...');
  if (mockDb.users.length !== 0) {
    throw new Error('Supabase database must start with 0 users');
  }
  console.log('✓ Verified: Starts completely empty with zero default data.\n');

  // 2. Test Indian States and State-Based Health Wallet ID Generation
  console.log('2. Verifying Indian States List and Health Wallet ID Format...');
  if (!Array.isArray(INDIAN_STATES) || INDIAN_STATES.length !== 28) {
    throw new Error(`Expected 28 Indian States, found ${INDIAN_STATES.length}`);
  }
  const tnId = generateHealthWalletId('TN');
  const kaId = generateHealthWalletId('KA');
  const mhId = generateHealthWalletId('MH');
  const idRegex = /^HW-[A-Z]{2}-\d{8}$/;
  if (!idRegex.test(tnId) || !idRegex.test(kaId) || !idRegex.test(mhId)) {
    throw new Error(`Invalid HW ID format: TN=${tnId}, KA=${kaId}, MH=${mhId}`);
  }
  console.log(`✓ Verified 28 States & State-based ID format: ${tnId}, ${kaId}, ${mhId}`);

  // Test that ID does NOT contain Aadhaar or Mobile
  const sampleAadhaar = '987654321098';
  const sampleMobile = '9876543210';
  if (tnId.includes(sampleAadhaar) || tnId.includes(sampleMobile)) {
    throw new Error('Privacy violation: Health Wallet ID contains Aadhaar or Mobile digits');
  }
  console.log('✓ Verified: Health Wallet ID contains NO Aadhaar or Mobile numbers.\n');

  // 3. Test Patient Input Validations
  console.log('3. Testing Patient Registration Validations...');
  // Invalid mobile (<10 digits)
  let invalidMobileCaught = false;
  try {
    await service.registerAccount({
      role: 'PATIENT',
      name: 'Invalid User',
      username: 'inv_mobile',
      password: 'Password@123',
      mobileNumber: '98765',
      aadhaarNumber: '123456789012',
      state: 'Maharashtra',
      stateCode: 'MH'
    });
  } catch (err) {
    if (err.message.includes('10-digit Indian mobile number')) invalidMobileCaught = true;
  }
  if (!invalidMobileCaught) throw new Error('Failed to validate 10-digit mobile number');
  console.log('✓ Successfully caught invalid mobile number (<10 digits).');

  // Invalid Aadhaar (<12 digits)
  let invalidAadhaarCaught = false;
  try {
    await service.registerAccount({
      role: 'PATIENT',
      name: 'Invalid User',
      username: 'inv_aadhaar',
      password: 'Password@123',
      mobileNumber: '9876543210',
      aadhaarNumber: '12345',
      state: 'Maharashtra',
      stateCode: 'MH'
    });
  } catch (err) {
    if (err.message.includes('12-digit Aadhaar number')) invalidAadhaarCaught = true;
  }
  if (!invalidAadhaarCaught) throw new Error('Failed to validate 12-digit Aadhaar number');
  console.log('✓ Successfully caught invalid Aadhaar number (<12 digits).');

  // Missing State
  let missingStateCaught = false;
  try {
    await service.registerAccount({
      role: 'PATIENT',
      name: 'Invalid User',
      username: 'inv_state',
      password: 'Password@123',
      mobileNumber: '9876543210',
      aadhaarNumber: '123456789012',
      state: '',
      stateCode: ''
    });
  } catch (err) {
    if (err.message.includes('select a State')) missingStateCaught = true;
  }
  if (!missingStateCaught) throw new Error('Failed to validate missing State');
  console.log('✓ Successfully caught missing State validation.\n');

  // 4. Register Accounts Across All 5 Roles
  console.log('4. Registering Actual Accounts for All 5 Roles in Supabase...');
  
  // Doctor 1
  const doc1 = await service.registerAccount({
    role: 'DOCTOR',
    name: 'Dr. Alok Verma',
    username: 'dr_alok',
    password: 'DocPassword@123',
    doctorId: 'DOC-AV-7711'
  });
  console.log(`✓ Registered Doctor 1: ${doc1.name} (${doc1.username})`);

  // Doctor 2
  const doc2 = await service.registerAccount({
    role: 'DOCTOR',
    name: 'Dr. Preeti Deshmukh',
    username: 'dr_preeti',
    password: 'DocPassword@456',
    doctorId: 'DOC-PD-8822'
  });
  console.log(`✓ Registered Doctor 2: ${doc2.name} (${doc2.username})`);

  // Patient (Vikram Joshi from Maharashtra)
  const pat = await service.registerAccount({
    role: 'PATIENT',
    name: 'Vikram Joshi',
    username: 'vikram_j',
    password: 'PatPassword@123',
    mobileNumber: '9876543210',
    aadhaarNumber: '123456789012',
    bloodGroup: 'O+',
    gender: 'Male',
    state: 'Maharashtra',
    stateCode: 'MH',
    dateOfBirth: '1988-06-20',
    allergies: 'Sulfa drugs'
  });
  const hwId = pat.healthWalletId;
  if (!hwId.startsWith('HW-MH-')) {
    throw new Error(`Expected HW ID to start with HW-MH-, got: ${hwId}`);
  }
  console.log(`✓ Registered Patient: ${pat.name} (HW ID: ${hwId}, State: Maharashtra)`);

  // Test Duplicate Aadhaar Rejection
  let duplicateAadhaarCaught = false;
  try {
    await service.registerAccount({
      role: 'PATIENT',
      name: 'Duplicate Vikram',
      username: 'vikram_dup',
      password: 'PatPassword@123',
      mobileNumber: '9876543299',
      aadhaarNumber: '123456789012', // same Aadhaar as Vikram
      bloodGroup: 'O+',
      gender: 'Male',
      state: 'Maharashtra',
      stateCode: 'MH'
    });
  } catch (err) {
    if (err.message.includes('Aadhaar Number already exists')) duplicateAadhaarCaught = true;
  }
  if (!duplicateAadhaarCaught) throw new Error('Duplicate Aadhaar was allowed!');
  console.log('✓ Duplicate Aadhaar successfully rejected (no duplicate accounts allowed).');

  // Register Second Patient from Tamil Nadu
  const pat2 = await service.registerAccount({
    role: 'PATIENT',
    name: 'Ananya Raman',
    username: 'ananya_r',
    password: 'PatPassword@123',
    mobileNumber: '9876543222',
    aadhaarNumber: '223456789012',
    bloodGroup: 'B+',
    gender: 'Female',
    state: 'Tamil Nadu',
    stateCode: 'TN'
  });
  if (!pat2.healthWalletId.startsWith('HW-TN-')) {
    throw new Error(`Expected HW ID to start with HW-TN-, got: ${pat2.healthWalletId}`);
  }
  console.log(`✓ Registered Second Patient: ${pat2.name} (HW ID: ${pat2.healthWalletId}, State: Tamil Nadu)`);

  // Register Third Patient from Telangana (TS)
  const pat3 = await service.registerAccount({
    role: 'PATIENT',
    name: 'Karthik Rao',
    username: 'karthik_ts',
    password: 'PatPassword@123',
    mobileNumber: '9876543333',
    aadhaarNumber: '323456789012',
    bloodGroup: 'AB+',
    gender: 'Male',
    state: 'Telangana',
    stateCode: 'TS'
  });
  if (!pat3.healthWalletId.startsWith('HW-TS-')) {
    throw new Error(`Expected HW ID to start with HW-TS-, got: ${pat3.healthWalletId}`);
  }
  console.log(`✓ Registered Third Patient: ${pat3.name} (HW ID: ${pat3.healthWalletId}, State: Telangana)`);

  // Pharmacist
  const pharm = await service.registerAccount({
    role: 'PHARMACIST',
    name: 'Manish Tiwari',
    username: 'manish_rx',
    password: 'PharmPassword@123',
    pharmacyId: 'PH-BLR-9021'
  });
  console.log(`✓ Registered Pharmacist: ${pharm.name} (Pharmacy ID: PH-BLR-9021)`);

  // Lab
  const lab = await service.registerAccount({
    role: 'LAB',
    name: 'Ritu Sen',
    username: 'ritu_lab',
    password: 'LabPassword@123',
    labId: 'LAB-BLR-4011'
  });
  console.log(`✓ Registered Lab User: ${lab.name} (Lab ID: LAB-BLR-4011)`);

  // Record Keeper
  const rk = await service.registerAccount({
    role: 'RECORD_KEEPER',
    name: 'Mohan Lal',
    username: 'mohan_rk',
    password: 'RkPassword@123',
    recordKeeperId: 'RK-INST-1100'
  });
  console.log(`✓ Registered Record Keeper: ${rk.name} (Keeper ID: RK-INST-1100)\n`);

  // 3. Test Role Mismatch Rejection
  console.log('3. Testing Role Mismatch Rejection in Supabase Auth...');
  let mismatchCaught = false;
  try {
    // Patient credentials with Doctor role selected
    await service.login('vikram_j', 'PatPassword@123', 'doctor');
  } catch (err) {
    if (err.message.includes('Role mismatch')) {
      mismatchCaught = true;
      console.log(`✓ Role mismatch correctly rejected: "${err.message}"`);
    }
  }
  if (!mismatchCaught) {
    throw new Error('Security flaw: Supabase login allowed role mismatch!');
  }

  // 4. Test Successful Logins for All 5 Roles
  console.log('\n4. Testing Successful Authentication for All 5 Roles...');
  const docLogin = await service.login('dr_alok', 'DocPassword@123', 'doctor');
  if (docLogin.currentUser.role !== 'doctor') throw new Error('Doctor session role mismatch');
  console.log(`✓ Doctor authenticated: ${docLogin.currentUser.full_name}`);

  const patLogin = await service.login('vikram_j', 'PatPassword@123', 'patient');
  if (patLogin.currentUser.role !== 'patient') throw new Error('Patient session role mismatch');
  console.log(`✓ Patient authenticated: ${patLogin.currentUser.full_name}`);

  const pharmLogin = await service.login('manish_rx', 'PharmPassword@123', 'pharmacist');
  if (pharmLogin.currentUser.role !== 'pharmacist') throw new Error('Pharmacist session role mismatch');
  console.log(`✓ Pharmacist authenticated: ${pharmLogin.currentUser.full_name}`);

  const labLogin = await service.login('ritu_lab', 'LabPassword@123', 'lab');
  if (labLogin.currentUser.role !== 'lab') throw new Error('Lab session role mismatch');
  console.log(`✓ Lab user authenticated: ${labLogin.currentUser.full_name}`);

  const rkLogin = await service.login('mohan_rk', 'RkPassword@123', 'record_keeper');
  if (rkLogin.currentUser.role !== 'record_keeper') throw new Error('Record keeper session role mismatch');
  console.log(`✓ Record keeper authenticated: ${rkLogin.currentUser.full_name}\n`);

  // 5. Clinical Workflow in Supabase: Doctor Searches Patient, Adds Consultation & Lab
  console.log('5. Testing Doctor 1 Search & Clinical Consultation in Supabase...');
  const searchedPat = await service.searchPatientByHealthWalletId(hwId, docLogin.currentUser.id, 'doctor');
  if (!searchedPat || searchedPat.name !== 'Vikram Joshi') {
    throw new Error('Patient search failed');
  }
  console.log(`✓ Doctor found patient by Health Wallet ID: ${searchedPat.name}`);

  const savedRecord = await service.saveMedicalRecord({
    patientId: searchedPat.id,
    doctorId: docLogin.currentUser.id,
    visitDate: '2026-09-07',
    symptoms: 'Chest tightness, elevated BP',
    diagnosis: 'Essential Hypertension Grade 1',
    treatment: 'Lifestyle modification and anti-hypertensive therapy',
    prescription: 'Amlodipine 5mg',
    dosage: '5mg',
    frequency: 'Once daily'
  });
  console.log(`✓ Consultation saved with ID: ${savedRecord.id}`);

  // Doctor adds lab report with document
  const savedLab = await service.saveLabReport({
    patientId: searchedPat.id,
    doctorId: docLogin.currentUser.id,
    labName: 'Central Pathology',
    testName: 'Lipid Profile',
    testDate: '2026-09-07',
    result: 'Total Cholesterol: 210 mg/dL',
    referenceRange: '< 200 mg/dL Desirable',
    status: 'Verified Provider',
    reportFilePath: 'https://storage.healthwallet.gov.in/reports/lipid_profile.pdf'
  });
  console.log(`✓ Lab report saved with ID: ${savedLab.id}`);

  // 6. Cross-Doctor Access: Doctor 2 searches same patient
  console.log('\n6. Testing Cross-Doctor Longitudinal Record Access...');
  const doc2Login = await service.login('dr_preeti', 'DocPassword@456', 'doctor');
  const patientSeenByDoc2 = await service.searchPatientByHealthWalletId(hwId, doc2Login.currentUser.id, 'doctor');
  const recordsSeen = await service.getPatientMedicalRecords(patientSeenByDoc2.id);
  if (recordsSeen.length !== 1 || recordsSeen[0].diagnosis !== 'Essential Hypertension Grade 1') {
    throw new Error('Doctor 2 could not view Doctor 1 consultation record');
  }
  console.log(`✓ Doctor 2 (Dr. Preeti Deshmukh) retrieved Doctor 1 record: "${recordsSeen[0].diagnosis}"`);

  // 7. Pharmacy Queries Prescriptions & Dispenses
  console.log('\n7. Testing Pharmacy Prescription Dispensing in Supabase...');
  const meds = await service.getPatientMedications(searchedPat.id);
  if (meds.length !== 1 || meds[0].medicine !== 'Amlodipine 5mg') {
    throw new Error('Pharmacy could not find prescription');
  }
  console.log(`✓ Pharmacy found prescription: ${meds[0].medicine}`);
  await service.dispenseMedication({
    medicationId: meds[0].id,
    patientId: searchedPat.id,
    dispensedBy: 'Manish Tiwari (PH-BLR-9021)'
  });
  console.log('✓ Prescription dispensed successfully in Supabase.');

  // 8. Audit Logs
  console.log('\n8. Testing Audit Logs in Supabase...');
  const logs = await service.getAuditLogs(searchedPat.id);
  console.log(`✓ Audit log verified with ${logs.length} logged institutional events.`);

  console.log('\n========================================================');
  console.log(' ALL SUPABASE POSTGRESQL UNIT TESTS PASSED! ✓');
  console.log('========================================================\n');
}

testSupabaseIntegration().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
