import { getSupabase, isSupabaseConfigured, initDatabaseConfig } from './supabaseClient.js';

export const INDIAN_STATES = [
  { name: 'Andhra Pradesh', code: 'AP' },
  { name: 'Arunachal Pradesh', code: 'AR' },
  { name: 'Assam', code: 'AS' },
  { name: 'Bihar', code: 'BR' },
  { name: 'Chhattisgarh', code: 'CG' },
  { name: 'Goa', code: 'GA' },
  { name: 'Gujarat', code: 'GJ' },
  { name: 'Haryana', code: 'HR' },
  { name: 'Himachal Pradesh', code: 'HP' },
  { name: 'Jharkhand', code: 'JH' },
  { name: 'Karnataka', code: 'KA' },
  { name: 'Kerala', code: 'KL' },
  { name: 'Madhya Pradesh', code: 'MP' },
  { name: 'Maharashtra', code: 'MH' },
  { name: 'Manipur', code: 'MN' },
  { name: 'Meghalaya', code: 'ML' },
  { name: 'Mizoram', code: 'MZ' },
  { name: 'Nagaland', code: 'NL' },
  { name: 'Odisha', code: 'OD' },
  { name: 'Punjab', code: 'PB' },
  { name: 'Rajasthan', code: 'RJ' },
  { name: 'Sikkim', code: 'SK' },
  { name: 'Tamil Nadu', code: 'TN' },
  { name: 'Telangana', code: 'TS' },
  { name: 'Tripura', code: 'TR' },
  { name: 'Uttar Pradesh', code: 'UP' },
  { name: 'Uttarakhand', code: 'UK' },
  { name: 'West Bengal', code: 'WB' }
];

/**
 * Resolves a state name or code to its official 2-letter uppercase code
 */
export function getStateCode(stateInput = 'TN') {
  if (!stateInput) return 'TN';
  const clean = String(stateInput).trim();
  if (clean.toUpperCase() === 'TG' || clean.toUpperCase() === 'TS') return 'TS';
  const found = INDIAN_STATES.find(s => 
    s.code.toUpperCase() === clean.toUpperCase() || 
    s.name.toLowerCase() === clean.toLowerCase()
  );
  return found ? found.code : (clean.toUpperCase().slice(0, 2) || 'TN');
}

/**
 * Generates an official state-based Health Wallet ID
 * Format: HW-[STATE_CODE]-[8_RANDOM_NUMBERS]
 * Example: HW-TN-94682701, HW-KA-58310492, HW-TS-61928374
 */
export function generateHealthWalletId(stateInput = 'TN') {
  const code = getStateCode(stateInput);
  const randomSeq = Math.floor(10000000 + Math.random() * 90000000);
  return `HW-${code}-${randomSeq}`;
}

/**
 * Activate a new Patient account
 * Reusable function: activatePatient()
 */
