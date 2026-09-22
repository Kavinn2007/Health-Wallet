import { PatientProfile, MedicalRecord, AuditLogEntry, ConsentPermission } from '../types';

export const INITIAL_PATIENT_PROFILE: PatientProfile = {
  id: 'HW-IN-2026-8834-9120',
  fullName: 'Aarav Sharma',
  dob: '1994-08-14',
  age: 32,
  gender: 'Male',
  bloodGroup: 'O+ Positive',
  maskedAadhaar: 'XXXX-XXXX-4192', // Never used as public ID
  abhaAddress: 'aarav.sharma@abdm',
  phone: '+91 98450-12890',
  email: 'aarav.sharma.demo@healthwallet.in',
  city: 'Bengaluru',
  state: 'Karnataka',
  emergencyContact: {
    name: 'Ananya Sharma',
    relation: 'Spouse',
    phone: '+91 98765-43210'
  },
  criticalAllergies: [
    'Penicillin (Severe Anaphylaxis Risk)',
    'Sulfonamide Antibiotics (Erythema / Rash)'
  ],
  chronicConditions: [
    'Type 2 Diabetes Mellitus (Controlled)',
    'Essential Hypertension (Stage 1)'
  ],
  currentCriticalMeds: [
    'Metformin 500mg (Twice Daily - After Meals)',
    'Telmisartan 40mg (Once Daily - Morning)',
    'Aspirin 75mg (Once Daily - Post Dinner)'
  ],
  organDonor: true,
  resuscitationDirective: 'Full Code (No DNR limitation)',
  digitalSignatureRef: 'HW-SIG-SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'
};

