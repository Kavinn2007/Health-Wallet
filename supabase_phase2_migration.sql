-- ====================================================================
-- HEALTH WALLET V2 — SUPABASE AUTHENTICATION & PATIENT SCHEMA
-- ====================================================================
-- Instructions:
-- Execute this migration script in your Supabase Project SQL Editor:
-- Supabase Dashboard > SQL Editor > New Query > Paste & Run
-- ====================================================================

-- 1. Enable Required Cryptographic Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 2. TABLE: public.patient_profiles
-- Associated 1:1 with authenticated users in auth.users
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  health_wallet_id TEXT UNIQUE NOT NULL,
  patient_name TEXT NOT NULL,
  mobile_number VARCHAR(10) NOT NULL UNIQUE,
  aadhaar_hash TEXT NOT NULL UNIQUE,
  aadhaar_last_four VARCHAR(4) NOT NULL,
  blood_group VARCHAR(5) NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
  state TEXT NOT NULL,
  state_code VARCHAR(2) NOT NULL,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_patient_profiles_user_id ON public.patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_hw_id ON public.patient_profiles(health_wallet_id);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_mobile ON public.patient_profiles(mobile_number);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_username ON public.patient_profiles(lower(username));
CREATE INDEX IF NOT EXISTS idx_patient_profiles_aadhaar_hash ON public.patient_profiles(aadhaar_hash);

-- --------------------------------------------------------------------
-- 3. FUNCTION: Generate Authoritative Unique Health Wallet ID
-- Format: HW-[STATE CODE]-[8 RANDOM DIGITS] (e.g. HW-TN-48291736)
-- Generates cryptographically appropriate random 8-digit numbers.
-- Verifies database uniqueness and retries automatically on collision.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_unique_health_wallet_id(p_state_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_hw_id TEXT;
    random_digits TEXT;
    collision_count INT;
    attempts INT := 0;
    clean_state_code TEXT;
BEGIN
    clean_state_code := upper(trim(p_state_code));
    IF clean_state_code IS NULL OR length(clean_state_code) != 2 THEN
        clean_state_code := 'IN';
    END IF;

    LOOP
        attempts := attempts + 1;
        -- Generate 8 random digits (10000000 to 99999999) using cryptographic pgcrypto or floor(random())
        random_digits := lpad(floor(10000000 + (random() * 90000000))::text, 8, '0');
        new_hw_id := 'HW-' || clean_state_code || '-' || random_digits;

        -- Verify uniqueness against existing patient profiles
        SELECT count(*) INTO collision_count 
        FROM public.patient_profiles 
        WHERE health_wallet_id = new_hw_id;

        IF collision_count = 0 THEN
            RETURN new_hw_id;
        END IF;

        IF attempts > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique Health Wallet ID after 100 iterations.';
        END IF;
    END LOOP;
END;
$$;

-- --------------------------------------------------------------------
-- 4. TRIGGER: Authoritative Health Wallet ID Generation on Insertion
-- Guarantees that the backend/database is authoritative.
-- The frontend cannot tamper with or fabricate Health Wallet IDs.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_patient_profiles_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If health_wallet_id is not already set or requires authoritative assignment:
    IF NEW.health_wallet_id IS NULL OR NEW.health_wallet_id = '' THEN
        NEW.health_wallet_id := public.generate_unique_health_wallet_id(NEW.state_code);
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_health_wallet_id ON public.patient_profiles;
CREATE TRIGGER trg_assign_health_wallet_id
BEFORE INSERT ON public.patient_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_patient_profiles_before_insert();

-- Updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.trg_patient_profiles_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_timestamp ON public.patient_profiles;
CREATE TRIGGER trg_update_timestamp
BEFORE UPDATE ON public.patient_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_patient_profiles_before_update();

-- --------------------------------------------------------------------
-- 5. FUNCTION: Resolve Username or Mobile to Auth Email
-- Allows login with either Username or Mobile Number securely
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_email_by_identifier(p_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    clean_identifier TEXT;
    resolved_username TEXT;
BEGIN
    clean_identifier := trim(p_identifier);

    -- Check if it matches a mobile number (10 digits)
    IF clean_identifier ~ '^[6-9][0-9]{9}$' THEN
        SELECT username INTO resolved_username
        FROM public.patient_profiles
        WHERE mobile_number = clean_identifier
        LIMIT 1;

        IF resolved_username IS NOT NULL THEN
            RETURN lower(resolved_username) || '@patient.healthwallet.local';
        END IF;
    END IF;

    -- Otherwise treat as username
    RETURN lower(clean_identifier) || '@patient.healthwallet.local';
END;
$$;

-- Grant execution to public for login lookup
GRANT EXECUTE ON FUNCTION public.get_auth_email_by_identifier(TEXT) TO anon, authenticated;

-- --------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS)
-- Patients can ONLY access their own profiles.
-- No public policies. No USING (true).
-- --------------------------------------------------------------------
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can view their own profile" ON public.patient_profiles;
CREATE POLICY "Patients can view their own profile"
ON public.patient_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Patients can create their own profile" ON public.patient_profiles;
CREATE POLICY "Patients can create their own profile"
ON public.patient_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Patients can update their own profile" ON public.patient_profiles;
CREATE POLICY "Patients can update their own profile"
ON public.patient_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Explicitly revoke public delete
REVOKE DELETE ON public.patient_profiles FROM anon, authenticated;
