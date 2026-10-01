-- ====================================================================
-- HEALTH WALLET V2 — PHASE 9: LAB PORTAL + LAB REPORT WORKFLOW
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 2. TABLE: public.lab_profiles
-- Dedicated profile table for accredited laboratories & staff
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_name TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  laboratory_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_lab_profiles_user_id ON public.lab_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_profiles_reg_no ON public.lab_profiles(registration_number);
CREATE INDEX IF NOT EXISTS idx_lab_profiles_username ON public.lab_profiles(username);

-- Trigger for lab_profiles updated_at
CREATE OR REPLACE FUNCTION public.trg_lab_profiles_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lab_profiles_updated_at ON public.lab_profiles;
CREATE TRIGGER trg_lab_profiles_updated_at
BEFORE UPDATE ON public.lab_profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_lab_profiles_set_updated_at();

-- RLS: lab_profiles
ALTER TABLE public.lab_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lab staff can view own profile" ON public.lab_profiles;
CREATE POLICY "Lab staff can view own profile"
ON public.lab_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Lab staff can update own profile" ON public.lab_profiles;
CREATE POLICY "Lab staff can update own profile"
ON public.lab_profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

GRANT SELECT, UPDATE ON public.lab_profiles TO authenticated;

-- Helper: Get authenticated lab profile ID
CREATE OR REPLACE FUNCTION public.get_authenticated_lab_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.lab_profiles WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_authenticated_lab_profile_id() TO authenticated;

-- Helper: Check if caller is authenticated lab staff
CREATE OR REPLACE FUNCTION public.is_authenticated_lab()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lab_profiles WHERE user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_authenticated_lab() TO authenticated;

-- --------------------------------------------------------------------
-- 3. AUDIT LOG & NOTIFICATION CONSTRAINTS EXPANSION FOR LAB
-- --------------------------------------------------------------------

-- Expand role check on audit_logs to include 'LAB'
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS chk_audit_role;
ALTER TABLE public.audit_logs ADD CONSTRAINT chk_audit_role CHECK (role IN ('PATIENT', 'DOCTOR', 'LAB', 'SYSTEM'));

-- Expand action check on audit_logs to include 'CREATE_LAB_REPORT'
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
    'EXPIRED_CONSENT'
  )
);

-- RLS: Lab staff can view their own activity logs
DROP POLICY IF EXISTS "Lab staff can view own activity logs" ON public.audit_logs;
CREATE POLICY "Lab staff can view own activity logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  user_id = auth.uid() AND role = 'LAB'
);

-- Expand notification type check to include 'LAB_REPORT_CREATED'
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
    'LAB_REPORT_CREATED'
  )
);

-- --------------------------------------------------------------------
-- 4. EXTEND TABLE: public.lab_reports
-- Add structured report metadata and staff ownership
-- --------------------------------------------------------------------
ALTER TABLE public.lab_reports 
  ADD COLUMN IF NOT EXISTS laboratory_name TEXT,
  ADD COLUMN IF NOT EXISTS report_type TEXT,
  ADD COLUMN IF NOT EXISTS report_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS original_file_path TEXT,
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id);

