-- ====================================================================
-- MEDIMIND — PHASE 12: ORGAN DONATION REGISTRATION + CONSENT MANAGEMENT
-- ====================================================================
-- This migration implements:
--  1. public.organ_donor_profiles table with RLS
--  2. public.organ_donation_preferences table with RLS
--  3. public.organ_donation_consents immutable table with RLS
--  4. Extends audit_logs constraint with organ donation actions
--  5. Extends notifications constraint with organ donation notification types
--  6. Secure PostgreSQL RPCs for registration, update, revocation, reactivation, and history
-- ====================================================================

-- 1. Create public.organ_donor_profiles table
CREATE TABLE IF NOT EXISTS public.organ_donor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL UNIQUE REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'REVOKED')),
    consent_version TEXT NOT NULL DEFAULT 'v1.0',
    consented_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organ_donor_profiles_user 
ON public.organ_donor_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_organ_donor_profiles_patient 
ON public.organ_donor_profiles (patient_id);

-- 2. Create public.organ_donation_preferences table
CREATE TABLE IF NOT EXISTS public.organ_donation_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_profile_id UUID NOT NULL UNIQUE REFERENCES public.organ_donor_profiles(id) ON DELETE CASCADE,
    kidneys BOOLEAN NOT NULL DEFAULT false,
    liver BOOLEAN NOT NULL DEFAULT false,
    heart BOOLEAN NOT NULL DEFAULT false,
    lungs BOOLEAN NOT NULL DEFAULT false,
    pancreas BOOLEAN NOT NULL DEFAULT false,
    intestines BOOLEAN NOT NULL DEFAULT false,
    corneas BOOLEAN NOT NULL DEFAULT false,
    skin BOOLEAN NOT NULL DEFAULT false,
    bone BOOLEAN NOT NULL DEFAULT false,
    tissues_other BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_at_least_one_organ CHECK (
        kidneys OR liver OR heart OR lungs OR pancreas OR 
        intestines OR corneas OR skin OR bone OR tissues_other
    )
);

CREATE INDEX IF NOT EXISTS idx_organ_pref_profile_id 
ON public.organ_donation_preferences (donor_profile_id);

-- 3. Create public.organ_donation_consents table (IMMUTABLE)
CREATE TABLE IF NOT EXISTS public.organ_donation_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_profile_id UUID NOT NULL REFERENCES public.organ_donor_profiles(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
    consent_version TEXT NOT NULL DEFAULT 'v1.0',
    consent_text TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('REGISTER', 'UPDATE', 'REVOKE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organ_consents_patient 
ON public.organ_donation_consents (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organ_consents_profile 
ON public.organ_donation_consents (donor_profile_id, created_at DESC);

-- 4. Extend Audit Logs check constraint for Phase 12
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (
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
        'PHARMACY_DECLINE_PRESCRIPTION',
        'REGISTER_BLOOD_DONOR',
        'UPDATE_BLOOD_DONOR_PROFILE',
        'SEARCH_BLOOD_DONORS',
        'CREATE_BLOOD_DONATION_REQUEST',
        'ACCEPT_BLOOD_DONATION_REQUEST',
        'DECLINE_BLOOD_DONATION_REQUEST',
        'CANCEL_BLOOD_DONATION_REQUEST',
        -- Phase 12 Actions:
        'REGISTER_ORGAN_DONOR',
        'UPDATE_ORGAN_DONATION_PREFERENCES',
        'REVOKE_ORGAN_DONATION_CONSENT',
        'REACTIVATE_ORGAN_DONOR',
        'VIEW_ORGAN_DONATION_CONSENT'
    )
);

-- 5. Extend Notifications check constraint for Phase 12
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
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
        'PRESCRIPTION_NOT_DISPENSED',
        'BLOOD_DONATION_REQUEST',
        'BLOOD_DONATION_ACCEPTED',
        'BLOOD_DONATION_DECLINED',
        'BLOOD_DONATION_CANCELLED',
        -- Phase 12 Types:
        'ORGAN_DONATION_REGISTERED',
        'ORGAN_DONATION_UPDATED',
        'ORGAN_DONATION_REVOKED',
        'ORGAN_DONATION_REACTIVATED'
    )
);

