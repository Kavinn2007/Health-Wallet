import { getSupabase, isSupabaseConfigured, initDatabaseConfig } from './supabaseClient.js';

/**
 * Activate a new Doctor account
 * Required by user specification: DOCTOR activation flow
 */
export async function activateDoctor({
  fullName,
  medicalRegNo,
  specialization = 'General Medicine',
  organization = 'Medical Center',
  email,
  password
}) {
  await initDatabaseConfig();
  const cleanName = (fullName || '').trim();
  const cleanReg = (medicalRegNo || '').trim();
  const cleanSpec = (specialization || '').trim();
  const cleanOrg = (organization || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = password || '';

  if (!cleanName || !cleanReg || !cleanEmail || !cleanPass) {
    throw new Error('Full Name, Medical Registration Number, Email, and Password are required.');
  }

  // 1. SUPABASE POSTGRESQL PATH
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();

    const { data: authResult, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPass
    });

    if (authError) {
      throw new Error(`Doctor activation failed: ${authError.message}`);
    }

    const userId = authResult.user?.id;
    if (!userId) {
      throw new Error('Could not obtain authenticated user identifier.');
    }

    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        full_name: cleanName,
        email: cleanEmail,
        role: 'doctor',
        organization: cleanOrg
      });

    if (userError) {
      throw new Error(`Failed to save doctor user profile: ${userError.message}`);
    }

    const { data: doctorData, error: docError } = await supabase
      .from('doctors')
      .insert({
        user_id: userId,
        full_name: cleanName,
        medical_registration_number: cleanReg,
        specialization: cleanSpec,
        organization: cleanOrg
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Failed to create doctor registry entry: ${docError.message}`);
    }

    return {
      user: { id: userId, full_name: cleanName, email: cleanEmail, role: 'doctor' },
      doctor: doctorData
    };
  }

  // 2. PERSISTENT REST DATABASE API PATH
  if (typeof window !== 'undefined') {
    const userRes = await fetch('/api/db/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: cleanPass,
        role: 'doctor',
        fullName: cleanName,
        organization: cleanOrg
      })
    });

    const userData = await userRes.json();
    if (!userRes.ok) {
      throw new Error(userData.error || 'Failed to activate doctor account.');
    }

    const docRes = await fetch('/api/db/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userData.user.id,
        full_name: cleanName,
        medical_registration_number: cleanReg,
        specialization: cleanSpec,
        organization: cleanOrg
      })
    });

    const doctorData = await docRes.json();
    if (!docRes.ok) {
      throw new Error(doctorData.error || 'Failed to create doctor record.');
    }

    return { user: userData.user, doctor: doctorData };
  } else {
    // Node environment
    const { readDb, writeDb } = await import('../../serverDb.js');
    const crypto = await import('node:crypto');
    const db = readDb();

    if (db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email already exists.');
    }
    if (db.doctors.some(d => d.medical_registration_number.toLowerCase() === cleanReg.toLowerCase())) {
      throw new Error('A doctor with this Medical Registration Number already exists.');
    }

    const userId = crypto.randomUUID();
    const newUser = {
      id: userId,
      full_name: cleanName,
      email: cleanEmail,
      password: cleanPass,
      role: 'doctor',
      organization: cleanOrg,
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);

    const newDoctor = {
      id: crypto.randomUUID(),
      user_id: userId,
      full_name: cleanName,
      medical_registration_number: cleanReg,
      specialization: cleanSpec,
      organization: cleanOrg,
      created_at: new Date().toISOString()
    };
    db.doctors.push(newDoctor);
    writeDb(db);

    const safeUser = { ...newUser };
    delete safeUser.password;
    return { user: safeUser, doctor: newDoctor };
  }
}

/**
 * Get doctor by associated user_id
 */
export async function getDoctorByUserId(userId) {
  await initDatabaseConfig();
  if (!userId) return null;

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return data;
  }

  if (typeof window !== 'undefined') {
    const res = await fetch(`/api/db/doctors?user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    return await res.json();
  } else {
    const { readDb } = await import('../../serverDb.js');
    const db = readDb();
    return db.doctors.find(d => d.user_id === userId) || null;
  }
}
