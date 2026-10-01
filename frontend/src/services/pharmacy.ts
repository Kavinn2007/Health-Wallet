import {
  supabase,
  isSupabaseConfigured,
  type PharmacyProfile,
  type MinimalPatientInfo,
  type PharmacyPrescriptionShare,
  type PrescriptionDispensingRecord,
  type DispensingStatus,
} from './supabase';
import { recordMockAuditLog } from './audit';
import { recordMockNotification } from './notifications';

export const DEMO_PHARMACY_PROFILE: PharmacyProfile = {
  id: 'pharma-profile-demo',
  user_id: 'pharma-user-demo',
  pharmacist_name: 'Priya Sharma, R.Ph.',
  registration_number: 'TN-PHARM-2026-4482',
  pharmacy_name: 'Apollo Pharmacy & Wellness',
  mobile_number: '+919876543211',
  username: 'apollo_wellness_4482',
  created_at: '2026-09-01T08:00:00Z',
  updated_at: '2026-09-26T10:00:00Z',
};

export const MOCK_VERIFIED_PHARMACIES: PharmacyProfile[] = [
  DEMO_PHARMACY_PROFILE,
  {
    id: 'pharma-profile-medplus',
    user_id: 'pharma-user-medplus',
    pharmacist_name: 'K. Senthil Nathan, B.Pharm',
    registration_number: 'TN-PHARM-2025-1109',
    pharmacy_name: 'MedPlus Super Care',
    mobile_number: '+919840123456',
    username: 'medplus_chennai_1109',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-26T10:00:00Z',
  },
  {
    id: 'pharma-profile-wellness',
    user_id: 'pharma-user-wellness',
    pharmacist_name: 'Anitha Rajan, M.Pharm',
    registration_number: 'KA-PHARM-2026-8874',
    pharmacy_name: 'LifeCare 24/7 Chemist',
    mobile_number: '+919731234567',
    username: 'lifecare_247',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-26T10:00:00Z',
  },
];

export const LOCAL_STORAGE_PHARMACY_SHARES_KEY = 'health_wallet_v2_pharmacy_shares';
export const LOCAL_STORAGE_PHARMACY_DISPENSING_KEY = 'health_wallet_v2_pharmacy_dispensing';

export interface AuthorizedPrescriptionView {
  prescription_id: string;
  patient_id: string;
  patient_name: string;
  health_wallet_id: string;
  medicine_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  prescribed_date: string;
  doctor_name: string;
  hospital_name?: string;
  status: string;
  share_id: string;
  share_status: string;
  shared_at: string;
  expires_at?: string;
  dispensing_status?: DispensingStatus;
}

/**
 * Fetch profile for the currently logged-in pharmacy staff
 */
export async function getPharmacyProfile(userId?: string): Promise<PharmacyProfile | null> {
  if (!isSupabaseConfigured) {
    return DEMO_PHARMACY_PROFILE;
  }

  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: authData } = await supabase.auth.getUser();
      targetUserId = authData.user?.id;
    }

    if (!targetUserId) return null;

    const { data, error } = await supabase
      .from('pharmacy_profiles')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching pharmacy profile:', error.message);
      return null;
    }

    return (data as PharmacyProfile) || null;
  } catch (err: any) {
    console.warn('Unexpected error in getPharmacyProfile:', err?.message);
    return null;
  }
}

/**
 * Patient searches accredited pharmacies by name or registration number to share with
 */
export async function searchPharmacies(query: string): Promise<PharmacyProfile[]> {
  const q = query.trim().toLowerCase();
  if (!isSupabaseConfigured) {
    if (!q) return MOCK_VERIFIED_PHARMACIES;
    return MOCK_VERIFIED_PHARMACIES.filter(
      (p) =>
        p.pharmacy_name.toLowerCase().includes(q) ||
        p.registration_number.toLowerCase().includes(q) ||
        p.pharmacist_name.toLowerCase().includes(q)
    );
  }

  try {
    let dbQuery = supabase.from('pharmacy_profiles').select('*').limit(20);
    if (q) {
      dbQuery = dbQuery.or(
        `pharmacy_name.ilike.%${q}%,registration_number.ilike.%${q}%,pharmacist_name.ilike.%${q}%`
      );
    }
    const { data, error } = await dbQuery;
    if (error) {
      console.warn('Error searching pharmacies:', error.message);
      return MOCK_VERIFIED_PHARMACIES;
    }
    return (data as PharmacyProfile[]) || [];
  } catch (err: any) {
    console.warn('Unexpected error in searchPharmacies:', err?.message);
    return MOCK_VERIFIED_PHARMACIES;
  }
}

