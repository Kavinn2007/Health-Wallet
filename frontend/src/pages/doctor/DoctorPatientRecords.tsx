import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  Clock,
  Lock,
  AlertCircle,
  ArrowLeft,
  Activity,
  Calendar,
  Building2,
  Stethoscope,
  Pill,
  Microscope,
  FolderHeart,
  Image as ImageIcon,
  KeyRound,
  Eye,
  X,
} from 'lucide-react';
import { getDoctorAuthorizedRecords } from '../../services/consent';
import { logMedicalRecordView } from '../../services/notifications';
import { searchPatientByHealthWalletId } from '../../services/doctors';
import {
  getMedicalRecordDetail,
  type MedicalRecord,
  type MedicalRecordDetail,
} from '../../services/healthRecords';
import { type RecordCategory, type ConsentStatus, type MinimalPatientInfo } from '../../services/supabase';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SecondaryButton } from '../../components/ui/SecondaryButton';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { AccessRequestModal } from '../../components/doctor/AccessRequestModal';

export const DoctorPatientRecords: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [allowedCategories, setAllowedCategories] = useState<RecordCategory[]>([]);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | 'NONE'>('NONE');
  const [expiresAt, setExpiresAt] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [patientInfo, setPatientInfo] = useState<MinimalPatientInfo | null>(null);

  // Detailed Record Modal
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);
  const [recordDetail, setRecordDetail] = useState<MedicalRecordDetail | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const fetchRecords = async () => {
    if (!patientId) return;
    setIsLoading(true);
    setErrorMessage('');

    const res = await getDoctorAuthorizedRecords(patientId);

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
    fetchRecords();
  }, [patientId]);

  // Filter records by selected authorized category
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

  const handleOpenRecordDetail = async (record: MedicalRecord) => {
    // Re-verify authorization strictly before opening detail
    if (!patientId) return;
    const recheck = await getDoctorAuthorizedRecords(patientId);
    if (!recheck.success) {
      setViewingRecord(null);
      setRecordDetail(null);
      setErrorMessage(recheck.error || 'Consent has expired or been revoked.');
      return;
    }
    // Phase 8: Log authorized medical record view
    await logMedicalRecordView(record.id, record.title);

    // Fetch complete record details including structured lab results and signed document url
    const resDetail = await getMedicalRecordDetail(
      record.id,
      record.record_type,
      record.document_path
    );
    setRecordDetail(resDetail.data);
    setViewingRecord(record);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/doctor/patients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Patient Search</span>
        </Link>
        <Link
          to={`/doctor/patients/${patientId}/clinical`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors"
        >
          <Stethoscope className="w-4 h-4" />
          <span>Open Clinical Workspace →</span>
        </Link>
      </div>

      {/* ERROR / ACCESS RESTRICTED SCREEN */}
      {errorMessage && !isLoading && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center shadow-xs space-y-5 animate-in fade-in duration-200">
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
            <PrimaryButton
              onClick={() => {
                if (patientInfo) {
                  setIsRequestModalOpen(true);
                } else {
                  // Navigate to search
                  window.location.href = '/doctor/patients';
                }
              }}
              icon={<KeyRound className="w-4 h-4" />}
            >
              Request Access
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* AUTHORIZED RECORDS VIEW */}
      {!errorMessage && !isLoading && (
        <div className="space-y-6">
          {/* Header Card with Patient & Consent Metadata */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">
                    Authorized Patient Health Records
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Consent Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Viewing clinical records unlocked under verified patient consent.
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

            {/* Authorized Categories Badges */}
            <div className="space-y-1.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Authorized Record Categories:
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

          {/* Category Filter Tabs */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-2 shadow-xs flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-sky-50 text-sky-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              All Authorized ({records.length})
            </button>

            {allowedCategories.includes('ALL_RECORDS') ? (
              <>
                {['CONSULTATIONS', 'DIAGNOSES', 'TREATMENTS', 'PRESCRIPTIONS', 'LAB_REPORTS'].map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCategory(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === c
                          ? 'bg-sky-50 text-sky-700 shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {c}
                    </button>
                  )
                )}
              </>
            ) : (
              allowedCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === c
                      ? 'bg-sky-50 text-sky-700 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))
            )}
          </div>

          {/* Records List */}
          {filteredRecords.length === 0 ? (
            <EmptyState
              title="No Records Found"
              description="No medical records were found in this patient's wallet matching your authorized categories."
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
      )}

      {/* DETAILED RECORD VIEW MODAL */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
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

              {/* Structured Lab Report Details if record_type === 'LAB_REPORT' */}
              {viewingRecord.record_type === 'LAB_REPORT' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                      Laboratory Findings
                    </span>
                    {(recordDetail?.labReport?.laboratory_name || viewingRecord.hospital_name) && (
                      <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                        {recordDetail?.labReport?.laboratory_name || viewingRecord.hospital_name}
                      </span>
                    )}
                  </div>

                  {recordDetail?.labTestResults && recordDetail.labTestResults.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                          <tr>
                            <th className="py-2 px-2.5">Test</th>
                            <th className="py-2 px-2">Value</th>
                            <th className="py-2 px-2">Unit</th>
                            <th className="py-2 px-2">Ref Range</th>
                            <th className="py-2 px-2.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                          {recordDetail.labTestResults.map((t, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-2.5 font-bold text-slate-900">{t.test_name}</td>
                              <td className="py-2 px-2 font-bold text-slate-800">{t.value}</td>
                              <td className="py-2 px-2 text-slate-500 font-mono text-[10px]">{t.unit || '—'}</td>
                              <td className="py-2 px-2 font-mono text-slate-600 text-[10px]">{t.reference_range || '—'}</td>
                              <td className="py-2 px-2.5 text-right">
                                <span
                                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
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
                  ) : null}
                </div>
              )}

              {viewingRecord.description && (
                <div>
                  <span className="text-slate-500 block text-[11px] mb-1 font-semibold">
                    Description &amp; Clinical Notes:
                  </span>
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-800 leading-relaxed border border-slate-100">
                    {viewingRecord.description}
                  </p>
                </div>
              )}

              {/* Hospital affiliation */}
              {viewingRecord.hospital_name && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-700">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Facility: <strong>{viewingRecord.hospital_name}</strong></span>
                </div>
              )}

              {/* Original Document Signed URL Link */}
              {recordDetail?.signedDocumentUrl && (
                <div className="pt-2 border-t border-slate-100">
                  <a
                    href={recordDetail.signedDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold transition-all text-xs cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Open Original Laboratory Document</span>
                  </a>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <SecondaryButton onClick={() => setViewingRecord(null)}>Close</SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
