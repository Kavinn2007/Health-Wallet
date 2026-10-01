import { supabase, isSupabaseConfigured, type DoctorProfile } from './supabase';
import { recordMockAuditLog } from './audit';
import { recordMockNotification } from './notifications';
import { DEMO_DOCTOR_PROFILE } from './doctors';

export type AppointmentType = 'IN_PERSON' | 'TELEHEALTH';
export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'EXPIRED';

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_type: AppointmentType;
  slot_start: string;
  slot_end: string;
  status: AppointmentStatus;
  appointment_reason?: string | null;
  patient_note?: string | null;
  doctor_note?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  completed_at?: string | null;
  rescheduled_from_id?: string | null;
  // Patient presentation fields
  doctor_name?: string;
  specialization?: string;
  hospital_name?: string;
  // Doctor presentation fields (minimal info only)
  patient_name?: string;
  health_wallet_id?: string;
  blood_group?: string;
}

export interface DoctorAvailability {
  id: string;
  doctor_id: string;
  availability_date: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  start: string; // ISO string
  end: string;   // ISO string
  timeLabel: string; // e.g. "09:00 AM - 09:30 AM"
  isAvailable: boolean;
  reason?: string;
}

export interface BookAppointmentInput {
  doctorId: string;
  appointmentType: AppointmentType;
  slotStart: string;
  slotEnd: string;
  appointmentReason?: string;
  patientNote?: string;
}

export interface SetAvailabilityInput {
  availabilityDate: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
}

const LOCAL_STORAGE_APPOINTMENTS_KEY = 'health_wallet_v2_appointments';
const LOCAL_STORAGE_AVAILABILITY_KEY = 'health_wallet_v2_doctor_availability';

