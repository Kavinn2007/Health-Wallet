-- ====================================================================
-- MEDIMIND — HOSPITAL DIRECTORY & BLOOD DONATION INTEGRATION
-- Phase: Hospital Directory (Phase 14)
-- Location-aware hospital directory for blood donation & emergency network
-- ====================================================================

-- 1. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_name TEXT NOT NULL,
  hospital_code TEXT UNIQUE NOT NULL,
  state_code TEXT NOT NULL,
  state_name TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  address TEXT,
  pincode TEXT,
  phone_number TEXT,
  emergency_available BOOLEAN DEFAULT false,
  blood_bank_available BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  is_seed BOOLEAN DEFAULT false,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  website TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all required columns exist if table was partially created
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS district TEXT;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS pincode TEXT;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS phone_number TEXT;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS emergency_available BOOLEAN DEFAULT false;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS blood_bank_available BOOLEAN DEFAULT false;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS is_seed BOOLEAN DEFAULT false;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS website TEXT;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- 2. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_hospitals_state_city ON public.hospitals (state_name, city);
CREATE INDEX IF NOT EXISTS idx_hospitals_state_code ON public.hospitals (state_code);
CREATE INDEX IF NOT EXISTS idx_hospitals_active_verified ON public.hospitals (active, verified);
CREATE INDEX IF NOT EXISTS idx_hospitals_blood_bank ON public.hospitals (blood_bank_available) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_hospitals_emergency ON public.hospitals (emergency_available) WHERE active = true;

-- 3. LINK HOSPITAL ID TO EMERGENCY BLOOD REQUESTS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'emergency_blood_requests') THEN
    ALTER TABLE public.emergency_blood_requests 
      ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_emergency_blood_requests_hospital_id 
      ON public.emergency_blood_requests(hospital_id);
  END IF;
END $$;

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Drop prior policies if they exist to prevent duplicates
DROP POLICY IF EXISTS "Active hospitals viewable by authenticated users" ON public.hospitals;
DROP POLICY IF EXISTS "Active hospitals viewable by public" ON public.hospitals;
DROP POLICY IF EXISTS "Authorized staff can insert hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Authorized staff can update hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Public cannot modify hospitals" ON public.hospitals;

-- SELECT POLICY:
-- Active hospitals are viewable by authenticated users and anon for discovery
CREATE POLICY "Active hospitals viewable by authenticated users"
  ON public.hospitals
  FOR SELECT
  TO authenticated, anon
  USING (active = true);

-- INSERT POLICY:
-- Only administrative users and authorized staff can insert hospitals.
-- Patients / Donors must NOT create hospitals.
CREATE POLICY "Authorized staff can insert hospitals"
  ON public.hospitals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role' = 'ADMIN') OR
    (auth.jwt() ->> 'role' = 'DOCTOR') OR
    (auth.jwt() ->> 'email' LIKE '%@medimind.org')
  );

-- UPDATE POLICY:
-- Only administrative users and authorized staff can update hospitals.
-- Patients / Donors must NOT modify hospitals.
CREATE POLICY "Authorized staff can update hospitals"
  ON public.hospitals
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role' = 'ADMIN') OR
    (auth.jwt() ->> 'role' = 'DOCTOR') OR
    (auth.jwt() ->> 'email' LIKE '%@medimind.org')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role' = 'ADMIN') OR
    (auth.jwt() ->> 'role' = 'DOCTOR') OR
    (auth.jwt() ->> 'email' LIKE '%@medimind.org')
  );

