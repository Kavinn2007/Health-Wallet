import { supabase, isSupabaseConfigured } from './supabase';

export type AuditAction =
  | 'VIEW_MEDICAL_RECORD'
  | 'CREATE_CONSULTATION'
  | 'CREATE_DIAGNOSIS'
  | 'CREATE_TREATMENT'
  | 'CREATE_PRESCRIPTION'
  | 'CREATE_LAB_REPORT'
  | 'REQUEST_ACCESS'
  | 'GRANT_CONSENT'
  | 'DENY_CONSENT'
  | 'REVOKE_CONSENT'
  | 'EXPIRED_CONSENT'
  | 'SHARE_PRESCRIPTION'
  | 'PHARMACY_VIEW_PRESCRIPTION'
  | 'DISPENSE_PRESCRIPTION'
  | 'PHARMACY_PARTIAL_DISPENSE'
  | 'PHARMACY_DECLINE_PRESCRIPTION'
  | 'REGISTER_BLOOD_DONOR'
  | 'UPDATE_BLOOD_DONOR_PROFILE'
  | 'SEARCH_BLOOD_DONORS'
  | 'CREATE_BLOOD_DONATION_REQUEST'
  | 'ACCEPT_BLOOD_DONATION_REQUEST'
  | 'DECLINE_BLOOD_DONATION_REQUEST'
  | 'CANCEL_BLOOD_DONATION_REQUEST'
  | 'REGISTER_ORGAN_DONOR'
  | 'UPDATE_ORGAN_DONATION_PREFERENCES'
  | 'REVOKE_ORGAN_DONATION_CONSENT'
  | 'REACTIVATE_ORGAN_DONOR'
  | 'VIEW_ORGAN_DONATION_CONSENT'
  | 'APPOINTMENT_BOOKED'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_RESCHEDULED'
  | 'APPOINTMENT_COMPLETED'
  | 'APPOINTMENT_EXPIRED'
  | 'VIEW_WALLET_SUMMARY'
  | 'CREATE_EMERGENCY_BLOOD_REQUEST'
  | 'EMERGENCY_BLOOD_NOTIFICATION_SENT'
  | 'EMERGENCY_BLOOD_HELP_RESPONSE'
  | 'EMERGENCY_BLOOD_CALL_RESPONSE'
  | 'EMERGENCY_BLOOD_VERIFICATION_STARTED'
  | 'EMERGENCY_BLOOD_DONOR_VERIFIED'
  | 'EMERGENCY_BLOOD_DONOR_REJECTED'
  | 'EMERGENCY_BLOOD_REQUEST_PARTIALLY_FULFILLED'
  | 'EMERGENCY_BLOOD_REQUEST_FULFILLED'
  | 'EMERGENCY_BLOOD_REQUEST_CANCELLED'
  | 'EMERGENCY_BLOOD_REQUEST_EXPIRED'
  | 'CREATE_HOSPITAL'
  | 'UPDATE_HOSPITAL'
  | 'VERIFY_HOSPITAL'
  | 'UPDATE_HOSPITAL_EMERGENCY_STATUS'
  | 'UPDATE_HOSPITAL_BLOOD_BANK_STATUS';

