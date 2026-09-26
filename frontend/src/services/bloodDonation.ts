import { supabase, isSupabaseConfigured } from './supabase';
import { recordMockAuditLog } from './audit';
import { recordMockNotification } from './notifications';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type UrgencyLevel = 'NORMAL' | 'URGENT';
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';

export interface BloodDonorProfile {
  id: string;
  user_id: string;
  patient_id: string;
  blood_group: BloodGroup;
  state_code: string;
  city?: string | null;
  is_available: boolean;
  last_donation_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BloodDonationRequest {
  id: string;
  requester_patient_id: string;
  donor_patient_id: string;
  blood_group: BloodGroup;
  state_code: string;
  city?: string | null;
  urgency: UrgencyLevel;
  message?: string | null;
  status: RequestStatus;
  requested_at: string;
  responded_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterDonorInput {
  blood_group: BloodGroup;
  state_code: string;
  city?: string | null;
  is_available?: boolean;
  last_donation_date?: string | null;
}

export interface SearchDonorFilters {
  required_blood_group: BloodGroup;
  state_code: string;
  city?: string | null;
  availability_only?: boolean;
}

export interface CreateRequestInput {
  donor_patient_id: string;
  blood_group: BloodGroup;
  state_code: string;
  city?: string | null;
  urgency?: UrgencyLevel;
  message?: string | null;
}

/**
 * Blood group compatibility mapping
 * DONOR_CAN_DONATE_TO: Blood groups that a donor can provide blood to
 */
export const DONOR_CAN_DONATE_TO: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

/**
 * RECIPIENT_CAN_RECEIVE_FROM: Blood groups compatible for a recipient
 */
export const RECIPIENT_CAN_RECEIVE_FROM: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

/**
 * Check if a donor blood group is compatible for a recipient blood group
 */
export function canDonate(donor: BloodGroup, recipient: BloodGroup): boolean {
  return DONOR_CAN_DONATE_TO[donor]?.includes(recipient) ?? false;
}

/**
 * Get all compatible donor groups for a given required blood group
 */
export function getCompatibleDonorGroups(recipient: BloodGroup): BloodGroup[] {
  return RECIPIENT_CAN_RECEIVE_FROM[recipient] || [recipient];
}

/**
 * Get all recipient groups that a donor can donate to
 */
export function getCompatibleRecipientGroups(donor: BloodGroup): BloodGroup[] {
  return DONOR_CAN_DONATE_TO[donor] || [donor];
}

// Local storage keys for fallback demo mode
const LOCAL_STORAGE_DONORS_KEY = 'health_wallet_v2_blood_donors';
const LOCAL_STORAGE_REQUESTS_KEY = 'health_wallet_v2_blood_requests';

// Default mock donors for discovery testing in offline mode
const DEFAULT_MOCK_DONORS: BloodDonorProfile[] = [
  {
    id: 'donor-mock-1',
    user_id: 'user-donor-chennai-1',
    patient_id: 'pat-donor-chennai-1',
    blood_group: 'O+',
    state_code: 'Tamil Nadu',
    city: 'Chennai',
    is_available: true,
    last_donation_date: '2026-05-10',
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:00:00Z',
  },
  {
    id: 'donor-mock-2',
    user_id: 'user-donor-chennai-2',
    patient_id: 'pat-donor-chennai-2',
    blood_group: 'O-',
    state_code: 'Tamil Nadu',
    city: 'Chennai',
    is_available: true,
    last_donation_date: '2026-03-20',
    created_at: '2026-04-10T11:00:00Z',
    updated_at: '2026-04-10T11:00:00Z',
  },
  {
    id: 'donor-mock-3',
    user_id: 'user-donor-bangalore-1',
    patient_id: 'pat-donor-bangalore-1',
    blood_group: 'A+',
    state_code: 'Karnataka',
    city: 'Bangalore',
    is_available: true,
    last_donation_date: null,
    created_at: '2026-07-15T09:30:00Z',
    updated_at: '2026-07-15T09:30:00Z',
  },
  {
    id: 'donor-mock-4',
    user_id: 'user-donor-chennai-3',
    patient_id: 'pat-donor-chennai-3',
    blood_group: 'B+',
    state_code: 'Tamil Nadu',
    city: 'Chennai',
    is_available: false, // unavailable
    last_donation_date: '2026-08-01',
    created_at: '2026-08-02T14:00:00Z',
    updated_at: '2026-08-02T14:00:00Z',
  },
];

function getStoredDonors(): BloodDonorProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DONORS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_DONORS_KEY, JSON.stringify(DEFAULT_MOCK_DONORS));
      return [...DEFAULT_MOCK_DONORS];
    }
    return JSON.parse(raw);
  } catch {
    return [...DEFAULT_MOCK_DONORS];
  }
}

