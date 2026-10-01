import { supabase, isSupabaseConfigured } from './supabase';
import { recordMockAuditLog } from './audit';
import { recordMockNotification } from './notifications';
import { type BloodGroup, canDonate, RECIPIENT_CAN_RECEIVE_FROM } from './bloodDonation';

export type EmergencyBloodPriority = 'CRITICAL' | 'HIGH' | 'NORMAL';
export type EmergencyBloodRequestStatus = 'ACTIVE' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
export type EmergencyBloodResponseStatus =
  | 'WILLING_TO_HELP'
  | 'AVAILABLE'
  | 'PARTIALLY_AVAILABLE'
  | 'UNAVAILABLE'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'CANCELLED';

export interface EmergencyBloodRequest {
  id: string;
  request_code: string;
  hospital_id?: string | null;
  hospital_name: string;
  hospital_location: string;
  authorized_department: string;
  blood_group: BloodGroup;
  units_required: number;
  priority: EmergencyBloodPriority;
  required_within_minutes: number;
  status: EmergencyBloodRequestStatus;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface EmergencyBloodResponse {
  id: string;
  emergency_request_id: string;
  donor_user_id: string;
  donor_patient_id: string;
  response_status: EmergencyBloodResponseStatus;
  units_offered?: number | null;
  responded_at: string;
  verified_at?: string | null;
  verified_by_user_id?: string | null;
  verification_notes?: string | null;
  created_at: string;
  updated_at: string;
  // Enriched presentation fields (sanitized, no full mobile/Aadhaar)
  donor_blood_group?: BloodGroup;
  donor_city?: string | null;
  donor_state?: string | null;
  masked_phone?: string | null;
}

export interface CreateEmergencyRequestInput {
  hospital_id?: string | null;
  hospital_name: string;
  hospital_location: string;
  authorized_department: string;
  blood_group: BloodGroup;
  units_required: number;
  priority: EmergencyBloodPriority;
  required_within_minutes: number;
}

export interface DonorVerificationConfirmations {
  bloodGroupConfirmed: boolean;
  availabilityConfirmed: boolean;
  hospitalAuthorityUnderstood: boolean;
  unitsOffered?: number;
  notes?: string;
}

export const LOCAL_STORAGE_EMERGENCY_REQUESTS_KEY = 'health_wallet_v2_emergency_blood_requests';
export const LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY = 'health_wallet_v2_emergency_blood_responses';

/**
 * Format blood group name for conversational voice
 */
export function formatBloodGroupForVoice(bg: string): string {
  const map: Record<string, string> = {
    'A+': 'A-positive',
    'A-': 'A-negative',
    'B+': 'B-positive',
    'B-': 'B-negative',
    'AB+': 'AB-positive',
    'AB-': 'AB-negative',
    'O+': 'O-positive',
    'O-': 'O-negative',
  };
  return map[bg] || bg;
}

/**
 * Convert number of units to English word if small
 */
export function formatUnitsWord(units: number): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  return words[units] || `${units}`;
}

/**
 * Convert minutes to human voice time format
 */
export function formatMinutesForVoice(minutes: number): string {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? 'one hour' : `${formatUnitsWord(hours)} hours`;
  }
  return `${minutes} minutes`;
}

/**
 * PART 8 — Reusable AI Call Message Generator
 * Dynamically produces the automated voice call dispatch text from emergency request data.
 */
export function generateEmergencyCallMessage(request: Partial<EmergencyBloodRequest>): string {
  const hospital = request.hospital_name || 'Authorized Hospital';
  const location = request.hospital_location || 'Emergency Center';
  const unitsText = formatUnitsWord(request.units_required || 1);
  const unitsSuffix = (request.units_required || 1) === 1 ? 'unit' : 'units';
  const bloodGroupSpoken = formatBloodGroupForVoice(request.blood_group || 'O+');
  const prioritySpoken = (request.priority || 'CRITICAL').toLowerCase();
  const timeSpoken = formatMinutesForVoice(request.required_within_minutes || 120);
  const requestCode = request.request_code || 'HW-EMR-PENDING';

  return (
    `This is an emergency alert from HEALTH WALLET.\n` +
    `${hospital} in ${location} requires ${unitsText} ${unitsSuffix} of ${bloodGroupSpoken} blood for a ${prioritySpoken} emergency case.\n` +
    `The requirement is within ${timeSpoken}.\n` +
    `Please confirm blood availability by pressing 1 for available,\n` +
    `2 for partially available,\n` +
    `or 3 for unavailable.\n` +
    `Request ID: ${requestCode}.`
  );
}

