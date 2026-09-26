import { supabase, isSupabaseConfigured } from './supabase';

export type RecordType =
  | 'CONSULTATION'
  | 'DIAGNOSIS'
  | 'TREATMENT'
  | 'LAB_REPORT'
  | 'PRESCRIPTION'
  | 'IMAGING'
  | 'OTHER';

export type CreatorType = 'PATIENT_UPLOADED' | 'PROVIDER_CREATED';

export interface MedicalRecord {
  id: string;
  patient_id: string;
  record_type: RecordType;
  title: string;
  description?: string;
  record_date: string;
  provider_name?: string;
  provider_type?: string;
  hospital_name?: string;
  document_path?: string;
  document_name?: string;
  document_size?: number;
  document_mime_type?: string;
  creator_type: CreatorType;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: string;
  patient_id: string;
  medical_record_id: string;
  consultation_date: string;
  doctor_name?: string;
  hospital_clinic?: string;
  chief_complaint?: string;
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  follow_up_date?: string;
  creator_type: CreatorType;
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  medical_record_id: string;
  medicine_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  prescribed_date: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';
  created_at: string;
  updated_at: string;
}

export interface LabTestResult {
  id: string;
  lab_report_id: string;
  test_name: string;
  value: string;
  unit?: string;
  reference_range?: string;
  status: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' | 'ABNORMAL' | 'NOT_AVAILABLE';
  created_at: string;
}

