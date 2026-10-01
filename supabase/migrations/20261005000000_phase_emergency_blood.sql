-- ====================================================================
-- MEDIMIND — EMERGENCY BLOOD NETWORK MIGRATION
-- ====================================================================
-- Tables, RLS, Audit Actions, Notifications, and Secure RPCs for:
--  1. public.emergency_blood_requests
--  2. public.emergency_blood_responses
--  3. Blood compatibility matching
--  4. Collision-safe HW-EMR-YYYY-XXXX request code generation
--  5. Lifecycle state transitions & DTMF call response handling
--  6. Hospital verification workflow
-- ====================================================================

-- 1. EXTEND AUDIT LOGS CHECK CONSTRAINT
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS chk_audit_action;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (
  action IN (
    'VIEW_MEDICAL_RECORD',
    'CREATE_CONSULTATION',
    'CREATE_DIAGNOSIS',
    'CREATE_TREATMENT',
    'CREATE_PRESCRIPTION',
    'REQUEST_ACCESS',
    'GRANT_CONSENT',
    'DENY_CONSENT',
    'REVOKE_CONSENT',
    'EXPIRED_CONSENT',
    'REGISTER_BLOOD_DONOR',
    'UPDATE_BLOOD_DONOR_PROFILE',
    'SEARCH_BLOOD_DONORS',
    'CREATE_BLOOD_DONATION_REQUEST',
    'ACCEPT_BLOOD_DONATION_REQUEST',
    'DECLINE_BLOOD_DONATION_REQUEST',
    'CANCEL_BLOOD_DONATION_REQUEST',
    'REGISTER_ORGAN_DONOR',
    'UPDATE_ORGAN_DONATION_PREFERENCES',
    'REVOKE_ORGAN_DONATION_CONSENT',
    'REACTIVATE_ORGAN_DONOR',
    'VIEW_ORGAN_DONATION_CONSENT',
    'ACCESS_REQUEST_CREATED',
    'ACCESS_REQUEST_APPROVED',
    'ACCESS_REQUEST_DENIED',
    'CONSENT_REVOKED',
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
    'APPOINTMENT_COMPLETED',
    'APPOINTMENT_EXPIRED',
    'VIEW_WALLET_SUMMARY',
    -- Phase: Emergency Blood Network Actions
    'CREATE_EMERGENCY_BLOOD_REQUEST',
    'EMERGENCY_BLOOD_NOTIFICATION_SENT',
    'EMERGENCY_BLOOD_HELP_RESPONSE',
    'EMERGENCY_BLOOD_CALL_RESPONSE',
    'EMERGENCY_BLOOD_VERIFICATION_STARTED',
    'EMERGENCY_BLOOD_DONOR_VERIFIED',
    'EMERGENCY_BLOOD_DONOR_REJECTED',
    'EMERGENCY_BLOOD_REQUEST_PARTIALLY_FULFILLED',
    'EMERGENCY_BLOOD_REQUEST_FULFILLED',
    'EMERGENCY_BLOOD_REQUEST_CANCELLED',
    'EMERGENCY_BLOOD_REQUEST_EXPIRED'
  )
);

-- 2. EXTEND NOTIFICATIONS CHECK CONSTRAINT
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
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
    'BLOOD_DONATION_REQUEST',
    'BLOOD_DONATION_ACCEPTED',
    'BLOOD_DONATION_DECLINED',
    'BLOOD_DONATION_CANCELLED',
    'ORGAN_DONATION_REGISTERED',
    'ORGAN_DONATION_UPDATED',
    'ORGAN_DONATION_REVOKED',
    'ORGAN_DONATION_REACTIVATED',
    'APPOINTMENT_BOOKED',
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT_CANCELLED',
    'APPOINTMENT_RESCHEDULED',
    'APPOINTMENT_COMPLETED',
    -- Phase: Emergency Blood Network Types
    'EMERGENCY_BLOOD_REQUIREMENT',
    'EMERGENCY_BLOOD_HELP_RECEIVED',
    'EMERGENCY_BLOOD_VERIFICATION_PENDING',
    'EMERGENCY_BLOOD_VERIFIED',
    'EMERGENCY_BLOOD_REJECTED',
    'EMERGENCY_BLOOD_FULFILLED',
    'EMERGENCY_BLOOD_CANCELLED'
  )
);

