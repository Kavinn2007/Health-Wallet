-- ====================================================================
-- HEALTH WALLET V2 — PHASE 6: PATIENT CONSENT ENGINE & GATED ACCESS
-- ====================================================================
-- Instructions:
-- Execute this migration script in your Supabase Project SQL Editor:
-- Supabase Dashboard > SQL Editor > New Query > Paste & Run
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 2. TABLE: public.consents
-- Authoritative patient consent records granting time-bound category access
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_request_id UUID NOT NULL REFERENCES public.access_requests(id) ON DELETE CASCADE UNIQUE,
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  doctor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_profile_id UUID REFERENCES public.doctor_profiles(id) ON DELETE SET NULL,
  approved_record_types TEXT[] NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('APPROVED', 'DENIED', 'REVOKED', 'EXPIRED')),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_consents_request_id ON public.consents(access_request_id);
CREATE INDEX IF NOT EXISTS idx_consents_patient_id ON public.consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_consents_doctor_user_id ON public.consents(doctor_user_id);
CREATE INDEX IF NOT EXISTS idx_consents_status ON public.consents(status);
CREATE INDEX IF NOT EXISTS idx_consents_expires_at ON public.consents(expires_at);

-- Partial index for active approved consents
CREATE INDEX IF NOT EXISTS idx_active_approved_consents 
ON public.consents(patient_id, doctor_user_id) 
WHERE status = 'APPROVED';

-- Trigger for consents updated_at
CREATE OR REPLACE FUNCTION public.trg_consents_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consents_updated_at ON public.consents;
CREATE TRIGGER trg_consents_updated_at
BEFORE UPDATE ON public.consents
FOR EACH ROW EXECUTE FUNCTION public.trg_consents_set_updated_at();

-- --------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) ON CONSENTS
-- --------------------------------------------------------------------
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

-- Patients can view their own consents
DROP POLICY IF EXISTS "Patients can view own consents" ON public.consents;
CREATE POLICY "Patients can view own consents"
ON public.consents FOR SELECT TO authenticated
USING (patient_id = public.get_authenticated_patient_profile_id());

-- Doctors can view consents involving their requests
DROP POLICY IF EXISTS "Doctors can view their own consent decisions" ON public.consents;
CREATE POLICY "Doctors can view their own consent decisions"
ON public.consents FOR SELECT TO authenticated
USING (doctor_user_id = auth.uid());

-- Direct INSERT/UPDATE on consents by clients is prevented (must use RPC functions)
-- Doctors can NEVER directly insert or update consents

-- --------------------------------------------------------------------
-- 4. SECURITY DEFINER FUNCTIONS FOR PATIENT CONSENT STATE TRANSITIONS
-- Guarantees caller identity using auth.uid() — prevents client tampering
-- --------------------------------------------------------------------