-- Drop NOT NULL on test_name to support multi-test panels
ALTER TABLE public.lab_reports ALTER COLUMN test_name DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lab_reports_creator ON public.lab_reports(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_rep_date ON public.lab_reports(report_date DESC);

-- Policy: Lab staff can view own created lab reports
DROP POLICY IF EXISTS "Lab staff can view own created lab reports" ON public.lab_reports;
CREATE POLICY "Lab staff can view own created lab reports"
ON public.lab_reports FOR SELECT TO authenticated
USING (created_by_user_id = auth.uid());

-- --------------------------------------------------------------------
-- 5. TABLE: public.lab_test_results
-- Child table storing individual test measurements and reference ranges
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_report_id UUID NOT NULL REFERENCES public.lab_reports(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  reference_range TEXT,
  status TEXT NOT NULL CHECK (status IN ('NORMAL', 'HIGH', 'LOW', 'CRITICAL', 'ABNORMAL', 'NOT_AVAILABLE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_test_results_report_id ON public.lab_test_results(lab_report_id);
CREATE INDEX IF NOT EXISTS idx_lab_test_results_status ON public.lab_test_results(status);

ALTER TABLE public.lab_test_results ENABLE ROW LEVEL SECURITY;

-- Patients can view test results of their own reports
DROP POLICY IF EXISTS "Patients can view own lab test results" ON public.lab_test_results;
CREATE POLICY "Patients can view own lab test results"
ON public.lab_test_results FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lab_reports lr
    WHERE lr.id = lab_report_id
      AND lr.patient_id = public.get_authenticated_patient_profile_id()
  )
);

-- Doctors can view test results if they have approved consent for LAB_REPORTS or ALL_RECORDS
DROP POLICY IF EXISTS "Doctors can view lab test results with consent" ON public.lab_test_results;
CREATE POLICY "Doctors can view lab test results with consent"
ON public.lab_test_results FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lab_reports lr
    WHERE lr.id = lab_report_id
      AND public.check_doctor_can_access_category(lr.patient_id, 'LAB_REPORTS')
  )
);

-- Lab staff can view test results of reports they created
DROP POLICY IF EXISTS "Lab staff can view created test results" ON public.lab_test_results;
CREATE POLICY "Lab staff can view created test results"
ON public.lab_test_results FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lab_reports lr
    WHERE lr.id = lab_report_id
      AND lr.created_by_user_id = auth.uid()
  )
);

-- Revoke direct mutation on lab_test_results from client roles (RPC only)
REVOKE INSERT, UPDATE, DELETE ON public.lab_test_results FROM anon, authenticated;
GRANT SELECT ON public.lab_test_results TO authenticated;

-- Policy on medical_records for Lab staff (strictly isolated to own created records)
DROP POLICY IF EXISTS "Lab staff can view own created medical records" ON public.medical_records;
CREATE POLICY "Lab staff can view own created medical records"
ON public.medical_records FOR SELECT TO authenticated
USING (
  creator_type = 'PROVIDER_CREATED'
  AND provider_type = 'LAB'
  AND id IN (
    SELECT medical_record_id FROM public.lab_reports WHERE created_by_user_id = auth.uid()
  )
);

