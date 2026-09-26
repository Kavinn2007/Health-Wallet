import { supabase, isSupabaseConfigured, type MinimalPatientInfo, type LabProfile } from './supabase';
import { validateMedicalDocument } from './healthRecords';
import { recordMockAuditLog } from './audit';

export interface LabTestResultItem {
  id?: string;
  lab_report_id?: string;
  test_name: string;
  value: string;
  unit?: string;
  reference_range?: string;
  status: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' | 'ABNORMAL' | 'NOT_AVAILABLE';
  created_at?: string;
}

export interface CreateLabReportInput {
  patient_id: string;
  report_type: string;
  report_date: string;
  laboratory_name: string;
  file?: File | null;
  test_results: LabTestResultItem[];
}

export interface LabReportDetailView {
  id: string;
  medical_record_id: string;
  patient_id: string;
  laboratory_name: string;
  report_type: string;
  report_date: string;
  original_file_path?: string;
  created_by_user_id: string;
  created_at: string;
  patient?: MinimalPatientInfo;
  test_results: LabTestResultItem[];
  signed_file_url?: string;
}

export const DEMO_LAB_PROFILE: LabProfile = {
  id: 'demo-lab-uuid-1',
  user_id: 'demo-lab-user-1',
  lab_name: 'Suresh Mehta',
  registration_number: 'LAB-TN-2021-9988',
  laboratory_name: 'City Diagnostics & Research Centre',
  mobile_number: '9876543210',
  username: 'city_lab',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const LOCAL_STORAGE_LAB_REPORTS_KEY = 'health_wallet_v2_lab_reports';
export const LOCAL_STORAGE_LAB_SESSION_KEY = 'health_wallet_v2_lab_mock_session';

/**
 * Search patient by Health Wallet ID for Lab Staff
 * Strictly exposes ONLY: Name, Health Wallet ID, Blood Group, State
 * Strictly blocks Aadhaar, full mobile number, and medical records
 */
export async function searchPatientForLab(
  hwId: string
): Promise<{ success: boolean; patient?: MinimalPatientInfo; error?: string }> {
  const cleanId = hwId.trim().toUpperCase();

  if (!cleanId) {
    return { success: false, error: 'Please enter a valid Health Wallet ID.' };
  }

  const hwRegex = /^HW-[A-Z]{2}-\d{8}$/;
  if (!hwRegex.test(cleanId)) {
    return {
      success: false,
      error: 'Invalid Health Wallet ID format. Expected format: HW-TN-48291736',
    };
  }

  if (!isSupabaseConfigured) {
    // Demo patient
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

    return {
      success: false,
      error: 'No patient found with this Health Wallet ID. Please verify the ID.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('patient_profiles')
      .select('id, patient_name, health_wallet_id, blood_group, state')
      .eq('health_wallet_id', cleanId)
      .maybeSingle();

    if (error || !data) {
      return {
        success: false,
        error: 'No registered patient found matching this Health Wallet ID.',
      };
    }

    return {
      success: true,
      patient: data as MinimalPatientInfo,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to search for patient.',
    };
  }
}

/**
 * Upload original laboratory report to private Supabase Storage
 */
export async function uploadLabReportDocument(
  patientId: string,
  file: File
): Promise<{ path: string; name: string; size: number; mimeType: string }> {
  const validation = validateMedicalDocument(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid report document.');
  }

  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `lab-reports/${patientId}/${Date.now()}_${sanitizedFileName}`;

  if (!isSupabaseConfigured) {
    return {
      path: filePath,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
    };
  }

  const { data, error } = await supabase.storage
    .from('medical-records')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error || !data) {
    throw new Error(error?.message || 'Failed to upload laboratory report document.');
  }

  return {
    path: data.path,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  };
}

/**
 * Generate a short-lived signed URL for a lab document
 */
export async function getLabDocumentSignedUrl(
  path: string,
  expiresInSeconds: number = 300
): Promise<string | null> {
  if (!path) return null;
  if (!isSupabaseConfigured) {
    return `https://demo.healthwallet.local/storage/preview/${encodeURIComponent(path)}?token=demo_sig_${Date.now()}`;
  }

  try {
    const { data, error } = await supabase.storage
      .from('medical-records')
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('Failed to create signed document URL:', error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.warn('Network error generating signed URL:', err);
    return null;
  }
}

/**
 * Create a new Lab Report with structured test results
 */
export async function createLabReport(
  input: CreateLabReportInput
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  const { patient_id, report_type, report_date, laboratory_name, file, test_results } = input;

  if (!patient_id) return { success: false, error: 'Patient selection is required.' };
  if (!report_type || !report_type.trim()) return { success: false, error: 'Report type is required.' };
  if (!report_date) return { success: false, error: 'Report date is required.' };
  if (!laboratory_name || !laboratory_name.trim()) return { success: false, error: 'Laboratory name is required.' };

  if (!test_results || test_results.length === 0) {
    return { success: false, error: 'Please enter at least one laboratory test result.' };
  }

  for (const t of test_results) {
    if (!t.test_name || !t.test_name.trim()) {
      return { success: false, error: 'Test name cannot be empty in test results.' };
    }
    if (!t.value || !t.value.trim()) {
      return { success: false, error: `Please enter a value for test "${t.test_name}".` };
    }
  }

  try {
    let docPath: string | undefined = undefined;
    let docName: string | undefined = undefined;
    let docSize: number | undefined = undefined;
    let docMime: string | undefined = undefined;

    if (file) {
      const uploaded = await uploadLabReportDocument(patient_id, file);
      docPath = uploaded.path;
      docName = uploaded.name;
      docSize = uploaded.size;
      docMime = uploaded.mimeType;
    }

    if (!isSupabaseConfigured) {
      // Offline fallback: store in local storage
      const reportId = `mock-lab-rep-${Date.now()}`;
      const medRecId = `mock-med-rec-lab-${Date.now()}`;

      const activeLab = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_LAB_SESSION_KEY) || JSON.stringify({ profile: DEMO_LAB_PROFILE })
      ).profile;

      const newReport: LabReportDetailView = {
        id: reportId,
        medical_record_id: medRecId,
        patient_id,
        laboratory_name: laboratory_name.trim(),
        report_type: report_type.trim(),
        report_date,
        original_file_path: docPath,
        created_by_user_id: activeLab.user_id,
        created_at: new Date().toISOString(),
        test_results: test_results.map((tr, idx) => ({
          ...tr,
          id: `tr-${Date.now()}-${idx}`,
          lab_report_id: reportId,
          created_at: new Date().toISOString(),
        })),
      };

      // 1. Add to lab reports store
      const storedReports: LabReportDetailView[] = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_LAB_REPORTS_KEY) || '[]'
      );
      storedReports.unshift(newReport);
      localStorage.setItem(LOCAL_STORAGE_LAB_REPORTS_KEY, JSON.stringify(storedReports));

      // 2. Add to patient health records timeline
      const patientRecordsKey = `health_wallet_records_v2_${patient_id}`;
      const existingPatientRecords = JSON.parse(localStorage.getItem(patientRecordsKey) || '[]');
      const patientMedRecord = {
        id: medRecId,
        patient_id,
        record_type: 'LAB_REPORT',
        title: report_type.trim(),
        description: `${laboratory_name.trim()} — ${report_type.trim()}`,
        record_date: report_date,
        provider_name: activeLab.lab_name,
        provider_type: 'LAB',
        hospital_name: laboratory_name.trim(),
        document_path: docPath,
        document_name: docName,
        document_size: docSize,
        document_mime_type: docMime,
        creator_type: 'PROVIDER_CREATED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      existingPatientRecords.unshift(patientMedRecord);
      localStorage.setItem(patientRecordsKey, JSON.stringify(existingPatientRecords));

      // 3. Cache child details for getMedicalRecordDetail
      const subKey = `health_wallet_record_sub_${medRecId}`;
      localStorage.setItem(
        subKey,
        JSON.stringify({
          labReport: {
            id: reportId,
            patient_id,
            medical_record_id: medRecId,
            lab_name: laboratory_name.trim(),
            laboratory_name: laboratory_name.trim(),
            test_name: report_type.trim(),
            report_type: report_type.trim(),
            test_date: report_date,
            report_date,
            report_file_path: docPath,
            original_file_path: docPath,
            created_by_user_id: activeLab.user_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          labTestResults: newReport.test_results,
        })
      );

      // 4. Audit Log
      recordMockAuditLog({
        user_id: activeLab.user_id,
        role: 'LAB',
        patient_id: patient_id,
        action: 'CREATE_LAB_REPORT',
        record_type: 'LAB_REPORT',
        record_id: reportId,
        status: 'SUCCESS',
        metadata: {
          laboratory_name: laboratory_name.trim(),
          report_type: report_type.trim(),
          medical_record_id: medRecId,
        },
      });

      // 5. Patient Notification
      const existingNotifs = JSON.parse(
        localStorage.getItem('health_wallet_v2_notifications') || '[]'
      );
      existingNotifs.unshift({
        id: `notif-${Date.now()}`,
        user_id: 'demo-user-1',
        type: 'LAB_REPORT_CREATED',
        title: 'New Lab Report Added',
        message: 'A laboratory has added a new report to your Health Wallet.',
        patient_id,
        related_record_id: reportId,
        is_read: false,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('health_wallet_v2_notifications', JSON.stringify(existingNotifs));

      return { success: true, reportId };
    }

    // Call Supabase RPC
    const { data: reportId, error: rpcError } = await supabase.rpc('lab_create_lab_report', {
      p_patient_id: patient_id,
      p_report_type: report_type.trim(),
      p_report_date: report_date,
      p_laboratory_name: laboratory_name.trim(),
      p_document_path: docPath || null,
      p_document_name: docName || null,
      p_document_size: docSize || null,
      p_document_mime_type: docMime || null,
      p_test_results: test_results,
    });

    if (rpcError || !reportId) {
      return {
        success: false,
        error: rpcError?.message || 'Failed to create lab report in database.',
      };
    }

    return { success: true, reportId: reportId as string };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unexpected error while creating laboratory report.',
    };
  }
}

/**
 * Fetch reports created by the current authenticated lab staff
 */
export async function getLabRecentReports(): Promise<LabReportDetailView[]> {
  if (!isSupabaseConfigured) {
    const list: LabReportDetailView[] = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_LAB_REPORTS_KEY) || '[]'
    );
    return list;
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) return [];

    const { data, error } = await supabase
      .from('lab_reports')
      .select(`
        id,
        medical_record_id,
        patient_id,
        laboratory_name,
        report_type,
        report_date,
        original_file_path,
        created_by_user_id,
        created_at,
        patient:patient_profiles (
          id,
          patient_name,
          health_wallet_id,
          blood_group,
          state
        )
      `)
      .eq('created_by_user_id', userAuth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching lab recent reports:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      medical_record_id: row.medical_record_id,
      patient_id: row.patient_id,
      laboratory_name: row.laboratory_name,
      report_type: row.report_type,
      report_date: row.report_date,
      original_file_path: row.original_file_path,
      created_by_user_id: row.created_by_user_id,
      created_at: row.created_at,
      patient: row.patient as MinimalPatientInfo,
      test_results: [],
    }));
  } catch (err) {
    console.warn('Error fetching lab reports:', err);
    return [];
  }
}

