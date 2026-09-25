import {
  supabase,
  isSupabaseConfigured,
  type DoctorProfile,
  type MinimalPatientInfo,
  type AccessRequest,
  type RecordCategory,
} from './supabase';

export interface CreateAccessRequestInput {
  patientId: string;
  patientHwId: string;
  patientName: string;
  requestedRecordTypes: RecordCategory[];
  reason: string;
  durationHours: number;
}

const LOCAL_STORAGE_DOCTOR_PROFILE_KEY = 'health_wallet_v2_doctor_profile';
const LOCAL_STORAGE_ACCESS_REQUESTS_KEY = 'health_wallet_v2_access_requests';

// Default mock doctor profile for demo / offline sandbox
export const DEMO_DOCTOR_PROFILE: DoctorProfile = {
  id: 'doc-uuid-demo-1',
  user_id: 'doc-auth-user-demo-1',
  doctor_name: 'Dr. Ramesh Gupta',
  registration_number: 'TN-MC-2018-8472',
  specialization: 'Internal Medicine',
  hospital_name: 'City Care Multi-Speciality Hospital',
  mobile_number: '9845199887',
  username: 'dr_ramesh',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Fetch Doctor Profile by Supabase Auth User ID
 */
export async function getDoctorProfile(userId?: string): Promise<DoctorProfile | null> {
  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_DOCTOR_PROFILE_KEY);
      if (stored) return JSON.parse(stored);
      return DEMO_DOCTOR_PROFILE;
    } catch {
      return DEMO_DOCTOR_PROFILE;
    }
  }

  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) return null;

    const { data, error } = await supabase
      .from('doctor_profiles')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch doctor profile:', error.message);
      return null;
    }
    return data as DoctorProfile;
  } catch (err) {
    console.warn('Network error fetching doctor profile:', err);
    return null;
  }
}

/**
 * Primary Patient Search by Health Wallet ID (Exact Matching)
 * Returns MINIMAL patient info only:
 * - Patient Name
 * - Health Wallet ID
 * - Blood Group
 * - State
 * 
 * Never returns: Aadhaar, mobile number, medical records, or prescriptions.
 */
export async function searchPatientByHealthWalletId(
  hwId: string
): Promise<{ success: boolean; patient?: MinimalPatientInfo; error?: string }> {
  const cleanId = hwId.trim().toUpperCase();

  if (!cleanId) {
    return { success: false, error: 'Please enter a valid Health Wallet ID.' };
  }

  // Exact normalized format validation: HW-[STATE]-[8 DIGITS]
  const hwRegex = /^HW-[A-Z]{2}-\d{8}$/;
  if (!hwRegex.test(cleanId)) {
    return {
      success: false,
      error: 'Invalid Health Wallet ID format. Expected format: HW-TN-48291736',
    };
  }

  if (!isSupabaseConfigured) {
    // Offline / Demo verification against local patient session or mock database
    const localPatientStr = localStorage.getItem('health_wallet_v2_mock_session');
    let mockPatient: any = null;
    if (localPatientStr) {
      try {
        const parsed = JSON.parse(localPatientStr);
        if (parsed?.profile?.health_wallet_id?.toUpperCase() === cleanId) {
          mockPatient = parsed.profile;
        }
      } catch {
        // ignore
      }
    }

    // Default pre-seeded test patient: Sunita Patil (HW-TN-38236621)
    if (!mockPatient && cleanId === 'HW-TN-38236621') {
      mockPatient = {
        id: 'demo-uuid-1',
        patient_name: 'Sunita Patil',
        health_wallet_id: 'HW-TN-38236621',
        blood_group: 'B+',
        state: 'Tamil Nadu',
      };
    }

    if (mockPatient) {
      // Expose strictly minimal fields
      return {
        success: true,
        patient: {
          id: mockPatient.id,
          patient_name: mockPatient.patient_name,
          health_wallet_id: mockPatient.health_wallet_id,
          blood_group: mockPatient.blood_group,
          state: mockPatient.state,
        },
      };
    }

    return { success: false, error: 'Patient not found' };
  }

  try {
    // Call secure Postgres RPC function with restricted minimal projection
    const { data, error } = await supabase.rpc('search_patient_by_health_wallet_id', {
      p_health_wallet_id: cleanId,
    });

    if (error) {
      console.warn('Patient search RPC query error:', error.message);
      // Safe generic message — do not reveal database internals
      return { success: false, error: 'Patient not found' };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'Patient not found' };
    }

    const patientRow = data[0];
    return {
      success: true,
      patient: {
        id: patientRow.id,
        patient_name: patientRow.patient_name,
        health_wallet_id: patientRow.health_wallet_id,
        blood_group: patientRow.blood_group,
        state: patientRow.state,
      },
    };
  } catch {
    return { success: false, error: 'Patient not found' };
  }
}

/**
 * Create a PENDING Access Request to a Patient's Medical Records
 */
