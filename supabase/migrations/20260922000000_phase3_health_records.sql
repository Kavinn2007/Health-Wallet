-- ====================================================================
-- HEALTH WALLET V2 — PHASE 3: REAL HEALTH RECORDS & MEDICAL TIMELINE
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 2. TABLE: public.medical_records
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  record_type VARCHAR(30) NOT NULL CHECK (
    record_type IN ('CONSULTATION', 'DIAGNOSIS', 'TREATMENT', 'LAB_REPORT', 'PRESCRIPTION', 'IMAGING', 'OTHER')
  ),
  title TEXT NOT NULL,
  description TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  provider_name TEXT,
  provider_type TEXT,
  hospital_name TEXT,
  document_path TEXT,
  document_name TEXT,
  document_size BIGINT,
  document_mime_type TEXT,
  creator_type VARCHAR(20) NOT NULL DEFAULT 'PATIENT_UPLOADED' CHECK (
    creator_type IN ('PATIENT_UPLOADED', 'PROVIDER_CREATED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON public.medical_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_type ON public.medical_records(record_type);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_date ON public.medical_records(patient_id, record_date DESC);

-- --------------------------------------------------------------------
-- 3. TABLE: public.consultations
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE CASCADE,
  consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  doctor_name TEXT,
  hospital_clinic TEXT,
  chief_complaint TEXT,
  symptoms TEXT,
  diagnosis TEXT,
  treatment TEXT,
  notes TEXT,
  follow_up_date DATE,
  creator_type VARCHAR(20) NOT NULL DEFAULT 'PATIENT_UPLOADED' CHECK (
    creator_type IN ('PATIENT_UPLOADED', 'PROVIDER_CREATED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON public.consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_record_id ON public.consultations(medical_record_id);

-- --------------------------------------------------------------------
-- 4. TABLE: public.diagnoses
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE CASCADE,
  diagnosis_name TEXT NOT NULL,
  diagnosis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  provider TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnoses_patient_id ON public.diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_record_id ON public.diagnoses(medical_record_id);

-- --------------------------------------------------------------------
-- 5. TABLE: public.treatments
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE CASCADE,
  treatment_name TEXT NOT NULL,
  treatment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  provider TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatments_patient_id ON public.treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatments_record_id ON public.treatments(medical_record_id);

-- --------------------------------------------------------------------
-- 6. TABLE: public.prescriptions
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  instructions TEXT,
  prescribed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'COMPLETED', 'DISCONTINUED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_record_id ON public.prescriptions(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);

-- --------------------------------------------------------------------
-- 7. TABLE: public.lab_reports
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE CASCADE,
  lab_name TEXT,
  test_name TEXT NOT NULL,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  result TEXT,
  unit TEXT,
  reference_range TEXT,
  notes TEXT,
  report_file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_reports_patient_id ON public.lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_record_id ON public.lab_reports(medical_record_id);

-- --------------------------------------------------------------------
-- 8. TRIGGER: Automatic updated_at
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_health_records_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_medical_records_updated_at ON public.medical_records;
CREATE TRIGGER trg_medical_records_updated_at
BEFORE UPDATE ON public.medical_records
FOR EACH ROW EXECUTE FUNCTION public.trg_health_records_set_updated_at();

-- --------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_authenticated_patient_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.patient_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_authenticated_patient_profile_id() TO authenticated;

-- medical_records policies
DROP POLICY IF EXISTS "Patients can view own medical records" ON public.medical_records;
CREATE POLICY "Patients can view own medical records"
ON public.medical_records FOR SELECT TO authenticated
USING (patient_id = public.get_authenticated_patient_profile_id());

DROP POLICY IF EXISTS "Patients can insert own medical records" ON public.medical_records;
CREATE POLICY "Patients can insert own medical records"
ON public.medical_records FOR INSERT TO authenticated
WITH CHECK (patient_id = public.get_authenticated_patient_profile_id());

DROP POLICY IF EXISTS "Patients can update own medical records" ON public.medical_records;
CREATE POLICY "Patients can update own medical records"
ON public.medical_records FOR UPDATE TO authenticated
USING (patient_id = public.get_authenticated_patient_profile_id())
WITH CHECK (patient_id = public.get_authenticated_patient_profile_id());

DROP POLICY IF EXISTS "Patients can delete own medical records" ON public.medical_records;
CREATE POLICY "Patients can delete own medical records"
ON public.medical_records FOR DELETE TO authenticated
USING (patient_id = public.get_authenticated_patient_profile_id());

-- consultations policies
DROP POLICY IF EXISTS "Patients can view own consultations" ON public.consultations;
CREATE POLICY "Patients can view own consultations"
ON public.consultations FOR SELECT TO authenticated
USING (patient_id = public.get_authenticated_patient_profile_id());

DROP POLICY IF EXISTS "Patients can insert own consultations" ON public.consultations;
CREATE POLICY "Patients can insert own consultations"
ON public.consultations FOR INSERT TO authenticated
WITH CHECK (patient_id = public.get_authenticated_patient_profile_id());

-- diagnoses policies
DROP POLICY IF EXISTS "Patients can view own diagnoses" ON public.diagnoses;
CREATE POLICY "Patients can view own diagnoses"
ON public.diagnoses FOR SELECT TO authenticated
USING (patient_id = public.get_authenticated_patient_profile_id());

DROP POLICY IF EXISTS "Patients can insert own diagnoses" ON public.diagnoses;
CREATE POLICY "Patients can insert own diagnoses"
ON public.diagnoses FOR INSERT TO authenticated
WITH CHECK (patient_id = public.get_authenticated_patient_profile_id());

-- treatments policies
DROP POLICY IF EXISTS "Patients can view own treatments" ON public.treatments;
CREATE POLICY "Patients can view own treatments"
ON public.treatments FOR SELECT TO authenticated
USING (patient_id = public.get_authenticated_patient_profile_id());

DROP POLICY IF EXISTS "Patients can insert own treatments" ON public.treatments;
CREATE POLICY "Patients can insert own treatments"
ON public.treatments FOR INSERT TO authenticated
WITH CHECK (patient_id = public.get_authenticated_patient_profile_id());

-- prescriptions policies
DROP POLICY IF EXISTS "Patients can view own prescriptions" ON public.prescriptions;
CREATE POLICY "Patients can view own prescriptions"
ON public.prescriptions FOR SELECT TO authenticated
USING (patient_id = public.get_authenticated_patient_profile_id());

DROP POLICY IF EXISTS "Patients can insert own prescriptions" ON public.prescriptions;
CREATE POLICY "Patients can insert own prescriptions"
ON public.prescriptions FOR INSERT TO authenticated
WITH CHECK (patient_id = public.get_authenticated_patient_profile_id());

-- lab_reports policies
DROP POLICY IF EXISTS "Patients can view own lab reports" ON public.lab_reports;
CREATE POLICY "Patients can view own lab reports"
ON public.lab_reports FOR SELECT TO authenticated
USING (patient_id = public.get_authenticated_patient_profile_id());

DROP POLICY IF EXISTS "Patients can insert own lab reports" ON public.lab_reports;
CREATE POLICY "Patients can insert own lab reports"
ON public.lab_reports FOR INSERT TO authenticated
WITH CHECK (patient_id = public.get_authenticated_patient_profile_id());

-- --------------------------------------------------------------------
-- 10. SUPABASE STORAGE BUCKET: medical-records (PRIVATE)
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-records',
  'medical-records',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

DROP POLICY IF EXISTS "Patients can view own medical documents" ON storage.objects;
CREATE POLICY "Patients can view own medical documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'medical-records'
  AND (storage.foldername(name))[1] = (public.get_authenticated_patient_profile_id())::text
);

DROP POLICY IF EXISTS "Patients can upload own medical documents" ON storage.objects;
CREATE POLICY "Patients can upload own medical documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'medical-records'
  AND (storage.foldername(name))[1] = (public.get_authenticated_patient_profile_id())::text
);

DROP POLICY IF EXISTS "Patients can delete own medical documents" ON storage.objects;
CREATE POLICY "Patients can delete own medical documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'medical-records'
  AND (storage.foldername(name))[1] = (public.get_authenticated_patient_profile_id())::text
);
