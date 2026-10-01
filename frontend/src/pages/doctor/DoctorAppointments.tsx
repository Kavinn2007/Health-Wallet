import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Check,
  AlertCircle,
  Building2,
  Video,
  MapPin,
  CalendarCheck,
  ShieldAlert,
  Plus,
  FileText,
  Clock3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  type Appointment,
  type AppointmentStatus,
  type TimeSlot,
  getDoctorAppointments,
  confirmAppointment,
  cancelAppointment,
  rescheduleAppointment,
  completeAppointment,
  setDoctorAvailability,
  getDoctorAvailableSlots,
} from '../../services/appointments';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';

export const DoctorAppointments: React.FC = () => {
  const { doctorProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'UPCOMING' | 'HISTORY' | 'AVAILABILITY'>('PENDING');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Action State
  const [confirmingApt, setConfirmingApt] = useState<Appointment | null>(null);
  const [doctorConfirmNote, setDoctorConfirmNote] = useState('');
  const [cancellingApt, setCancellingApt] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [completingApt, setCompletingApt] = useState<Appointment | null>(null);
  const [doctorCompleteNote, setDoctorCompleteNote] = useState('');
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(
    () => new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [rescheduleSlots, setRescheduleSlots] = useState<TimeSlot[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<TimeSlot | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Availability Form State
  const [availDate, setAvailDate] = useState<string>(
    () => new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [availStartTime, setAvailStartTime] = useState('09:00');
  const [availEndTime, setAvailEndTime] = useState('17:00');
  const [availSlotDuration, setAvailSlotDuration] = useState(30);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const data = await getDoctorAppointments();
    setAppointments(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch slots for reschedule modal
  useEffect(() => {
    if (!reschedulingApt || !rescheduleDate) {
      setRescheduleSlots([]);
      return;
    }
    let isCancelled = false;
    setLoadingRescheduleSlots(true);
    setSelectedRescheduleSlot(null);

    getDoctorAvailableSlots(doctorProfile?.id || reschedulingApt.doctor_id, rescheduleDate)
      .then((slots) => {
        if (!isCancelled) {
          setRescheduleSlots(slots);
          setLoadingRescheduleSlots(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setRescheduleSlots([]);
          setLoadingRescheduleSlots(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [reschedulingApt, rescheduleDate, doctorProfile?.id]);

  // Action Handlers
  const handleConfirm = async () => {
    if (!confirmingApt) return;
    setIsSubmitting(true);
    const res = await confirmAppointment(confirmingApt.id, doctorConfirmNote);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Appointment confirmed successfully.' });
      setConfirmingApt(null);
      setDoctorConfirmNote('');
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to confirm appointment.' });
    }
  };

  const handleCancel = async () => {
    if (!cancellingApt) return;
    if (!cancellationReason.trim()) {
      setFeedback({ type: 'error', message: 'Please provide a cancellation reason.' });
      return;
    }

    setIsSubmitting(true);
    const res = await cancelAppointment(cancellingApt.id, cancellationReason);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Appointment cancelled.' });
      setCancellingApt(null);
      setCancellationReason('');
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to cancel appointment.' });
    }
  };

  const handleComplete = async () => {
    if (!completingApt) return;
    setIsSubmitting(true);
    const res = await completeAppointment(completingApt.id, doctorCompleteNote);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Appointment marked as COMPLETED.' });
      setCompletingApt(null);
      setDoctorCompleteNote('');
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to complete appointment.' });
    }
  };

  const handleReschedule = async () => {
    if (!reschedulingApt || !selectedRescheduleSlot) {
      setFeedback({ type: 'error', message: 'Please choose a new time slot.' });
      return;
    }

    setIsSubmitting(true);
    const res = await rescheduleAppointment(
      reschedulingApt.id,
      selectedRescheduleSlot.start,
      selectedRescheduleSlot.end,
      rescheduleReason.trim() || 'Practitioner requested reschedule'
    );
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Appointment successfully rescheduled.' });
      setReschedulingApt(null);
      setSelectedRescheduleSlot(null);
      setRescheduleReason('');
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to reschedule appointment.' });
    }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (availEndTime <= availStartTime) {
      setFeedback({ type: 'error', message: 'End time must be after start time.' });
      return;
    }

    setIsSubmitting(true);
    const res = await setDoctorAvailability({
      availabilityDate: availDate,
      startTime: `${availStartTime}:00`,
      endTime: `${availEndTime}:00`,
      slotDurationMinutes: Number(availSlotDuration),
    });
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Availability schedule saved successfully.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to save availability.' });
    }
  };

  const pendingAppointments = appointments.filter((a) => a.status === 'PENDING');
  const upcomingAppointments = appointments.filter((a) => a.status === 'CONFIRMED');
  const historyAppointments = appointments.filter(
    (a) => a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'RESCHEDULED' || a.status === 'EXPIRED'
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-sky-600 mb-1">
            <CalendarCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Clinical Consultations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Appointment Management Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review incoming requests, manage upcoming patient consultations, and define bookable time slots.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setActiveTab('AVAILABILITY')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-xs sm:text-sm border border-sky-200 transition-colors cursor-pointer"
          >
            <Clock3 className="w-4 h-4" />
            <span>Configure Availability</span>
          </button>
        </div>
      </div>

      {/* Consent Gating Security Reminder */}
      <div className="p-3.5 bg-gradient-to-r from-sky-50 to-indigo-50/50 rounded-xl border border-sky-100 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900 font-semibold">Consent Boundary Enforced: </strong>
          The appointment engine displays only minimal demographic info needed to coordinate the visit. Clinical records (diagnoses, prescriptions, lab reports) remain strictly protected and require approved patient consent via the Access Requests workflow.
        </div>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{feedback.message}</div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'PENDING'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Pending Requests</span>
          {pendingAppointments.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
              {pendingAppointments.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('UPCOMING')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'UPCOMING'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Confirmed Schedule</span>
          {upcomingAppointments.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              {upcomingAppointments.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>History & Past</span>
          {historyAppointments.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
              {historyAppointments.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('AVAILABILITY')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'AVAILABILITY'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Doctor Availability</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingState message="Loading practitioner appointments..." />
      ) : (
        <>
          {/* ======================================================== */}
          {/* TAB 1: PENDING APPOINTMENTS */}
          {/* ======================================================== */}
          {activeTab === 'PENDING' && (
            <div className="space-y-4">
              {pendingAppointments.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="w-10 h-10 text-slate-400" />}
                  title="No Pending Requests"
                  description="You have no appointment booking requests waiting for confirmation."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                              {apt.patient_name || 'Patient'}
                            </h3>
                            <p className="text-xs text-slate-500 font-mono">
                              HW ID: {apt.health_wallet_id || 'HW-TN-XXXXXXXX'}
                            </p>
                            {apt.blood_group && (
                              <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                                Blood: {apt.blood_group}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          {apt.status}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Requested Time</span>
                          <span className="font-semibold text-slate-800">
                            {new Date(apt.slot_start).toLocaleDateString([], {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            •{' '}
                            {new Date(apt.slot_start).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Mode</span>
                          <span className="font-semibold text-slate-800">
                            {apt.appointment_type === 'TELEHEALTH'
                              ? 'Telehealth Consultation'
                              : 'In-Person Hospital Visit'}
                          </span>
                        </div>
                        {apt.appointment_reason && (
                          <div className="pt-1.5 border-t border-slate-200/60 text-slate-700">
                            <span className="font-semibold text-slate-800">Reason: </span>
                            {apt.appointment_reason}
                          </div>
                        )}
                        {apt.patient_note && (
                          <div className="text-slate-600 italic">
                            <span className="font-medium not-italic">Note: </span>
                            "{apt.patient_note}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setCancellingApt(apt)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline / Cancel</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingApt(apt)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm Appointment</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: UPCOMING APPOINTMENTS */}
          {/* ======================================================== */}
          {activeTab === 'UPCOMING' && (
            <div className="space-y-4">
              {upcomingAppointments.length === 0 ? (
                <EmptyState
                  icon={<CalendarCheck className="w-10 h-10 text-slate-400" />}
                  title="No Confirmed Appointments"
                  description="You have no upcoming confirmed consultations."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                              {apt.patient_name || 'Patient'}
                            </h3>
                            <p className="text-xs text-slate-500 font-mono">
                              HW ID: {apt.health_wallet_id || 'HW-TN-XXXXXXXX'}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {apt.status}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Date & Time</span>
                          <span className="font-semibold text-slate-800">
                            {new Date(apt.slot_start).toLocaleDateString([], {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            •{' '}
                            {new Date(apt.slot_start).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Mode</span>
                          <span className="font-semibold text-slate-800">
                            {apt.appointment_type === 'TELEHEALTH'
                              ? 'Telehealth Consultation'
                              : 'In-Person Hospital Visit'}
                          </span>
                        </div>
                        {apt.appointment_reason && (
                          <div className="pt-1.5 border-t border-slate-200/60 text-slate-700">
                            <span className="font-semibold text-slate-800">Reason: </span>
                            {apt.appointment_reason}
                          </div>
                        )}
                        {apt.doctor_note && (
                          <div className="pt-1 text-sky-800 bg-sky-50/60 p-2 rounded-lg border border-sky-100/60">
                            <span className="font-bold">Your Note: </span>
                            {apt.doctor_note}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setReschedulingApt(apt)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reschedule</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancellingApt(apt)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompletingApt(apt)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Completed</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: APPOINTMENT HISTORY */}
          {/* ======================================================== */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              {historyAppointments.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-10 h-10 text-slate-400" />}
                  title="No History"
                  description="No completed, cancelled, or expired consultations recorded."
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Patient</th>
                          <th className="py-3 px-4">Scheduled Slot</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Notes / Cancellation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historyAppointments.map((apt) => (
                          <tr key={apt.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{apt.patient_name || 'Patient'}</div>
                              <div className="text-[11px] font-mono text-slate-500">
                                {apt.health_wallet_id || 'HW-TN-XXXXXXXX'}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                              {new Date(apt.slot_start).toLocaleDateString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              •{' '}
                              {new Date(apt.slot_start).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                              {apt.appointment_type}
                            </td>
                            <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                              {apt.appointment_reason || '—'}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  apt.status === 'COMPLETED'
                                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                    : apt.status === 'CANCELLED'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : apt.status === 'RESCHEDULED'
                                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {apt.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[11px] text-slate-500 max-w-xs truncate">
                              {apt.cancellation_reason
                                ? `Cancelled: ${apt.cancellation_reason}`
                                : apt.doctor_note
                                ? `Note: ${apt.doctor_note}`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: AVAILABILITY MANAGEMENT */}
          {/* ======================================================== */}
          {activeTab === 'AVAILABILITY' && (
            <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock3 className="w-5 h-5 text-sky-600" />
                  <span>Define Bookable Appointment Slots</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Specify the date, operating hours, and consultation duration. Patients will be able to book slots within this window.
                </p>
              </div>

              <form onSubmit={handleAddAvailability} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Availability Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    required
                    value={availDate}
                    onChange={(e) => setAvailDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={availStartTime}
                      onChange={(e) => setAvailStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      required
                      value={availEndTime}
                      onChange={(e) => setAvailEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Slot Duration (Minutes)
                  </label>
                  <select
                    value={availSlotDuration}
                    onChange={(e) => setAvailSlotDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value={15}>15 Minutes per Slot</option>
                    <option value={20}>20 Minutes per Slot</option>
                    <option value={30}>30 Minutes per Slot (Standard)</option>
                    <option value={45}>45 Minutes per Slot</option>
                    <option value={60}>60 Minutes per Slot</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Add Availability Window'}</span>
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRM APPOINTMENT */}
      {/* ======================================================== */}
      {confirmingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Confirm Appointment</h3>
                <p className="text-xs text-slate-500">
                  Patient will receive an in-app confirmation notification.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1 border border-slate-100">
              <div>
                <span className="font-bold">Patient:</span> {confirmingApt.patient_name} (
                {confirmingApt.health_wallet_id})
              </div>
              <div>
                <span className="font-bold">Date & Time:</span>{' '}
                {new Date(confirmingApt.slot_start).toLocaleString()}
              </div>
              <div>
                <span className="font-bold">Mode:</span> {confirmingApt.appointment_type}
              </div>
              {confirmingApt.appointment_reason && (
                <div>
                  <span className="font-bold">Reason:</span> {confirmingApt.appointment_reason}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Doctor Instructions / Note <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Please bring recent fasting glucose reports, arrive 10 min early..."
                value={doctorConfirmNote}
                onChange={(e) => setDoctorConfirmNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmingApt(null);
                  setDoctorConfirmNote('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:bg-slate-300"
              >
                {isSubmitting ? 'Confirming...' : 'Yes, Confirm Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DECLINE / CANCEL APPOINTMENT */}
      {/* ======================================================== */}
      {cancellingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Cancel / Decline Consultation</h3>
                <p className="text-xs text-slate-500">
                  Releases the slot and notifies the patient.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Emergency surgery scheduled, clinic closed for holiday..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancellingApt(null);
                  setCancellationReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!cancellationReason.trim() || isSubmitting}
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:bg-slate-300"
              >
                {isSubmitting ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: COMPLETE APPOINTMENT */}
      {/* ======================================================== */}
      {completingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-sky-600">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Mark Consultation Completed</h3>
                <p className="text-xs text-slate-500">
                  Finalizes appointment status without altering medical records.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Consultation Summary / Closure Note <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Patient attended consultation. Advised lifestyle modifications."
                value={doctorCompleteNote}
                onChange={(e) => setDoctorCompleteNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCompletingApt(null);
                  setDoctorCompleteNote('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleComplete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer disabled:bg-slate-300"
              >
                {isSubmitting ? 'Completing...' : 'Mark as Completed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: RESCHEDULE APPOINTMENT */}
      {/* ======================================================== */}
      {reschedulingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-sky-600">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Reschedule Patient Appointment</h3>
                <p className="text-xs text-slate-500">
                  Select a new time slot for {reschedulingApt.patient_name}.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1 border border-slate-100">
              <div>
                <span className="font-bold">Current Slot:</span>{' '}
                {new Date(reschedulingApt.slot_start).toLocaleString()}
              </div>
              <div>
                <span className="font-bold">Patient:</span> {reschedulingApt.patient_name} (
                {reschedulingApt.health_wallet_id})
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Available Slots
              </label>
              {loadingRescheduleSlots ? (
                <div className="p-3 text-xs text-slate-500 text-center">Loading slots...</div>
              ) : rescheduleSlots.length === 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 text-center border border-amber-200">
                  No slots available on this date. Please check your availability configuration.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                  {rescheduleSlots.map((slot) => {
                    const isSelected = selectedRescheduleSlot?.start === slot.start;
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => setSelectedRescheduleSlot(slot)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : slot.isAvailable
                            ? 'bg-white hover:bg-sky-50 text-slate-800 border-slate-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                        }`}
                      >
                        {new Date(slot.start).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Rescheduling
              </label>
              <input
                type="text"
                placeholder="e.g. Emergency conflict, shifted clinic timing..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setReschedulingApt(null);
                  setSelectedRescheduleSlot(null);
                  setRescheduleReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedRescheduleSlot || isSubmitting}
                onClick={handleReschedule}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer disabled:bg-slate-300"
              >
                {isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DoctorAppointments;
