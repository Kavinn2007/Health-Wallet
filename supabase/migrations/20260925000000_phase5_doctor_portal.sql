-- ====================================================================
-- HEALTH WALLET V2 — PHASE 5: DOCTOR PORTAL + PATIENT SEARCH + ACCESS REQUESTS
-- ====================================================================
-- Migration: 20260925000000_phase5_doctor_portal.sql
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 2. TABLE: public.doctor_profiles
-- Associated 1:1 with authenticated doctor users in auth.users
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  doctor_name TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  specialization TEXT NOT NULL,
  hospital_name TEXT NOT NULL,
  mobile_number VARCHAR(10) NOT NULL UNIQUE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_user_id ON public.doctor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_reg_no ON public.doctor_profiles(registration_number);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_username ON public.doctor_profiles(lower(username));
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_mobile ON public.doctor_profiles(mobile_number);

-- Trigger for doctor_profiles updated_at
CREATE OR REPLACE FUNCTION public.trg_doctor_profiles_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doctor_profiles_updated_at ON public.doctor_profiles;
CREATE TRIGGER trg_doctor_profiles_updated_at
BEFORE UPDATE ON public.doctor_profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_doctor_profiles_set_updated_at();

-- --------------------------------------------------------------------
-- 3. TABLE: public.access_requests
-- Doctor-initiated access requests to patient health records
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_profile_id UUID REFERENCES public.doctor_profiles(id) ON DELETE SET NULL,
  requester_role VARCHAR(20) NOT NULL DEFAULT 'DOCTOR' CHECK (requester_role IN ('DOCTOR')),
  requested_record_types TEXT[] NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED', 'REVOKED', 'EXPIRED')),
  duration_hours INT NOT NULL DEFAULT 24 CHECK (duration_hours > 0),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_requests_patient ON public.access_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_requester ON public.access_requests(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_doctor ON public.access_requests(doctor_profile_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_expires ON public.access_requests(expires_at);

-- Prevent duplicate active PENDING requests from same doctor to same patient
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_doctor_request 
ON public.access_requests(patient_id, requester_user_id) 
WHERE status = 'PENDING';

-- Trigger for access_requests updated_at
CREATE OR REPLACE FUNCTION public.trg_access_requests_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_access_requests_updated_at ON public.access_requests;
CREATE TRIGGER trg_access_requests_updated_at
BEFORE UPDATE ON public.access_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_access_requests_set_updated_at();

-- --------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict doctor-patient boundaries. No USING (true).
-- --------------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Helper to retrieve authenticated doctor's profile ID
CREATE OR REPLACE FUNCTION public.get_authenticated_doctor_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.doctor_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_authenticated_doctor_profile_id() TO authenticated;

-- Policies for doctor_profiles
DROP POLICY IF EXISTS "Doctors can view own profile" ON public.doctor_profiles;
CREATE POLICY "Doctors can view own profile"
ON public.doctor_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Doctors can insert own profile" ON public.doctor_profiles;
CREATE POLICY "Doctors can insert own profile"
ON public.doctor_profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Doctors can update own profile" ON public.doctor_profiles;
CREATE POLICY "Doctors can update own profile"
ON public.doctor_profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Patients can view doctor profiles for requests" ON public.doctor_profiles;
CREATE POLICY "Patients can view doctor profiles for requests"
ON public.doctor_profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.access_requests ar
    WHERE ar.doctor_profile_id = public.doctor_profiles.id
      AND ar.patient_id = public.get_authenticated_patient_profile_id()
  )
);

-- Policies for access_requests
DROP POLICY IF EXISTS "Doctors can view own created access requests" ON public.access_requests;
CREATE POLICY "Doctors can view own created access requests"
ON public.access_requests FOR SELECT TO authenticated
USING (requester_user_id = auth.uid());

DROP POLICY IF EXISTS "Doctors can insert own access requests" ON public.access_requests;
CREATE POLICY "Doctors can insert own access requests"
ON public.access_requests FOR INSERT TO authenticated
WITH CHECK (
  requester_user_id = auth.uid()
  AND requester_role = 'DOCTOR'
  AND status = 'PENDING'
);

DROP POLICY IF EXISTS "Patients can view access requests directed to them" ON public.access_requests;
CREATE POLICY "Patients can view access requests directed to them"
ON public.access_requests FOR SELECT TO authenticated
USING (patient_id = public.get_authenticated_patient_profile_id());

-- --------------------------------------------------------------------
-- 5. SECURE FUNCTION: Doctor Patient Search by Health Wallet ID
-- Returns MINIMAL identity only: id, patient_name, health_wallet_id, blood_group, state.
-- NEVER exposes Aadhaar, phone number, medical records, or prescriptions.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_patient_by_health_wallet_id(p_health_wallet_id TEXT)
RETURNS TABLE (
  id UUID,
  patient_name TEXT,
  health_wallet_id TEXT,
  blood_group VARCHAR(5),
  state TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_hw_id TEXT;
  v_is_doctor BOOLEAN;
BEGIN
  -- Authenticated user must have a registered doctor profile
  SELECT EXISTS(
    SELECT 1 FROM public.doctor_profiles WHERE user_id = auth.uid()
  ) INTO v_is_doctor;

  IF NOT v_is_doctor THEN
    RAISE EXCEPTION 'Access Denied: Only verified medical doctors are authorized to search Health Wallet IDs.';
  END IF;

  clean_hw_id := upper(trim(p_health_wallet_id));
  IF clean_hw_id IS NULL OR clean_hw_id = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.patient_name,
    p.health_wallet_id,
    p.blood_group,
    p.state
  FROM public.patient_profiles p
  WHERE upper(p.health_wallet_id) = clean_hw_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_patient_by_health_wallet_id(TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- 6. SECURE FUNCTION: Check Approved Access Consent
-- Returns TRUE only if an APPROVED, unexpired consent exists for doctor and patient.
-- In Phase 5, all requests are PENDING, so this strictly returns FALSE.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_doctor_has_approved_access(p_patient_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.access_requests
    WHERE patient_id = p_patient_id
      AND requester_user_id = auth.uid()
      AND status = 'APPROVED'
      AND expires_at > NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_doctor_has_approved_access(UUID) TO authenticated;
