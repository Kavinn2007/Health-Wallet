import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Stethoscope,
  Activity,
  Pill,
  FileText,
  ShieldCheck,
  Clock,
  Lock,
  ArrowLeft,
  Calendar,
  Building2,
  FolderHeart,
  Plus,
  Eye,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { getDoctorAuthorizedRecords, getDoctorConsentStatus } from '../../services/consent';
import { logMedicalRecordView } from '../../services/notifications';
import {
  doctorCreateConsultation,
  doctorCreateDiagnosis,
  doctorCreateTreatment,
  doctorCreatePrescription,
  getPatientSummaryForDoctor,
  type CreateConsultationInput,
  type CreateDiagnosisInput,
  type CreateTreatmentInput,
  type CreatePrescriptionInput,
} from '../../services/clinical';
import {
  getMedicalRecordDetail,
  type MedicalRecord,
  type MedicalRecordDetail,
} from '../../services/healthRecords';
import {
  type RecordCategory,
  type ConsentStatus,
  type MinimalPatientInfo,
} from '../../services/supabase';
import { searchPatientByHealthWalletId } from '../../services/doctors';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SecondaryButton } from '../../components/ui/SecondaryButton';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ToastItem, type ToastMessage } from '../../components/ui/Toast';

export const DoctorClinicalWorkspace: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();

  // Consent & Authorization State
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [allowedCategories, setAllowedCategories] = useState<RecordCategory[]>([]);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | 'NONE'>('NONE');
  const [expiresAt, setExpiresAt] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [patientInfo, setPatientInfo] = useState<MinimalPatientInfo | null>(null);

  // Active Category Filter for Timeline
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal Visibility States
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);

  // Record Detail Modal
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);
  const [recordDetail, setRecordDetail] = useState<MedicalRecordDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Form States
  // Consultation
  const [consDate, setConsDate] = useState(new Date().toISOString().split('T')[0]);
  const [consChiefComplaint, setConsChiefComplaint] = useState('');
  const [consSymptoms, setConsSymptoms] = useState('');
  const [consDiagnosis, setConsDiagnosis] = useState('');
  const [consTreatment, setConsTreatment] = useState('');
  const [consNotes, setConsNotes] = useState('');
  const [consFollowUp, setConsFollowUp] = useState('');

  // Diagnosis
  const [diagDate, setDiagDate] = useState(new Date().toISOString().split('T')[0]);
  const [diagCondition, setDiagCondition] = useState('');
  const [diagNotes, setDiagNotes] = useState('');

  // Treatment
  const [treatDate, setTreatDate] = useState(new Date().toISOString().split('T')[0]);
  const [treatIntervention, setTreatIntervention] = useState('');
  const [treatCarePlan, setTreatCarePlan] = useState('');
  const [treatNotes, setTreatNotes] = useState('');

  // Prescription
  const [rxMedicine, setRxMedicine] = useState('');
  const [rxDosage, setRxDosage] = useState('');
  const [rxFrequency, setRxFrequency] = useState('');
  const [rxDuration, setRxDuration] = useState('');
  const [rxInstructions, setRxInstructions] = useState('');
  const [rxStartDate, setRxStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [rxEndDate, setRxEndDate] = useState('');

  // Submission State & Toasts
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message?: string) => {
    setToasts((prev) => [
      ...prev,
      { id: `toast-${Date.now()}-${Math.random()}`, type, title, message },
    ]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check Category Permission Helper
  const isCategoryAuthorized = (cat: RecordCategory): boolean => {
    return (
      allowedCategories.includes(cat) ||
      allowedCategories.includes('ALL_RECORDS')
    );
  };

  const fetchWorkspaceData = async () => {
    if (!patientId) return;
    setIsLoading(true);
    setErrorMessage('');

    // Fetch authorized records and consent status
    const res = await getDoctorAuthorizedRecords(patientId);

    // Fetch patient identity details
    const info = await getPatientSummaryForDoctor(patientId);
    setPatientInfo(info);

    setIsLoading(false);
    if (res.success) {
      setRecords(res.records);
      setAllowedCategories(res.allowedCategories);
      setConsentStatus(res.status);
      setExpiresAt(res.expiresAt);
    } else {
      setRecords([]);
      setAllowedCategories([]);
      setConsentStatus(res.status);
      setExpiresAt(res.expiresAt);
      setErrorMessage(res.error || 'Access required');
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [patientId]);

  // Handle Record Detail View with LIVE Recheck
  const handleOpenRecordDetail = async (record: MedicalRecord) => {
    if (!patientId) return;
    setViewingRecord(record);
    setRecordDetail(null);
    setDetailError('');
    setIsLoadingDetail(true);

    // Re-verify authorization strictly before opening detail
    const recheck = await getDoctorConsentStatus(patientId);
    if (!recheck.hasConsent || recheck.status !== 'APPROVED' || recheck.isExpired) {
      setIsLoadingDetail(false);
      setDetailError('Access no longer available.');
      addToast('error', 'Access Denied', 'Access no longer available.');
      return;
    }

    // Check category authorization
    const typeStr = record.record_type;
    const isCategoryPermitted =
      recheck.approvedRecordTypes.includes('ALL_RECORDS') ||
      (typeStr === 'CONSULTATION' && recheck.approvedRecordTypes.includes('CONSULTATIONS')) ||
      (typeStr === 'DIAGNOSIS' && recheck.approvedRecordTypes.includes('DIAGNOSES')) ||
      (typeStr === 'TREATMENT' && recheck.approvedRecordTypes.includes('TREATMENTS')) ||
      (typeStr === 'PRESCRIPTION' && recheck.approvedRecordTypes.includes('PRESCRIPTIONS')) ||
      (typeStr === 'LAB_REPORT' && recheck.approvedRecordTypes.includes('LAB_REPORTS')) ||
      (typeStr === 'IMAGING' && recheck.approvedRecordTypes.includes('IMAGING'));

    if (!isCategoryPermitted) {
      setIsLoadingDetail(false);
      setDetailError('Access no longer available.');
      addToast('error', 'Access Denied', 'Access no longer available.');
      return;
    }

    const detailRes = await getMedicalRecordDetail(record.id, record.record_type, record.document_path);
    setIsLoadingDetail(false);
    if (detailRes.data) {
      setRecordDetail(detailRes.data);
    } else {
      setRecordDetail({ record });
    }

    // Phase 8: Log authorized medical record view
    await logMedicalRecordView(record.id, record.title);
  };

  // Reset form states
  const resetConsultationForm = () => {
    setConsDate(new Date().toISOString().split('T')[0]);
    setConsChiefComplaint('');
    setConsSymptoms('');
    setConsDiagnosis('');
    setConsTreatment('');
    setConsNotes('');
    setConsFollowUp('');
  };

  const resetDiagnosisForm = () => {
    setDiagDate(new Date().toISOString().split('T')[0]);
    setDiagCondition('');
    setDiagNotes('');
  };

  const resetTreatmentForm = () => {
    setTreatDate(new Date().toISOString().split('T')[0]);
    setTreatIntervention('');
    setTreatCarePlan('');
    setTreatNotes('');
  };

  const resetPrescriptionForm = () => {
    setRxMedicine('');
    setRxDosage('');
    setRxFrequency('');
    setRxDuration('');
    setRxInstructions('');
    setRxStartDate(new Date().toISOString().split('T')[0]);
    setRxEndDate('');
  };

  // Submit Consultation
  const handleCreateConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    if (!consChiefComplaint.trim()) {
      addToast('error', 'Validation Error', 'Please enter the chief complaint.');
      return;
    }

    setIsSubmitting(true);
    const res = await doctorCreateConsultation({
      patientId,
      consultationDate: consDate,
      chiefComplaint: consChiefComplaint,
      symptoms: consSymptoms,
      diagnosis: consDiagnosis,
      treatment: consTreatment,
      notes: consNotes,
      followUpDate: consFollowUp || undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      addToast('success', 'Consultation Saved', 'Consultation record added to patient timeline.');
      setIsConsultationModalOpen(false);
      resetConsultationForm();
      fetchWorkspaceData();
    } else {
      addToast('error', 'Action Blocked', res.error || 'Unable to save consultation.');
    }
  };

  // Submit Diagnosis
  const handleCreateDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    if (!diagCondition.trim()) {
      addToast('error', 'Validation Error', 'Please specify the diagnosed condition.');
      return;
    }

    setIsSubmitting(true);
    const res = await doctorCreateDiagnosis({
      patientId,
      diagnosisDate: diagDate,
      condition: diagCondition,
      notes: diagNotes,
    });
    setIsSubmitting(false);

    if (res.success) {
      addToast('success', 'Diagnosis Recorded', 'Formal diagnosis added to patient medical record.');
      setIsDiagnosisModalOpen(false);
      resetDiagnosisForm();
      fetchWorkspaceData();
    } else {
      addToast('error', 'Action Blocked', res.error || 'Unable to save diagnosis.');
    }
  };

  // Submit Treatment
  const handleCreateTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    if (!treatIntervention.trim()) {
      addToast('error', 'Validation Error', 'Please describe the treatment or clinical intervention.');
      return;
    }

    setIsSubmitting(true);
    const res = await doctorCreateTreatment({
      patientId,
      treatmentDate: treatDate,
      treatment: treatIntervention,
      carePlan: treatCarePlan,
      notes: treatNotes,
    });
    setIsSubmitting(false);

    if (res.success) {
      addToast('success', 'Treatment Saved', 'Treatment intervention added to patient timeline.');
      setIsTreatmentModalOpen(false);
      resetTreatmentForm();
      fetchWorkspaceData();
    } else {
      addToast('error', 'Action Blocked', res.error || 'Unable to save treatment.');
    }
  };

  // Submit Prescription
  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    if (!rxMedicine.trim()) {
      addToast('error', 'Validation Error', 'Medicine name is required.');
      return;
    }
    if (!rxDosage.trim()) {
      addToast('error', 'Validation Error', 'Dosage is required (e.g. 500mg).');
      return;
    }
    if (!rxFrequency.trim()) {
      addToast('error', 'Validation Error', 'Frequency is required (e.g. Twice daily).');
      return;
    }
    if (!rxDuration.trim()) {
      addToast('error', 'Validation Error', 'Duration is required (e.g. 5 days).');
      return;
    }
    if (rxStartDate && rxEndDate && new Date(rxEndDate) < new Date(rxStartDate)) {
      addToast('error', 'Invalid Dates', 'End date cannot be before start date.');
      return;
    }

    setIsSubmitting(true);
    const res = await doctorCreatePrescription({
      patientId,
      medicineName: rxMedicine,
      dosage: rxDosage,
      frequency: rxFrequency,
      duration: rxDuration,
      instructions: rxInstructions,
      startDate: rxStartDate,
      endDate: rxEndDate || undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      addToast('success', 'Prescription Prescribed', 'Active prescription issued to patient wallet.');
      setIsPrescriptionModalOpen(false);
      resetPrescriptionForm();
      fetchWorkspaceData();
    } else {
      addToast('error', 'Action Blocked', res.error || 'Unable to save prescription.');
    }
  };

  // Filter Timeline Records
  const filteredRecords = records.filter((r) => {
    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'CONSULTATIONS') return r.record_type === 'CONSULTATION';
    if (selectedCategory === 'DIAGNOSES') return r.record_type === 'DIAGNOSIS';
    if (selectedCategory === 'TREATMENTS') return r.record_type === 'TREATMENT';
    if (selectedCategory === 'PRESCRIPTIONS') return r.record_type === 'PRESCRIPTION';
    if (selectedCategory === 'LAB_REPORTS') return r.record_type === 'LAB_REPORT';
    if (selectedCategory === 'IMAGING') return r.record_type === 'IMAGING';
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={removeToast} />
          </div>
        ))}
      </div>

      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/doctor/patients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Patient Search</span>
        </Link>
        <Link
          to={`/doctor/patients/${patientId}/records`}
          className="text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors"
        >
          View Records Summary →
        </Link>
      </div>

      {/* ERROR / ACCESS RESTRICTED SCREEN */}
      {errorMessage && !isLoading && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-slate-900">
              {consentStatus === 'EXPIRED'
                ? 'Consent Expired'
                : consentStatus === 'REVOKED'
                ? 'Access Revoked by Patient'
                : consentStatus === 'DENIED'
                ? 'Access Request Denied'
                : 'Patient Consent Required'}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">{errorMessage}</p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Link to="/doctor/patients">
              <SecondaryButton>Return to Search</SecondaryButton>
            </Link>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading && (
        <div className="p-12">
          <LoadingState message="Verifying consent and loading clinical workspace..." />
        </div>
      )}

      {/* AUTHORIZED CLINICAL WORKSPACE */}
      {!errorMessage && !isLoading && (
        <div className="space-y-6">
          {/* Header Card: Patient Identity & Active Consent */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-100 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">
                    {patientInfo?.patient_name || 'Patient Clinical Workspace'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Consent APPROVED
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authorized Doctor Clinical Workspace under active patient consent.
                </p>
              </div>

              {expiresAt && (
                <div className="text-right text-xs bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                  <span className="text-emerald-700 block text-[10px] font-bold uppercase tracking-wider">
                    Consent Expiry:
                  </span>
                  <span className="font-semibold text-emerald-900 flex items-center gap-1 justify-end">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    {new Date(expiresAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Patient Identity Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                  Patient Name:
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {patientInfo?.patient_name || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                  Health Wallet ID:
                </span>
                <span className="font-mono font-bold text-sky-700 text-xs">
                  {patientInfo?.health_wallet_id || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                  Blood Group:
                </span>
                <span className="font-bold text-rose-600">
                  {patientInfo?.blood_group || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                  State:
                </span>
                <span className="font-medium text-slate-700">
                  {patientInfo?.state || '—'}
                </span>
              </div>
            </div>

            {/* Consent Status & Authorized Categories Badges */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Consent Status:
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                  APPROVED
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Authorized Categories:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {allowedCategories.map((cat) => (
                    <span
                      key={cat}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-800 border border-sky-100"
                    >
                      ✓ {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Action Bar: Consent-Gated Actions */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Clinical Operations &amp; Interventions
            </h2>
            <p className="text-xs text-slate-500">
              Actions are dynamically unlocked based on patient-authorized consent categories.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              {/* Consultation Action */}
              <div className="flex flex-col gap-1">
                {isCategoryAuthorized('CONSULTATIONS') ? (
                  <button
                    type="button"
                    onClick={() => setIsConsultationModalOpen(true)}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Add Consultation</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed opacity-60"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Add Consultation</span>
                  </button>
                )}
                {!isCategoryAuthorized('CONSULTATIONS') && (
                  <span className="text-[10px] text-slate-400 text-center leading-tight">
                    Your current consent does not authorize this action.
                  </span>
                )}
              </div>

              {/* Diagnosis Action */}
              <div className="flex flex-col gap-1">
                {isCategoryAuthorized('DIAGNOSES') ? (
                  <button
                    type="button"
                    onClick={() => setIsDiagnosisModalOpen(true)}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Add Diagnosis</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed opacity-60"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Add Diagnosis</span>
                  </button>
                )}
                {!isCategoryAuthorized('DIAGNOSES') && (
                  <span className="text-[10px] text-slate-400 text-center leading-tight">
                    Your current consent does not authorize this action.
                  </span>
                )}
              </div>

              {/* Treatment Action */}
              <div className="flex flex-col gap-1">
                {isCategoryAuthorized('TREATMENTS') ? (
                  <button
                    type="button"
                    onClick={() => setIsTreatmentModalOpen(true)}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    <FolderHeart className="w-4 h-4" />
                    <span>Add Treatment</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed opacity-60"
                  >
                    <FolderHeart className="w-4 h-4" />
                    <span>Add Treatment</span>
                  </button>
                )}
                {!isCategoryAuthorized('TREATMENTS') && (
                  <span className="text-[10px] text-slate-400 text-center leading-tight">
                    Your current consent does not authorize this action.
                  </span>
                )}
              </div>

              {/* Prescription Action */}
              <div className="flex flex-col gap-1">
                {isCategoryAuthorized('PRESCRIPTIONS') ? (
                  <button
                    type="button"
                    onClick={() => setIsPrescriptionModalOpen(true)}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    <Pill className="w-4 h-4" />
                    <span>Add Prescription</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed opacity-60"
                  >
                    <Pill className="w-4 h-4" />
                    <span>Add Prescription</span>
                  </button>
                )}
                {!isCategoryAuthorized('PRESCRIPTIONS') && (
                  <span className="text-[10px] text-slate-400 text-center leading-tight">
                    Your current consent does not authorize this action.
                  </span>
                )}
              </div>

              {/* Lab Record (Phase 8 placeholder) */}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed opacity-60"
                >
                  <FileText className="w-4 h-4" />
                  <span>Add Lab Record</span>
                </button>
                <span className="text-[10px] text-slate-400 text-center leading-tight">
                  Not implemented in Phase 7
                </span>
              </div>
            </div>
          </div>

          {/* Patient Medical Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Patient Medical Timeline ({filteredRecords.length})
              </h2>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                {['CONSULTATIONS', 'DIAGNOSES', 'TREATMENTS', 'PRESCRIPTIONS', 'LAB_REPORTS'].map(
                  (cat) =>
                    (isCategoryAuthorized(cat as RecordCategory) || allowedCategories.includes('ALL_RECORDS')) && (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-white text-slate-900 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                )}
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <EmptyState
                title="No Records Found"
                description="No medical records found in this category for this patient."
                icon={<FileText className="w-8 h-8 text-slate-400" />}
              />
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-sky-300 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-sky-50 text-sky-600 font-bold text-xs">
                          {rec.record_type}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">{rec.title}</h3>
                        {rec.creator_type === 'PROVIDER_CREATED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                            Clinical Record
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(rec.record_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {rec.description && (
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl">
                        {rec.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center gap-3 text-slate-500">
                        {rec.provider_name && <span>Provider: {rec.provider_name}</span>}
                        {rec.hospital_name && <span>• {rec.hospital_name}</span>}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenRecordDetail(rec)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. CONSULTATION MODAL */}
      {/* ==================================================================== */}
      {isConsultationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <Stethoscope className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Patient Consultation</h3>
                  <p className="text-xs text-slate-500">Doctor clinical notes &amp; examination summary</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConsultationModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateConsultation} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Consultation Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={consDate}
                    onChange={(e) => setConsDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Follow-up Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={consFollowUp}
                    onChange={(e) => setConsFollowUp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Chief Complaint <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute upper respiratory infection, fever and cough for 3 days"
                  value={consChiefComplaint}
                  onChange={(e) => setConsChiefComplaint(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Symptoms (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Dry cough, nasal congestion, low-grade pyrexia"
                  value={consSymptoms}
                  onChange={(e) => setConsSymptoms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Clinical Impression / Diagnosis (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Viral Pharyngitis"
                    value={consDiagnosis}
                    onChange={(e) => setConsDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Prescribed Treatment / Plan (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hydration, antipyretics, vocal rest"
                    value={consTreatment}
                    onChange={(e) => setConsTreatment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Doctor Clinical Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional clinical examination details, auscultation findings, vitals..."
                  value={consNotes}
                  onChange={(e) => setConsNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => setIsConsultationModalOpen(false)}
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Consultation'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. DIAGNOSIS MODAL */}
      {/* ==================================================================== */}
      {isDiagnosisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Activity className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Diagnosis</h3>
                  <p className="text-xs text-slate-500">Formal clinical condition classification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDiagnosisModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDiagnosis} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Diagnosis Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={diagDate}
                  onChange={(e) => setDiagDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Condition / Diagnosis Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Type 2 Diabetes Mellitus"
                  value={diagCondition}
                  onChange={(e) => setDiagCondition(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Clinical Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Severity, staging, diagnostic criteria met, ICD notes..."
                  value={diagNotes}
                  onChange={(e) => setDiagNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => setIsDiagnosisModalOpen(false)}
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Record Diagnosis'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. TREATMENT MODAL */}
      {/* ==================================================================== */}
      {isTreatmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-50 text-teal-600">
                  <FolderHeart className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Treatment Plan</h3>
                  <p className="text-xs text-slate-500">Therapies, interventions and clinical care plans</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTreatmentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTreatment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Treatment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={treatDate}
                  onChange={(e) => setTreatDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Treatment / Intervention <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physical Therapy &amp; Ergonomic Posture Correction"
                  value={treatIntervention}
                  onChange={(e) => setTreatIntervention(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Care Plan (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline the planned course of therapy, milestones, frequency..."
                  value={treatCarePlan}
                  onChange={(e) => setTreatCarePlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Clinical Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Precautions, patient compliance instructions..."
                  value={treatNotes}
                  onChange={(e) => setTreatNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => setIsTreatmentModalOpen(false)}
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Treatment'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. PRESCRIPTION MODAL */}
      {/* ==================================================================== */}
      {isPrescriptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Pill className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Issue Prescription</h3>
                  <p className="text-xs text-slate-500">Prescribe medication regimen (Starts ACTIVE)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrescriptionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePrescription} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Medicine Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metformin Hydrochloride"
                  value={rxMedicine}
                  onChange={(e) => setRxMedicine(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Dosage <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500mg"
                    value={rxDosage}
                    onChange={(e) => setRxDosage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Frequency <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Twice daily"
                    value={rxFrequency}
                    onChange={(e) => setRxFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Duration <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 30 days"
                    value={rxDuration}
                    onChange={(e) => setRxDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={rxStartDate}
                    onChange={(e) => setRxStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={rxEndDate}
                    onChange={(e) => setRxEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Instructions / Usage Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Take immediately after meals with plenty of water"
                  value={rxInstructions}
                  onChange={(e) => setRxInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => setIsPrescriptionModalOpen(false)}
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Issue Prescription'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. RECORD DETAIL MODAL (LIVE RE-CHECKED) */}
      {/* ==================================================================== */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800">
                  {viewingRecord.record_type}
                </span>
                <h3 className="text-base font-bold text-slate-900">{viewingRecord.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailError ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">Access Restricted</h4>
                  <p className="text-xs font-semibold text-rose-600">{detailError}</p>
                </div>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Patient consent has expired, was revoked, or does not authorize viewing this record category.
                </p>
              </div>
            ) : isLoadingDetail ? (
              <div className="py-8">
                <LoadingState message="Re-checking clinical consent &amp; loading record details..." />
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Record Date:</span>
                    <span className="font-semibold text-slate-800">{viewingRecord.record_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Provider:</span>
                    <span className="font-semibold text-slate-800">
                      {viewingRecord.provider_name || 'N/A'}
                    </span>
                  </div>
                </div>

                {viewingRecord.description && (
                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1 font-semibold">
                      Summary:
                    </span>
                    <p className="p-3 bg-slate-50 rounded-xl text-slate-800 leading-relaxed border border-slate-100">
                      {viewingRecord.description}
                    </p>
                  </div>
                )}

                {/* Subtype Specifics */}
                {recordDetail?.consultation && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <span className="text-slate-700 font-bold block">Consultation Details:</span>
                    {recordDetail.consultation.chief_complaint && (
                      <div>
                        <span className="text-slate-500 text-[10px] block">Chief Complaint:</span>
                        <p className="font-medium">{recordDetail.consultation.chief_complaint}</p>
                      </div>
                    )}
                    {recordDetail.consultation.symptoms && (
                      <div>
                        <span className="text-slate-500 text-[10px] block">Symptoms:</span>
                        <p className="font-medium">{recordDetail.consultation.symptoms}</p>
                      </div>
                    )}
                    {recordDetail.consultation.notes && (
                      <div>
                        <span className="text-slate-500 text-[10px] block">Doctor Clinical Notes:</span>
                        <p className="font-medium">{recordDetail.consultation.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {recordDetail?.prescription && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <span className="text-slate-700 font-bold block">Prescription Regimen:</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Dosage:</span>
                        <p className="font-medium">{recordDetail.prescription.dosage}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Frequency:</span>
                        <p className="font-medium">{recordDetail.prescription.frequency}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Duration:</span>
                        <p className="font-medium">{recordDetail.prescription.duration}</p>
                      </div>
                    </div>
                    {recordDetail.prescription.instructions && (
                      <div>
                        <span className="text-slate-500 text-[10px] block">Instructions:</span>
                        <p className="font-medium">{recordDetail.prescription.instructions}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500 text-[10px] block">Status:</span>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {recordDetail.prescription.status}
                      </span>
                    </div>
                  </div>
                )}

                {recordDetail?.diagnosis && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <span className="text-slate-700 font-bold block">Diagnosis Details:</span>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Condition:</span>
                      <p className="font-medium text-slate-900">{recordDetail.diagnosis.diagnosis_name}</p>
                    </div>
                    {recordDetail.diagnosis.notes && (
                      <div>
                        <span className="text-slate-500 text-[10px] block">Notes:</span>
                        <p className="font-medium">{recordDetail.diagnosis.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {recordDetail?.treatment && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                    <span className="text-slate-700 font-bold block">Treatment &amp; Intervention:</span>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Intervention:</span>
                      <p className="font-medium text-slate-900">{recordDetail.treatment.treatment_name}</p>
                    </div>
                    {recordDetail.treatment.care_plan && (
                      <div>
                        <span className="text-slate-500 text-[10px] block">Care Plan:</span>
                        <p className="font-medium">{recordDetail.treatment.care_plan}</p>
                      </div>
                    )}
                    {recordDetail.treatment.notes && (
                      <div>
                        <span className="text-slate-500 text-[10px] block">Notes:</span>
                        <p className="font-medium">{recordDetail.treatment.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {viewingRecord.hospital_name && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-700">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Hospital / Clinic: <strong>{viewingRecord.hospital_name}</strong></span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <SecondaryButton onClick={() => setViewingRecord(null)}>Close</SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
