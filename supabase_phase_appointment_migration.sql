-- ====================================================================
-- HEALTH WALLET V2 — PHASE: APPOINTMENT ENGINE
-- ====================================================================
-- Instructions:
-- Execute this migration script in your Supabase Project SQL Editor:
-- Supabase Dashboard > SQL Editor > New Query > Paste & Run
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- --------------------------------------------------------------------
-- 2. TABLE: public.doctor_availability
-- Minimum availability model required for appointment booking
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  availability_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 30 CHECK (slot_duration_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_avail_time_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_doctor_availability_doc_date ON public.doctor_availability(doctor_id, availability_date);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_active ON public.doctor_availability(is_active);

-- Trigger for doctor_availability updated_at
CREATE OR REPLACE FUNCTION public.trg_doctor_availability_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doctor_availability_updated_at ON public.doctor_availability;
CREATE TRIGGER trg_doctor_availability_updated_at
BEFORE UPDATE ON public.doctor_availability
FOR EACH ROW
EXECUTE FUNCTION public.trg_doctor_availability_set_updated_at();

-- --------------------------------------------------------------------
-- 3. TABLE: public.appointments
-- Core appointment records with double-booking prevention & audit tracking
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('IN_PERSON', 'TELEHEALTH')),
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'EXPIRED')),
  appointment_reason TEXT NULL,
  patient_note TEXT NULL,
  doctor_note TEXT NULL,
  cancellation_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  rescheduled_from_id UUID NULL REFERENCES public.appointments(id) ON DELETE SET NULL,
  CONSTRAINT chk_appointment_slot_order CHECK (slot_end > slot_start),
  -- Database-level Double-Booking Protection for Doctor
  CONSTRAINT no_overlapping_doctor_appointments
    EXCLUDE USING gist (
      doctor_id WITH =,
      tstzrange(slot_start, slot_end, '[)') WITH &&
    )
    WHERE (status IN ('PENDING', 'CONFIRMED')),
  -- Database-level Double-Booking Protection for Patient
  CONSTRAINT no_overlapping_patient_appointments
    EXCLUDE USING gist (
      patient_id WITH =,
      tstzrange(slot_start, slot_end, '[)') WITH &&
    )
    WHERE (status IN ('PENDING', 'CONFIRMED'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_slot_start ON public.appointments(slot_start);
CREATE INDEX IF NOT EXISTS idx_appointments_rescheduled_from ON public.appointments(rescheduled_from_id);

-- --------------------------------------------------------------------
-- 4. SERVER-SIDE STATE TRANSITION VALIDATION TRIGGER
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_validate_appointment_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = OLD.status THEN
      NEW.updated_at = NOW();
      RETURN NEW;
    END IF;

    -- Valid transitions from PENDING
    IF OLD.status = 'PENDING' AND NEW.status IN ('CONFIRMED', 'CANCELLED', 'EXPIRED') THEN
      IF NEW.status = 'CONFIRMED' AND NEW.confirmed_at IS NULL THEN
        NEW.confirmed_at = NOW();
      ELSIF NEW.status = 'CANCELLED' AND NEW.cancelled_at IS NULL THEN
        NEW.cancelled_at = NOW();
      END IF;
      NEW.updated_at = NOW();
      RETURN NEW;
    END IF;

    -- Valid transitions from CONFIRMED
    IF OLD.status = 'CONFIRMED' AND NEW.status IN ('COMPLETED', 'CANCELLED', 'RESCHEDULED') THEN
      IF NEW.status = 'COMPLETED' AND NEW.completed_at IS NULL THEN
        NEW.completed_at = NOW();
      ELSIF NEW.status = 'CANCELLED' AND NEW.cancelled_at IS NULL THEN
        NEW.cancelled_at = NOW();
      END IF;
      NEW.updated_at = NOW();
      RETURN NEW;
    END IF;

    -- Valid transitions from RESCHEDULED
    IF OLD.status = 'RESCHEDULED' AND NEW.status IN ('PENDING', 'CONFIRMED', 'CANCELLED') THEN
      IF NEW.status = 'CANCELLED' AND NEW.cancelled_at IS NULL THEN
        NEW.cancelled_at = NOW();
      END IF;
      NEW.updated_at = NOW();
      RETURN NEW;
    END IF;

    -- COMPLETED, CANCELLED, EXPIRED are terminal states
    RAISE EXCEPTION 'Invalid appointment state transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_transition ON public.appointments;
CREATE TRIGGER trg_appointment_transition
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.trg_validate_appointment_transition();

-- --------------------------------------------------------------------
-- 5. AUDIT LOGS & NOTIFICATIONS CONSTRAINTS EXPANSION
-- --------------------------------------------------------------------
-- Expand action check on audit_logs to include appointment actions
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS chk_audit_action;
ALTER TABLE public.audit_logs ADD CONSTRAINT chk_audit_action CHECK (
  action IN (
    'VIEW_MEDICAL_RECORD',
    'CREATE_CONSULTATION',
    'CREATE_DIAGNOSIS',
    'CREATE_TREATMENT',
    'CREATE_PRESCRIPTION',
    'CREATE_LAB_REPORT',
    'REQUEST_ACCESS',
    'GRANT_CONSENT',
    'DENY_CONSENT',
    'REVOKE_CONSENT',
    'EXPIRED_CONSENT',
    'SHARE_PRESCRIPTION',
    'PHARMACY_VIEW_PRESCRIPTION',
    'DISPENSE_PRESCRIPTION',
    'PHARMACY_PARTIAL_DISPENSE',
    'PHARMACY_DECLINE_PRESCRIPTION',
    'APPOINTMENT_BOOKED',
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT_CANCELLED',
    'APPOINTMENT_RESCHEDULED',
    'APPOINTMENT_COMPLETED',
    'APPOINTMENT_EXPIRED'
  )
);

-- Expand notification type check to include appointment notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS chk_notification_type;
ALTER TABLE public.notifications ADD CONSTRAINT chk_notification_type CHECK (
  type IN (
    'ACCESS_REQUEST',
    'ACCESS_GRANTED',
    'ACCESS_DENIED',
    'ACCESS_REVOKED',
    'CONSENT_EXPIRED',
    'RECORD_VIEWED',
    'CONSULTATION_CREATED',
    'DIAGNOSIS_CREATED',
    'TREATMENT_CREATED',
    'PRESCRIPTION_CREATED',
    'LAB_REPORT_CREATED',
    'PRESCRIPTION_SHARED',
    'PRESCRIPTION_VIEWED_BY_PHARMACY',
    'PRESCRIPTION_DISPENSED',
    'PRESCRIPTION_PARTIALLY_DISPENSED',
    'PRESCRIPTION_NOT_DISPENSED',
    'APPOINTMENT_BOOKED',
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT_CANCELLED',
    'APPOINTMENT_RESCHEDULED',
    'APPOINTMENT_COMPLETED'
  )
);

-- --------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- DOCTOR_AVAILABILITY RLS
-- Doctors can view their own availability
DROP POLICY IF EXISTS "Doctors can view own availability" ON public.doctor_availability;
CREATE POLICY "Doctors can view own availability"
ON public.doctor_availability FOR SELECT TO authenticated
USING (doctor_id = public.get_authenticated_doctor_profile_id());

-- Doctors can insert their own availability
DROP POLICY IF EXISTS "Doctors can insert own availability" ON public.doctor_availability;
CREATE POLICY "Doctors can insert own availability"
ON public.doctor_availability FOR INSERT TO authenticated
WITH CHECK (doctor_id = public.get_authenticated_doctor_profile_id());

-- Doctors can update their own availability
DROP POLICY IF EXISTS "Doctors can update own availability" ON public.doctor_availability;
CREATE POLICY "Doctors can update own availability"
ON public.doctor_availability FOR UPDATE TO authenticated
USING (doctor_id = public.get_authenticated_doctor_profile_id())
WITH CHECK (doctor_id = public.get_authenticated_doctor_profile_id());

-- Doctors can delete their own availability
DROP POLICY IF EXISTS "Doctors can delete own availability" ON public.doctor_availability;
CREATE POLICY "Doctors can delete own availability"
ON public.doctor_availability FOR DELETE TO authenticated
USING (doctor_id = public.get_authenticated_doctor_profile_id());

-- Patients can view active upcoming availability to see bookable slots
DROP POLICY IF EXISTS "Patients can view active doctor availability" ON public.doctor_availability;
CREATE POLICY "Patients can view active doctor availability"
ON public.doctor_availability FOR SELECT TO authenticated
USING (
  is_active = TRUE
  AND availability_date >= CURRENT_DATE
  AND EXISTS (SELECT 1 FROM public.patient_profiles WHERE user_id = auth.uid())
);

-- APPOINTMENTS RLS
-- Patients can view their own appointments
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
CREATE POLICY "Patients can view own appointments"
ON public.appointments FOR SELECT TO authenticated
USING (patient_id = public.get_authenticated_patient_profile_id());

-- Doctors can view their assigned appointments
DROP POLICY IF EXISTS "Doctors can view assigned appointments" ON public.appointments;
CREATE POLICY "Doctors can view assigned appointments"
ON public.appointments FOR SELECT TO authenticated
USING (doctor_id = public.get_authenticated_doctor_profile_id());

-- Direct client INSERT, UPDATE, DELETE on appointments revoked
-- (all operations must use secure RPCs to enforce ownership, auditing, notifications & state machine)
REVOKE INSERT, UPDATE, DELETE ON public.appointments FROM anon, authenticated;

-- DOCTOR_PROFILES: Allow patients to view doctor profiles for appointment scheduling
DROP POLICY IF EXISTS "Patients can view doctor profiles for appointments" ON public.doctor_profiles;
CREATE POLICY "Patients can view doctor profiles for appointments"
ON public.doctor_profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.patient_profiles WHERE user_id = auth.uid()));

