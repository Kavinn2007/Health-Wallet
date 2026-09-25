-- ====================================================================
-- HEALTH WALLET V2 — PHASE 7: DOCTOR CLINICAL WORKFLOW
-- ====================================================================

ALTER TABLE public.treatments 
ADD COLUMN IF NOT EXISTS care_plan TEXT;

ALTER TABLE public.prescriptions 
ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE public.prescriptions 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Function: Doctor Creates Consultation
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
  -- 1. Identify and verify caller is a verified doctor
  SELECT id, doctor_name, hospital_name, specialization INTO v_doc
  FROM public.doctor_profiles
  WHERE user_id = auth.uid();

  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not a verified medical doctor.';
  END IF;

  -- 2. Verify target patient exists
  SELECT id, patient_name, health_wallet_id INTO v_patient
  FROM public.patient_profiles
  WHERE id = p_patient_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Patient not found.';
  END IF;

  -- 3. Verify active approved consent
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

  -- 4. Check consent expiration
  IF v_consent.expires_at <= NOW() THEN
    UPDATE public.consents SET status = 'EXPIRED', updated_at = NOW() WHERE id = v_consent.id;
    RAISE EXCEPTION 'Access Denied: Patient consent has expired.';
  END IF;

  -- 5. Check category authorization
  IF NOT ('CONSULTATIONS' = ANY(v_consent.approved_record_types) OR 'ALL_RECORDS' = ANY(v_consent.approved_record_types)) THEN
    RAISE EXCEPTION 'Access Denied: Patient consent does not authorize creating consultations.';
  END IF;

  -- 6. Validate input parameters
  IF p_consultation_date IS NULL THEN
    RAISE EXCEPTION 'Consultation date is required.';
  END IF;

  v_clean_complaint := trim(p_chief_complaint);
  IF v_clean_complaint IS NULL OR v_clean_complaint = '' THEN
    RAISE EXCEPTION 'Chief complaint is required.';
  END IF;

  -- 7. Insert master medical record entry
  INSERT INTO public.medical_records (
    patient_id,
    record_type,
    title,
    description,
    record_date,
    provider_name,
    provider_type,
    hospital_name,
    creator_type
  ) VALUES (
    p_patient_id,
    'CONSULTATION',
    v_clean_complaint,
    COALESCE(trim(p_notes), 'Clinical Consultation with ' || v_doc.doctor_name),
    p_consultation_date,
    v_doc.doctor_name,
    'DOCTOR',
    v_doc.hospital_name,
    'PROVIDER_CREATED'
  ) RETURNING id INTO v_record_id;

  -- 8. Insert child consultation entry
  INSERT INTO public.consultations (
    patient_id,
    medical_record_id,
    consultation_date,
    doctor_name,
    hospital_clinic,
    chief_complaint,
    symptoms,
    diagnosis,
    treatment,
    notes,
    follow_up_date,
    creator_type
  ) VALUES (
    p_patient_id,
    v_record_id,
    p_consultation_date,
    v_doc.doctor_name,
    v_doc.hospital_name,
    v_clean_complaint,
    trim(p_symptoms),
    trim(p_diagnosis),
    trim(p_treatment),
    trim(p_notes),
    p_follow_up_date,
    'PROVIDER_CREATED'
  ) RETURNING id INTO v_consultation_id;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record_id,
    'consultation_id', v_consultation_id,
    'record_type', 'CONSULTATION',
    'creator_type', 'PROVIDER_CREATED'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.doctor_create_consultation(UUID, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, DATE) TO authenticated;

