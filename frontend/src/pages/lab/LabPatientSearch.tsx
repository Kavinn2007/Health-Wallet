import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  Shield,
  FilePlus2,
  Droplet,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { searchPatientForLab } from '../../services/lab';
import { type MinimalPatientInfo } from '../../services/supabase';
import { PrimaryButton } from '../../components/ui/PrimaryButton';

export const LabPatientSearch: React.FC = () => {
  const [hwId, setHwId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [foundPatient, setFoundPatient] = useState<MinimalPatientInfo | null>(null);

  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFoundPatient(null);

    const clean = hwId.trim().toUpperCase();
    if (!clean) {
      setErrorMessage('Please enter a Health Wallet ID.');
      return;
    }

    setIsSearching(true);
    try {
      const res = await searchPatientForLab(clean);
      if (res.success && res.patient) {
        setFoundPatient(res.patient);
      } else {
        setErrorMessage(res.error || 'No patient found with this Health Wallet ID.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected search error.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateReport = () => {
    if (!foundPatient) return;
    navigate(
      `/lab/reports/new?patientId=${foundPatient.id}&hwId=${foundPatient.health_wallet_id}&patientName=${encodeURIComponent(
        foundPatient.patient_name
      )}&bloodGroup=${encodeURIComponent(foundPatient.blood_group)}&state=${encodeURIComponent(
        foundPatient.state
      )}`
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Find Patient
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Verify patient identity using their unique national Health Wallet ID before creating a lab report.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-soft">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label
              htmlFor="hwIdInput"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
            >
              Enter Patient Health Wallet ID
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  id="hwIdInput"
                  type="text"
                  required
                  placeholder="e.g. HW-TN-38236621"
                  value={hwId}
                  onChange={(e) => setHwId(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none transition-colors"
                />
              </div>

              <PrimaryButton
                type="submit"
                isLoading={isSearching}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-xs"
              >
                <span>Search Patient</span>
              </PrimaryButton>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Format: HW-[STATE]-[8 DIGITS] (e.g. HW-TN-38236621)
            </p>
          </div>
        </form>

        {errorMessage && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}
      </div>

      {/* Verified Patient Result Card (Strictly Limited to 4 fields) */}
      {foundPatient && (
        <div className="bg-white border-2 border-teal-500/30 rounded-3xl p-6 sm:p-7 shadow-soft animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-2 text-teal-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Patient Verified in National Registry</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-200/60">
              Identity Confirmed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Field 1: Patient Name */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Patient Name
              </span>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="truncate">{foundPatient.patient_name}</span>
              </div>
            </div>

            {/* Field 2: Health Wallet ID */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Health Wallet ID
              </span>
              <div className="flex items-center gap-1.5 font-bold font-mono text-teal-800 text-xs">
                <Shield className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>{foundPatient.health_wallet_id}</span>
              </div>
            </div>

            {/* Field 3: Blood Group */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Blood Group
              </span>
              <div className="flex items-center gap-1.5 font-bold text-rose-700 text-xs">
                <Droplet className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{foundPatient.blood_group}</span>
              </div>
            </div>

            {/* Field 4: State */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                State / Region
              </span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>{foundPatient.state}</span>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex items-center gap-2 mb-6">
            <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>
              Per security policy, Aadhaar numbers, phone numbers, and past clinical histories are hidden from diagnostic staff.
            </span>
          </div>

          {/* Action CTA */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleCreateReport}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Create Lab Report for this Patient &rarr;</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default LabPatientSearch;