-- Function: Patient Approves Access Request
CREATE OR REPLACE FUNCTION public.patient_approve_access_request(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_profile_id UUID;
  v_req RECORD;
  v_consent_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Identify caller's patient profile
  SELECT id INTO v_patient_profile_id
  FROM public.patient_profiles
  WHERE user_id = auth.uid();

  IF v_patient_profile_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not a registered patient.';
  END IF;

  -- 2. Verify request exists, belongs to this patient, and is PENDING
  SELECT * INTO v_req
  FROM public.access_requests
  WHERE id = p_request_id;

  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Access request not found.';
  END IF;

  IF v_req.patient_id <> v_patient_profile_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only approve access requests directed to your Health Wallet.';
  END IF;

  IF v_req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Invalid State: Access request is not PENDING (current status: %)', v_req.status;
  END IF;

  -- 3. Update access request status to APPROVED
  UPDATE public.access_requests
  SET status = 'APPROVED',
      updated_at = NOW()
  WHERE id = p_request_id;

  -- 4. Create or update consent record
  INSERT INTO public.consents (
    access_request_id,
    patient_id,
    doctor_user_id,
    doctor_profile_id,
    approved_record_types,
    status,
    approved_at,
    expires_at
  )
  VALUES (
    v_req.id,
    v_req.patient_id,
    v_req.requester_user_id,
    v_req.doctor_profile_id,
    v_req.requested_record_types, -- Approved categories = requested categories
    'APPROVED',
    NOW(),
    v_req.expires_at
  )
  ON CONFLICT (access_request_id) DO UPDATE SET
    status = 'APPROVED',
    approved_at = NOW(),
    expires_at = EXCLUDED.expires_at,
    approved_record_types = EXCLUDED.approved_record_types,
    revoked_at = NULL,
    denied_at = NULL,
    updated_at = NOW()
  RETURNING id INTO v_consent_id;

  SELECT json_build_object(
    'success', true,
    'consent_id', v_consent_id,
    'status', 'APPROVED',
    'approved_record_types', v_req.requested_record_types,
    'expires_at', v_req.expires_at
  )::jsonb INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.patient_approve_access_request(UUID) TO authenticated;

-- Function: Patient Denies Access Request
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
  v_req RECORD;
  v_consent_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Identify caller's patient profile
  SELECT id INTO v_patient_profile_id
  FROM public.patient_profiles
  WHERE user_id = auth.uid();

  IF v_patient_profile_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not a registered patient.';
  END IF;

  -- 2. Verify request exists and belongs to this patient
  SELECT * INTO v_req
  FROM public.access_requests
  WHERE id = p_request_id;

  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Access request not found.';
  END IF;

  IF v_req.patient_id <> v_patient_profile_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only deny access requests directed to your Health Wallet.';
  END IF;

  IF v_req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Invalid State: Access request is not PENDING (current status: %)', v_req.status;
  END IF;

  -- 3. Update access request status to DENIED
  UPDATE public.access_requests
  SET status = 'DENIED',
      updated_at = NOW()
  WHERE id = p_request_id;

  -- 4. Record denial in consents table
  INSERT INTO public.consents (
    access_request_id,
    patient_id,
    doctor_user_id,
    doctor_profile_id,
    approved_record_types,
    status,
    expires_at,
    denied_at,
    denial_reason
  )
  VALUES (
    v_req.id,
    v_req.patient_id,
    v_req.requester_user_id,
    v_req.doctor_profile_id,
    ARRAY[]::TEXT[],
    'DENIED',
    NOW(),
    NOW(),
    p_denial_reason
  )
  ON CONFLICT (access_request_id) DO UPDATE SET
    status = 'DENIED',
    denied_at = NOW(),
    denial_reason = p_denial_reason,
    updated_at = NOW()
  RETURNING id INTO v_consent_id;

  SELECT json_build_object(
    'success', true,
    'consent_id', v_consent_id,
    'status', 'DENIED'
  )::jsonb INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.patient_deny_access_request(UUID, TEXT) TO authenticated;

-- Function: Patient Revokes Approved Consent
CREATE OR REPLACE FUNCTION public.patient_revoke_consent(p_consent_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_profile_id UUID;
  v_consent RECORD;
  v_result JSONB;
BEGIN
  -- 1. Identify caller's patient profile
  SELECT id INTO v_patient_profile_id
  FROM public.patient_profiles
  WHERE user_id = auth.uid();

  IF v_patient_profile_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not a registered patient.';
  END IF;

  -- 2. Verify consent exists and belongs to this patient
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
    RAISE EXCEPTION 'Invalid State: Only APPROVED consents can be revoked (current status: %)', v_consent.status;
  END IF;

  -- 3. Update consent status to REVOKED
  UPDATE public.consents
  SET status = 'REVOKED',
      revoked_at = NOW(),
      updated_at = NOW()
  WHERE id = p_consent_id;

  -- 4. Update linked access request status to REVOKED
  UPDATE public.access_requests
  SET status = 'REVOKED',
      updated_at = NOW()
  WHERE id = v_consent.access_request_id;

  SELECT json_build_object(
    'success', true,
    'consent_id', p_consent_id,
    'status', 'REVOKED',
    'revoked_at', NOW()
  )::jsonb INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.patient_revoke_consent(UUID) TO authenticated;

-- --------------------------------------------------------------------
-- 5. FUNCTION: Doctor Checks Consent Status & Approved Categories
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_doctor_consent_status(p_patient_id UUID)
RETURNS TABLE (
  has_approved_consent BOOLEAN,
  consent_id UUID,
  access_request_id UUID,
  status VARCHAR(20),
  approved_record_types TEXT[],
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_doctor BOOLEAN;
BEGIN
  -- Verify caller is doctor
  SELECT EXISTS (
    SELECT 1 FROM public.doctor_profiles WHERE user_id = auth.uid()
  ) INTO v_is_doctor;

  IF NOT v_is_doctor THEN
    RAISE EXCEPTION 'Access Denied: Caller is not a verified medical doctor.';
  END IF;

  RETURN QUERY
  SELECT 
    (c.status = 'APPROVED' AND c.expires_at > NOW()) AS has_approved_consent,
    c.id AS consent_id,
    c.access_request_id,
    CASE 
      WHEN c.status = 'APPROVED' AND c.expires_at <= NOW() THEN 'EXPIRED'::VARCHAR(20)
      ELSE c.status
    END AS status,
    c.approved_record_types,
    c.expires_at,
    (c.expires_at <= NOW()) AS is_expired
  FROM public.consents c
  WHERE c.patient_id = p_patient_id
    AND c.doctor_user_id = auth.uid()
  ORDER BY c.created_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_doctor_consent_status(UUID) TO authenticated;

-- --------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY ON MEDICAL RECORDS FOR DOCTORS WITH CONSENT
-- Extends existing patient policies so doctors can read ONLY approved categories
-- --------------------------------------------------------------------

-- Helper: Check if caller is a doctor with an active approved consent for patient & category
CREATE OR REPLACE FUNCTION public.check_doctor_can_access_category(
  p_patient_id UUID,
  p_category TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consents c
    WHERE c.patient_id = p_patient_id
      AND c.doctor_user_id = auth.uid()
      AND c.status = 'APPROVED'
      AND c.expires_at > NOW()
      AND (
        p_category = ANY(c.approved_record_types)
        OR 'ALL_RECORDS' = ANY(c.approved_record_types)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_doctor_can_access_category(UUID, TEXT) TO authenticated;

-- Add Doctor SELECT Policy for medical_records
DROP POLICY IF EXISTS "Doctors can view patient records with approved consent" ON public.medical_records;
CREATE POLICY "Doctors can view patient records with approved consent"
ON public.medical_records FOR SELECT TO authenticated
USING (
  public.check_doctor_can_access_category(patient_id, record_type::text)
);

-- Add Doctor SELECT Policy for consultations
DROP POLICY IF EXISTS "Doctors can view consultations with approved consent" ON public.consultations;
CREATE POLICY "Doctors can view consultations with approved consent"
ON public.consultations FOR SELECT TO authenticated
USING (
  public.check_doctor_can_access_category(patient_id, 'CONSULTATIONS')
);

-- Add Doctor SELECT Policy for diagnoses
DROP POLICY IF EXISTS "Doctors can view diagnoses with approved consent" ON public.diagnoses;
CREATE POLICY "Doctors can view diagnoses with approved consent"
ON public.diagnoses FOR SELECT TO authenticated
USING (
  public.check_doctor_can_access_category(patient_id, 'DIAGNOSES')
);

-- Add Doctor SELECT Policy for treatments
DROP POLICY IF EXISTS "Doctors can view treatments with approved consent" ON public.treatments;
CREATE POLICY "Doctors can view treatments with approved consent"
ON public.treatments FOR SELECT TO authenticated
USING (
  public.check_doctor_can_access_category(patient_id, 'TREATMENTS')
);

-- Add Doctor SELECT Policy for prescriptions
DROP POLICY IF EXISTS "Doctors can view prescriptions with approved consent" ON public.prescriptions;
CREATE POLICY "Doctors can view prescriptions with approved consent"
ON public.prescriptions FOR SELECT TO authenticated
USING (
  public.check_doctor_can_access_category(patient_id, 'PRESCRIPTIONS')
);

-- Add Doctor SELECT Policy for lab_reports
DROP POLICY IF EXISTS "Doctors can view lab reports with approved consent" ON public.lab_reports;
CREATE POLICY "Doctors can view lab reports with approved consent"
ON public.lab_reports FOR SELECT TO authenticated
USING (
  public.check_doctor_can_access_category(patient_id, 'LAB_REPORTS')
);
