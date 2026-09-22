export type StakeholderRole = 'patient' | 'doctor' | 'hospital' | 'lab' | 'pharmacy' | 'emergency';

export type RecordCategory = 
  | 'diagnostic' 
  | 'prescription' 
  | 'discharge_summary' 
  | 'vaccination' 
  | 'sensitive_mental_health'
  | 'sensitive_genetic';

export type VerificationStatus = 
  | 'verified_by_provider' 
  | 'patient_uploaded_unverified' 
  | 'pending_review';

export interface PatientProfile {
  id: string; // Public Safe Health Wallet ID: HW-IN-2026-8834-9120
  fullName: string;
  dob: string;
  age: number;
  gender: string;
  bloodGroup: string;
  maskedAadhaar: string; // e.g. "XXXX-XXXX-4192" - never used as public ID
  abhaAddress: string; // e.g. "aarav.sharma@abdm"
  phone: string;
  email: string;
  city: string;
  state: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  criticalAllergies: string[];
  chronicConditions: string[];
  currentCriticalMeds: string[];
  organDonor: boolean;
  resuscitationDirective: string;
  digitalSignatureRef: string;
}

export interface ConsolidatedDataPoint {
  date: string;
  parameter: string;
  value: string;
  referenceRange: string;
  unit: string;
  labName: string;
  status: 'normal' | 'elevated' | 'critical';
}

export interface MedicalRecord {
  id: string;
  title: string;
  category: RecordCategory;
  date: string;
  providerName: string;
  providerType: 'hospital' | 'doctor' | 'lab' | 'pharmacy' | 'patient';
  verificationStatus: VerificationStatus;
  verificationDetails?: {
    verifiedBy: string;
    timestamp: string;
    signatureHash: string;
  };
  isSensitive: boolean; // Requires patient OTP / explicit consent unlock
  sensitiveClassification?: string;
  summary: string;
  fileType?: 'PDF' | 'DICOM' | 'LAB_JSON';
  isConsolidatedGroup?: boolean;
  consolidatedItemsCount?: number;
  consolidatedHistory?: ConsolidatedDataPoint[];
  tags: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  accessorName: string;
  accessorRole: StakeholderRole;
  organization: string;
  action: 'VIEW_RECORD' | 'DOWNLOAD_FILE' | 'EMERGENCY_BREAK_GLASS' | 'DISPENSE_MEDICATION' | 'SUBMIT_LAB_REPORT' | 'CONSENT_GRANTED' | 'CONSENT_REVOKED';
  resource: string;
  purpose: string;
  isEmergency: boolean;
  securityLevel: 'Standard' | 'Elevated' | 'CRITICAL_OVERRIDE';
  nodeId: string;
}

export interface ConsentPermission {
  id: string;
  providerName: string;
  providerRole: 'doctor' | 'hospital' | 'lab' | 'pharmacy';
  organization: string;
  scope: {
    demographics: boolean;
    diagnostics: boolean;
    prescriptions: boolean;
    sensitiveRecords: boolean;
  };
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  validUntil: string;
  grantedAt: string;
}