-- --------------------------------------------------------------------
-- 6. SECURE RPC: lab_create_lab_report
-- Atomically creates: medical_records -> lab_reports -> lab_test_results
-- Emits: CREATE_LAB_REPORT audit log and LAB_REPORT_CREATED patient notification
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lab_create_lab_report(
  p_patient_id UUID,
  p_report_type TEXT,
  p_report_date DATE,
  p_laboratory_name TEXT,
  p_document_path TEXT DEFAULT NULL,
  p_document_name TEXT DEFAULT NULL,
  p_document_size INTEGER DEFAULT NULL,
  p_document_mime_type TEXT DEFAULT NULL,
  p_test_results JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID;
  v_lab_profile RECORD;
  v_patient RECORD;
  v_med_rec_id UUID;
  v_lab_report_id UUID;
  v_test JSONB;
  v_test_name TEXT;
  v_test_val TEXT;
  v_test_unit TEXT;
  v_test_ref TEXT;
  v_test_status TEXT;
  v_effective_lab_name TEXT;
BEGIN
  -- 1. Verify caller authentication
  v_caller_user_id := auth.uid();
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: User is not authenticated';
  END IF;

  -- 2. Verify caller has LAB role and lab profile exists
  SELECT * INTO v_lab_profile
  FROM public.lab_profiles
  WHERE user_id = v_caller_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access denied: Caller is not a registered laboratory staff member';
  END IF;

  -- 3. Verify requested patient exists
  SELECT * INTO v_patient
  FROM public.patient_profiles
  WHERE id = p_patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patient not found with id %', p_patient_id;
  END IF;

  -- 4. Verify input arguments
  IF p_report_type IS NULL OR trim(p_report_type) = '' THEN
    RAISE EXCEPTION 'Report type is required';
  END IF;

  IF p_report_date IS NULL THEN
    RAISE EXCEPTION 'Report date is required';
  END IF;

  IF p_report_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Report date cannot be in the future';
  END IF;

  v_effective_lab_name := COALESCE(NULLIF(trim(p_laboratory_name), ''), v_lab_profile.laboratory_name);

  -- 5. Create medical_records parent record
  INSERT INTO public.medical_records (
    patient_id,
    record_type,
    title,
    description,
    record_date,
    provider_name,
    provider_type,
    hospital_name,
    document_path,
    document_name,
    document_size,
    document_mime_type,
    creator_type
  ) VALUES (
    p_patient_id,
    'LAB_REPORT',
    trim(p_report_type),
    v_effective_lab_name || ' — ' || trim(p_report_type),
    p_report_date,
    v_lab_profile.lab_name,
    'LAB',
    v_effective_lab_name,
    p_document_path,
    p_document_name,
    p_document_size,
    p_document_mime_type,
    'PROVIDER_CREATED'
  ) RETURNING id INTO v_med_rec_id;

  -- 6. Create lab_reports child record
  INSERT INTO public.lab_reports (
    patient_id,
    medical_record_id,
    lab_name,
    laboratory_name,
    test_name,
    report_type,
    test_date,
    report_date,
    original_file_path,
    report_file_path,
    created_by_user_id
  ) VALUES (
    p_patient_id,
    v_med_rec_id,
    v_effective_lab_name,
    v_effective_lab_name,
    trim(p_report_type),
    trim(p_report_type),
    p_report_date,
    p_report_date,
    p_document_path,
    p_document_path,
    v_caller_user_id
  ) RETURNING id INTO v_lab_report_id;

  -- 7. Insert structured test results into lab_test_results
  IF p_test_results IS NOT NULL AND jsonb_typeof(p_test_results) = 'array' THEN
    FOR v_test IN SELECT * FROM jsonb_array_elements(p_test_results)
    LOOP
      v_test_name := trim(v_test->>'test_name');
      v_test_val := trim(v_test->>'value');
      v_test_unit := NULLIF(trim(v_test->>'unit'), '');
      v_test_ref := NULLIF(trim(v_test->>'reference_range'), '');
      v_test_status := COALESCE(NULLIF(trim(v_test->>'status'), ''), 'NORMAL');

      IF v_test_name IS NULL OR v_test_name = '' THEN
        RAISE EXCEPTION 'Test name cannot be empty in test results';
      END IF;

      IF v_test_val IS NULL OR v_test_val = '' THEN
        RAISE EXCEPTION 'Test value cannot be empty in test results';
      END IF;

      IF v_test_status NOT IN ('NORMAL', 'HIGH', 'LOW', 'CRITICAL', 'ABNORMAL', 'NOT_AVAILABLE') THEN
        RAISE EXCEPTION 'Invalid test status: %', v_test_status;
      END IF;

      INSERT INTO public.lab_test_results (
        lab_report_id,
        test_name,
        value,
        unit,
        reference_range,
        status
      ) VALUES (
        v_lab_report_id,
        v_test_name,
        v_test_val,
        v_test_unit,
        v_test_ref,
        v_test_status
      );
    END LOOP;
  END IF;

  -- 8. Audit Log: CREATE_LAB_REPORT
  -- Sensitive values are NEVER stored in metadata
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
    v_caller_user_id,
    'LAB',
    p_patient_id,
    'CREATE_LAB_REPORT',
    'LAB_REPORT',
    v_lab_report_id,
    'SUCCESS',
    jsonb_build_object(
      'laboratory_name', v_effective_lab_name,
      'report_type', trim(p_report_type),
      'report_date', p_report_date,
      'medical_record_id', v_med_rec_id
    )
  );

  -- 9. Patient Notification: LAB_REPORT_CREATED
  -- Sensitive values and diagnoses are strictly excluded
  IF v_patient.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      patient_id,
      related_record_id
    ) VALUES (
      v_patient.user_id,
      'LAB_REPORT_CREATED',
      'New Lab Report Added',
      'A laboratory has added a new report to your Health Wallet.',
      p_patient_id,
      v_lab_report_id
    );
  END IF;

  RETURN v_lab_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lab_create_lab_report(
  UUID, TEXT, DATE, TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB
) TO authenticated;
