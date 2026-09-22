// Fictional seed data for Health Wallet Prototype
// In compliance with safety guidelines: 100% fictional demo data for SIH 2026.
// Real Aadhaar numbers or medical records are NEVER used.
// Aadhaar is never exposed as a public identifier.

export const PATIENT_PROFILE = {
  id: 'HW-IN-2026-8834-9120', // Safe Public Health Wallet ID
  fullName: 'Aarav Sharma',
  dob: '1994-08-14',
  age: 32,
  gender: 'Male',
  bloodGroup: 'O+',
  bloodGroupFull: 'O+ (Rh Positive)',
  maskedAadhaar: 'XXXX-XXXX-4192', // Internal reference only, strictly masked
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
    { allergen: 'Penicillin', severity: 'Severe Anaphylaxis Risk', reaction: 'Bronchospasm & Hypotension' },
    { allergen: 'Sulfonamides', severity: 'Moderate', reaction: 'Cutaneous Rash / Erythema' }
  ],
  chronicConditions: [
    { condition: 'Essential Hypertension (Stage 1)', status: 'Active Treatment', diagnosed: '2024' },
    { condition: 'Type 2 Diabetes Mellitus', status: 'Well-Controlled with Medication', diagnosed: '2022' }
  ],
  currentCriticalMeds: [
    { name: 'Metformin 500mg SR', dosage: '500mg SR', frequency: 'Twice Daily (Post-Meal)', rxId: 'RX-9941', status: 'Active' },
    { name: 'Telmisartan 40mg', dosage: '40mg', frequency: 'Once Daily (Morning)', rxId: 'RX-9941', status: 'Active' },
    { name: 'Aspirin 75mg (Cardio)', dosage: '75mg', frequency: 'Once Daily (Post-Dinner)', rxId: 'RX-8812', status: 'Active' }
  ],
  upcomingAppointment: {
    doctor: 'Dr. Priya Nair, MD',
    specialty: 'Cardiologist',
    facility: 'Metro Health Institute',
    date: '18 Sep 2026',
    time: '10:30 AM',
    type: 'Cardiometabolic Quarterly Review'
  },
  organDonor: true,
  organDonorCategories: ['Heart', 'Corneas', 'Kidneys', 'Liver'],
  resuscitationDirective: 'Full Code (Standard Resuscitation)',
  verificationHash: 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
  qrPayload: 'healthwallet://verify/HW-IN-2026-8834-9120?sig=7f83b1657ff1fc53&exp=2026-12-31'
};

export const DOCTORS = {
  doctorA: {
    id: 'DOC-PRIYA-01',
    name: 'Dr. Priya Nair, MD',
    specialty: 'Cardiologist',
    hospital: 'Metro Health Institute',
    councilReg: 'KMC Reg: 2014/08/9481',
    activeConsentId: 'CON-101'
  },
  doctorB: {
    id: 'DOC-RAHUL-02',
    name: 'Dr. Rahul Mehta, MD',
    specialty: 'General Physician & Consulting Internist',
    hospital: 'City Health Clinic / Metro Care',
    councilReg: 'KMC Reg: 2016/04/1892',
    activeConsentId: 'CON-104'
  }
};

