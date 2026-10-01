import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  UserCheck,
  Heart,
  Droplet,
  Calendar,
  Pill,
  Activity,
  FileText,
  AlertTriangle,
  Stethoscope,
  RefreshCw,
  Clock,
  ArrowRight,
  ScanLine,
  ShieldAlert,
  Building,
  CheckCircle2,
  XCircle,
  HelpCircle,
  History,
} from 'lucide-react';
import { HealthCard } from '../components/ui/HealthCard';
import { Badge } from '../components/ui/Badge';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  getWalletSummary,
  type WalletSummaryData,
} from '../services/walletSummary';

export const WalletSummary: React.FC = () => {
  const [summary, setSummary] = useState<WalletSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSummary = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getWalletSummary();
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSummary(res.data);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred while loading your wallet summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="bg-slate-900/40 rounded-3xl p-8 border border-slate-800 animate-pulse">
          <div className="h-6 w-48 bg-slate-800 rounded-md mb-4" />
          <div className="h-10 w-72 bg-slate-800 rounded-md mb-3" />
          <div className="h-4 w-96 bg-slate-800 rounded-md" />
        </div>

        {/* Overview Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
              <div className="h-4 w-24 bg-slate-200 rounded-md mb-2" />
              <div className="h-6 w-32 bg-slate-200 rounded-md" />
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white border border-slate-200 rounded-2xl p-6 animate-pulse" />
          <div className="h-64 bg-white border border-slate-200 rounded-2xl p-6 animate-pulse" />
        </div>
      </div>
    );
  }

  if (errorMessage || !summary) {
    return (
      <div className="py-12">
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8 text-rose-500" />}
          title="Unable to Load Health Wallet Summary"
          description={errorMessage || 'We could not retrieve your unified wallet records at this time.'}
          action={
            <PrimaryButton
              size="md"
              onClick={fetchSummary}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Retry
            </PrimaryButton>
          }
        />
      </div>
    );
  }

  const {
    identity,
    health_overview,
    medical_activity,
    appointments,
    donation_status,
    recent_activity,
  } = summary;

  const hasAllergies =
    health_overview.allergies &&
    health_overview.allergies.toLowerCase() !== 'none' &&
    health_overview.allergies.toLowerCase() !== 'no known allergies';

  const hasCriticalConditions =
    health_overview.critical_conditions &&
    health_overview.critical_conditions.toLowerCase() !== 'none';

  return (
    <div className="space-y-6">
      {/* 1. HEALTH WALLET HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-sky-900/40">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="primary" className="bg-sky-400/20 text-sky-200 border-sky-300/30">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-sky-400" />
                Unified Health Wallet
              </Badge>
              <Badge variant="neutral" className="bg-white/10 text-slate-200 border-white/10 font-mono text-xs">
                ABDM Verified
              </Badge>
              <span className="text-xs text-sky-200/80 font-mono">
                {identity.state} {identity.state_code ? `(${identity.state_code})` : ''}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {identity.patient_name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Consolidated medical overview including clinical history, active prescriptions,
              consultations, appointments, and voluntary donation registrations.
            </p>

            <div className="pt-1 flex items-center gap-3 flex-wrap text-xs">
              <div className="bg-white/10 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/15 flex items-center gap-2">
                <span className="text-sky-300 font-medium">Health Wallet ID:</span>
                <span className="font-mono font-bold tracking-wider">{identity.health_wallet_id}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/15 flex items-center gap-2">
                <span className="text-sky-300 font-medium">Blood Group:</span>
                <span className="font-bold text-rose-300">{identity.blood_group}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/15 flex items-center gap-2">
                <span className="text-sky-300 font-medium">Gender:</span>
                <span className="font-semibold text-slate-200">{identity.gender}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:self-center">
            <Link to="/appointments">
              <PrimaryButton
                size="md"
                className="w-full sm:w-auto bg-sky-500 hover:bg-sky-400 shadow-md"
                icon={<Calendar className="w-4 h-4" />}
              >
                Book Appointment
              </PrimaryButton>
            </Link>
            <Link to="/scan-report">
              <SecondaryButton
                size="md"
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white/20"
                icon={<ScanLine className="w-4 h-4" />}
              >
                Scan Record
              </SecondaryButton>
            </Link>
            <Link to="/emergency">
              <SecondaryButton
                size="md"
                className="w-full sm:w-auto bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-400/30"
                icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
              >
                Emergency ICE
              </SecondaryButton>
            </Link>
          </div>
        </div>

        {/* Ambient glow */}
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. HEALTH OVERVIEW STATS & ALERTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Allergies Card */}
        <div className={`p-4 rounded-2xl border transition-all ${
          hasAllergies
            ? 'bg-rose-50/80 border-rose-200 shadow-xs'
            : 'bg-white border-slate-200/90 shadow-soft'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Known Allergies
            </span>
            <AlertTriangle className={`w-4 h-4 ${hasAllergies ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <p className={`text-base font-extrabold ${hasAllergies ? 'text-rose-700' : 'text-slate-900'}`}>
            {health_overview.allergies || 'None Recorded'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {hasAllergies ? 'Critical allergy alert' : 'No recorded adverse reactions'}
          </p>
        </div>

        {/* Critical Conditions Card */}
        <div className={`p-4 rounded-2xl border transition-all ${
          hasCriticalConditions
            ? 'bg-amber-50/80 border-amber-200 shadow-xs'
            : 'bg-white border-slate-200/90 shadow-soft'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Critical Conditions
            </span>
            <Activity className={`w-4 h-4 ${hasCriticalConditions ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <p className={`text-base font-extrabold ${hasCriticalConditions ? 'text-amber-800' : 'text-slate-900'}`}>
            {health_overview.critical_conditions || 'None Recorded'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {hasCriticalConditions ? 'Requires physician caution' : 'No active critical alerts'}
          </p>
        </div>

        {/* Active Medications Count */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Regimens
            </span>
            <Pill className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {health_overview.current_medication_count}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {health_overview.current_medication_count > 0 ? 'Active medications on file' : 'No active prescriptions'}
          </p>
        </div>

        {/* Emergency Blood & Organ Status */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Donation Pledges
            </span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-center gap-2">
            <Badge
              size="sm"
              variant={donation_status.blood_donor.is_registered ? 'success' : 'neutral'}
            >
              Blood: {donation_status.blood_donor.is_registered ? 'Pledged' : 'None'}
            </Badge>
            <Badge
              size="sm"
              variant={donation_status.organ_donor.status === 'ACTIVE' ? 'primary' : 'neutral'}
            >
              Organ: {donation_status.organ_donor.status === 'ACTIVE' ? 'Active' : 'None'}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Voluntary registry participation
          </p>
        </div>
      </div>

      {/* 3. CURRENT ACTIVE MEDICATIONS SECTION */}
      <HealthCard
        title="Current Active Medications"
        subtitle="Regimens currently flagged as ACTIVE by clinical providers"
        action={
          <Link
            to="/medicines"
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            Manage Medicines <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {health_overview.current_medications.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
            <Pill className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-700">No active medications</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Active prescriptions added to your wallet will appear here with dosage and frequency.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {health_overview.current_medications.map((med, idx) => (
              <div
                key={med.id || idx}
                className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-800 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950 truncate">
                      {med.medicine_name}
                    </p>
                    <p className="text-[11px] text-emerald-800 truncate">
                      {med.dosage ? `${med.dosage} • ` : ''}{med.frequency || 'Daily'} {med.duration ? `(${med.duration})` : ''}
                    </p>
                  </div>
                </div>
                <Badge size="sm" variant="success">Active</Badge>
              </div>
            ))}
          </div>
        )}
      </HealthCard>

      {/* 4. APPOINTMENTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming & Pending Appointments (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <HealthCard
            title="Scheduled Appointments"
            subtitle="Upcoming confirmed consultations and pending requests"
            action={
              <Link
                to="/appointments"
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                Appointments Portal <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {appointments.upcoming.length === 0 && appointments.pending.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
                <Calendar className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">No scheduled appointments</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Book an in-person or telehealth consultation with a verified specialist.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Upcoming Confirmed */}
                {appointments.upcoming.map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 bg-sky-50/60 border border-sky-100 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {app.doctor_name || 'Specialist Consultation'}
                          </h4>
                          <Badge size="sm" variant="primary">
                            {app.appointment_type.replace(/_/g, ' ')}
                          </Badge>
                          <Badge size="sm" variant="success">Confirmed</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {app.specialization ? `${app.specialization} • ` : ''}{app.hospital_name || 'Clinic'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 font-mono text-xs text-slate-600">
                      <div>{new Date(app.slot_start).toLocaleDateString()}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(app.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pending Requests */}
                {appointments.pending.map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {app.doctor_name || 'Doctor Appointment'}
                          </h4>
                          <Badge size="sm" variant="warning">Pending Confirmation</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {app.specialization ? `${app.specialization} • ` : ''}{app.hospital_name || 'Clinic'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 font-mono text-xs text-slate-600">
                      <div>{new Date(app.slot_start).toLocaleDateString()}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(app.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </HealthCard>
        </div>

        {/* Recent Completed Appointments (1 Col) */}
        <div>
          <HealthCard
            title="Recent Completed"
            subtitle="Past clinical appointments"
          >
            {appointments.recent_completed.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
                <CheckCircle2 className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="font-semibold text-slate-700">No completed visits</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Completed consultations will be indexed here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {appointments.recent_completed.map((app) => (
                  <div
                    key={app.id}
                    className="p-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {app.doctor_name || 'Doctor Consultation'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {app.specialization || 'Clinical Visit'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 text-[11px] text-slate-500 font-mono">
                      {new Date(app.slot_start).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </HealthCard>
        </div>
      </div>

      {/* 5. MEDICAL ACTIVITY: CONSULTATIONS, DIAGNOSES, TREATMENTS, LAB REPORTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Consultations */}
        <HealthCard
          title="Recent Consultations"
          subtitle="Clinical encounter notes and doctor summaries"
          action={
            <Link
              to="/health-records"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              All Records <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {medical_activity.recent_consultations.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
              <Stethoscope className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">No consultations on record</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Doctor consultation notes and findings will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {medical_activity.recent_consultations.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {c.chief_complaint || 'Consultation'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {c.consultation_date}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{c.doctor_name || 'Physician'}</span>
                    {c.hospital_clinic && (
                      <span className="text-slate-400 truncate">&bull; {c.hospital_clinic}</span>
                    )}
                  </div>
                  {c.diagnosis && (
                    <p className="text-[11px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md inline-block">
                      Dx: {c.diagnosis}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </HealthCard>

        {/* Recent Diagnoses & Treatments */}
        <HealthCard
          title="Diagnoses & Treatments"
          subtitle="Formal condition assessments and treatment plans"
        >
          {medical_activity.recent_diagnoses.length === 0 && medical_activity.recent_treatments.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
              <Activity className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">No diagnoses or treatments recorded</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clinical assessments provided by medical practitioners will index here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Diagnoses */}
              {medical_activity.recent_diagnoses.map((d) => (
                <div
                  key={d.id}
                  className="p-3 bg-amber-50/40 border border-amber-100 rounded-xl flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{d.diagnosis_name}</span>
                      <Badge size="sm" variant="warning">Diagnosis</Badge>
                    </div>
                    {d.provider && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{d.provider}</p>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">
                    {d.diagnosis_date}
                  </span>
                </div>
              ))}

              {/* Treatments */}
              {medical_activity.recent_treatments.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{t.treatment_name}</span>
                      <Badge size="sm" variant="neutral">Treatment</Badge>
                    </div>
                    {t.provider && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{t.provider}</p>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">
                    {t.treatment_date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </HealthCard>
      </div>

      {/* 6. LAB REPORTS & TIMELINE RECORDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lab Reports */}
        <HealthCard
          title="Verified Lab Reports"
          subtitle="Diagnostic laboratory tests and biochemical parameters"
          action={
            <Link
              to="/health-records"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {medical_activity.recent_lab_reports.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
              <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">No lab reports recorded</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                NABL laboratory test reports and diagnostic panels will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {medical_activity.recent_lab_reports.map((lab) => (
                <div
                  key={lab.id}
                  className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{lab.test_name}</h4>
                      <Badge size="sm" variant="primary">Lab</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {lab.lab_name || 'Diagnostic Laboratory'}
                    </p>
                    {lab.result && (
                      <p className="text-[11px] font-mono font-semibold text-blue-900 mt-1">
                        Result: {lab.result} {lab.unit || ''} {lab.reference_range ? `(Ref: ${lab.reference_range})` : ''}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">
                    {lab.test_date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </HealthCard>

        {/* Recent Master Timeline Records */}
        <HealthCard
          title="Master Health Records"
          subtitle="Latest verified items on your longitudinal medical timeline"
        >
          {medical_activity.recent_medical_records.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
              <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">Timeline is currently empty</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Upload or scan prescriptions and medical summaries to initialize your wallet.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {medical_activity.recent_medical_records.map((rec) => (
                <div
                  key={rec.id}
                  className="p-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{rec.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {rec.record_type.replace(/_/g, ' ')} &bull; {rec.provider_name || rec.hospital_name || 'Patient Document'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">
                    {rec.record_date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </HealthCard>
      </div>

      {/* 7. DONATION REGISTRY STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blood Donor Card */}
        <HealthCard
          title="Blood Donation Status"
          subtitle="Emergency voluntary blood donor network"
          action={
            <Link
              to="/blood-donation"
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              Donation Hub <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {donation_status.blood_donor.is_registered ? (
            <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-slate-900">Voluntary Donor</span>
                </div>
                <Badge
                  variant={donation_status.blood_donor.status === 'AVAILABLE' ? 'success' : 'neutral'}
                  size="sm"
                >
                  {donation_status.blood_donor.status}
                </Badge>
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <p>Blood Group: <span className="font-bold text-rose-700">{donation_status.blood_donor.blood_group || identity.blood_group}</span></p>
                {donation_status.blood_donor.city && (
                  <p>Location: <span className="font-medium text-slate-800">{donation_status.blood_donor.city}, {donation_status.blood_donor.state_code}</span></p>
                )}
                {donation_status.blood_donor.last_donation_date && (
                  <p>Last Donation: <span className="font-mono text-slate-700">{donation_status.blood_donor.last_donation_date}</span></p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
              <Droplet className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">Not registered as a blood donor</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Join the voluntary state blood registry to save lives in emergency requests.
              </p>
              <div className="mt-3">
                <Link to="/blood-donation">
                  <SecondaryButton size="sm">Register as Donor</SecondaryButton>
                </Link>
              </div>
            </div>
          )}
        </HealthCard>

        {/* Organ Donor Card */}
        <HealthCard
          title="Organ Donation Pledge"
          subtitle="National voluntary organ and tissue pledge"
          action={
            <Link
              to="/organ-donation"
              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Organ Registry <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {donation_status.organ_donor.is_registered && donation_status.organ_donor.status === 'ACTIVE' ? (
            <div className="p-4 bg-teal-50/60 border border-teal-100 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold text-slate-900">Registered Organ Donor</span>
                </div>
                <Badge variant="primary" size="sm">ACTIVE</Badge>
              </div>
              <p className="text-xs text-slate-600">
                Pledged: <span className="font-semibold text-slate-800">
                  {donation_status.organ_donor.preferences
                    ? Object.entries(donation_status.organ_donor.preferences)
                        .filter(([_, v]) => v)
                        .map(([k]) => k.replace(/_/g, ' '))
                        .join(', ') || 'Organs & Tissues'
                    : 'Selected Organs & Tissues'}
                </span>
              </p>
              {donation_status.organ_donor.consented_at && (
                <p className="text-[11px] font-mono text-slate-400">
                  Consent date: {new Date(donation_status.organ_donor.consented_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
              <Heart className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">No active organ donation pledge</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Voluntarily record your intent to donate organs and tissues upon demise.
              </p>
              <div className="mt-3">
                <Link to="/organ-donation">
                  <SecondaryButton size="sm">Register Pledge</SecondaryButton>
                </Link>
              </div>
            </div>
          )}
        </HealthCard>
      </div>

      {/* 8. RECENT ACTIVITY LOGS */}
      <HealthCard
        title="Recent Access & Wallet Activity"
        subtitle="Immutable security trail of authorized actions on your health wallet"
        action={
          <Link
            to="/access-history"
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            Audit Trail <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {recent_activity.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
            <History className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-700">No recorded audit events</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Access logs and activity will be displayed here securely.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recent_activity.map((act) => (
              <div
                key={act.id}
                className="p-2.5 bg-slate-50/60 border border-slate-200/70 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <Badge size="sm" variant="neutral">{act.role}</Badge>
                  <span className="font-bold text-slate-800">
                    {act.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                  <span>{new Date(act.created_at).toLocaleDateString()} {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </HealthCard>
    </div>
  );
};
