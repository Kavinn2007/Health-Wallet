import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Building2,
  Video,
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  FileText,
  Search,
  Filter,
  ChevronRight,
  ShieldCheck,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  type Appointment,
  type AppointmentType,
  type TimeSlot,
  getDoctorsForAppointments,
  getDoctorAvailableSlots,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getPatientAppointments,
} from '../services/appointments';
import { type DoctorProfile } from '../services/supabase';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';

export const Appointments: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'BOOK' | 'UPCOMING' | 'HISTORY'>('UPCOMING');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Booking Flow State
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
  );
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('IN_PERSON');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [patientNote, setPatientNote] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('ALL');

  // Action / Modal States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<Appointment | null>(null);
  const [cancellingApt, setCancellingApt] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(
    () => new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [rescheduleSlots, setRescheduleSlots] = useState<TimeSlot[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<TimeSlot | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const loadData = async () => {
    setIsLoading(true);
    const [apts, docs] = await Promise.all([
      getPatientAppointments(),
      getDoctorsForAppointments(),
    ]);
    setAppointments(apts);
    setDoctors(docs);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch slots whenever doctor or date changes in booking flow
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setAvailableSlots([]);
      return;
    }
    let isCancelled = false;
    setLoadingSlots(true);
    setSelectedSlot(null);

    getDoctorAvailableSlots(selectedDoctor.id, selectedDate)
      .then((slots) => {
        if (!isCancelled) {
          setAvailableSlots(slots);
          setLoadingSlots(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setAvailableSlots([]);
          setLoadingSlots(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedDoctor, selectedDate]);

  // Fetch slots for reschedule modal
  useEffect(() => {
    if (!reschedulingApt || !rescheduleDate) {
      setRescheduleSlots([]);
      return;
    }
    let isCancelled = false;
    setLoadingRescheduleSlots(true);
    setSelectedRescheduleSlot(null);

    getDoctorAvailableSlots(reschedulingApt.doctor_id, rescheduleDate)
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
  }, [reschedulingApt, rescheduleDate]);

  // Handle Book Submission
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedSlot) {
      setFeedback({ type: 'error', message: 'Please select a doctor and an available slot.' });
      return;
    }
    if (!appointmentReason.trim()) {
      setFeedback({ type: 'error', message: 'Please enter the reason for your appointment.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await bookAppointment({
      doctorId: selectedDoctor.id,
      appointmentType,
      slotStart: selectedSlot.start,
      slotEnd: selectedSlot.end,
      appointmentReason: appointmentReason.trim(),
      patientNote: patientNote.trim(),
    });

    setIsSubmitting(false);

    if (res.success) {
      const bookedApt: Appointment = {
        id: res.appointmentId || 'temp-id',
        patient_id: profile?.id || 'pat-id',
        doctor_id: selectedDoctor.id,
        appointment_type: appointmentType,
        slot_start: selectedSlot.start,
        slot_end: selectedSlot.end,
        status: 'PENDING',
        appointment_reason: appointmentReason.trim(),
        patient_note: patientNote.trim(),
        doctor_name: selectedDoctor.doctor_name,
        specialization: selectedDoctor.specialization,
        hospital_name: selectedDoctor.hospital_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setBookingSuccess(bookedApt);
      setSelectedDoctor(null);
      setSelectedSlot(null);
      setAppointmentReason('');
      setPatientNote('');
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to book appointment' });
    }
  };

  // Handle Cancel Submission
  const handleConfirmCancel = async () => {
    if (!cancellingApt) return;
    if (!cancellationReason.trim()) {
      setFeedback({ type: 'error', message: 'Please provide a cancellation reason.' });
      return;
    }

    setIsSubmitting(true);
    const res = await cancelAppointment(cancellingApt.id, cancellationReason);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Appointment successfully cancelled.' });
      setCancellingApt(null);
      setCancellationReason('');
      loadData();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to cancel appointment.' });
    }
  };

  // Handle Reschedule Submission
  const handleConfirmReschedule = async () => {
    if (!reschedulingApt || !selectedRescheduleSlot) {
      setFeedback({ type: 'error', message: 'Please select a new time slot.' });
      return;
    }

    setIsSubmitting(true);
    const res = await rescheduleAppointment(
      reschedulingApt.id,
      selectedRescheduleSlot.start,
      selectedRescheduleSlot.end,
      rescheduleReason.trim() || 'Patient requested reschedule'
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

  // Filtered doctors
  const specializations = Array.from(new Set(doctors.map((d) => d.specialization))).filter(Boolean);
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.doctor_name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.hospital_name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(doctorSearch.toLowerCase());
    const matchesSpec = specializationFilter === 'ALL' || doc.specialization === specializationFilter;
    return matchesSearch && matchesSpec;
  });

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'PENDING' || a.status === 'CONFIRMED'
  );
  const historyAppointments = appointments.filter(
    (a) => a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'RESCHEDULED' || a.status === 'EXPIRED'
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-sky-600 mb-1">
            <CalendarCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Clinical Consultations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Doctor Appointments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Schedule in-person hospital visits or telehealth consultations with verified practitioners.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('BOOK');
              setBookingSuccess(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Book New Appointment</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('UPCOMING')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'UPCOMING'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Upcoming Appointments</span>
          {upcomingAppointments.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-sky-100 text-sky-800">
              {upcomingAppointments.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('BOOK');
            setBookingSuccess(null);
          }}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'BOOK'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Book Appointment</span>
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
          <span>Appointment History</span>
          {historyAppointments.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
              {historyAppointments.length}
            </span>
          )}
        </button>
      </div>

      {isLoading ? (
        <LoadingState message="Loading your appointments and practitioners..." />
      ) : (
        <>
          {/* ======================================================== */}
          {/* TAB 1: UPCOMING APPOINTMENTS */}
          {/* ======================================================== */}
          {activeTab === 'UPCOMING' && (
            <div className="space-y-4">
              {upcomingAppointments.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="w-10 h-10 text-slate-400" />}
                  title="No Upcoming Appointments"
                  description="You have no scheduled upcoming doctor visits or telehealth consultations."
                  action={
                    <button
                      type="button"
                      onClick={() => setActiveTab('BOOK')}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      Book Your First Appointment
                    </button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                            <Stethoscope className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                              {apt.doctor_name || 'Practitioner'}
                            </h3>
                            <p className="text-xs text-sky-600 font-medium">{apt.specialization}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{apt.hospital_name}</span>
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            apt.status === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Date & Time</span>
                          </span>
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
                          <span className="text-slate-500 flex items-center gap-1.5">
                            {apt.appointment_type === 'TELEHEALTH' ? (
                              <Video className="w-3.5 h-3.5 text-indigo-500" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                            <span>Type</span>
                          </span>
                          <span className="font-semibold text-slate-800">
                            {apt.appointment_type === 'TELEHEALTH'
                              ? 'Telehealth Consultation'
                              : 'In-Person Hospital Visit'}
                          </span>
                        </div>
                        {apt.appointment_reason && (
                          <div className="pt-1.5 border-t border-slate-200/60 text-slate-600">
                            <span className="font-semibold text-slate-700">Reason: </span>
                            {apt.appointment_reason}
                          </div>
                        )}
                        {apt.doctor_note && (
                          <div className="pt-1 text-sky-800 bg-sky-50/60 p-2 rounded-lg border border-sky-100/60">
                            <span className="font-bold">Doctor Note: </span>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: BOOKING FLOW */}
          {/* ======================================================== */}
          {activeTab === 'BOOK' && (
            <div className="space-y-6">
              {bookingSuccess ? (
                <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center max-w-xl mx-auto shadow-xs space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Appointment Requested Successfully!
                  </h2>
                  <p className="text-sm text-slate-600">
                    Your appointment request with{' '}
                    <span className="font-semibold text-slate-900">{bookingSuccess.doctor_name}</span>{' '}
                    for{' '}
                    <span className="font-semibold text-slate-900">
                      {new Date(bookingSuccess.slot_start).toLocaleString()}
                    </span>{' '}
                    has been submitted with status <span className="font-bold text-amber-600">PENDING</span>.
                    The doctor has received an in-app notification to confirm your visit.
                  </p>
                  <div className="p-4 bg-slate-50 rounded-xl text-xs text-left space-y-1.5 border border-slate-200">
                    <div>
                      <span className="text-slate-500 font-medium">Practitioner:</span>{' '}
                      <span className="font-bold text-slate-800">{bookingSuccess.doctor_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Hospital:</span>{' '}
                      <span className="font-semibold text-slate-800">{bookingSuccess.hospital_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Type:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {bookingSuccess.appointment_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Reason:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {bookingSuccess.appointment_reason}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('UPCOMING')}
                      className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm cursor-pointer shadow-xs"
                    >
                      View Upcoming Appointments
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingSuccess(null)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-semibold cursor-pointer"
                    >
                      Book Another
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Step 1: Select Practitioner (Left Column: 5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">
                            1
                          </span>
                          <span>Select Doctor</span>
                        </h2>
                        {selectedDoctor && (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Selected</span>
                          </span>
                        )}
                      </div>

                      {/* Doctor Search & Filters */}
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            placeholder="Search by name, hospital, or specialty..."
                            value={doctorSearch}
                            onChange={(e) => setDoctorSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>

                        {specializations.length > 0 && (
                          <select
                            value={specializationFilter}
                            onChange={(e) => setSpecializationFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="ALL">All Specializations ({doctors.length})</option>
                            {specializations.map((spec) => (
                              <option key={spec} value={spec}>
                                {spec}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Doctor List */}
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {filteredDoctors.length === 0 ? (
                          <p className="text-xs text-slate-400 py-4 text-center">
                            No practitioners match your search.
                          </p>
                        ) : (
                          filteredDoctors.map((doc) => {
                            const isSelected = selectedDoctor?.id === doc.id;
                            return (
                              <div
                                key={doc.id}
                                onClick={() => setSelectedDoctor(doc)}
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-sky-50/80 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                        isSelected
                                          ? 'bg-sky-600 text-white'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      <Stethoscope className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                        {doc.doctor_name}
                                      </h4>
                                      <p className="text-[11px] font-semibold text-sky-600">
                                        {doc.specialization}
                                      </p>
                                    </div>
                                  </div>
                                  <ChevronRight
                                    className={`w-4 h-4 transition-transform ${
                                      isSelected ? 'text-sky-600 rotate-90' : 'text-slate-400'
                                    }`}
                                  />
                                </div>
                                <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1 truncate pl-11">
                                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{doc.hospital_name}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 2 & 3: Date, Slot & Appointment Details (Right Column: 7 cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    <form
                      onSubmit={handleBookAppointment}
                      className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5"
                    >
                      {/* Step 2: Date & Available Slots */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">
                              2
                            </span>
                            <span>Choose Date & Time Slot</span>
                          </h2>
                          <div className="text-[11px] text-slate-500">
                            {selectedDoctor ? selectedDoctor.doctor_name : 'Select doctor first'}
                          </div>
                        </div>

                        {/* Date Picker */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Consultation Date
                          </label>
                          <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            disabled={!selectedDoctor}
                            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Slots Grid */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            Available Time Slots
                          </label>

                          {!selectedDoctor ? (
                            <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-400 text-center border border-dashed border-slate-200">
                              Please select a practitioner first to view their availability.
                            </div>
                          ) : loadingSlots ? (
                            <div className="p-4 text-xs text-slate-500 text-center">
                              Loading available slots for {selectedDate}...
                            </div>
                          ) : availableSlots.length === 0 ? (
                            <div className="p-4 bg-amber-50 rounded-xl text-xs text-amber-800 text-center border border-amber-200">
                              No available slots found for this date. The doctor may have no active availability or all slots may be booked.
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                              {availableSlots.map((slot) => {
                                const isSelected = selectedSlot?.start === slot.start;
                                return (
                                  <button
                                    key={slot.start}
                                    type="button"
                                    disabled={!slot.isAvailable}
                                    onClick={() => setSelectedSlot(slot)}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-center border transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                        : slot.isAvailable
                                        ? 'bg-white hover:bg-sky-50 text-slate-800 border-slate-200 hover:border-sky-300'
                                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                    }`}
                                    title={slot.reason}
                                  >
                                    <div className="flex items-center justify-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        {new Date(slot.start).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true,
                                        })}
                                      </span>
                                    </div>
                                    {!slot.isAvailable && (
                                      <div className="text-[10px] text-slate-400 truncate">
                                        {slot.reason || 'Unavailable'}
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step 3: Appointment Type & Clinical Details */}
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">
                            3
                          </span>
                          <span>Consultation Details</span>
                        </h2>

                        {/* Type Selection */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Appointment Type
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setAppointmentType('IN_PERSON')}
                              className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all cursor-pointer ${
                                appointmentType === 'IN_PERSON'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-500/20'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div className="text-left">
                                <div>In-Person Visit</div>
                                <div className="text-[10px] font-normal text-slate-500">
                                  At hospital clinic
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setAppointmentType('TELEHEALTH')}
                              className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all cursor-pointer ${
                                appointmentType === 'TELEHEALTH'
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-500 ring-2 ring-indigo-500/20'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <Video className="w-4 h-4 text-indigo-600 shrink-0" />
                              <div className="text-left">
                                <div>Telehealth</div>
                                <div className="text-[10px] font-normal text-slate-500">
                                  Remote consultation
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Reason for Appointment */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Reason for Visit <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Chronic knee pain follow-up, Routine BP check"
                            value={appointmentReason}
                            onChange={(e) => setAppointmentReason(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                        </div>

                        {/* Optional Patient Note */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Notes for Doctor <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Any specific symptoms, questions, or existing medication you want to mention..."
                            value={patientNote}
                            onChange={(e) => setPatientNote(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                          />
                        </div>

                        {/* ABDM Security Note */}
                        <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 flex items-start gap-2 border border-slate-200">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            Appointment scheduling does not automatically grant medical record access. Clinical records remain protected under explicit consent boundaries.
                          </span>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={!selectedDoctor || !selectedSlot || isSubmitting}
                          className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <span>Reserving Slot...</span>
                          ) : (
                            <>
                              <CalendarCheck className="w-4 h-4" />
                              <span>Confirm Appointment Booking</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
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
                  title="No Past Appointments"
                  description="You have no completed, cancelled, or expired appointment records."
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Doctor & Hospital</th>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Notes / Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historyAppointments.map((apt) => (
                          <tr key={apt.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{apt.doctor_name}</div>
                              <div className="text-[11px] text-slate-500">{apt.hospital_name}</div>
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
                                ? `Cancellation: ${apt.cancellation_reason}`
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
        </>
      )}

      {/* ======================================================== */}
      {/* MODAL: CANCEL APPOINTMENT */}
      {/* ======================================================== */}
      {cancellingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Cancel Appointment</h3>
                <p className="text-xs text-slate-500">This will release the reserved time slot.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1 border border-slate-100">
              <div>
                <span className="font-bold">Doctor:</span> {cancellingApt.doctor_name}
              </div>
              <div>
                <span className="font-bold">Date:</span>{' '}
                {new Date(cancellingApt.slot_start).toLocaleString()}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Personal emergency, recovered, conflict in schedule..."
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
                Keep Appointment
              </button>
              <button
                type="button"
                disabled={!cancellationReason.trim() || isSubmitting}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:bg-slate-300"
              >
                {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
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
                <h3 className="font-bold text-slate-900 text-base">Reschedule Appointment</h3>
                <p className="text-xs text-slate-500">
                  Select a new time slot with {reschedulingApt.doctor_name}.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1 border border-slate-100">
              <div>
                <span className="font-bold">Current Slot:</span>{' '}
                {new Date(reschedulingApt.slot_start).toLocaleString()}
              </div>
              <div>
                <span className="font-bold">Doctor:</span> {reschedulingApt.doctor_name} (
                {reschedulingApt.specialization})
              </div>
            </div>

            {/* Date selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Consultation Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Available Slots */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Available Time Slots
              </label>
              {loadingRescheduleSlots ? (
                <div className="p-3 text-xs text-slate-500 text-center">Loading slots...</div>
              ) : rescheduleSlots.length === 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 text-center border border-amber-200">
                  No slots available on this date. Please pick another date.
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

            {/* Reschedule Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Rescheduling
              </label>
              <input
                type="text"
                placeholder="e.g. Schedule conflict, traveling..."
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
                onClick={handleConfirmReschedule}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer disabled:bg-slate-300"
              >
                {isSubmitting ? 'Rescheduling...' : 'Confirm New Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Appointments;