-- --------------------------------------------------------------------
-- 3. TABLE: public.emergency_blood_requests
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code TEXT UNIQUE NOT NULL,
  hospital_name TEXT NOT NULL,
  hospital_location TEXT NOT NULL,
  authorized_department TEXT NOT NULL,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  units_required INTEGER NOT NULL CHECK (units_required > 0),
  priority TEXT NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'NORMAL')),
  required_within_minutes INTEGER NOT NULL CHECK (required_within_minutes > 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'EXPIRED')),
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_emr_blood_req_status_group ON public.emergency_blood_requests (status, blood_group);
CREATE INDEX IF NOT EXISTS idx_emr_blood_req_code ON public.emergency_blood_requests (request_code);
CREATE INDEX IF NOT EXISTS idx_emr_blood_req_creator ON public.emergency_blood_requests (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_emr_blood_req_expires ON public.emergency_blood_requests (expires_at);

-- --------------------------------------------------------------------
-- 4. TABLE: public.emergency_blood_responses
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_blood_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_request_id UUID NOT NULL REFERENCES public.emergency_blood_requests(id) ON DELETE CASCADE,
  donor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  donor_patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  response_status TEXT NOT NULL CHECK (
    response_status IN (
      'WILLING_TO_HELP',
      'AVAILABLE',
      'PARTIALLY_AVAILABLE',
      'UNAVAILABLE',
      'VERIFICATION_PENDING',
      'VERIFIED',
      'REJECTED',
      'CANCELLED'
    )
  ),
  units_offered INTEGER NULL CHECK (units_offered IS NULL OR units_offered >= 0),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ NULL,
  verified_by_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_emr_resp_donor_req UNIQUE (emergency_request_id, donor_patient_id)
);

CREATE INDEX IF NOT EXISTS idx_emr_resp_req_status ON public.emergency_blood_responses (emergency_request_id, response_status);
CREATE INDEX IF NOT EXISTS idx_emr_resp_donor_user ON public.emergency_blood_responses (donor_user_id);
CREATE INDEX IF NOT EXISTS idx_emr_resp_donor_patient ON public.emergency_blood_responses (donor_patient_id);

-- --------------------------------------------------------------------
-- 5. FUNCTION: Generate unique collision-safe emergency request code
-- Format: HW-EMR-YYYY-XXXX (e.g. HW-EMR-2026-1024)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_emergency_request_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_code TEXT;
  v_num INT;
  v_exists BOOLEAN;
BEGIN
  v_year := to_char(now(), 'YYYY');
  LOOP
    -- Generates a 4-digit number between 1000 and 9999
    v_num := floor(random() * (9999 - 1000 + 1) + 1000)::INT;
    v_code := 'HW-EMR-' || v_year || '-' || v_num::TEXT;

    SELECT EXISTS (
      SELECT 1 FROM public.emergency_blood_requests WHERE request_code = v_code
    ) INTO v_exists;

    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

-- --------------------------------------------------------------------
-- 6. FUNCTION: Check blood compatibility
-- Matches whether donor blood group is clinically compatible for recipient
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_blood_compatible(p_donor TEXT, p_recipient TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_recipient
    WHEN 'O-'  THEN p_donor IN ('O-')
    WHEN 'O+'  THEN p_donor IN ('O-', 'O+')
    WHEN 'A-'  THEN p_donor IN ('O-', 'A-')
    WHEN 'A+'  THEN p_donor IN ('O-', 'O+', 'A-', 'A+')
    WHEN 'B-'  THEN p_donor IN ('O-', 'B-')
    WHEN 'B+'  THEN p_donor IN ('O-', 'O+', 'B-', 'B+')
    WHEN 'AB-' THEN p_donor IN ('O-', 'A-', 'B-', 'AB-')
    WHEN 'AB+' THEN p_donor IN ('O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+')
    ELSE false
  END;
$$;

-- --------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------------------------
ALTER TABLE public.emergency_blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_blood_responses ENABLE ROW LEVEL SECURITY;

-- Emergency Blood Requests Policies
DROP POLICY IF EXISTS "Authorized providers can manage emergency requests" ON public.emergency_blood_requests;
CREATE POLICY "Authorized providers can manage emergency requests"
ON public.emergency_blood_requests FOR ALL TO authenticated
USING (created_by_user_id = auth.uid())
WITH CHECK (created_by_user_id = auth.uid());

DROP POLICY IF EXISTS "Compatible donors can view active emergency requests" ON public.emergency_blood_requests;
CREATE POLICY "Compatible donors can view active emergency requests"
ON public.emergency_blood_requests FOR SELECT TO authenticated
USING (
  status IN ('ACTIVE', 'PARTIALLY_FULFILLED') 
  OR created_by_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.emergency_blood_responses resp
    WHERE resp.emergency_request_id = emergency_blood_requests.id
      AND resp.donor_user_id = auth.uid()
  )
);

-- Emergency Blood Responses Policies
DROP POLICY IF EXISTS "Donors can view own responses" ON public.emergency_blood_responses;
CREATE POLICY "Donors can view own responses"
ON public.emergency_blood_responses FOR SELECT TO authenticated
USING (donor_user_id = auth.uid());

DROP POLICY IF EXISTS "Donors can insert own responses" ON public.emergency_blood_responses;
CREATE POLICY "Donors can insert own responses"
ON public.emergency_blood_responses FOR INSERT TO authenticated
WITH CHECK (donor_user_id = auth.uid());