-- 6. Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_phase12_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_organ_donor_profiles_timestamp ON public.organ_donor_profiles;
CREATE TRIGGER trigger_update_organ_donor_profiles_timestamp
    BEFORE UPDATE ON public.organ_donor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_phase12_timestamp();

DROP TRIGGER IF EXISTS trigger_update_organ_donation_preferences_timestamp ON public.organ_donation_preferences;
CREATE TRIGGER trigger_update_organ_donation_preferences_timestamp
    BEFORE UPDATE ON public.organ_donation_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_phase12_timestamp();

-- 7. Row Level Security Policies
ALTER TABLE public.organ_donor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organ_donation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organ_donation_consents ENABLE ROW LEVEL SECURITY;

-- organ_donor_profiles:
DROP POLICY IF EXISTS "Patients can view own organ donor profile" ON public.organ_donor_profiles;
CREATE POLICY "Patients can view own organ donor profile"
ON public.organ_donor_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Patients can create own organ donor profile" ON public.organ_donor_profiles;
CREATE POLICY "Patients can create own organ donor profile"
ON public.organ_donor_profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Patients can update own organ donor profile" ON public.organ_donor_profiles;
CREATE POLICY "Patients can update own organ donor profile"
ON public.organ_donor_profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- organ_donation_preferences:
DROP POLICY IF EXISTS "Patients can view own organ donation preferences" ON public.organ_donation_preferences;
CREATE POLICY "Patients can view own organ donation preferences"
ON public.organ_donation_preferences FOR SELECT
TO authenticated
USING (donor_profile_id IN (SELECT id FROM public.organ_donor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Patients can create own organ donation preferences" ON public.organ_donation_preferences;
CREATE POLICY "Patients can create own organ donation preferences"
ON public.organ_donation_preferences FOR INSERT
TO authenticated
WITH CHECK (donor_profile_id IN (SELECT id FROM public.organ_donor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Patients can update own organ donation preferences" ON public.organ_donation_preferences;
CREATE POLICY "Patients can update own organ donation preferences"
ON public.organ_donation_preferences FOR UPDATE
TO authenticated
USING (donor_profile_id IN (SELECT id FROM public.organ_donor_profiles WHERE user_id = auth.uid()))
WITH CHECK (donor_profile_id IN (SELECT id FROM public.organ_donor_profiles WHERE user_id = auth.uid()));

-- organ_donation_consents (Strictly Read + Insert Only, NO UPDATE, NO DELETE):
DROP POLICY IF EXISTS "Patients can view own organ donation consent history" ON public.organ_donation_consents;
CREATE POLICY "Patients can view own organ donation consent history"
ON public.organ_donation_consents FOR SELECT
TO authenticated
USING (patient_id IN (SELECT id FROM public.patient_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Patients can record new organ donation consent" ON public.organ_donation_consents;
CREATE POLICY "Patients can record new organ donation consent"
ON public.organ_donation_consents FOR INSERT
TO authenticated
WITH CHECK (patient_id IN (SELECT id FROM public.patient_profiles WHERE user_id = auth.uid()));

-- Notice: NO UPDATE and NO DELETE policies on public.organ_donation_consents, enforcing absolute immutability.

-- ====================================================================
-- 8. SECURE POSTGRESQL RPCS
-- ====================================================================

-- RPC 1: register_organ_donor
CREATE OR REPLACE FUNCTION register_organ_donor(
    p_kidneys BOOLEAN DEFAULT false,
    p_liver BOOLEAN DEFAULT false,
    p_heart BOOLEAN DEFAULT false,
    p_lungs BOOLEAN DEFAULT false,
    p_pancreas BOOLEAN DEFAULT false,
    p_intestines BOOLEAN DEFAULT false,
    p_corneas BOOLEAN DEFAULT false,
    p_skin BOOLEAN DEFAULT false,
    p_bone BOOLEAN DEFAULT false,
    p_tissues_other BOOLEAN DEFAULT false,
    p_consent_text TEXT DEFAULT 'I voluntarily indicate my intention to donate the selected organs and tissues, subject to applicable medical, legal, and authorization requirements.',
    p_consent_version TEXT DEFAULT 'v1.0'
)
RETURNS UUID AS $$
DECLARE
    v_patient_id UUID;
    v_donor_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT id INTO v_patient_id
    FROM public.patient_profiles
    WHERE user_id = auth.uid();

    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Patient profile not found';
    END IF;

    IF NOT (p_kidneys OR p_liver OR p_heart OR p_lungs OR p_pancreas OR 
            p_intestines OR p_corneas OR p_skin OR p_bone OR p_tissues_other) THEN
        RAISE EXCEPTION 'Selection required: At least one organ or tissue must be selected for donation.';
    END IF;

    INSERT INTO public.organ_donor_profiles (
        user_id,
        patient_id,
        status,
        consent_version,
        consented_at,
        revoked_at
    ) VALUES (
        auth.uid(),
        v_patient_id,
        'ACTIVE',
        p_consent_version,
        NOW(),
        NULL
    )
    ON CONFLICT (user_id) DO UPDATE SET
        status = 'ACTIVE',
        consent_version = EXCLUDED.consent_version,
        consented_at = NOW(),
        revoked_at = NULL,
        updated_at = NOW()
    RETURNING id INTO v_donor_id;

    INSERT INTO public.organ_donation_preferences (
        donor_profile_id,
        kidneys,
        liver,
        heart,
        lungs,
        pancreas,
        intestines,
        corneas,
        skin,
        bone,
        tissues_other
    ) VALUES (
        v_donor_id,
        p_kidneys,
        p_liver,
        p_heart,
        p_lungs,
        p_pancreas,
        p_intestines,
        p_corneas,
        p_skin,
        p_bone,
        p_tissues_other
    )
    ON CONFLICT (donor_profile_id) DO UPDATE SET
        kidneys = EXCLUDED.kidneys,
        liver = EXCLUDED.liver,
        heart = EXCLUDED.heart,
        lungs = EXCLUDED.lungs,
        pancreas = EXCLUDED.pancreas,
        intestines = EXCLUDED.intestines,
        corneas = EXCLUDED.corneas,
        skin = EXCLUDED.skin,
        bone = EXCLUDED.bone,
        tissues_other = EXCLUDED.tissues_other,
        updated_at = NOW();

    INSERT INTO public.organ_donation_consents (
        donor_profile_id,
        patient_id,
        consent_version,
        consent_text,
        action
    ) VALUES (
        v_donor_id,
        v_patient_id,
        p_consent_version,
        p_consent_text,
        'REGISTER'
    );

    INSERT INTO public.audit_logs (
        user_id,
        role,
        patient_id,
        action,
        status,
        metadata
    ) VALUES (
        auth.uid(),
        'PATIENT',
        v_patient_id,
        'REGISTER_ORGAN_DONOR',
        'ACTIVE',
        jsonb_build_object(
            'donor_id', v_donor_id,
            'consent_version', p_consent_version
        )
    );

    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        patient_id
    ) VALUES (
        auth.uid(),
        'ORGAN_DONATION_REGISTERED',
        'Organ Donation Registered',
        'Your voluntary organ donation registration has been recorded.',
        v_patient_id
    );

    RETURN v_donor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 2: update_organ_donation_preferences
CREATE OR REPLACE FUNCTION update_organ_donation_preferences(
    p_kidneys BOOLEAN,
    p_liver BOOLEAN,
    p_heart BOOLEAN,
    p_lungs BOOLEAN,
    p_pancreas BOOLEAN,
    p_intestines BOOLEAN,
    p_corneas BOOLEAN,
    p_skin BOOLEAN,
    p_bone BOOLEAN,
    p_tissues_other BOOLEAN,
    p_consent_text TEXT DEFAULT 'I voluntarily indicate my intention to donate the selected organs and tissues, subject to applicable medical, legal, and authorization requirements.',
    p_consent_version TEXT DEFAULT 'v1.0'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_patient_id UUID;
    v_donor_id UUID;
    v_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT id INTO v_patient_id
    FROM public.patient_profiles
    WHERE user_id = auth.uid();

    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Patient profile not found';
    END IF;

    SELECT id, status INTO v_donor_id, v_status
    FROM public.organ_donor_profiles
    WHERE user_id = auth.uid();

    IF v_donor_id IS NULL THEN
        RAISE EXCEPTION 'Organ donor profile not found';
    END IF;

    IF v_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Cannot update preferences: Organ donor status is not ACTIVE (status: %)', v_status;
    END IF;

    IF NOT (p_kidneys OR p_liver OR p_heart OR p_lungs OR p_pancreas OR 
            p_intestines OR p_corneas OR p_skin OR p_bone OR p_tissues_other) THEN
        RAISE EXCEPTION 'Selection required: At least one organ or tissue must be selected for donation.';
    END IF;

    UPDATE public.organ_donation_preferences
    SET
        kidneys = p_kidneys,
        liver = p_liver,
        heart = p_heart,
        lungs = p_lungs,
        pancreas = p_pancreas,
        intestines = p_intestines,
        corneas = p_corneas,
        skin = p_skin,
        bone = p_bone,
        tissues_other = p_tissues_other,
        updated_at = NOW()
    WHERE donor_profile_id = v_donor_id;

    UPDATE public.organ_donor_profiles
    SET updated_at = NOW()
    WHERE id = v_donor_id;

    INSERT INTO public.organ_donation_consents (
        donor_profile_id,
        patient_id,
        consent_version,
        consent_text,
        action
    ) VALUES (
        v_donor_id,
        v_patient_id,
        p_consent_version,
        p_consent_text,
        'UPDATE'
    );

    INSERT INTO public.audit_logs (
        user_id,
        role,
        patient_id,
        action,
        status,
        metadata
    ) VALUES (
        auth.uid(),
        'PATIENT',
        v_patient_id,
        'UPDATE_ORGAN_DONATION_PREFERENCES',
        'SUCCESS',
        jsonb_build_object('donor_id', v_donor_id)
    );

    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        patient_id
    ) VALUES (
        auth.uid(),
        'ORGAN_DONATION_UPDATED',
        'Organ Donation Preferences Updated',
        'Your organ donation preferences have been updated.',
        v_patient_id
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 3: revoke_organ_donation_consent
CREATE OR REPLACE FUNCTION revoke_organ_donation_consent(
    p_consent_text TEXT DEFAULT 'I hereby withdraw and revoke my organ donation registration.',
    p_consent_version TEXT DEFAULT 'v1.0'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_patient_id UUID;
    v_donor_id UUID;
    v_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT id INTO v_patient_id
    FROM public.patient_profiles
    WHERE user_id = auth.uid();

    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Patient profile not found';
    END IF;

    SELECT id, status INTO v_donor_id, v_status
    FROM public.organ_donor_profiles
    WHERE user_id = auth.uid();

    IF v_donor_id IS NULL THEN
        RAISE EXCEPTION 'Organ donor profile not found';
    END IF;

    IF v_status = 'REVOKED' THEN
        RAISE EXCEPTION 'Organ donation registration is already revoked';
    END IF;

    UPDATE public.organ_donor_profiles
    SET
        status = 'REVOKED',
        revoked_at = NOW(),
        updated_at = NOW()
    WHERE id = v_donor_id;

    INSERT INTO public.organ_donation_consents (
        donor_profile_id,
        patient_id,
        consent_version,
        consent_text,
        action
    ) VALUES (
        v_donor_id,
        v_patient_id,
        p_consent_version,
        p_consent_text,
        'REVOKE'
    );

    INSERT INTO public.audit_logs (
        user_id,
        role,
        patient_id,
        action,
        status,
        metadata
    ) VALUES (
        auth.uid(),
        'PATIENT',
        v_patient_id,
        'REVOKE_ORGAN_DONATION_CONSENT',
        'REVOKED',
        jsonb_build_object('donor_id', v_donor_id)
    );

    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        patient_id
    ) VALUES (
        auth.uid(),
        'ORGAN_DONATION_REVOKED',
        'Organ Donation Registration Revoked',
        'Your organ donation registration has been revoked.',
        v_patient_id
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 4: reactivate_organ_donor
CREATE OR REPLACE FUNCTION reactivate_organ_donor(
    p_kidneys BOOLEAN DEFAULT false,
    p_liver BOOLEAN DEFAULT false,
    p_heart BOOLEAN DEFAULT false,
    p_lungs BOOLEAN DEFAULT false,
    p_pancreas BOOLEAN DEFAULT false,
    p_intestines BOOLEAN DEFAULT false,
    p_corneas BOOLEAN DEFAULT false,
    p_skin BOOLEAN DEFAULT false,
    p_bone BOOLEAN DEFAULT false,
    p_tissues_other BOOLEAN DEFAULT false,
    p_consent_text TEXT DEFAULT 'I voluntarily indicate my intention to donate the selected organs and tissues, subject to applicable medical, legal, and authorization requirements.',
    p_consent_version TEXT DEFAULT 'v1.0'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_patient_id UUID;
    v_donor_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT id INTO v_patient_id
    FROM public.patient_profiles
    WHERE user_id = auth.uid();

    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Patient profile not found';
    END IF;

    IF NOT (p_kidneys OR p_liver OR p_heart OR p_lungs OR p_pancreas OR 
            p_intestines OR p_corneas OR p_skin OR p_bone OR p_tissues_other) THEN
        RAISE EXCEPTION 'Selection required: At least one organ or tissue must be selected for donation.';
    END IF;

    SELECT id INTO v_donor_id
    FROM public.organ_donor_profiles
    WHERE user_id = auth.uid();

    IF v_donor_id IS NULL THEN
        PERFORM register_organ_donor(
            p_kidneys, p_liver, p_heart, p_lungs, p_pancreas, 
            p_intestines, p_corneas, p_skin, p_bone, p_tissues_other, 
            p_consent_text, p_consent_version
        );
        RETURN true;
    END IF;

    UPDATE public.organ_donor_profiles
    SET
        status = 'ACTIVE',
        consented_at = NOW(),
        revoked_at = NULL,
        consent_version = p_consent_version,
        updated_at = NOW()
    WHERE id = v_donor_id;

    UPDATE public.organ_donation_preferences
    SET
        kidneys = p_kidneys,
        liver = p_liver,
        heart = p_heart,
        lungs = p_lungs,
        pancreas = p_pancreas,
        intestines = p_intestines,
        corneas = p_corneas,
        skin = p_skin,
        bone = p_bone,
        tissues_other = p_tissues_other,
        updated_at = NOW()
    WHERE donor_profile_id = v_donor_id;

    INSERT INTO public.organ_donation_consents (
        donor_profile_id,
        patient_id,
        consent_version,
        consent_text,
        action
    ) VALUES (
        v_donor_id,
        v_patient_id,
        p_consent_version,
        p_consent_text,
        'REGISTER'
    );

    INSERT INTO public.audit_logs (
        user_id,
        role,
        patient_id,
        action,
        status,
        metadata
    ) VALUES (
        auth.uid(),
        'PATIENT',
        v_patient_id,
        'REACTIVATE_ORGAN_DONOR',
        'ACTIVE',
        jsonb_build_object('donor_id', v_donor_id)
    );

    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        patient_id
    ) VALUES (
        auth.uid(),
        'ORGAN_DONATION_REACTIVATED',
        'Organ Donation Registration Reactivated',
        'Your organ donation registration has been reactivated.',
        v_patient_id
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 5: get_my_organ_donor_profile
CREATE OR REPLACE FUNCTION get_my_organ_donor_profile()
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_prefs RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT * INTO v_profile
    FROM public.organ_donor_profiles
    WHERE user_id = auth.uid();

    IF v_profile.id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_prefs
    FROM public.organ_donation_preferences
    WHERE donor_profile_id = v_profile.id;

    RETURN jsonb_build_object(
        'profile', to_jsonb(v_profile),
        'preferences', to_jsonb(v_prefs)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 6: get_my_organ_consent_history
CREATE OR REPLACE FUNCTION get_my_organ_consent_history()
RETURNS TABLE (
    id UUID,
    consent_version TEXT,
    consent_text TEXT,
    action TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_patient_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT id INTO v_patient_id
    FROM public.patient_profiles
    WHERE user_id = auth.uid();

    IF v_patient_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        c.id,
        c.consent_version,
        c.consent_text,
        c.action,
        c.created_at
    FROM public.organ_donation_consents c
    WHERE c.patient_id = v_patient_id
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
