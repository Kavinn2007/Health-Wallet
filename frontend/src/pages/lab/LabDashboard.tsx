import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  FilePlus2,
  Search,
  Bell,
  Clock,
  ArrowRight,
  FileText,
  Calendar,
  Building2,
  ShieldCheck,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLabRecentReports, type LabReportDetailView } from '../../services/lab';
import { getUserNotifications, type AppNotification } from '../../services/notifications';
import { LoadingState } from '../../components/ui/LoadingState';
import { Badge } from '../../components/ui/Badge';

export const LabDashboard: React.FC = () => {
  const { labProfile } = useAuth();
  const navigate = useNavigate();

  const [recentReports, setRecentReports] = useState<LabReportDetailView[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const [reports, notifs] = await Promise.all([
          getLabRecentReports(),
          getUserNotifications(),
        ]);
        setRecentReports(reports);
        setNotifications(notifs.slice(0, 5));
      } catch (err) {
        console.warn('Error loading lab dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Loading laboratory dashboard..." />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0">
              <FlaskConical className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {labProfile?.laboratory_name || 'Laboratory Console'}
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60">
                  Accredited Facility
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Logged in as <strong className="text-slate-800">{labProfile?.lab_name || 'Staff Member'}</strong> &bull; Registration:{' '}
                <span className="font-mono font-semibold text-slate-700">{labProfile?.registration_number || 'N/A'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/lab/reports/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Create Lab Report</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Suggested Quick Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Create Lab Report */}
        <Link
          to="/lab/reports/new"
          className="group bg-white border border-slate-200/90 hover:border-teal-400 rounded-3xl p-6 shadow-soft hover:shadow-card transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Create Lab Report</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verify patient via Health Wallet ID, enter structured test findings, and upload original reports.
            </p>
          </div>
          <div className="mt-5 flex items-center text-xs font-bold text-teal-600 group-hover:text-teal-700">
            <span>New Diagnostic Report</span>
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Find Patient */}
        <Link
          to="/lab/patients"
          className="group bg-white border border-slate-200/90 hover:border-teal-400 rounded-3xl p-6 shadow-soft hover:shadow-card transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Find Patient</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Quickly verify patient identity using their unique Health Wallet ID before issuing tests.
            </p>
          </div>
          <div className="mt-5 flex items-center text-xs font-bold text-sky-600 group-hover:text-sky-700">
            <span>Verify Patient Identity</span>
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3: Notifications */}
        <Link
          to="/lab/notifications"
          className="group bg-white border border-slate-200/90 hover:border-teal-400 rounded-3xl p-6 shadow-soft hover:shadow-card transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              System alerts, report deliveries, and national health network updates.
            </p>
          </div>
          <div className="mt-5 flex items-center text-xs font-bold text-purple-600 group-hover:text-purple-700">
            <span>View Notification Feed</span>
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Recent Reports Created Table / List */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-soft">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Reports Created</h2>
            <p className="text-xs text-slate-500">
              Laboratory reports successfully issued to patient health wallets
            </p>
          </div>
          <Link
            to="/lab/reports/new"
            className="text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors"
          >
            + Create New Report
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-slate-100">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No laboratory reports created yet</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Find a patient using their Health Wallet ID and submit diagnostic findings to create the first report.
            </p>
            <Link
              to="/lab/reports/new"
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Create First Report</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pl-2">Report Type</th>
                  <th className="pb-3">Patient Name</th>
                  <th className="pb-3">Health Wallet ID</th>
                  <th className="pb-3">Report Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {recentReports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 pl-2 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <span>{r.report_type}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-800">
                      {r.patient?.patient_name || 'Verified Patient'}
                    </td>
                    <td className="py-3.5 font-mono text-[11px] text-slate-600">
                      {r.patient?.health_wallet_id || 'HW-ID'}
                    </td>
                    <td className="py-3.5 text-slate-500 font-mono text-[11px]">
                      {r.report_date}
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <CheckCircle2 className="w-3 h-3" />
                        Delivered
                      </span>
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/lab/reports/${r.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security notice banner */}
      <div className="p-4 bg-teal-50/40 rounded-2xl border border-teal-100/80 flex items-center justify-between text-xs text-teal-900">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span>
            Lab access is restricted to patient identification and report creation. Past medical histories are protected by patient consent.
          </span>
        </div>
      </div>
    </div>
  );
};
export default LabDashboard;