-- --------------------------------------------------------------------
-- 7. SECURE RPCS FOR APPOINTMENT ENGINE
-- --------------------------------------------------------------------

-- RPC 1: create_appointment
CREATE OR REPLACE FUNCTION public.create_appointment(
  p_doctor_id UUID,
  p_appointment_type TEXT,
  p_slot_start TIMESTAMPTZ,
  p_slot_end TIMESTAMPTZ,
  p_appointment_reason TEXT DEFAULT NULL,
  p_patient_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_patient_id UUID;
  v_patient RECORD;
  v_doctor RECORD;
  v_appointment_id UUID;
  v_slot_date DATE;
  v_slot_start_time TIME;
  v_slot_end_time TIME;
  v_has_availability BOOLEAN;
  v_doc_overlap_count INT;
  v_pat_overlap_count INT;
BEGIN
  -- 1. Identify caller patient
  v_caller_patient_id := public.get_authenticated_patient_profile_id();
  IF v_caller_patient_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not an authenticated patient.';
  END IF;

  SELECT id, patient_name, health_wallet_id, user_id INTO v_patient
  FROM public.patient_profiles
  WHERE id = v_caller_patient_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Patient profile not found.';
  END IF;

  -- 2. Validate doctor exists
  SELECT id, doctor_name, user_id INTO v_doctor
  FROM public.doctor_profiles
  WHERE id = p_doctor_id;

  IF v_doctor.id IS NULL THEN
    RAISE EXCEPTION 'Doctor profile not found.';
  END IF;

  -- 3. Validate appointment type
  IF p_appointment_type NOT IN ('IN_PERSON', 'TELEHEALTH') THEN
    RAISE EXCEPTION 'Invalid appointment type: %. Must be IN_PERSON or TELEHEALTH.', p_appointment_type;
  END IF;

  -- 4. Validate time slot
  IF p_slot_start IS NULL OR p_slot_end IS NULL THEN
    RAISE EXCEPTION 'Appointment slot start and end times are required.';
  END IF;

  IF p_slot_end <= p_slot_start THEN
    RAISE EXCEPTION 'Slot end time must be after slot start time.';
  END IF;

  IF p_slot_start <= NOW() THEN
    RAISE EXCEPTION 'Cannot book appointment in the past.';
  END IF;

  -- 5. Validate slot belongs to doctor availability
  v_slot_date := (p_slot_start AT TIME ZONE 'UTC')::DATE;
  v_slot_start_time := (p_slot_start AT TIME ZONE 'UTC')::TIME;
  v_slot_end_time := (p_slot_end AT TIME ZONE 'UTC')::TIME;

  SELECT EXISTS (
    SELECT 1 FROM public.doctor_availability
    WHERE doctor_id = p_doctor_id
      AND availability_date = v_slot_date
      AND start_time <= v_slot_start_time
      AND end_time >= v_slot_end_time
      AND is_active = TRUE
  ) INTO v_has_availability;

  IF NOT v_has_availability THEN
    RAISE EXCEPTION 'Selected slot is not within doctor active availability.';
  END IF;

  -- 6. Concurrency-safe Double-Booking Check (Application-level check before DB exclusion constraint)
  SELECT COUNT(*) INTO v_doc_overlap_count
  FROM public.appointments
  WHERE doctor_id = p_doctor_id
    AND status IN ('PENDING', 'CONFIRMED')
    AND tstzrange(slot_start, slot_end, '[)') && tstzrange(p_slot_start, p_slot_end, '[)');

  IF v_doc_overlap_count > 0 THEN
    RAISE EXCEPTION 'Doctor already has an active appointment overlapping this time slot.';
  END IF;

  SELECT COUNT(*) INTO v_pat_overlap_count
  FROM public.appointments
  WHERE patient_id = v_caller_patient_id
    AND status IN ('PENDING', 'CONFIRMED')
    AND tstzrange(slot_start, slot_end, '[)') && tstzrange(p_slot_start, p_slot_end, '[)');

  IF v_pat_overlap_count > 0 THEN
    RAISE EXCEPTION 'Patient already has an active appointment overlapping this time slot.';
  END IF;

  -- 7. Insert appointment (protected by GiST exclusion constraint against race conditions)
  INSERT INTO public.appointments (
    patient_id,
    doctor_id,
    appointment_type,
    slot_start,
    slot_end,
    status,
    appointment_reason,
    patient_note
  ) VALUES (
    v_caller_patient_id,
    p_doctor_id,
    p_appointment_type,
    p_slot_start,
    p_slot_end,
    'PENDING',
    trim(p_appointment_reason),
    trim(p_patient_note)
  )
  RETURNING id INTO v_appointment_id;

  -- 8. Create Audit Entry
  INSERT INTO public.audit_logs (
    user_id,
    role,
    patient_id,
    action,
    record_type,
    record_id,
    status,
    metadata
  ) VALUES (
    auth.uid(),
    'PATIENT',
    v_caller_patient_id,
    'APPOINTMENT_BOOKED',
    'APPOINTMENT',
    v_appointment_id,
    'SUCCESS',
    jsonb_build_object(
      'doctor_id', p_doctor_id,
      'doctor_name', v_doctor.doctor_name,
      'appointment_type', p_appointment_type,
      'slot_start', p_slot_start,
      'slot_end', p_slot_end
    )
  );

  -- 9. Create Notification for Doctor
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    patient_id,
    related_record_id
  ) VALUES (
    v_doctor.user_id,
    'APPOINTMENT_BOOKED',
    'New Appointment Request',
    'Patient ' || v_patient.patient_name || ' booked a ' || p_appointment_type || ' appointment for ' || to_char(p_slot_start, 'YYYY-MM-DD HH24:MI'),
    v_caller_patient_id,
    v_appointment_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment_id,
    'status', 'PENDING'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_appointment(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;

-- RPC 2: confirm_appointment
CREATE OR REPLACE FUNCTION public.confirm_appointment(
  p_appointment_id UUID,
  p_doctor_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_doctor_id UUID;
  v_apt RECORD;
  v_patient RECORD;
  v_doctor RECORD;
BEGIN
  -- 1. Identify caller doctor
  v_caller_doctor_id := public.get_authenticated_doctor_profile_id();
  IF v_caller_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not an authenticated doctor.';
  END IF;

  SELECT * INTO v_apt
  FROM public.appointments
  WHERE id = p_appointment_id;

  IF v_apt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  -- 2. Verify doctor owns this appointment
  IF v_apt.doctor_id <> v_caller_doctor_id THEN
    RAISE EXCEPTION 'Access Denied: You are not assigned to this appointment.';
  END IF;

  -- 3. Verify status transition
  IF v_apt.status NOT IN ('PENDING', 'RESCHEDULED') THEN
    RAISE EXCEPTION 'Cannot confirm appointment with status: %', v_apt.status;
  END IF;

  -- 4. Update appointment status
  UPDATE public.appointments
  SET status = 'CONFIRMED',
      doctor_note = COALESCE(trim(p_doctor_note), doctor_note),
      confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_appointment_id;

  -- 5. Fetch details for audit & notification
  SELECT patient_name, user_id INTO v_patient
  FROM public.patient_profiles
  WHERE id = v_apt.patient_id;

  SELECT doctor_name INTO v_doctor
  FROM public.doctor_profiles
  WHERE id = v_caller_doctor_id;

  -- 6. Insert Audit Log
  INSERT INTO public.audit_logs (
    user_id,
    role,
    patient_id,
    action,
    record_type,
    record_id,
    status,
    metadata
  ) VALUES (
    auth.uid(),
    'DOCTOR',
    v_apt.patient_id,
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT',
    p_appointment_id,
    'SUCCESS',
    jsonb_build_object(
      'doctor_id', v_caller_doctor_id,
      'doctor_name', v_doctor.doctor_name,
      'slot_start', v_apt.slot_start,
      'slot_end', v_apt.slot_end
    )
  );

  -- 7. Notify Patient
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    patient_id,
    related_record_id
  ) VALUES (
    v_patient.user_id,
    'APPOINTMENT_CONFIRMED',
    'Appointment Confirmed',
    v_doctor.doctor_name || ' confirmed your appointment for ' || to_char(v_apt.slot_start, 'YYYY-MM-DD HH24:MI'),
    v_apt.patient_id,
    p_appointment_id
  );

  RETURN jsonb_build_object('success', true, 'status', 'CONFIRMED');
END;
$$;
GRANT EXECUTE ON FUNCTION public.confirm_appointment(UUID, TEXT) TO authenticated;

-- RPC 3: cancel_appointment
CREATE OR REPLACE FUNCTION public.cancel_appointment(
  p_appointment_id UUID,
  p_cancellation_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_pat_id UUID;
  v_caller_doc_id UUID;
  v_apt RECORD;
  v_is_patient BOOLEAN := FALSE;
  v_is_doctor BOOLEAN := FALSE;
  v_notify_user_id UUID;
  v_caller_name TEXT;
  v_patient RECORD;
  v_doctor RECORD;
  v_clean_reason TEXT;
BEGIN
  v_clean_reason := trim(p_cancellation_reason);
  IF v_clean_reason IS NULL OR v_clean_reason = '' THEN
    RAISE EXCEPTION 'Cancellation reason is required.';
  END IF;

  SELECT * INTO v_apt
  FROM public.appointments
  WHERE id = p_appointment_id;

  IF v_apt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  -- Verify state allows cancellation
  IF v_apt.status IN ('COMPLETED', 'CANCELLED', 'EXPIRED') THEN
    RAISE EXCEPTION 'Cannot cancel appointment with status: %', v_apt.status;
  END IF;

  -- Determine authorization
  v_caller_pat_id := public.get_authenticated_patient_profile_id();
  v_caller_doc_id := public.get_authenticated_doctor_profile_id();

  SELECT patient_name, user_id INTO v_patient
  FROM public.patient_profiles WHERE id = v_apt.patient_id;

  SELECT doctor_name, user_id INTO v_doctor
  FROM public.doctor_profiles WHERE id = v_apt.doctor_id;

  IF v_caller_pat_id IS NOT NULL AND v_caller_pat_id = v_apt.patient_id THEN
    v_is_patient := TRUE;
    v_notify_user_id := v_doctor.user_id;
    v_caller_name := v_patient.patient_name;
  ELSIF v_caller_doc_id IS NOT NULL AND v_caller_doc_id = v_apt.doctor_id THEN
    v_is_doctor := TRUE;
    v_notify_user_id := v_patient.user_id;
    v_caller_name := v_doctor.doctor_name;
  ELSE
    RAISE EXCEPTION 'Access Denied: You are not authorized to cancel this appointment.';
  END IF;

  -- Update appointment status (releases slot immediately for future bookings)
  UPDATE public.appointments
  SET status = 'CANCELLED',
      cancellation_reason = v_clean_reason,
      cancelled_at = NOW(),
      updated_at = NOW()
  WHERE id = p_appointment_id;

  -- Audit Log
  INSERT INTO public.audit_logs (
    user_id,
    role,
    patient_id,
    action,
    record_type,
    record_id,
    status,
    reason,
    metadata
  ) VALUES (
    auth.uid(),
    CASE WHEN v_is_patient THEN 'PATIENT' ELSE 'DOCTOR' END,
    v_apt.patient_id,
    'APPOINTMENT_CANCELLED',
    'APPOINTMENT',
    p_appointment_id,
    'CANCELLED',
    v_clean_reason,
    jsonb_build_object(
      'cancelled_by', CASE WHEN v_is_patient THEN 'PATIENT' ELSE 'DOCTOR' END,
      'slot_start', v_apt.slot_start,
      'slot_end', v_apt.slot_end
    )
  );

  -- Notification to the other participant
  IF v_notify_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      patient_id,
      related_record_id
    ) VALUES (
      v_notify_user_id,
      'APPOINTMENT_CANCELLED',
      'Appointment Cancelled',
      v_caller_name || ' cancelled the appointment scheduled for ' || to_char(v_apt.slot_start, 'YYYY-MM-DD HH24:MI') || '. Reason: ' || v_clean_reason,
      v_apt.patient_id,
      p_appointment_id
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'CANCELLED');
END;
$$;
GRANT EXECUTE ON FUNCTION public.cancel_appointment(UUID, TEXT) TO authenticated;

-- RPC 4: reschedule_appointment
CREATE OR REPLACE FUNCTION public.reschedule_appointment(
  p_appointment_id UUID,
  p_new_slot_start TIMESTAMPTZ,
  p_new_slot_end TIMESTAMPTZ,
  p_reschedule_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_pat_id UUID;
  v_caller_doc_id UUID;
  v_apt RECORD;
  v_is_patient BOOLEAN := FALSE;
  v_is_doctor BOOLEAN := FALSE;
  v_notify_user_id UUID;
  v_patient RECORD;
  v_doctor RECORD;
  v_new_apt_id UUID;
  v_slot_date DATE;
  v_slot_start_time TIME;
  v_slot_end_time TIME;
  v_has_availability BOOLEAN;
  v_doc_overlap_count INT;
  v_pat_overlap_count INT;
BEGIN
  SELECT * INTO v_apt
  FROM public.appointments
  WHERE id = p_appointment_id;

  IF v_apt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  -- State check: only PENDING or CONFIRMED can be rescheduled
  IF v_apt.status NOT IN ('PENDING', 'CONFIRMED') THEN
    RAISE EXCEPTION 'Cannot reschedule appointment with status: %', v_apt.status;
  END IF;

  -- Determine caller role and authorization
  v_caller_pat_id := public.get_authenticated_patient_profile_id();
  v_caller_doc_id := public.get_authenticated_doctor_profile_id();

  SELECT patient_name, user_id INTO v_patient
  FROM public.patient_profiles WHERE id = v_apt.patient_id;

  SELECT doctor_name, user_id INTO v_doctor
  FROM public.doctor_profiles WHERE id = v_apt.doctor_id;

  IF v_caller_pat_id IS NOT NULL AND v_caller_pat_id = v_apt.patient_id THEN
    v_is_patient := TRUE;
    v_notify_user_id := v_doctor.user_id;
  ELSIF v_caller_doc_id IS NOT NULL AND v_caller_doc_id = v_apt.doctor_id THEN
    v_is_doctor := TRUE;
    v_notify_user_id := v_patient.user_id;
  ELSE
    RAISE EXCEPTION 'Access Denied: You are not authorized to reschedule this appointment.';
  END IF;

  -- Validate new slot times
  IF p_new_slot_start IS NULL OR p_new_slot_end IS NULL THEN
    RAISE EXCEPTION 'New slot start and end times are required.';
  END IF;

  IF p_new_slot_end <= p_new_slot_start THEN
    RAISE EXCEPTION 'New slot end time must be after start time.';
  END IF;

  IF p_new_slot_start <= NOW() THEN
    RAISE EXCEPTION 'Cannot reschedule to a past time slot.';
  END IF;

  -- Validate new slot against doctor's active availability
  v_slot_date := (p_new_slot_start AT TIME ZONE 'UTC')::DATE;
  v_slot_start_time := (p_new_slot_start AT TIME ZONE 'UTC')::TIME;
  v_slot_end_time := (p_new_slot_end AT TIME ZONE 'UTC')::TIME;

  SELECT EXISTS (
    SELECT 1 FROM public.doctor_availability
    WHERE doctor_id = v_apt.doctor_id
      AND availability_date = v_slot_date
      AND start_time <= v_slot_start_time
      AND end_time >= v_slot_end_time
      AND is_active = TRUE
  ) INTO v_has_availability;

  IF NOT v_has_availability THEN
    RAISE EXCEPTION 'Selected new slot is not within doctor active availability.';
  END IF;

  -- Check for overlaps on new slot (excluding current appointment being rescheduled)
  SELECT COUNT(*) INTO v_doc_overlap_count
  FROM public.appointments
  WHERE doctor_id = v_apt.doctor_id
    AND id <> p_appointment_id
    AND status IN ('PENDING', 'CONFIRMED')
    AND tstzrange(slot_start, slot_end, '[)') && tstzrange(p_new_slot_start, p_new_slot_end, '[)');

  IF v_doc_overlap_count > 0 THEN
    RAISE EXCEPTION 'Doctor already has an active appointment overlapping the new time slot.';
  END IF;

  SELECT COUNT(*) INTO v_pat_overlap_count
  FROM public.appointments
  WHERE patient_id = v_apt.patient_id
    AND id <> p_appointment_id
    AND status IN ('PENDING', 'CONFIRMED')
    AND tstzrange(slot_start, slot_end, '[)') && tstzrange(p_new_slot_start, p_new_slot_end, '[)');

  IF v_pat_overlap_count > 0 THEN
    RAISE EXCEPTION 'Patient already has an active appointment overlapping the new time slot.';
  END IF;

  -- 1. Mark existing appointment as RESCHEDULED
  UPDATE public.appointments
  SET status = 'RESCHEDULED',
      cancellation_reason = COALESCE(trim(p_reschedule_reason), 'Rescheduled to new time slot'),
      updated_at = NOW()
  WHERE id = p_appointment_id;

  -- 2. Create new appointment record linked via rescheduled_from_id
  INSERT INTO public.appointments (
    patient_id,
    doctor_id,
    appointment_type,
    slot_start,
    slot_end,
    status,
    appointment_reason,
    patient_note,
    rescheduled_from_id
  ) VALUES (
    v_apt.patient_id,
    v_apt.doctor_id,
    v_apt.appointment_type,
    p_new_slot_start,
    p_new_slot_end,
    'PENDING',
    v_apt.appointment_reason,
    COALESCE(trim(p_reschedule_reason), v_apt.patient_note),
    p_appointment_id
  )
  RETURNING id INTO v_new_apt_id;

  -- 3. Audit Log
  INSERT INTO public.audit_logs (
    user_id,
    role,
    patient_id,
    action,
    record_type,
    record_id,
    status,
    reason,
    metadata
  ) VALUES (
    auth.uid(),
    CASE WHEN v_is_patient THEN 'PATIENT' ELSE 'DOCTOR' END,
    v_apt.patient_id,
    'APPOINTMENT_RESCHEDULED',
    'APPOINTMENT',
    p_appointment_id,
    'SUCCESS',
    trim(p_reschedule_reason),
    jsonb_build_object(
      'original_appointment_id', p_appointment_id,
      'new_appointment_id', v_new_apt_id,
      'previous_slot_start', v_apt.slot_start,
      'new_slot_start', p_new_slot_start,
      'new_slot_end', p_new_slot_end
    )
  );

  -- 4. Notification to the other participant
  IF v_notify_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      patient_id,
      related_record_id
    ) VALUES (
      v_notify_user_id,
      'APPOINTMENT_RESCHEDULED',
      'Appointment Rescheduled',
      'Appointment has been rescheduled to ' || to_char(p_new_slot_start, 'YYYY-MM-DD HH24:MI'),
      v_apt.patient_id,
      v_new_apt_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'original_appointment_id', p_appointment_id,
    'new_appointment_id', v_new_apt_id,
    'status', 'PENDING'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.reschedule_appointment(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

-- RPC 5: complete_appointment
CREATE OR REPLACE FUNCTION public.complete_appointment(
  p_appointment_id UUID,
  p_doctor_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_doc_id UUID;
  v_apt RECORD;
  v_patient RECORD;
  v_doctor RECORD;
BEGIN
  -- 1. Identify caller doctor
  v_caller_doc_id := public.get_authenticated_doctor_profile_id();
  IF v_caller_doc_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not an authenticated doctor.';
  END IF;

  SELECT * INTO v_apt
  FROM public.appointments
  WHERE id = p_appointment_id;

  IF v_apt.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found.';
  END IF;

  IF v_apt.doctor_id <> v_caller_doc_id THEN
    RAISE EXCEPTION 'Access Denied: You are not assigned to this appointment.';
  END IF;

  IF v_apt.status <> 'CONFIRMED' THEN
    RAISE EXCEPTION 'Only CONFIRMED appointments can be marked as COMPLETED. Current status: %', v_apt.status;
  END IF;

  -- 2. Update status to COMPLETED
  UPDATE public.appointments
  SET status = 'COMPLETED',
      doctor_note = COALESCE(trim(p_doctor_note), doctor_note),
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_appointment_id;

  SELECT patient_name, user_id INTO v_patient
  FROM public.patient_profiles WHERE id = v_apt.patient_id;

  SELECT doctor_name INTO v_doctor
  FROM public.doctor_profiles WHERE id = v_caller_doc_id;

  -- 3. Audit Log
  INSERT INTO public.audit_logs (
    user_id,
    role,
    patient_id,
    action,
    record_type,
    record_id,
    status,
    metadata
  ) VALUES (
    auth.uid(),
    'DOCTOR',
    v_apt.patient_id,
    'APPOINTMENT_COMPLETED',
    'APPOINTMENT',
    p_appointment_id,
    'SUCCESS',
    jsonb_build_object(
      'doctor_id', v_caller_doc_id,
      'doctor_name', v_doctor.doctor_name,
      'slot_start', v_apt.slot_start,
      'slot_end', v_apt.slot_end
    )
  );

  -- 4. Notification to Patient
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    patient_id,
    related_record_id
  ) VALUES (
    v_patient.user_id,
    'APPOINTMENT_COMPLETED',
    'Appointment Completed',
    v_doctor.doctor_name || ' completed your appointment for ' || to_char(v_apt.slot_start, 'YYYY-MM-DD HH24:MI'),
    v_apt.patient_id,
    p_appointment_id
  );

  RETURN jsonb_build_object('success', true, 'status', 'COMPLETED');
END;
$$;
GRANT EXECUTE ON FUNCTION public.complete_appointment(UUID, TEXT) TO authenticated;

-- RPC 6: set_doctor_availability
CREATE OR REPLACE FUNCTION public.set_doctor_availability(
  p_availability_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_slot_duration_minutes INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_doc_id UUID;
  v_avail_id UUID;
BEGIN
  v_caller_doc_id := public.get_authenticated_doctor_profile_id();
  IF v_caller_doc_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not an authenticated doctor.';
  END IF;

  IF p_availability_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot set availability in the past.';
  END IF;

  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'End time must be after start time.';
  END IF;

  IF p_slot_duration_minutes <= 0 THEN
    RAISE EXCEPTION 'Slot duration must be greater than zero.';
  END IF;

  INSERT INTO public.doctor_availability (
    doctor_id,
    availability_date,
    start_time,
    end_time,
    slot_duration_minutes,
    is_active
  ) VALUES (
    v_caller_doc_id,
    p_availability_date,
    p_start_time,
    p_end_time,
    p_slot_duration_minutes,
    TRUE
  )
  RETURNING id INTO v_avail_id;

  RETURN jsonb_build_object('success', true, 'availability_id', v_avail_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_doctor_availability(DATE, TIME, TIME, INT) TO authenticated;

-- RPC 7: list_patient_appointments
CREATE OR REPLACE FUNCTION public.list_patient_appointments()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_pat_id UUID;
  v_result JSONB;
BEGIN
  v_caller_pat_id := public.get_authenticated_patient_profile_id();
  IF v_caller_pat_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not an authenticated patient.';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'patient_id', a.patient_id,
        'doctor_id', a.doctor_id,
        'appointment_type', a.appointment_type,
        'slot_start', a.slot_start,
        'slot_end', a.slot_end,
        'status', a.status,
        'appointment_reason', a.appointment_reason,
        'patient_note', a.patient_note,
        'doctor_note', a.doctor_note,
        'cancellation_reason', a.cancellation_reason,
        'created_at', a.created_at,
        'updated_at', a.updated_at,
        'confirmed_at', a.confirmed_at,
        'cancelled_at', a.cancelled_at,
        'completed_at', a.completed_at,
        'rescheduled_from_id', a.rescheduled_from_id,
        'doctor_name', d.doctor_name,
        'specialization', d.specialization,
        'hospital_name', d.hospital_name
      ) ORDER BY a.slot_start DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM public.appointments a
  JOIN public.doctor_profiles d ON d.id = a.doctor_id
  WHERE a.patient_id = v_caller_pat_id;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.list_patient_appointments() TO authenticated;

-- RPC 8: list_doctor_appointments (Minimal patient information only!)
CREATE OR REPLACE FUNCTION public.list_doctor_appointments(p_status TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_doc_id UUID;
  v_result JSONB;
BEGIN
  v_caller_doc_id := public.get_authenticated_doctor_profile_id();
  IF v_caller_doc_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not an authenticated doctor.';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'patient_id', a.patient_id,
        'doctor_id', a.doctor_id,
        'appointment_type', a.appointment_type,
        'slot_start', a.slot_start,
        'slot_end', a.slot_end,
        'status', a.status,
        'appointment_reason', a.appointment_reason,
        'patient_note', a.patient_note,
        'doctor_note', a.doctor_note,
        'cancellation_reason', a.cancellation_reason,
        'created_at', a.created_at,
        'updated_at', a.updated_at,
        'confirmed_at', a.confirmed_at,
        'cancelled_at', a.cancelled_at,
        'completed_at', a.completed_at,
        'rescheduled_from_id', a.rescheduled_from_id,
        -- Minimal patient information only (no medical history!)
        'patient_name', p.patient_name,
        'health_wallet_id', p.health_wallet_id,
        'blood_group', p.blood_group
      ) ORDER BY a.slot_start ASC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM public.appointments a
  JOIN public.patient_profiles p ON p.id = a.patient_id
  WHERE a.doctor_id = v_caller_doc_id
    AND (p_status IS NULL OR a.status = p_status);

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.list_doctor_appointments(TEXT) TO authenticated;
