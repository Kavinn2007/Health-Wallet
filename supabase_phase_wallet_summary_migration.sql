-- ====================================================================
-- MEDIMIND — UNIFIED HEALTH WALLET SUMMARY MIGRATION
-- ====================================================================
-- Secure server-side aggregation layer consolidating patient records,
-- health overview, appointments, donation status, and recent activity.
-- ====================================================================

-- 1. EXTEND PATIENT PROFILES SCHEMA (IF NEEDED)
-- Add allergies and critical_conditions columns if not already present
ALTER TABLE public.patient_profiles 
ADD COLUMN IF NOT EXISTS allergies TEXT DEFAULT 'None';

ALTER TABLE public.patient_profiles 
ADD COLUMN IF NOT EXISTS critical_conditions TEXT DEFAULT 'None';

-- 2. EXTEND AUDIT LOGS CHECK CONSTRAINT
-- Include VIEW_WALLET_SUMMARY action
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS chk_audit_action;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (
  action IN (
    'VIEW_MEDICAL_RECORD',
    'CREATE_CONSULTATION',
    'CREATE_DIAGNOSIS',
    'CREATE_TREATMENT',
    'CREATE_PRESCRIPTION',
    'REQUEST_ACCESS',
    'GRANT_CONSENT',
    'DENY_CONSENT',
    'REVOKE_CONSENT',
    'EXPIRED_CONSENT',
    'REGISTER_BLOOD_DONOR',
    'UPDATE_BLOOD_DONOR',
    'REQUEST_BLOOD_DONATION',
    'ACCEPT_BLOOD_DONATION',
    'DECLINE_BLOOD_DONATION',
    'CANCEL_BLOOD_DONATION',
    'REGISTER_ORGAN_DONOR',
    'UPDATE_ORGAN_DONATION_PREFERENCES',
    'REVOKE_ORGAN_DONATION_CONSENT',
    'REACTIVATE_ORGAN_DONOR',
    'ACCESS_REQUEST_CREATED',
    'ACCESS_REQUEST_APPROVED',
    'ACCESS_REQUEST_DENIED',
    'CONSENT_REVOKED',
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
    'APPOINTMENT_BOOKED',
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT_CANCELLED',
    'APPOINTMENT_RESCHEDULED',
    'APPOINTMENT_COMPLETED',
    'APPOINTMENT_EXPIRED',
    'VIEW_WALLET_SUMMARY'
  )
);

-- --------------------------------------------------------------------
-- 3. SECURE RPC: get_wallet_summary()
-- Consolidated patient overview deriving identity strictly from auth.uid()
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_wallet_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_patient public.patient_profiles%ROWTYPE;
  v_identity JSONB;
  v_health_overview JSONB;
  v_medical_activity JSONB;
  v_appointments JSONB;
  v_donation_status JSONB;
  v_recent_activity JSONB;
  v_active_meds_count INT;
  v_blood_donor_record RECORD;
  v_organ_donor_record RECORD;
  v_organ_preferences JSONB;
