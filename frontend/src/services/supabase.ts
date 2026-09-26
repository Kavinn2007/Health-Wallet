import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface PatientProfile {
  id: string;
  user_id: string;
  health_wallet_id: string;
  patient_name: string;
  mobile_number: string;
  aadhaar_hash: string;
  aadhaar_last_four: string;
  blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  state: string;
  state_code: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface PatientRegistrationInput {
  patientName: string;
  mobileNumber: string;
  aadhaarNumber: string;
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  stateName: string;
  username: string;
  password: string;
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  doctor_name: string;
  registration_number: string;
  specialization: string;
  hospital_name: string;
  mobile_number: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface DoctorRegistrationInput {
  doctorName: string;
  registrationNumber: string;
  specialization: string;
  hospitalName: string;
  mobileNumber: string;
  username: string;
  password: string;
}

export interface LabProfile {
  id: string;
  user_id: string;
  lab_name: string;
  registration_number: string;
  laboratory_name: string;
  mobile_number: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface LabRegistrationInput {
  labName: string;
  registrationNumber: string;
  laboratoryName: string;
  mobileNumber: string;
  username: string;
  password: string;
}

export interface PharmacyProfile {
  id: string;
  user_id: string;
  pharmacist_name: string;
  registration_number: string;
  pharmacy_name: string;
  mobile_number: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface PharmacyRegistrationInput {
  pharmacistName: string;
  registrationNumber: string;
  pharmacyName: string;
  mobileNumber: string;
  username: string;
  password: string;
}

export type PharmacyShareStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'REVOKED'
  | 'EXPIRED'
  | 'FULFILLED'
  | 'CANCELLED';

export interface PharmacyPrescriptionShare {
  id: string;
  patient_id: string;
  prescription_id: string;
  pharmacy_id?: string | null;
  status: PharmacyShareStatus;
  shared_at: string;
  expires_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
  updated_at: string;
  pharmacy?: PharmacyProfile;
}

export type DispensingStatus =
  | 'DISPENSED'
  | 'PARTIALLY_DISPENSED'
  | 'NOT_DISPENSED'
  | 'CANCELLED';

export interface PrescriptionDispensingRecord {
  id: string;
  prescription_id: string;
  patient_id: string;
  pharmacy_id: string;
  dispensed_by_user_id: string;
  dispensed_at: string;
  status: DispensingStatus;
  quantity_dispensed?: string | null;
  notes?: string | null;
  created_at: string;
  pharmacy?: PharmacyProfile;
}

export interface MinimalPatientInfo {
  id: string;
  patient_name: string;
  health_wallet_id: string;
  blood_group: string;
  state: string;
}

export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED' | 'EXPIRED';

export type RecordCategory =
  | 'CONSULTATIONS'
  | 'DIAGNOSES'
  | 'TREATMENTS'
  | 'PRESCRIPTIONS'
  | 'LAB_REPORTS'
  | 'IMAGING'
  | 'ALL_RECORDS';

export interface AccessRequest {
  id: string;
  patient_id: string;
  requester_user_id: string;
  doctor_profile_id?: string;
  requester_role: 'DOCTOR';
  requested_record_types: RecordCategory[];
  reason: string;
  status: AccessRequestStatus;
  duration_hours: number;
  requested_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  patient?: MinimalPatientInfo;
  doctor?: DoctorProfile;
}

export type ConsentStatus = 'APPROVED' | 'DENIED' | 'REVOKED' | 'EXPIRED';

export interface Consent {
  id: string;
  access_request_id: string;
  patient_id: string;
  doctor_user_id: string;
  doctor_profile_id?: string;
  approved_record_types: RecordCategory[];
  status: ConsentStatus;
  approved_at?: string;
  expires_at: string;
  revoked_at?: string;
  denied_at?: string;
  denial_reason?: string;
  created_at: string;
  updated_at: string;
  doctor?: DoctorProfile;
  patient?: MinimalPatientInfo;
}

export const DOCTOR_SPECIALIZATIONS = [
  'General Medicine',
  'Internal Medicine',
  'Cardiology',
  'Pediatrics',
  'Orthopedics',
  'Neurology',
  'Dermatology',
  'Obstetrics & Gynecology',
  'Oncology',
  'ENT (Otolaryngology)',
  'Ophthalmology',
  'Pulmonology',
  'Gastroenterology',
  'Endocrinology',
  'Psychiatry',
  'General Surgery',
  'Emergency Medicine',
] as const;

export const INDIAN_STATES: { name: string; code: string }[] = [
  { name: 'Andhra Pradesh', code: 'AP' },
  { name: 'Arunachal Pradesh', code: 'AR' },
  { name: 'Assam', code: 'AS' },
  { name: 'Bihar', code: 'BR' },
  { name: 'Chhattisgarh', code: 'CG' },
  { name: 'Goa', code: 'GA' },
  { name: 'Gujarat', code: 'GJ' },
  { name: 'Haryana', code: 'HR' },
  { name: 'Himachal Pradesh', code: 'HP' },
  { name: 'Jharkhand', code: 'JH' },
  { name: 'Karnataka', code: 'KA' },
  { name: 'Kerala', code: 'KL' },
  { name: 'Madhya Pradesh', code: 'MP' },
  { name: 'Maharashtra', code: 'MH' },
  { name: 'Manipur', code: 'MN' },
  { name: 'Meghalaya', code: 'ML' },
  { name: 'Mizoram', code: 'MZ' },
  { name: 'Nagaland', code: 'NL' },
  { name: 'Odisha', code: 'OD' },
  { name: 'Punjab', code: 'PB' },
  { name: 'Rajasthan', code: 'RJ' },
  { name: 'Sikkim', code: 'SK' },
  { name: 'Tamil Nadu', code: 'TN' },
  { name: 'Telangana', code: 'TS' },
  { name: 'Tripura', code: 'TR' },
  { name: 'Uttar Pradesh', code: 'UP' },
  { name: 'Uttarakhand', code: 'UK' },
  { name: 'West Bengal', code: 'WB' },
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;

// Read Environment Variables safely
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  !rawUrl.includes('your-project') &&
  !rawKey.includes('your-anon')
);

// Fallback dummy client if credentials are not yet entered to prevent application runtime crashes
const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder-project.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawKey : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Standard Web Crypto SHA-256 for non-reversible Aadhaar Hash
 */
export async function hashAadhaarNumber(aadhaar: string): Promise<string> {
  const clean = aadhaar.replace(/\D/g, '');
  const msgUint8 = new TextEncoder().encode(`health_wallet_salt_${clean}`);
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : (globalThis as any).crypto;
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b: number) => b.toString(16).padStart(2, '0')).join('');
}