/**
 * PART 9 & 18 — DTMF Call Response Handler
 * Handles DTMF 1 -> AVAILABLE, 2 -> PARTIALLY_AVAILABLE, 3 -> UNAVAILABLE.
 * Invalid digits are strictly rejected.
 */
export async function handleEmergencyCallResponse(
  requestId: string,
  donorId: string,
  digit: number | string,
  unitsOffered?: number
): Promise<{ success: boolean; status?: EmergencyBloodResponseStatus; error?: string }> {
  const digitNum = typeof digit === 'string' ? parseInt(digit.trim(), 10) : digit;
  if (![1, 2, 3].includes(digitNum)) {
    return { success: false, error: 'Invalid DTMF digit. Must be 1 (AVAILABLE), 2 (PARTIALLY_AVAILABLE), or 3 (UNAVAILABLE).' };
  }

  let mappedStatus: EmergencyBloodResponseStatus;
  let finalUnits = unitsOffered || null;

  if (digitNum === 1) {
    mappedStatus = 'AVAILABLE';
  } else if (digitNum === 2) {
    mappedStatus = 'PARTIALLY_AVAILABLE';
    if (!finalUnits || finalUnits <= 0) {
      return { success: false, error: 'Units offered must be provided for partially available response.' };
    }
  } else {
    mappedStatus = 'UNAVAILABLE';
    finalUnits = 0;
  }

  if (!isSupabaseConfigured) {
    // Offline simulation
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY);
      const responses: EmergencyBloodResponse[] = stored ? JSON.parse(stored) : [];
      let resp = responses.find((r) => r.emergency_request_id === requestId && (r.donor_user_id === donorId || r.donor_patient_id === donorId));

      if (resp) {
        resp.response_status = mappedStatus;
        resp.units_offered = finalUnits;
        resp.updated_at = new Date().toISOString();
      } else {
        resp = {
          id: `emr-resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          emergency_request_id: requestId,
          donor_user_id: donorId,
          donor_patient_id: donorId,
          response_status: mappedStatus,
          units_offered: finalUnits,
          responded_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        responses.push(resp);
      }
      localStorage.setItem(LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY, JSON.stringify(responses));

      recordMockAuditLog({
        user_id: donorId,
        role: 'PATIENT',
        action: 'EMERGENCY_BLOOD_CALL_RESPONSE',
        record_type: 'EMERGENCY_BLOOD_REQUEST',
        record_id: requestId,
        status: 'SUCCESS',
        metadata: {
          dtmf_digit: digitNum,
          status: mappedStatus,
          units_offered: finalUnits,
        },
      });

      return { success: true, status: mappedStatus };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to process DTMF response' };
    }
  }

  try {
    const { data, error } = await supabase.rpc('handle_emergency_call_response', {
      p_request_id: requestId,
      p_digit: digitNum,
      p_units_offered: finalUnits,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as any;
    return { success: !!result?.success, status: result?.response_status, error: result?.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Call response processing failed' };
  }
}

/**
 * PART 1 & 18 — Create Emergency Blood Requirement
 */
export async function createEmergencyBloodRequest(
  input: CreateEmergencyRequestInput
): Promise<{ success: boolean; data?: EmergencyBloodRequest; error?: string }> {
  if (!input.hospital_name || !input.hospital_location || !input.authorized_department) {
    return { success: false, error: 'Hospital details and authorized department are required.' };
  }
  if (!input.blood_group) {
    return { success: false, error: 'Valid blood group is required.' };
  }
  if (!input.units_required || input.units_required <= 0) {
    return { success: false, error: 'Units required must be greater than zero.' };
  }

  if (!isSupabaseConfigured) {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const requestCode = `HW-EMR-${year}-${rand}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (input.required_within_minutes || 120) * 60000);

    const newReq: EmergencyBloodRequest = {
      id: `emr-req-${Date.now()}`,
      request_code: requestCode,
      hospital_id: input.hospital_id || null,
      hospital_name: input.hospital_name,
      hospital_location: input.hospital_location,
      authorized_department: input.authorized_department,
      blood_group: input.blood_group,
      units_required: input.units_required,
      priority: input.priority || 'CRITICAL',
      required_within_minutes: input.required_within_minutes || 120,
      status: 'ACTIVE',
      created_by_user_id: 'mock-doctor-uid',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_EMERGENCY_REQUESTS_KEY);
      const list: EmergencyBloodRequest[] = stored ? JSON.parse(stored) : [];
      list.unshift(newReq);
      localStorage.setItem(LOCAL_STORAGE_EMERGENCY_REQUESTS_KEY, JSON.stringify(list));

      recordMockAuditLog({
        user_id: 'mock-doctor-uid',
        role: 'DOCTOR',
        action: 'CREATE_EMERGENCY_BLOOD_REQUEST',
        record_type: 'EMERGENCY_BLOOD_REQUEST',
        record_id: newReq.id,
        status: 'SUCCESS',
        metadata: {
          request_code: requestCode,
          blood_group: input.blood_group,
          units_required: input.units_required,
          hospital_name: input.hospital_name,
          hospital_id: input.hospital_id || null,
        },
      });

      // Broadcast mock notification to compatible donor users
      recordMockNotification({
        user_id: 'mock-patient-uid',
        type: 'EMERGENCY_BLOOD_REQUIREMENT',
        title: `🚨 EMERGENCY BLOOD REQUIREMENT: ${input.blood_group}`,
        message: `🏥 ${input.hospital_name}, ${input.hospital_location}\n🩸 Blood Group: ${input.blood_group}\nUnits: ${input.units_required}\nPriority: ${input.priority}\nTime: Within ${input.required_within_minutes} mins\nRequest ID: ${requestCode}`,
        related_request_id: newReq.id,
        is_read: false,
      });

      return { success: true, data: newReq };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save emergency request' };
    }
  }

  try {
    const { data, error } = await supabase.rpc('create_emergency_blood_request', {
      p_hospital_name: input.hospital_name,
      p_hospital_location: input.hospital_location,
      p_authorized_department: input.authorized_department,
      p_blood_group: input.blood_group,
      p_units_required: input.units_required,
      p_priority: input.priority || 'CRITICAL',
      p_required_within_minutes: input.required_within_minutes || 120,
      p_hospital_id: input.hospital_id || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as EmergencyBloodRequest };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Emergency request creation failed' };
  }
}

