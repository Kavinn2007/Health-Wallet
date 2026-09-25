import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  KeyRound,
  Search,
  ArrowRight,
  ShieldAlert,
  Building2,
  FileCheck2,
  Stethoscope,
  Activity,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDoctorAccessRequests } from '../../services/doctors';
import { type AccessRequest } from '../../services/supabase';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';

export const DoctorDashboard: React.FC = () => {
  const { doctorProfile } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickSearchHwId, setQuickSearchHwId] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadRequests = async () => {
      setIsLoading(true);
      const data = await getDoctorAccessRequests();
      if (isMounted) {
        setRequests(data);
        setIsLoading(false);
      }
    };
    loadRequests();
    return () => {
      isMounted = false;
    };
  }, []);

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter(
    (r) => r.status === 'APPROVED' && new Date(r.expires_at).getTime() > Date.now()
  ).length;
  const deniedCount = requests.filter((r) => r.status === 'DENIED').length;
  const expiredCount = requests.filter(
    (r) =>
      r.status === 'EXPIRED' ||
      (r.status === 'APPROVED' && new Date(r.expires_at).getTime() <= Date.now())
  ).length;

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickSearchHwId.trim();
    if (clean) {
      navigate(`/doctor/patients?hwid=${encodeURIComponent(clean)}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                <Stethoscope className="w-5 h-5" />
              </span>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                Doctor Dashboard
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span className="font-bold text-slate-900 text-sm">
                {doctorProfile?.doctor_name || 'Dr. Medical Practitioner'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono bg-sky-50 text-sky-800 px-2 py-0.5 rounded font-semibold border border-sky-100">
                Reg: {doctorProfile?.registration_number}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-slate-700">
                {doctorProfile?.specialization}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-slate-600">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {doctorProfile?.hospital_name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/doctor/patients">
              <PrimaryButton icon={<Search className="w-4 h-4" />}>
                Find Patient
              </PrimaryButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Search Patient Bar */}
      <div className="bg-gradient-to-r from-sky-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md">
        <div className="max-w-2xl space-y-3">
          <h2 className="text-lg font-bold tracking-tight">
            Patient Identity &amp; Consent Verification
          </h2>
          <p className="text-xs text-sky-200 leading-relaxed">
            Enter a patient&apos;s verified Health Wallet ID to look up minimal identity and initiate consent-gated medical access requests.
          </p>

          <form onSubmit={handleQuickSearch} className="flex gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={quickSearchHwId}
                onChange={(e) => setQuickSearchHwId(e.target.value)}
                placeholder="Enter Health Wallet ID (e.g. HW-TN-38236621)"
                className="w-full pl-10 pr-3 py-2.5 bg-white text-slate-900 rounded-xl text-sm font-mono placeholder:text-slate-400 placeholder:font-sans outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Search</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Metric Cards / Quick Actions (4 Columns for Real Consent Stats) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Requests */}
        <Link
          to="/doctor/access-requests"
          className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-amber-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base text-amber-900">{pendingCount}</span>
          </div>
          <div className="mt-3">
            <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
              Pending Requests
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting patient consent</p>
          </div>
        </Link>

        {/* Approved Consents */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base text-emerald-900">{approvedCount}</span>
          </div>
          <div className="mt-3">
            <h3 className="text-xs font-bold text-slate-900">Approved Access</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Active consent windows</p>
          </div>
        </div>

        {/* Denied Requests */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base text-rose-900">{deniedCount}</span>
          </div>
          <div className="mt-3">
            <h3 className="text-xs font-bold text-slate-900">Denied Requests</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Declined by patient</p>
          </div>
        </div>

        {/* Expired Access */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
              <Activity className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base text-slate-800">{expiredCount}</span>
          </div>
          <div className="mt-3">
            <h3 className="text-xs font-bold text-slate-900">Expired Access</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Time window elapsed</p>
          </div>
        </div>
      </div>

      {/* Recent Patients / Access Requests Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Recent Patients & Access Requests</h3>
          </div>
          <Link
            to="/doctor/access-requests"
            className="text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors"
          >
            View All ({requests.length}) &rarr;
          </Link>
        </div>

        {isLoading ? (
          <LoadingState message="Loading recent patient requests..." />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No Recent Patients"
            description="You have not initiated any access requests yet. Use 'Find Patient' to look up a patient's Health Wallet ID."
            icon={<UserCheck className="w-6 h-6 text-slate-400" />}
            action={
              <Link to="/doctor/patients">
                <PrimaryButton size="sm" icon={<Search className="w-3.5 h-3.5" />}>
                  Search Health Wallet ID
                </PrimaryButton>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-y border-slate-200/80">
                <tr>
                  <th className="py-2.5 px-4 font-bold">Patient</th>
                  <th className="py-2.5 px-4 font-bold">Health Wallet ID</th>
                  <th className="py-2.5 px-4 font-bold">Requested Records</th>
                  <th className="py-2.5 px-4 font-bold">Requested On</th>
                  <th className="py-2.5 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.slice(0, 5).map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {req.patient?.patient_name || 'Patient'}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-sky-700">
                      {req.patient?.health_wallet_id || req.patient_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {req.requested_record_types.map((type) => (
                          <span
                            key={type}
                            className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(req.requested_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : req.status === 'DENIED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security notice */}
      <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3 text-xs text-sky-900">
        <ShieldAlert className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Medical Data Access Security Policy</p>
          <p className="text-sky-800">
            Doctors cannot view patient consultations, diagnoses, treatments, prescriptions, or lab reports until the patient has reviewed and approved the access request. Searching a Health Wallet ID only provides basic patient identity.
          </p>
        </div>
      </div>
    </div>
  );
};
