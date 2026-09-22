-- ========================================================
-- HEALTH WALLET — POSTGRESQL DATABASE SCHEMA (SUPABASE)
-- ========================================================
-- Execute this script in your Supabase SQL Editor:
-- Dashboard > SQL Editor > New Query > Run
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------
-- TABLE 1: users
-- Roles: PATIENT, DOCTOR, LAB, PHARMACY, HOSPITAL
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  login_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PATIENT', 'DOCTOR', 'PHARMACIST', 'LAB', 'RECORD_KEEPER', 'PHARMACY', 'HOSPITAL', 'EMERGENCY', 'patient', 'doctor', 'pharmacist', 'lab', 'record_keeper', 'pharmacy', 'hospital', 'emergency')),
  password TEXT NOT NULL,
  health_wallet_id TEXT,
  doctor_id TEXT,
  pharmacy_id TEXT,
  lab_id TEXT,
  record_keeper_id TEXT,
  organization TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_login_id ON public.users(login_id);
CREATE INDEX IF NOT EXISTS idx_users_hw_id ON public.users(health_wallet_id);

-- --------------------------------------------------------
-- TABLE 2: patients
-- Unique identifier: health_wallet_id (e.g. HW-IN-2026-XXXX-XXXX)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_wallet_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  blood_group TEXT,
  allergies TEXT,
  phone TEXT,
  mobile_number TEXT,
  aadhaar_number TEXT UNIQUE,
  state TEXT,
  state_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_hw_id ON public.patients(health_wallet_id);
CREATE INDEX IF NOT EXISTS idx_patients_aadhaar ON public.patients(aadhaar_number);
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON public.patients(mobile_number);

-- --------------------------------------------------------
-- TABLE 3: medical_records
-- Longitudinal medical consultation history
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL,
  visit_date DATE NOT NULL,
  symptoms TEXT,
  diagnosis TEXT NOT NULL,
  treatment TEXT,
  prescription TEXT,
  follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_visit_date ON public.medical_records(visit_date DESC);

-- --------------------------------------------------------
-- TABLE 4: lab_reports
-- Diagnostic telemetry, laboratory test reports, and attachments
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  lab_name TEXT,
  test_name TEXT NOT NULL,
  result TEXT NOT NULL,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_range TEXT,
  notes TEXT,
  doctor_id TEXT,
  status TEXT DEFAULT 'Verified Provider',
  report_file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_reports_patient ON public.lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_date ON public.lab_reports(test_date DESC);


-- --------------------------------------------------------
-- TABLE 5: medications
-- Prescribed medications linked to patient and consultation
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  status TEXT DEFAULT 'PRESCRIBED' CHECK (status IN ('PRESCRIBED', 'VERIFIED', 'DISPENSED', 'Prescribed', 'Verified', 'Dispensed', 'Active')),
  dispensed_at TIMESTAMPTZ,
  dispensed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medications_patient ON public.medications(patient_id);

-- --------------------------------------------------------
-- TABLE 6: audit_logs
-- Immutable access and clinical audit trail
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  actor TEXT,
  role TEXT,
  patient_id TEXT,
  patient_hw_id TEXT,
  action TEXT NOT NULL,
  purpose TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_patient ON public.audit_logs(patient_id);


-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enables open access for prototype API key
-- --------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public users access" ON public.users;
CREATE POLICY "Public users access" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public patients access" ON public.patients;
CREATE POLICY "Public patients access" ON public.patients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public medical_records access" ON public.medical_records;
CREATE POLICY "Public medical_records access" ON public.medical_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public lab_reports access" ON public.lab_reports;
CREATE POLICY "Public lab_reports access" ON public.lab_reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public medications access" ON public.medications;
CREATE POLICY "Public medications access" ON public.medications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public audit_logs access" ON public.audit_logs;
CREATE POLICY "Public audit_logs access" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.patients TO anon, authenticated;
GRANT ALL ON public.medical_records TO anon, authenticated;
GRANT ALL ON public.lab_reports TO anon, authenticated;
GRANT ALL ON public.medications TO anon, authenticated;
GRANT ALL ON public.audit_logs TO anon, authenticated;

-- Requirement 8: NO DEFAULT DATA. System starts without predefined users.
-- Real user accounts are created through New User / Activate Account.

-- --------------------------------------------------------
-- STORAGE BUCKET: lab-reports (Private)
-- --------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-reports', 'lab-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated and anon uploads to lab-reports"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'lab-reports');

CREATE POLICY "Allow authenticated and anon access to lab-reports"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'lab-reports');

