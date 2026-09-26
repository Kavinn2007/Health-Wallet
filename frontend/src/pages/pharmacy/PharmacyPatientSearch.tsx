import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  Shield,
  Pill,
  Droplet,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { searchPatientForPharmacy } from '../../services/pharmacy';
import { type MinimalPatientInfo } from '../../services/supabase';
import { PrimaryButton } from '../../components/ui/PrimaryButton';

export const PharmacyPatientSearch: React.FC = () => {
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
      const patient = await searchPatientForPharmacy(clean);
      if (patient) {
        setFoundPatient(patient);
      } else {
        setErrorMessage('No patient found with this Health Wallet ID.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected search error.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewPrescriptions = () => {
    if (!foundPatient) return;
    navigate(`/pharmacy/prescriptions?hwid=${encodeURIComponent(foundPatient.health_wallet_id)}`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Find Patient
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Verify patient identity using their unique national Health Wallet ID before fulfilling prescriptions.
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
                  placeholder="e.g. HW-TN-10293847"
                  value={hwId}
                  onChange={(e) => setHwId(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                />
              </div>

              <PrimaryButton
                type="submit"
                disabled={isSearching}
                className="px-6 py-2.5 text-xs font-bold"
                icon={<Search className="w-4 h-4" />}
              >
                {isSearching ? 'Searching...' : 'Search Patient'}
              </PrimaryButton>
            </div>
          </div>
        </form>

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Search Result - Minimal Projection Strictly Enforced */}
      {foundPatient && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-soft space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Patient Identity Verified</span>
            </div>
            <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
              {foundPatient.health_wallet_id}
            </span>
          </div>

          {/* Minimal 4 Allowed Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Field 1: Patient Name */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5" />
                Patient Name
              </span>
              <p className="text-sm font-bold text-slate-900 truncate">
                {foundPatient.patient_name}
              </p>
            </div>

            {/* Field 2: Health Wallet ID */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5" />
                Health Wallet ID
              </span>
              <p className="text-sm font-mono font-bold text-emerald-800 truncate">
                {foundPatient.health_wallet_id}
              </p>
            </div>

            {/* Field 3: Blood Group */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5 mb-1">
                <Droplet className="w-3.5 h-3.5 text-rose-500" />
                Blood Group
              </span>
              <p className="text-sm font-bold text-slate-900">
                {foundPatient.blood_group || 'Not Specified'}
              </p>
            </div>

            {/* Field 4: State */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-sky-500" />
                State
              </span>
              <p className="text-sm font-bold text-slate-900 truncate">
                {foundPatient.state || 'Not Specified'}
              </p>
            </div>
          </div>

          {/* Privacy Boundary Banner */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-slate-500 text-xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-slate-600">
              <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Full mobile number, Aadhaar, and clinical medical history are withheld.</span>
            </div>

            <PrimaryButton
              onClick={handleViewPrescriptions}
              className="px-5 py-2.5 text-xs font-bold"
              icon={<Pill className="w-4 h-4" />}
            >
              View Authorized Prescriptions
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
};
