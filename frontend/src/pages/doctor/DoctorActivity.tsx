import React, { useState, useEffect } from 'react';
import {
  Activity,
  Stethoscope,
  Eye,
  KeyRound,
  FilePlus,
  RefreshCw,
  Search,
  Filter,
  FileCheck2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  getDoctorActivityHistory,
  formatDoctorAuditEvent,
  type AuditLog,
  type AuditAction,
} from '../../services/audit';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';

export const DoctorActivity: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchActivity = async () => {
    setIsLoading(true);
    const data = await getDoctorActivityHistory();
    setLogs(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'ALL' && log.action !== filterAction) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const metaStr = JSON.stringify(log.metadata || {}).toLowerCase();
      const actionStr = log.action.toLowerCase();
      return actionStr.includes(q) || metaStr.includes(q);
    }
    return true;
  });

  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case 'VIEW_MEDICAL_RECORD':
        return <Eye className="w-4 h-4 text-blue-600" />;
      case 'REQUEST_ACCESS':
        return <KeyRound className="w-4 h-4 text-sky-600" />;
      case 'CREATE_CONSULTATION':
      case 'CREATE_DIAGNOSIS':
      case 'CREATE_TREATMENT':
      case 'CREATE_PRESCRIPTION':
        return <FilePlus className="w-4 h-4 text-indigo-600" />;
      case 'EXPIRED_CONSENT':
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        time: d.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
    } catch {
      return { date: iso, time: '' };
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-xs">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>My Clinical Activity</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60">
                Practitioner Audit Log
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly isolated activity ledger documenting all patient encounters, access requests, and clinical entries created by your credentials.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchActivity}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity by action, record title, or clinical notes..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full sm:w-auto px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
          >
            <option value="ALL">All Activity</option>
            <option value="REQUEST_ACCESS">Access Requests</option>
            <option value="VIEW_MEDICAL_RECORD">Record Views</option>
            <option value="CREATE_CONSULTATION">Consultations Created</option>
            <option value="CREATE_DIAGNOSIS">Diagnoses Created</option>
            <option value="CREATE_TREATMENT">Treatments Created</option>
            <option value="CREATE_PRESCRIPTION">Prescriptions Created</option>
            <option value="EXPIRED_CONSENT">Consent Expiries</option>
          </select>
        </div>
      </div>

      {/* Activity Logs List */}
      {isLoading ? (
        <LoadingState message="Fetching your practitioner activity history..." />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          title="No clinical activity recorded yet"
          description={
            searchQuery || filterAction !== 'ALL'
              ? 'No activities match the selected filter criteria.'
              : 'When you request patient records or document consultations, diagnoses, treatments, and prescriptions, your actions will be recorded here.'
          }
          icon={<Stethoscope className="w-8 h-8 text-slate-400" />}
        />
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const formatted = formatDoctorAuditEvent(log);
            const ts = formatTimestamp(log.created_at);

            return (
              <div
                key={log.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getActionIcon(log.action)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 leading-snug">
                        {formatted.title}
                      </span>
                      {log.record_type && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700">
                          {log.record_type}
                        </span>
                      )}
                      {log.status && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            log.status === 'SUCCESS' || log.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {log.status}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {formatted.description}
                    </p>

                    {/* Safe metadata summary if present */}
                    {log.reason && (
                      <p className="text-[11px] text-slate-500 italic">
                        Clinical reason: &quot;{log.reason}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 flex-shrink-0 text-right">
                  <span className="text-xs font-semibold text-slate-800">{ts.date}</span>
                  <span className="text-[11px] text-slate-400 font-mono">{ts.time}</span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 mt-1">
                    <FileCheck2 className="w-3 h-3" />
                    <span>Signed</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default DoctorActivity;