function saveStoredDonors(donors: BloodDonorProfile[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_DONORS_KEY, JSON.stringify(donors));
  } catch (e) {
    console.error('Failed to save donors to localStorage', e);
  }
}

function getStoredRequests(): BloodDonationRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredRequests(requests: BloodDonationRequest[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_REQUESTS_KEY, JSON.stringify(requests));
  } catch (e) {
    console.error('Failed to save blood donation requests to localStorage', e);
  }
}

/**
 * Get active donor profile for current authenticated user
 */
export async function getMyDonorProfile(): Promise<BloodDonorProfile | null> {
  if (!isSupabaseConfigured) {
    const donors = getStoredDonors();
    // In mock mode, find the profile with current session mock user id or pat-profile-1
    return donors.find((d) => d.user_id === 'user-patient-1' || d.id === 'my-donor-profile') || null;
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) return null;

    const { data, error } = await supabase
      .from('blood_donor_profiles')
      .select('*')
      .eq('user_id', userAuth.user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching blood donor profile:', err);
    return null;
  }
}

/**
 * Register current patient as a voluntary blood donor
 */
export async function registerDonor(input: RegisterDonorInput): Promise<BloodDonorProfile> {
  if (!isSupabaseConfigured) {
    const donors = getStoredDonors();
    const existingIdx = donors.findIndex((d) => d.user_id === 'user-patient-1' || d.id === 'my-donor-profile');

    const newProfile: BloodDonorProfile = {
      id: existingIdx >= 0 ? donors[existingIdx].id : 'my-donor-profile',
      user_id: 'user-patient-1',
      patient_id: 'pat-profile-1',
      blood_group: input.blood_group,
      state_code: input.state_code,
      city: input.city || null,
      is_available: input.is_available !== undefined ? input.is_available : true,
      last_donation_date: input.last_donation_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      donors[existingIdx] = newProfile;
    } else {
      donors.push(newProfile);
    }
    saveStoredDonors(donors);

    recordMockAuditLog({
      user_id: 'user-patient-1',
      role: 'PATIENT',
      patient_id: 'pat-profile-1',
      action: 'REGISTER_BLOOD_DONOR',
      status: 'SUCCESS',
      metadata: {
        donor_id: newProfile.id,
        blood_group: input.blood_group,
        state_code: input.state_code,
        is_available: newProfile.is_available,
      },
    });

    return newProfile;
  }

  const { data, error } = await supabase.rpc('register_blood_donor', {
    p_blood_group: input.blood_group,
    p_state_code: input.state_code,
    p_city: input.city || null,
    p_is_available: input.is_available ?? true,
    p_last_donation_date: input.last_donation_date || null,
  });

  if (error) throw error;

  const profile = await getMyDonorProfile();
  if (!profile) throw new Error('Donor profile registered but could not be reloaded');
  return profile;
}

/**
 * Update current donor profile preferences
 */
export async function updateDonorProfile(input: RegisterDonorInput): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const donors = getStoredDonors();
    const idx = donors.findIndex((d) => d.user_id === 'user-patient-1' || d.id === 'my-donor-profile');
    if (idx < 0) throw new Error('Donor profile not found to update');

    donors[idx] = {
      ...donors[idx],
      blood_group: input.blood_group,
      state_code: input.state_code,
      city: input.city || null,
      is_available: input.is_available !== undefined ? input.is_available : donors[idx].is_available,
      last_donation_date: input.last_donation_date !== undefined ? input.last_donation_date : donors[idx].last_donation_date,
      updated_at: new Date().toISOString(),
    };
    saveStoredDonors(donors);

    recordMockAuditLog({
      user_id: 'user-patient-1',
      role: 'PATIENT',
      patient_id: 'pat-profile-1',
      action: 'UPDATE_BLOOD_DONOR_PROFILE',
      status: 'SUCCESS',
      metadata: { donor_id: donors[idx].id, is_available: donors[idx].is_available },
    });

    return true;
  }

  const { error } = await supabase.rpc('update_blood_donor_profile', {
    p_blood_group: input.blood_group,
    p_state_code: input.state_code,
    p_city: input.city || null,
    p_is_available: input.is_available ?? true,
    p_last_donation_date: input.last_donation_date || null,
  });

  if (error) throw error;
  return true;
}

/**
 * Search compatible blood donors based on required blood group and location.
 * Exposes ONLY allowed donor matching fields (no contact details, no medical records).
 */