export async function activatePatient({
  fullName,
  mobile = '',
  mobileNumber = '',
  phone = '',
  aadhaarNumber = '',
  state = '',
  stateCode = 'TN',
  healthWalletId = null,
  dateOfBirth = null,
  gender = '',
  bloodGroup = 'O+',
  allergies = 'None',
  email = '',
  password
}) {
  await initDatabaseConfig();
  const cleanName = (fullName || '').trim();
  const cleanPhone = (mobile || mobileNumber || phone || '').trim();
  const cleanAadhaar = (aadhaarNumber || '').replace(/\D/g, '');
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = password || '';

  if (!cleanName || !cleanPass) {
    throw new Error('Full Name and Password are required for patient activation.');
  }

  const effectiveHwId = healthWalletId || generateHealthWalletId(stateCode);

  // 1. SUPABASE POSTGRESQL PATH
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const emailToUse = cleanEmail || `${effectiveHwId.toLowerCase().replace(/[^a-z0-9]/g, '')}@healthwallet.local`;

    const { data: authResult, error: authError } = await supabase.auth.signUp({
      email: emailToUse,
      password: cleanPass
    });

    if (authError) {
      throw new Error(`Activation failed: ${authError.message}`);
    }

    const userId = authResult.user?.id;
    if (!userId) {
      throw new Error('Could not establish authentication identifier.');
    }

    await supabase.from('users').insert({
      id: userId,
      full_name: cleanName,
      email: emailToUse,
      role: 'patient',
      health_wallet_id: effectiveHwId,
      organization: 'Personal Portal'
    });

    const { data: patientData, error: patError } = await supabase
      .from('patients')
      .insert({
        user_id: userId,
        health_wallet_id: effectiveHwId,
        full_name: cleanName,
        date_of_birth: dateOfBirth,
        gender: gender,
        phone: cleanPhone,
        mobile_number: cleanPhone,
        aadhaar_number: cleanAadhaar,
        blood_group: bloodGroup,
        allergies: allergies,
        state: state || '',
        state_code: stateCode || 'TN'
      })
      .select()
      .single();

    if (patError) {
      throw new Error(`Failed to initialize Health Wallet profile: ${patError.message}`);
    }

    return {
      user: { id: userId, full_name: cleanName, email: emailToUse, role: 'patient', health_wallet_id: effectiveHwId },
      patient: patientData
    };
  }

  // 2. PERSISTENT REST DATABASE API PATH
  if (typeof window !== 'undefined') {
    // Create User via API with effectiveHwId as primary login_id
    const userRes = await fetch('/api/db/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login_id: effectiveHwId,
        email: cleanEmail,
        password: cleanPass,
        role: 'patient',
        fullName: cleanName,
        organization: 'Personal Portal'
      })
    });

    const userData = await userRes.json();
    if (!userRes.ok) {
      throw new Error(userData.error || 'Failed to activate patient account.');
    }

    // Create Patient profile
    const patRes = await fetch('/api/db/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userData.user.id,
        health_wallet_id: effectiveHwId,
        full_name: cleanName,
        date_of_birth: dateOfBirth,
        gender: gender,
        phone: cleanPhone,
        mobile_number: cleanPhone,
        aadhaar_number: cleanAadhaar,
        blood_group: bloodGroup,
        allergies: allergies,
        state: state || '',
        state_code: stateCode || 'TN'
      })
    });

    const patientData = await patRes.json();
    if (!patRes.ok) {
      throw new Error(patientData.error || 'Failed to create patient profile.');
    }

    return { user: userData.user, patient: patientData };
  } else {
    // Node environment
    const { getDb } = await import('../../serverDb.js');
    const crypto = await import('node:crypto');
    const db = getDb();

    const userId = crypto.randomUUID();
    const patientId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, login_id, full_name, email, password, role, health_wallet_id, organization, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, effectiveHwId, cleanName, cleanEmail, cleanPass, 'patient', effectiveHwId, 'Personal Portal', now);

    db.prepare(`
      INSERT INTO patients (id, user_id, health_wallet_id, full_name, date_of_birth, gender, phone, mobile_number, aadhaar_number, blood_group, allergies, current_medicines, state, state_code, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(patientId, userId, effectiveHwId, cleanName, dateOfBirth, gender, cleanPhone, cleanPhone, cleanAadhaar, bloodGroup, allergies, '', state || '', stateCode || 'TN', now, now);

    const createdPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    return {
      user: { id: userId, login_id: effectiveHwId, full_name: cleanName, role: 'patient', health_wallet_id: effectiveHwId },
      patient: createdPatient
    };
  }
}

/**
 * Find patient by unique Health Wallet ID
 */
export async function getPatientByHealthWalletId(healthWalletId) {
  await initDatabaseConfig();
  const cleanId = (healthWalletId || '').trim();
  if (!cleanId) return null;

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .ilike('health_wallet_id', cleanId)
      .single();

    if (error || !data) return null;
    return data;
  }

  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/db/patients?health_wallet_id=${encodeURIComponent(cleanId)}`);
    if (!res.ok) return null;
    return await res.json();
  } else {
    const { getDb } = await import('../../serverDb.js');
    const db = getDb();
    const found = db.prepare('SELECT * FROM patients WHERE LOWER(health_wallet_id) = LOWER(?)').get(cleanId);
    return found || null;
  }
}

/**
 * Find patient by internal UUID
 */
export async function getPatientById(patientId) {
  await initDatabaseConfig();
  if (!patientId) return null;

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();
    if (error) return null;
    return data;
  }

  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/db/patients?id=${encodeURIComponent(patientId)}`);
    if (!res.ok) return null;
    return await res.json();
  } else {
    const { getDb } = await import('../../serverDb.js');
    const db = getDb();
    const found = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    return found || null;
  }
}