export async function createAccessRequest(
  input: CreateAccessRequestInput
): Promise<{ success: boolean; request?: AccessRequest; error?: string }> {
  if (!input.patientId) {
    return { success: false, error: 'Invalid patient selected.' };
  }

  if (!input.requestedRecordTypes || input.requestedRecordTypes.length === 0) {
    return {
      success: false,
      error: 'Please select at least one medical record type to request access.',
    };
  }

  const cleanReason = input.reason?.trim();
  if (!cleanReason) {
    return {
      success: false,
      error: 'Please enter a clinical reason for requesting access.',
    };
  }

  const durationHours = Number(input.durationHours) || 24;
  if (durationHours <= 0) {
    return { success: false, error: 'Invalid access duration specified.' };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000).toISOString();

  if (!isSupabaseConfigured) {
    // Offline simulation
    const localRequestsStr = localStorage.getItem(LOCAL_STORAGE_ACCESS_REQUESTS_KEY);
    let requests: AccessRequest[] = [];
    if (localRequestsStr) {
      try {
        requests = JSON.parse(localRequestsStr);
      } catch {
        requests = [];
      }
    }

    // Check duplicate pending request
    const existingPending = requests.find(
      (r) => r.patient_id === input.patientId && r.status === 'PENDING'
    );
    if (existingPending) {
      return {
        success: false,
        error:
          'You already have an active PENDING access request for this patient. Please await patient approval.',
      };
    }

    const newRequest: AccessRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      patient_id: input.patientId,
      requester_user_id: 'doc-auth-user-demo-1',
      doctor_profile_id: 'doc-uuid-demo-1',
      requester_role: 'DOCTOR',
      requested_record_types: input.requestedRecordTypes,
      reason: cleanReason,
      status: 'PENDING',
      duration_hours: durationHours,
      requested_at: now.toISOString(),
      expires_at: expiresAt,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      patient: {
        id: input.patientId,
        patient_name: input.patientName,
        health_wallet_id: input.patientHwId,
        blood_group: 'B+',
        state: 'Tamil Nadu',
      },
    };

    requests.unshift(newRequest);
    localStorage.setItem(LOCAL_STORAGE_ACCESS_REQUESTS_KEY, JSON.stringify(requests));
    return { success: true, request: newRequest };
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) {
      return { success: false, error: 'You must be signed in as a doctor.' };
    }

    // Retrieve doctor profile ID
    const { data: docProfile, error: docError } = await supabase
      .from('doctor_profiles')
      .select('id')
      .eq('user_id', userAuth.user.id)
      .maybeSingle();

    if (docError || !docProfile) {
      return {
        success: false,
        error: 'Only authenticated medical doctors can create access requests.',
      };
    }

    // Check duplicate pending request
    const { data: existingPending } = await supabase
      .from('access_requests')
      .select('id, requested_at')
      .eq('patient_id', input.patientId)
      .eq('requester_user_id', userAuth.user.id)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (existingPending) {
      return {
        success: false,
        error:
          'You already have an active PENDING access request for this patient. Please await patient approval.',
      };
    }

    const { data: inserted, error: insertError } = await supabase
      .from('access_requests')
      .insert({
        patient_id: input.patientId,
        requester_user_id: userAuth.user.id,
        doctor_profile_id: docProfile.id,
        requester_role: 'DOCTOR',
        requested_record_types: input.requestedRecordTypes,
        reason: cleanReason,
        status: 'PENDING',
        duration_hours: durationHours,
        expires_at: expiresAt,
      })
      .select('*, patient:patient_profiles(id, patient_name, health_wallet_id, blood_group, state)')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        // Unique violation (idx_unique_pending_doctor_request)
        return {
          success: false,
          error:
            'You already have an active PENDING access request for this patient. Please await patient approval.',
        };
      }
      return {
        success: false,
        error: insertError.message || 'Failed to submit access request.',
      };
    }

    return { success: true, request: inserted as AccessRequest };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unexpected error creating access request.',
    };
  }
}

/**
 * List Doctor's Access Requests
 */
export async function getDoctorAccessRequests(): Promise<AccessRequest[]> {
  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_ACCESS_REQUESTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) return [];

    const { data, error } = await supabase
      .from('access_requests')
      .select('*, patient:patient_profiles(id, patient_name, health_wallet_id, blood_group, state)')
      .eq('requester_user_id', userAuth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching doctor access requests:', error.message);
      return [];
    }

    return (data || []) as AccessRequest[];
  } catch (err) {
    console.warn('Network error listing doctor access requests:', err);
    return [];
  }
}

/**
 * Check if the Doctor Has Approved and Non-Expired Consent for Patient
 * STRICT: Returns FALSE in Phase 5 because patient consent approval is Phase 6.
 */
export async function checkDoctorApprovedConsent(patientId: string): Promise<boolean> {
  if (!patientId) return false;

  if (!isSupabaseConfigured) {
    const localRequestsStr = localStorage.getItem(LOCAL_STORAGE_ACCESS_REQUESTS_KEY);
    if (!localRequestsStr) return false;
    try {
      const list: AccessRequest[] = JSON.parse(localRequestsStr);
      return list.some(
        (r) =>
          r.patient_id === patientId &&
          r.status === 'APPROVED' &&
          new Date(r.expires_at) > new Date()
      );
    } catch {
      return false;
    }
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) return false;

    const { data, error } = await supabase.rpc('check_doctor_has_approved_access', {
      p_patient_id: patientId,
    });

    if (error) {
      console.warn('Error checking consent approval:', error.message);
      return false;
    }

    return Boolean(data);
  } catch {
    return false;
  }
}
