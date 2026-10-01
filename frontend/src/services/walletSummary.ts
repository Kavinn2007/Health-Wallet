import { supabase, isSupabaseConfigured } from './supabase';
import { recordMockAuditLog } from './audit';
import type { MedicalRecord } from './healthRecords';
import type { Appointment } from './appointments';
import type { BloodDonorProfile } from './bloodDonation';
import type { OrganDonorProfile, OrganDonationPreferences } from './organDonation';

export interface WalletSummaryIdentity {
  patient_id: string;
  patient_name: string;
  health_wallet_id: string;
  blood_group: string;
  gender: string;
  state: string;
  state_code?: string;
}

export interface WalletSummaryActiveMedication {
  id?: string;
  medicine_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  prescribed_date?: string;
  status?: string;
}

export interface WalletSummaryHealthOverview {
  allergies: string;
  critical_conditions: string;
  current_medication_count: number;
  current_medications: WalletSummaryActiveMedication[];
}

export interface WalletSummaryConsultation {
  id: string;
  consultation_date: string;
  doctor_name?: string;
  hospital_clinic?: string;
  chief_complaint: string;
  diagnosis?: string;
  treatment?: string;
  follow_up_date?: string;
}

export interface WalletSummaryDiagnosis {
  id: string;
  diagnosis_name: string;
  diagnosis_date: string;
  provider?: string;
  notes?: string;
}

export interface WalletSummaryTreatment {
  id: string;
  treatment_name: string;
  treatment_date: string;
  provider?: string;
  notes?: string;
}

export interface WalletSummaryPrescription {
  id: string;
  medicine_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  prescribed_date: string;
  status: string;
}

export interface WalletSummaryLabReport {
  id: string;
  test_name: string;
  test_date: string;
  lab_name?: string;
  result?: string;
  unit?: string;
  reference_range?: string;
}

export interface WalletSummaryMedicalRecord {
  id: string;
  record_type: string;
  title: string;
  description?: string;
  record_date: string;
  provider_name?: string;
  hospital_name?: string;
}

export interface WalletSummaryMedicalActivity {
  recent_consultations: WalletSummaryConsultation[];
  recent_diagnoses: WalletSummaryDiagnosis[];
  recent_treatments: WalletSummaryTreatment[];
  recent_prescriptions: WalletSummaryPrescription[];
  recent_lab_reports: WalletSummaryLabReport[];
  recent_medical_records: WalletSummaryMedicalRecord[];
}

export interface WalletSummaryAppointmentItem {
  id: string;
  doctor_id: string;
  appointment_type: 'IN_PERSON' | 'TELEHEALTH';
  slot_start: string;
  slot_end: string;
  status: string;
  appointment_reason?: string | null;
  completed_at?: string | null;
  doctor_name?: string;
  specialization?: string;
  hospital_name?: string;
}

export interface WalletSummaryAppointments {
  upcoming: WalletSummaryAppointmentItem[];
  pending: WalletSummaryAppointmentItem[];
  recent_completed: WalletSummaryAppointmentItem[];
}

export interface WalletSummaryBloodDonorStatus {
  is_registered: boolean;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'NOT_REGISTERED';
  blood_group?: string;
  state_code?: string;
  city?: string | null;
  last_donation_date?: string | null;
}

export interface WalletSummaryOrganDonorStatus {
  is_registered: boolean;
  status: 'ACTIVE' | 'REVOKED' | 'NOT_REGISTERED';
  consented_at?: string | null;
  preferences?: Record<string, boolean>;
}

export interface WalletSummaryDonationStatus {
  blood_donor: WalletSummaryBloodDonorStatus;
  organ_donor: WalletSummaryOrganDonorStatus;
}

export interface WalletSummaryRecentActivityItem {
  id: string;
  action: string;
  role: string;
  status?: string;
  created_at: string;
}

export interface WalletSummaryData {
  identity: WalletSummaryIdentity;
  health_overview: WalletSummaryHealthOverview;
  medical_activity: WalletSummaryMedicalActivity;
  appointments: WalletSummaryAppointments;
  donation_status: WalletSummaryDonationStatus;
  recent_activity: WalletSummaryRecentActivityItem[];
}

/**
 * Fetches the unified Health Wallet Summary for the authenticated patient.
 * Identity is derived strictly from the active session / auth.uid().
 * Never accepts an arbitrary patient identity from client parameters.
 */
