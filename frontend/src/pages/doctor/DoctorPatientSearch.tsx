import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Lock,
  UserCheck,
  AlertCircle,
  FileLock2,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Shield,
  Stethoscope,
  Clock,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { searchPatientByHealthWalletId } from '../../services/doctors';
import { getDoctorConsentStatus } from '../../services/consent';
import { type MinimalPatientInfo, type ConsentStatus, type RecordCategory } from '../../services/supabase';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SecondaryButton } from '../../components/ui/SecondaryButton';
import { AccessRequestModal } from '../../components/doctor/AccessRequestModal';

export const DoctorPatientSearch: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [hwIdInput, setHwIdInput] = useState(searchParams.get('hwid') || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [searchResult, setSearchResult] = useState<MinimalPatientInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Consent Status State
  const [consentInfo, setConsentInfo] = useState<{
    hasConsent: boolean;
    status: ConsentStatus | 'NONE';
    approvedRecordTypes: RecordCategory[];
    expiresAt?: string;
  }>({
    hasConsent: false,
    status: 'NONE',
    approvedRecordTypes: [],
  });

  const checkConsent = async (patId: string) => {
    const res = await getDoctorConsentStatus(patId);
    setConsentInfo({
      hasConsent: res.hasConsent,
      status: res.status,
      approvedRecordTypes: res.approvedRecordTypes,
      expiresAt: res.expiresAt,
    });
  };

  const executeSearch = async (idToSearch: string) => {
    const cleanId = idToSearch.trim();
    if (!cleanId) {
      setErrorMessage('Please enter a Health Wallet ID to search.');
      setSearchResult(null);
      setSearchAttempted(false);
      return;
    }

    setIsSearching(true);
    setErrorMessage('');
    setSearchAttempted(true);
    setRequestSent(false);

    const res = await searchPatientByHealthWalletId(cleanId);
    setIsSearching(false);

    if (res.success && res.patient) {
      setSearchResult(res.patient);
      setErrorMessage('');
      await checkConsent(res.patient.id);
    } else {
      setSearchResult(null);
      setErrorMessage(res.error || 'Patient not found');
      setConsentInfo({
        hasConsent: false,
        status: 'NONE',
        approvedRecordTypes: [],
      });
    }
  };

  // Run search automatically if query param present on load
  useEffect(() => {
    const paramId = searchParams.get('hwid');
    if (paramId) {
      setHwIdInput(paramId);
      executeSearch(paramId);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(hwIdInput);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
          Patient Search
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Search registered patient identity via national Health Wallet ID. Consent is required to view medical history.
        </p>
      </div>

      {/* Search Input Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <label
            htmlFor="hwid-search"
            className="block text-xs font-bold text-slate-800"
          >
            Health Wallet ID (Exact Match)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                id="hwid-search"
                type="text"
                value={hwIdInput}
                onChange={(e) => {
                  setHwIdInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="e.g. HW-TN-38236621 or HW-TN-48291736"
                className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm font-mono text-slate-900 outline-none transition-colors"
              />
            </div>
            <PrimaryButton
              type="submit"
              size="lg"
              isLoading={isSearching}
              icon={<Search className="w-4 h-4" />}
            >
              Search Patient
            </PrimaryButton>
          </div>
          <p className="text-[11px] text-slate-400">
            Standard format: <code className="font-mono font-semibold">HW-[2-LETTER STATE CODE]-[8 DIGITS]</code>. Broad fuzzy searches are restricted to protect patient privacy.
          </p>
        </form>
      </div>

      {/* ERROR STATE: Patient Not Found */}
      {searchAttempted && !isSearching && !searchResult && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center shadow-xs space-y-3 animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Patient not found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No registered patient was found matching Health Wallet ID: <span className="font-mono font-bold text-slate-800">{hwIdInput}</span>.
              Please check the identifier with the patient.
            </p>
          </div>
        </div>
      )}

      {/* FOUND STATE: Patient Found */}
      {searchResult && !isSearching && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          {/* Patient Minimal Identity Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg">
                  {searchResult.patient_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {searchResult.patient_name}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Patient
                    </span>
                  </div>
                  <p className="text-xs font-mono font-semibold text-sky-700">
                    {searchResult.health_wallet_id}
                  </p>
                </div>
              </div>

              <div>
                {consentInfo.hasConsent ? (
                  <Link to={`/doctor/patients/${searchResult.id}/records`}>
                    <PrimaryButton icon={<FileText className="w-4 h-4" />}>
                      View Authorized Records
                    </PrimaryButton>
                  </Link>
                ) : (
                  <PrimaryButton
                    onClick={() => setIsModalOpen(true)}
                    icon={<KeyRound className="w-4 h-4" />}
                  >
                    Request Medical Access
                  </PrimaryButton>
                )}
              </div>
            </div>

            {/* Minimum Necessary Information Grid */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Minimal Patient Identity
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Patient Name</span>
                  <span className="font-bold text-slate-900">{searchResult.patient_name}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Health Wallet ID</span>
                  <span className="font-mono font-bold text-sky-800">
                    {searchResult.health_wallet_id}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Blood Group</span>
                  <span className="font-bold text-slate-900">{searchResult.blood_group}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">State / Region</span>
                  <span className="font-bold text-slate-900">{searchResult.state}</span>
                </div>
              </div>
            </div>

            {/* Privacy Sealed Notice */}
            <div className="p-3.5 bg-slate-50/80 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>
                  Aadhaar, contact number, and demographic records are encrypted and sealed under the National Health Data Framework.
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">
                Privacy Sealed
              </span>
            </div>
          </div>

          {/* MEDICAL RECORDS SECTION: GATED OR UNLOCKED */}
          {consentInfo.hasConsent ? (
            /* UNLOCKED WITH ACTIVE CONSENT */
            <div className="bg-white border border-emerald-200/90 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        Medical Records: Access Granted
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        APPROVED
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      The patient has granted verified consent to view selected clinical categories.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link to={`/doctor/patients/${searchResult.id}/records`}>
                    <SecondaryButton>
                      View Records
                    </SecondaryButton>
                  </Link>
                  <Link to={`/doctor/patients/${searchResult.id}/clinical`}>
                    <PrimaryButton icon={<ArrowRight className="w-4 h-4" />}>
                      Clinical Workspace
                    </PrimaryButton>
                  </Link>
                </div>
              </div>

              {/* Authorized categories badges */}
              <div className="space-y-1.5 text-xs">
                <span className="text-slate-500 font-semibold block text-[11px]">
                  Authorized Record Categories:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {consentInfo.approvedRecordTypes.map((cat) => (
                    <span
                      key={cat}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                    >
                      ✓ {cat}
                    </span>
                  ))}
                </div>
              </div>

              {consentInfo.expiresAt && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Access Window Expires:{' '}
                    <strong>
                      {new Date(consentInfo.expiresAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* LOCKED / ACCESS REQUIRED / PENDING */
            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xs text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
                <FileLock2 className="w-7 h-7" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900">
                  {consentInfo.status === 'EXPIRED'
                    ? 'Consent Expired'
                    : consentInfo.status === 'REVOKED'
                    ? 'Access Revoked'
                    : consentInfo.status === 'DENIED'
                    ? 'Access Denied'
                    : 'Medical Records: Access Required'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {consentInfo.status === 'EXPIRED'
                    ? 'The previous consent window for this patient has expired. Submit a new request to regain access.'
                    : consentInfo.status === 'REVOKED'
                    ? 'The patient has revoked authorization for viewing their records.'
                    : consentInfo.status === 'DENIED'
                    ? 'The patient declined your previous access request.'
                    : 'Patient consent is required before viewing medical records. Consultations, diagnoses, treatments, prescriptions, and lab reports are strictly locked.'}
                </p>
              </div>

              {requestSent ? (
                <div className="p-3.5 max-w-md mx-auto bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Access Request Submitted • Awaiting Patient Consent (PENDING)</span>
                </div>
              ) : (
                <div className="pt-2">
                  <PrimaryButton
                    onClick={() => setIsModalOpen(true)}
                    icon={<KeyRound className="w-4 h-4" />}
                  >
                    Request Medical Access
                  </PrimaryButton>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-6 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  No Consultations Exposed
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  No Lab Reports Exposed
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  No Prescriptions Exposed
                </span>
              </div>
            </div>
          )}

          {/* Access Request Modal */}
          <AccessRequestModal
            patient={searchResult}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onRequestSubmitted={() => {
              setRequestSent(true);
              if (searchResult) {
                checkConsent(searchResult.id);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};