/**
 * PART 6 & 18 — Donor "I CAN HELP" Flow
 * Records willingness to help. Does NOT immediately confirm donation!
 */
export async function respondToEmergencyRequest(
  requestId: string
): Promise<{ success: boolean; data?: EmergencyBloodResponse; error?: string }> {
  if (!requestId) return { success: false, error: 'Request ID is required.' };

  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY);
      const responses: EmergencyBloodResponse[] = stored ? JSON.parse(stored) : [];
      const existing = responses.find((r) => r.emergency_request_id === requestId && r.donor_user_id === 'mock-patient-uid');

      if (existing) {
        if (existing.response_status !== 'WILLING_TO_HELP' && existing.response_status !== 'UNAVAILABLE') {
          return { success: false, error: `You have already responded to this request with status: ${existing.response_status}` };
        }
        existing.response_status = 'WILLING_TO_HELP';
        existing.updated_at = new Date().toISOString();
        localStorage.setItem(LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY, JSON.stringify(responses));
        return { success: true, data: existing };
      }

      const newResp: EmergencyBloodResponse = {
        id: `resp-${Date.now()}`,
        emergency_request_id: requestId,
        donor_user_id: 'mock-patient-uid',
        donor_patient_id: 'mock-patient-uid',
        response_status: 'WILLING_TO_HELP',
        responded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      responses.push(newResp);
      localStorage.setItem(LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY, JSON.stringify(responses));

      recordMockAuditLog({
        user_id: 'mock-patient-uid',
        role: 'PATIENT',
        action: 'EMERGENCY_BLOOD_HELP_RESPONSE',
        record_type: 'EMERGENCY_BLOOD_REQUEST',
        record_id: requestId,
        status: 'SUCCESS',
        metadata: { response_status: 'WILLING_TO_HELP' },
      });

      return { success: true, data: newResp };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to record response' };
    }
  }

  try {
    const { data, error } = await supabase.rpc('respond_emergency_blood_request', {
      p_request_id: requestId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as any;
    if (result && !result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to record response' };
  }
}

/**
 * PART 7 & 18 — Submit Donor Verification Flow
 * Donor confirms blood group, availability, and hospital authority.
 * Updates status to VERIFICATION_PENDING.
 */
export async function submitDonorVerification(
  requestId: string,
  confirmations: DonorVerificationConfirmations
): Promise<{ success: boolean; data?: EmergencyBloodResponse; error?: string }> {
  if (!confirmations.bloodGroupConfirmed || !confirmations.availabilityConfirmed || !confirmations.hospitalAuthorityUnderstood) {
    return { success: false, error: 'All 3 verification confirmations must be checked before submission.' };
  }

  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY);
      const responses: EmergencyBloodResponse[] = stored ? JSON.parse(stored) : [];
      const resp = responses.find((r) => r.emergency_request_id === requestId && r.donor_user_id === 'mock-patient-uid');

      if (!resp) {
        return { success: false, error: 'No active response found for this request. Please click I CAN HELP first.' };
      }

      resp.response_status = 'VERIFICATION_PENDING';
      resp.units_offered = confirmations.unitsOffered || resp.units_offered || 1;
      resp.verification_notes = confirmations.notes || 'Donor self-attested availability and group';
      resp.updated_at = new Date().toISOString();

      localStorage.setItem(LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY, JSON.stringify(responses));

      recordMockAuditLog({
        user_id: 'mock-patient-uid',
        role: 'PATIENT',
        action: 'EMERGENCY_BLOOD_VERIFICATION_STARTED',
        record_type: 'EMERGENCY_BLOOD_REQUEST',
        record_id: requestId,
        status: 'SUCCESS',
        metadata: {
          status: 'VERIFICATION_PENDING',
          units_offered: resp.units_offered,
        },
      });

      return { success: true, data: resp };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Verification submission failed' };
    }
  }

  try {
    const { data, error } = await supabase.rpc('submit_donor_emergency_verification', {
      p_request_id: requestId,
      p_units_offered: confirmations.unitsOffered || 1,
      p_notes: confirmations.notes || 'Donor completed verification checklist',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as any;
    if (result && !result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Verification submission failed' };
  }
}

/**
 * PART 11 & 18 — Hospital/Authorized Verification: Verify Donor
 */
export async function verifyEmergencyDonor(
  responseId: string,
  notes?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!responseId) return { success: false, error: 'Response ID is required.' };

  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY);
      const responses: EmergencyBloodResponse[] = stored ? JSON.parse(stored) : [];
      const resp = responses.find((r) => r.id === responseId);

      if (!resp) {
        return { success: false, error: 'Donor response not found.' };
      }

      resp.response_status = 'VERIFIED';
      resp.verified_at = new Date().toISOString();
      resp.verified_by_user_id = 'mock-doctor-uid';
      resp.verification_notes = notes || 'Hospital verified eligibility';
      resp.updated_at = new Date().toISOString();

      localStorage.setItem(LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY, JSON.stringify(responses));

      recordMockAuditLog({
        user_id: 'mock-doctor-uid',
        role: 'DOCTOR',
        action: 'EMERGENCY_BLOOD_DONOR_VERIFIED',
        record_type: 'EMERGENCY_BLOOD_RESPONSE',
        record_id: responseId,
        status: 'SUCCESS',
        metadata: { response_id: responseId, notes },
      });

      recordMockNotification({
        user_id: resp.donor_user_id,
        type: 'EMERGENCY_BLOOD_VERIFIED',
        title: 'Emergency Donation Response Verified',
        message: 'The authorized hospital has verified your blood donation readiness. Please follow hospital instructions.',
        related_request_id: resp.emergency_request_id,
        is_read: false,
      });

      return { success: true, data: resp };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to verify donor' };
    }
  }

  try {
    const { data, error } = await supabase.rpc('verify_emergency_donor', {
      p_response_id: responseId,
      p_verification_notes: notes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as any;
    if (result && !result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Verification failed' };
  }
}

/**
 * PART 11 & 18 — Hospital/Authorized Verification: Reject Donor
 */
export async function rejectEmergencyDonor(
  responseId: string,
  reason?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!responseId) return { success: false, error: 'Response ID is required.' };

  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY);
      const responses: EmergencyBloodResponse[] = stored ? JSON.parse(stored) : [];
      const resp = responses.find((r) => r.id === responseId);

      if (!resp) {
        return { success: false, error: 'Donor response not found.' };
      }

      resp.response_status = 'REJECTED';
      resp.verified_at = new Date().toISOString();
      resp.verified_by_user_id = 'mock-doctor-uid';
      resp.verification_notes = reason || 'Ineligible or unavailable';
      resp.updated_at = new Date().toISOString();

      localStorage.setItem(LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY, JSON.stringify(responses));

      recordMockAuditLog({
        user_id: 'mock-doctor-uid',
        role: 'DOCTOR',
        action: 'EMERGENCY_BLOOD_DONOR_REJECTED',
        record_type: 'EMERGENCY_BLOOD_RESPONSE',
        record_id: responseId,
        status: 'SUCCESS',
        metadata: { response_id: responseId, reason },
      });

      recordMockNotification({
        user_id: resp.donor_user_id,
        type: 'EMERGENCY_BLOOD_REJECTED',
        title: 'Emergency Donation Update',
        message: 'Your emergency response has been closed by the hospital. Thank you for your willingness to assist.',
        related_request_id: resp.emergency_request_id,
        is_read: false,
      });

      return { success: true, data: resp };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to reject donor' };
    }
  }

  try {
    const { data, error } = await supabase.rpc('reject_emergency_donor', {
      p_response_id: responseId,
      p_rejection_reason: reason || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as any;
    if (result && !result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Rejection failed' };
  }
}

/**
 * PART 10 & 18 — Update Emergency Request Status (PARTIALLY_FULFILLED, FULFILLED, CANCELLED)
 */
export async function updateEmergencyRequestStatus(
  requestId: string,
  newStatus: 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED'
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!requestId) return { success: false, error: 'Request ID is required.' };

  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_EMERGENCY_REQUESTS_KEY);
      const requests: EmergencyBloodRequest[] = stored ? JSON.parse(stored) : [];
      const req = requests.find((r) => r.id === requestId);

      if (!req) return { success: false, error: 'Emergency request not found.' };

      req.status = newStatus;
      req.updated_at = new Date().toISOString();
      localStorage.setItem(LOCAL_STORAGE_EMERGENCY_REQUESTS_KEY, JSON.stringify(requests));

      const action =
        newStatus === 'FULFILLED'
          ? 'EMERGENCY_BLOOD_REQUEST_FULFILLED'
          : newStatus === 'PARTIALLY_FULFILLED'
          ? 'EMERGENCY_BLOOD_REQUEST_PARTIALLY_FULFILLED'
          : 'EMERGENCY_BLOOD_REQUEST_CANCELLED';

      recordMockAuditLog({
        user_id: 'mock-doctor-uid',
        role: 'DOCTOR',
        action,
        record_type: 'EMERGENCY_BLOOD_REQUEST',
        record_id: requestId,
        status: 'SUCCESS',
        metadata: { request_code: req.request_code, new_status: newStatus },
      });

      return { success: true, data: req };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Status update failed' };
    }
  }

  try {
    const { data, error } = await supabase.rpc('update_emergency_request_status', {
      p_request_id: requestId,
      p_new_status: newStatus,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as any;
    if (result && !result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update request status' };
  }
}

/**
 * Convenience aliases for marking fulfilled and cancelled
 */
export async function markEmergencyRequestFulfilled(requestId: string) {
  return updateEmergencyRequestStatus(requestId, 'FULFILLED');
}

export async function cancelEmergencyRequest(requestId: string) {
  return updateEmergencyRequestStatus(requestId, 'CANCELLED');
}

/**
 * PART 16 & 18 — List Active Emergency Requests for Compatible Donor
 */
export async function listActiveEmergencyRequestsForDonor(): Promise<EmergencyBloodRequest[]> {
  if (!isSupabaseConfigured) {
    try {
      const storedReqs = localStorage.getItem(LOCAL_STORAGE_EMERGENCY_REQUESTS_KEY);
      const reqs: EmergencyBloodRequest[] = storedReqs ? JSON.parse(storedReqs) : [];
      return reqs.filter((r) => r.status === 'ACTIVE' || r.status === 'PARTIALLY_FULFILLED');
    } catch {
      return [];
    }
  }

  try {
    const { data, error } = await supabase.rpc('list_active_emergency_requests_for_donor');
    if (error) {
      console.warn('list_active_emergency_requests_for_donor RPC error:', error.message);
      return [];
    }
    return (data as EmergencyBloodRequest[]) || [];
  } catch (err: any) {
    console.warn('Failed to fetch emergency requests for donor:', err?.message);
    return [];
  }
}

/**
 * PART 17 & 18 — List Hospital Emergency Requests
 */
export async function listHospitalEmergencyRequests(): Promise<EmergencyBloodRequest[]> {
  if (!isSupabaseConfigured) {
    try {
      const storedReqs = localStorage.getItem(LOCAL_STORAGE_EMERGENCY_REQUESTS_KEY);
      return storedReqs ? JSON.parse(storedReqs) : [];
    } catch {
      return [];
    }
  }

  try {
    const { data, error } = await supabase.rpc('list_hospital_emergency_requests');
    if (error) {
      console.warn('list_hospital_emergency_requests RPC error:', error.message);
      return [];
    }
    return (data as EmergencyBloodRequest[]) || [];
  } catch (err: any) {
    console.warn('Failed to fetch hospital emergency requests:', err?.message);
    return [];
  }
}

/**
 * PART 17 & 18 — Get Responses for a Specific Emergency Request
 */
export async function getEmergencyRequestResponses(requestId: string): Promise<EmergencyBloodResponse[]> {
  if (!requestId) return [];

  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY);
      const responses: EmergencyBloodResponse[] = stored ? JSON.parse(stored) : [];
      return responses.filter((r) => r.emergency_request_id === requestId);
    } catch {
      return [];
    }
  }

  try {
    const { data, error } = await supabase.rpc('get_emergency_request_responses', {
      p_request_id: requestId,
    });
    if (error) {
      console.warn('get_emergency_request_responses RPC error:', error.message);
      return [];
    }
    return (data as EmergencyBloodResponse[]) || [];
  } catch (err: any) {
    console.warn('Failed to fetch emergency responses:', err?.message);
    return [];
  }
}

/**
 * Get current donor's response for a specific emergency request
 */
export async function getDonorResponseForRequest(requestId: string): Promise<EmergencyBloodResponse | null> {
  if (!requestId) return null;

  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_EMERGENCY_RESPONSES_KEY);
      const responses: EmergencyBloodResponse[] = stored ? JSON.parse(stored) : [];
      return responses.find((r) => r.emergency_request_id === requestId) || null;
    } catch {
      return null;
    }
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) return null;

    const { data, error } = await supabase
      .from('emergency_blood_responses')
      .select('*')
      .eq('emergency_request_id', requestId)
      .eq('donor_user_id', userAuth.user.id)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching donor response:', error.message);
      return null;
    }

    return (data as EmergencyBloodResponse) || null;
  } catch {
    return null;
  }
}
