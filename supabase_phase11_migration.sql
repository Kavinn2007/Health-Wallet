-- ====================================================================
-- MEDIMIND — PHASE 11: BLOOD DONATION MATCHING + BLOOD DONOR REGISTRATION
-- ====================================================================
-- This migration implements:
--  1. public.blood_donor_profiles table with RLS
--  2. public.blood_donation_requests table with RLS
--  3. Extends audit_logs constraint with blood donation actions
--  4. Extends notifications constraint with blood donation notification types
--  5. Secure PostgreSQL RPCs for registration, matching, and request lifecycles
-- ====================================================================

-- 1. Create blood_donor_profiles table
CREATE TABLE IF NOT EXISTS public.blood_donor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL UNIQUE REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
    blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    state_code TEXT NOT NULL,
    city TEXT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    last_donation_date DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blood_donor_matching 
ON public.blood_donor_profiles (blood_group, state_code, is_available);

CREATE INDEX IF NOT EXISTS idx_blood_donor_patient_id 
ON public.blood_donor_profiles (patient_id);

-- 2. Create blood_donation_requests table
CREATE TABLE IF NOT EXISTS public.blood_donation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
    donor_patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
    blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    state_code TEXT NOT NULL,
    city TEXT NULL,
    urgency TEXT NOT NULL CHECK (urgency IN ('NORMAL', 'URGENT')),
    message TEXT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED', 'EXPIRED')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_no_self_request CHECK (requester_patient_id <> donor_patient_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_blood_request 
ON public.blood_donation_requests (requester_patient_id, donor_patient_id) 
WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_blood_req_requester 
ON public.blood_donation_requests (requester_patient_id, status);

CREATE INDEX IF NOT EXISTS idx_blood_req_donor 
ON public.blood_donation_requests (donor_patient_id, status);

-- 3. Extend Audit Logs check constraint for Phase 11
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
        -- Phase 11 Actions:
        'REGISTER_BLOOD_DONOR',
        'UPDATE_BLOOD_DONOR_PROFILE',
        'SEARCH_BLOOD_DONORS',
        'CREATE_BLOOD_DONATION_REQUEST',
        'ACCEPT_BLOOD_DONATION_REQUEST',
        'DECLINE_BLOOD_DONATION_REQUEST',
        'CANCEL_BLOOD_DONATION_REQUEST'
    )
);

-- 4. Extend Notifications check constraint for Phase 11
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
        -- Phase 11 Types:
        'BLOOD_DONATION_REQUEST',
        'BLOOD_DONATION_ACCEPTED',
        'BLOOD_DONATION_DECLINED',
        'BLOOD_DONATION_CANCELLED'
    )
);

-- 5. Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_phase11_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_blood_donor_profiles_timestamp ON public.blood_donor_profiles;
CREATE TRIGGER trigger_update_blood_donor_profiles_timestamp
    BEFORE UPDATE ON public.blood_donor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_phase11_timestamp();

DROP TRIGGER IF EXISTS trigger_update_blood_donation_requests_timestamp ON public.blood_donation_requests;
CREATE TRIGGER trigger_update_blood_donation_requests_timestamp
    BEFORE UPDATE ON public.blood_donation_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_phase11_timestamp();

-- 6. Row Level Security Policies
ALTER TABLE public.blood_donor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_donation_requests ENABLE ROW LEVEL SECURITY;

-- blood_donor_profiles:
DROP POLICY IF EXISTS "Users can view own donor profile" ON public.blood_donor_profiles;
CREATE POLICY "Users can view own donor profile"
ON public.blood_donor_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can search available donors" ON public.blood_donor_profiles;
CREATE POLICY "Authenticated users can search available donors"
ON public.blood_donor_profiles FOR SELECT
TO authenticated
USING (is_available = true);

