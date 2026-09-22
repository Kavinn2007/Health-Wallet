import { getSupabase, isSupabaseConfigured, initDatabaseConfig } from './supabaseClient.js';

let sessionState = {
  currentUser: null,
  currentDoctor: null,
  currentPatient: null
};

// Listeners for auth changes
const authListeners = new Set();

function notifyAuthChange() {
  authListeners.forEach(listener => {
    try { listener(sessionState); } catch (e) { console.error(e); }
  });
}

export function subscribeAuthChange(listener) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

/**
 * Log in a user (Doctor or Patient) with email, Health Wallet ID, or Registration Number
 * Reusable function required by architecture specification: loginUser()
 */
export async function loginUser(loginId, password) {
  await initDatabaseConfig();
  const trimmedId = (loginId || '').trim();
  const cleanPass = password || '';

  if (!trimmedId || !cleanPass) {
    throw new Error('Please enter both login identifier and password.');
  }

  // 1. SUPABASE POSTGRESQL PATH
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    let emailToAuth = trimmedId;

    // If loginId is not an email, lookup associated user email in database
    if (!trimmedId.includes('@')) {
      // Check if it's a Health Wallet ID
      const { data: patientMatch } = await supabase
        .from('patients')
        .select('user_id, health_wallet_id, full_name, users(email)')
        .ilike('health_wallet_id', trimmedId)
        .single();

      if (patientMatch && patientMatch.users?.email) {
        emailToAuth = patientMatch.users.email;
      } else {
        // Check if it's a Doctor Medical Registration Number
        const { data: docMatch } = await supabase
          .from('doctors')
          .select('user_id, medical_registration_number, full_name, users(email)')
          .ilike('medical_registration_number', trimmedId)
          .single();

        if (docMatch && docMatch.users?.email) {
          emailToAuth = docMatch.users.email;
        }
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password: cleanPass
    });

    if (authError) {
      throw new Error('Invalid login credentials. Please verify your ID and password.');
    }

    // Fetch user profile from public.users table
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userProfile) {
      throw new Error('User profile record not found in database.');
    }

    let doctor = null;
    let patient = null;

    if (userProfile.role === 'doctor') {
      const { data: docData } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', userProfile.id)
        .single();
      doctor = docData || null;
    } else if (userProfile.role === 'patient') {
      const { data: patData } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', userProfile.id)
        .single();
      patient = patData || null;
    }

    sessionState = {
      currentUser: userProfile,
      currentDoctor: doctor,
      currentPatient: patient
    };

    notifyAuthChange();
    return sessionState;
  }

  // 2. PERSISTENT REST DATABASE API PATH
  let resData;
  if (typeof window !== 'undefined') {
    const res = await fetch('/api/db/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: trimmedId, password: cleanPass })
    });

    resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.error || 'Invalid Login ID or Password');
    }
  } else {
    // In Node test environment, read serverDb directly
    const { readDb } = await import('../../serverDb.js');
    const db = readDb();
    let user = db.users.find(u => 
      (u.login_id && u.login_id.toLowerCase() === trimmedId.toLowerCase()) || 
      (u.email && u.email.toLowerCase() === trimmedId.toLowerCase())
    );
    let patient = null;
    let doctor = null;

    if (!user) {
      patient = db.patients.find(p => p.health_wallet_id.toLowerCase() === trimmedId.toLowerCase());
      if (patient) user = db.users.find(u => u.id === patient.user_id);
    }
    if (!user) {
      doctor = db.doctors.find(d => d.medical_registration_number.toLowerCase() === trimmedId.toLowerCase());
      if (doctor) user = db.users.find(u => u.id === doctor.user_id);
    }

    if (!user || user.password !== cleanPass) {
      throw new Error('Invalid Login ID or Password');
    }

    if (!patient && user.role === 'patient') {
      patient = db.patients.find(p => p.user_id === user.id) || null;
    }
    if (!doctor && user.role === 'doctor') {
      doctor = db.doctors.find(d => d.user_id === user.id) || null;
    }

    const safeUser = { ...user };
    delete safeUser.password;
    resData = { user: safeUser, doctor, patient };
  }

  sessionState = {
    currentUser: resData.user,
    currentDoctor: resData.doctor || null,
    currentPatient: resData.patient || null
  };

  notifyAuthChange();
  return sessionState;
}

/**
 * Log out current user
 * Reusable function required by architecture specification: logoutUser()
 */
export async function logoutUser() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signout warning:', e.message);
    }
  }

  sessionState = {
    currentUser: null,
    currentDoctor: null,
    currentPatient: null
  };

  notifyAuthChange();
  return true;
}

/**
 * Get current authenticated user
 */
export function getCurrentUser() {
  return sessionState.currentUser;
}

/**
 * Get current authenticated doctor
 * Reusable function required by architecture specification: getCurrentDoctor()
 */
export function getCurrentDoctor() {
  return sessionState.currentDoctor;
}

/**
 * Get current authenticated patient
 */
export function getCurrentPatient() {
  return sessionState.currentPatient;
}

export function setSessionDirect(user, doctor = null, patient = null) {
  sessionState = {
    currentUser: user,
    currentDoctor: doctor,
    currentPatient: patient
  };
  notifyAuthChange();
}