export const INITIAL_RECORDS = [
  {
    id: 'REC-2026-0831',
    title: 'Cardiology Consultation & Glycemic Assessment',
    category: 'consultation',
    date: '2026-08-31',
    doctor: 'Dr. Priya Nair',
    hospital: 'Metro Health Institute',
    providerName: 'Dr. Priya Nair, MD (Cardiologist)',
    providerRole: 'doctor',
    recordType: 'Consultation',
    symptoms: 'Occasional exertional palpitations, blood pressure elevated during routine workplace checkup',
    diagnosis: 'Essential Hypertension (Stage 1) & Managed Dysglycemia',
    treatment: 'Dual pharmacotherapy regimen, dietary salt reduction (<2g/day), aerobic exercise 30 min/day',
    prescription: 'Metformin 500mg SR (1-0-1), Telmisartan 40mg (1-0-0)',
    rxItems: [
      { drug: 'Metformin 500mg SR', dose: '1 Tab Morning, 1 Tab Night', days: '90 Days', instructions: 'After meals' },
      { drug: 'Telmisartan 40mg', dose: '1 Tab Morning', days: '90 Days', instructions: 'After breakfast' }
    ],
    reports: 'HbA1c — 6.4% (Apex Diagnostics), Normal ECG Rhythm',
    notes: 'Patient strictly allergic to Penicillin. Advised self-monitoring of blood pressure weekly. Next review in 3 weeks.',
    verificationStatus: 'verified_by_provider',
    verificationDetails: {
      verifiedBy: 'Dr. Priya Nair, MD (KMC Reg: 2014/08/9481)',
      timestamp: '2026-08-31 16:30 IST',
      signatureHash: '0x992ac01...14ae',
      accreditation: 'NMC Verified Practitioner'
    },
    isSensitive: false,
    summary: 'Cardiology review completed. Prescribed Metformin 500mg and Telmisartan 40mg. Glycemic control is stable (HbA1c 6.4%).',
    isConsolidatedGroup: false,
    tags: ['Cardiology', 'Consultation', 'Prescription', 'Verified']
  },
  {
    id: 'REC-2026-0614',
    title: 'General Consultation & Routine Checkup',
    category: 'consultation',
    date: '2026-06-14',
    doctor: 'Dr. Rahul Mehta',
    hospital: 'City Health Clinic',
    providerName: 'Dr. Rahul Mehta, MD (General Physician)',
    providerRole: 'doctor',
    recordType: 'Consultation',
    symptoms: 'Mild morning occipital headache, fatigue after long work shifts',
    diagnosis: 'Hypertension (Initial Stage 1 Detection)',
    treatment: 'Recommended ambulatory blood pressure monitoring, ambulatory lifestyle modification',
    prescription: 'Aspirin 75mg (Cardio)',
    rxItems: [
      { drug: 'Aspirin 75mg (Cardio)', dose: '1 Tab Night', days: '30 Days', instructions: 'After dinner' }
    ],
    reports: 'Resting BP: 138/88 mmHg. Advised comprehensive lipid and glucose workup.',
    notes: 'No target organ damage detected. Referred to cardiology for specialized evaluation if BP persists >135 mmHg.',
    verificationStatus: 'verified_by_provider',
    verificationDetails: {
      verifiedBy: 'Dr. Rahul Mehta, MD (KMC Reg: 2016/04/1892)',
      timestamp: '2026-06-14 11:15 IST',
      signatureHash: '0x53d2bb8...81cd',
      accreditation: 'NMC Verified Practitioner'
    },
    isSensitive: false,
    summary: 'General consultation by Dr. Rahul Mehta. Initial hypertension identified. Advised follow-up tests.',
    isConsolidatedGroup: false,
    tags: ['General Medicine', 'Consultation', 'Hypertension', 'Verified']
  },
  {
    id: 'REC-2026-0103',
    title: 'Laboratory Report — Comprehensive Glycated Hemoglobin (HbA1c)',
    category: 'diagnostic',
    date: '2026-01-03',
    doctor: 'Dr. S. K. Roy, MD (Pathologist)',
    hospital: 'Apex Diagnostics',
    providerName: 'Apex Diagnostics & Pathology',
    providerRole: 'lab',
    recordType: 'Lab Report',
    symptoms: 'Quarterly metabolic blood draw',
    diagnosis: 'Impaired Fasting Glucose / Pre-Diabetes Monitoring',
    treatment: 'Laboratory telemetry report dispatched directly to Health Wallet',
    prescription: 'None (Diagnostic Test)',
    reports: 'HbA1c — 6.8% (Reference: < 5.7% Normal, 5.7–6.4% Pre-diabetic, ≥ 6.5% Diabetic)',
    notes: 'Sample processed on Bio-Rad D-10 HPLC Analyzer. Verified by Lead Pathologist.',
    verificationStatus: 'verified_by_provider',
    verificationDetails: {
      verifiedBy: 'Dr. S. K. Roy, MD (Lead Pathologist)',
      timestamp: '2026-01-03 14:20 IST',
      signatureHash: '0x4e28b8a...9b1a',
      accreditation: 'NABL Certified Lab (MC-2849)'
    },
    isSensitive: false,
    summary: 'Apex Diagnostics HbA1c result: 6.8%. Successfully linked to central patient longitudinal profile.',
    fileType: 'LAB_JSON',
    isConsolidatedGroup: true,
    consolidatedItemsCount: 3,
    consolidatedHistory: [
      { date: '2026-08-31', parameter: 'HbA1c (Glycated Hb)', value: '6.4%', referenceRange: '< 5.7%', unit: '%', labName: 'Apex Diagnostics', status: 'elevated' },
      { date: '2026-06-12', parameter: 'HbA1c (Glycated Hb)', value: '6.6%', referenceRange: '< 5.7%', unit: '%', labName: 'Metro General Lab', status: 'elevated' },
      { date: '2026-01-03', parameter: 'HbA1c (Glycated Hb)', value: '6.8%', referenceRange: '< 5.7%', unit: '%', labName: 'Apex Diagnostics', status: 'elevated' },
      { date: '2026-01-03', parameter: 'Fasting Plasma Glucose', value: '118', referenceRange: '70–100', unit: 'mg/dL', labName: 'Apex Diagnostics', status: 'elevated' },
      { date: '2026-01-03', parameter: 'Total Cholesterol', value: '192', referenceRange: '< 200', unit: 'mg/dL', labName: 'Apex Diagnostics', status: 'normal' }
    ],
    tags: ['Biochemistry', 'Cardiometabolic', 'Lab-Report', 'Consolidated']
  },
  {
    id: 'REC-2025-0520',
    title: 'Medication Started: Metformin Therapy Initiation',
    category: 'prescription',
    date: '2025-05-20',
    doctor: 'Dr. Anand Kumar, MD',
    hospital: 'Metro Health Institute',
    providerName: 'Dr. Anand Kumar, MD (Endocrinologist)',
    providerRole: 'doctor',
    recordType: 'Prescription',
    symptoms: 'Persistent elevated fasting sugars',
    diagnosis: 'Type 2 Diabetes Mellitus (Early Stage)',
    treatment: 'Initiation of oral hypoglycemic agent with titration schedule',
    prescription: 'Metformin 500mg SR (1-0-0)',
    reports: 'Fasting Glucose 124 mg/dL',
    notes: 'Advised lifestyle counseling and daily glycemic monitoring.',
    verificationStatus: 'verified_by_provider',
    verificationDetails: {
      verifiedBy: 'Dr. Anand Kumar, MD',
      timestamp: '2025-05-20 10:00 IST',
      signatureHash: '0x3310aa9...42ef',
      accreditation: 'NMC Verified Practitioner'
    },
    isSensitive: false,
    summary: 'Metformin 500mg started as first-line therapy for early-stage glycemic management.',
    isConsolidatedGroup: false,
    tags: ['Endocrinology', 'Prescription', 'Medicine-Started']
  },
  {
    id: 'REC-2024-1120',
    title: 'Patient-Uploaded Baseline ECG Strip (2024)',
    category: 'diagnostic',
    date: '2024-11-20',
    doctor: 'Local Diagnostic Center (Scanned)',
    hospital: 'Koramangala Heart Clinic',
    providerName: 'Aarav Sharma (Self-Uploaded Document)',
    providerRole: 'patient',
    recordType: 'Diagnostic Scan',
    symptoms: 'Pre-operative fitness assessment',
    diagnosis: 'Normal Sinus Rhythm',
    treatment: 'Attested document pending formal clinical re-verification',
    prescription: 'None',
    reports: '12-lead resting electrocardiogram within normal limits',
    notes: 'Scanned paper report uploaded by patient. Unverified raw document.',
    verificationStatus: 'patient_uploaded_unverified',
    isSensitive: false,
    summary: 'Scanned 12-lead baseline resting ECG from local clinic. Pending formal clinical re-verification.',
    fileType: 'PDF',
    isConsolidatedGroup: false,
    tags: ['Self-Uploaded', 'Pending-Verification', 'Historical']
  },
  {
    id: 'REC-2024-0315',
    title: 'Elective Laparoscopic Appendectomy (Surgery)',
    category: 'surgery',
    date: '2024-03-15',
    doctor: 'Dr. Rajesh Deshmukh, MS',
    hospital: 'Manipal Surgical Center',
    providerName: 'Manipal Surgical Center',
    providerRole: 'hospital',
    recordType: 'Surgery / Inpatient',
    symptoms: 'Right lower quadrant abdominal pain, subacute appendicitis',
    diagnosis: 'Subacute Non-Perforated Appendicitis',
    treatment: 'Uncomplicated laparoscopic appendectomy under general anesthesia',
    prescription: 'Paracetamol 650mg SOS, Ciprofloxacin 500mg (Completed)',
    reports: 'Histopathology confirmed benign inflamed appendix',
    notes: 'Post-operative recovery uneventful. Discharged on post-op day 2 in stable condition.',
    verificationStatus: 'verified_by_provider',
    verificationDetails: {
      verifiedBy: 'Dr. Rajesh Deshmukh, MS (General Surgery)',
      timestamp: '2024-03-15 18:00 IST',
      signatureHash: '0x71ba23e...99cd',
      accreditation: 'NABH Accredited Surgical Center'
    },
    isSensitive: false,
    summary: 'Successful uncomplicated elective laparoscopic appendectomy performed in March 2024.',
    isConsolidatedGroup: false,
    tags: ['Surgery', 'Hospital-Visit', 'Verified']
  },
  {
    id: 'REC-2026-0405',
    title: 'Neurological Stress & Sleep Architecture Evaluation',
    category: 'sensitive_mental_health',
    date: '2026-04-05',
    doctor: 'Dr. Anirudh Sen, MD',
    hospital: 'MindCare Neuro-Psychiatry Institute',
    providerName: 'MindCare Neuro-Psychiatry Institute',
    providerRole: 'doctor',
    recordType: 'Specialist Evaluation',
    symptoms: 'Work-related sleep disturbance and mild situational anxiety',
    diagnosis: 'Situational Insomnia & Mild Anxiety Biomarkers',
    treatment: 'Cognitive sleep hygiene guidelines and stress reduction protocols',
    prescription: 'Non-pharmacological cognitive therapy',
    reports: 'Actigraphy sleep efficiency 74%',
    notes: 'Tier-3 Confidential Record. Requires explicit patient OTP or biometric authorization to inspect.',
    verificationStatus: 'verified_by_provider',
    verificationDetails: {
      verifiedBy: 'Dr. Anirudh Sen, MD (Neuro-Psychiatrist)',
      timestamp: '2026-04-05 15:10 IST',
      signatureHash: '0x88bb774...10ec',
      accreditation: 'KMC Reg: 2011/04/1982'
    },
    isSensitive: true,
    sensitiveClassification: 'Tier-3 Confidential: Mental Health & Neuro-Biomarkers',
    summary: 'Evaluation of sleep disturbance. Non-pharmacological cognitive sleep hygiene prescribed. STRICTLY CONFIDENTIAL.',
    fileType: 'PDF',
    isConsolidatedGroup: false,
    tags: ['Tier-3-Sensitive', 'Explicit-Consent-Required', 'Mental-Health']
  }
];

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'AUD-903',
    timestamp: '31 Aug 2026 · 8:20 PM',
    rawDate: '2026-08-31 20:20:14 IST',
    accessorName: 'Dr. Priya Nair, MD',
    accessorRole: 'doctor',
    organization: 'Metro Health Institute',
    action: 'ADD_RECORD',
    resource: 'Consultation + Medicines (Cardiology Follow-Up)',
    purpose: 'Follow-up Consultation & Regimen Prescription',
    isEmergency: false,
    securityLevel: 'Standard Authorized',
    verifiedProvider: true,
    nodeId: 'NODE-BLR-04'
  },
  {
    id: 'AUD-902',
    timestamp: '31 Aug 2026 · 4:15 PM',
    rawDate: '2026-08-31 16:15:22 IST',
    accessorName: 'Dr. Priya Nair, MD',
    accessorRole: 'doctor',
    organization: 'Metro Health Institute',
    action: 'VIEW_RECORD',
    resource: 'Consultation + Medicines',
    purpose: 'Follow-up Consultation',
    isEmergency: false,
    securityLevel: 'Standard Authorized',
    verifiedProvider: true,
    nodeId: 'NODE-BLR-04'
  },
  {
    id: 'AUD-901',
    timestamp: '24 Aug 2026 · 5:02 PM',
    rawDate: '2026-08-24 17:02:05 IST',
    accessorName: 'Apex Diagnostic Telemetry Gateway',
    accessorRole: 'lab',
    organization: 'Apex Diagnostics',
    action: 'SUBMIT_LAB_REPORT',
    resource: 'Consolidated Lipid & HbA1c Panel',
    purpose: 'Direct authenticated lab telemetry upload to Health Wallet',
    isEmergency: false,
    securityLevel: 'Cryptographically Signed',
    verifiedProvider: true,
    nodeId: 'NODE-BLR-09'
  },
  {
    id: 'AUD-900',
    timestamp: '14 Jun 2026 · 11:30 AM',
    rawDate: '2026-06-14 11:30:10 IST',
    accessorName: 'Dr. Rahul Mehta, MD',
    accessorRole: 'doctor',
    organization: 'City Health Clinic',
    action: 'ADD_RECORD',
    resource: 'General Consultation & Initial BP Workup',
    purpose: 'Clinical Consultation for Stage 1 Hypertension',
    isEmergency: false,
    securityLevel: 'Standard Authorized',
    verifiedProvider: true,
    nodeId: 'NODE-BLR-12'
  },
  {
    id: 'AUD-899',
    timestamp: '15 May 2026 · 10:15 AM',
    rawDate: '2026-05-15 10:15:45 IST',
    accessorName: 'Aarav Sharma (Patient)',
    accessorRole: 'patient',
    organization: 'Health Wallet Mobile App',
    action: 'CONSENT_GRANTED',
    resource: '90-Day Diagnostic & Rx Access Scope',
    purpose: 'Consent granted to Dr. Priya Nair, MD',
    isEmergency: false,
    securityLevel: 'Patient Biometric Signed',
    verifiedProvider: true,
    nodeId: 'NODE-CLIENT-AARAV'
  }
];

export const INITIAL_CONSENT_PERMISSIONS = [
  {
    id: 'CON-101',
    providerName: 'Dr. Priya Nair, MD (Cardiologist)',
    providerRole: 'doctor',
    organization: 'Metro Health Institute',
    scope: {
      demographics: true,
      diagnostics: true,
      prescriptions: true,
      sensitiveRecords: false
    },
    status: 'ACTIVE',
    validUntil: '2026-11-15',
    grantedAt: '2026-08-15'
  },
  {
    id: 'CON-104',
    providerName: 'Dr. Rahul Mehta, MD (General Physician)',
    providerRole: 'doctor',
    organization: 'City Health Clinic',
    scope: {
      demographics: true,
      diagnostics: true,
      prescriptions: true,
      sensitiveRecords: false
    },
    status: 'ACTIVE',
    validUntil: '2026-12-31',
    grantedAt: '2026-06-14'
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