-- 5. SECURE RPC FOR EMERGENCY REQUEST CREATION WITH HOSPITAL ID
CREATE OR REPLACE FUNCTION public.create_emergency_blood_request(
  p_hospital_name TEXT,
  p_hospital_location TEXT,
  p_authorized_department TEXT,
  p_blood_group TEXT,
  p_units_required INTEGER,
  p_priority TEXT,
  p_required_within_minutes INTEGER,
  p_hospital_id UUID DEFAULT NULL
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
  v_resolved_hospital_id UUID;
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

  -- Verify hospital_id if provided
  v_resolved_hospital_id := p_hospital_id;
  IF v_resolved_hospital_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.hospitals WHERE id = v_resolved_hospital_id AND active = true) THEN
      -- If invalid or inactive, do not fail transaction; set null or raise notice
      v_resolved_hospital_id := NULL;
    END IF;
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
    expires_at,
    hospital_id
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
    v_expires_at,
    v_resolved_hospital_id
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
    'SUCCESS',
    jsonb_build_object(
      'request_code', v_req_code,
      'blood_group', p_blood_group,
      'units_required', p_units_required,
      'priority', p_priority,
      'hospital_name', p_hospital_name,
      'hospital_id', v_resolved_hospital_id
    )
  );

  -- Notify eligible voluntary donors
  v_hours_text := CASE 
    WHEN p_required_within_minutes >= 60 THEN (p_required_within_minutes / 60) || ' Hours'
    ELSE p_required_within_minutes || ' Minutes'
  END;

  v_msg := 'CRITICAL: ' || p_hospital_name || ' (' || p_hospital_location || ') urgently requires ' ||
           p_units_required || ' units of ' || p_blood_group || ' blood within ' || v_hours_text ||
           '. Request ID: ' || v_req_code;

  FOR v_donor IN
    SELECT DISTINCT bdp.user_id
    FROM public.blood_donor_profiles bdp
    WHERE bdp.is_available = true
      AND bdp.user_id != v_user_id
      AND public.can_donor_donate_to_recipient(bdp.blood_group, p_blood_group) = true
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      is_read,
      created_at
    ) VALUES (
      v_donor.user_id,
      'EMERGENCY_BLOOD_REQUIREMENT',
      '🚨 EMERGENCY BLOOD REQUIREMENT: ' || p_blood_group,
      v_msg,
      false,
      now()
    );
    v_notification_count := v_notification_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'request_code', v_req_code,
    'hospital_id', v_resolved_hospital_id,
    'notified_donors_count', v_notification_count,
    'status', 'ACTIVE'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_emergency_blood_request(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_emergency_blood_request(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, UUID) TO authenticated;

-- Overload for backwards compatibility with 7 arguments
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
BEGIN
  RETURN public.create_emergency_blood_request(
    p_hospital_name,
    p_hospital_location,
    p_authorized_department,
    p_blood_group,
    p_units_required,
    p_priority,
    p_required_within_minutes,
    NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_emergency_blood_request(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_emergency_blood_request(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER) TO authenticated;

-- 6. CONTROLLED SEED DATASET FOR HOSPITALS
-- Clearly separated seed/demo records from production records using is_seed = true
INSERT INTO public.hospitals (
  id, hospital_name, hospital_code, state_code, state_name, city, district, address, pincode, phone_number,
  emergency_available, blood_bank_available, verified, active, is_seed, latitude, longitude, website, emergency_contact
) VALUES
  -- TAMIL NADU — SALEM
  ('a1000000-0000-0000-0000-000000000001', 'Salem Government Mohan Kumaramangalam Medical College Hospital', 'HOSP-TN-SLM-001', 'Tamil Nadu', 'Tamil Nadu', 'Salem', 'Salem', 'Fort Main Road, Near Collectorate', '636001', '+91 427 288 2200', true, true, true, true, true, 11.6643, 78.1460, 'https://gmkmc.ac.in', '+91 427 288 2211'),
  ('a1000000-0000-0000-0000-000000000002', 'Manipal Hospital Salem', 'HOSP-TN-SLM-002', 'Tamil Nadu', 'Tamil Nadu', 'Salem', 'Salem', 'Dalmia Board, Bangalore Highway', '636012', '+91 427 234 6666', true, true, true, true, true, 11.6912, 78.1215, 'https://manipalhospitals.com/salem', '+91 427 234 6699'),
  ('a1000000-0000-0000-0000-000000000003', 'Sri Gokulam Hospital', 'HOSP-TN-SLM-003', 'Tamil Nadu', 'Tamil Nadu', 'Salem', 'Salem', '3/60, Meyyanur Main Road', '636004', '+91 427 244 8171', true, true, true, true, true, 11.6621, 78.1348, 'https://gokulamhospital.com', '+91 427 244 8179'),
  ('a1000000-0000-0000-0000-000000000004', 'SKS Hospital & Post Graduate Medical Institute', 'HOSP-TN-SLM-004', 'Tamil Nadu', 'Tamil Nadu', 'Salem', 'Salem', '23, SKS Hospital Road, Fairlands', '636016', '+91 427 404 1000', true, false, true, true, true, 11.6738, 78.1442, 'https://skshospital.com', '+91 427 404 1010'),

  -- TAMIL NADU — COIMBATORE
  ('a1000000-0000-0000-0000-000000000005', 'ABC Multi-Speciality Hospital', 'HOSP-TN-CBE-001', 'Tamil Nadu', 'Tamil Nadu', 'Coimbatore', 'Coimbatore', '142, Avinashi Road, Peelamedu', '641004', '+91 422 257 0170', true, true, true, true, true, 11.0264, 76.9972, 'https://abchospital.medimind.org', '+91 422 257 0199'),
  ('a1000000-0000-0000-0000-000000000006', 'PSG Hospitals', 'HOSP-TN-CBE-002', 'Tamil Nadu', 'Tamil Nadu', 'Coimbatore', 'Coimbatore', 'Avinashi Road, Peelamedu', '641004', '+91 422 257 0170', true, true, true, true, true, 11.0280, 77.0010, 'https://psghospitals.com', '+91 422 434 5000'),
  ('a1000000-0000-0000-0000-000000000007', 'Ganga Hospital', 'HOSP-TN-CBE-003', 'Tamil Nadu', 'Tamil Nadu', 'Coimbatore', 'Coimbatore', '313, Mettupalayam Road, Saibaba Colony', '641043', '+91 422 248 5000', true, true, true, true, true, 11.0205, 76.9530, 'https://gangahospital.com', '+91 422 248 5011'),
  ('a1000000-0000-0000-0000-000000000008', 'Sri Ramakrishna Hospital', 'HOSP-TN-CBE-004', 'Tamil Nadu', 'Tamil Nadu', 'Coimbatore', 'Coimbatore', '395, Sarojini Naidu Road, Sidhapudur', '641044', '+91 422 450 0000', true, true, true, true, true, 11.0145, 76.9782, 'https://sriramakrishnahospital.com', '+91 422 450 0108'),
  ('a1000000-0000-0000-0000-000000000009', 'Coimbatore Medical College Hospital', 'HOSP-TN-CBE-005', 'Tamil Nadu', 'Tamil Nadu', 'Coimbatore', 'Coimbatore', 'Trichy Road, Gopalapuram', '641018', '+91 422 230 1393', true, true, true, true, true, 10.9982, 76.9691, 'https://cmch.tn.gov.in', '+91 422 230 1394'),

  -- TAMIL NADU — CHENNAI
  ('a1000000-0000-0000-0000-000000000010', 'Rajiv Gandhi Government General Hospital', 'HOSP-TN-MAA-001', 'Tamil Nadu', 'Tamil Nadu', 'Chennai', 'Chennai', 'EVR Periyar Salai, Park Town', '600003', '+91 44 2530 5000', true, true, true, true, true, 13.0805, 80.2778, 'https://rggh.tn.gov.in', '+91 44 2530 5108'),
  ('a1000000-0000-0000-0000-000000000011', 'Apollo Hospitals Greams Road', 'HOSP-TN-MAA-002', 'Tamil Nadu', 'Tamil Nadu', 'Chennai', 'Chennai', '21, Greams Lane, Thousand Lights', '600006', '+91 44 2829 0200', true, true, true, true, true, 13.0594, 80.2505, 'https://apollohospitals.com', '+91 44 2829 3333'),
  ('a1000000-0000-0000-0000-000000000012', 'The Madras Medical Mission', 'HOSP-TN-MAA-003', 'Tamil Nadu', 'Tamil Nadu', 'Chennai', 'Chennai', '4-A, Dr. J. Jayalalitha Nagar, Mogappair', '600037', '+91 44 2656 8000', true, true, true, true, true, 13.0872, 80.1775, 'https://madrasmedicalmission.org', '+91 44 2656 5961'),
  ('a1000000-0000-0000-0000-000000000013', 'Fortis Malar Hospital', 'HOSP-TN-MAA-004', 'Tamil Nadu', 'Tamil Nadu', 'Chennai', 'Chennai', '52, 1st Main Rd, Gandhi Nagar, Adyar', '600020', '+91 44 4289 2222', true, false, true, true, true, 13.0067, 80.2575, 'https://fortishealthcare.com', '+91 44 4289 2200'),
  ('a1000000-0000-0000-0000-000000000014', 'Government Stanley Medical College Hospital', 'HOSP-TN-MAA-005', 'Tamil Nadu', 'Tamil Nadu', 'Chennai', 'Chennai', 'Old Jail Road, Royapuram', '600001', '+91 44 2528 1351', true, true, true, true, true, 13.1070, 80.2925, 'https://stanley.tn.gov.in', '+91 44 2528 1355'),

  -- TAMIL NADU — MADURAI
  ('a1000000-0000-0000-0000-000000000015', 'Government Rajaji Hospital', 'HOSP-TN-IXM-001', 'Tamil Nadu', 'Tamil Nadu', 'Madurai', 'Madurai', 'Panagal Road, Shenoy Nagar', '625020', '+91 452 253 2535', true, true, true, true, true, 9.9288, 78.1272, 'https://grh.tn.gov.in', '+91 452 253 2536'),
  ('a1000000-0000-0000-0000-000000000016', 'Meenakshi Mission Hospital & Research Centre', 'HOSP-TN-IXM-002', 'Tamil Nadu', 'Tamil Nadu', 'Madurai', 'Madurai', 'Lake Area, Melur Main Road', '625107', '+91 452 426 3000', true, true, true, true, true, 9.9482, 78.1634, 'https://meenakshimission.org', '+91 452 258 4500'),
  ('a1000000-0000-0000-0000-000000000017', 'Apollo Speciality Hospitals Madurai', 'HOSP-TN-IXM-003', 'Tamil Nadu', 'Tamil Nadu', 'Madurai', 'Madurai', 'KK Nagar, Lake View Road', '625020', '+91 452 258 0880', true, true, true, true, true, 9.9325, 78.1470, 'https://apollohospitals.com', '+91 452 258 0888'),

  -- TAMIL NADU — TRICHY
  ('a1000000-0000-0000-0000-000000000018', 'Mahatma Gandhi Memorial Government Hospital', 'HOSP-TN-TRZ-001', 'Tamil Nadu', 'Tamil Nadu', 'Trichy', 'Tiruchirappalli', 'Collector Office Road, Cantonment', '620001', '+91 431 241 2511', true, true, true, true, true, 10.8050, 78.6856, 'https://mgmgh.tn.gov.in', '+91 431 241 2512'),
  ('a1000000-0000-0000-0000-000000000019', 'Kauvery Hospital Trichy', 'HOSP-TN-TRZ-002', 'Tamil Nadu', 'Tamil Nadu', 'Trichy', 'Tiruchirappalli', '1, K.C. Road, Tennur', '620017', '+91 431 400 6000', true, true, true, true, true, 10.8220, 78.6880, 'https://kauveryhospital.com', '+91 431 400 6001'),

  -- TAMIL NADU — HOSUR
  ('a1000000-0000-0000-0000-000000000020', 'Hosur Government Hospital', 'HOSP-TN-HSR-001', 'Tamil Nadu', 'Tamil Nadu', 'Hosur', 'Krishnagiri', 'Denkanikotta Road, Near Bus Stand', '635109', '+91 4344 222 222', true, true, true, true, true, 12.7409, 77.8253, 'https://hosurgh.tn.gov.in', '+91 4344 222 223'),
  ('a1000000-0000-0000-0000-000000000021', 'Kauvery Hospital Hosur', 'HOSP-TN-HSR-002', 'Tamil Nadu', 'Tamil Nadu', 'Hosur', 'Krishnagiri', 'SIPCOT Industrial Complex, Phase 1', '635126', '+91 4344 661 111', true, false, true, true, true, 12.7560, 77.8010, 'https://kauveryhospital.com/hosur', '+91 4344 661 100'),

  -- TAMIL NADU — ERODE
  ('a1000000-0000-0000-0000-000000000022', 'Erode Government District Headquarters Hospital', 'HOSP-TN-ERD-001', 'Tamil Nadu', 'Tamil Nadu', 'Erode', 'Erode', 'Perundurai Road', '638011', '+91 424 225 8355', true, true, true, true, true, 11.3410, 77.7172, 'https://erodegh.tn.gov.in', '+91 424 225 8356'),
  ('a1000000-0000-0000-0000-000000000023', 'Lotus Hospital Erode', 'HOSP-TN-ERD-002', 'Tamil Nadu', 'Tamil Nadu', 'Erode', 'Erode', 'Poondurai Main Road, Kollampalayam', '638002', '+91 424 228 2828', true, true, true, true, true, 11.3280, 77.7290, 'https://lotushospitals.com', '+91 424 228 2800'),

  -- KARNATAKA — BANGALORE
  ('a1000000-0000-0000-0000-000000000024', 'Victoria Hospital Bangalore', 'HOSP-KA-BLR-001', 'Karnataka', 'Karnataka', 'Bangalore', 'Bangalore Urban', 'Fort Road, Near City Market', '560002', '+91 80 2670 1150', true, true, true, true, true, 12.9629, 77.5753, 'https://victoriahospital.karnataka.gov.in', '+91 80 2670 1155'),
  ('a1000000-0000-0000-0000-000000000025', 'Manipal Hospital HAL Airport Road', 'HOSP-KA-BLR-002', 'Karnataka', 'Karnataka', 'Bangalore', 'Bangalore Urban', '98, HAL Old Airport Road, Kodihalli', '560017', '+91 80 2502 4444', true, true, true, true, true, 12.9592, 77.6499, 'https://manipalhospitals.com/oldairportroad', '+91 80 2502 3344'),
  ('a1000000-0000-0000-0000-000000000026', 'Narayana Health City Bangalore', 'HOSP-KA-BLR-003', 'Karnataka', 'Karnataka', 'Bangalore', 'Bangalore Urban', '258/A, Bommasandra Industrial Area, Anekal Taluk', '560099', '+91 80 7122 2222', true, true, true, true, true, 12.8175, 77.6917, 'https://narayanahealth.org', '+91 80 7122 2200'),

  -- KARNATAKA — MYSORE
  ('a1000000-0000-0000-0000-000000000027', 'Apollo BGS Hospitals Mysore', 'HOSP-KA-MYS-001', 'Karnataka', 'Karnataka', 'Mysore', 'Mysore', 'Adhichunchanagiri Road, Kuvempunagar', '570023', '+91 821 256 8888', true, true, true, true, true, 12.2890, 76.6340, 'https://apollobgshospitals.com', '+91 821 256 8899'),
  ('a1000000-0000-0000-0000-000000000028', 'Krishna Rajendra (KR) Hospital Mysore', 'HOSP-KA-MYS-002', 'Karnataka', 'Karnataka', 'Mysore', 'Mysore', 'Sayyaji Rao Road, Near Mysore Palace', '570001', '+91 821 242 0500', true, true, true, true, true, 12.3120, 76.6510, 'https://krhospital.karnataka.gov.in', '+91 821 242 0505'),

  -- TEST FIXTURE RECORDS (In Salem, for isolation & filter tests)
  -- 1) Inactive hospital (should be excluded from ordinary queries)
  ('a1000000-0000-0000-0000-000000000029', 'Salem Orthopaedic Care Center', 'HOSP-TN-SLM-099', 'Tamil Nadu', 'Tamil Nadu', 'Salem', 'Salem', '99, Junction Main Road', '636005', '+91 427 999 0000', false, false, false, false, true, 11.6600, 78.1300, NULL, NULL),
  -- 2) Unverified clinic (verified = false, emergency = false, blood bank = false)
  ('a1000000-0000-0000-0000-000000000030', 'Salem Community Health Clinic', 'HOSP-TN-SLM-098', 'Tamil Nadu', 'Tamil Nadu', 'Salem', 'Salem', '12, Bretts Road', '636001', '+91 427 888 1111', false, false, false, true, true, 11.6580, 78.1400, NULL, NULL)
ON CONFLICT (hospital_code) DO UPDATE SET
  hospital_name = EXCLUDED.hospital_name,
  state_code = EXCLUDED.state_code,
  state_name = EXCLUDED.state_name,
  city = EXCLUDED.city,
  district = EXCLUDED.district,
  address = EXCLUDED.address,
  pincode = EXCLUDED.pincode,
  phone_number = EXCLUDED.phone_number,
  emergency_available = EXCLUDED.emergency_available,
  blood_bank_available = EXCLUDED.blood_bank_available,
  verified = EXCLUDED.verified,
  active = EXCLUDED.active,
  is_seed = EXCLUDED.is_seed,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  website = EXCLUDED.website,
  emergency_contact = EXCLUDED.emergency_contact,
  updated_at = now();