DROP POLICY IF EXISTS "Donors can update own unverified responses" ON public.emergency_blood_responses;
CREATE POLICY "Donors can update own unverified responses"
ON public.emergency_blood_responses FOR UPDATE TO authenticated
USING (donor_user_id = auth.uid())
WITH CHECK (donor_user_id = auth.uid());

DROP POLICY IF EXISTS "Request creators can view and verify responses" ON public.emergency_blood_responses;
CREATE POLICY "Request creators can view and verify responses"
ON public.emergency_blood_responses FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.emergency_blood_requests req
    WHERE req.id = emergency_blood_responses.emergency_request_id
      AND req.created_by_user_id = auth.uid()
  )
);

-- --------------------------------------------------------------------
-- 8. SECURE RPC: create_emergency_blood_request
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_emergency_blood_request(
  p_hospital_name TEXT,
  p_hospital_location TEXT,
  p_authorized_department TEXT,
  p_blood_group TEXT,
  p_units_required INTEGER,
  p_priority TEXT,
  p_required_within_minutes INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_req_code TEXT;
  v_request_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_notification_count INT := 0;
  v_donor RECORD;
  v_msg TEXT;
  v_hours_text TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: caller identity could not be verified.';
  END IF;

  -- Validate inputs
  IF p_units_required IS NULL OR p_units_required <= 0 THEN
    RAISE EXCEPTION 'Units required must be greater than zero.';
  END IF;

  IF p_priority NOT IN ('CRITICAL', 'HIGH', 'NORMAL') THEN
    RAISE EXCEPTION 'Priority must be CRITICAL, HIGH, or NORMAL.';
  END IF;

  IF p_blood_group NOT IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') THEN
    RAISE EXCEPTION 'Invalid blood group specified.';
  END IF;

  IF p_required_within_minutes IS NULL OR p_required_within_minutes <= 0 THEN
    RAISE EXCEPTION 'Required within minutes must be greater than zero.';
  END IF;

  -- Generate collision-safe request code
  v_req_code := public.generate_emergency_request_code();
  v_expires_at := now() + (p_required_within_minutes || ' minutes')::interval;

  -- Insert emergency request
  INSERT INTO public.emergency_blood_requests (
    request_code,
    hospital_name,
    hospital_location,
    authorized_department,
    blood_group,
    units_required,
    priority,
    required_within_minutes,
    status,
    created_by_user_id,
    expires_at
  ) VALUES (
    v_req_code,
    trim(p_hospital_name),
    trim(p_hospital_location),
    trim(p_authorized_department),
    p_blood_group,
    p_units_required,
    p_priority,
    p_required_within_minutes,
    'ACTIVE',
    v_user_id,
    v_expires_at
  ) RETURNING id INTO v_request_id;

  -- Record audit log
  INSERT INTO public.audit_logs (
    user_id,
    role,
    action,
    record_type,
    record_id,
    status,
    metadata
  ) VALUES (
    v_user_id,
    'DOCTOR',
    'CREATE_EMERGENCY_BLOOD_REQUEST',
    'EMERGENCY_BLOOD_REQUEST',
    v_request_id,
    'ACTIVE',
    jsonb_build_object(
      'request_code', v_req_code,
      'blood_group', p_blood_group,
      'units_required', p_units_required,
      'priority', p_priority,
      'hospital_name', p_hospital_name,
      'location', p_hospital_location
    )
  );

  -- Determine hours text for message
  IF p_required_within_minutes >= 60 THEN
    v_hours_text := (round(p_required_within_minutes / 60.0, 1))::TEXT || ' Hours';
  ELSE
    v_hours_text := p_required_within_minutes::TEXT || ' Minutes';
  END IF;

  -- Format standard notification text
  v_msg := '🚨 EMERGENCY BLOOD REQUIREMENT' || E'\n\n' ||
           '🏥 ' || p_hospital_name || ', ' || p_hospital_location || E'\n\n' ||
           '🩸 Blood Group: ' || p_blood_group || E'\n' ||
           'Units Required: ' || p_units_required::TEXT || E'\n' ||
           '🔴 Priority: ' || p_priority || E'\n' ||
           '⏱️ Required Within: ' || v_hours_text || E'\n\n' ||
           'Request ID: ' || v_req_code || E'\n\n' ||
           'Authorized by: ' || p_authorized_department || E'\n\n' ||
           'Blood availability is urgently required.' || E'\n\n' ||
           '[ I CAN HELP ]' || E'\n\n' ||
           'Your response will be securely shared with the authorized hospital/blood bank for verification.';

  -- Notify all compatible active donors
  FOR v_donor IN
    SELECT bdp.user_id, bdp.patient_id, bdp.blood_group
    FROM public.blood_donor_profiles bdp
    WHERE bdp.is_available = true
      AND public.is_blood_compatible(bdp.blood_group, p_blood_group)
  LOOP
    INSERT INTO public.notifications (
      user_id,
      patient_id,
      type,
      title,
      message,
      related_record_id
    ) VALUES (
      v_donor.user_id,
      v_donor.patient_id,
      'EMERGENCY_BLOOD_REQUIREMENT',
      '🚨 EMERGENCY BLOOD REQUIREMENT: ' || p_blood_group || ' (' || p_units_required::TEXT || ' Units)',
      v_msg,
      v_request_id
    );
    v_notification_count := v_notification_count + 1;
  END LOOP;

  -- Audit notification broadcast
  INSERT INTO public.audit_logs (
    user_id,
    role,
    action,
    record_type,
    record_id,
    status,
    metadata
  ) VALUES (
    v_user_id,
    'SYSTEM',
    'EMERGENCY_BLOOD_NOTIFICATION_SENT',
    'EMERGENCY_BLOOD_REQUEST',
    v_request_id,
    'SENT',
    jsonb_build_object(
      'notification_count', v_notification_count,
      'request_code', v_req_code
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'request_code', v_req_code,
    'notifications_dispatched', v_notification_count,
    'expires_at', v_expires_at
  );
END;
$$;

-- --------------------------------------------------------------------
-- 9. SECURE RPC: respond_emergency_blood_request ("I CAN HELP")
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_emergency_blood_request(
  p_request_id UUID,
  p_units_offered INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_patient public.patient_profiles%ROWTYPE;
  v_donor public.blood_donor_profiles%ROWTYPE;
  v_request public.emergency_blood_requests%ROWTYPE;
  v_response_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: caller identity could not be verified.';
  END IF;

  SELECT * INTO v_patient
  FROM public.patient_profiles
  WHERE user_id = v_user_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Access denied: caller does not have an associated patient profile.';
  END IF;

  -- Check donor registration
  SELECT * INTO v_donor
  FROM public.blood_donor_profiles
  WHERE patient_id = v_patient.id;

  IF v_donor.id IS NULL THEN
    RAISE EXCEPTION 'Registration required: caller is not registered as a voluntary blood donor.';
  END IF;

  -- Verify request existence and active status
  SELECT * INTO v_request
  FROM public.emergency_blood_requests
  WHERE id = p_request_id;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Emergency blood request not found.';
  END IF;

  IF v_request.status NOT IN ('ACTIVE', 'PARTIALLY_FULFILLED') THEN
    RAISE EXCEPTION 'Emergency request is no longer active (status: %)', v_request.status;
  END IF;

  IF v_request.expires_at < now() THEN
    RAISE EXCEPTION 'Emergency request has expired.';
  END IF;

  -- Verify clinical compatibility
  IF NOT public.is_blood_compatible(v_donor.blood_group, v_request.blood_group) THEN
    RAISE EXCEPTION 'Donor blood group (%) is not clinically compatible with required blood group (%).',
      v_donor.blood_group, v_request.blood_group;
  END IF;

  -- Upsert response with status WILLING_TO_HELP
  INSERT INTO public.emergency_blood_responses (
    emergency_request_id,
    donor_user_id,
    donor_patient_id,
    response_status,
    units_offered,
    responded_at
  ) VALUES (
    v_request.id,
    v_user_id,
    v_patient.id,
    'WILLING_TO_HELP',
    COALESCE(p_units_offered, 1),
    now()
  )
  ON CONFLICT (emergency_request_id, donor_patient_id)
  DO UPDATE SET
    response_status = 'WILLING_TO_HELP',
    units_offered = COALESCE(p_units_offered, public.emergency_blood_responses.units_offered),
    updated_at = now()
  RETURNING id INTO v_response_id;

  -- Audit response
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
    v_user_id,
    'PATIENT',
    v_patient.id,
    'EMERGENCY_BLOOD_HELP_RESPONSE',
    'EMERGENCY_BLOOD_RESPONSE',
    v_response_id,
    'WILLING_TO_HELP',
    jsonb_build_object(
      'request_code', v_request.request_code,
      'blood_group', v_donor.blood_group,
      'units_offered', COALESCE(p_units_offered, 1)
    )
  );

  -- Notify hospital creator
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_record_id
  ) VALUES (
    v_request.created_by_user_id,
    'EMERGENCY_BLOOD_HELP_RECEIVED',
    'Donor Response: ' || v_request.request_code,
    'A donor with blood group ' || v_donor.blood_group || ' has responded with willingness to help for request ' || v_request.request_code || '.',
    v_request.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'response_id', v_response_id,
    'response_status', 'WILLING_TO_HELP',
    'request_code', v_request.request_code,
    'hospital_name', v_request.hospital_name,
    'location', v_request.hospital_location,
    'blood_group', v_request.blood_group,
    'units_required', v_request.units_required
  );
END;
$$;

-- --------------------------------------------------------------------
-- 10. SECURE RPC: submit_donor_emergency_verification
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_donor_emergency_verification(
  p_request_id UUID,
  p_units_offered INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_patient public.patient_profiles%ROWTYPE;
  v_response public.emergency_blood_responses%ROWTYPE;
  v_request public.emergency_blood_requests%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: caller identity could not be verified.';
  END IF;

  SELECT * INTO v_patient
  FROM public.patient_profiles
  WHERE user_id = v_user_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Access denied: caller does not have an associated patient profile.';
  END IF;

  SELECT * INTO v_request
  FROM public.emergency_blood_requests
  WHERE id = p_request_id;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Emergency request not found.';
  END IF;

  SELECT * INTO v_response
  FROM public.emergency_blood_responses
  WHERE emergency_request_id = p_request_id
    AND donor_patient_id = v_patient.id;

  IF v_response.id IS NULL THEN
    RAISE EXCEPTION 'No response found. Please indicate willingness to help first.';
  END IF;

  -- Transition status to VERIFICATION_PENDING
  UPDATE public.emergency_blood_responses
  SET
    response_status = 'VERIFICATION_PENDING',
    units_offered = COALESCE(p_units_offered, v_response.units_offered, 1),
    updated_at = now()
  WHERE id = v_response.id;

  -- Audit log
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
    v_user_id,
    'PATIENT',
    v_patient.id,
    'EMERGENCY_BLOOD_VERIFICATION_STARTED',
    'EMERGENCY_BLOOD_RESPONSE',
    v_response.id,
    'VERIFICATION_PENDING',
    jsonb_build_object(
      'request_code', v_request.request_code,
      'units_offered', COALESCE(p_units_offered, v_response.units_offered, 1)
    )
  );

  -- Notify hospital
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_record_id
  ) VALUES (
    v_request.created_by_user_id,
    'EMERGENCY_BLOOD_VERIFICATION_PENDING',
    'Verification Pending: ' || v_request.request_code,
    'A willing donor has confirmed availability and submitted details for verification on request ' || v_request.request_code || '.',
    v_request.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'response_id', v_response.id,
    'response_status', 'VERIFICATION_PENDING',
    'message', 'Your response has been submitted for verification.'
  );