-- Function: Doctor Creates Diagnosis
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
  -- 1. Identify and verify caller is a verified doctor
  SELECT id, doctor_name, hospital_name, specialization INTO v_doc
  FROM public.doctor_profiles
  WHERE user_id = auth.uid();

  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not a verified medical doctor.';
  END IF;

  -- 2. Verify target patient exists
  SELECT id, patient_name, health_wallet_id INTO v_patient
  FROM public.patient_profiles
  WHERE id = p_patient_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Patient not found.';
  END IF;

  -- 3. Verify active approved consent
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

  -- 4. Check consent expiration
  IF v_consent.expires_at <= NOW() THEN
    UPDATE public.consents SET status = 'EXPIRED', updated_at = NOW() WHERE id = v_consent.id;
    RAISE EXCEPTION 'Access Denied: Patient consent has expired.';
  END IF;

  -- 5. Check category authorization
  IF NOT ('DIAGNOSES' = ANY(v_consent.approved_record_types) OR 'ALL_RECORDS' = ANY(v_consent.approved_record_types)) THEN
    RAISE EXCEPTION 'Access Denied: Patient consent does not authorize creating diagnoses.';
  END IF;

  -- 6. Validate input parameters
  IF p_diagnosis_date IS NULL THEN
    RAISE EXCEPTION 'Diagnosis date is required.';
  END IF;

  v_clean_condition := trim(p_condition);
  IF v_clean_condition IS NULL OR v_clean_condition = '' THEN
    RAISE EXCEPTION 'Diagnosis condition is required.';
  END IF;

  -- 7. Insert master medical record entry
  INSERT INTO public.medical_records (
    patient_id,
    record_type,
    title,
    description,
    record_date,
    provider_name,
    provider_type,
    hospital_name,
    creator_type
  ) VALUES (
    p_patient_id,
    'DIAGNOSIS',
    v_clean_condition,
    COALESCE(trim(p_notes), 'Formal Clinical Diagnosis: ' || v_clean_condition),
    p_diagnosis_date,
    v_doc.doctor_name,
    'DOCTOR',
    v_doc.hospital_name,
    'PROVIDER_CREATED'
  ) RETURNING id INTO v_record_id;

  -- 8. Insert child diagnosis entry
  INSERT INTO public.diagnoses (
    patient_id,
    medical_record_id,
    diagnosis_name,
    diagnosis_date,
    provider,
    notes
  ) VALUES (
    p_patient_id,
    v_record_id,
    v_clean_condition,
    p_diagnosis_date,
    v_doc.doctor_name,
    trim(p_notes)
  ) RETURNING id INTO v_diagnosis_id;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record_id,
    'diagnosis_id', v_diagnosis_id,
    'record_type', 'DIAGNOSIS',
    'creator_type', 'PROVIDER_CREATED'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.doctor_create_diagnosis(UUID, DATE, TEXT, TEXT) TO authenticated;

-- Function: Doctor Creates Treatment
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
  -- 1. Identify and verify caller is a verified doctor
  SELECT id, doctor_name, hospital_name, specialization INTO v_doc
  FROM public.doctor_profiles
  WHERE user_id = auth.uid();

  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not a verified medical doctor.';
  END IF;

  -- 2. Verify target patient exists
  SELECT id, patient_name, health_wallet_id INTO v_patient
  FROM public.patient_profiles
  WHERE id = p_patient_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Patient not found.';
  END IF;

  -- 3. Verify active approved consent
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

  -- 4. Check consent expiration
  IF v_consent.expires_at <= NOW() THEN
    UPDATE public.consents SET status = 'EXPIRED', updated_at = NOW() WHERE id = v_consent.id;
    RAISE EXCEPTION 'Access Denied: Patient consent has expired.';
  END IF;

  -- 5. Check category authorization
  IF NOT ('TREATMENTS' = ANY(v_consent.approved_record_types) OR 'ALL_RECORDS' = ANY(v_consent.approved_record_types)) THEN
    RAISE EXCEPTION 'Access Denied: Patient consent does not authorize creating treatments.';
  END IF;

  -- 6. Validate input parameters
  IF p_treatment_date IS NULL THEN
    RAISE EXCEPTION 'Treatment date is required.';
  END IF;

  v_clean_treatment := trim(p_treatment);
  IF v_clean_treatment IS NULL OR v_clean_treatment = '' THEN
    RAISE EXCEPTION 'Treatment / intervention description is required.';
  END IF;

  -- 7. Insert master medical record entry
  INSERT INTO public.medical_records (
    patient_id,
    record_type,
    title,
    description,
    record_date,
    provider_name,
    provider_type,
    hospital_name,
    creator_type
  ) VALUES (
    p_patient_id,
    'TREATMENT',
    v_clean_treatment,
    COALESCE(trim(p_care_plan), trim(p_notes), 'Treatment / Intervention: ' || v_clean_treatment),
    p_treatment_date,
    v_doc.doctor_name,
    'DOCTOR',
    v_doc.hospital_name,
    'PROVIDER_CREATED'
  ) RETURNING id INTO v_record_id;

  -- 8. Insert child treatment entry
  INSERT INTO public.treatments (
    patient_id,
    medical_record_id,
    treatment_name,
    treatment_date,
    provider,
    care_plan,
    notes
  ) VALUES (
    p_patient_id,
    v_record_id,
    v_clean_treatment,
    p_treatment_date,
    v_doc.doctor_name,
    trim(p_care_plan),
    trim(p_notes)
  ) RETURNING id INTO v_treatment_id;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record_id,
    'treatment_id', v_treatment_id,
    'record_type', 'TREATMENT',
    'creator_type', 'PROVIDER_CREATED'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.doctor_create_treatment(UUID, DATE, TEXT, TEXT, TEXT) TO authenticated;

