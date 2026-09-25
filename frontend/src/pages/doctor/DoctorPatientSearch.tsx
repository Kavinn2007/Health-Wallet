import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
} from 'lucide-react';
import { searchPatientByHealthWalletId } from '../../services/doctors';
import { type MinimalPatientInfo } from '../../services/supabase';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
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
    } else {
      setSearchResult(null);
      setErrorMessage(res.error || 'Patient not found');
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
                <PrimaryButton
                  onClick={() => setIsModalOpen(true)}
                  icon={<KeyRound className="w-4 h-4" />}
                >
                  Request Medical Access
                </PrimaryButton>
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

          {/* PROTECTED MEDICAL RECORDS SECTION (GATED) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xs text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
              <FileLock2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900">
                Medical Records: Access Required
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Patient consent is required before viewing medical records. Consultations, diagnoses, treatments, prescriptions, and lab reports are strictly locked.
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

          {/* Access Request Modal */}
          <AccessRequestModal
            patient={searchResult}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onRequestSubmitted={() => {
              setRequestSent(true);
            }}
          />
        </div>
      )}
    </div>
  );
};