BEGIN
  -- 1. Verify caller authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: caller identity could not be verified.';
  END IF;

  -- 2. Resolve authenticated patient profile (strictly prevents IDOR / cross-patient access)
  SELECT * INTO v_patient
  FROM public.patient_profiles
  WHERE user_id = v_user_id;

  IF v_patient.id IS NULL THEN
    RAISE EXCEPTION 'Access denied: caller does not have an associated patient profile.';
  END IF;

  -- 3. Identity (Explicitly excludes full Aadhaar, Aadhaar hash, and sensitive identifiers)
  v_identity := jsonb_build_object(
    'patient_id', v_patient.id,
    'patient_name', v_patient.patient_name,
    'health_wallet_id', v_patient.health_wallet_id,
    'blood_group', v_patient.blood_group,
    'gender', v_patient.gender,
    'state', v_patient.state,
    'state_code', v_patient.state_code
  );

  -- 4. Active Medications Count & Active Meds List
  SELECT COUNT(*) INTO v_active_meds_count
  FROM public.prescriptions
  WHERE patient_id = v_patient.id AND status = 'ACTIVE';

  -- 5. Health Overview
  SELECT jsonb_build_object(
    'allergies', COALESCE(NULLIF(v_patient.allergies, ''), 'None'),
    'critical_conditions', COALESCE(NULLIF(v_patient.critical_conditions, ''), 'None'),
    'current_medication_count', v_active_meds_count,
    'current_medications', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'medicine_name', p.medicine_name,
            'dosage', p.dosage,
            'frequency', p.frequency,
            'duration', p.duration,
            'prescribed_date', p.prescribed_date,
            'status', p.status
          ) ORDER BY p.prescribed_date DESC, p.created_at DESC
        )
        FROM (
          SELECT * FROM public.prescriptions
          WHERE patient_id = v_patient.id AND status = 'ACTIVE'
          ORDER BY prescribed_date DESC, created_at DESC
          LIMIT 10
        ) p
      ),
      '[]'::jsonb
    )
  ) INTO v_health_overview;

  -- 6. Medical Activity (Recent items with reasonable limits to prevent performance bottlenecks)
  v_medical_activity := jsonb_build_object(
    'recent_consultations', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'consultation_date', c.consultation_date,
            'doctor_name', c.doctor_name,
            'hospital_clinic', c.hospital_clinic,
            'chief_complaint', c.chief_complaint,
            'diagnosis', c.diagnosis,
            'treatment', c.treatment,
            'follow_up_date', c.follow_up_date
          ) ORDER BY c.consultation_date DESC, c.created_at DESC
        )
        FROM (
          SELECT * FROM public.consultations
          WHERE patient_id = v_patient.id
          ORDER BY consultation_date DESC, created_at DESC
          LIMIT 5
        ) c
      ),
      '[]'::jsonb
    ),
    'recent_diagnoses', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', d.id,
            'diagnosis_name', d.diagnosis_name,
            'diagnosis_date', d.diagnosis_date,
            'provider', d.provider,
            'notes', d.notes
          ) ORDER BY d.diagnosis_date DESC, d.created_at DESC
        )
        FROM (
          SELECT * FROM public.diagnoses
          WHERE patient_id = v_patient.id
          ORDER BY diagnosis_date DESC, created_at DESC
          LIMIT 5
        ) d
      ),
      '[]'::jsonb
    ),
    'recent_treatments', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', t.id,
            'treatment_name', t.treatment_name,
            'treatment_date', t.treatment_date,
            'provider', t.provider,
            'notes', t.notes
          ) ORDER BY t.treatment_date DESC, t.created_at DESC
        )
        FROM (
          SELECT * FROM public.treatments
          WHERE patient_id = v_patient.id
          ORDER BY treatment_date DESC, created_at DESC
          LIMIT 5
        ) t
      ),
      '[]'::jsonb
    ),
    'recent_prescriptions', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pr.id,
            'medicine_name', pr.medicine_name,
            'dosage', pr.dosage,
            'frequency', pr.frequency,
            'duration', pr.duration,
            'prescribed_date', pr.prescribed_date,
            'status', pr.status
          ) ORDER BY pr.prescribed_date DESC, pr.created_at DESC
        )
        FROM (
          SELECT * FROM public.prescriptions
          WHERE patient_id = v_patient.id
          ORDER BY prescribed_date DESC, created_at DESC
          LIMIT 5
        ) pr
      ),
      '[]'::jsonb
    ),
    'recent_lab_reports', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', l.id,
            'test_name', l.test_name,
            'test_date', l.test_date,
            'lab_name', l.lab_name,
            'result', l.result,
            'unit', l.unit,
            'reference_range', l.reference_range
          ) ORDER BY l.test_date DESC, l.created_at DESC
        )
        FROM (
          SELECT * FROM public.lab_reports
          WHERE patient_id = v_patient.id
          ORDER BY test_date DESC, created_at DESC
          LIMIT 5
        ) l
      ),
      '[]'::jsonb
    ),
    'recent_medical_records', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'record_type', m.record_type,
            'title', m.title,
            'description', m.description,
            'record_date', m.record_date,
            'provider_name', m.provider_name,
            'hospital_name', m.hospital_name
          ) ORDER BY m.record_date DESC, m.created_at DESC
        )
        FROM (
          SELECT * FROM public.medical_records
          WHERE patient_id = v_patient.id
          ORDER BY record_date DESC, created_at DESC
          LIMIT 5
        ) m
      ),
      '[]'::jsonb
    )
  );

  -- 7. Appointments (Upcoming, Pending, Recent Completed)
  v_appointments := jsonb_build_object(
    'upcoming', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'doctor_id', a.doctor_id,
            'appointment_type', a.appointment_type,
            'slot_start', a.slot_start,
            'slot_end', a.slot_end,
            'status', a.status,
            'appointment_reason', a.appointment_reason,
            'doctor_name', d.doctor_name,
            'specialization', d.specialization,
            'hospital_name', d.hospital_name
          ) ORDER BY a.slot_start ASC
        )
        FROM (
          SELECT app.*, doc.doctor_name, doc.specialization, doc.hospital_name
          FROM public.appointments app
          JOIN public.doctor_profiles doc ON doc.id = app.doctor_id
          WHERE app.patient_id = v_patient.id 
            AND app.status = 'CONFIRMED'
            AND app.slot_start >= now()
          ORDER BY app.slot_start ASC
          LIMIT 5
        ) a
      ),
      '[]'::jsonb
    ),
    'pending', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'doctor_id', a.doctor_id,
            'appointment_type', a.appointment_type,
            'slot_start', a.slot_start,
            'slot_end', a.slot_end,
            'status', a.status,
            'appointment_reason', a.appointment_reason,
            'doctor_name', d.doctor_name,
            'specialization', d.specialization,
            'hospital_name', d.hospital_name
          ) ORDER BY a.slot_start ASC
        )
        FROM (
          SELECT app.*, doc.doctor_name, doc.specialization, doc.hospital_name
          FROM public.appointments app
          JOIN public.doctor_profiles doc ON doc.id = app.doctor_id
          WHERE app.patient_id = v_patient.id 
            AND app.status = 'PENDING'
            AND app.slot_start >= now()
          ORDER BY app.slot_start ASC
          LIMIT 5
        ) a
      ),
      '[]'::jsonb
    ),
    'recent_completed', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'doctor_id', a.doctor_id,
            'appointment_type', a.appointment_type,
            'slot_start', a.slot_start,
            'slot_end', a.slot_end,
            'status', a.status,
            'appointment_reason', a.appointment_reason,
            'completed_at', a.completed_at,
            'doctor_name', d.doctor_name,
            'specialization', d.specialization,
            'hospital_name', d.hospital_name
          ) ORDER BY a.slot_start DESC
        )
        FROM (
          SELECT app.*, doc.doctor_name, doc.specialization, doc.hospital_name
          FROM public.appointments app
          JOIN public.doctor_profiles doc ON doc.id = app.doctor_id
          WHERE app.patient_id = v_patient.id 
            AND app.status = 'COMPLETED'
          ORDER BY app.slot_start DESC
          LIMIT 5
        ) a
      ),
      '[]'::jsonb
    )
  );

  -- 8. Blood Donation Status
  SELECT * INTO v_blood_donor_record
  FROM public.blood_donor_profiles
  WHERE patient_id = v_patient.id
  LIMIT 1;

  -- 9. Organ Donation Status
  SELECT * INTO v_organ_donor_record
  FROM public.organ_donor_profiles
  WHERE patient_id = v_patient.id
  LIMIT 1;

  IF v_organ_donor_record.id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'kidneys', op.kidneys,
      'liver', op.liver,
      'heart', op.heart,
      'lungs', op.lungs,
      'pancreas', op.pancreas,
      'intestines', op.intestines,
      'corneas', op.corneas,
      'skin', op.skin,
      'bone', op.bone,
      'tissues_other', op.tissues_other
    ) INTO v_organ_preferences
    FROM public.organ_donation_preferences op
    WHERE op.donor_profile_id = v_organ_donor_record.id;
  ELSE
    v_organ_preferences := NULL;
  END IF;

  v_donation_status := jsonb_build_object(
    'blood_donor', CASE 
      WHEN v_blood_donor_record.id IS NOT NULL THEN jsonb_build_object(
        'is_registered', true,
        'status', CASE WHEN v_blood_donor_record.is_available THEN 'AVAILABLE' ELSE 'UNAVAILABLE' END,
        'blood_group', v_blood_donor_record.blood_group,
        'state_code', v_blood_donor_record.state_code,
        'city', v_blood_donor_record.city,
        'last_donation_date', v_blood_donor_record.last_donation_date
      )
      ELSE jsonb_build_object(
        'is_registered', false,
        'status', 'NOT_REGISTERED'
      )
    END,
    'organ_donor', CASE
      WHEN v_organ_donor_record.id IS NOT NULL THEN jsonb_build_object(
        'is_registered', true,
        'status', v_organ_donor_record.status,
        'consented_at', v_organ_donor_record.consented_at,
        'preferences', COALESCE(v_organ_preferences, '{}'::jsonb)
      )
      ELSE jsonb_build_object(
        'is_registered', false,
        'status', 'NOT_REGISTERED'
      )
    END
  );

  -- 10. Recent Activity (Authorized for patient, latest 5 logs)
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', al.id,
          'action', al.action,
          'role', al.role,
          'status', al.status,
          'created_at', al.created_at
        ) ORDER BY al.created_at DESC
      )
      FROM (
        SELECT * FROM public.audit_logs
        WHERE patient_id = v_patient.id OR (user_id = v_user_id AND role = 'PATIENT')
        ORDER BY created_at DESC
        LIMIT 5
      ) al
    ),
    '[]'::jsonb
  ) INTO v_recent_activity;

  -- 11. Record immutable audit log for viewing wallet summary
  INSERT INTO public.audit_logs (
    user_id,
    role,
    patient_id,
    action,
    status,
    metadata
  ) VALUES (
    v_user_id,
    'PATIENT',
    v_patient.id,
    'VIEW_WALLET_SUMMARY',
    'SUCCESS',
    jsonb_build_object('timestamp', now())
  );

  -- 12. Return Consolidated Summary Object
  RETURN jsonb_build_object(
    'identity', v_identity,
    'health_overview', v_health_overview,
    'medical_activity', v_medical_activity,
    'appointments', v_appointments,
    'donation_status', v_donation_status,
    'recent_activity', v_recent_activity
  );
END;
$$;

-- 4. GRANT EXECUTE ON RPC TO AUTHENTICATED USERS
REVOKE ALL ON FUNCTION public.get_wallet_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wallet_summary() TO authenticated;