DROP POLICY IF EXISTS "Users can create own donor profile" ON public.blood_donor_profiles;
CREATE POLICY "Users can create own donor profile"
ON public.blood_donor_profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own donor profile" ON public.blood_donor_profiles;
CREATE POLICY "Users can update own donor profile"
ON public.blood_donor_profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- blood_donation_requests:
DROP POLICY IF EXISTS "Users can view own sent or received requests" ON public.blood_donation_requests;
CREATE POLICY "Users can view own sent or received requests"
ON public.blood_donation_requests FOR SELECT
TO authenticated
USING (
    requester_patient_id IN (SELECT id FROM public.patient_profiles WHERE user_id = auth.uid())
    OR
    donor_patient_id IN (SELECT id FROM public.patient_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Requesters can create donation requests" ON public.blood_donation_requests;
CREATE POLICY "Requesters can create donation requests"
ON public.blood_donation_requests FOR INSERT
TO authenticated
WITH CHECK (
    requester_patient_id IN (SELECT id FROM public.patient_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Parties can update their permitted request fields" ON public.blood_donation_requests;
CREATE POLICY "Parties can update their permitted request fields"
ON public.blood_donation_requests FOR UPDATE
TO authenticated
USING (
    requester_patient_id IN (SELECT id FROM public.patient_profiles WHERE user_id = auth.uid())
    OR
    donor_patient_id IN (SELECT id FROM public.patient_profiles WHERE user_id = auth.uid())
);

-- ====================================================================
-- 7. SECURE POSTGRESQL RPCS
-- ====================================================================

-- Helper: Get patient_id for authenticated caller
CREATE OR REPLACE FUNCTION get_authenticated_patient_id()
RETURNS UUID AS $$
DECLARE
    v_patient_id UUID;
BEGIN
    SELECT id INTO v_patient_id
    FROM public.patient_profiles
    WHERE user_id = auth.uid();
    RETURN v_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 1: register_blood_donor
CREATE OR REPLACE FUNCTION register_blood_donor(
    p_blood_group TEXT,
    p_state_code TEXT,
    p_city TEXT DEFAULT NULL,
    p_is_available BOOLEAN DEFAULT true,
    p_last_donation_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_patient_id UUID;
    v_donor_id UUID;
BEGIN
    -- Verify caller authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Derive patient profile id
    v_patient_id := get_authenticated_patient_id();
    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Active patient profile not found for authenticated user';
    END IF;

    -- Validate blood group
    IF p_blood_group NOT IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') THEN
        RAISE EXCEPTION 'Invalid blood group: %', p_blood_group;
    END IF;

    IF p_state_code IS NULL OR length(trim(p_state_code)) < 2 THEN
        RAISE EXCEPTION 'State code is required';
    END IF;

    -- Insert or update donor profile
    INSERT INTO public.blood_donor_profiles (
        user_id,
        patient_id,
        blood_group,
        state_code,
        city,
        is_available,
        last_donation_date
    ) VALUES (
        auth.uid(),
        v_patient_id,
        p_blood_group,
        p_state_code,
        p_city,
        p_is_available,
        p_last_donation_date
    )
    ON CONFLICT (user_id) DO UPDATE SET
        blood_group = EXCLUDED.blood_group,
        state_code = EXCLUDED.state_code,
        city = EXCLUDED.city,
        is_available = EXCLUDED.is_available,
        last_donation_date = EXCLUDED.last_donation_date,
        updated_at = NOW()
    RETURNING id INTO v_donor_id;

    -- Audit log
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
        'REGISTER_BLOOD_DONOR',
        'SUCCESS',
        jsonb_build_object(
            'donor_id', v_donor_id,
            'blood_group', p_blood_group,
            'state_code', p_state_code,
            'is_available', p_is_available
        )
    );

    RETURN v_donor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 2: update_blood_donor_profile
CREATE OR REPLACE FUNCTION update_blood_donor_profile(
    p_blood_group TEXT,
    p_state_code TEXT,
    p_city TEXT DEFAULT NULL,
    p_is_available BOOLEAN DEFAULT true,
    p_last_donation_date DATE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_patient_id UUID;
    v_donor_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    v_patient_id := get_authenticated_patient_id();
    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Active patient profile not found';
    END IF;

    IF p_blood_group NOT IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') THEN
        RAISE EXCEPTION 'Invalid blood group: %', p_blood_group;
    END IF;

    UPDATE public.blood_donor_profiles
    SET
        blood_group = p_blood_group,
        state_code = p_state_code,
        city = p_city,
        is_available = p_is_available,
        last_donation_date = p_last_donation_date,
        updated_at = NOW()
    WHERE user_id = auth.uid()
    RETURNING id INTO v_donor_id;

    IF v_donor_id IS NULL THEN
        RAISE EXCEPTION 'Donor profile does not exist to update';
    END IF;

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
        'UPDATE_BLOOD_DONOR_PROFILE',
        'SUCCESS',
        jsonb_build_object('donor_id', v_donor_id, 'is_available', p_is_available)
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 3: search_compatible_blood_donors
-- Deterministically matches donors whose blood group is compatible for a recipient needing p_required_blood_group.
-- Exposes ONLY: id, patient_id, blood_group, state_code, city, is_available, last_donation_date.
-- Strictly NO phone numbers, NO Aadhaar, NO medical records.
CREATE OR REPLACE FUNCTION search_compatible_blood_donors(
    p_required_blood_group TEXT,
    p_state_code TEXT,
    p_city TEXT DEFAULT NULL,
    p_availability_only BOOLEAN DEFAULT true
)
RETURNS TABLE (
    id UUID,
    patient_id UUID,
    blood_group TEXT,
    state_code TEXT,
    city TEXT,
    is_available BOOLEAN,
    last_donation_date DATE
) AS $$
DECLARE
    v_caller_patient_id UUID;
    v_compatible_donors TEXT[];
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    v_caller_patient_id := get_authenticated_patient_id();

    -- Determine compatible donor blood groups based on recipient requirements:
    CASE p_required_blood_group
        WHEN 'O-' THEN
            v_compatible_donors := ARRAY['O-'];
        WHEN 'O+' THEN
            v_compatible_donors := ARRAY['O-', 'O+'];
        WHEN 'A-' THEN
            v_compatible_donors := ARRAY['O-', 'A-'];
        WHEN 'A+' THEN
            v_compatible_donors := ARRAY['O-', 'O+', 'A-', 'A+'];
        WHEN 'B-' THEN
            v_compatible_donors := ARRAY['O-', 'B-'];
        WHEN 'B+' THEN
            v_compatible_donors := ARRAY['O-', 'O+', 'B-', 'B+'];
        WHEN 'AB-' THEN
            v_compatible_donors := ARRAY['O-', 'A-', 'B-', 'AB-'];
        WHEN 'AB+' THEN
            v_compatible_donors := ARRAY['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
        ELSE
            RAISE EXCEPTION 'Invalid required blood group: %', p_required_blood_group;
    END CASE;

    RETURN QUERY
    SELECT
        bdp.id,
        bdp.patient_id,
        bdp.blood_group,
        bdp.state_code,
        bdp.city,
        bdp.is_available,
        bdp.last_donation_date
    FROM public.blood_donor_profiles bdp
    WHERE bdp.blood_group = ANY(v_compatible_donors)
      AND LOWER(bdp.state_code) = LOWER(p_state_code)
      AND (p_city IS NULL OR p_city = '' OR LOWER(bdp.city) = LOWER(p_city))
      AND (NOT p_availability_only OR bdp.is_available = true)
      AND (v_caller_patient_id IS NULL OR bdp.patient_id <> v_caller_patient_id)
    ORDER BY bdp.is_available DESC, bdp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 4: create_blood_donation_request
CREATE OR REPLACE FUNCTION create_blood_donation_request(
    p_donor_patient_id UUID,
    p_blood_group TEXT,
    p_state_code TEXT,
    p_city TEXT DEFAULT NULL,
    p_urgency TEXT DEFAULT 'NORMAL',
    p_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_requester_patient_id UUID;
    v_donor_user_id UUID;
    v_request_id UUID;
    v_existing_pending_count INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    v_requester_patient_id := get_authenticated_patient_id();
    IF v_requester_patient_id IS NULL THEN
        RAISE EXCEPTION 'Requester patient profile not found';
    END IF;

    IF v_requester_patient_id = p_donor_patient_id THEN
        RAISE EXCEPTION 'Self-request blocked: Cannot request blood donation from yourself';
    END IF;

    IF p_urgency NOT IN ('NORMAL', 'URGENT') THEN
        RAISE EXCEPTION 'Invalid urgency level: %', p_urgency;
    END IF;

    -- Look up donor user_id
    SELECT user_id INTO v_donor_user_id
    FROM public.blood_donor_profiles
    WHERE patient_id = p_donor_patient_id;

    IF v_donor_user_id IS NULL THEN
        RAISE EXCEPTION 'Donor profile not found or inactive';
    END IF;

    -- Check duplicate pending request
    SELECT count(*) INTO v_existing_pending_count
    FROM public.blood_donation_requests
    WHERE requester_patient_id = v_requester_patient_id
      AND donor_patient_id = p_donor_patient_id
      AND status = 'PENDING';

    IF v_existing_pending_count > 0 THEN
        RAISE EXCEPTION 'Duplicate request blocked: An active pending request already exists for this donor';
    END IF;

    INSERT INTO public.blood_donation_requests (
        requester_patient_id,
        donor_patient_id,
        blood_group,
        state_code,
        city,
        urgency,
        message,
        status,
        requested_at
    ) VALUES (
        v_requester_patient_id,
        p_donor_patient_id,
        p_blood_group,
        p_state_code,
        p_city,
        p_urgency,
        p_message,
        'PENDING',
        NOW()
    )
    RETURNING id INTO v_request_id;

    -- Audit log
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
        v_requester_patient_id,
        'CREATE_BLOOD_DONATION_REQUEST',
        'PENDING',
        jsonb_build_object(
            'request_id', v_request_id,
            'donor_patient_id', p_donor_patient_id,
            'blood_group', p_blood_group,
            'urgency', p_urgency
        )
    );

    -- Notify donor
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        patient_id,
        related_request_id
    ) VALUES (
        v_donor_user_id,
        'BLOOD_DONATION_REQUEST',
        'Blood Donation Request',
        'Someone has requested a blood donation matching your registered blood group and location.',
        p_donor_patient_id,
        v_request_id
    );

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 5: accept_blood_donation_request
CREATE OR REPLACE FUNCTION accept_blood_donation_request(p_request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_donor_patient_id UUID;
    v_requester_user_id UUID;
    v_requester_patient_id UUID;
    v_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    v_donor_patient_id := get_authenticated_patient_id();
    IF v_donor_patient_id IS NULL THEN
        RAISE EXCEPTION 'Donor profile not found';
    END IF;

    SELECT status, requester_patient_id INTO v_status, v_requester_patient_id
    FROM public.blood_donation_requests
    WHERE id = p_request_id AND donor_patient_id = v_donor_patient_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Request not found or access denied';
    END IF;

    IF v_status <> 'PENDING' THEN
        RAISE EXCEPTION 'Invalid state transition: Cannot accept request with status %', v_status;
    END IF;

    SELECT user_id INTO v_requester_user_id
    FROM public.patient_profiles
    WHERE id = v_requester_patient_id;

    UPDATE public.blood_donation_requests
    SET
        status = 'ACCEPTED',
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    -- Audit log
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
        v_donor_patient_id,
        'ACCEPT_BLOOD_DONATION_REQUEST',
        'ACCEPTED',
        jsonb_build_object('request_id', p_request_id)
    );

    -- Notify requester
    IF v_requester_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            patient_id,
            related_request_id
        ) VALUES (
            v_requester_user_id,
            'BLOOD_DONATION_ACCEPTED',
            'Blood Donation Request Accepted',
            'A voluntary donor has accepted your blood donation request.',
            v_requester_patient_id,
            p_request_id
        );
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 6: decline_blood_donation_request
CREATE OR REPLACE FUNCTION decline_blood_donation_request(p_request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_donor_patient_id UUID;
    v_requester_user_id UUID;
    v_requester_patient_id UUID;
    v_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    v_donor_patient_id := get_authenticated_patient_id();
    IF v_donor_patient_id IS NULL THEN
        RAISE EXCEPTION 'Donor profile not found';
    END IF;

    SELECT status, requester_patient_id INTO v_status, v_requester_patient_id
    FROM public.blood_donation_requests
    WHERE id = p_request_id AND donor_patient_id = v_donor_patient_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Request not found or access denied';
    END IF;

    IF v_status <> 'PENDING' THEN
        RAISE EXCEPTION 'Invalid state transition: Cannot decline request with status %', v_status;
    END IF;

    SELECT user_id INTO v_requester_user_id
    FROM public.patient_profiles
    WHERE id = v_requester_patient_id;

    UPDATE public.blood_donation_requests
    SET
        status = 'DECLINED',
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    -- Audit log
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
        v_donor_patient_id,
        'DECLINE_BLOOD_DONATION_REQUEST',
        'DECLINED',
        jsonb_build_object('request_id', p_request_id)
    );

    -- Notify requester
    IF v_requester_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            patient_id,
            related_request_id
        ) VALUES (
            v_requester_user_id,
            'BLOOD_DONATION_DECLINED',
            'Blood Donation Request Declined',
            'A voluntary donor could not accept your blood donation request at this time.',
            v_requester_patient_id,
            p_request_id
        );
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC 7: cancel_blood_donation_request
CREATE OR REPLACE FUNCTION cancel_blood_donation_request(p_request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_requester_patient_id UUID;
    v_donor_patient_id UUID;
    v_donor_user_id UUID;
    v_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    v_requester_patient_id := get_authenticated_patient_id();
    IF v_requester_patient_id IS NULL THEN
        RAISE EXCEPTION 'Requester patient profile not found';
    END IF;

    SELECT status, donor_patient_id INTO v_status, v_donor_patient_id
    FROM public.blood_donation_requests
    WHERE id = p_request_id AND requester_patient_id = v_requester_patient_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Request not found or caller is not the requester';
    END IF;

    IF v_status <> 'PENDING' THEN
        RAISE EXCEPTION 'Invalid state transition: Cannot cancel request with status %', v_status;
    END IF;

    SELECT user_id INTO v_donor_user_id
    FROM public.blood_donor_profiles
    WHERE patient_id = v_donor_patient_id;

    UPDATE public.blood_donation_requests
    SET
        status = 'CANCELLED',
        responded_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    -- Audit log
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
        v_requester_patient_id,
        'CANCEL_BLOOD_DONATION_REQUEST',
        'CANCELLED',
        jsonb_build_object('request_id', p_request_id)
    );

    -- Notify donor
    IF v_donor_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            patient_id,
            related_request_id
        ) VALUES (
            v_donor_user_id,
            'BLOOD_DONATION_CANCELLED',
            'Blood Donation Request Cancelled',
            'A blood donation request sent to you was cancelled by the requester.',
            v_donor_patient_id,
            p_request_id
        );
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