/**
 * Search patient strictly using Health Wallet ID.
 * Exposes ONLY: patient_name, health_wallet_id, blood_group, state.
 * Never exposes Aadhaar, phone, or medical history.
 */
export async function searchPatientForPharmacy(
  healthWalletId: string
): Promise<MinimalPatientInfo | null> {
  const trimmed = healthWalletId?.trim();
  if (!trimmed) return null;

  if (!isSupabaseConfigured) {
    // Offline simulation
    if (trimmed.toUpperCase() === 'HW-TN-10293847' || trimmed.toUpperCase() === 'HW-TN-98765432') {
      return {
        id: 'pat-profile-uuid-1',
        patient_name: 'Ananya Sharma',
        health_wallet_id: trimmed.toUpperCase(),
        blood_group: 'O+',
        state: 'Tamil Nadu',
      };
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('patient_profiles')
      .select('id, patient_name, health_wallet_id, blood_group, state')
      .eq('health_wallet_id', trimmed)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      patient_name: data.patient_name,
      health_wallet_id: data.health_wallet_id,
      blood_group: data.blood_group,
      state: data.state,
    };
  } catch (err: any) {
    console.warn('Error searching patient for pharmacy:', err?.message);
    return null;
  }
}

/**
 * Patient explicitly shares a prescription with a selected pharmacy.
 */