export async function getWalletSummary(): Promise<{
  data: WalletSummaryData | null;
  error: string | null;
}> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_wallet_summary');
      if (error) {
        console.error('Error executing get_wallet_summary RPC:', error);
        return { data: null, error: error.message || 'Failed to retrieve wallet summary.' };
      }
      return { data: data as WalletSummaryData, error: null };
    } catch (err: any) {
      console.error('Exception calling get_wallet_summary RPC:', err);
      return { data: null, error: err?.message || 'Network error occurred.' };
    }
  }

  // Offline / Demo Mode Fallback
  // Strictly derive authenticated patient identity from mock session
  try {
    const sessionStr = localStorage.getItem('health_wallet_v2_mock_session');
    if (!sessionStr) {
      return { data: null, error: 'Authentication required: caller identity could not be verified.' };
    }

    const session = JSON.parse(sessionStr);
    const role = session.role || 'PATIENT';
    if (role !== 'PATIENT') {
      return { data: null, error: 'Access denied: caller does not have an associated patient profile.' };
    }

    const patientProfile = session.profile || {};
    const patientId = patientProfile.id || session.user?.id || 'pat-profile-1';

    // 1. Identity (Never exposes Aadhaar hash or sensitive secrets)
    const identity: WalletSummaryIdentity = {
      patient_id: patientId,
      patient_name: patientProfile.patient_name || 'Verified Patient',
      health_wallet_id: patientProfile.health_wallet_id || 'HW-TN-38236621',
      blood_group: patientProfile.blood_group || 'B+',
      gender: patientProfile.gender || 'Female',
      state: patientProfile.state || 'Tamil Nadu',
      state_code: patientProfile.state_code || 'TN',
    };

    // 2. Medical Records
    const localRecordsKey = `health_wallet_records_v2_${patientId}`;
    let records: MedicalRecord[] = [];
    try {
      records = JSON.parse(localStorage.getItem(localRecordsKey) || '[]');
    } catch {}

    const recentRecords: WalletSummaryMedicalRecord[] = records
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        record_type: r.record_type,
        title: r.title,
        description: r.description,
        record_date: r.record_date,
        provider_name: r.provider_name,
        hospital_name: r.hospital_name,
      }));

    // Extract child record details
    const consultations: WalletSummaryConsultation[] = [];
    const diagnoses: WalletSummaryDiagnosis[] = [];
    const treatments: WalletSummaryTreatment[] = [];
    const prescriptions: WalletSummaryPrescription[] = [];
    const labReports: WalletSummaryLabReport[] = [];

    records.forEach((rec) => {
      const subKey = `health_wallet_record_sub_${rec.id}`;
      try {
        const subRaw = localStorage.getItem(subKey);
        if (subRaw) {
          const sub = JSON.parse(subRaw);
          if (sub.consultation) consultations.push(sub.consultation);
          if (sub.diagnosis) diagnoses.push(sub.diagnosis);
          if (sub.treatment) treatments.push(sub.treatment);
          if (sub.prescription) prescriptions.push(sub.prescription);
          if (sub.labReport) labReports.push(sub.labReport);
        }
      } catch {}
    });

    // 3. Health Overview & Active Medications
    const activePrescriptions = prescriptions.filter((p) => p.status === 'ACTIVE' || !p.status);
    const activeMedsList: WalletSummaryActiveMedication[] = activePrescriptions.slice(0, 10).map((p) => ({
      id: p.id,
      medicine_name: p.medicine_name,
      dosage: p.dosage,
      frequency: p.frequency,
      duration: p.duration,
      prescribed_date: p.prescribed_date,
      status: p.status || 'ACTIVE',
    }));

    const healthOverview: WalletSummaryHealthOverview = {
      allergies: patientProfile.allergies || 'None',
      critical_conditions: patientProfile.critical_conditions || 'None',
      current_medication_count: activePrescriptions.length,
      current_medications: activeMedsList,
    };

    // 4. Appointments
    let localAppointments: Appointment[] = [];
    try {
      localAppointments = JSON.parse(localStorage.getItem('health_wallet_v2_appointments') || '[]');
    } catch {}

    const patientAppointments = localAppointments.filter((a) => a.patient_id === patientId);
    const now = new Date();

    const upcoming: WalletSummaryAppointmentItem[] = patientAppointments
      .filter((a) => a.status === 'CONFIRMED' && new Date(a.slot_start) >= now)
      .sort((a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime())
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        doctor_id: a.doctor_id,
        appointment_type: a.appointment_type,
        slot_start: a.slot_start,
        slot_end: a.slot_end,
        status: a.status,
        appointment_reason: a.appointment_reason,
        doctor_name: a.doctor_name,
        specialization: a.specialization,
        hospital_name: a.hospital_name,
      }));

    const pending: WalletSummaryAppointmentItem[] = patientAppointments
      .filter((a) => a.status === 'PENDING' && new Date(a.slot_start) >= now)
      .sort((a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime())
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        doctor_id: a.doctor_id,
        appointment_type: a.appointment_type,
        slot_start: a.slot_start,
        slot_end: a.slot_end,
        status: a.status,
        appointment_reason: a.appointment_reason,
        doctor_name: a.doctor_name,
        specialization: a.specialization,
        hospital_name: a.hospital_name,
      }));

    const recentCompleted: WalletSummaryAppointmentItem[] = patientAppointments
      .filter((a) => a.status === 'COMPLETED')
      .sort((a, b) => new Date(b.slot_start).getTime() - new Date(a.slot_start).getTime())
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        doctor_id: a.doctor_id,
        appointment_type: a.appointment_type,
        slot_start: a.slot_start,
        slot_end: a.slot_end,
        status: a.status,
        appointment_reason: a.appointment_reason,
        completed_at: a.completed_at,
        doctor_name: a.doctor_name,
        specialization: a.specialization,
        hospital_name: a.hospital_name,
      }));

    // 5. Donation Status
    let bloodDonors: BloodDonorProfile[] = [];
    try {
      bloodDonors = JSON.parse(localStorage.getItem('health_wallet_v2_blood_donor_profiles') || '[]');
    } catch {}
    const bloodDonor = bloodDonors.find((d) => d.patient_id === patientId || d.user_id === session.user?.id);

    let organDonors: OrganDonorProfile[] = [];
    let organPrefs: OrganDonationPreferences[] = [];
    try {
      organDonors = JSON.parse(localStorage.getItem('health_wallet_v2_organ_donor_profiles') || '[]');
      organPrefs = JSON.parse(localStorage.getItem('health_wallet_v2_organ_donation_preferences') || '[]');
    } catch {}
    const organDonor = organDonors.find((o) => o.patient_id === patientId || o.user_id === session.user?.id);
    const organPref = organDonor ? organPrefs.find((p) => p.donor_profile_id === organDonor.id) : undefined;

    const donationStatus: WalletSummaryDonationStatus = {
      blood_donor: bloodDonor
        ? {
            is_registered: true,
            status: bloodDonor.is_available ? 'AVAILABLE' : 'UNAVAILABLE',
            blood_group: bloodDonor.blood_group,
            state_code: bloodDonor.state_code,
            city: bloodDonor.city,
            last_donation_date: bloodDonor.last_donation_date,
          }
        : {
            is_registered: false,
            status: 'NOT_REGISTERED',
          },
      organ_donor: organDonor
        ? {
            is_registered: true,
            status: organDonor.status,
            consented_at: organDonor.consented_at,
            preferences: organPref
              ? {
                  kidneys: organPref.kidneys,
                  liver: organPref.liver,
                  heart: organPref.heart,
                  lungs: organPref.lungs,
                  pancreas: organPref.pancreas,
                  intestines: organPref.intestines,
                  corneas: organPref.corneas,
                  skin: organPref.skin,
                  bone: organPref.bone,
                  tissues_other: organPref.tissues_other,
                }
              : undefined,
          }
        : {
            is_registered: false,
            status: 'NOT_REGISTERED',
          },
    };

    // 6. Recent Activity
    let auditLogs: any[] = [];
    try {
      auditLogs = JSON.parse(localStorage.getItem('health_wallet_v2_audit_logs') || '[]');
    } catch {}

    const recentActivity: WalletSummaryRecentActivityItem[] = auditLogs
      .filter((l) => l.patient_id === patientId || (l.user_id === session.user?.id && l.role === 'PATIENT'))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((l) => ({
        id: l.id,
        action: l.action,
        role: l.role,
        status: l.status,
        created_at: l.created_at,
      }));

    // Record immutable audit event
    recordMockAuditLog({
      user_id: session.user?.id || 'user-patient-1',
      role: 'PATIENT',
      patient_id: patientId,
      action: 'VIEW_WALLET_SUMMARY',
      status: 'SUCCESS',
      metadata: { timestamp: new Date().toISOString() },
    });

    const summaryData: WalletSummaryData = {
      identity,
      health_overview: healthOverview,
      medical_activity: {
        recent_consultations: consultations.slice(0, 5),
        recent_diagnoses: diagnoses.slice(0, 5),
        recent_treatments: treatments.slice(0, 5),
        recent_prescriptions: prescriptions.slice(0, 5),
        recent_lab_reports: labReports.slice(0, 5),
        recent_medical_records: recentRecords,
      },
      appointments: {
        upcoming,
        pending,
        recent_completed: recentCompleted,
      },
      donation_status: donationStatus,
      recent_activity: recentActivity,
    };

    return { data: summaryData, error: null };
  } catch (err: any) {
    console.error('Error generating local wallet summary:', err);
    return { data: null, error: 'Failed to generate wallet summary.' };
  }
}
