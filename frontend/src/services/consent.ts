import {
  supabase,
  isSupabaseConfigured,
  type AccessRequest,
  type Consent,
  type ConsentStatus,
  type RecordCategory,
  type DoctorProfile,
} from './supabase';
import { DEMO_DOCTOR_PROFILE } from './doctors';
import { type MedicalRecord } from './healthRecords';
import { recordMockAuditLog } from './audit';
import { recordMockNotification } from './notifications';

const LOCAL_STORAGE_ACCESS_REQUESTS_KEY = 'health_wallet_v2_access_requests';
const LOCAL_STORAGE_CONSENTS_KEY = 'health_wallet_v2_consents';

/**
 * Retrieve incoming access requests for the authenticated patient
 */
export async function getPatientAccessRequests(
  patientId?: string
): Promise<AccessRequest[]> {
  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_ACCESS_REQUESTS_KEY);
      const requests: AccessRequest[] = stored ? JSON.parse(stored) : [];
      // Attach demo doctor profile for rich display
      return requests.map((r) => ({
        ...r,
        doctor: DEMO_DOCTOR_PROFILE,
      }));
    } catch {
      return [];
    }
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) return [];

    let targetPatientId = patientId;
    if (!targetPatientId) {
      const { data: patProfile } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('user_id', userAuth.user.id)
        .maybeSingle();

      if (!patProfile) return [];
      targetPatientId = patProfile.id;
    }

    const { data, error } = await supabase
      .from('access_requests')
      .select('*, doctor:doctor_profiles(*)')
      .eq('patient_id', targetPatientId)
      .order('requested_at', { ascending: false });

    if (error) {
      console.warn('Error fetching patient access requests:', error.message);
      return [];
    }

    return (data || []) as AccessRequest[];
  } catch (err) {
    console.warn('Network error fetching patient access requests:', err);
    return [];
  }
}

/**
 * Patient approves an access request
 * Creates/Updates an APPROVED consent record
 */