// Default mock doctors for appointment booking
export const DEFAULT_DOCTORS: DoctorProfile[] = [
  DEMO_DOCTOR_PROFILE,
  {
    id: 'doc-uuid-demo-2',
    user_id: 'doc-auth-user-demo-2',
    doctor_name: 'Dr. Priya Sundaram',
    registration_number: 'KA-MC-2019-9231',
    specialization: 'Cardiology',
    hospital_name: 'Apollo Heart Center',
    mobile_number: '9845188776',
    username: 'dr_priya',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'doc-uuid-demo-3',
    user_id: 'doc-auth-user-demo-3',
    doctor_name: 'Dr. Arvind Kumar',
    registration_number: 'MH-MC-2016-7742',
    specialization: 'Pediatrics',
    hospital_name: 'Lilavati Children Hospital',
    mobile_number: '9845166554',
    username: 'dr_arvind',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper: Seed initial mock availability if empty
function getLocalAvailabilities(): DoctorAvailability[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AVAILABILITY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Generate 7 days of default mock availability for demo doctors
  const initial: DoctorAvailability[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    DEFAULT_DOCTORS.forEach((doc) => {
      initial.push({
        id: `avail-${doc.id}-${dateStr}`,
        doctor_id: doc.id,
        availability_date: dateStr,
        start_time: '09:00:00',
        end_time: '17:00:00',
        slot_duration_minutes: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_AVAILABILITY_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

function getLocalAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_APPOINTMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAppointments(list: Appointment[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_APPOINTMENTS_KEY, JSON.stringify(list));
  } catch {}
}

function saveLocalAvailabilities(list: DoctorAvailability[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_AVAILABILITY_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * Fetch doctors available for appointment booking
 */
export async function getDoctorsForAppointments(): Promise<DoctorProfile[]> {
  if (!isSupabaseConfigured) {
    return DEFAULT_DOCTORS;
  }

  try {
    const { data, error } = await supabase
      .from('doctor_profiles')
      .select('*')
      .order('doctor_name', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_DOCTORS;
    }
    return data as DoctorProfile[];
  } catch {
    return DEFAULT_DOCTORS;
  }
}

/**
 * Generate bookable time slots for a doctor on a specific date
 */
export async function getDoctorAvailableSlots(
  doctorId: string,
  dateString: string
): Promise<TimeSlot[]> {
  let availabilities: DoctorAvailability[] = [];
  let existingAppointments: Appointment[] = [];

  if (!isSupabaseConfigured) {
    availabilities = getLocalAvailabilities().filter(
      (a) => a.doctor_id === doctorId && a.availability_date === dateString && a.is_active
    );
    existingAppointments = getLocalAppointments().filter(
      (a) =>
        a.doctor_id === doctorId &&
        (a.status === 'PENDING' || a.status === 'CONFIRMED') &&
        a.slot_start.startsWith(dateString)
    );
  } else {
    try {
      const { data: availData } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('availability_date', dateString)
        .eq('is_active', true);

      if (availData && availData.length > 0) {
        availabilities = availData as DoctorAvailability[];
      }

      const { data: aptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .in('status', ['PENDING', 'CONFIRMED']);

      if (aptData) {
        existingAppointments = aptData as Appointment[];
      }
    } catch {
      availabilities = getLocalAvailabilities().filter(
        (a) => a.doctor_id === doctorId && a.availability_date === dateString && a.is_active
      );
      existingAppointments = getLocalAppointments().filter(
        (a) =>
          a.doctor_id === doctorId &&
          (a.status === 'PENDING' || a.status === 'CONFIRMED') &&
          a.slot_start.startsWith(dateString)
      );
    }
  }

  if (availabilities.length === 0) {
    return [];
  }

  const slots: TimeSlot[] = [];
  const now = new Date();

  for (const avail of availabilities) {
    const [startH, startM] = avail.start_time.split(':').map(Number);
    const [endH, endM] = avail.end_time.split(':').map(Number);

    const slotDurationMs = avail.slot_duration_minutes * 60 * 1000;
    const windowStart = new Date(`${dateString}T${avail.start_time}`);
    const windowEnd = new Date(`${dateString}T${avail.end_time}`);

    let current = new Date(windowStart);

    while (current.getTime() + slotDurationMs <= windowEnd.getTime()) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + slotDurationMs);

      const isPast = slotStart.getTime() <= now.getTime();

      // Check overlap with active appointments for doctor
      const isBooked = existingAppointments.some((apt) => {
        const aptStart = new Date(apt.slot_start).getTime();
        const aptEnd = new Date(apt.slot_end).getTime();
        return (
          apt.status !== 'CANCELLED' &&
          apt.status !== 'EXPIRED' &&
          slotStart.getTime() < aptEnd &&
          slotEnd.getTime() > aptStart
        );
      });

      const formatTime = (d: Date) =>
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        timeLabel: `${formatTime(slotStart)} - ${formatTime(slotEnd)}`,
        isAvailable: !isPast && !isBooked,
        reason: isPast ? 'Past slot' : isBooked ? 'Already reserved' : undefined,
      });

      current = new Date(current.getTime() + slotDurationMs);
    }
  }

  return slots;
}

/**
 * Patient Books an Appointment (RPC: create_appointment)
 */
export async function bookAppointment(
  input: BookAppointmentInput
): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('create_appointment', {
        p_doctor_id: input.doctorId,
        p_appointment_type: input.appointmentType,
        p_slot_start: input.slotStart,
        p_slot_end: input.slotEnd,
        p_appointment_reason: input.appointmentReason?.trim() || null,
        p_patient_note: input.patientNote?.trim() || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, appointmentId: data.appointment_id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to book appointment' };
    }
  }

  // Local Mock Implementation
  const now = new Date();
  const slotStart = new Date(input.slotStart);
  const slotEnd = new Date(input.slotEnd);

  if (slotEnd <= slotStart) {
    return { success: false, error: 'Slot end time must be after slot start time.' };
  }
  if (slotStart <= now) {
    return { success: false, error: 'Cannot book appointment in the past.' };
  }

  const existing = getLocalAppointments();
  const docOverlap = existing.some(
    (a) =>
      a.doctor_id === input.doctorId &&
      (a.status === 'PENDING' || a.status === 'CONFIRMED') &&
      slotStart.getTime() < new Date(a.slot_end).getTime() &&
      slotEnd.getTime() > new Date(a.slot_start).getTime()
  );

  if (docOverlap) {
    return { success: false, error: 'Doctor already has an active appointment overlapping this time slot.' };
  }

  const doctor = DEFAULT_DOCTORS.find((d) => d.id === input.doctorId) || DEFAULT_DOCTORS[0];
  const newId = `apt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newApt: Appointment = {
    id: newId,
    patient_id: 'mock-patient-profile-id',
    doctor_id: input.doctorId,
    appointment_type: input.appointmentType,
    slot_start: input.slotStart,
    slot_end: input.slotEnd,
    status: 'PENDING',
    appointment_reason: input.appointmentReason?.trim() || null,
    patient_note: input.patientNote?.trim() || null,
    doctor_name: doctor.doctor_name,
    specialization: doctor.specialization,
    hospital_name: doctor.hospital_name,
    patient_name: 'Sunita Patil',
    health_wallet_id: 'HW-TN-38236621',
    blood_group: 'B+',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  existing.unshift(newApt);
  saveLocalAppointments(existing);

  recordMockAuditLog({
    user_id: 'mock-patient-uid',
    role: 'PATIENT',
    patient_id: 'mock-patient-profile-id',
    action: 'APPOINTMENT_BOOKED',
    record_type: 'APPOINTMENT',
    record_id: newId,
    status: 'SUCCESS',
    metadata: {
      doctor_id: input.doctorId,
      doctor_name: doctor.doctor_name,
      appointment_type: input.appointmentType,
      slot_start: input.slotStart,
      slot_end: input.slotEnd,
    },
  });

  recordMockNotification({
    user_id: doctor.user_id,
    type: 'APPOINTMENT_BOOKED',
    title: 'New Appointment Request',
    message: `Patient Sunita Patil booked a ${input.appointmentType} appointment for ${new Date(input.slotStart).toLocaleString()}`,
    patient_id: 'mock-patient-profile-id',
    related_record_id: newId,
    is_read: false,
  });

  return { success: true, appointmentId: newId };
}

/**
 * Doctor Confirms an Appointment (RPC: confirm_appointment)
 */
export async function confirmAppointment(
  appointmentId: string,
  doctorNote?: string
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('confirm_appointment', {
        p_appointment_id: appointmentId,
        p_doctor_note: doctorNote?.trim() || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to confirm appointment' };
    }
  }

  // Local Mock
  const list = getLocalAppointments();
  const apt = list.find((a) => a.id === appointmentId);
  if (!apt) return { success: false, error: 'Appointment not found' };

  if (apt.status !== 'PENDING' && apt.status !== 'RESCHEDULED') {
    return { success: false, error: `Cannot confirm appointment with status: ${apt.status}` };
  }

  const now = new Date().toISOString();
  apt.status = 'CONFIRMED';
  apt.confirmed_at = now;
  apt.updated_at = now;
  if (doctorNote) apt.doctor_note = doctorNote.trim();

  saveLocalAppointments(list);

  recordMockAuditLog({
    user_id: 'mock-doctor-uid',
    role: 'DOCTOR',
    patient_id: apt.patient_id,
    action: 'APPOINTMENT_CONFIRMED',
    record_type: 'APPOINTMENT',
    record_id: apt.id,
    status: 'SUCCESS',
    metadata: {
      slot_start: apt.slot_start,
      slot_end: apt.slot_end,
    },
  });

  recordMockNotification({
    user_id: 'mock-patient-uid',
    type: 'APPOINTMENT_CONFIRMED',
    title: 'Appointment Confirmed',
    message: `Your appointment on ${new Date(apt.slot_start).toLocaleString()} has been confirmed.`,
    patient_id: apt.patient_id,
    related_record_id: apt.id,
    is_read: false,
  });

  return { success: true };
}

/**
 * Cancel an Appointment (RPC: cancel_appointment)
 */
export async function cancelAppointment(
  appointmentId: string,
  cancellationReason: string
): Promise<{ success: boolean; error?: string }> {
  const cleanReason = cancellationReason.trim();
  if (!cleanReason) {
    return { success: false, error: 'Cancellation reason is required.' };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('cancel_appointment', {
        p_appointment_id: appointmentId,
        p_cancellation_reason: cleanReason,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to cancel appointment' };
    }
  }

  // Local Mock
  const list = getLocalAppointments();
  const apt = list.find((a) => a.id === appointmentId);
  if (!apt) return { success: false, error: 'Appointment not found' };

  if (apt.status === 'COMPLETED' || apt.status === 'CANCELLED' || apt.status === 'EXPIRED') {
    return { success: false, error: `Cannot cancel appointment with status: ${apt.status}` };
  }

  const now = new Date().toISOString();
  apt.status = 'CANCELLED';
  apt.cancellation_reason = cleanReason;
  apt.cancelled_at = now;
  apt.updated_at = now;

  saveLocalAppointments(list);

  recordMockAuditLog({
    user_id: 'mock-user-uid',
    role: 'PATIENT',
    patient_id: apt.patient_id,
    action: 'APPOINTMENT_CANCELLED',
    record_type: 'APPOINTMENT',
    record_id: apt.id,
    status: 'CANCELLED',
    reason: cleanReason,
  });

  recordMockNotification({
    user_id: 'mock-doctor-uid',
    type: 'APPOINTMENT_CANCELLED',
    title: 'Appointment Cancelled',
    message: `Appointment for ${new Date(apt.slot_start).toLocaleString()} was cancelled. Reason: ${cleanReason}`,
    patient_id: apt.patient_id,
    related_record_id: apt.id,
    is_read: false,
  });

  return { success: true };
}

/**
 * Reschedule an Appointment (RPC: reschedule_appointment)
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newSlotStart: string,
  newSlotEnd: string,
  rescheduleReason?: string
): Promise<{ success: boolean; newAppointmentId?: string; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('reschedule_appointment', {
        p_appointment_id: appointmentId,
        p_new_slot_start: newSlotStart,
        p_new_slot_end: newSlotEnd,
        p_reschedule_reason: rescheduleReason?.trim() || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, newAppointmentId: data.new_appointment_id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reschedule appointment' };
    }
  }

  // Local Mock
  const list = getLocalAppointments();
  const apt = list.find((a) => a.id === appointmentId);
  if (!apt) return { success: false, error: 'Appointment not found' };

  if (apt.status !== 'PENDING' && apt.status !== 'CONFIRMED') {
    return { success: false, error: `Cannot reschedule appointment with status: ${apt.status}` };
  }

  const now = new Date();
  const nStart = new Date(newSlotStart);
  const nEnd = new Date(newSlotEnd);

  if (nEnd <= nStart) {
    return { success: false, error: 'New slot end time must be after start time.' };
  }
  if (nStart <= now) {
    return { success: false, error: 'Cannot reschedule to a past time slot.' };
  }

  const docOverlap = list.some(
    (a) =>
      a.id !== appointmentId &&
      a.doctor_id === apt.doctor_id &&
      (a.status === 'PENDING' || a.status === 'CONFIRMED') &&
      nStart.getTime() < new Date(a.slot_end).getTime() &&
      nEnd.getTime() > new Date(a.slot_start).getTime()
  );

  if (docOverlap) {
    return { success: false, error: 'Doctor already has an active appointment overlapping the new time slot.' };
  }

  apt.status = 'RESCHEDULED';
  apt.cancellation_reason = rescheduleReason?.trim() || 'Rescheduled to new time slot';
  apt.updated_at = new Date().toISOString();

  const newId = `apt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newApt: Appointment = {
    ...apt,
    id: newId,
    slot_start: newSlotStart,
    slot_end: newSlotEnd,
    status: 'PENDING',
    rescheduled_from_id: appointmentId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    confirmed_at: null,
    cancelled_at: null,
    completed_at: null,
  };

  list.unshift(newApt);
  saveLocalAppointments(list);

  recordMockAuditLog({
    user_id: 'mock-user-uid',
    role: 'PATIENT',
    patient_id: apt.patient_id,
    action: 'APPOINTMENT_RESCHEDULED',
    record_type: 'APPOINTMENT',
    record_id: appointmentId,
    status: 'SUCCESS',
    metadata: {
      original_appointment_id: appointmentId,
      new_appointment_id: newId,
      new_slot_start: newSlotStart,
    },
  });

  recordMockNotification({
    user_id: 'mock-doctor-uid',
    type: 'APPOINTMENT_RESCHEDULED',
    title: 'Appointment Rescheduled',
    message: `Appointment rescheduled to ${new Date(newSlotStart).toLocaleString()}`,
    patient_id: apt.patient_id,
    related_record_id: newId,
    is_read: false,
  });

  return { success: true, newAppointmentId: newId };
}

/**
 * Complete an Appointment (RPC: complete_appointment)
 */
export async function completeAppointment(
  appointmentId: string,
  doctorNote?: string
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('complete_appointment', {
        p_appointment_id: appointmentId,
        p_doctor_note: doctorNote?.trim() || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to complete appointment' };
    }
  }

  // Local Mock
  const list = getLocalAppointments();
  const apt = list.find((a) => a.id === appointmentId);
  if (!apt) return { success: false, error: 'Appointment not found' };

  if (apt.status !== 'CONFIRMED') {
    return { success: false, error: `Only CONFIRMED appointments can be completed. Current status: ${apt.status}` };
  }

  const now = new Date().toISOString();
  apt.status = 'COMPLETED';
  apt.completed_at = now;
  apt.updated_at = now;
  if (doctorNote) apt.doctor_note = doctorNote.trim();

  saveLocalAppointments(list);

  recordMockAuditLog({
    user_id: 'mock-doctor-uid',
    role: 'DOCTOR',
    patient_id: apt.patient_id,
    action: 'APPOINTMENT_COMPLETED',
    record_type: 'APPOINTMENT',
    record_id: apt.id,
    status: 'SUCCESS',
  });

  recordMockNotification({
    user_id: 'mock-patient-uid',
    type: 'APPOINTMENT_COMPLETED',
    title: 'Appointment Completed',
    message: `Your appointment on ${new Date(apt.slot_start).toLocaleString()} was marked as completed.`,
    patient_id: apt.patient_id,
    related_record_id: apt.id,
    is_read: false,
  });

  return { success: true };
}

/**
 * Fetch patient's appointments (RPC: list_patient_appointments)
 */
export async function getPatientAppointments(): Promise<Appointment[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('list_patient_appointments');
      if (error) {
        console.warn('Error fetching patient appointments:', error.message);
        return getLocalAppointments();
      }
      return (data as Appointment[]) || [];
    } catch {
      return getLocalAppointments();
    }
  }

  return getLocalAppointments();
}

/**
 * Fetch doctor's appointments (RPC: list_doctor_appointments)
 */
export async function getDoctorAppointments(statusFilter?: AppointmentStatus): Promise<Appointment[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('list_doctor_appointments', {
        p_status: statusFilter || null,
      });
      if (error) {
        console.warn('Error fetching doctor appointments:', error.message);
        const list = getLocalAppointments();
        return statusFilter ? list.filter((a) => a.status === statusFilter) : list;
      }
      return (data as Appointment[]) || [];
    } catch {
      const list = getLocalAppointments();
      return statusFilter ? list.filter((a) => a.status === statusFilter) : list;
    }
  }

  const list = getLocalAppointments();
  return statusFilter ? list.filter((a) => a.status === statusFilter) : list;
}

/**
 * Doctor Sets Availability Window (RPC: set_doctor_availability)
 */
export async function setDoctorAvailability(
  input: SetAvailabilityInput
): Promise<{ success: boolean; availabilityId?: string; error?: string }> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('set_doctor_availability', {
        p_availability_date: input.availabilityDate,
        p_start_time: input.startTime,
        p_end_time: input.endTime,
        p_slot_duration_minutes: input.slotDurationMinutes || 30,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, availabilityId: data.availability_id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to set availability' };
    }
  }

  // Local Mock
  const list = getLocalAvailabilities();
  const newId = `avail-${Date.now()}`;
  list.push({
    id: newId,
    doctor_id: DEMO_DOCTOR_PROFILE.id,
    availability_date: input.availabilityDate,
    start_time: input.startTime,
    end_time: input.endTime,
    slot_duration_minutes: input.slotDurationMinutes || 30,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  saveLocalAvailabilities(list);
  return { success: true, availabilityId: newId };
}