export interface LabReport {
  id: string;
  patient_id: string;
  medical_record_id: string;
  lab_name?: string;
  laboratory_name?: string;
  test_name?: string;
  report_type?: string;
  test_date: string;
  report_date?: string;
  result?: string;
  unit?: string;
  reference_range?: string;
  notes?: string;
  report_file_path?: string;
  original_file_path?: string;
  created_by_user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Diagnosis {
  id: string;
  patient_id: string;
  medical_record_id: string;
  diagnosis_name: string;
  diagnosis_date: string;
  provider?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Treatment {
  id: string;
  patient_id: string;
  medical_record_id: string;
  treatment_name: string;
  treatment_date: string;
  provider?: string;
  care_plan?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecordDetail {
  record: MedicalRecord;
  consultation?: Consultation;
  prescription?: Prescription;
  labReport?: LabReport;
  labTestResults?: LabTestResult[];
  diagnosis?: Diagnosis;
  treatment?: Treatment;
  signedDocumentUrl?: string;
}

export interface CreateMedicalRecordInput {
  record_type: RecordType;
  title: string;
  record_date: string;
  provider_name?: string;
  hospital_name?: string;
  description?: string;
  // Subtype fields
  chief_complaint?: string;
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  follow_up_date?: string;
  medicine_name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  lab_name?: string;
  test_name?: string;
  result?: string;
  unit?: string;
  reference_range?: string;
}

const STORAGE_BUCKET = 'medical-records';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

/**
 * Validates document type and file size.
 * Prevents arbitrary executable or oversized files.
 */
export function validateMedicalDocument(file: File): { valid: boolean; error?: string } {
  if (!file) return { valid: false, error: 'No file provided.' };

  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const isAllowedExt = ['pdf', 'jpg', 'jpeg', 'png'].includes(extension);

  if (!ALLOWED_MIME_TYPES.includes(mimeType) && !isAllowedExt) {
    return {
      valid: false,
      error: 'Invalid file type. Only PDF, JPG, and PNG documents are supported.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File exceeds the 10 MB size limit. Please upload a smaller file.',
    };
  }

  return { valid: true };
}

/**
 * Uploads a document to the private Supabase Storage bucket.
 * Files are isolated in the patient's folder: {patient_id}/{timestamp}_{filename}
 */
export async function uploadMedicalDocument(
  patientId: string,
  file: File
): Promise<{ path: string; name: string; size: number; mimeType: string }> {
  const validation = validateMedicalDocument(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid document file.');
  }

  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${patientId}/${Date.now()}_${sanitizedFileName}`;

  if (!isSupabaseConfigured) {
    // Offline simulation: store metadata only
    return {
      path: filePath,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/pdf',
    };
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error || !data) {
    console.error('Storage upload error:', error);
    throw new Error('Unable to upload this document.');
  }

  return {
    path: data.path,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  };
}

/**
 * Generates an authorized, short-lived signed URL for a private document.
 * Documents are NEVER public.
 */
export async function getDocumentSignedUrl(
  filePath: string,
  expiresInSeconds: number = 300
): Promise<string | null> {
  if (!filePath) return null;

  if (!isSupabaseConfigured) {
    // Offline simulation placeholder
    return `blob:mock-signed-url-for-${encodeURIComponent(filePath)}`;
  }

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data) {
      console.warn('Could not generate signed URL:', error?.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.warn('Error fetching signed URL:', err);
    return null;
  }
}

// Local mock storage key helper
function getLocalRecordsKey(patientId: string): string {
  return `health_wallet_records_v2_${patientId}`;
}

function getLocalRecords(patientId: string): MedicalRecord[] {
  try {
    const raw = localStorage.getItem(getLocalRecordsKey(patientId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRecords(patientId: string, records: MedicalRecord[]): void {
  try {
    localStorage.setItem(getLocalRecordsKey(patientId), JSON.stringify(records));
  } catch (e) {
    console.warn('Local storage write error:', e);
  }
}

/**
 * Fetches all medical records for the authenticated patient.
 * Ordered by record_date DESC (newest first).
 */
export async function getPatientMedicalRecords(
  patientId: string
): Promise<{ data: MedicalRecord[]; error?: string }> {
  if (!patientId) return { data: [] };

  if (!isSupabaseConfigured) {
    const records = getLocalRecords(patientId);
    // Sort descending by record_date
    records.sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
    return { data: records };
  }

  try {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('record_date', { ascending: false });

    if (error) {
      console.error('Error fetching medical records from Supabase:', error);
      return { data: [], error: 'Unable to load your health records. Please try again.' };
    }

    return { data: (data as MedicalRecord[]) || [] };
  } catch (err: any) {
    console.error('Network error fetching health records:', err);
    return { data: [], error: 'Unable to load your health records. Please try again.' };
  }
}

/**
 * Fetches the complete details for a single medical record,
 * including joined consultation, prescription, or lab report details.
 */
export async function getMedicalRecordDetail(
  recordId: string,
  recordType: RecordType,
  documentPath?: string
): Promise<{ data: MedicalRecordDetail | null; error?: string }> {
  if (!recordId) return { data: null, error: 'Record ID required.' };

  try {
    let signedDocUrl: string | null = null;
    if (documentPath) {
      signedDocUrl = await getDocumentSignedUrl(documentPath);
    }

    if (!isSupabaseConfigured) {
      // In offline mode, check local storage
      let foundRecord: MedicalRecord | null = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('health_wallet_records_v2_')) {
          try {
            const list: MedicalRecord[] = JSON.parse(localStorage.getItem(key) || '[]');
            const matched = list.find((r) => r.id === recordId);
            if (matched) {
              foundRecord = matched;
              break;
            }
          } catch {}
        }
      }

      if (!foundRecord) {
        return { data: null, error: 'Record not found.' };
      }

      // Check for locally cached subtype details
      const subKey = `health_wallet_record_sub_${recordId}`;
      let subDetails: any = null;
      try {
        const subRaw = localStorage.getItem(subKey);
        if (subRaw) subDetails = JSON.parse(subRaw);
      } catch {}

      return {
        data: {
          record: foundRecord,
          consultation: subDetails?.consultation,
          prescription: subDetails?.prescription,
          labReport: subDetails?.labReport,
          labTestResults: subDetails?.labTestResults || [],
          diagnosis: subDetails?.diagnosis,
          treatment: subDetails?.treatment,
          signedDocumentUrl: signedDocUrl || undefined,
        },
      };
    }

    // 1. Fetch base record
    const { data: recordData, error: recordError } = await supabase
      .from('medical_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (recordError || !recordData) {
      return { data: null, error: 'Record not found.' };
    }

    const detail: MedicalRecordDetail = {
      record: recordData as MedicalRecord,
      signedDocumentUrl: signedDocUrl || undefined,
    };

    // 2. Fetch specific subtype details
    if (recordType === 'CONSULTATION') {
      const { data: consultData } = await supabase
        .from('consultations')
        .select('*')
        .eq('medical_record_id', recordId)
        .maybeSingle();

      if (consultData) detail.consultation = consultData as Consultation;
    } else if (recordType === 'PRESCRIPTION') {
      const { data: rxData } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('medical_record_id', recordId)
        .maybeSingle();

      if (rxData) detail.prescription = rxData as Prescription;
    } else if (recordType === 'LAB_REPORT') {
      const { data: labData } = await supabase
        .from('lab_reports')
        .select('*')
        .eq('medical_record_id', recordId)
        .maybeSingle();

      if (labData) {
        detail.labReport = labData as LabReport;
        const { data: testsData } = await supabase
          .from('lab_test_results')
          .select('*')
          .eq('lab_report_id', labData.id)
          .order('created_at', { ascending: true });
        if (testsData) {
          detail.labTestResults = testsData as LabTestResult[];
        }
      }
    } else if (recordType === 'DIAGNOSIS') {
      const { data: diagData } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('medical_record_id', recordId)
        .maybeSingle();

      if (diagData) detail.diagnosis = diagData as Diagnosis;
    } else if (recordType === 'TREATMENT') {
      const { data: treatData } = await supabase
        .from('treatments')
        .select('*')
        .eq('medical_record_id', recordId)
        .maybeSingle();

      if (treatData) detail.treatment = treatData as Treatment;
    }

    return { data: detail };
  } catch (err: any) {
    console.error('Error fetching record detail:', err);
    return { data: null, error: 'Unable to load record details.' };
  }
}

/**
 * Creates a new patient medical record with optional document upload
 * and associated subtype record (Consultation, Prescription, Lab Report).
 * Always marks record as PATIENT_UPLOADED to prevent doctor impersonation.
 */
export async function createMedicalRecord(
  patientId: string,
  input: CreateMedicalRecordInput,
  file?: File
): Promise<{ success: boolean; record?: MedicalRecord; error?: string }> {
  if (!patientId) {
    return { success: false, error: 'Patient authentication required.' };
  }
  if (!input.title?.trim()) {
    return { success: false, error: 'Please enter a record title.' };
  }
  if (!input.record_date) {
    return { success: false, error: 'Please select a valid record date.' };
  }

  let docMetadata: { path: string; name: string; size: number; mimeType: string } | null = null;
  if (file) {
    try {
      docMetadata = await uploadMedicalDocument(patientId, file);
    } catch (uploadErr: any) {
      return { success: false, error: uploadErr?.message || 'Unable to upload this document.' };
    }
  }

  const recordPayload = {
    patient_id: patientId,
    record_type: input.record_type,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    record_date: input.record_date,
    provider_name: input.provider_name?.trim() || null,
    provider_type: 'PATIENT_UPLOADED',
    hospital_name: input.hospital_name?.trim() || null,
    document_path: docMetadata?.path || null,
    document_name: docMetadata?.name || null,
    document_size: docMetadata?.size || null,
    document_mime_type: docMetadata?.mimeType || null,
    creator_type: 'PATIENT_UPLOADED' as CreatorType,
  };

  if (!isSupabaseConfigured) {
    // Local offline mock flow
    const newRecord: MedicalRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...recordPayload,
      description: recordPayload.description || undefined,
      provider_name: recordPayload.provider_name || undefined,
      provider_type: recordPayload.provider_type || undefined,
      hospital_name: recordPayload.hospital_name || undefined,
      document_path: recordPayload.document_path || undefined,
      document_name: recordPayload.document_name || undefined,
      document_size: recordPayload.document_size || undefined,
      document_mime_type: recordPayload.document_mime_type || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const records = getLocalRecords(patientId);
    records.unshift(newRecord);
    saveLocalRecords(patientId, records);

    // Save subtype details in local storage
    const subKey = `health_wallet_record_sub_${newRecord.id}`;
    const subPayload: any = {};

    if (input.record_type === 'CONSULTATION') {
      subPayload.consultation = {
        id: `cons-${Date.now()}`,
        patient_id: patientId,
        medical_record_id: newRecord.id,
        consultation_date: input.record_date,
        doctor_name: input.provider_name,
        hospital_clinic: input.hospital_name,
        chief_complaint: input.chief_complaint,
        symptoms: input.symptoms,
        diagnosis: input.diagnosis,
        treatment: input.treatment,
        notes: input.notes,
        follow_up_date: input.follow_up_date,
        creator_type: 'PATIENT_UPLOADED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } else if (input.record_type === 'PRESCRIPTION') {
      subPayload.prescription = {
        id: `rx-${Date.now()}`,
        patient_id: patientId,
        medical_record_id: newRecord.id,
        medicine_name: input.medicine_name || input.title,
        dosage: input.dosage,
        frequency: input.frequency,
        duration: input.duration,
        instructions: input.instructions,
        prescribed_date: input.record_date,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } else if (input.record_type === 'LAB_REPORT') {
      subPayload.labReport = {
        id: `lab-${Date.now()}`,
        patient_id: patientId,
        medical_record_id: newRecord.id,
        lab_name: input.hospital_name || input.provider_name,
        test_name: input.test_name || input.title,
        test_date: input.record_date,
        result: input.result,
        unit: input.unit,
        reference_range: input.reference_range,
        notes: input.notes,
        report_file_path: docMetadata?.path,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    localStorage.setItem(subKey, JSON.stringify(subPayload));

    return { success: true, record: newRecord };
  }

  try {
    // 1. Insert master medical record
    const { data: record, error: insertError } = await supabase
      .from('medical_records')
      .insert(recordPayload)
      .select('*')
      .single();

    if (insertError || !record) {
      console.error('Record insert error:', insertError);
      return { success: false, error: insertError?.message || 'Failed to create medical record.' };
    }

    const newRecord = record as MedicalRecord;

    // 2. Insert corresponding subtype record
    if (input.record_type === 'CONSULTATION') {
      await supabase.from('consultations').insert({
        patient_id: patientId,
        medical_record_id: newRecord.id,
        consultation_date: input.record_date,
        doctor_name: input.provider_name?.trim() || null,
        hospital_clinic: input.hospital_name?.trim() || null,
        chief_complaint: input.chief_complaint?.trim() || null,
        symptoms: input.symptoms?.trim() || null,
        diagnosis: input.diagnosis?.trim() || null,
        treatment: input.treatment?.trim() || null,
        notes: input.notes?.trim() || null,
        follow_up_date: input.follow_up_date || null,
        creator_type: 'PATIENT_UPLOADED',
      });
    } else if (input.record_type === 'PRESCRIPTION') {
      await supabase.from('prescriptions').insert({
        patient_id: patientId,
        medical_record_id: newRecord.id,
        medicine_name: (input.medicine_name || input.title).trim(),
        dosage: input.dosage?.trim() || null,
        frequency: input.frequency?.trim() || null,
        duration: input.duration?.trim() || null,
        instructions: input.instructions?.trim() || null,
        prescribed_date: input.record_date,
        status: 'ACTIVE',
      });
    } else if (input.record_type === 'LAB_REPORT') {
      await supabase.from('lab_reports').insert({
        patient_id: patientId,
        medical_record_id: newRecord.id,
        lab_name: (input.hospital_name || input.provider_name)?.trim() || null,
        test_name: (input.test_name || input.title).trim(),
        test_date: input.record_date,
        result: input.result?.trim() || null,
        unit: input.unit?.trim() || null,
        reference_range: input.reference_range?.trim() || null,
        notes: input.notes?.trim() || null,
        report_file_path: docMetadata?.path || null,
      });
    }

    return { success: true, record: newRecord };
  } catch (err: any) {
    console.error('Error creating record:', err);
    return { success: false, error: err?.message || 'Failed to save medical record.' };
  }
}

/**
 * Deletes a medical record and any associated storage file.
 */
export async function deleteMedicalRecord(
  recordId: string,
  patientId: string,
  documentPath?: string
): Promise<{ success: boolean; error?: string }> {
  if (!recordId) return { success: false, error: 'Record ID required.' };

  if (!isSupabaseConfigured) {
    const records = getLocalRecords(patientId);
    const filtered = records.filter((r) => r.id !== recordId);
    saveLocalRecords(patientId, filtered);
    localStorage.removeItem(`health_wallet_record_sub_${recordId}`);
    return { success: true };
  }

  try {
    // Delete file from storage if present
    if (documentPath) {
      await supabase.storage.from(STORAGE_BUCKET).remove([documentPath]);
    }

    const { error } = await supabase
      .from('medical_records')
      .delete()
      .eq('id', recordId)
      .eq('patient_id', patientId);

    if (error) {
      return { success: false, error: 'Unable to delete medical record.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: 'Network error deleting medical record.' };
  }
}