export async function approveAccessRequest(
  requestId: string
): Promise<{ success: boolean; consent?: Consent; error?: string }> {
  if (!requestId) return { success: false, error: 'Invalid request ID' };

  if (!isSupabaseConfigured) {
    // Local / Offline demo simulation
    try {
      const storedRequests = localStorage.getItem(LOCAL_STORAGE_ACCESS_REQUESTS_KEY);
      const requests: AccessRequest[] = storedRequests ? JSON.parse(storedRequests) : [];
      const reqIndex = requests.findIndex((r) => r.id === requestId);

      if (reqIndex === -1) {
        return { success: false, error: 'Access request not found' };
      }

      const req = requests[reqIndex];
      if (req.status !== 'PENDING') {
        return {
          success: false,
          error: `Cannot approve request with status: ${req.status}`,
        };
      }

      req.status = 'APPROVED';
      req.updated_at = new Date().toISOString();
      requests[reqIndex] = req;
      localStorage.setItem(LOCAL_STORAGE_ACCESS_REQUESTS_KEY, JSON.stringify(requests));

      // Create / update consent in localStorage
      const storedConsents = localStorage.getItem(LOCAL_STORAGE_CONSENTS_KEY);
      const consents: Consent[] = storedConsents ? JSON.parse(storedConsents) : [];

      const newConsent: Consent = {
        id: `consent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        access_request_id: req.id,
        patient_id: req.patient_id,
        doctor_user_id: req.requester_user_id,
        doctor_profile_id: req.doctor_profile_id,
        approved_record_types: req.requested_record_types, // Approved = requested
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        expires_at: req.expires_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        doctor: DEMO_DOCTOR_PROFILE,
      };

      const existingConsentIndex = consents.findIndex(
        (c) => c.access_request_id === req.id
      );
      if (existingConsentIndex >= 0) {
        consents[existingConsentIndex] = newConsent;
      } else {
        consents.unshift(newConsent);
      }
      localStorage.setItem(LOCAL_STORAGE_CONSENTS_KEY, JSON.stringify(consents));

      // Mock audit & notification
      recordMockAuditLog({
        user_id: req.patient_id,
        role: 'PATIENT',
        patient_id: req.patient_id,
        action: 'GRANT_CONSENT',
        status: 'APPROVED',
        metadata: {
          doctor_name: DEMO_DOCTOR_PROFILE.doctor_name,
          access_request_id: req.id,
        },
      });

      recordMockNotification({
        user_id: req.requester_user_id,
        type: 'ACCESS_GRANTED',
        title: 'Access Granted',
        message: "Your request to access the patient's approved medical records has been granted.",
        patient_id: req.patient_id,
        related_request_id: req.id,
        is_read: false,
      });

      return { success: true, consent: newConsent };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to approve request' };
    }
  }

  try {
    const { data, error } = await supabase.rpc('patient_approve_access_request', {
      p_request_id: requestId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, consent: data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected error approving request' };
  }
}

/**
 * Patient denies an access request
 */
export async function denyAccessRequest(
  requestId: string,
  denialReason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!requestId) return { success: false, error: 'Invalid request ID' };

  if (!isSupabaseConfigured) {
    try {
      const storedRequests = localStorage.getItem(LOCAL_STORAGE_ACCESS_REQUESTS_KEY);
      const requests: AccessRequest[] = storedRequests ? JSON.parse(storedRequests) : [];
      const reqIndex = requests.findIndex((r) => r.id === requestId);

      if (reqIndex === -1) {
        return { success: false, error: 'Access request not found' };
      }

      const req = requests[reqIndex];
      req.status = 'DENIED';
      req.updated_at = new Date().toISOString();
      requests[reqIndex] = req;
      localStorage.setItem(LOCAL_STORAGE_ACCESS_REQUESTS_KEY, JSON.stringify(requests));

      // Record denial in consents
      const storedConsents = localStorage.getItem(LOCAL_STORAGE_CONSENTS_KEY);
      const consents: Consent[] = storedConsents ? JSON.parse(storedConsents) : [];

      const deniedConsent: Consent = {
        id: `consent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        access_request_id: req.id,
        patient_id: req.patient_id,
        doctor_user_id: req.requester_user_id,
        doctor_profile_id: req.doctor_profile_id,
        approved_record_types: [],
        status: 'DENIED',
        expires_at: new Date().toISOString(),
        denied_at: new Date().toISOString(),
        denial_reason: denialReason || 'Denied by patient',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        doctor: DEMO_DOCTOR_PROFILE,
      };

      consents.unshift(deniedConsent);
      localStorage.setItem(LOCAL_STORAGE_CONSENTS_KEY, JSON.stringify(consents));

      // Mock audit & notification
      recordMockAuditLog({
        user_id: req.patient_id,
        role: 'PATIENT',
        patient_id: req.patient_id,
        action: 'DENY_CONSENT',
        status: 'DENIED',
        metadata: {
          doctor_name: DEMO_DOCTOR_PROFILE.doctor_name,
          access_request_id: req.id,
        },
      });

      recordMockNotification({
        user_id: req.requester_user_id,
        type: 'ACCESS_DENIED',
        title: 'Access Request Denied',
        message: 'Your request for access was denied by the patient.',
        patient_id: req.patient_id,
        related_request_id: req.id,
        is_read: false,
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to deny request' };
    }
  }

  try {
    const { error } = await supabase.rpc('patient_deny_access_request', {
      p_request_id: requestId,
      p_denial_reason: denialReason || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected error denying request' };
  }
}

/**
 * Patient revokes an approved consent
 */
export async function revokeConsent(
  consentId: string
): Promise<{ success: boolean; error?: string }> {
  if (!consentId) return { success: false, error: 'Invalid consent ID' };

  if (!isSupabaseConfigured) {
    try {
      const storedConsents = localStorage.getItem(LOCAL_STORAGE_CONSENTS_KEY);
      const consents: Consent[] = storedConsents ? JSON.parse(storedConsents) : [];
      const consentIndex = consents.findIndex(
        (c) => c.id === consentId || c.access_request_id === consentId
      );

      if (consentIndex === -1) {
        return { success: false, error: 'Consent not found' };
      }

      const consent = consents[consentIndex];
      consent.status = 'REVOKED';
      consent.revoked_at = new Date().toISOString();
      consent.updated_at = new Date().toISOString();
      consents[consentIndex] = consent;
      localStorage.setItem(LOCAL_STORAGE_CONSENTS_KEY, JSON.stringify(consents));

      // Also update linked access request
      const storedRequests = localStorage.getItem(LOCAL_STORAGE_ACCESS_REQUESTS_KEY);
      if (storedRequests) {
        const requests: AccessRequest[] = JSON.parse(storedRequests);
        const reqIndex = requests.findIndex((r) => r.id === consent.access_request_id);
        if (reqIndex >= 0) {
          requests[reqIndex].status = 'REVOKED';
          requests[reqIndex].updated_at = new Date().toISOString();
          localStorage.setItem(LOCAL_STORAGE_ACCESS_REQUESTS_KEY, JSON.stringify(requests));
        }
      }

      // Mock audit & notification
      recordMockAuditLog({
        user_id: consent.patient_id,
        role: 'PATIENT',
        patient_id: consent.patient_id,
        action: 'REVOKE_CONSENT',
        status: 'REVOKED',
        metadata: {
          doctor_name: DEMO_DOCTOR_PROFILE.doctor_name,
          consent_id: consent.id,
        },
      });

      recordMockNotification({
        user_id: consent.doctor_user_id,
        type: 'ACCESS_REVOKED',
        title: 'Access Revoked',
        message: 'Your previously granted access has been revoked.',
        patient_id: consent.patient_id,
        related_request_id: consent.access_request_id,
        is_read: false,
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to revoke consent' };
    }
  }

  try {
    const { error } = await supabase.rpc('patient_revoke_consent', {
      p_consent_id: consentId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected error revoking consent' };
  }
}

/**
 * Doctor checks consent status for a specific patient
 */
export async function getDoctorConsentStatus(patientId: string): Promise<{
  hasConsent: boolean;
  status: ConsentStatus | 'NONE';
  approvedRecordTypes: RecordCategory[];
  expiresAt?: string;
  isExpired: boolean;
  consentId?: string;
}> {
  if (!patientId) {
    return {
      hasConsent: false,
      status: 'NONE',
      approvedRecordTypes: [],
      isExpired: false,
    };
  }

  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CONSENTS_KEY);
      if (!stored) {
        return {
          hasConsent: false,
          status: 'NONE',
          approvedRecordTypes: [],
          isExpired: false,
        };
      }

      const consents: Consent[] = JSON.parse(stored);
      const match = consents.find((c) => c.patient_id === patientId);

      if (!match) {
        return {
          hasConsent: false,
          status: 'NONE',
          approvedRecordTypes: [],
          isExpired: false,
        };
      }

      const isExpired = new Date(match.expires_at).getTime() <= Date.now();
      const currentStatus: ConsentStatus =
        match.status === 'APPROVED' && isExpired ? 'EXPIRED' : match.status;

      return {
        hasConsent: currentStatus === 'APPROVED' && !isExpired,
        status: currentStatus,
        approvedRecordTypes: match.approved_record_types || [],
        expiresAt: match.expires_at,
        isExpired,
        consentId: match.id,
      };
    } catch {
      return {
        hasConsent: false,
        status: 'NONE',
        approvedRecordTypes: [],
        isExpired: false,
      };
    }
  }

  try {
    const { data, error } = await supabase.rpc('get_doctor_consent_status', {
      p_patient_id: patientId,
    });

    if (error || !data || data.length === 0) {
      return {
        hasConsent: false,
        status: 'NONE',
        approvedRecordTypes: [],
        isExpired: false,
      };
    }

    const row = data[0];
    return {
      hasConsent: Boolean(row.has_approved_consent),
      status: row.status as ConsentStatus,
      approvedRecordTypes: (row.approved_record_types || []) as RecordCategory[],
      expiresAt: row.expires_at,
      isExpired: Boolean(row.is_expired),
      consentId: row.consent_id,
    };
  } catch {
    return {
      hasConsent: false,
      status: 'NONE',
      approvedRecordTypes: [],
      isExpired: false,
    };
  }
}

/**
 * Fetch authorized records for a doctor
 * STRICTLY filters and re-verifies consent validity before returning records
 */
export async function getDoctorAuthorizedRecords(
  patientId: string,
  categoryFilter?: RecordCategory | 'ALL'
): Promise<{
  success: boolean;
  records: MedicalRecord[];
  allowedCategories: RecordCategory[];
  error?: string;
  status: ConsentStatus | 'NONE';
  expiresAt?: string;
}> {
  // 1. Check consent authorization
  const authCheck = await getDoctorConsentStatus(patientId);

  if (!authCheck.hasConsent) {
    let errorMsg = 'Access required: Patient consent is required before viewing medical records.';
    if (authCheck.status === 'EXPIRED') {
      errorMsg = 'Consent expired: Patient medical record access window has expired.';
    } else if (authCheck.status === 'REVOKED') {
      errorMsg = 'Access revoked: Patient has revoked authorization to view records.';
    } else if (authCheck.status === 'DENIED') {
      errorMsg = 'Access denied: Patient declined this access request.';
    }

    return {
      success: false,
      records: [],
      allowedCategories: [],
      error: errorMsg,
      status: authCheck.status,
      expiresAt: authCheck.expiresAt,
    };
  }

  const allowedTypes = authCheck.approvedRecordTypes;
  const grantsAll = allowedTypes.includes('ALL_RECORDS');

  if (!isSupabaseConfigured) {
    // In demo/offline mode, fetch mock patient records and apply strict category filter
    const stored = localStorage.getItem(`health_wallet_v2_records_${patientId}`);
    let allRecords: MedicalRecord[] = [];
    if (stored) {
      try {
        allRecords = JSON.parse(stored);
      } catch {
        allRecords = [];
      }
    }

    // Filter to ONLY approved categories
    const authorized = allRecords.filter((rec) => {
      if (grantsAll) return true;
      // Map record_type to category
      const typeStr = rec.record_type;
      if (typeStr === 'CONSULTATION' && allowedTypes.includes('CONSULTATIONS')) return true;
      if (typeStr === 'DIAGNOSIS' && allowedTypes.includes('DIAGNOSES')) return true;
      if (typeStr === 'TREATMENT' && allowedTypes.includes('TREATMENTS')) return true;
      if (typeStr === 'PRESCRIPTION' && allowedTypes.includes('PRESCRIPTIONS')) return true;
      if (typeStr === 'LAB_REPORT' && allowedTypes.includes('LAB_REPORTS')) return true;
      if (typeStr === 'IMAGING' && allowedTypes.includes('IMAGING')) return true;
      return false;
    });

    // Apply optional view filter
    let finalRecords = authorized;
    if (categoryFilter && categoryFilter !== 'ALL') {
      finalRecords = authorized.filter((r) => {
        if (categoryFilter === 'CONSULTATIONS') return r.record_type === 'CONSULTATION';
        if (categoryFilter === 'DIAGNOSES') return r.record_type === 'DIAGNOSIS';
        if (categoryFilter === 'TREATMENTS') return r.record_type === 'TREATMENT';
        if (categoryFilter === 'PRESCRIPTIONS') return r.record_type === 'PRESCRIPTION';
        if (categoryFilter === 'LAB_REPORTS') return r.record_type === 'LAB_REPORT';
        if (categoryFilter === 'IMAGING') return r.record_type === 'IMAGING';
        return true;
      });
    }

    return {
      success: true,
      records: finalRecords,
      allowedCategories: allowedTypes,
      status: 'APPROVED',
      expiresAt: authCheck.expiresAt,
    };
  }

  try {
    // Query medical_records with RLS enforcement
    let query = supabase
      .from('medical_records')
      .select('*, consultations(*), diagnoses(*), treatments(*), prescriptions(*), lab_reports(*)')
      .eq('patient_id', patientId)
      .order('record_date', { ascending: false });

    const { data, error } = await query;
    if (error) {
      return {
        success: false,
        records: [],
        allowedCategories: allowedTypes,
        error: error.message,
        status: authCheck.status,
      };
    }

    const fetchedRecords = (data || []) as MedicalRecord[];

    // Second-pass category filter for defense-in-depth
    const authorized = fetchedRecords.filter((rec) => {
      if (grantsAll) return true;
      const typeStr = rec.record_type;
      if (typeStr === 'CONSULTATION' && allowedTypes.includes('CONSULTATIONS')) return true;
      if (typeStr === 'DIAGNOSIS' && allowedTypes.includes('DIAGNOSES')) return true;
      if (typeStr === 'TREATMENT' && allowedTypes.includes('TREATMENTS')) return true;
      if (typeStr === 'PRESCRIPTION' && allowedTypes.includes('PRESCRIPTIONS')) return true;
      if (typeStr === 'LAB_REPORT' && allowedTypes.includes('LAB_REPORTS')) return true;
      if (typeStr === 'IMAGING' && allowedTypes.includes('IMAGING')) return true;
      return false;
    });

    let finalRecords = authorized;
    if (categoryFilter && categoryFilter !== 'ALL') {
      finalRecords = authorized.filter((r) => {
        if (categoryFilter === 'CONSULTATIONS') return r.record_type === 'CONSULTATION';
        if (categoryFilter === 'DIAGNOSES') return r.record_type === 'DIAGNOSIS';
        if (categoryFilter === 'TREATMENTS') return r.record_type === 'TREATMENT';
        if (categoryFilter === 'PRESCRIPTIONS') return r.record_type === 'PRESCRIPTION';
        if (categoryFilter === 'LAB_REPORTS') return r.record_type === 'LAB_REPORT';
        if (categoryFilter === 'IMAGING') return r.record_type === 'IMAGING';
        return true;
      });
    }

    return {
      success: true,
      records: finalRecords,
      allowedCategories: allowedTypes,
      status: 'APPROVED',
      expiresAt: authCheck.expiresAt,
    };
  } catch (err: any) {
    return {
      success: false,
      records: [],
      allowedCategories: allowedTypes,
      error: err?.message || 'Error fetching authorized records',
      status: authCheck.status,
    };
  }
}

/**
 * Retrieve patient's active and historical consents
 */
export async function getPatientConsents(patientId?: string): Promise<Consent[]> {
  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CONSENTS_KEY);
      const list: Consent[] = stored ? JSON.parse(stored) : [];
      return list.map((c) => ({
        ...c,
        doctor: DEMO_DOCTOR_PROFILE,
      }));
    } catch {
      return [];
    }
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) return [];

    let targetPatientId = patientId;
    if (!targetPatientId) {
      const { data: patProfile } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('user_id', userAuth.user.id)
        .maybeSingle();

      if (!patProfile) return [];
      targetPatientId = patProfile.id;
    }

    const { data, error } = await supabase
      .from('consents')
      .select('*, doctor:doctor_profiles(*)')
      .eq('patient_id', targetPatientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching patient consents:', error.message);
      return [];
    }

    return (data || []) as Consent[];
  } catch (err) {
    console.warn('Network error fetching patient consents:', err);
    return [];
  }
}
