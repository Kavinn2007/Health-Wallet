import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Pill,
  ScanLine,
  ShieldAlert,
  QrCode,
  Activity,
  UserCheck,
  Sparkles,
  Inbox,
  Plus,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { HealthCard } from '../components/ui/HealthCard';
import { Badge } from '../components/ui/Badge';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import {
  getPatientMedicalRecords,
  type MedicalRecord,
} from '../services/healthRecords';
import { getPatientAccessRequests } from '../services/consent';
import { KeyRound, Stethoscope } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  const patientName = profile?.patient_name || 'Verified Patient';
  const healthWalletId = profile?.health_wallet_id || 'HW-TN-XXXXXXXX';
  const bloodGroup = profile?.blood_group || 'B+';
  const state = profile?.state || 'Tamil Nadu';
  const stateCode = profile?.state_code || 'TN';
  const mobile = profile?.mobile_number || 'XXXXXXXXXX';
  const aadhaarMasked = profile?.aadhaar_last_four
    ? `XXXX XXXX ${profile.aadhaar_last_four}`
    : 'XXXX XXXX 9901';

  useEffect(() => {
    let isMounted = true;
    const loadDashboardRecords = async () => {
      if (!profile?.id) {
        setIsLoadingRecords(false);
        return;
      }
      try {
        const [recordsRes, reqs] = await Promise.all([
          getPatientMedicalRecords(profile.id),
          getPatientAccessRequests(profile.id),
        ]);
        if (isMounted) {
          if (recordsRes.data) setRecords(recordsRes.data);
          const pending = reqs.filter((r) => r.status === 'PENDING').length;
          setPendingRequestsCount(pending);
        }
      } catch (err) {
        console.warn('Dashboard records fetch error:', err);
      } finally {
        if (isMounted) setIsLoadingRecords(false);
      }
    };

    loadDashboardRecords();
    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  const activeMedsCount = records.filter((r) => r.record_type === 'PRESCRIPTION').length;
  const labReportsCount = records.filter((r) => r.record_type === 'LAB_REPORT').length;
  const recentRecords = records.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Patient Welcome & ID Card Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sky-900 via-sky-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-card">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="primary" className="bg-sky-400/20 text-sky-200 border-sky-300/30">
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                Verified Patient Node
              </Badge>
              <span className="text-xs text-sky-200/80 font-mono">
                {state} ({stateCode}) &bull; ABDM Integrated
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, <span className="text-sky-300">{patientName}</span>
            </h1>

            <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed">
              Your unified Health Wallet holds all verified clinical records, prescriptions, and
              instant emergency consent tokens.
            </p>

            <div className="pt-2 flex items-center gap-3 flex-wrap text-xs">
              <div className="bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                <span className="text-sky-200">Health Wallet ID:</span>
                <span className="font-mono font-bold tracking-wider">{healthWalletId}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                <span className="text-sky-200">Blood Group:</span>
                <span className="font-bold text-rose-300">{bloodGroup}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                <span className="text-sky-200">Aadhaar:</span>
                <span className="font-mono text-emerald-300 font-semibold">{aadhaarMasked}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:self-center">
            <Link to="/scan-report">
              <PrimaryButton
                size="md"
                className="w-full sm:w-auto bg-sky-500 hover:bg-sky-400 shadow-md"
                icon={<ScanLine className="w-4 h-4" />}
              >
                Scan Medical Report
              </PrimaryButton>
            </Link>
            <Link to="/offline-wallet">
              <SecondaryButton
                size="md"
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white/20"
                icon={<QrCode className="w-4 h-4" />}
              >
                Show QR
              </SecondaryButton>
            </Link>
          </div>
        </div>

        {/* Subtle background decorative shapes */}
        <div className="absolute right-0 -bottom-10 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Doctor Access Requests Notification Card */}
      {pendingRequestsCount > 0 ? (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Doctor Access Requests</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                  {pendingRequestsCount} Pending
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mt-0.5">
                {pendingRequestsCount} doctor{pendingRequestsCount > 1 ? 's are' : ' is'} requesting access to your medical records
              </p>
            </div>
          </div>
          <Link to="/access-requests">
            <PrimaryButton size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
              Review Requests
            </PrimaryButton>
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 px-4 shadow-xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-600">
            <KeyRound className="w-4 h-4 text-slate-400" />
            <div>
              <span className="font-bold text-slate-800">Doctor Access Requests: </span>
              <span className="text-slate-500">No pending access requests</span>
            </div>
          </div>
          <Link to="/access-requests" className="text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1">
            <span>Manage Consents</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Key Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Medical Records"
          value={String(records.length)}
          subtitle={
            records.length === 0
              ? 'Awaiting health records'
              : records.length === 1
              ? '1 record on timeline'
              : `${records.length} records on timeline`
          }
          icon={<FileText className="w-5 h-5" />}
          trend={{ text: records.length > 0 ? 'Active timeline' : 'Ready for intake', isPositive: true }}
          iconBgColor="bg-sky-50 text-sky-600 border border-sky-100"
        />
        <StatCard
          label="Active Medicines"
          value={String(activeMedsCount)}
          subtitle={activeMedsCount > 0 ? `${activeMedsCount} active regimens` : 'No active prescriptions'}
          icon={<Pill className="w-5 h-5" />}
          trend={{ text: activeMedsCount > 0 ? 'Regimen active' : 'Clean regimen', isPositive: true }}
          iconBgColor="bg-emerald-50 text-emerald-600 border border-emerald-100"
        />
        <StatCard
          label="Verified Lab Reports"
          value={String(labReportsCount)}
          subtitle={labReportsCount > 0 ? `${labReportsCount} test reports` : 'No reports yet'}
          icon={<Activity className="w-5 h-5" />}
          trend={{ text: 'NABL network linked', isPositive: true }}
          iconBgColor="bg-blue-50 text-blue-600 border border-blue-100"
        />
        <StatCard
          label="Emergency Access"
          value="Ready"
          subtitle="ABDM Protocol Active"
          icon={<ShieldAlert className="w-5 h-5 text-rose-600" />}
          trend={{ text: 'Break-glass enabled', isPositive: true }}
          iconBgColor="bg-rose-50 text-rose-600 border border-rose-100"
        />
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/scan-report"
          className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-soft hover:shadow-card hover:border-sky-300 transition-all text-center flex flex-col items-center gap-2.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
              Scan Report
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Upload new document</p>
          </div>
        </Link>

        <Link
          to="/health-records"
          className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-soft hover:shadow-card hover:border-sky-300 transition-all text-center flex flex-col items-center gap-2.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Health Timeline
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">View all past records</p>
          </div>
        </Link>

        <Link
          to="/offline-wallet"
          className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-soft hover:shadow-card hover:border-sky-300 transition-all text-center flex flex-col items-center gap-2.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              Offline Health ID
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">QR without internet</p>
          </div>
        </Link>

        <Link
          to="/emergency"
          className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-soft hover:shadow-card hover:border-rose-300 transition-all text-center flex flex-col items-center gap-2.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
              Emergency SOS
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Instant medical alert</p>
          </div>
        </Link>
      </div>

      {/* Main Content Split: Real Medical Records & Regimen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Clinical Records */}
        <div className="lg:col-span-2 space-y-6">
          <HealthCard
            title="Recent Records"
            subtitle="Verified records uploaded to your Health Wallet timeline"
            action={
              records.length > 0 ? (
                <Link
                  to="/health-records"
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : undefined
            }
          >
            {isLoadingRecords ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Loading recent records...
              </div>
            ) : records.length === 0 ? (
              <EmptyState
                icon={<Inbox className="w-6 h-6" />}
                title="No health records uploaded yet"
                description="Your unified medical timeline is empty. Add consultations, prescriptions, or laboratory tests to view them here."
                action={
                  <Link to="/health-records">
                    <PrimaryButton size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                      Go to Health Records
                    </PrimaryButton>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {recentRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-center flex-shrink-0">
                        {record.record_type === 'CONSULTATION' ? (
                          <Activity className="w-4 h-4 text-sky-600" />
                        ) : record.record_type === 'LAB_REPORT' ? (
                          <FileText className="w-4 h-4 text-blue-600" />
                        ) : record.record_type === 'PRESCRIPTION' ? (
                          <Pill className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {record.title}
                          </h4>
                          <Badge size="sm" variant="neutral">
                            {record.record_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {record.provider_name || record.hospital_name || 'Patient Document'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span>{record.record_date}</span>
                    </div>
                  </div>
                ))}

                <div className="pt-2 text-center">
                  <Link
                    to="/health-records"
                    className="text-xs font-bold text-sky-600 hover:text-sky-700"
                  >
                    Explore full chronological timeline &rarr;
                  </Link>
                </div>
              </div>
            )}
          </HealthCard>

          {/* AI Insights & Scanning Promotion Card */}
          <div className="p-5 bg-gradient-to-r from-sky-50 to-blue-50/50 border border-sky-100 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Digitize your existing paper medical records
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Scan and organize prescriptions, discharge summaries, and lab reports into your
                  secure Health Wallet.
                </p>
              </div>
            </div>
            <Link to="/scan-report" className="flex-shrink-0">
              <PrimaryButton size="sm" icon={<ScanLine className="w-3.5 h-3.5" />}>
                Scan Now
              </PrimaryButton>
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Active Medications & Family Quick Switch */}
        <div className="space-y-6">
          <HealthCard
            title="Active Prescription"
            subtitle="Current medication regimen"
            action={
              activeMedsCount > 0 ? (
                <Link
                  to="/health-records"
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  View
                </Link>
              ) : undefined
            }
          >
            {activeMedsCount === 0 ? (
              <div className="text-center py-6 px-3 bg-slate-50/70 rounded-xl border border-slate-100">
                <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No Active Medications</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Prescriptions added to your Health Wallet will automatically link here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {records
                  .filter((r) => r.record_type === 'PRESCRIPTION')
                  .slice(0, 3)
                  .map((rx) => (
                    <div
                      key={rx.id}
                      className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-emerald-950">{rx.title}</p>
                        <p className="text-[11px] text-emerald-700">
                          {rx.provider_name || 'Prescription'}
                        </p>
                      </div>
                      <Badge variant="success" size="sm">
                        Active
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </HealthCard>

          <HealthCard
            title="Emergency ICE Card"
            subtitle="Rapid response medical summary"
            action={
              <Link to="/emergency" className="text-xs font-bold text-rose-600 hover:underline">
                Emergency
              </Link>
            }
          >
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Blood Type</span>
                <span className="font-bold text-rose-600">{bloodGroup} (Rh Positive)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Allergies</span>
                <span className="font-semibold text-slate-800">None Recorded</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Registered Mobile</span>
                <span className="font-mono font-semibold text-slate-800">+91 {mobile}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Break-Glass SOS</span>
                <span className="font-semibold text-emerald-600">Enabled</span>
              </div>
            </div>
          </HealthCard>
        </div>
      </div>
    </div>
  );
};
