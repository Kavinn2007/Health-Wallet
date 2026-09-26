-- ====================================================================
-- HEALTH WALLET V2 — PHASE 10: PHARMACY PORTAL + PRESCRIPTION FULFILLMENT
-- ====================================================================
-- Instructions:
-- Execute this migration script in your Supabase Project SQL Editor:
-- Supabase Dashboard > SQL Editor > New Query > Paste & Run
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 2. TABLE: public.pharmacy_profiles
-- Dedicated profile table for licensed pharmacies & pharmacists
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pharmacy_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  pharmacist_name TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  pharmacy_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_pharmacy_profiles_user_id ON public.pharmacy_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_profiles_reg_no ON public.pharmacy_profiles(registration_number);
CREATE INDEX IF NOT EXISTS idx_pharmacy_profiles_username ON public.pharmacy_profiles(username);

-- Trigger for pharmacy_profiles updated_at
CREATE OR REPLACE FUNCTION public.trg_pharmacy_profiles_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pharmacy_profiles_updated_at ON public.pharmacy_profiles;
CREATE TRIGGER trg_pharmacy_profiles_updated_at
BEFORE UPDATE ON public.pharmacy_profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_pharmacy_profiles_set_updated_at();

-- RLS: pharmacy_profiles
ALTER TABLE public.pharmacy_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pharmacy staff can view own profile" ON public.pharmacy_profiles;
CREATE POLICY "Pharmacy staff can view own profile"
ON public.pharmacy_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Pharmacy staff can update own profile" ON public.pharmacy_profiles;
CREATE POLICY "Pharmacy staff can update own profile"
ON public.pharmacy_profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Pharmacy staff can insert own profile" ON public.pharmacy_profiles;
CREATE POLICY "Pharmacy staff can insert own profile"
ON public.pharmacy_profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow patients to search verified pharmacies for sharing
DROP POLICY IF EXISTS "Patients can search verified pharmacies for sharing" ON public.pharmacy_profiles;
CREATE POLICY "Patients can search verified pharmacies for sharing"
ON public.pharmacy_profiles FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.patient_profiles WHERE user_id = auth.uid())
);

-- Helper: Get authenticated pharmacy profile UUID
CREATE OR REPLACE FUNCTION public.get_authenticated_pharmacy_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.pharmacy_profiles WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_authenticated_pharmacy_profile_id() TO authenticated;

-- Helper: Check if caller is authenticated pharmacy staff
CREATE OR REPLACE FUNCTION public.is_authenticated_pharmacy()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_profiles WHERE user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_authenticated_pharmacy() TO authenticated;

-- --------------------------------------------------------------------
-- 3. AUDIT LOG & NOTIFICATION CONSTRAINTS EXPANSION FOR PHARMACY
-- --------------------------------------------------------------------

-- Expand role check on audit_logs to include 'PHARMACY'
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS chk_audit_role;
ALTER TABLE public.audit_logs ADD CONSTRAINT chk_audit_role CHECK (
  role IN ('PATIENT', 'DOCTOR', 'LAB', 'PHARMACY', 'SYSTEM')
);

-- Expand action check on audit_logs to include pharmacy actions
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
    'PHARMACY_DECLINE_PRESCRIPTION'
  )
);

-- RLS: Pharmacy staff can view their own activity logs
DROP POLICY IF EXISTS "Pharmacy staff can view own activity logs" ON public.audit_logs;
CREATE POLICY "Pharmacy staff can view own activity logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  user_id = auth.uid() AND role = 'PHARMACY'
);

-- Expand notification type check to include pharmacy notification types
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
    'PRESCRIPTION_NOT_DISPENSED'
  )
);

