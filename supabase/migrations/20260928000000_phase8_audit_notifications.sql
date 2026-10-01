-- ====================================================================
-- HEALTH WALLET V2 — PHASE 8: AUDIT LOG + IN-APP NOTIFICATION SYSTEM
-- ====================================================================

-- 1. TABLE: public.audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  patient_id UUID NULL REFERENCES public.patient_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  record_type TEXT NULL,
  record_id UUID NULL,
  status TEXT NULL,
  reason TEXT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_audit_role CHECK (role IN ('PATIENT', 'DOCTOR', 'SYSTEM')),
  CONSTRAINT chk_audit_action CHECK (
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
      'EXPIRED_CONSENT'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_patient_id ON public.audit_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS: audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Patients can SELECT only their own audit history
DROP POLICY IF EXISTS "Patients can view own audit logs" ON public.audit_logs;
CREATE POLICY "Patients can view own audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  patient_id = public.get_authenticated_patient_profile_id()
  OR (user_id = auth.uid() AND role = 'PATIENT')
);

-- Doctors can SELECT only their own activity history
DROP POLICY IF EXISTS "Doctors can view own activity logs" ON public.audit_logs;
CREATE POLICY "Doctors can view own activity logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  user_id = auth.uid() AND role = 'DOCTOR'
);

-- Immutable: revoke client INSERT, UPDATE, DELETE
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;