export async function patientSharePrescription(
  prescriptionId: string,
  pharmacyId: string,
  durationHours: number = 48
): Promise<{ success: boolean; shareId?: string; error?: string }> {
  if (!prescriptionId || !pharmacyId) {
    return { success: false, error: 'Prescription and Pharmacy selection are required.' };
  }

  if (!isSupabaseConfigured) {
    const shareId = `share-${Date.now()}`;
    const newShare: PharmacyPrescriptionShare = {
      id: shareId,
      patient_id: 'pat-profile-uuid-1',
      prescription_id: prescriptionId,
      pharmacy_id: pharmacyId,
      status: 'ACTIVE',
      shared_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + durationHours * 3600 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_PHARMACY_SHARES_KEY);
      const list: PharmacyPrescriptionShare[] = stored ? JSON.parse(stored) : [];
      list.unshift(newShare);
      localStorage.setItem(LOCAL_STORAGE_PHARMACY_SHARES_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Local storage error:', e);
    }

    recordMockAuditLog({
      user_id: 'mock-patient-uid',
      role: 'PATIENT',
      action: 'SHARE_PRESCRIPTION',
      record_type: 'PRESCRIPTION',
      record_id: prescriptionId,
      status: 'SUCCESS',
      metadata: { pharmacy_id: pharmacyId, duration_hours: durationHours },
    });

    recordMockNotification({
      user_id: 'mock-patient-uid',
      type: 'PRESCRIPTION_SHARED',
      title: 'Prescription Shared',
      message: 'Your prescription has been shared with the selected pharmacy.',
      related_record_id: prescriptionId,
      is_read: false,
    });

    return { success: true, shareId };
  }

  try {
    const { data, error } = await supabase.rpc('patient_share_prescription', {
      p_prescription_id: prescriptionId,
      p_pharmacy_id: pharmacyId,
      p_duration_hours: durationHours,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, shareId: data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to share prescription.' };
  }
}

/**
 * Patient revokes an active prescription share
 */
export async function patientRevokeShare(
  shareId: string
): Promise<{ success: boolean; error?: string }> {
  if (!shareId) return { success: false, error: 'Share ID is required.' };

  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_PHARMACY_SHARES_KEY);
      const list: PharmacyPrescriptionShare[] = stored ? JSON.parse(stored) : [];
      const item = list.find((s) => s.id === shareId);
      if (item) {
        item.status = 'REVOKED';
        item.revoked_at = new Date().toISOString();
        localStorage.setItem(LOCAL_STORAGE_PHARMACY_SHARES_KEY, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Local storage error:', e);
    }
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc('patient_revoke_prescription_share', {
      p_share_id: shareId,
    });
    if (error) return { success: false, error: error.message };
    return { success: Boolean(data) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to revoke share.' };
  }
}

/**
 * Fetch prescriptions shared explicitly with this pharmacy
 */
export async function getPharmacyPrescriptions(
  pharmacyId: string,
  hwIdFilter?: string
): Promise<AuthorizedPrescriptionView[]> {
  if (!isSupabaseConfigured) {
    // Return sample offline prescription view
    const list: AuthorizedPrescriptionView[] = [
      {
        prescription_id: 'rx-mock-1',
        patient_id: 'pat-profile-uuid-1',
        patient_name: 'Ananya Sharma',
        health_wallet_id: 'HW-TN-10293847',
        medicine_name: 'Amoxicillin Trihydrate',
        dosage: '500 mg',
        frequency: '2 times daily after food',
        duration: '5 days',
        instructions: 'Complete entire course. Drink plenty of fluids.',
        prescribed_date: '2026-09-26',
        doctor_name: 'Dr. Suresh Varma',
        hospital_name: 'Apollo Specialty Hospitals',
        status: 'ACTIVE',
        share_id: 'share-mock-1',
        share_status: 'ACTIVE',
        shared_at: new Date(Date.now() - 3600000).toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
    ];

    if (hwIdFilter?.trim()) {
      return list.filter((p) =>
        p.health_wallet_id.toLowerCase().includes(hwIdFilter.trim().toLowerCase())
      );
    }
    return list;
  }

  try {
    // Query active shares for this pharmacy
    let query = supabase
      .from('pharmacy_prescription_shares')
      .select(`
        id,
        status,
        shared_at,
        expires_at,
        patient:patient_profiles(id, patient_name, health_wallet_id),
        prescription:prescriptions(
          id,
          medicine_name,
          dosage,
          frequency,
          duration,
          instructions,
          prescribed_date,
          status,
          medical_record:medical_records(doctor_name, provider_name, hospital_name)
        )
      `)
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'ACTIVE');

    const { data, error } = await query;
    if (error || !data) return [];

    const now = new Date();
    const result: AuthorizedPrescriptionView[] = [];

    for (const row of data as any[]) {
      // Exclude expired shares
      if (row.expires_at && new Date(row.expires_at) <= now) continue;

      const pat = row.patient;
      const rx = row.prescription;
      if (!pat || !rx) continue;

      if (
        hwIdFilter?.trim() &&
        !pat.health_wallet_id.toLowerCase().includes(hwIdFilter.trim().toLowerCase())
      ) {
        continue;
      }

      // Check if already dispensed
      const { data: disp } = await supabase
        .from('prescription_dispensing')
        .select('status')
        .eq('prescription_id', rx.id)
        .order('dispensed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      result.push({
        prescription_id: rx.id,
        patient_id: pat.id,
        patient_name: pat.patient_name,
        health_wallet_id: pat.health_wallet_id,
        medicine_name: rx.medicine_name,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration,
        instructions: rx.instructions,
        prescribed_date: rx.prescribed_date,
        doctor_name:
          rx.medical_record?.doctor_name ||
          rx.medical_record?.provider_name ||
          'Prescribing Doctor',
        hospital_name: rx.medical_record?.hospital_name,
        status: rx.status,
        share_id: row.id,
        share_status: row.status,
        shared_at: row.shared_at,
        expires_at: row.expires_at,
        dispensing_status: disp?.status as DispensingStatus,
      });
    }

    return result;
  } catch (err: any) {
    console.warn('Error fetching pharmacy prescriptions:', err?.message);
    return [];
  }
}

/**
 * Pharmacy opens an authorized prescription to view details.
 * Emits PHARMACY_VIEW_PRESCRIPTION audit and PRESCRIPTION_VIEWED_BY_PHARMACY patient notification.
 */
export async function pharmacyViewPrescription(
  prescriptionId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!prescriptionId) return { success: false, error: 'Prescription ID is required.' };

  if (!isSupabaseConfigured) {
    recordMockAuditLog({
      user_id: 'pharma-user-demo',
      role: 'PHARMACY',
      action: 'PHARMACY_VIEW_PRESCRIPTION',
      record_type: 'PRESCRIPTION',
      record_id: prescriptionId,
      status: 'SUCCESS',
      metadata: { pharmacy_name: DEMO_PHARMACY_PROFILE.pharmacy_name },
    });

    recordMockNotification({
      user_id: 'mock-patient-uid',
      type: 'PRESCRIPTION_VIEWED_BY_PHARMACY',
      title: 'Prescription Viewed',
      message: 'Your prescription was viewed by the pharmacy.',
      related_record_id: prescriptionId,
      is_read: false,
    });

    return {
      success: true,
      data: {
        prescription_id: prescriptionId,
        medicine_name: 'Amoxicillin Trihydrate',
        dosage: '500 mg',
        frequency: '2 times daily after food',
        duration: '5 days',
        instructions: 'Complete entire course. Drink plenty of fluids.',
        prescribed_date: '2026-09-26',
        doctor_name: 'Dr. Suresh Varma',
        hospital_name: 'Apollo Specialty Hospitals',
      },
    };
  }

  try {
    const { data, error } = await supabase.rpc('pharmacy_view_prescription', {
      p_prescription_id: prescriptionId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to view prescription.' };
  }
}

/**
 * Pharmacy records dispensing information (DISPENSED, PARTIALLY_DISPENSED, NOT_DISPENSED).
 * Atomic transaction via RPC.
 */
export async function pharmacyDispensePrescription(input: {
  prescriptionId: string;
  pharmacyId: string;
  status: DispensingStatus;
  quantityDispensed?: string;
  notes?: string;
}): Promise<{ success: boolean; dispensingId?: string; error?: string }> {
  const { prescriptionId, pharmacyId, status, quantityDispensed, notes } = input;

  if (!prescriptionId || !pharmacyId || !status) {
    return { success: false, error: 'Prescription ID, Pharmacy ID, and Status are required.' };
  }

  if (!isSupabaseConfigured) {
    const dispensingId = `disp-${Date.now()}`;
    const newRecord: PrescriptionDispensingRecord = {
      id: dispensingId,
      prescription_id: prescriptionId,
      patient_id: 'pat-profile-uuid-1',
      pharmacy_id: pharmacyId,
      dispensed_by_user_id: 'pharma-user-demo',
      dispensed_at: new Date().toISOString(),
      status,
      quantity_dispensed: quantityDispensed,
      notes,
      created_at: new Date().toISOString(),
    };

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_PHARMACY_DISPENSING_KEY);
      const list: PrescriptionDispensingRecord[] = stored ? JSON.parse(stored) : [];
      list.unshift(newRecord);
      localStorage.setItem(LOCAL_STORAGE_PHARMACY_DISPENSING_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Local storage error:', e);
    }

    const auditAction =
      status === 'DISPENSED'
        ? 'DISPENSE_PRESCRIPTION'
        : status === 'PARTIALLY_DISPENSED'
        ? 'PHARMACY_PARTIAL_DISPENSE'
        : 'PHARMACY_DECLINE_PRESCRIPTION';

    recordMockAuditLog({
      user_id: 'pharma-user-demo',
      role: 'PHARMACY',
      action: auditAction as any,
      record_type: 'PRESCRIPTION',
      record_id: prescriptionId,
      status: 'SUCCESS',
      metadata: { dispensing_id: dispensingId, dispensing_status: status },
    });

    const notifType =
      status === 'DISPENSED'
        ? 'PRESCRIPTION_DISPENSED'
        : status === 'PARTIALLY_DISPENSED'
        ? 'PRESCRIPTION_PARTIALLY_DISPENSED'
        : 'PRESCRIPTION_NOT_DISPENSED';

    const notifTitle =
      status === 'DISPENSED'
        ? 'Prescription Dispensed'
        : status === 'PARTIALLY_DISPENSED'
        ? 'Prescription Partially Dispensed'
        : 'Prescription Not Dispensed';

    const notifMessage =
      status === 'DISPENSED'
        ? 'Your prescription was marked as dispensed by the pharmacy.'
        : status === 'PARTIALLY_DISPENSED'
        ? 'Your prescription was partially dispensed by the pharmacy.'
        : 'Your prescription could not be dispensed by the pharmacy.';

    recordMockNotification({
      user_id: 'mock-patient-uid',
      type: notifType as any,
      title: notifTitle,
      message: notifMessage,
      related_record_id: prescriptionId,
      is_read: false,
    });

    return { success: true, dispensingId };
  }

  try {
    const { data, error } = await supabase.rpc('pharmacy_dispense_prescription', {
      p_prescription_id: prescriptionId,
      p_pharmacy_id: pharmacyId,
      p_status: status,
      p_quantity_dispensed: quantityDispensed || null,
      p_notes: notes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, dispensingId: data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to dispense prescription.' };
  }
}

/**
 * Fetch pharmacy dashboard overview metrics
 */
export async function getPharmacyDashboardStats(pharmacyId: string): Promise<{
  pendingCount: number;
  dispensedCount: number;
  partiallyDispensedCount: number;
}> {
  if (!isSupabaseConfigured) {
    return { pendingCount: 1, dispensedCount: 3, partiallyDispensedCount: 1 };
  }

  try {
    const { count: pendingCount } = await supabase
      .from('pharmacy_prescription_shares')
      .select('*', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'ACTIVE');

    const { count: dispensedCount } = await supabase
      .from('prescription_dispensing')
      .select('*', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'DISPENSED');

    const { count: partiallyDispensedCount } = await supabase
      .from('prescription_dispensing')
      .select('*', { count: 'exact', head: true })
      .eq('pharmacy_id', pharmacyId)
      .eq('status', 'PARTIALLY_DISPENSED');

    return {
      pendingCount: pendingCount || 0,
      dispensedCount: dispensedCount || 0,
      partiallyDispensedCount: partiallyDispensedCount || 0,
    };
  } catch (err: any) {
    console.warn('Error fetching pharmacy dashboard stats:', err?.message);
    return { pendingCount: 0, dispensedCount: 0, partiallyDispensedCount: 0 };
  }
}