END;
$$;

-- --------------------------------------------------------------------
-- 11. SECURE RPC: handle_emergency_call_response (DTMF)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_emergency_call_response(
  p_request_id UUID,
  p_digit INTEGER,
  p_units_offered INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_patient public.patient_profiles%ROWTYPE;
  v_donor public.blood_donor_profiles%ROWTYPE;
  v_request public.emergency_blood_requests%ROWTYPE;
  v_status TEXT;
  v_effective_units INTEGER;
  v_response_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: caller identity could not be verified.';
  END IF;

  SELECT * INTO v_patient
  FROM public.patient_profiles
  WHERE user_id = v_user_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Access denied: caller does not have an associated patient profile.';
  END IF;

  SELECT * INTO v_donor
  FROM public.blood_donor_profiles
  WHERE patient_id = v_patient.id;

  IF v_donor.id IS NULL THEN
    RAISE EXCEPTION 'Registration required: caller is not registered as a voluntary blood donor.';
  END IF;

  SELECT * INTO v_request
  FROM public.emergency_blood_requests
  WHERE id = p_request_id;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Emergency request not found.';
  END IF;

  -- Validate DTMF digit mapping
  IF p_digit = 1 THEN
    v_status := 'AVAILABLE';
    v_effective_units := COALESCE(p_units_offered, v_request.units_required, 1);
  ELSIF p_digit = 2 THEN
    v_status := 'PARTIALLY_AVAILABLE';
    v_effective_units := COALESCE(p_units_offered, 1);
    IF v_effective_units <= 0 THEN
      RAISE EXCEPTION 'Partially available response requires positive units offered.';
    END IF;
  ELSIF p_digit = 3 THEN
    v_status := 'UNAVAILABLE';
    v_effective_units := 0;
  ELSE
    RAISE EXCEPTION 'Invalid DTMF digit: %. Valid options are 1 (AVAILABLE), 2 (PARTIALLY_AVAILABLE), or 3 (UNAVAILABLE).', p_digit;
  END IF;

  -- Upsert call response
  INSERT INTO public.emergency_blood_responses (
    emergency_request_id,
    donor_user_id,
    donor_patient_id,
    response_status,
    units_offered,
    responded_at
  ) VALUES (
    v_request.id,
    v_user_id,
    v_patient.id,
    v_status,
    v_effective_units,
    now()
  )
  ON CONFLICT (emergency_request_id, donor_patient_id)
  DO UPDATE SET
    response_status = v_status,
    units_offered = v_effective_units,
    updated_at = now()
  RETURNING id INTO v_response_id;

  -- Record audit log
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
    v_user_id,
    'PATIENT',
    v_patient.id,
    'EMERGENCY_BLOOD_CALL_RESPONSE',
    'EMERGENCY_BLOOD_RESPONSE',
    v_response_id,
    v_status,
    jsonb_build_object(
      'digit', p_digit,
      'response_status', v_status,
      'units_offered', v_effective_units,
      'request_code', v_request.request_code
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'response_id', v_response_id,
    'digit', p_digit,
    'response_status', v_status,
    'units_offered', v_effective_units,
    'request_code', v_request.request_code
  );
END;
$$;

-- --------------------------------------------------------------------
-- 12. SECURE RPC: verify_emergency_donor (Hospital Verification)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_emergency_donor(
  p_response_id UUID,
  p_verification_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_response public.emergency_blood_responses%ROWTYPE;
  v_request public.emergency_blood_requests%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: caller identity could not be verified.';
  END IF;

  SELECT * INTO v_response
  FROM public.emergency_blood_responses
  WHERE id = p_response_id;

  IF v_response.id IS NULL THEN
    RAISE EXCEPTION 'Emergency response record not found.';
  END IF;

  SELECT * INTO v_request
  FROM public.emergency_blood_requests
  WHERE id = v_response.emergency_request_id;

  -- Authorization check: caller must be request creator / hospital authorized user
  IF v_request.created_by_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: only the authorized emergency request creator can verify donors.';
  END IF;

  -- Update response status to VERIFIED
  UPDATE public.emergency_blood_responses
  SET
    response_status = 'VERIFIED',
    verified_at = now(),
    verified_by_user_id = v_user_id,
    verification_notes = p_verification_notes,
    updated_at = now()
  WHERE id = p_response_id;

  -- Audit log
  INSERT INTO public.audit_logs (
    user_id,
    role,
    action,
    record_type,
    record_id,
    status,
    metadata
  ) VALUES (
    v_user_id,
    'DOCTOR',
    'EMERGENCY_BLOOD_DONOR_VERIFIED',
    'EMERGENCY_BLOOD_RESPONSE',
    p_response_id,
    'VERIFIED',
    jsonb_build_object(
      'request_code', v_request.request_code,
      'donor_patient_id', v_response.donor_patient_id,
      'notes', p_verification_notes
    )
  );

  -- Send notification to donor
  INSERT INTO public.notifications (
    user_id,
    patient_id,
    type,
    title,
    message,
    related_record_id
  ) VALUES (
    v_response.donor_user_id,
    v_response.donor_patient_id,
    'EMERGENCY_BLOOD_VERIFIED',
    'Blood Donation Verified: ' || v_request.hospital_name,
    'Your eligibility for emergency request ' || v_request.request_code || ' at ' || v_request.hospital_name || ' has been verified by the medical team.',
    v_request.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'response_id', p_response_id,
    'response_status', 'VERIFIED',
    'verified_at', now()
  );
END;
$$;

-- --------------------------------------------------------------------
-- 13. SECURE RPC: reject_emergency_donor (Hospital Rejection)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_emergency_donor(
  p_response_id UUID,
  p_rejection_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_response public.emergency_blood_responses%ROWTYPE;
  v_request public.emergency_blood_requests%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: caller identity could not be verified.';
  END IF;

  SELECT * INTO v_response
  FROM public.emergency_blood_responses
  WHERE id = p_response_id;

  IF v_response.id IS NULL THEN
    RAISE EXCEPTION 'Emergency response record not found.';
  END IF;

  SELECT * INTO v_request
  FROM public.emergency_blood_requests
  WHERE id = v_response.emergency_request_id;

  IF v_request.created_by_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: only the authorized emergency request creator can reject donors.';
  END IF;

  UPDATE public.emergency_blood_responses
  SET
    response_status = 'REJECTED',
    verification_notes = p_rejection_notes,
    updated_at = now()
  WHERE id = p_response_id;

  INSERT INTO public.audit_logs (
    user_id,
    role,
    action,
    record_type,
    record_id,
    status,
    metadata
  ) VALUES (
    v_user_id,
    'DOCTOR',
    'EMERGENCY_BLOOD_DONOR_REJECTED',
    'EMERGENCY_BLOOD_RESPONSE',
    p_response_id,
    'REJECTED',
    jsonb_build_object(
      'request_code', v_request.request_code,
      'donor_patient_id', v_response.donor_patient_id,
      'notes', p_rejection_notes
    )
  );

  INSERT INTO public.notifications (
    user_id,
    patient_id,
    type,
    title,
    message,
    related_record_id
  ) VALUES (
    v_response.donor_user_id,
    v_response.donor_patient_id,
    'EMERGENCY_BLOOD_REJECTED',
    'Emergency Request Update: ' || v_request.hospital_name,
    'Thank you for your willingness to assist with emergency request ' || v_request.request_code || '. The hospital has updated the verification status.',
    v_request.id
  );

  RETURN jsonb_build_object(
    'success', true,
    'response_id', p_response_id,
    'response_status', 'REJECTED'
  );
END;
$$;

-- --------------------------------------------------------------------
-- 14. SECURE RPC: update_emergency_request_status
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_emergency_request_status(
  p_request_id UUID,
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_request public.emergency_blood_requests%ROWTYPE;
  v_audit_action TEXT;
  v_notif_type TEXT;
  v_resp RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: caller identity could not be verified.';
  END IF;

  SELECT * INTO v_request
  FROM public.emergency_blood_requests
  WHERE id = p_request_id;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Emergency request not found.';
  END IF;

  IF v_request.created_by_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Unauthorized: only the request creator can update emergency request status.';
  END IF;

  IF p_new_status NOT IN ('PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid target status: %', p_new_status;
  END IF;

  UPDATE public.emergency_blood_requests
  SET
    status = p_new_status,
    updated_at = now()
  WHERE id = p_request_id;

  IF p_new_status = 'FULFILLED' THEN
    v_audit_action := 'EMERGENCY_BLOOD_REQUEST_FULFILLED';
    v_notif_type := 'EMERGENCY_BLOOD_FULFILLED';
  ELSIF p_new_status = 'PARTIALLY_FULFILLED' THEN
    v_audit_action := 'EMERGENCY_BLOOD_REQUEST_PARTIALLY_FULFILLED';
    v_notif_type := NULL;
  ELSIF p_new_status = 'CANCELLED' THEN
    v_audit_action := 'EMERGENCY_BLOOD_REQUEST_CANCELLED';
    v_notif_type := 'EMERGENCY_BLOOD_CANCELLED';
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    role,
    action,
    record_type,
    record_id,
    status,
    reason,
    metadata
  ) VALUES (
    v_user_id,
    'DOCTOR',
    v_audit_action,
    'EMERGENCY_BLOOD_REQUEST',
    p_request_id,
    p_new_status,
    p_reason,
    jsonb_build_object('request_code', v_request.request_code)
  );

  -- If terminal fulfilled/cancelled, notify responding donors
  IF v_notif_type IS NOT NULL THEN
    FOR v_resp IN
      SELECT donor_user_id, donor_patient_id
      FROM public.emergency_blood_responses
      WHERE emergency_request_id = p_request_id
        AND response_status IN ('WILLING_TO_HELP', 'AVAILABLE', 'PARTIALLY_AVAILABLE', 'VERIFICATION_PENDING', 'VERIFIED')
    LOOP
      INSERT INTO public.notifications (
        user_id,
        patient_id,
        type,
        title,
        message,
        related_record_id
      ) VALUES (
        v_resp.donor_user_id,
        v_resp.donor_patient_id,
        v_notif_type,
        'Emergency Blood Request ' || v_request.request_code || ' ' || p_new_status,
        'The emergency blood requirement at ' || v_request.hospital_name || ' has been marked as ' || p_new_status || '.',
        p_request_id
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'status', p_new_status
  );
END;
$$;

-- --------------------------------------------------------------------
-- 15. SECURE RPC: list_active_emergency_requests_for_donor
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_active_emergency_requests_for_donor()
RETURNS TABLE (
  id UUID,
  request_code TEXT,
  hospital_name TEXT,
  hospital_location TEXT,
  authorized_department TEXT,
  blood_group TEXT,
  units_required INTEGER,
  priority TEXT,
  required_within_minutes INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  my_response_status TEXT,
  my_units_offered INTEGER,
  my_response_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_patient public.patient_profiles%ROWTYPE;
  v_donor public.blood_donor_profiles%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_patient
  FROM public.patient_profiles
  WHERE user_id = v_user_id;

  IF v_patient.id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_donor
  FROM public.blood_donor_profiles
  WHERE patient_id = v_patient.id;

  IF v_donor.id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    req.id,
    req.request_code,
    req.hospital_name,
    req.hospital_location,
    req.authorized_department,
    req.blood_group,
    req.units_required,
    req.priority,
    req.required_within_minutes,
    req.status,
    req.created_at,
    req.expires_at,
    resp.response_status AS my_response_status,
    resp.units_offered AS my_units_offered,
    resp.id AS my_response_id
  FROM public.emergency_blood_requests req
  LEFT JOIN public.emergency_blood_responses resp
    ON resp.emergency_request_id = req.id
   AND resp.donor_patient_id = v_patient.id
  WHERE req.status IN ('ACTIVE', 'PARTIALLY_FULFILLED')
    AND req.expires_at > now()
    AND public.is_blood_compatible(v_donor.blood_group, req.blood_group)
  ORDER BY
    CASE req.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END,
    req.created_at DESC;
END;
$$;

-- --------------------------------------------------------------------
-- 16. SECURE RPC: list_hospital_emergency_requests
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_hospital_emergency_requests()
RETURNS TABLE (
  id UUID,
  request_code TEXT,
  hospital_name TEXT,
  hospital_location TEXT,
  authorized_department TEXT,
  blood_group TEXT,
  units_required INTEGER,
  priority TEXT,
  required_within_minutes INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  total_responses BIGINT,
  willing_count BIGINT,
  pending_verification_count BIGINT,
  verified_count BIGINT,
  rejected_count BIGINT,
  unavailable_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    req.id,
    req.request_code,
    req.hospital_name,
    req.hospital_location,
    req.authorized_department,
    req.blood_group,
    req.units_required,
    req.priority,
    req.required_within_minutes,
    req.status,
    req.created_at,
    req.expires_at,
    COUNT(resp.id)::BIGINT AS total_responses,
    COUNT(CASE WHEN resp.response_status IN ('WILLING_TO_HELP', 'AVAILABLE') THEN 1 END)::BIGINT AS willing_count,
    COUNT(CASE WHEN resp.response_status = 'VERIFICATION_PENDING' THEN 1 END)::BIGINT AS pending_verification_count,
    COUNT(CASE WHEN resp.response_status = 'VERIFIED' THEN 1 END)::BIGINT AS verified_count,
    COUNT(CASE WHEN resp.response_status = 'REJECTED' THEN 1 END)::BIGINT AS rejected_count,
    COUNT(CASE WHEN resp.response_status = 'UNAVAILABLE' THEN 1 END)::BIGINT AS unavailable_count
  FROM public.emergency_blood_requests req
  LEFT JOIN public.emergency_blood_responses resp ON resp.emergency_request_id = req.id
  WHERE req.created_by_user_id = v_user_id
  GROUP BY req.id
  ORDER BY req.created_at DESC;
END;
$$;

-- --------------------------------------------------------------------
-- 17. SECURE RPC: get_emergency_request_responses
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_emergency_request_responses(
  p_request_id UUID
)
RETURNS TABLE (
  response_id UUID,
  emergency_request_id UUID,
  donor_patient_id UUID,
  donor_blood_group TEXT,
  donor_city TEXT,
  donor_state_code TEXT,
  response_status TEXT,
  units_offered INTEGER,
  responded_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verification_notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_request public.emergency_blood_requests%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_request
  FROM public.emergency_blood_requests
  WHERE id = p_request_id;

  IF v_request.id IS NULL OR v_request.created_by_user_id <> v_user_id THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    resp.id AS response_id,
    resp.emergency_request_id,
    resp.donor_patient_id,
    bdp.blood_group AS donor_blood_group,
    bdp.city AS donor_city,
    bdp.state_code AS donor_state_code,
    resp.response_status,
    resp.units_offered,
    resp.responded_at,
    resp.verified_at,
    resp.verification_notes
  FROM public.emergency_blood_responses resp
  JOIN public.blood_donor_profiles bdp ON bdp.patient_id = resp.donor_patient_id
  WHERE resp.emergency_request_id = p_request_id
  ORDER BY
    CASE resp.response_status
      WHEN 'VERIFICATION_PENDING' THEN 1
      WHEN 'WILLING_TO_HELP' THEN 2
      WHEN 'AVAILABLE' THEN 3
      WHEN 'PARTIALLY_AVAILABLE' THEN 4
      WHEN 'VERIFIED' THEN 5
      ELSE 6
    END,
    resp.responded_at ASC;
END;
$$;

-- 18. GRANT EXECUTE ON ALL RPCS TO AUTHENTICATED USERS
REVOKE ALL ON FUNCTION public.create_emergency_blood_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_emergency_blood_request TO authenticated;

REVOKE ALL ON FUNCTION public.respond_emergency_blood_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_emergency_blood_request TO authenticated;

REVOKE ALL ON FUNCTION public.submit_donor_emergency_verification FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_donor_emergency_verification TO authenticated;

REVOKE ALL ON FUNCTION public.handle_emergency_call_response FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_emergency_call_response TO authenticated;

REVOKE ALL ON FUNCTION public.verify_emergency_donor FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_emergency_donor TO authenticated;

REVOKE ALL ON FUNCTION public.reject_emergency_donor FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_emergency_donor TO authenticated;

REVOKE ALL ON FUNCTION public.update_emergency_request_status FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_emergency_request_status TO authenticated;

REVOKE ALL ON FUNCTION public.list_active_emergency_requests_for_donor FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_emergency_requests_for_donor TO authenticated;

REVOKE ALL ON FUNCTION public.list_hospital_emergency_requests FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_hospital_emergency_requests TO authenticated;

REVOKE ALL ON FUNCTION public.get_emergency_request_responses FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_emergency_request_responses TO authenticated;