export interface AuditLog {
  id: string;
  user_id: string;
  role: 'PATIENT' | 'DOCTOR' | 'LAB' | 'PHARMACY' | 'ADMIN' | 'SYSTEM';
  patient_id?: string | null;
  action: AuditAction;
  record_type?: string | null;
  record_id?: string | null;
  status?: string | null;
  reason?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export const LOCAL_STORAGE_AUDIT_LOGS_KEY = 'health_wallet_v2_audit_logs';

/**
 * Format audit log into patient-facing human-readable description
 * (Never exposes UUIDs, secrets, Aadhaar, or sensitive details)
 */
export function formatPatientAuditEvent(log: AuditLog): {
  title: string;
  description: string;
  badgeColor: string;
} {
  const docName = log.metadata?.doctor_name || 'A doctor';
  const recordTitle = log.metadata?.record_title;

  switch (log.action) {
    case 'REQUEST_ACCESS':
      return {
        title: 'Access Requested',
        description: `${docName} requested access to your records`,
        badgeColor: 'sky',
      };
    case 'GRANT_CONSENT':
      return {
        title: 'Access Granted',
        description: `You granted access to ${docName}`,
        badgeColor: 'emerald',
      };
    case 'DENY_CONSENT':
      return {
        title: 'Access Request Denied',
        description: `You denied access request from ${docName}`,
        badgeColor: 'amber',
      };
    case 'REVOKE_CONSENT':
      return {
        title: 'Access Revoked',
        description: `You revoked access permissions`,
        badgeColor: 'rose',
      };
    case 'VIEW_MEDICAL_RECORD':
      return {
        title: 'Medical Record Viewed',
        description: `${docName} viewed your medical record${recordTitle ? `: ${recordTitle}` : ''}`,
        badgeColor: 'blue',
      };
    case 'CREATE_CONSULTATION':
      return {
        title: 'Consultation Added',
        description: `${docName} created a consultation`,
        badgeColor: 'indigo',
      };
    case 'CREATE_DIAGNOSIS':
      return {
        title: 'Diagnosis Recorded',
        description: `${docName} created a diagnosis`,
        badgeColor: 'purple',
      };
    case 'CREATE_TREATMENT':
      return {
        title: 'Treatment Added',
        description: `${docName} created a treatment plan`,
        badgeColor: 'teal',
      };
    case 'CREATE_PRESCRIPTION':
      return {
        title: 'Prescription Added',
        description: `${docName} created a prescription`,
        badgeColor: 'cyan',
      };
    case 'CREATE_LAB_REPORT':
      return {
        title: 'Lab Report Added',
        description: `${log.metadata?.laboratory_name || 'A laboratory'} added a new test report to your Health Wallet`,
        badgeColor: 'teal',
      };
    case 'EXPIRED_CONSENT':
      return {
        title: 'Consent Expired',
        description: `A previously granted access consent has reached its expiry limit`,
        badgeColor: 'slate',
      };
    case 'SHARE_PRESCRIPTION':
      return {
        title: 'Prescription Shared',
        description: `You shared a prescription with ${log.metadata?.pharmacy_name || 'a pharmacy'}`,
        badgeColor: 'sky',
      };
    case 'PHARMACY_VIEW_PRESCRIPTION':
      return {
        title: 'Prescription Viewed by Pharmacy',
        description: `${log.metadata?.pharmacy_name || 'A pharmacy'} viewed your authorized prescription`,
        badgeColor: 'indigo',
      };
    case 'DISPENSE_PRESCRIPTION':
      return {
        title: 'Prescription Dispensed',
        description: `${log.metadata?.pharmacy_name || 'A pharmacy'} marked your prescription as dispensed`,
        badgeColor: 'emerald',
      };
    case 'PHARMACY_PARTIAL_DISPENSE':
      return {
        title: 'Prescription Partially Dispensed',
        description: `${log.metadata?.pharmacy_name || 'A pharmacy'} partially dispensed your prescription`,
        badgeColor: 'amber',
      };
    case 'PHARMACY_DECLINE_PRESCRIPTION':
      return {
        title: 'Prescription Not Dispensed',
        description: `${log.metadata?.pharmacy_name || 'A pharmacy'} was unable to dispense your prescription`,
        badgeColor: 'rose',
      };
    case 'REGISTER_BLOOD_DONOR':
      return {
        title: 'Registered as Blood Donor',
        description: `You registered as an active voluntary blood donor (${log.metadata?.blood_group || 'Blood Registry'})`,
        badgeColor: 'rose',
      };
    case 'UPDATE_BLOOD_DONOR_PROFILE':
      return {
        title: 'Updated Blood Donor Profile',
        description: 'You updated your voluntary blood donor preferences or availability',
        badgeColor: 'amber',
      };
    case 'SEARCH_BLOOD_DONORS':
      return {
        title: 'Searched Blood Donors',
        description: 'Searched for compatible voluntary blood donors',
        badgeColor: 'sky',
      };
    case 'CREATE_BLOOD_DONATION_REQUEST':
      return {
        title: 'Blood Donation Requested',
        description: `You sent a blood donation request for ${log.metadata?.blood_group || 'compatible group'}`,
        badgeColor: 'rose',
      };
    case 'ACCEPT_BLOOD_DONATION_REQUEST':
      return {
        title: 'Blood Donation Request Accepted',
        description: 'You accepted an incoming blood donation request',
        badgeColor: 'emerald',
      };
    case 'DECLINE_BLOOD_DONATION_REQUEST':
      return {
        title: 'Blood Donation Request Declined',
        description: 'You declined an incoming blood donation request',
        badgeColor: 'slate',
      };
    case 'CANCEL_BLOOD_DONATION_REQUEST':
      return {
        title: 'Blood Donation Request Cancelled',
        description: 'You cancelled a pending blood donation request',
        badgeColor: 'rose',
      };
    case 'REGISTER_ORGAN_DONOR':
      return {
        title: 'Organ Donor Registration Recorded',
        description: 'You recorded your voluntary organ/tissue donation intent',
        badgeColor: 'teal',
      };
    case 'UPDATE_ORGAN_DONATION_PREFERENCES':
      return {
        title: 'Organ Donation Preferences Updated',
        description: 'You updated your selected organ and tissue donation preferences',
        badgeColor: 'sky',
      };
    case 'REVOKE_ORGAN_DONATION_CONSENT':
      return {
        title: 'Organ Donation Registration Revoked',
        description: 'You withdrew your voluntary organ donation registration',
        badgeColor: 'rose',
      };
    case 'REACTIVATE_ORGAN_DONOR':
      return {
        title: 'Organ Donor Registration Reactivated',
        description: 'You reactivated your voluntary organ donation registration',
        badgeColor: 'emerald',
      };
    case 'VIEW_ORGAN_DONATION_CONSENT':
      return {
        title: 'Organ Donation Consent Viewed',
        description: 'You viewed your organ donation consent history',
        badgeColor: 'indigo',
      };
    case 'APPOINTMENT_BOOKED':
      return {
        title: 'Appointment Booked',
        description: `You booked an appointment with ${docName}`,
        badgeColor: 'sky',
      };
    case 'APPOINTMENT_CONFIRMED':
      return {
        title: 'Appointment Confirmed',
        description: `${docName} confirmed your scheduled appointment`,
        badgeColor: 'emerald',
      };
    case 'APPOINTMENT_CANCELLED':
      return {
        title: 'Appointment Cancelled',
        description: `Appointment was cancelled${log.reason ? `: ${log.reason}` : ''}`,
        badgeColor: 'rose',
      };
    case 'APPOINTMENT_RESCHEDULED':
      return {
        title: 'Appointment Rescheduled',
        description: `Appointment was rescheduled to a new time slot`,
        badgeColor: 'amber',
      };
    case 'APPOINTMENT_COMPLETED':
      return {
        title: 'Appointment Completed',
        description: `${docName} marked your appointment as completed`,
        badgeColor: 'teal',
      };
    case 'APPOINTMENT_EXPIRED':
      return {
        title: 'Appointment Expired',
        description: `Pending appointment request expired`,
        badgeColor: 'slate',
      };
    case 'VIEW_WALLET_SUMMARY':
      return {
        title: 'Wallet Summary Viewed',
        description: 'You viewed your consolidated Health Wallet Summary',
        badgeColor: 'sky',
      };
    case 'CREATE_EMERGENCY_BLOOD_REQUEST':
      return {
        title: 'Emergency Blood Requirement Created',
        description: `Emergency blood requirement initiated for ${log.metadata?.blood_group || 'blood'} (${log.metadata?.request_code || ''})`,
        badgeColor: 'rose',
      };
    case 'EMERGENCY_BLOOD_NOTIFICATION_SENT':
      return {
        title: 'Emergency Blood Alert Received',
        description: `Received urgent emergency blood requirement alert (${log.metadata?.request_code || ''})`,
        badgeColor: 'rose',
      };
    case 'EMERGENCY_BLOOD_HELP_RESPONSE':
      return {
        title: 'Responded: Willing to Help',
        description: `Offered willingness to assist for emergency blood request ${log.metadata?.request_code || ''}`,
        badgeColor: 'emerald',
      };
    case 'EMERGENCY_BLOOD_CALL_RESPONSE':
      return {
        title: 'Emergency AI Call Response',
        description: `Recorded call response (${log.metadata?.status || 'Responded'}) for emergency ${log.metadata?.request_code || ''}`,
        badgeColor: 'indigo',
      };
    case 'EMERGENCY_BLOOD_VERIFICATION_STARTED':
      return {
        title: 'Emergency Verification Submitted',
        description: `Submitted donor readiness for emergency request ${log.metadata?.request_code || ''}`,
        badgeColor: 'amber',
      };
    case 'EMERGENCY_BLOOD_DONOR_VERIFIED':
      return {
        title: 'Emergency Response Verified',
        description: `Authorized hospital verified your emergency response for ${log.metadata?.request_code || ''}`,
        badgeColor: 'emerald',
      };
    case 'EMERGENCY_BLOOD_DONOR_REJECTED':
      return {
        title: 'Emergency Response Status Updated',
        description: `Hospital updated status for emergency ${log.metadata?.request_code || ''}`,
        badgeColor: 'slate',
      };
    case 'EMERGENCY_BLOOD_REQUEST_PARTIALLY_FULFILLED':
      return {
        title: 'Emergency Blood Request Partially Fulfilled',
        description: `Emergency request ${log.metadata?.request_code || ''} reached partial fulfillment`,
        badgeColor: 'teal',
      };
    case 'EMERGENCY_BLOOD_REQUEST_FULFILLED':
      return {
        title: 'Emergency Blood Request Fulfilled',
        description: `Emergency request ${log.metadata?.request_code || ''} successfully fulfilled`,
        badgeColor: 'emerald',
      };
    case 'EMERGENCY_BLOOD_REQUEST_CANCELLED':
      return {
        title: 'Emergency Blood Request Cancelled',
        description: `Emergency request ${log.metadata?.request_code || ''} was cancelled`,
        badgeColor: 'rose',
      };
    case 'EMERGENCY_BLOOD_REQUEST_EXPIRED':
      return {
        title: 'Emergency Blood Request Expired',
        description: `Emergency request ${log.metadata?.request_code || ''} timed out`,
        badgeColor: 'slate',
      };
    default:
      return {
        title: String(log.action || '').replace(/_/g, ' '),
        description: 'Health wallet activity logged',
        badgeColor: 'slate',
      };
  }
}

/**
 * Format audit log into pharmacy-facing activity description
 */
export function formatPharmacyAuditEvent(log: AuditLog): {
  title: string;
  description: string;
  badgeColor: string;
} {
  switch (log.action) {
    case 'PHARMACY_VIEW_PRESCRIPTION':
      return {
        title: 'Prescription Viewed',
        description: 'Viewed authorized patient prescription for dispensing',
        badgeColor: 'indigo',
      };
    case 'DISPENSE_PRESCRIPTION':
      return {
        title: 'Prescription Dispensed',
        description: 'Successfully dispensed prescribed medication',
        badgeColor: 'emerald',
      };
    case 'PHARMACY_PARTIAL_DISPENSE':
      return {
        title: 'Partially Dispensed',
        description: 'Partially dispensed prescribed medication',
        badgeColor: 'amber',
      };
    case 'PHARMACY_DECLINE_PRESCRIPTION':
      return {
        title: 'Prescription Declined',
        description: 'Marked prescription as not dispensed',
        badgeColor: 'rose',
      };
    default:
      return {
        title: String(log.action || '').replace(/_/g, ' '),
        description: 'Pharmacy action completed',
        badgeColor: 'slate',
      };
  }
}

/**
 * Format audit log into lab-facing activity description
 */
export function formatLabAuditEvent(log: AuditLog): {
  title: string;
  description: string;
  badgeColor: string;
} {
  switch (log.action) {
    case 'CREATE_LAB_REPORT':
      return {
        title: 'Lab Report Created',
        description: `Created ${log.metadata?.report_type || 'diagnostic'} report for patient`,
        badgeColor: 'teal',
      };
    default:
      return {
        title: String(log.action || '').replace(/_/g, ' '),
        description: 'Laboratory action completed',
        badgeColor: 'slate',
      };
  }
}

/**
 * Format audit log into doctor-facing activity description
 */
export function formatDoctorAuditEvent(log: AuditLog): {
  title: string;
  description: string;
  badgeColor: string;
} {
  const recordTitle = log.metadata?.record_title;

  switch (log.action) {
    case 'REQUEST_ACCESS':
      return {
        title: 'Requested Patient Access',
        description: 'Requested access to patient health records',
        badgeColor: 'sky',
      };
    case 'VIEW_MEDICAL_RECORD':
      return {
        title: 'Viewed Medical Record',
        description: `Viewed authorized patient record${recordTitle ? `: ${recordTitle}` : ''}`,
        badgeColor: 'blue',
      };
    case 'CREATE_CONSULTATION':
      return {
        title: 'Created Consultation',
        description: 'Documented clinical consultation and patient encounter',
        badgeColor: 'indigo',
      };
    case 'CREATE_DIAGNOSIS':
      return {
        title: 'Created Diagnosis',
        description: 'Recorded clinical diagnosis for patient',
        badgeColor: 'purple',
      };
    case 'CREATE_TREATMENT':
      return {
        title: 'Created Treatment',
        description: 'Formulated clinical treatment intervention',
        badgeColor: 'teal',
      };
    case 'CREATE_PRESCRIPTION':
      return {
        title: 'Created Prescription',
        description: 'Prescribed medication course for patient',
        badgeColor: 'cyan',
      };
    case 'EXPIRED_CONSENT':
      return {
        title: 'Consent Expired',
        description: 'Patient consent reached its scheduled duration limit',
        badgeColor: 'amber',
      };
    case 'CREATE_EMERGENCY_BLOOD_REQUEST':
      return {
        title: 'Created Emergency Blood Request',
        description: `Created emergency request for ${log.metadata?.blood_group || 'blood'} (${log.metadata?.request_code || ''})`,
        badgeColor: 'rose',
      };
    case 'EMERGENCY_BLOOD_DONOR_VERIFIED':
      return {
        title: 'Verified Emergency Donor',
        description: `Verified donor availability and compatibility for request ${log.metadata?.request_code || ''}`,
        badgeColor: 'emerald',
      };
    case 'EMERGENCY_BLOOD_DONOR_REJECTED':
      return {
        title: 'Rejected Emergency Donor Response',
        description: `Marked donor response as ineligible or unavailable for ${log.metadata?.request_code || ''}`,
        badgeColor: 'slate',
      };
    case 'EMERGENCY_BLOOD_REQUEST_PARTIALLY_FULFILLED':
      return {
        title: 'Updated Request: Partially Fulfilled',
        description: `Marked emergency request ${log.metadata?.request_code || ''} as partially fulfilled`,
        badgeColor: 'teal',
      };
    case 'EMERGENCY_BLOOD_REQUEST_FULFILLED':
      return {
        title: 'Fulfilled Emergency Blood Request',
        description: `Closed emergency request ${log.metadata?.request_code || ''} as fully fulfilled`,
        badgeColor: 'emerald',
      };
    case 'EMERGENCY_BLOOD_REQUEST_CANCELLED':
      return {
        title: 'Cancelled Emergency Blood Request',
        description: `Cancelled emergency request ${log.metadata?.request_code || ''}`,
        badgeColor: 'rose',
      };
    default:
      return {
        title: String(log.action || '').replace(/_/g, ' '),
        description: 'Doctor clinical activity recorded',
        badgeColor: 'slate',
      };
  }
}

/**
 * Retrieve patient's access audit history
 */
export async function getPatientAccessHistory(patientId?: string): Promise<AuditLog[]> {
  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOGS_KEY);
      const logs: AuditLog[] = stored ? JSON.parse(stored) : [];
      return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch {
      return [];
    }
  }

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching patient audit logs:', error.message);
      return [];
    }

    return (data as AuditLog[]) || [];
  } catch (err: any) {
    console.warn('Unexpected error fetching patient audit logs:', err?.message);
    return [];
  }
}