-- --------------------------------------------------------------------
-- 2. TABLE: public.notifications
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  patient_id UUID NULL REFERENCES public.patient_profiles(id) ON DELETE SET NULL,
  related_record_id UUID NULL,
  related_request_id UUID NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_notification_type CHECK (
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
      'PRESCRIPTION_CREATED'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS: notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can SELECT only their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can UPDATE only is_read on their own notifications
DROP POLICY IF EXISTS "Users can update own notification read status" ON public.notifications;
CREATE POLICY "Users can update own notification read status"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Revoke direct INSERT and DELETE from client
REVOKE INSERT, DELETE ON public.notifications FROM anon, authenticated;

-- Prevent notification content tampering on UPDATE
CREATE OR REPLACE FUNCTION public.trg_notifications_prevent_tamper()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id
     OR NEW.type <> OLD.type
     OR NEW.title <> OLD.title
     OR NEW.message <> OLD.message
     OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
     OR NEW.related_record_id IS DISTINCT FROM OLD.related_record_id
     OR NEW.related_request_id IS DISTINCT FROM OLD.related_request_id
     OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Unauthorized: Only is_read status may be updated on notifications.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_notification_tamper ON public.notifications;
CREATE TRIGGER trg_prevent_notification_tamper
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trg_notifications_prevent_tamper();

-- --------------------------------------------------------------------
-- 3. NOTIFICATION MANAGEMENT RPCS
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE id = p_notification_id
    AND user_id = auth.uid();
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE user_id = auth.uid()
    AND is_read = FALSE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- --------------------------------------------------------------------
-- 4. SECURE RPC: Log Authorized Medical Record View
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_medical_record_view(p_record_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_rec RECORD;
  v_consent RECORD;
  v_patient_user_id UUID;
BEGIN
  SELECT id, doctor_name INTO v_doc
  FROM public.doctor_profiles
  WHERE user_id = auth.uid();

  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not a verified medical doctor.';
  END IF;

  SELECT id, patient_id, record_type, title INTO v_rec
  FROM public.medical_records
  WHERE id = p_record_id;

  IF v_rec.id IS NULL THEN
    RAISE EXCEPTION 'Record not found.';
  END IF;

  SELECT * INTO v_consent
  FROM public.consents
  WHERE patient_id = v_rec.patient_id
    AND doctor_user_id = auth.uid()
    AND status = 'APPROVED'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_consent.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: No approved consent.';
  END IF;

  IF v_consent.expires_at <= NOW() THEN
    UPDATE public.consents SET status = 'EXPIRED', updated_at = NOW() WHERE id = v_consent.id;
    RAISE EXCEPTION 'Access Denied: Consent has expired.';
  END IF;

  IF NOT (
    v_rec.record_type::text = ANY(v_consent.approved_record_types)
    OR (v_rec.record_type::text || 'S') = ANY(v_consent.approved_record_types)
    OR 'ALL_RECORDS' = ANY(v_consent.approved_record_types)
    OR (v_rec.record_type = 'CONSULTATION' AND 'CONSULTATIONS' = ANY(v_consent.approved_record_types))
    OR (v_rec.record_type = 'DIAGNOSIS' AND 'DIAGNOSES' = ANY(v_consent.approved_record_types))
    OR (v_rec.record_type = 'TREATMENT' AND 'TREATMENTS' = ANY(v_consent.approved_record_types))
    OR (v_rec.record_type = 'PRESCRIPTION' AND 'PRESCRIPTIONS' = ANY(v_consent.approved_record_types))
    OR (v_rec.record_type = 'LAB_REPORT' AND 'LAB_REPORTS' = ANY(v_consent.approved_record_types))
    OR (v_rec.record_type = 'IMAGING' AND 'IMAGING' = ANY(v_consent.approved_record_types))
  ) THEN
    RAISE EXCEPTION 'Access Denied: Record category not authorized.';
  END IF;

  -- 4. Insert audit log
  INSERT INTO public.audit_logs (
    user_id, role, patient_id, action, record_type, record_id, status, metadata
  ) VALUES (
    auth.uid(), 'DOCTOR', v_rec.patient_id, 'VIEW_MEDICAL_RECORD', v_rec.record_type, v_rec.id, 'SUCCESS',
    jsonb_build_object(
      'doctor_name', v_doc.doctor_name,
      'record_title', v_rec.title
    )
  );

  -- 5. Insert patient notification
  SELECT user_id INTO v_patient_user_id
  FROM public.patient_profiles
  WHERE id = v_rec.patient_id;

  IF v_patient_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, patient_id, related_record_id
    ) VALUES (
      v_patient_user_id, 'RECORD_VIEWED', 'Medical Record Accessed',
      v_doc.doctor_name || ' viewed your medical record: ' || v_rec.title,
      v_rec.patient_id, v_rec.id
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'action', 'VIEW_MEDICAL_RECORD');
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_medical_record_view(UUID) TO authenticated;

-- --------------------------------------------------------------------
-- 5. TRIGGER ON ACCESS REQUESTS: Audit & Patient Notification
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_on_access_request_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_user_id UUID;
  v_doc_name TEXT;
BEGIN
  IF NEW.status = 'PENDING' THEN
    SELECT user_id INTO v_patient_user_id
    FROM public.patient_profiles
    WHERE id = NEW.patient_id;

    SELECT doctor_name INTO v_doc_name
    FROM public.doctor_profiles
    WHERE user_id = NEW.requester_user_id;

    -- Audit log
    INSERT INTO public.audit_logs (
      user_id, role, patient_id, action, status, reason, metadata
    ) VALUES (
      NEW.requester_user_id, 'DOCTOR', NEW.patient_id, 'REQUEST_ACCESS', 'PENDING', NEW.reason,
      jsonb_build_object(
        'request_id', NEW.id,
        'doctor_name', COALESCE(v_doc_name, 'Doctor'),
        'requested_record_types', NEW.requested_record_types,
        'duration_hours', NEW.duration_hours
      )
    );

    -- Notification for patient
    IF v_patient_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id, type, title, message, patient_id, related_request_id
      ) VALUES (
        v_patient_user_id, 'ACCESS_REQUEST', 'New Access Request',
        COALESCE(v_doc_name, 'A doctor') || ' has requested access to your medical records.',
        NEW.patient_id, NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_access_request_audit ON public.access_requests;
CREATE TRIGGER trg_access_request_audit
AFTER INSERT ON public.access_requests
FOR EACH ROW
EXECUTE FUNCTION public.trg_on_access_request_created();

-- --------------------------------------------------------------------
-- 6. UPDATE PATIENT CONSENT RPCS TO EMIT AUDIT & NOTIFICATIONS
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.patient_approve_access_request(
  p_request_id UUID,
  p_approved_record_types TEXT[] DEFAULT NULL,
  p_duration_hours INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_profile_id UUID;
  v_patient_name TEXT;
  v_request RECORD;
  v_approved_record_types TEXT[];
  v_duration_hours INT;
  v_expires_at TIMESTAMPTZ;
  v_consent_id UUID;
BEGIN
  SELECT id, patient_name INTO v_patient_profile_id, v_patient_name
  FROM public.patient_profiles
  WHERE user_id = auth.uid();

  IF v_patient_profile_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not a registered patient.';
  END IF;

  SELECT * INTO v_request
  FROM public.access_requests
  WHERE id = p_request_id;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Access request not found.';
  END IF;

  IF v_request.patient_id <> v_patient_profile_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only approve access requests for your Health Wallet.';
  END IF;

  IF v_request.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Invalid State: Only PENDING requests can be approved (current status: %)', v_request.status;
  END IF;

  v_approved_record_types := COALESCE(p_approved_record_types, v_request.requested_record_types);
  v_duration_hours := COALESCE(p_duration_hours, v_request.duration_hours, 24);
  IF v_duration_hours <= 0 THEN
    v_duration_hours := 24;
  END IF;
  v_expires_at := NOW() + (v_duration_hours || ' hours')::INTERVAL;

  UPDATE public.access_requests
  SET status = 'APPROVED',
      updated_at = NOW()
  WHERE id = p_request_id;

  INSERT INTO public.consents (
    access_request_id,
    patient_id,
    doctor_user_id,
    doctor_profile_id,
    approved_record_types,
    status,
    expires_at
  ) VALUES (
    p_request_id,
    v_patient_profile_id,
    v_request.requester_user_id,
    v_request.doctor_profile_id,
    v_approved_record_types,
    'APPROVED',
    v_expires_at
  ) RETURNING id INTO v_consent_id;

  -- Audit Event: GRANT_CONSENT
  INSERT INTO public.audit_logs (
    user_id, role, patient_id, action, status, metadata
  ) VALUES (
    auth.uid(), 'PATIENT', v_patient_profile_id, 'GRANT_CONSENT', 'APPROVED',
    jsonb_build_object(
      'consent_id', v_consent_id,
      'access_request_id', p_request_id,
      'approved_record_types', v_approved_record_types,
      'duration_hours', v_duration_hours
    )
  );

  -- Doctor Notification: ACCESS_GRANTED
  INSERT INTO public.notifications (
    user_id, type, title, message, patient_id, related_request_id
  ) VALUES (
    v_request.requester_user_id, 'ACCESS_GRANTED', 'Access Granted',
    'Your request to access ' || COALESCE(v_patient_name, 'the patient') || '''s approved medical records has been granted.',
    v_patient_profile_id, p_request_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'consent_id', v_consent_id,
    'status', 'APPROVED',
    'expires_at', v_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.patient_deny_access_request(
  p_request_id UUID,
  p_denial_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_profile_id UUID;
  v_request RECORD;
BEGIN
  SELECT id INTO v_patient_profile_id
  FROM public.patient_profiles
  WHERE user_id = auth.uid();

  IF v_patient_profile_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not a registered patient.';
  END IF;

  SELECT * INTO v_request
  FROM public.access_requests
  WHERE id = p_request_id;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Access request not found.';
  END IF;

  IF v_request.patient_id <> v_patient_profile_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only deny access requests for your Health Wallet.';
  END IF;

  IF v_request.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Invalid State: Only PENDING requests can be denied.';
  END IF;

  UPDATE public.access_requests
  SET status = 'DENIED',
      updated_at = NOW()
  WHERE id = p_request_id;

  -- Audit Event: DENY_CONSENT
  INSERT INTO public.audit_logs (
    user_id, role, patient_id, action, status, metadata
  ) VALUES (
    auth.uid(), 'PATIENT', v_patient_profile_id, 'DENY_CONSENT', 'DENIED',
    jsonb_build_object('access_request_id', p_request_id)
  );

  -- Doctor Notification: ACCESS_DENIED
  INSERT INTO public.notifications (
    user_id, type, title, message, patient_id, related_request_id
  ) VALUES (
    v_request.requester_user_id, 'ACCESS_DENIED', 'Access Request Denied',
    'Your request for access was denied by the patient.',
    v_patient_profile_id, p_request_id
  );

  RETURN jsonb_build_object('success', true, 'status', 'DENIED');
END;
$$;

CREATE OR REPLACE FUNCTION public.patient_revoke_consent(
  p_consent_id UUID,
  p_revocation_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_profile_id UUID;
  v_consent RECORD;
BEGIN
  SELECT id INTO v_patient_profile_id
  FROM public.patient_profiles
  WHERE user_id = auth.uid();

  IF v_patient_profile_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not a registered patient.';
  END IF;

  SELECT * INTO v_consent
  FROM public.consents
  WHERE id = p_consent_id;

  IF v_consent.id IS NULL THEN
    RAISE EXCEPTION 'Consent record not found.';
  END IF;

  IF v_consent.patient_id <> v_patient_profile_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only revoke consents issued by your Health Wallet.';
  END IF;

  IF v_consent.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Invalid State: Only APPROVED consents can be revoked.';
  END IF;

  UPDATE public.consents
  SET status = 'REVOKED',
      revoked_at = NOW(),
      updated_at = NOW()
  WHERE id = p_consent_id;

  UPDATE public.access_requests
  SET status = 'REVOKED',
      updated_at = NOW()
  WHERE id = v_consent.access_request_id;

  -- Audit Event: REVOKE_CONSENT
  INSERT INTO public.audit_logs (
    user_id, role, patient_id, action, status, metadata
  ) VALUES (
    auth.uid(), 'PATIENT', v_patient_profile_id, 'REVOKE_CONSENT', 'REVOKED',
    jsonb_build_object('consent_id', p_consent_id)
  );

  -- Doctor Notification: ACCESS_REVOKED
  INSERT INTO public.notifications (
    user_id, type, title, message, patient_id, related_request_id
  ) VALUES (
    v_consent.doctor_user_id, 'ACCESS_REVOKED', 'Access Revoked',
    'Your previously granted access has been revoked.',
    v_patient_profile_id, v_consent.access_request_id
  );

  RETURN jsonb_build_object('success', true, 'consent_id', p_consent_id, 'status', 'REVOKED');
END;
$$;

-- --------------------------------------------------------------------
-- 7. UPDATE CLINICAL WORKFLOW RPCS TO EMIT AUDIT & NOTIFICATIONS
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.doctor_create_consultation(
  p_patient_id UUID,
  p_consultation_date DATE,
  p_chief_complaint TEXT,
  p_symptoms TEXT DEFAULT NULL,
  p_diagnosis TEXT DEFAULT NULL,
  p_treatment TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_follow_up_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_patient RECORD;
  v_consent RECORD;
  v_record_id UUID;
  v_consultation_id UUID;
  v_clean_complaint TEXT;
BEGIN
  SELECT id, doctor_name, hospital_name INTO v_doc
  FROM public.doctor_profiles
  WHERE user_id = auth.uid();

  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not a verified medical doctor.';
  END IF;

  SELECT id, user_id, patient_name, health_wallet_id INTO v_patient
  FROM public.patient_profiles
  WHERE id = p_patient_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Patient not found.';
  END IF;

  SELECT * INTO v_consent
  FROM public.consents
  WHERE patient_id = p_patient_id
    AND doctor_user_id = auth.uid()
    AND status = 'APPROVED'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_consent.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: No approved patient consent found for this patient.';
  END IF;

  IF v_consent.expires_at <= NOW() THEN
    UPDATE public.consents SET status = 'EXPIRED', updated_at = NOW() WHERE id = v_consent.id;
    INSERT INTO public.audit_logs (user_id, role, patient_id, action, status, metadata)
    VALUES (auth.uid(), 'SYSTEM', p_patient_id, 'EXPIRED_CONSENT', 'EXPIRED', jsonb_build_object('consent_id', v_consent.id));
    INSERT INTO public.notifications (user_id, type, title, message, patient_id)
    VALUES (auth.uid(), 'CONSENT_EXPIRED', 'Consent Expired', 'Your access to the patient''s approved records has expired.', p_patient_id);
    RAISE EXCEPTION 'Access Denied: Patient consent has expired.';
  END IF;

  IF NOT ('CONSULTATIONS' = ANY(v_consent.approved_record_types) OR 'ALL_RECORDS' = ANY(v_consent.approved_record_types)) THEN
    RAISE EXCEPTION 'Access Denied: Patient consent does not authorize creating consultations.';
  END IF;

  IF p_consultation_date IS NULL THEN
    RAISE EXCEPTION 'Consultation date is required.';
  END IF;

  v_clean_complaint := trim(p_chief_complaint);
  IF v_clean_complaint IS NULL OR v_clean_complaint = '' THEN
    RAISE EXCEPTION 'Chief complaint is required.';
  END IF;

  INSERT INTO public.medical_records (
    patient_id, record_type, title, description, record_date, provider_name, provider_type, hospital_name, creator_type
  ) VALUES (
    p_patient_id, 'CONSULTATION', v_clean_complaint,
    COALESCE(trim(p_notes), 'Clinical Consultation with ' || v_doc.doctor_name),
    p_consultation_date, v_doc.doctor_name, 'DOCTOR', v_doc.hospital_name, 'PROVIDER_CREATED'
  ) RETURNING id INTO v_record_id;

  INSERT INTO public.consultations (
    patient_id, medical_record_id, consultation_date, doctor_name, hospital_clinic,
    chief_complaint, symptoms, diagnosis, treatment, notes, follow_up_date, creator_type
  ) VALUES (
    p_patient_id, v_record_id, p_consultation_date, v_doc.doctor_name, v_doc.hospital_name,
    v_clean_complaint, trim(p_symptoms), trim(p_diagnosis), trim(p_treatment), trim(p_notes), p_follow_up_date, 'PROVIDER_CREATED'
  ) RETURNING id INTO v_consultation_id;

  -- Audit: CREATE_CONSULTATION
  INSERT INTO public.audit_logs (
    user_id, role, patient_id, action, record_type, record_id, status, metadata
  ) VALUES (
    auth.uid(), 'DOCTOR', p_patient_id, 'CREATE_CONSULTATION', 'CONSULTATION', v_record_id, 'SUCCESS',
    jsonb_build_object('doctor_name', v_doc.doctor_name, 'chief_complaint', v_clean_complaint)
  );

  -- Patient Notification: CONSULTATION_CREATED
  IF v_patient.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, patient_id, related_record_id
    ) VALUES (
      v_patient.user_id, 'CONSULTATION_CREATED', 'New Consultation Added',
      'A doctor added a consultation to your health record.',
      p_patient_id, v_record_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record_id,
    'consultation_id', v_consultation_id,
    'record_type', 'CONSULTATION',
    'creator_type', 'PROVIDER_CREATED'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.doctor_create_diagnosis(
  p_patient_id UUID,
  p_diagnosis_date DATE,
  p_condition TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_patient RECORD;
  v_consent RECORD;
  v_record_id UUID;
  v_diagnosis_id UUID;
  v_clean_condition TEXT;
BEGIN
  SELECT id, doctor_name, hospital_name INTO v_doc
  FROM public.doctor_profiles
  WHERE user_id = auth.uid();

  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not a verified medical doctor.';
  END IF;

  SELECT id, user_id, patient_name, health_wallet_id INTO v_patient
  FROM public.patient_profiles
  WHERE id = p_patient_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Patient not found.';
  END IF;

  SELECT * INTO v_consent
  FROM public.consents
  WHERE patient_id = p_patient_id
    AND doctor_user_id = auth.uid()
    AND status = 'APPROVED'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_consent.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: No approved patient consent found for this patient.';
  END IF;

  IF v_consent.expires_at <= NOW() THEN
    UPDATE public.consents SET status = 'EXPIRED', updated_at = NOW() WHERE id = v_consent.id;
    INSERT INTO public.audit_logs (user_id, role, patient_id, action, status, metadata)
    VALUES (auth.uid(), 'SYSTEM', p_patient_id, 'EXPIRED_CONSENT', 'EXPIRED', jsonb_build_object('consent_id', v_consent.id));
    INSERT INTO public.notifications (user_id, type, title, message, patient_id)
    VALUES (auth.uid(), 'CONSENT_EXPIRED', 'Consent Expired', 'Your access to the patient''s approved records has expired.', p_patient_id);
    RAISE EXCEPTION 'Access Denied: Patient consent has expired.';
  END IF;

  IF NOT ('DIAGNOSES' = ANY(v_consent.approved_record_types) OR 'ALL_RECORDS' = ANY(v_consent.approved_record_types)) THEN
    RAISE EXCEPTION 'Access Denied: Patient consent does not authorize creating diagnoses.';
  END IF;

  IF p_diagnosis_date IS NULL THEN
    RAISE EXCEPTION 'Diagnosis date is required.';
  END IF;

  v_clean_condition := trim(p_condition);
  IF v_clean_condition IS NULL OR v_clean_condition = '' THEN
    RAISE EXCEPTION 'Diagnosis condition is required.';
  END IF;

  INSERT INTO public.medical_records (
    patient_id, record_type, title, description, record_date, provider_name, provider_type, hospital_name, creator_type
  ) VALUES (
    p_patient_id, 'DIAGNOSIS', v_clean_condition,
    COALESCE(trim(p_notes), 'Formal Clinical Diagnosis: ' || v_clean_condition),
    p_diagnosis_date, v_doc.doctor_name, 'DOCTOR', v_doc.hospital_name, 'PROVIDER_CREATED'
  ) RETURNING id INTO v_record_id;

  INSERT INTO public.diagnoses (
    patient_id, medical_record_id, diagnosis_name, diagnosis_date, provider, notes
  ) VALUES (
    p_patient_id, v_record_id, v_clean_condition, p_diagnosis_date, v_doc.doctor_name, trim(p_notes)
  ) RETURNING id INTO v_diagnosis_id;

  -- Audit: CREATE_DIAGNOSIS
  INSERT INTO public.audit_logs (
    user_id, role, patient_id, action, record_type, record_id, status, metadata
  ) VALUES (
    auth.uid(), 'DOCTOR', p_patient_id, 'CREATE_DIAGNOSIS', 'DIAGNOSIS', v_record_id, 'SUCCESS',
    jsonb_build_object('doctor_name', v_doc.doctor_name, 'condition', v_clean_condition)
  );

  -- Patient Notification: DIAGNOSIS_CREATED
  IF v_patient.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, patient_id, related_record_id
    ) VALUES (
      v_patient.user_id, 'DIAGNOSIS_CREATED', 'New Diagnosis Added',
      'A doctor added a diagnosis to your health record.',
      p_patient_id, v_record_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record_id,
    'diagnosis_id', v_diagnosis_id,
    'record_type', 'DIAGNOSIS',
    'creator_type', 'PROVIDER_CREATED'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.doctor_create_treatment(
  p_patient_id UUID,
  p_treatment_date DATE,
  p_treatment TEXT,
  p_care_plan TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_patient RECORD;
  v_consent RECORD;
  v_record_id UUID;
  v_treatment_id UUID;
  v_clean_treatment TEXT;
BEGIN
  SELECT id, doctor_name, hospital_name INTO v_doc
  FROM public.doctor_profiles
  WHERE user_id = auth.uid();

  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not a verified medical doctor.';
  END IF;

  SELECT id, user_id, patient_name, health_wallet_id INTO v_patient
  FROM public.patient_profiles
  WHERE id = p_patient_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Patient not found.';
  END IF;

  SELECT * INTO v_consent
  FROM public.consents
  WHERE patient_id = p_patient_id
    AND doctor_user_id = auth.uid()
    AND status = 'APPROVED'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_consent.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: No approved patient consent found for this patient.';
  END IF;

  IF v_consent.expires_at <= NOW() THEN
    UPDATE public.consents SET status = 'EXPIRED', updated_at = NOW() WHERE id = v_consent.id;
    INSERT INTO public.audit_logs (user_id, role, patient_id, action, status, metadata)
    VALUES (auth.uid(), 'SYSTEM', p_patient_id, 'EXPIRED_CONSENT', 'EXPIRED', jsonb_build_object('consent_id', v_consent.id));
    INSERT INTO public.notifications (user_id, type, title, message, patient_id)
    VALUES (auth.uid(), 'CONSENT_EXPIRED', 'Consent Expired', 'Your access to the patient''s approved records has expired.', p_patient_id);
    RAISE EXCEPTION 'Access Denied: Patient consent has expired.';
  END IF;

  IF NOT ('TREATMENTS' = ANY(v_consent.approved_record_types) OR 'ALL_RECORDS' = ANY(v_consent.approved_record_types)) THEN
    RAISE EXCEPTION 'Access Denied: Patient consent does not authorize creating treatments.';
  END IF;

  IF p_treatment_date IS NULL THEN
    RAISE EXCEPTION 'Treatment date is required.';
  END IF;

  v_clean_treatment := trim(p_treatment);
  IF v_clean_treatment IS NULL OR v_clean_treatment = '' THEN
    RAISE EXCEPTION 'Treatment / intervention description is required.';
  END IF;

  INSERT INTO public.medical_records (
    patient_id, record_type, title, description, record_date, provider_name, provider_type, hospital_name, creator_type
  ) VALUES (
    p_patient_id, 'TREATMENT', v_clean_treatment,
    COALESCE(trim(p_care_plan), trim(p_notes), 'Treatment / Intervention: ' || v_clean_treatment),
    p_treatment_date, v_doc.doctor_name, 'DOCTOR', v_doc.hospital_name, 'PROVIDER_CREATED'
  ) RETURNING id INTO v_record_id;

  INSERT INTO public.treatments (
    patient_id, medical_record_id, treatment_name, treatment_date, provider, care_plan, notes
  ) VALUES (
    p_patient_id, v_record_id, v_clean_treatment, p_treatment_date, v_doc.doctor_name, trim(p_care_plan), trim(p_notes)
  ) RETURNING id INTO v_treatment_id;

  -- Audit: CREATE_TREATMENT
  INSERT INTO public.audit_logs (
    user_id, role, patient_id, action, record_type, record_id, status, metadata
  ) VALUES (
    auth.uid(), 'DOCTOR', p_patient_id, 'CREATE_TREATMENT', 'TREATMENT', v_record_id, 'SUCCESS',
    jsonb_build_object('doctor_name', v_doc.doctor_name, 'treatment', v_clean_treatment)
  );

  -- Patient Notification: TREATMENT_CREATED
  IF v_patient.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, patient_id, related_record_id
    ) VALUES (
      v_patient.user_id, 'TREATMENT_CREATED', 'New Treatment Added',
      'A doctor added a treatment plan to your health record.',
      p_patient_id, v_record_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record_id,
    'treatment_id', v_treatment_id,
    'record_type', 'TREATMENT',
    'creator_type', 'PROVIDER_CREATED'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.doctor_create_prescription(
  p_patient_id UUID,
  p_medicine_name TEXT,
  p_dosage TEXT,
  p_frequency TEXT,
  p_duration TEXT,
  p_instructions TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_patient RECORD;
  v_consent RECORD;
  v_record_id UUID;
  v_prescription_id UUID;
  v_clean_medicine TEXT;
  v_clean_dosage TEXT;
  v_clean_frequency TEXT;
  v_clean_duration TEXT;
  v_prescribed_date DATE;
BEGIN
  SELECT id, doctor_name, hospital_name INTO v_doc
  FROM public.doctor_profiles
  WHERE user_id = auth.uid();

  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not a verified medical doctor.';
  END IF;

  SELECT id, user_id, patient_name, health_wallet_id INTO v_patient
  FROM public.patient_profiles
  WHERE id = p_patient_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Patient not found.';
  END IF;

  SELECT * INTO v_consent
  FROM public.consents
  WHERE patient_id = p_patient_id
    AND doctor_user_id = auth.uid()
    AND status = 'APPROVED'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_consent.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: No approved patient consent found for this patient.';
  END IF;

  IF v_consent.expires_at <= NOW() THEN
    UPDATE public.consents SET status = 'EXPIRED', updated_at = NOW() WHERE id = v_consent.id;
    INSERT INTO public.audit_logs (user_id, role, patient_id, action, status, metadata)
    VALUES (auth.uid(), 'SYSTEM', p_patient_id, 'EXPIRED_CONSENT', 'EXPIRED', jsonb_build_object('consent_id', v_consent.id));
    INSERT INTO public.notifications (user_id, type, title, message, patient_id)
    VALUES (auth.uid(), 'CONSENT_EXPIRED', 'Consent Expired', 'Your access to the patient''s approved records has expired.', p_patient_id);
    RAISE EXCEPTION 'Access Denied: Patient consent has expired.';
  END IF;

  IF NOT ('PRESCRIPTIONS' = ANY(v_consent.approved_record_types) OR 'ALL_RECORDS' = ANY(v_consent.approved_record_types)) THEN
    RAISE EXCEPTION 'Access Denied: Patient consent does not authorize creating prescriptions.';
  END IF;

  v_clean_medicine := trim(p_medicine_name);
  v_clean_dosage := trim(p_dosage);
  v_clean_frequency := trim(p_frequency);
  v_clean_duration := trim(p_duration);

  IF v_clean_medicine IS NULL OR v_clean_medicine = '' THEN
    RAISE EXCEPTION 'Medicine name is required.';
  END IF;
  IF v_clean_dosage IS NULL OR v_clean_dosage = '' THEN
    RAISE EXCEPTION 'Dosage is required.';
  END IF;
  IF v_clean_frequency IS NULL OR v_clean_frequency = '' THEN
    RAISE EXCEPTION 'Frequency is required.';
  END IF;
  IF v_clean_duration IS NULL OR v_clean_duration = '' THEN
    RAISE EXCEPTION 'Duration is required.';
  END IF;

  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL AND p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Invalid date range: End date cannot be before start date.';
  END IF;

  v_prescribed_date := COALESCE(p_start_date, CURRENT_DATE);

  INSERT INTO public.medical_records (
    patient_id, record_type, title, description, record_date, provider_name, provider_type, hospital_name, creator_type
  ) VALUES (
    p_patient_id, 'PRESCRIPTION', v_clean_medicine || ' (' || v_clean_dosage || ')',
    'Rx: ' || v_clean_medicine || ' ' || v_clean_dosage || ', Frequency: ' || v_clean_frequency || ', Duration: ' || v_clean_duration || COALESCE(E'\nInstructions: ' || trim(p_instructions), ''),
    v_prescribed_date, v_doc.doctor_name, 'DOCTOR', v_doc.hospital_name, 'PROVIDER_CREATED'
  ) RETURNING id INTO v_record_id;

  INSERT INTO public.prescriptions (
    patient_id, medical_record_id, medicine_name, dosage, frequency, duration, instructions, prescribed_date, start_date, end_date, status
  ) VALUES (
    p_patient_id, v_record_id, v_clean_medicine, v_clean_dosage, v_clean_frequency, v_clean_duration,
    trim(p_instructions), v_prescribed_date, p_start_date, p_end_date, 'ACTIVE'
  ) RETURNING id INTO v_prescription_id;

  -- Audit: CREATE_PRESCRIPTION
  INSERT INTO public.audit_logs (
    user_id, role, patient_id, action, record_type, record_id, status, metadata
  ) VALUES (
    auth.uid(), 'DOCTOR', p_patient_id, 'CREATE_PRESCRIPTION', 'PRESCRIPTION', v_record_id, 'SUCCESS',
    jsonb_build_object('doctor_name', v_doc.doctor_name, 'medicine_name', v_clean_medicine, 'dosage', v_clean_dosage)
  );

  -- Patient Notification: PRESCRIPTION_CREATED
  IF v_patient.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, patient_id, related_record_id
    ) VALUES (
      v_patient.user_id, 'PRESCRIPTION_CREATED', 'New Prescription Added',
      'A doctor added a prescription to your health record.',
      p_patient_id, v_record_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record_id,
    'prescription_id', v_prescription_id,
    'record_type', 'PRESCRIPTION',
    'status', 'ACTIVE',
    'creator_type', 'PROVIDER_CREATED'
  );
END;
$$;