-- Function: Doctor Creates Prescription
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
  -- 1. Identify and verify caller is a verified doctor
  SELECT id, doctor_name, hospital_name, specialization INTO v_doc
  FROM public.doctor_profiles
  WHERE user_id = auth.uid();

  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Caller is not a verified medical doctor.';
  END IF;

  -- 2. Verify target patient exists
  SELECT id, patient_name, health_wallet_id INTO v_patient
  FROM public.patient_profiles
  WHERE id = p_patient_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Patient not found.';
  END IF;

  -- 3. Verify active approved consent
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

  -- 4. Check consent expiration
  IF v_consent.expires_at <= NOW() THEN
    UPDATE public.consents SET status = 'EXPIRED', updated_at = NOW() WHERE id = v_consent.id;
    RAISE EXCEPTION 'Access Denied: Patient consent has expired.';
  END IF;

  -- 5. Check category authorization
  IF NOT ('PRESCRIPTIONS' = ANY(v_consent.approved_record_types) OR 'ALL_RECORDS' = ANY(v_consent.approved_record_types)) THEN
    RAISE EXCEPTION 'Access Denied: Patient consent does not authorize creating prescriptions.';
  END IF;

  -- 6. Validate input parameters
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

  -- 7. Insert master medical record entry
  INSERT INTO public.medical_records (
    patient_id,
    record_type,
    title,
    description,
    record_date,
    provider_name,
    provider_type,
    hospital_name,
    creator_type
  ) VALUES (
    p_patient_id,
    'PRESCRIPTION',
    v_clean_medicine || ' (' || v_clean_dosage || ')',
    'Rx: ' || v_clean_medicine || ' ' || v_clean_dosage || ', Frequency: ' || v_clean_frequency || ', Duration: ' || v_clean_duration || COALESCE(E'\nInstructions: ' || trim(p_instructions), ''),
    v_prescribed_date,
    v_doc.doctor_name,
    'DOCTOR',
    v_doc.hospital_name,
    'PROVIDER_CREATED'
  ) RETURNING id INTO v_record_id;

  -- 8. Insert child prescription entry
  INSERT INTO public.prescriptions (
    patient_id,
    medical_record_id,
    medicine_name,
    dosage,
    frequency,
    duration,
    instructions,
    prescribed_date,
    start_date,
    end_date,
    status
  ) VALUES (
    p_patient_id,
    v_record_id,
    v_clean_medicine,
    v_clean_dosage,
    v_clean_frequency,
    v_clean_duration,
    trim(p_instructions),
    v_prescribed_date,
    p_start_date,
    p_end_date,
    'ACTIVE'
  ) RETURNING id INTO v_prescription_id;

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

GRANT EXECUTE ON FUNCTION public.doctor_create_prescription(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE) TO authenticated;