export const INITIAL_MEDICAL_RECORDS: MedicalRecord[] = [
  {
    id: 'REC-2026-081',
    title: 'Lipid Profile & Glycated Hemoglobin (HbA1c)',
    category: 'diagnostic',
    date: '2026-08-24',
    providerName: 'Apex Diagnostics & Pathology',
    providerType: 'lab',
    verificationStatus: 'verified_by_provider',
    verificationDetails: {
      verifiedBy: 'Dr. S. K. Roy, MD (Pathologist)',
      timestamp: '2026-08-24 16:45 IST',
      signatureHash: '0x4e28...9b1a (NABL Accr: MC-2849)'
    },
    isSensitive: false,
    summary: 'Consolidated test history. HbA1c at 6.4% indicates optimal glycemic control. Total cholesterol 188 mg/dL.',
    fileType: 'LAB_JSON',
    isConsolidatedGroup: true,
    consolidatedItemsCount: 3,
    consolidatedHistory: [
      { date: '2026-08-24', parameter: 'HbA1c', value: '6.4%', referenceRange: '< 5.7%', unit: '%', labName: 'Apex Diagnostics', status: 'elevated' },
      { date: '2026-05-18', parameter: 'HbA1c', value: '6.8%', referenceRange: '< 5.7%', unit: '%', labName: 'Metro General Lab', status: 'elevated' },
      { date: '2026-02-10', parameter: 'HbA1c', value: '7.2%', referenceRange: '< 5.7%', unit: '%', labName: 'Apex Diagnostics', status: 'critical' },
      { date: '2026-08-24', parameter: 'Total Cholesterol', value: '188', referenceRange: '< 200', unit: 'mg/dL', labName: 'Apex Diagnostics', status: 'normal' },
      { date: '2026-08-24', parameter: 'LDL Cholesterol', value: '108', referenceRange: '< 100', unit: 'mg/dL', labName: 'Apex Diagnostics', status: 'elevated' }
    ],
    tags: ['Biochemistry', 'Cardiometabolic', 'Consolidated-Series']
  },
  {
    id: 'REC-2026-064',
    title: 'Active Digital Prescription: Antihypertensive Regimen',
    category: 'prescription',
    date: '2026-08-15',
    providerName: 'Dr. Priya Nair, MD (Cardiologist)',
    providerType: 'doctor',
    verificationStatus: 'verified_by_provider',
    verificationDetails: {
      verifiedBy: 'Dr. Priya Nair (KMC Reg: 2014/08/9481)',
      timestamp: '2026-08-15 11:30 IST',
      signatureHash: '0x992a...c014 (Digital Rx Token)'
    },
    isSensitive: false,
    summary: 'Prescribed Telmisartan 40mg (1-0-0) x 90 days, Metformin 500mg SR (1-0-1) x 90 days. Avoid NSAIDs.',
    fileType: 'PDF',
    isConsolidatedGroup: false,
    tags: ['Cardiology', 'Active-Rx', 'QR-Verifiable']
  },
  {
    id: 'REC-2026-042',
    title: 'Hospital Discharge Summary: Cardiac Stress Evaluation',
    category: 'discharge_summary',
    date: '2026-06-12',
    providerName: 'Metro Health Institute & Multi-Specialty',
    providerType: 'hospital',
    verificationStatus: 'verified_by_provider',
    verificationDetails: {
      verifiedBy: 'Medical Superintendent - Metro Health',
      timestamp: '2026-06-12 18:00 IST',
      signatureHash: '0x17fa...ee32 (NABH Certified)'
    },
    isSensitive: false,
    summary: 'Admitted for treadmill stress test. Normal myocardial perfusion. No acute ischemic changes noted. Discharged in stable condition.',
    fileType: 'PDF',
    isConsolidatedGroup: false,
    tags: ['Inpatient', 'Discharge-Protocol', 'NABH']
  },
  {
    id: 'REC-2026-033',
    title: 'Patient-Uploaded Baseline ECG Strip (2024)',
    category: 'diagnostic',
    date: '2024-11-20',
    providerName: 'Aarav Sharma (Patient Upload)',
    providerType: 'patient',
    verificationStatus: 'patient_uploaded_unverified',
    isSensitive: false,
    summary: 'Self-scanned 12-lead baseline resting ECG from neighborhood clinic. Unverified raw upload; awaiting clinical validation.',
    fileType: 'PDF',
    isConsolidatedGroup: false,
    tags: ['Self-Uploaded', 'Pending-Verification', 'Historical']
  },
  {
    id: 'REC-2026-019',
    title: 'Cognitive Stress & Sleep Neurological Assessment',
    category: 'sensitive_mental_health',
    date: '2026-04-05',
    providerName: 'MindCare Neuro-Psychiatry Centre',
    providerType: 'doctor',
    verificationStatus: 'verified_by_provider',
    verificationDetails: {
      verifiedBy: 'Dr. Anirudh Sen, MD',
      timestamp: '2026-04-05 15:10 IST',
      signatureHash: '0x88bb...7741'
    },
    isSensitive: true,
    sensitiveClassification: 'Confidential / Tier-3 Sensitive Record',
    summary: 'Evaluation of work-related sleep disturbance and mild generalized anxiety. Non-pharmacological behavioral therapy recommended.',
    fileType: 'PDF',
    isConsolidatedGroup: false,
    tags: ['Tier-3-Sensitive', 'Explicit-Consent-Required', 'Mental-Health']
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-901',
    timestamp: '2026-09-02 21:15:40 IST',
    accessorName: 'Dr. Priya Nair, MD',
    accessorRole: 'doctor',
    organization: 'Metro Heart Institute',
    action: 'VIEW_RECORD',
    resource: 'Cardiometabolic History & Lipid Trend',
    purpose: 'Routine quarterly follow-up tele-consultation',
    isEmergency: false,
    securityLevel: 'Standard',
    nodeId: 'NODE-BLR-04'
  },
  {
    id: 'AUD-900',
    timestamp: '2026-09-02 18:42:11 IST',
    accessorName: 'Pharmacist Rajesh V.',
    accessorRole: 'pharmacy',
    organization: 'MedPlus Care Pharmacy #104',
    action: 'DISPENSE_MEDICATION',
    resource: 'Active Digital Rx (Telmisartan 40mg)',
    purpose: 'Prescription verification & dispense fulfillment',
    isEmergency: false,
    securityLevel: 'Standard',
    nodeId: 'NODE-BLR-21'
  },
  {
    id: 'AUD-899',
    timestamp: '2026-08-24 17:02:05 IST',
    accessorName: 'Apex Automated Lab Gateway',
    accessorRole: 'lab',
    organization: 'Apex Diagnostics Lab',
    action: 'SUBMIT_LAB_REPORT',
    resource: 'Consolidated Lipid & HbA1c Series',
    purpose: 'Direct verified telemetry upload to Patient Health Wallet',
    isEmergency: false,
    securityLevel: 'Standard',
    nodeId: 'NODE-BLR-09'
  },
  {
    id: 'AUD-898',
    timestamp: '2026-08-15 11:32:45 IST',
    accessorName: 'Aarav Sharma (Patient)',
    accessorRole: 'patient',
    organization: 'Health Wallet Mobile App',
    action: 'CONSENT_GRANTED',
    resource: '90-Day Diagnostic & Rx Access',
    purpose: 'Consent granted to Dr. Priya Nair',
    isEmergency: false,
    securityLevel: 'Standard',
    nodeId: 'NODE-CLIENT-AARAV'
  }
];

export const INITIAL_CONSENT_PERMISSIONS: ConsentPermission[] = [
  {
    id: 'CON-101',
    providerName: 'Dr. Priya Nair, MD',
    providerRole: 'doctor',
    organization: 'Metro Heart Institute',
    scope: {
      demographics: true,
      diagnostics: true,
      prescriptions: true,
      sensitiveRecords: false // Sensitive tier locked by default
    },
    status: 'ACTIVE',
    validUntil: '2026-11-15',
    grantedAt: '2026-08-15'
  },
  {
    id: 'CON-102',
    providerName: 'Apex Diagnostics & Pathology',
    providerRole: 'lab',
    organization: 'Apex Health Network',
    scope: {
      demographics: true,
      diagnostics: true,
      prescriptions: false,
      sensitiveRecords: false
    },
    status: 'ACTIVE',
    validUntil: '2026-09-30',
    grantedAt: '2026-08-20'
  },
  {
    id: 'CON-103',
    providerName: 'MedPlus Care Pharmacy #104',
    providerRole: 'pharmacy',
    organization: 'MedPlus Healthcare',
    scope: {
      demographics: true,
      diagnostics: false,
      prescriptions: true,
      sensitiveRecords: false
    },
    status: 'ACTIVE',
    validUntil: '2026-09-15',
    grantedAt: '2026-08-15'
  }
];
