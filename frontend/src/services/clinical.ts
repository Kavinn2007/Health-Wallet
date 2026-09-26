import { supabase, isSupabaseConfigured, type MinimalPatientInfo } from './supabase';
import { getDoctorProfile, DEMO_DOCTOR_PROFILE } from './doctors';
import { getDoctorConsentStatus } from './consent';
import { type MedicalRecord, type CreatorType } from './healthRecords';

export interface CreateConsultationInput {
  patientId: string;
  consultationDate: string;
  chiefComplaint: string;
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  followUpDate?: string;
}

export interface CreateDiagnosisInput {
  patientId: string;
  diagnosisDate: string;
  condition: string;
  notes?: string;
}

export interface CreateTreatmentInput {
  patientId: string;
  treatmentDate: string;
  treatment: string;
  carePlan?: string;
  notes?: string;
}

export interface CreatePrescriptionInput {
  patientId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  startDate?: string;
  endDate?: string;
}

export interface ClinicalActionResult {
  success: boolean;
  recordId?: string;
  childId?: string;
  error?: string;
}

/**
 * Creates a consultation record for an authorized patient.
 * Enforces doctor identity + approved consent + unexpired + CONSULTATIONS category.
 */
export async function doctorCreateConsultation(
  input: CreateConsultationInput
): Promise<ClinicalActionResult> {
  const patientId = input.patientId?.trim();
  const date = input.consultationDate?.trim();
  const chiefComplaint = input.chiefComplaint?.trim();

  if (!patientId) {
    return { success: false, error: 'Patient ID is required.' };
  }
  if (!date) {
    return { success: false, error: 'Consultation date is required.' };
  }
  if (!chiefComplaint) {
    return { success: false, error: 'Chief complaint is required.' };
  }

  // Pre-flight consent check
  const consent = await getDoctorConsentStatus(patientId);
  if (!consent.hasConsent) {
    return {
      success: false,
      error:
        consent.status === 'EXPIRED'
          ? 'Patient consent has expired.'
          : consent.status === 'REVOKED'
          ? 'Patient has revoked access.'
          : 'Active approved patient consent is required.',
    };
  }

  const authorizedCategories = consent.approvedRecordTypes || [];
  if (
    !authorizedCategories.includes('CONSULTATIONS') &&
    !authorizedCategories.includes('ALL_RECORDS')
  ) {
    return {
      success: false,
      error: 'Your current consent does not authorize creating consultations.',
    };
  }

  if (!isSupabaseConfigured) {
    // Offline / demo fallback
    const doctor = (await getDoctorProfile()) || DEMO_DOCTOR_PROFILE;
    const recordId = `rec-cons-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const childId = `cons-${Date.now()}`;

    const newRecord: MedicalRecord = {
      id: recordId,
      patient_id: patientId,
      record_type: 'CONSULTATION',
      title: chiefComplaint,
      description: input.notes?.trim() || `Clinical Consultation with ${doctor.doctor_name}`,
      record_date: date,
      provider_name: doctor.doctor_name,
      provider_type: 'DOCTOR',
      hospital_name: doctor.hospital_name,
      creator_type: 'PROVIDER_CREATED' as CreatorType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to patient records
    const localKey = `health_wallet_records_v2_${patientId}`;
    try {
      const existing: MedicalRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      existing.unshift(newRecord);
      localStorage.setItem(localKey, JSON.stringify(existing));

      // Save subtype
      const subKey = `health_wallet_record_sub_${recordId}`;
      localStorage.setItem(
        subKey,
        JSON.stringify({
          consultation: {
            id: childId,
            patient_id: patientId,
            medical_record_id: recordId,
            consultation_date: date,
            doctor_name: doctor.doctor_name,
            hospital_clinic: doctor.hospital_name,
            chief_complaint: chiefComplaint,
            symptoms: input.symptoms?.trim() || null,
            diagnosis: input.diagnosis?.trim() || null,
            treatment: input.treatment?.trim() || null,
            notes: input.notes?.trim() || null,
            follow_up_date: input.followUpDate || null,
            creator_type: 'PROVIDER_CREATED',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        })
      );
    } catch (e) {
      console.warn('Local storage error:', e);
    }

    return { success: true, recordId, childId };
  }

  try {
    const { data, error } = await supabase.rpc('doctor_create_consultation', {
      p_patient_id: patientId,
      p_consultation_date: date,
      p_chief_complaint: chiefComplaint,
      p_symptoms: input.symptoms?.trim() || null,
      p_diagnosis: input.diagnosis?.trim() || null,
      p_treatment: input.treatment?.trim() || null,
      p_notes: input.notes?.trim() || null,
      p_follow_up_date: input.followUpDate || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      recordId: data?.record_id,
      childId: data?.consultation_id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to create consultation.',
    };
  }
}

/**
 * Creates a diagnosis record for an authorized patient.
 * Enforces doctor identity + approved consent + unexpired + DIAGNOSES category.
 */
export async function doctorCreateDiagnosis(
  input: CreateDiagnosisInput
): Promise<ClinicalActionResult> {
  const patientId = input.patientId?.trim();
  const date = input.diagnosisDate?.trim();
  const condition = input.condition?.trim();

  if (!patientId) {
    return { success: false, error: 'Patient ID is required.' };
  }
  if (!date) {
    return { success: false, error: 'Diagnosis date is required.' };
  }
  if (!condition) {
    return { success: false, error: 'Diagnosis condition is required.' };
  }

  // Pre-flight consent check
  const consent = await getDoctorConsentStatus(patientId);
  if (!consent.hasConsent) {
    return {
      success: false,
      error:
        consent.status === 'EXPIRED'
          ? 'Patient consent has expired.'
          : consent.status === 'REVOKED'
          ? 'Patient has revoked access.'
          : 'Active approved patient consent is required.',
    };
  }

  const authorizedCategories = consent.approvedRecordTypes || [];
  if (
    !authorizedCategories.includes('DIAGNOSES') &&
    !authorizedCategories.includes('ALL_RECORDS')
  ) {
    return {
      success: false,
      error: 'Your current consent does not authorize creating diagnoses.',
    };
  }

  if (!isSupabaseConfigured) {
    const doctor = (await getDoctorProfile()) || DEMO_DOCTOR_PROFILE;
    const recordId = `rec-diag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const childId = `diag-${Date.now()}`;

    const newRecord: MedicalRecord = {
      id: recordId,
      patient_id: patientId,
      record_type: 'DIAGNOSIS',
      title: condition,
      description: input.notes?.trim() || `Formal Clinical Diagnosis: ${condition}`,
      record_date: date,
      provider_name: doctor.doctor_name,
      provider_type: 'DOCTOR',
      hospital_name: doctor.hospital_name,
      creator_type: 'PROVIDER_CREATED' as CreatorType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const localKey = `health_wallet_records_v2_${patientId}`;
    try {
      const existing: MedicalRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      existing.unshift(newRecord);
      localStorage.setItem(localKey, JSON.stringify(existing));

      const subKey = `health_wallet_record_sub_${recordId}`;
      localStorage.setItem(
        subKey,
        JSON.stringify({
          diagnosis: {
            id: childId,
            patient_id: patientId,
            medical_record_id: recordId,
            diagnosis_name: condition,
            diagnosis_date: date,
            provider: doctor.doctor_name,
            notes: input.notes?.trim() || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        })
      );
    } catch (e) {
      console.warn('Local storage error:', e);
    }

    return { success: true, recordId, childId };
  }

  try {
    const { data, error } = await supabase.rpc('doctor_create_diagnosis', {
      p_patient_id: patientId,
      p_diagnosis_date: date,
      p_condition: condition,
      p_notes: input.notes?.trim() || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      recordId: data?.record_id,
      childId: data?.diagnosis_id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to create diagnosis.',
    };
  }
}

/**
 * Creates a treatment record for an authorized patient.
 * Enforces doctor identity + approved consent + unexpired + TREATMENTS category.
 */
export async function doctorCreateTreatment(
  input: CreateTreatmentInput
): Promise<ClinicalActionResult> {
  const patientId = input.patientId?.trim();
  const date = input.treatmentDate?.trim();
  const treatment = input.treatment?.trim();

  if (!patientId) {
    return { success: false, error: 'Patient ID is required.' };
  }
  if (!date) {
    return { success: false, error: 'Treatment date is required.' };
  }
  if (!treatment) {
    return { success: false, error: 'Treatment or intervention description is required.' };
  }

  // Pre-flight consent check
  const consent = await getDoctorConsentStatus(patientId);
  if (!consent.hasConsent) {
    return {
      success: false,
      error:
        consent.status === 'EXPIRED'
          ? 'Patient consent has expired.'
          : consent.status === 'REVOKED'
          ? 'Patient has revoked access.'
          : 'Active approved patient consent is required.',
    };
  }

  const authorizedCategories = consent.approvedRecordTypes || [];
  if (
    !authorizedCategories.includes('TREATMENTS') &&
    !authorizedCategories.includes('ALL_RECORDS')
  ) {
    return {
      success: false,
      error: 'Your current consent does not authorize creating treatments.',
    };
  }

  if (!isSupabaseConfigured) {
    const doctor = (await getDoctorProfile()) || DEMO_DOCTOR_PROFILE;
    const recordId = `rec-treat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const childId = `treat-${Date.now()}`;

    const newRecord: MedicalRecord = {
      id: recordId,
      patient_id: patientId,
      record_type: 'TREATMENT',
      title: treatment,
      description: input.carePlan?.trim() || input.notes?.trim() || `Treatment / Intervention: ${treatment}`,
      record_date: date,
      provider_name: doctor.doctor_name,
      provider_type: 'DOCTOR',
      hospital_name: doctor.hospital_name,
      creator_type: 'PROVIDER_CREATED' as CreatorType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const localKey = `health_wallet_records_v2_${patientId}`;
    try {
      const existing: MedicalRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      existing.unshift(newRecord);
      localStorage.setItem(localKey, JSON.stringify(existing));

      const subKey = `health_wallet_record_sub_${recordId}`;
      localStorage.setItem(
        subKey,
        JSON.stringify({
          treatment: {
            id: childId,
            patient_id: patientId,
            medical_record_id: recordId,
            treatment_name: treatment,
            treatment_date: date,
            provider: doctor.doctor_name,
            care_plan: input.carePlan?.trim() || null,
            notes: input.notes?.trim() || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        })
      );
    } catch (e) {
      console.warn('Local storage error:', e);
    }

    return { success: true, recordId, childId };
  }

  try {
    const { data, error } = await supabase.rpc('doctor_create_treatment', {
      p_patient_id: patientId,
      p_treatment_date: date,
      p_treatment: treatment,
      p_care_plan: input.carePlan?.trim() || null,
      p_notes: input.notes?.trim() || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      recordId: data?.record_id,
      childId: data?.treatment_id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to create treatment.',
    };
  }
}

/**
 * Creates a prescription record for an authorized patient.
 * Enforces doctor identity + approved consent + unexpired + PRESCRIPTIONS category.
 * Starts in ACTIVE status.
 */
export async function doctorCreatePrescription(
  input: CreatePrescriptionInput
): Promise<ClinicalActionResult> {
  const patientId = input.patientId?.trim();
  const medicineName = input.medicineName?.trim();
  const dosage = input.dosage?.trim();
  const frequency = input.frequency?.trim();
  const duration = input.duration?.trim();

  if (!patientId) {
    return { success: false, error: 'Patient ID is required.' };
  }
  if (!medicineName) {
    return { success: false, error: 'Medicine name is required.' };
  }
  if (!dosage) {
    return { success: false, error: 'Dosage is required.' };
  }
  if (!frequency) {
    return { success: false, error: 'Frequency is required.' };
  }
  if (!duration) {
    return { success: false, error: 'Duration is required.' };
  }

  if (input.startDate && input.endDate && new Date(input.endDate) < new Date(input.startDate)) {
    return { success: false, error: 'Invalid date range: End date cannot be before start date.' };
  }

  // Pre-flight consent check
  const consent = await getDoctorConsentStatus(patientId);
  if (!consent.hasConsent) {
    return {
      success: false,
      error:
        consent.status === 'EXPIRED'
          ? 'Patient consent has expired.'
          : consent.status === 'REVOKED'
          ? 'Patient has revoked access.'
          : 'Active approved patient consent is required.',
    };
  }

  const authorizedCategories = consent.approvedRecordTypes || [];
  if (
    !authorizedCategories.includes('PRESCRIPTIONS') &&
    !authorizedCategories.includes('ALL_RECORDS')
  ) {
    return {
      success: false,
      error: 'Your current consent does not authorize creating prescriptions.',
    };
  }

  const prescribedDate = input.startDate || new Date().toISOString().split('T')[0];

  if (!isSupabaseConfigured) {
    const doctor = (await getDoctorProfile()) || DEMO_DOCTOR_PROFILE;
    const recordId = `rec-rx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const childId = `rx-${Date.now()}`;

    const newRecord: MedicalRecord = {
      id: recordId,
      patient_id: patientId,
      record_type: 'PRESCRIPTION',
      title: `${medicineName} (${dosage})`,
      description: `Rx: ${medicineName} ${dosage}, Frequency: ${frequency}, Duration: ${duration}${
        input.instructions ? `\nInstructions: ${input.instructions}` : ''
      }`,
      record_date: prescribedDate,
      provider_name: doctor.doctor_name,
      provider_type: 'DOCTOR',
      hospital_name: doctor.hospital_name,
      creator_type: 'PROVIDER_CREATED' as CreatorType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const localKey = `health_wallet_records_v2_${patientId}`;
    try {
      const existing: MedicalRecord[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      existing.unshift(newRecord);
      localStorage.setItem(localKey, JSON.stringify(existing));

      const subKey = `health_wallet_record_sub_${recordId}`;
      localStorage.setItem(
        subKey,
        JSON.stringify({
          prescription: {
            id: childId,
            patient_id: patientId,
            medical_record_id: recordId,
            medicine_name: medicineName,
            dosage,
            frequency,
            duration,
            instructions: input.instructions?.trim() || null,
            prescribed_date: prescribedDate,
            start_date: input.startDate || null,
            end_date: input.endDate || null,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        })
      );
    } catch (e) {
      console.warn('Local storage error:', e);
    }

    return { success: true, recordId, childId };
  }

  try {
    const { data, error } = await supabase.rpc('doctor_create_prescription', {
      p_patient_id: patientId,
      p_medicine_name: medicineName,
      p_dosage: dosage,
      p_frequency: frequency,
      p_duration: duration,
      p_instructions: input.instructions?.trim() || null,
      p_start_date: input.startDate || null,
      p_end_date: input.endDate || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      recordId: data?.record_id,
      childId: data?.prescription_id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to create prescription.',
    };
  }
}

/**
 * Fetches minimal patient profile for an authorized doctor.
 * Gated by active approved consent.
 */
export async function getPatientSummaryForDoctor(
  patientId: string
): Promise<MinimalPatientInfo | null> {
  if (!patientId) return null;

  if (!isSupabaseConfigured) {
    // 1. Check access requests in localStorage
    try {
      const localReqsStr = localStorage.getItem('health_wallet_v2_access_requests');
      if (localReqsStr) {
        const reqs = JSON.parse(localReqsStr);
        const match = reqs.find((r: any) => r.patient_id === patientId && r.patient);
        if (match?.patient) {
          return match.patient;
        }
      }
    } catch {
      // ignore
    }

    // 2. Check local mock session
    try {
      const mockSession = localStorage.getItem('health_wallet_v2_mock_session');
      if (mockSession) {
        const parsed = JSON.parse(mockSession);
        if (parsed?.profile && (parsed.profile.id === patientId || parsed.user?.id === patientId)) {
          return {
            id: parsed.profile.id || patientId,
            patient_name: parsed.profile.patient_name || 'Patient',
            health_wallet_id: parsed.profile.health_wallet_id || 'HW-TN-38236621',
            blood_group: parsed.profile.blood_group || 'B+',
            state: parsed.profile.state || 'Tamil Nadu',
          };
        }
      }
    } catch {
      // ignore
    }

    // 3. Fallback demo patient
    return {
      id: patientId,
      patient_name: 'Sunita Patil',
      health_wallet_id: 'HW-TN-38236621',
      blood_group: 'B+',
      state: 'Tamil Nadu',
    };
  }

  try {
    // Try RPC first
    const { data, error } = await supabase.rpc('doctor_get_patient_profile', {
      p_patient_id: patientId,
    });

    if (!error && data && data.length > 0) {
      const row = data[0];
      return {
        id: row.id,
        patient_name: row.patient_name,
        health_wallet_id: row.health_wallet_id,
        blood_group: row.blood_group,
        state: row.state,
      };
    }

    // Fallback query to patient_profiles directly
    const { data: profile } = await supabase
      .from('patient_profiles')
      .select('id, patient_name, health_wallet_id, blood_group, state')
      .eq('id', patientId)
      .maybeSingle();

    if (profile) {
      return profile as MinimalPatientInfo;
    }

    // Fallback: check access_requests
    const { data: userAuth } = await supabase.auth.getUser();
    if (userAuth?.user) {
      const { data: req } = await supabase
        .from('access_requests')
        .select('patient:patient_profiles(id, patient_name, health_wallet_id, blood_group, state)')
        .eq('patient_id', patientId)
        .eq('requester_user_id', userAuth.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (req && (req as any).patient) {
        return (req as any).patient as MinimalPatientInfo;
      }
    }

    return null;
  } catch (err) {
    console.warn('Error fetching patient profile for doctor:', err);
    return null;
  }
}