/**
 * Retrieve doctor's own activity history
 */
export async function getDoctorActivityHistory(): Promise<AuditLog[]> {
  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOGS_KEY);
      const logs: AuditLog[] = stored ? JSON.parse(stored) : [];
      return logs
        .filter((l) => l.role === 'DOCTOR')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch {
      return [];
    }
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) return [];

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userAuth.user.id)
      .eq('role', 'DOCTOR')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching doctor activity logs:', error.message);
      return [];
    }

    return (data as AuditLog[]) || [];
  } catch (err: any) {
    console.warn('Unexpected error fetching doctor activity logs:', err?.message);
    return [];
  }
}

/**
 * Retrieve pharmacy's own activity history
 */
export async function getPharmacyActivityHistory(): Promise<AuditLog[]> {
  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOGS_KEY);
      const logs: AuditLog[] = stored ? JSON.parse(stored) : [];
      return logs
        .filter((l) => l.role === 'PHARMACY')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch {
      return [];
    }
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) return [];

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userAuth.user.id)
      .eq('role', 'PHARMACY')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching pharmacy activity logs:', error.message);
      return [];
    }

    return (data as AuditLog[]) || [];
  } catch (err: any) {
    console.warn('Unexpected error fetching pharmacy activity logs:', err?.message);
    return [];
  }
}

/**
 * Record a mock audit log for offline/local storage use
 */
export function recordMockAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
  const fullLog: AuditLog = {
    ...log,
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    created_at: new Date().toISOString(),
  };

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_AUDIT_LOGS_KEY);
    const logs: AuditLog[] = stored ? JSON.parse(stored) : [];
    logs.unshift(fullLog);
    localStorage.setItem(LOCAL_STORAGE_AUDIT_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.warn('Failed to save mock audit log to localStorage:', e);
  }

  return fullLog;
}