/**
 * Fetch a single lab report with structured test results and patient verification
 */
export async function getLabReportDetail(
  reportId: string
): Promise<{ success: boolean; data?: LabReportDetailView; error?: string }> {
  if (!reportId) return { success: false, error: 'Report ID required' };

  if (!isSupabaseConfigured) {
    const list: LabReportDetailView[] = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_LAB_REPORTS_KEY) || '[]'
    );
    const found = list.find((r) => r.id === reportId);
    if (!found) return { success: false, error: 'Report not found' };

    let signedUrl: string | undefined = undefined;
    if (found.original_file_path) {
      signedUrl = (await getLabDocumentSignedUrl(found.original_file_path)) || undefined;
    }

    return {
      success: true,
      data: {
        ...found,
        signed_file_url: signedUrl,
      },
    };
  }

  try {
    const { data: repData, error: repError } = await supabase
      .from('lab_reports')
      .select(`
        id,
        medical_record_id,
        patient_id,
        laboratory_name,
        report_type,
        report_date,
        original_file_path,
        created_by_user_id,
        created_at,
        patient:patient_profiles (
          id,
          patient_name,
          health_wallet_id,
          blood_group,
          state
        )
      `)
      .eq('id', reportId)
      .single();

    if (repError || !repData) {
      return { success: false, error: 'Report not found or access denied.' };
    }

    const { data: testRows, error: testError } = await supabase
      .from('lab_test_results')
      .select('*')
      .eq('lab_report_id', reportId)
      .order('created_at', { ascending: true });

    if (testError) {
      console.warn('Error fetching lab test results:', testError.message);
    }

    let signedUrl: string | undefined = undefined;
    if (repData.original_file_path) {
      signedUrl = (await getLabDocumentSignedUrl(repData.original_file_path)) || undefined;
    }

    const detail: LabReportDetailView = {
      id: repData.id,
      medical_record_id: repData.medical_record_id,
      patient_id: repData.patient_id,
      laboratory_name: repData.laboratory_name,
      report_type: repData.report_type,
      report_date: repData.report_date,
      original_file_path: repData.original_file_path,
      created_by_user_id: repData.created_by_user_id,
      created_at: repData.created_at,
      patient: (Array.isArray(repData.patient) ? repData.patient[0] : repData.patient) as MinimalPatientInfo,
      test_results: (testRows as LabTestResultItem[]) || [],
      signed_file_url: signedUrl,
    };

    return { success: true, data: detail };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error fetching report detail.' };
  }
}
