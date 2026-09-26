import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Calendar,
  Activity,
  Pill,
  Download,
  Eye,
  Plus,
  Search,
  Upload,
  Clock,
  Building2,
  User,
  AlertCircle,
  FileCheck2,
  X,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { ToastItem, type ToastMessage } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import {
  getPatientMedicalRecords,
  getMedicalRecordDetail,
  createMedicalRecord,
  validateMedicalDocument,
  type MedicalRecord,
  type MedicalRecordDetail,
  type RecordType,
  type CreateMedicalRecordInput,
} from '../services/healthRecords';

type FilterCategory = 'All' | 'Consultations' | 'Lab Reports' | 'Prescriptions' | 'Imaging';

export const HealthRecords: React.FC = () => {
  const { profile } = useAuth();
  const patientId = profile?.id;

  // State
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [recordDetail, setRecordDetail] = useState<MedicalRecordDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Add Record Form State
  const [formType, setFormType] = useState<RecordType>('CONSULTATION');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formProvider, setFormProvider] = useState('');
  const [formHospital, setFormHospital] = useState('');
  const [formDescription, setFormDescription] = useState('');
  // Subtype fields
  const [formChiefComplaint, setFormChiefComplaint] = useState('');
  const [formSymptoms, setFormSymptoms] = useState('');
  const [formDiagnosis, setFormDiagnosis] = useState('');
  const [formTreatment, setFormTreatment] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formFollowUp, setFormFollowUp] = useState('');
  const [formMedicineName, setFormMedicineName] = useState('');
  const [formDosage, setFormDosage] = useState('');
  const [formFrequency, setFormFrequency] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formTestName, setFormTestName] = useState('');
  const [formResult, setFormResult] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formReferenceRange, setFormReferenceRange] = useState('');
  // File upload state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message?: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Fetch Patient Records
  const loadRecords = async () => {
    if (!patientId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPatientMedicalRecords(patientId);
      if (res.error) {
        setError(res.error);
        addToast('error', 'Error', res.error);
      } else {
        setRecords(res.data);
      }
    } catch {
      const msg = 'Unable to load your health records. Please try again.';
      setError(msg);
      addToast('error', 'Network Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [patientId]);

  // 2. Filter & Search Logic
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Category Filter
      if (activeFilter === 'Consultations' && rec.record_type !== 'CONSULTATION') return false;
      if (activeFilter === 'Lab Reports' && rec.record_type !== 'LAB_REPORT') return false;
      if (activeFilter === 'Prescriptions' && rec.record_type !== 'PRESCRIPTION') return false;
      if (activeFilter === 'Imaging' && rec.record_type !== 'IMAGING') return false;

      // Case-insensitive Search against title, provider, hospital, record type, description
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = rec.title.toLowerCase().includes(q);
        const matchesProvider = (rec.provider_name || '').toLowerCase().includes(q);
        const matchesHospital = (rec.hospital_name || '').toLowerCase().includes(q);
        const matchesType = rec.record_type.toLowerCase().includes(q);
        const matchesDesc = (rec.description || '').toLowerCase().includes(q);

        if (!matchesTitle && !matchesProvider && !matchesHospital && !matchesType && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [records, activeFilter, searchQuery]);

  // 3. View Record Details
  const handleViewDetails = async (rec: MedicalRecord) => {
    setSelectedRecord(rec);
    setIsLoadingDetail(true);
    setRecordDetail(null);
    try {
      const res = await getMedicalRecordDetail(rec.id, rec.record_type, rec.document_path);
      if (res.data) {
        setRecordDetail(res.data);
      }
    } catch {
      addToast('warning', 'Notice', 'Could not load supplementary record data.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // 4. File Selection Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateMedicalDocument(file);
    if (!validation.valid) {
      setFileError(validation.error || 'Invalid file.');
      setAttachedFile(null);
      e.target.value = '';
      return;
    }

    setFileError(null);
    setAttachedFile(file);
  };

  // 5. Submit New Record
  const handleAddRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      addToast('error', 'Authentication Required', 'Please log in to add records.');
      return;
    }
    if (!formTitle.trim()) {
      addToast('warning', 'Missing Information', 'Please provide a title for the record.');
      return;
    }

    setIsSubmitting(true);

    const input: CreateMedicalRecordInput = {
      record_type: formType,
      title: formTitle,
      record_date: formDate,
      provider_name: formProvider,
      hospital_name: formHospital,
      description: formDescription,
      chief_complaint: formChiefComplaint,
      symptoms: formSymptoms,
      diagnosis: formDiagnosis,
      treatment: formTreatment,
      notes: formNotes,
      follow_up_date: formFollowUp,
      medicine_name: formMedicineName,
      dosage: formDosage,
      frequency: formFrequency,
      duration: formDuration,
      instructions: formInstructions,
      test_name: formTestName,
      result: formResult,
      unit: formUnit,
      reference_range: formReferenceRange,
    };

    try {
      const res = await createMedicalRecord(patientId, input, attachedFile || undefined);
      if (!res.success || !res.record) {
        addToast('error', 'Upload Error', res.error || 'Unable to upload this document.');
      } else {
        addToast('success', 'Record Added', 'Medical record successfully saved to your timeline.');
        setIsAddModalOpen(false);
        resetForm();
        // Reload timeline
        await loadRecords();
      }
    } catch {
      addToast('error', 'Error', 'Failed to save health record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormType('CONSULTATION');
    setFormTitle('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormProvider('');
    setFormHospital('');
    setFormDescription('');
    setFormChiefComplaint('');
    setFormSymptoms('');
    setFormDiagnosis('');
    setFormTreatment('');
    setFormNotes('');
    setFormFollowUp('');
    setFormMedicineName('');
    setFormDosage('');
    setFormFrequency('');
    setFormDuration('');
    setFormInstructions('');
    setFormTestName('');
    setFormResult('');
    setFormUnit('');
    setFormReferenceRange('');
    setAttachedFile(null);
    setFileError(null);
  };

  // Helper formatting
  const getRecordIcon = (type: RecordType) => {
    switch (type) {
      case 'CONSULTATION':
        return <Activity className="w-5 h-5 text-sky-600" />;
      case 'LAB_REPORT':
        return <FileSpreadsheet className="w-5 h-5 text-blue-600" />;
      case 'PRESCRIPTION':
        return <Pill className="w-5 h-5 text-emerald-600" />;
      case 'IMAGING':
        return <Radio className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-600" />;
    }
  };

  const getRecordBadgeVariant = (type: RecordType) => {
    switch (type) {
      case 'CONSULTATION':
        return 'primary';
      case 'LAB_REPORT':
        return 'info';
      case 'PRESCRIPTION':
        return 'success';
      case 'IMAGING':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Floating Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>

      {/* Page Header */}
      <PageHeader
        title="Health Records"
        subtitle="Your medical information in one secure timeline."
        action={
          <PrimaryButton
            id="add-record-btn"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
          >
            Add Record
          </PrimaryButton>
        }
      />

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-2.5 border border-slate-200/90 rounded-2xl shadow-soft">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['All', 'Consultations', 'Lab Reports', 'Prescriptions', 'Imaging'] as FilterCategory[]).map(
            (cat) => (
              <button
                key={cat}
                type="button"
                id={`filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setActiveFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === cat
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>

        {/* Live Search Input */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id="record-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records by title, doctor..."
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-sky-500 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Timeline Section */}
      {isLoading ? (
        <LoadingState message="Loading your health records..." variant="card-skeleton" count={3} />
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-sm font-bold text-rose-900">Unable to load your health records</h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">
            Please check your connection or reload your session.
          </p>
          <SecondaryButton size="sm" onClick={loadRecords}>
            Try Again
          </SecondaryButton>
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-7 h-7" />}
          title="No health records yet"
          description="Your verified medical timeline is ready. Add consultation summaries, prescriptions, or laboratory reports to build your comprehensive Health Wallet history."
          action={
            <PrimaryButton
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
            >
              Add Your First Record
            </PrimaryButton>
          }
        />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          icon={<Search className="w-7 h-7" />}
          title="No matching records found"
          description={`No health records matched "${searchQuery || activeFilter}". Try adjusting your query or filter.`}
          action={
            <SecondaryButton
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('All');
              }}
            >
              Reset Filters
            </SecondaryButton>
          }
        />
      ) : (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Medical Timeline ({filteredRecords.length}{' '}
              {filteredRecords.length === 1 ? 'record' : 'records'})
            </span>
            <span className="text-xs text-slate-400 font-medium">Sorted newest first</span>
          </div>

          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="bg-white border border-slate-200/90 hover:border-sky-300 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-4">
                {/* Type Icon Container */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                    record.record_type === 'CONSULTATION'
                      ? 'bg-sky-50 border-sky-100'
                      : record.record_type === 'LAB_REPORT'
                      ? 'bg-blue-50 border-blue-100'
                      : record.record_type === 'PRESCRIPTION'
                      ? 'bg-emerald-50 border-emerald-100'
                      : 'bg-purple-50 border-purple-100'
                  }`}
                >
                  {getRecordIcon(record.record_type)}
                </div>

                {/* Details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-sky-700 transition-colors">
                      {record.title}
                    </h3>
                    <Badge variant={getRecordBadgeVariant(record.record_type)} size="sm">
                      {record.record_type.replace(/_/g, ' ')}
                    </Badge>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        record.creator_type === 'PROVIDER_CREATED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {record.creator_type === 'PROVIDER_CREATED'
                        ? 'Provider Verified'
                        : 'Patient Uploaded'}
                    </span>
                    {record.document_path && (
                      <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60 flex items-center gap-1">
                        <FileCheck2 className="w-3 h-3" />
                        Attachment
                      </span>
                    )}
                  </div>

                  {(record.provider_name || record.hospital_name) && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap">
                      {record.provider_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {record.provider_name}
                        </span>
                      )}
                      {record.provider_name && record.hospital_name && <span>•</span>}
                      {record.hospital_name && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Building2 className="w-3 h-3" />
                          {record.hospital_name}
                        </span>
                      )}
                    </div>
                  )}

                  {record.description && (
                    <p className="text-xs text-slate-600 font-medium bg-slate-50/80 p-2 rounded-xl border border-slate-100 line-clamp-2">
                      {record.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Column */}
              <div className="flex items-center justify-between md:flex-col md:items-end gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{record.record_date}</span>
                </div>

                <SecondaryButton
                  size="sm"
                  id={`view-btn-${record.id}`}
                  icon={<Eye className="w-3.5 h-3.5" />}
                  onClick={() => handleViewDetails(record)}
                >
                  View Details
                </SecondaryButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Details Modal */}
      <Modal
        isOpen={Boolean(selectedRecord)}
        onClose={() => {
          setSelectedRecord(null);
          setRecordDetail(null);
        }}
        title={selectedRecord?.title || 'Record Summary'}
        subtitle={`Type: ${selectedRecord?.record_type.replace(/_/g, ' ')} • Date: ${
          selectedRecord?.record_date || ''
        }`}
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-400 font-mono">
              ID: {selectedRecord?.id.slice(0, 8)}...
            </div>
            <SecondaryButton
              onClick={() => {
                setSelectedRecord(null);
                setRecordDetail(null);
              }}
            >
              Close
            </SecondaryButton>
          </div>
        }
      >
        {isLoadingDetail ? (
          <LoadingState message="Loading record details..." variant="spinner" />
        ) : selectedRecord ? (
          <div className="space-y-4 text-xs">
            {/* Metadata Card */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Record Type</span>
                <span className="font-bold text-slate-800">
                  {selectedRecord.record_type.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Record Date</span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedRecord.record_date}
                </span>
              </div>
              {selectedRecord.provider_name && (
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Provider / Doctor</span>
                  <span className="font-semibold text-slate-800">
                    {selectedRecord.provider_name}
                  </span>
                </div>
              )}
              {selectedRecord.hospital_name && (
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Hospital / Clinic</span>
                  <span className="font-semibold text-slate-800">
                    {selectedRecord.hospital_name}
                  </span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Verification Source</span>
                <span className="font-semibold text-slate-800">
                  {selectedRecord.creator_type === 'PROVIDER_CREATED'
                    ? 'Verified Medical Facility'
                    : 'Self Uploaded by Patient'}
                </span>
              </div>
            </div>

            {/* Description */}
            {selectedRecord.description && (
              <div>
                <span className="text-slate-500 font-bold block mb-1">Clinical Summary:</span>
                <p className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 leading-relaxed font-medium">
                  {selectedRecord.description}
                </p>
              </div>
            )}

            {/* Consultation Specific Details */}
            {recordDetail?.consultation && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Consultation Findings
                </h4>
                {recordDetail.consultation.chief_complaint && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Chief Complaint</span>
                    <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                      {recordDetail.consultation.chief_complaint}
                    </p>
                  </div>
                )}
                {recordDetail.consultation.symptoms && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Symptoms</span>
                    <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                      {recordDetail.consultation.symptoms}
                    </p>
                  </div>
                )}
                {recordDetail.consultation.diagnosis && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Clinical Diagnosis</span>
                    <p className="p-2.5 bg-sky-50/60 rounded-xl border border-sky-100 text-sky-950 font-medium">
                      {recordDetail.consultation.diagnosis}
                    </p>
                  </div>
                )}
                {recordDetail.consultation.treatment && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Treatment Advice</span>
                    <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                      {recordDetail.consultation.treatment}
                    </p>
                  </div>
                )}
                {recordDetail.consultation.follow_up_date && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Follow-up Date</span>
                    <span className="font-mono font-bold text-slate-700">
                      {recordDetail.consultation.follow_up_date}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Prescription Specific Details */}
            {recordDetail?.prescription && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Prescription Details
                </h4>
                <div className="grid grid-cols-2 gap-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div>
                    <span className="text-slate-500 font-semibold block">Medication</span>
                    <span className="font-bold text-emerald-950 text-sm">
                      {recordDetail.prescription.medicine_name}
                    </span>
                  </div>
                  {recordDetail.prescription.dosage && (
                    <div>
                      <span className="text-slate-500 font-semibold block">Dosage</span>
                      <span className="font-bold text-slate-800">
                        {recordDetail.prescription.dosage}
                      </span>
                    </div>
                  )}
                  {recordDetail.prescription.frequency && (
                    <div>
                      <span className="text-slate-500 font-semibold block">Frequency</span>
                      <span className="font-medium text-slate-800">
                        {recordDetail.prescription.frequency}
                      </span>
                    </div>
                  )}
                  {recordDetail.prescription.duration && (
                    <div>
                      <span className="text-slate-500 font-semibold block">Duration</span>
                      <span className="font-medium text-slate-800">
                        {recordDetail.prescription.duration}
                      </span>
                    </div>
                  )}
                </div>
                {recordDetail.prescription.instructions && (
                  <div>
                    <span className="text-slate-400 font-semibold block mb-0.5">Instructions</span>
                    <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                      {recordDetail.prescription.instructions}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Lab Report Specific Details */}
            {recordDetail?.labReport && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Laboratory Test Findings
                  </h4>
                  {(recordDetail.labReport.laboratory_name || recordDetail.labReport.lab_name) && (
                    <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                      {recordDetail.labReport.laboratory_name || recordDetail.labReport.lab_name}
                    </span>
                  )}
                </div>

                {recordDetail.labTestResults && recordDetail.labTestResults.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Test Name</th>
                          <th className="py-2.5 px-2">Observed Value</th>
                          <th className="py-2.5 px-2">Unit</th>
                          <th className="py-2.5 px-2">Reference Range</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                        {recordDetail.labTestResults.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{t.test_name}</td>
                            <td className="py-2.5 px-2 font-bold text-slate-800">{t.value}</td>
                            <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px]">{t.unit || '—'}</td>
                            <td className="py-2.5 px-2 font-mono text-slate-600 text-[11px]">{t.reference_range || '—'}</td>
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  t.status === 'NORMAL'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                    : t.status === 'HIGH'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                    : t.status === 'LOW'
                                    ? 'bg-sky-50 text-sky-800 border border-sky-200/60'
                                    : t.status === 'CRITICAL'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                    : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                                }`}
                              >
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <div>
                      <span className="text-slate-500 font-semibold block">Test Name</span>
                      <span className="font-bold text-blue-950">{recordDetail.labReport.test_name}</span>
                    </div>
                    {recordDetail.labReport.result && (
                      <div>
                        <span className="text-slate-500 font-semibold block">Observed Result</span>
                        <span className="font-bold text-slate-900">
                          {recordDetail.labReport.result}{' '}
                          {recordDetail.labReport.unit ? recordDetail.labReport.unit : ''}
                        </span>
                      </div>
                    )}
                    {recordDetail.labReport.reference_range && (
                      <div>
                        <span className="text-slate-500 font-semibold block">Reference Range</span>
                        <span className="font-mono text-slate-700">
                          {recordDetail.labReport.reference_range}
                        </span>
                      </div>
                    )}
                    {(recordDetail.labReport.lab_name || recordDetail.labReport.laboratory_name) && (
                      <div>
                        <span className="text-slate-500 font-semibold block">Diagnostic Center</span>
                        <span className="font-semibold text-slate-800">
                          {recordDetail.labReport.laboratory_name || recordDetail.labReport.lab_name}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Diagnosis Specific Details */}
            {recordDetail?.diagnosis && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Diagnosis Details
                </h4>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                  <div>
                    <span className="text-slate-500 font-semibold block text-[11px]">Condition / Diagnosis</span>
                    <span className="font-bold text-indigo-950 text-sm">
                      {recordDetail.diagnosis.diagnosis_name}
                    </span>
                  </div>
                  {recordDetail.diagnosis.provider && (
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Diagnosing Provider</span>
                      <span className="font-medium text-slate-800">
                        {recordDetail.diagnosis.provider}
                      </span>
                    </div>
                  )}
                  {recordDetail.diagnosis.notes && (
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Doctor Clinical Notes</span>
                      <p className="p-2.5 bg-white rounded-xl border border-indigo-100 text-slate-700">
                        {recordDetail.diagnosis.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Treatment Specific Details */}
            {recordDetail?.treatment && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Treatment &amp; Intervention Details
                </h4>
                <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 space-y-2">
                  <div>
                    <span className="text-slate-500 font-semibold block text-[11px]">Treatment / Intervention</span>
                    <span className="font-bold text-teal-950 text-sm">
                      {recordDetail.treatment.treatment_name}
                    </span>
                  </div>
                  {recordDetail.treatment.care_plan && (
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Care Plan</span>
                      <p className="p-2.5 bg-white rounded-xl border border-teal-100 text-slate-700">
                        {recordDetail.treatment.care_plan}
                      </p>
                    </div>
                  )}
                  {recordDetail.treatment.notes && (
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Clinical Notes</span>
                      <p className="p-2.5 bg-white rounded-xl border border-teal-100 text-slate-700">
                        {recordDetail.treatment.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Document Attachment & Short-Lived Signed Download */}
            {selectedRecord.document_path && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-bold block mb-1.5">Attached Medical Document:</span>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-sky-600" />
                    <div>
                      <p className="font-bold text-slate-800">
                        {selectedRecord.document_name || 'Medical Document'}
                      </p>
                      {selectedRecord.document_size && (
                        <p className="text-[11px] text-slate-400">
                          {(selectedRecord.document_size / (1024 * 1024)).toFixed(2)} MB • Authorized Access Only
                        </p>
                      )}
                    </div>
                  </div>

                  {recordDetail?.signedDocumentUrl ? (
                    <a
                      href={recordDetail.signedDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold transition-all text-xs cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      View Document
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Secured Storage</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Add Record Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsAddModalOpen(false);
        }}
        title="Add Medical Record"
        subtitle="Record your health consultations, diagnostic reports, and medical notes."
        maxWidth="lg"
      >
        <form onSubmit={handleAddRecordSubmit} className="space-y-4 text-xs">
          {/* Record Type Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-record-type" className="block text-xs font-bold text-slate-700 mb-1">
                Record Type <span className="text-rose-500">*</span>
              </label>
              <select
                id="modal-record-type"
                value={formType}
                onChange={(e) => setFormType(e.target.value as RecordType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
              >
                <option value="CONSULTATION">Consultation</option>
                <option value="LAB_REPORT">Lab Report</option>
                <option value="PRESCRIPTION">Prescription</option>
                <option value="IMAGING">Imaging / Radiology</option>
                <option value="DIAGNOSIS">Diagnosis</option>
                <option value="TREATMENT">Treatment / Therapy</option>
                <option value="OTHER">Other Health Record</option>
              </select>
            </div>

            <div>
              <label htmlFor="modal-record-date" className="block text-xs font-bold text-slate-700 mb-1">
                Record Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                id="modal-record-date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="modal-record-title" className="block text-xs font-bold text-slate-700 mb-1">
              Record Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="modal-record-title"
              required
              placeholder="e.g. Annual Health Checkup, CBC Panel, Dental Consultation..."
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Provider & Hospital */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-provider-name" className="block text-xs font-bold text-slate-700 mb-1">
                Attending Doctor / Specialist
              </label>
              <input
                type="text"
                id="modal-provider-name"
                placeholder="e.g. Dr. Arvind Kumar"
                value={formProvider}
                onChange={(e) => setFormProvider(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="modal-hospital-name" className="block text-xs font-bold text-slate-700 mb-1">
                Hospital / Clinic / Diagnostic Center
              </label>
              <input
                type="text"
                id="modal-hospital-name"
                placeholder="e.g. Apollo Clinic, Metropolis Lab"
                value={formHospital}
                onChange={(e) => setFormHospital(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="modal-description" className="block text-xs font-bold text-slate-700 mb-1">
              General Summary / Description
            </label>
            <textarea
              id="modal-description"
              rows={2}
              placeholder="Brief summary of visit, physician recommendations, or notes..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Type-Specific Fields */}
          {formType === 'CONSULTATION' && (
            <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 space-y-2.5">
              <span className="font-bold text-sky-900 block">Consultation Information:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="modal-chief-complaint" className="text-slate-600 block mb-0.5 font-medium">Chief Complaint</label>
                  <input
                    type="text"
                    id="modal-chief-complaint"
                    placeholder="e.g. Fever, sore throat for 2 days"
                    value={formChiefComplaint}
                    onChange={(e) => setFormChiefComplaint(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="modal-diagnosis" className="text-slate-600 block mb-0.5 font-medium">Doctor Diagnosis</label>
                  <input
                    type="text"
                    id="modal-diagnosis"
                    placeholder="e.g. Acute Pharyngitis"
                    value={formDiagnosis}
                    onChange={(e) => setFormDiagnosis(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="modal-treatment" className="text-slate-600 block mb-0.5 font-medium">Treatment & Advice</label>
                <input
                  type="text"
                  id="modal-treatment"
                  placeholder="e.g. Warm saline gargles, hydration, rest"
                  value={formTreatment}
                  onChange={(e) => setFormTreatment(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {formType === 'PRESCRIPTION' && (
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2.5">
              <span className="font-bold text-emerald-900 block">Prescription Details:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="modal-medicine-name" className="text-slate-600 block mb-0.5 font-medium">Medicine Name</label>
                  <input
                    type="text"
                    id="modal-medicine-name"
                    placeholder="e.g. Paracetamol / Amoxicillin"
                    value={formMedicineName}
                    onChange={(e) => setFormMedicineName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="modal-dosage" className="text-slate-600 block mb-0.5 font-medium">Dosage</label>
                  <input
                    type="text"
                    id="modal-dosage"
                    placeholder="e.g. 500mg"
                    value={formDosage}
                    onChange={(e) => setFormDosage(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="modal-frequency" className="text-slate-600 block mb-0.5 font-medium">Frequency</label>
                  <input
                    type="text"
                    id="modal-frequency"
                    placeholder="e.g. Once daily after meals"
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="modal-duration" className="text-slate-600 block mb-0.5 font-medium">Duration</label>
                  <input
                    type="text"
                    id="modal-duration"
                    placeholder="e.g. 5 days"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {formType === 'LAB_REPORT' && (
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2.5">
              <span className="font-bold text-blue-900 block">Diagnostic Test Details:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="modal-test-name" className="text-slate-600 block mb-0.5 font-medium">Test Name</label>
                  <input
                    type="text"
                    id="modal-test-name"
                    placeholder="e.g. Fasting Blood Glucose"
                    value={formTestName}
                    onChange={(e) => setFormTestName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="modal-result" className="text-slate-600 block mb-0.5 font-medium">Test Result</label>
                  <input
                    type="text"
                    id="modal-result"
                    placeholder="e.g. 94"
                    value={formResult}
                    onChange={(e) => setFormResult(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="modal-unit" className="text-slate-600 block mb-0.5 font-medium">Unit</label>
                  <input
                    type="text"
                    id="modal-unit"
                    placeholder="e.g. mg/dL"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="modal-reference-range" className="text-slate-600 block mb-0.5 font-medium">Reference Range</label>
                  <input
                    type="text"
                    id="modal-reference-range"
                    placeholder="e.g. 70 - 99 mg/dL"
                    value={formReferenceRange}
                    onChange={(e) => setFormReferenceRange(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Document Attachment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Attach Medical Document (PDF, JPG, PNG &bull; Max 10MB)
            </label>
            <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <input
                type="file"
                id="modal-file-input"
                accept=".pdf, .jpg, .jpeg, .png, application/pdf, image/jpeg, image/png"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="modal-file-input"
                className="cursor-pointer flex flex-col items-center gap-1.5"
              >
                <Upload className="w-5 h-5 text-sky-600" />
                <span className="font-bold text-slate-700">
                  {attachedFile ? attachedFile.name : 'Click to select document'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {attachedFile
                    ? `${(attachedFile.size / 1024).toFixed(0)} KB selected`
                    : 'Supported: PDF, JPG, PNG up to 10MB'}
                </span>
              </label>
            </div>
            {fileError && <p className="text-xs text-rose-600 mt-1 font-medium">{fileError}</p>}
          </div>

          {/* Transparency & Identity Notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-[11px] leading-relaxed">
            <span className="font-bold">Identity Protection:</span> This entry will be saved with a{' '}
            <span className="font-bold">Patient Uploaded</span> classification. Official healthcare
            provider verification marks are only issued when uploaded directly by accredited
            hospitals through ABDM verified nodes.
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <SecondaryButton
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              id="submit-record-btn"
              disabled={isSubmitting}
              icon={
                isSubmitting ? (
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )
              }
            >
              {isSubmitting ? 'Saving...' : 'Save Health Record'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
