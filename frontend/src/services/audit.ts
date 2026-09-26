import { supabase, isSupabaseConfigured } from './supabase';

export type AuditAction =
  | 'VIEW_MEDICAL_RECORD'
  | 'CREATE_CONSULTATION'
  | 'CREATE_DIAGNOSIS'
  | 'CREATE_TREATMENT'
  | 'CREATE_PRESCRIPTION'
  | 'REQUEST_ACCESS'
  | 'GRANT_CONSENT'
  | 'DENY_CONSENT'
  | 'REVOKE_CONSENT'
  | 'EXPIRED_CONSENT';

export interface AuditLog {
  id: string;
  user_id: string;
  role: 'PATIENT' | 'DOCTOR' | 'SYSTEM';
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
    case 'EXPIRED_CONSENT':
      return {
        title: 'Consent Expired',
        description: `A previously granted access consent has reached its expiry limit`,
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