-- --------------------------------------------------------------------
-- 4. TABLE: public.pharmacy_prescription_shares
-- Controlled authorization table linking patient prescriptions to specific pharmacies
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pharmacy_prescription_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES public.pharmacy_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (
    status IN ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED', 'FULFILLED', 'CANCELLED')
  ),
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_prescription_shares_patient_id ON public.pharmacy_prescription_shares(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_shares_prescription_id ON public.pharmacy_prescription_shares(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_shares_pharmacy_id ON public.pharmacy_prescription_shares(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescription_shares_status ON public.pharmacy_prescription_shares(status);

-- Trigger for pharmacy_prescription_shares updated_at
CREATE OR REPLACE FUNCTION public.trg_prescription_shares_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prescription_shares_updated_at ON public.pharmacy_prescription_shares;
CREATE TRIGGER trg_prescription_shares_updated_at
BEFORE UPDATE ON public.pharmacy_prescription_shares
FOR EACH ROW EXECUTE FUNCTION public.trg_prescription_shares_set_updated_at();

-- RLS: pharmacy_prescription_shares
ALTER TABLE public.pharmacy_prescription_shares ENABLE ROW LEVEL SECURITY;

-- 1. Patients can view their own prescription shares
DROP POLICY IF EXISTS "Patients can view own prescription shares" ON public.pharmacy_prescription_shares;
CREATE POLICY "Patients can view own prescription shares"
ON public.pharmacy_prescription_shares FOR SELECT TO authenticated
USING (
  patient_id IN (SELECT id FROM public.patient_profiles WHERE user_id = auth.uid())
);

-- 2. Patients can insert shares for their own prescriptions
DROP POLICY IF EXISTS "Patients can insert own prescription shares" ON public.pharmacy_prescription_shares;
CREATE POLICY "Patients can insert own prescription shares"
ON public.pharmacy_prescription_shares FOR INSERT TO authenticated
WITH CHECK (
  patient_id IN (SELECT id FROM public.patient_profiles WHERE user_id = auth.uid())
  AND prescription_id IN (
    SELECT id FROM public.prescriptions
    WHERE patient_id IN (SELECT id FROM public.patient_profiles WHERE user_id = auth.uid())
  )
);

-- 3. Patients can update (revoke/cancel) their own shares
DROP POLICY IF EXISTS "Patients can update own prescription shares" ON public.pharmacy_prescription_shares;
CREATE POLICY "Patients can update own prescription shares"
ON public.pharmacy_prescription_shares FOR UPDATE TO authenticated
USING (
  patient_id IN (SELECT id FROM public.patient_profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  patient_id IN (SELECT id FROM public.patient_profiles WHERE user_id = auth.uid())
);

-- 4. Pharmacy can view shares assigned explicitly to it
DROP POLICY IF EXISTS "Pharmacy can view assigned prescription shares" ON public.pharmacy_prescription_shares;
CREATE POLICY "Pharmacy can view assigned prescription shares"
ON public.pharmacy_prescription_shares FOR SELECT TO authenticated
USING (
  pharmacy_id IN (SELECT id FROM public.pharmacy_profiles WHERE user_id = auth.uid())
);

-- --------------------------------------------------------------------
-- 5. TABLE: public.prescription_dispensing
-- Fulfillment and medication dispensing audit record
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prescription_dispensing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacy_profiles(id) ON DELETE CASCADE,
  dispensed_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  dispensed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (
    status IN ('DISPENSED', 'PARTIALLY_DISPENSED', 'NOT_DISPENSED', 'CANCELLED')
  ),
  quantity_dispensed TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for dispensing records
CREATE INDEX IF NOT EXISTS idx_dispensing_prescription_id ON public.prescription_dispensing(prescription_id);
CREATE INDEX IF NOT EXISTS idx_dispensing_patient_id ON public.prescription_dispensing(patient_id);
CREATE INDEX IF NOT EXISTS idx_dispensing_pharmacy_id ON public.prescription_dispensing(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_dispensing_status ON public.prescription_dispensing(status);

-- RLS: prescription_dispensing
ALTER TABLE public.prescription_dispensing ENABLE ROW LEVEL SECURITY;

-- 1. Patients can view dispensing records for their prescriptions
DROP POLICY IF EXISTS "Patients can view own dispensing records" ON public.prescription_dispensing;
CREATE POLICY "Patients can view own dispensing records"
ON public.prescription_dispensing FOR SELECT TO authenticated
USING (
  patient_id IN (SELECT id FROM public.patient_profiles WHERE user_id = auth.uid())
);

-- 2. Pharmacy staff can view dispensing records created by their pharmacy
DROP POLICY IF EXISTS "Pharmacy can view own dispensing records" ON public.prescription_dispensing;
CREATE POLICY "Pharmacy can view own dispensing records"
ON public.prescription_dispensing FOR SELECT TO authenticated
USING (
  pharmacy_id IN (SELECT id FROM public.pharmacy_profiles WHERE user_id = auth.uid())
);

-- --------------------------------------------------------------------
-- 6. RLS: prescriptions table access for Pharmacy
-- Pharmacy can read ONLY prescriptions explicitly shared with it
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Pharmacy can view shared active prescriptions" ON public.prescriptions;
CREATE POLICY "Pharmacy can view shared active prescriptions"
ON public.prescriptions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pharmacy_prescription_shares s
    JOIN public.pharmacy_profiles p ON p.id = s.pharmacy_id
    WHERE s.prescription_id = public.prescriptions.id
      AND p.user_id = auth.uid()
      AND s.status = 'ACTIVE'
      AND (s.expires_at IS NULL OR s.expires_at > NOW())
      AND s.revoked_at IS NULL
  )
);

-- CRITICAL: Pharmacy must NEVER insert, update, or delete prescriptions
-- (Prescriptions are strictly authored by doctors or patients via existing policies)

-- --------------------------------------------------------------------
-- 7. SECURE RPC: patient_share_prescription
-- Enables a patient to explicitly share a prescription with a pharmacy
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.patient_share_prescription(
  p_prescription_id UUID,
  p_pharmacy_id UUID,
  p_duration_hours INT DEFAULT 48
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid UUID;
  v_patient RECORD;
  v_prescription RECORD;
  v_pharmacy RECORD;
  v_share_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 1. Verify authenticated user
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 2. Verify caller is a valid patient
  SELECT * INTO v_patient
  FROM public.patient_profiles
  WHERE user_id = v_caller_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caller is not a registered patient.';
  END IF;

  -- 3. Verify target prescription exists and belongs to this patient
  SELECT * INTO v_prescription
  FROM public.prescriptions
  WHERE id = p_prescription_id AND patient_id = v_patient.id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription not found or does not belong to the authenticated patient.';
  END IF;

  -- 4. Verify target pharmacy exists
  SELECT * INTO v_pharmacy
  FROM public.pharmacy_profiles
  WHERE id = p_pharmacy_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target pharmacy not found or not active.';
  END IF;

  -- Compute expiration timestamp
  v_expires_at := NOW() + (COALESCE(p_duration_hours, 48) || ' hours')::interval;

  -- 5. Insert or update share record
  INSERT INTO public.pharmacy_prescription_shares (
    patient_id,
    prescription_id,
    pharmacy_id,
    status,
    shared_at,
    expires_at
  ) VALUES (
    v_patient.id,
    v_prescription.id,
    v_pharmacy.id,
    'ACTIVE',
    NOW(),
    v_expires_at
  )
  RETURNING id INTO v_share_id;

  -- 6. Audit event: SHARE_PRESCRIPTION
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
    v_caller_uid,
    'PATIENT',
    v_patient.id,
    'SHARE_PRESCRIPTION',
    'PRESCRIPTION',
    v_prescription.id,
    'SUCCESS',
    jsonb_build_object(
      'pharmacy_name', v_pharmacy.pharmacy_name,
      'pharmacy_id', v_pharmacy.id,
      'share_id', v_share_id,
      'duration_hours', p_duration_hours
    )
  );

  -- 7. Patient Notification: PRESCRIPTION_SHARED
  INSERT INTO public.notifications (
    user_id,
    patient_id,
    type,
    title,
    message,
    related_record_id,
    is_read
  ) VALUES (
    v_caller_uid,
    v_patient.id,
    'PRESCRIPTION_SHARED',
    'Prescription Shared',
    'Your prescription has been shared with the selected pharmacy.',
    v_prescription.id,
    false
  );

  RETURN v_share_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.patient_share_prescription(UUID, UUID, INT) TO authenticated;

-- --------------------------------------------------------------------
-- 8. SECURE RPC: patient_revoke_prescription_share
-- Enables a patient to revoke an active pharmacy share
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.patient_revoke_prescription_share(
  p_share_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid UUID;
  v_patient RECORD;
  v_share RECORD;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_patient
  FROM public.patient_profiles
  WHERE user_id = v_caller_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caller is not a registered patient.';
  END IF;

  SELECT * INTO v_share
  FROM public.pharmacy_prescription_shares
  WHERE id = p_share_id AND patient_id = v_patient.id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription share not found or access denied.';
  END IF;

  UPDATE public.pharmacy_prescription_shares
  SET status = 'REVOKED', revoked_at = NOW()
  WHERE id = p_share_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.patient_revoke_prescription_share(UUID) TO authenticated;

-- --------------------------------------------------------------------
-- 9. SECURE RPC: pharmacy_view_prescription
-- Logs audit and patient notification when pharmacy views authorized prescription
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pharmacy_view_prescription(
  p_prescription_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid UUID;
  v_pharmacy RECORD;
  v_share RECORD;
  v_prescription RECORD;
  v_patient RECORD;
  v_med_record RECORD;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- 1. Verify caller has active pharmacy profile
  SELECT * INTO v_pharmacy
  FROM public.pharmacy_profiles
  WHERE user_id = v_caller_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access denied: Caller is not an accredited pharmacy.';
  END IF;

  -- 2. Verify active, unexpired, unrevoked share exists
  SELECT * INTO v_share
  FROM public.pharmacy_prescription_shares
  WHERE prescription_id = p_prescription_id
    AND pharmacy_id = v_pharmacy.id
    AND status = 'ACTIVE'
    AND (expires_at IS NULL OR expires_at > NOW())
    AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access denied: No active prescription share found for this pharmacy.';
  END IF;

  -- 3. Fetch prescription details
  SELECT * INTO v_prescription
  FROM public.prescriptions
  WHERE id = p_prescription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription not found.';
  END IF;

  -- 4. Fetch patient and parent medical record for doctor name & date
  SELECT * INTO v_patient
  FROM public.patient_profiles
  WHERE id = v_prescription.patient_id;

  SELECT * INTO v_med_record
  FROM public.medical_records
  WHERE id = v_prescription.medical_record_id;

  -- 5. Audit Log: PHARMACY_VIEW_PRESCRIPTION
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
    v_caller_uid,
    'PHARMACY',
    v_patient.id,
    'PHARMACY_VIEW_PRESCRIPTION',
    'PRESCRIPTION',
    v_prescription.id,
    'SUCCESS',
    jsonb_build_object(
      'pharmacy_name', v_pharmacy.pharmacy_name,
      'share_id', v_share.id
    )
  );

  -- 6. Patient Notification: PRESCRIPTION_VIEWED_BY_PHARMACY
  INSERT INTO public.notifications (
    user_id,
    patient_id,
    type,
    title,
    message,
    related_record_id,
    is_read
  ) VALUES (
    v_patient.user_id,
    v_patient.id,
    'PRESCRIPTION_VIEWED_BY_PHARMACY',
    'Prescription Viewed',
    'Your prescription was viewed by the pharmacy.',
    v_prescription.id,
    false
  );

  -- 7. Return safe prescription projection for dispensing
  RETURN jsonb_build_object(
    'prescription_id', v_prescription.id,
    'patient_id', v_patient.id,
    'patient_name', v_patient.patient_name,
    'health_wallet_id', v_patient.health_wallet_id,
    'medicine_name', v_prescription.medicine_name,
    'dosage', v_prescription.dosage,
    'frequency', v_prescription.frequency,
    'duration', v_prescription.duration,
    'instructions', v_prescription.instructions,
    'prescribed_date', v_prescription.prescribed_date,
    'doctor_name', COALESCE(v_med_record.doctor_name, v_med_record.provider_name, 'Prescribing Physician'),
    'hospital_name', v_med_record.hospital_name,
    'status', v_prescription.status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pharmacy_view_prescription(UUID) TO authenticated;

-- --------------------------------------------------------------------
-- 10. SECURE RPC: pharmacy_dispense_prescription
-- Atomic dispensing transaction with validation, audit, and notification
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pharmacy_dispense_prescription(
  p_prescription_id UUID,
  p_pharmacy_id UUID,
  p_status TEXT,
  p_quantity_dispensed TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid UUID;
  v_pharmacy RECORD;
  v_share RECORD;
  v_prescription RECORD;
  v_patient RECORD;
  v_dispensing_id UUID;
  v_audit_action TEXT;
  v_notif_type TEXT;
  v_notif_title TEXT;
  v_notif_message TEXT;
  v_already_dispensed BOOLEAN;
BEGIN
  -- 1. Verify auth.uid()
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Validate status argument
  IF p_status NOT IN ('DISPENSED', 'PARTIALLY_DISPENSED', 'NOT_DISPENSED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid dispensing status: %', p_status;
  END IF;

  -- 2. Verify caller has active pharmacy profile
  SELECT * INTO v_pharmacy
  FROM public.pharmacy_profiles
  WHERE id = p_pharmacy_id AND user_id = v_caller_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access denied: Caller is not authorized for this pharmacy profile.';
  END IF;

  -- 3. Verify prescription exists
  SELECT * INTO v_prescription
  FROM public.prescriptions
  WHERE id = p_prescription_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prescription not found.';
  END IF;

  -- 4. Verify patient exists
  SELECT * INTO v_patient
  FROM public.patient_profiles
  WHERE id = v_prescription.patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patient record not found.';
  END IF;

  -- 5, 6, 7, 8. Verify active, unexpired, unrevoked share
  SELECT * INTO v_share
  FROM public.pharmacy_prescription_shares
  WHERE prescription_id = p_prescription_id
    AND pharmacy_id = v_pharmacy.id
    AND status = 'ACTIVE';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access denied: No active prescription share found for this pharmacy.';
  END IF;

  IF v_share.expires_at IS NOT NULL AND v_share.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Access denied: Prescription share has expired.';
  END IF;

  IF v_share.revoked_at IS NOT NULL OR v_share.status = 'REVOKED' THEN
    RAISE EXCEPTION 'Access denied: Prescription share was revoked by the patient.';
  END IF;

  -- 9. Check duplicate dispensing
  SELECT EXISTS (
    SELECT 1 FROM public.prescription_dispensing
    WHERE prescription_id = p_prescription_id AND status = 'DISPENSED'
  ) INTO v_already_dispensed;

  IF v_already_dispensed AND p_status = 'DISPENSED' THEN
    RAISE EXCEPTION 'Prescription has already been fully dispensed.';
  END IF;

  -- 10. Insert dispensing record
  INSERT INTO public.prescription_dispensing (
    prescription_id,
    patient_id,
    pharmacy_id,
    dispensed_by_user_id,
    dispensed_at,
    status,
    quantity_dispensed,
    notes
  ) VALUES (
    v_prescription.id,
    v_patient.id,
    v_pharmacy.id,
    v_caller_uid,
    NOW(),
    p_status,
    p_quantity_dispensed,
    p_notes
  )
  RETURNING id INTO v_dispensing_id;

  -- 11. Update share status
  IF p_status = 'DISPENSED' THEN
    UPDATE public.pharmacy_prescription_shares
    SET status = 'FULFILLED'
    WHERE id = v_share.id;
  ELSIF p_status = 'NOT_DISPENSED' OR p_status = 'CANCELLED' THEN
    UPDATE public.pharmacy_prescription_shares
    SET status = 'CANCELLED'
    WHERE id = v_share.id;
  END IF;
  -- If PARTIALLY_DISPENSED, share status remains 'ACTIVE' for remaining fulfillment

  -- 12. Determine audit action and notification parameters
  IF p_status = 'DISPENSED' THEN
    v_audit_action := 'DISPENSE_PRESCRIPTION';
    v_notif_type := 'PRESCRIPTION_DISPENSED';
    v_notif_title := 'Prescription Dispensed';
    v_notif_message := 'Your prescription was marked as dispensed by the pharmacy.';
  ELSIF p_status = 'PARTIALLY_DISPENSED' THEN
    v_audit_action := 'PHARMACY_PARTIAL_DISPENSE';
    v_notif_type := 'PRESCRIPTION_PARTIALLY_DISPENSED';
    v_notif_title := 'Prescription Partially Dispensed';
    v_notif_message := 'Your prescription was partially dispensed by the pharmacy.';
  ELSE
    v_audit_action := 'PHARMACY_DECLINE_PRESCRIPTION';
    v_notif_type := 'PRESCRIPTION_NOT_DISPENSED';
    v_notif_title := 'Prescription Not Dispensed';
    v_notif_message := 'Your prescription could not be dispensed by the pharmacy.';
  END IF;

  -- Insert audit log (avoid sensitive medicine details in metadata)
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
    v_caller_uid,
    'PHARMACY',
    v_patient.id,
    v_audit_action,
    'PRESCRIPTION',
    v_prescription.id,
    'SUCCESS',
    jsonb_build_object(
      'pharmacy_name', v_pharmacy.pharmacy_name,
      'dispensing_id', v_dispensing_id,
      'dispensing_status', p_status
    )
  );

  -- 13. Deliver patient notification
  INSERT INTO public.notifications (
    user_id,
    patient_id,
    type,
    title,
    message,
    related_record_id,
    is_read
  ) VALUES (
    v_patient.user_id,
    v_patient.id,
    v_notif_type,
    v_notif_title,
    v_notif_message,
    v_prescription.id,
    false
  );

  -- 14. Return dispensing record ID
  RETURN v_dispensing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pharmacy_dispense_prescription(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
