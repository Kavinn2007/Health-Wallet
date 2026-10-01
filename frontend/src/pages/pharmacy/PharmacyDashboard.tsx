import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  Pill,
  Search,
  Bell,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getPharmacyPrescriptions,
  getPharmacyDashboardStats,
  type AuthorizedPrescriptionView,
} from '../../services/pharmacy';
import { getUserNotifications, type AppNotification } from '../../services/notifications';
import { LoadingState } from '../../components/ui/LoadingState';
import { Badge } from '../../components/ui/Badge';

export const PharmacyDashboard: React.FC = () => {
  const { pharmacyProfile } = useAuth();
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState<AuthorizedPrescriptionView[]>([]);
  const [stats, setStats] = useState({ pendingCount: 0, dispensedCount: 0, partiallyDispensedCount: 0 });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!pharmacyProfile?.id) return;
      setIsLoading(true);
      try {
        const [rxList, dashStats, notifs] = await Promise.all([
          getPharmacyPrescriptions(pharmacyProfile.id),
          getPharmacyDashboardStats(pharmacyProfile.id),
          getUserNotifications(),
        ]);
        setPrescriptions(rxList.slice(0, 5));
        setStats(dashStats);
        setNotifications(notifs.slice(0, 5));
      } catch (err) {
        console.warn('Error loading pharmacy dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [pharmacyProfile?.id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Loading pharmacy dashboard..." />
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
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {pharmacyProfile?.pharmacy_name || 'Pharmacy Console'}
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Accredited Chemist
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Logged in as <strong className="text-slate-800">{pharmacyProfile?.pharmacist_name || 'Pharmacist'}</strong> &bull; Reg:{' '}
                <span className="font-mono font-semibold text-slate-700">{pharmacyProfile?.registration_number || 'N/A'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/pharmacy/prescriptions"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Pill className="w-4 h-4" />
              <span>Find Prescription</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Suggested Quick Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Fulfillment */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Fulfillment</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{stats.pendingCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Active prescriptions awaiting dispense</p>
          </div>
        </div>

        {/* Card 2: Dispensed */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dispensed Today</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{stats.dispensedCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Fully completed fulfillments</p>
          </div>
        </div>

        {/* Card 3: Partially Dispensed */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Partially Dispensed</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{stats.partiallyDispensedCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Partial medication courses</p>
          </div>
        </div>

        {/* Card 4: Notifications */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In-App Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{unreadCount} unread</div>
            <p className="text-[11px] text-slate-400 mt-0.5">System and sharing alerts</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Prescriptions & Patient Search Quick Launcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Prescriptions Shared */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Recent Authorized Prescriptions</h2>
              <p className="text-xs text-slate-500">Prescriptions actively shared with your pharmacy</p>
            </div>
            <Link
              to="/pharmacy/prescriptions"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {prescriptions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <Pill className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No Prescriptions Shared Yet</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                When patients share their doctor-issued prescriptions with your pharmacy, they will appear here ready for dispensing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((rx) => (
                <div
                  key={rx.prescription_id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {rx.medicine_name}
                      </p>
                      {rx.dosage && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700">
                          {rx.dosage}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Patient: <strong className="text-slate-700">{rx.patient_name}</strong> &bull;{' '}
                      <span className="font-mono text-slate-600">{rx.health_wallet_id}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Doctor: {rx.doctor_name} &bull; Prescribed: {rx.prescribed_date}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge
                      variant={
                        rx.dispensing_status === 'DISPENSED'
                          ? 'success'
                          : rx.dispensing_status === 'PARTIALLY_DISPENSED'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {rx.dispensing_status || 'Pending Dispense'}
                    </Badge>
                    <Link
                      to={`/pharmacy/prescriptions`}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition-colors"
                    >
                      Process
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Search by Health Wallet ID & Security Assurance */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-soft space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Find Patient Prescriptions</h3>
              <p className="text-xs text-slate-500 mt-1">
                Lookup patient by Health Wallet ID to view actively shared prescriptions.
              </p>
            </div>
            <Link
              to="/pharmacy/patients"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Lookup Health Wallet ID</span>
            </Link>
          </div>

          <div className="bg-emerald-950 text-white rounded-3xl p-6 shadow-soft space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy & Access Control</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pharmacies cannot browse full patient history, consultations, diagnoses, or lab reports. You may only view and dispense prescriptions explicitly shared by the patient.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
