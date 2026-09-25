import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  User,
  ShieldCheck,
  Calendar,
  Lock,
} from 'lucide-react';
import { getDoctorAccessRequests } from '../../services/doctors';
import { type AccessRequest, type AccessRequestStatus } from '../../services/supabase';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';

export const DoctorAccessRequests: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadRequests = async () => {
    setIsLoading(true);
    const data = await getDoctorAccessRequests();
    setRequests(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Access Requests
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track clinical record access requests initiated by you.
          </p>
        </div>

        <Link to="/doctor/patients">
          <PrimaryButton icon={<Search className="w-4 h-4" />}>
            New Access Request
          </PrimaryButton>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {['ALL', 'PENDING', 'APPROVED', 'DENIED', 'EXPIRED'].map((tab) => {
            const count =
              tab === 'ALL'
                ? requests.length
                : requests.filter((r) => r.status === tab).length;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === tab
                    ? 'bg-sky-50 text-sky-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab === 'ALL' ? 'All Requests' : tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    statusFilter === tab
                      ? 'bg-sky-200/70 text-sky-900'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={loadRequests}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          Refresh Status
        </button>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <LoadingState message="Loading access requests from Supabase..." />
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          title={statusFilter === 'ALL' ? 'No Access Requests Yet' : `No ${statusFilter} Requests`}
          description={
            statusFilter === 'ALL'
              ? 'You have not submitted any medical record access requests. Search a patient by Health Wallet ID to request access.'
              : `There are currently no requests with status: ${statusFilter}.`
          }
          icon={<KeyRound className="w-8 h-8 text-slate-400" />}
          action={
            <Link to="/doctor/patients">
              <PrimaryButton size="sm" icon={<Search className="w-3.5 h-3.5" />}>
                Find Patient
              </PrimaryButton>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'PENDING';
            const isApproved = req.status === 'APPROVED';
            const isDenied = req.status === 'DENIED';

            return (
              <div
                key={req.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-sm">
                      {req.patient?.patient_name ? req.patient.patient_name.charAt(0) : 'P'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {req.patient?.patient_name || 'Patient'}
                      </h3>
                      <p className="text-xs font-mono font-semibold text-sky-800">
                        {req.patient?.health_wallet_id || req.patient_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPending
                          ? 'bg-amber-100 text-amber-800'
                          : isDenied
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isApproved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      {isPending && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                      {isDenied && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                      <span>{req.status}</span>
                    </span>
                  </div>
                </div>

                {/* Reason & Details */}
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block text-[11px]">
                      Clinical Reason for Request:
                    </span>
                    <p className="text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {req.reason}
                    </p>
                  </div>

                  {/* Requested Categories */}
                  <div>
                    <span className="text-slate-500 font-semibold block text-[11px] mb-1">
                      Requested Medical Categories:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {req.requested_record_types.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-100 text-[11px] font-semibold"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Requested:{' '}
                      {new Date(req.requested_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Duration: {req.duration_hours} Hours
                    </span>
                  </div>

                  <div>
                    {isPending && (
                      <span className="text-amber-700 font-semibold">
                        Awaiting Patient Consent in Health Wallet App
                      </span>
                    )}
                    {isApproved && (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Consent Active until{' '}
                        {new Date(req.expires_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