export async function searchCompatibleDonors(filters: SearchDonorFilters): Promise<BloodDonorProfile[]> {
  if (!isSupabaseConfigured) {
    const donors = getStoredDonors();
    const compatibleGroups = getCompatibleDonorGroups(filters.required_blood_group);

    const matches = donors.filter((d) => {
      const isCompat = compatibleGroups.includes(d.blood_group);
      const isStateMatch = d.state_code.toLowerCase() === filters.state_code.trim().toLowerCase();
      const isCityMatch = !filters.city || !filters.city.trim() || (d.city && d.city.toLowerCase() === filters.city.trim().toLowerCase());
      const isAvailMatch = filters.availability_only === false ? true : d.is_available;
      const isNotSelf = d.user_id !== 'user-patient-1' && d.id !== 'my-donor-profile';

      return isCompat && isStateMatch && isCityMatch && isAvailMatch && isNotSelf;
    });

    recordMockAuditLog({
      user_id: 'user-patient-1',
      role: 'PATIENT',
      patient_id: 'pat-profile-1',
      action: 'SEARCH_BLOOD_DONORS',
      status: 'SUCCESS',
      metadata: {
        required_blood_group: filters.required_blood_group,
        state_code: filters.state_code,
        match_count: matches.length,
      },
    });

    return matches;
  }

  const { data, error } = await supabase.rpc('search_compatible_blood_donors', {
    p_required_blood_group: filters.required_blood_group,
    p_state_code: filters.state_code,
    p_city: filters.city || null,
    p_availability_only: filters.availability_only ?? true,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Send a blood donation request to a compatible donor
 */
export async function createDonationRequest(input: CreateRequestInput): Promise<BloodDonationRequest> {
  if (!isSupabaseConfigured) {
    const requests = getStoredRequests();
    const myPatientId = 'pat-profile-1';

    if (input.donor_patient_id === myPatientId) {
      throw new Error('Self-request blocked: Cannot request blood donation from yourself');
    }

    const existingPending = requests.find(
      (r) => r.requester_patient_id === myPatientId && r.donor_patient_id === input.donor_patient_id && r.status === 'PENDING'
    );
    if (existingPending) {
      throw new Error('Duplicate request blocked: An active pending request already exists for this donor');
    }

    const newRequest: BloodDonationRequest = {
      id: `req-blood-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      requester_patient_id: myPatientId,
      donor_patient_id: input.donor_patient_id,
      blood_group: input.blood_group,
      state_code: input.state_code,
      city: input.city || null,
      urgency: input.urgency || 'NORMAL',
      message: input.message || null,
      status: 'PENDING',
      requested_at: new Date().toISOString(),
      responded_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    requests.unshift(newRequest);
    saveStoredRequests(requests);

    recordMockAuditLog({
      user_id: 'user-patient-1',
      role: 'PATIENT',
      patient_id: myPatientId,
      action: 'CREATE_BLOOD_DONATION_REQUEST',
      status: 'PENDING',
      metadata: {
        request_id: newRequest.id,
        donor_patient_id: input.donor_patient_id,
        blood_group: input.blood_group,
        urgency: newRequest.urgency,
      },
    });

    recordMockNotification({
      user_id: 'user-donor-chennai-1',
      type: 'BLOOD_DONATION_REQUEST',
      title: 'Blood Donation Request',
      message: 'Someone has requested a blood donation matching your registered blood group and location.',
      patient_id: input.donor_patient_id,
      related_request_id: newRequest.id,
      is_read: false,
    });

    return newRequest;
  }

  const { data, error } = await supabase.rpc('create_blood_donation_request', {
    p_donor_patient_id: input.donor_patient_id,
    p_blood_group: input.blood_group,
    p_state_code: input.state_code,
    p_city: input.city || null,
    p_urgency: input.urgency || 'NORMAL',
    p_message: input.message || null,
  });

  if (error) throw error;

  const { data: createdReq, error: fetchErr } = await supabase
    .from('blood_donation_requests')
    .select('*')
    .eq('id', data)
    .single();

  if (fetchErr) throw fetchErr;
  return createdReq;
}

/**
 * Get all blood donation requests sent by the current patient
 */
export async function getMyBloodRequests(): Promise<BloodDonationRequest[]> {
  if (!isSupabaseConfigured) {
    const requests = getStoredRequests();
    return requests
      .filter((r) => r.requester_patient_id === 'pat-profile-1')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) return [];

    const { data: patientProfile } = await supabase
      .from('patient_profiles')
      .select('id')
      .eq('user_id', userAuth.user.id)
      .maybeSingle();

    if (!patientProfile) return [];

    const { data, error } = await supabase
      .from('blood_donation_requests')
      .select('*')
      .eq('requester_patient_id', patientProfile.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching my blood requests:', err);
    return [];
  }
}

/**
 * Get all incoming blood donation requests sent to current user as a donor
 */
export async function getIncomingDonationRequests(): Promise<BloodDonationRequest[]> {
  if (!isSupabaseConfigured) {
    const requests = getStoredRequests();
    return requests
      .filter((r) => r.donor_patient_id === 'pat-profile-1')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) return [];

    const { data: patientProfile } = await supabase
      .from('patient_profiles')
      .select('id')
      .eq('user_id', userAuth.user.id)
      .maybeSingle();

    if (!patientProfile) return [];

    const { data, error } = await supabase
      .from('blood_donation_requests')
      .select('*')
      .eq('donor_patient_id', patientProfile.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching incoming donation requests:', err);
    return [];
  }
}

/**
 * Donor accepts a blood donation request
 */
export async function acceptDonationRequest(requestId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const requests = getStoredRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) throw new Error('Request not found');
    if (req.status !== 'PENDING') throw new Error(`Cannot accept request with status ${req.status}`);

    req.status = 'ACCEPTED';
    req.responded_at = new Date().toISOString();
    req.updated_at = new Date().toISOString();
    saveStoredRequests(requests);

    recordMockAuditLog({
      user_id: 'user-patient-1',
      role: 'PATIENT',
      patient_id: req.donor_patient_id,
      action: 'ACCEPT_BLOOD_DONATION_REQUEST',
      status: 'ACCEPTED',
      metadata: { request_id: requestId },
    });

    recordMockNotification({
      user_id: 'user-patient-1',
      type: 'BLOOD_DONATION_ACCEPTED',
      title: 'Blood Donation Request Accepted',
      message: 'A voluntary donor has accepted your blood donation request.',
      patient_id: req.requester_patient_id,
      related_request_id: requestId,
      is_read: false,
    });

    return true;
  }

  const { error } = await supabase.rpc('accept_blood_donation_request', {
    p_request_id: requestId,
  });

  if (error) throw error;
  return true;
}

/**
 * Donor declines a blood donation request
 */
export async function declineDonationRequest(requestId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const requests = getStoredRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) throw new Error('Request not found');
    if (req.status !== 'PENDING') throw new Error(`Cannot decline request with status ${req.status}`);

    req.status = 'DECLINED';
    req.responded_at = new Date().toISOString();
    req.updated_at = new Date().toISOString();
    saveStoredRequests(requests);

    recordMockAuditLog({
      user_id: 'user-patient-1',
      role: 'PATIENT',
      patient_id: req.donor_patient_id,
      action: 'DECLINE_BLOOD_DONATION_REQUEST',
      status: 'DECLINED',
      metadata: { request_id: requestId },
    });

    recordMockNotification({
      user_id: 'user-patient-1',
      type: 'BLOOD_DONATION_DECLINED',
      title: 'Blood Donation Request Declined',
      message: 'A voluntary donor could not accept your blood donation request at this time.',
      patient_id: req.requester_patient_id,
      related_request_id: requestId,
      is_read: false,
    });

    return true;
  }

  const { error } = await supabase.rpc('decline_blood_donation_request', {
    p_request_id: requestId,
  });

  if (error) throw error;
  return true;
}

/**
 * Requester cancels a pending blood donation request
 */
export async function cancelDonationRequest(requestId: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const requests = getStoredRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) throw new Error('Request not found');
    if (req.status !== 'PENDING') throw new Error(`Cannot cancel request with status ${req.status}`);

    req.status = 'CANCELLED';
    req.responded_at = new Date().toISOString();
    req.updated_at = new Date().toISOString();
    saveStoredRequests(requests);

    recordMockAuditLog({
      user_id: 'user-patient-1',
      role: 'PATIENT',
      patient_id: req.requester_patient_id,
      action: 'CANCEL_BLOOD_DONATION_REQUEST',
      status: 'CANCELLED',
      metadata: { request_id: requestId },
    });

    recordMockNotification({
      user_id: 'user-donor-chennai-1',
      type: 'BLOOD_DONATION_CANCELLED',
      title: 'Blood Donation Request Cancelled',
      message: 'A blood donation request sent to you was cancelled by the requester.',
      patient_id: req.donor_patient_id,
      related_request_id: requestId,
      is_read: false,
    });

    return true;
  }

  const { error } = await supabase.rpc('cancel_blood_donation_request', {
    p_request_id: requestId,
  });

  if (error) throw error;
  return true;
}
