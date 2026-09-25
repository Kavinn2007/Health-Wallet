import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Stethoscope,
  Building2,
  FileCheck,
} from 'lucide-react';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { useAuth, type UserRole } from '../context/AuthContext';
import {
  INDIAN_STATES,
  BLOOD_GROUPS,
  GENDERS,
  DOCTOR_SPECIALIZATIONS,
  type PatientProfile,
  type DoctorProfile,
} from '../services/supabase';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, registerDoctor, isConfigured } = useAuth();

  // Tab State: PATIENT vs DOCTOR
  const initialRole = searchParams.get('role')?.toUpperCase() === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';
  const [roleTab, setRoleTab] = useState<UserRole>(initialRole);

  useEffect(() => {
    if (searchParams.get('role')?.toUpperCase() === 'DOCTOR') {
      setRoleTab('DOCTOR');
    }
  }, [searchParams]);

  // PATIENT FIELDS
  const [patientName, setPatientName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [bloodGroup, setBloodGroup] = useState<typeof BLOOD_GROUPS[number]>('B+');
  const [gender, setGender] = useState<typeof GENDERS[number]>('Female');
  const [stateName, setStateName] = useState('Tamil Nadu');
  const [patientUsername, setPatientUsername] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [patientConfirmPassword, setPatientConfirmPassword] = useState('');

  // DOCTOR FIELDS
  const [doctorName, setDoctorName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [specialization, setSpecialization] = useState<string>(DOCTOR_SPECIALIZATIONS[0]);
  const [hospitalName, setHospitalName] = useState('');
  const [doctorMobile, setDoctorMobile] = useState('');
  const [doctorUsername, setDoctorUsername] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');
  const [doctorConfirmPassword, setDoctorConfirmPassword] = useState('');

  // UI state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPatient, setCreatedPatient] = useState<PatientProfile | null>(null);
  const [createdDoctor, setCreatedDoctor] = useState<DoctorProfile | null>(null);
  const [copiedHwId, setCopiedHwId] = useState(false);

  // Format Aadhaar with spaces (#### #### ####)
  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaarNumber(raw);
  };

  const displayAadhaar = aadhaarNumber
    ? aadhaarNumber.replace(/(\d{4})(?=\d)/g, '$1 ')
    : '';

  // Validate Patient
  const validatePatient = (): boolean => {
    const errors: Record<string, string> = {};

    if (!patientName.trim()) {
      errors.patientName = 'Patient Name is required.';
    }

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (!cleanMobile) {
      errors.mobileNumber = 'Mobile Number is required.';
    } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      errors.mobileNumber = 'Must be a valid 10-digit Indian mobile number (starts with 6-9).';
    }

    if (!aadhaarNumber) {
      errors.aadhaarNumber = 'Aadhaar Number is required.';
    } else if (aadhaarNumber.length !== 12) {
      errors.aadhaarNumber = 'Aadhaar Number must be exactly 12 digits.';
    }

    const cleanUser = patientUsername.trim().toLowerCase();
    if (!cleanUser) {
      errors.username = 'Username is required.';
    } else if (cleanUser.length < 3) {
      errors.username = 'Username must be at least 3 characters.';
    } else if (!/^[a-z0-9_.-]+$/.test(cleanUser)) {
      errors.username = 'Username can only contain lowercase letters, numbers, and _.-';
    }

    if (!patientPassword) {
      errors.password = 'Password is required.';
    } else if (patientPassword.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (patientPassword !== patientConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate Doctor
  const validateDoctor = (): boolean => {
    const errors: Record<string, string> = {};

    if (!doctorName.trim()) {
      errors.doctorName = 'Doctor Name is required.';
    }

    const cleanReg = registrationNumber.trim().toUpperCase();
    if (!cleanReg) {
      errors.registrationNumber = 'Medical Registration Number is required.';
    }

    if (!specialization.trim()) {
      errors.specialization = 'Specialization is required.';
    }

    if (!hospitalName.trim()) {
      errors.hospitalName = 'Hospital / Clinic name is required.';
    }

    const cleanMobile = doctorMobile.replace(/\D/g, '');
    if (!cleanMobile) {
      errors.doctorMobile = 'Mobile Number is required.';
    } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      errors.doctorMobile = 'Must be a valid 10-digit Indian mobile number (starts with 6-9).';
    }

    const cleanUser = doctorUsername.trim().toLowerCase();
    if (!cleanUser) {
      errors.doctorUsername = 'Username is required.';
    } else if (cleanUser.length < 3) {
      errors.doctorUsername = 'Username must be at least 3 characters.';
    } else if (!/^[a-z0-9_.-]+$/.test(cleanUser)) {
      errors.doctorUsername = 'Username can only contain lowercase letters, numbers, and _.-';
    }

    if (!doctorPassword) {
      errors.doctorPassword = 'Password is required.';
    } else if (doctorPassword.length < 8) {
      errors.doctorPassword = 'Password must be at least 8 characters long.';
    }

    if (doctorPassword !== doctorConfirmPassword) {
      errors.doctorConfirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validatePatient()) return;

    setIsSubmitting(true);
    const result = await register({
      patientName: patientName.trim(),
      mobileNumber: mobileNumber.replace(/\D/g, ''),
      aadhaarNumber,
      bloodGroup,
      gender,
      stateName,
      username: patientUsername.trim().toLowerCase(),
      password: patientPassword,
    });
    setIsSubmitting(false);

    if (result.success && result.profile) {
      setCreatedPatient(result.profile);
    } else {
      setGeneralError(result.error || 'Failed to create patient account. Please try again.');
    }
  };

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateDoctor()) return;

    setIsSubmitting(true);
    const result = await registerDoctor({
      doctorName: doctorName.trim(),
      registrationNumber: registrationNumber.trim().toUpperCase(),
      specialization: specialization.trim(),
      hospitalName: hospitalName.trim(),
      mobileNumber: doctorMobile.replace(/\D/g, ''),
      username: doctorUsername.trim().toLowerCase(),
      password: doctorPassword,
    });
    setIsSubmitting(false);

    if (result.success && result.profile) {
      setCreatedDoctor(result.profile);
    } else {
      setGeneralError(result.error || 'Failed to create doctor account. Please try again.');
    }
  };

  const copyHealthWalletId = () => {
    if (createdPatient?.health_wallet_id) {
      navigator.clipboard.writeText(createdPatient.health_wallet_id);
      setCopiedHwId(true);
      setTimeout(() => setCopiedHwId(false), 2000);
    }
  };

  // SUCCESS SCREEN: Patient Created
  if (createdPatient) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-card p-6 md:p-8 space-y-6 text-center animate-in zoom-in-95 duration-200">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-2">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Health Wallet Activated!
            </h2>
            <p className="text-xs text-slate-500">
              Welcome, <span className="font-semibold text-slate-800">{createdPatient.patient_name}</span>. Your authoritative digital health ID has been registered.
            </p>
          </div>

          {/* Health Wallet ID badge */}
          <div className="p-4 bg-gradient-to-br from-sky-50 to-indigo-50/60 border border-sky-200 rounded-xl space-y-2">
            <p className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">
              Authoritative Health Wallet ID
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-xl md:text-2xl font-black text-sky-950 tracking-wider">
                {createdPatient.health_wallet_id}
              </span>
              <button
                type="button"
                onClick={copyHealthWalletId}
                className="p-1.5 text-sky-700 hover:text-sky-900 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                title="Copy Health Wallet ID"
              >
                {copiedHwId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-sky-700">
              Generated by Supabase Database Engine • State Node: {createdPatient.state_code}
            </p>
          </div>

          <div className="text-left text-xs bg-slate-50 p-3.5 rounded-xl space-y-1.5 border border-slate-200/80">
            <div className="flex justify-between">
              <span className="text-slate-500">Blood Group:</span>
              <span className="font-bold text-slate-800">{createdPatient.blood_group}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Aadhaar Last 4:</span>
              <span className="font-mono font-bold text-slate-800">XXXX XXXX {createdPatient.aadhaar_last_four}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Username:</span>
              <span className="font-bold text-slate-800">{createdPatient.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">State:</span>
              <span className="font-bold text-slate-800">{createdPatient.state}</span>
            </div>
          </div>

          <PrimaryButton
            onClick={() => navigate('/dashboard')}
            className="w-full"
            size="lg"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Enter Patient Dashboard
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // SUCCESS SCREEN: Doctor Created
  if (createdDoctor) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-card p-6 md:p-8 space-y-6 text-center animate-in zoom-in-95 duration-200">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-2">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Doctor Account Registered!
            </h2>
            <p className="text-xs text-slate-500">
              Welcome, <span className="font-semibold text-slate-800">{createdDoctor.doctor_name}</span>. Your clinical profile has been verified.
            </p>
          </div>

          {/* Registration Details card */}
          <div className="p-4 bg-gradient-to-br from-sky-50 to-indigo-50/60 border border-sky-200 rounded-xl space-y-2 text-left">
            <div className="flex items-center gap-2 text-sky-800">
              <Stethoscope className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Medical Practitioner Credentials
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Reg Number:</span>
                <span className="font-mono font-bold text-slate-900">{createdDoctor.registration_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Specialization:</span>
                <span className="font-bold text-slate-900">{createdDoctor.specialization}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Hospital:</span>
                <span className="font-bold text-slate-900">{createdDoctor.hospital_name}</span>
              </div>
            </div>
            <p className="text-[10px] text-sky-700 pt-1">
              Note: Medical doctors do not receive a Health Wallet ID. Health Wallet IDs are reserved for patients.
            </p>
          </div>

          <PrimaryButton
            onClick={() => navigate('/doctor/dashboard')}
            className="w-full"
            size="lg"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Enter Doctor Dashboard
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-600 text-white shadow-md mb-1">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Health<span className="text-sky-600">Wallet</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            National Digital Health Connectivity & Records Platform
          </p>
        </div>

        {/* Role Tab Selector */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setRoleTab('PATIENT');
              setFieldErrors({});
              setGeneralError('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              roleTab === 'PATIENT'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Patient Registration</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleTab('DOCTOR');
              setFieldErrors({});
              setGeneralError('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              roleTab === 'DOCTOR'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor Registration</span>
          </button>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                {roleTab === 'DOCTOR' ? (
                  <>
                    <Stethoscope className="w-5 h-5 text-sky-600" />
                    <span>Doctor Profile Registration</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-sky-600" />
                    <span>New Patient Health Wallet</span>
                  </>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                {roleTab === 'DOCTOR'
                  ? 'Register clinical credentials to request patient record access'
                  : 'Enroll and generate your authoritative Health Wallet ID'}
              </p>
            </div>
            <Link
              to="/login"
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          </div>

          {generalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {/* DOCTOR REGISTRATION FORM */}
          {roleTab === 'DOCTOR' ? (
            <form onSubmit={handleDoctorSubmit} className="space-y-4">
              {/* Doctor Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Doctor Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Priya Sharma"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                />
                {fieldErrors.doctorName && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.doctorName}</p>
                )}
              </div>

              {/* Registration Number & Specialization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Medical Reg. Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. MCI-2018-9482"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm font-mono text-slate-900 outline-none transition-colors"
                  />
                  {fieldErrors.registrationNumber && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.registrationNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Specialization <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                  >
                    {DOCTOR_SPECIALIZATIONS.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hospital / Clinic */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Hospital / Clinic Affiliation <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="e.g. Apollo Multi-Speciality Hospital, Chennai"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                  />
                </div>
                {fieldErrors.hospitalName && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.hospitalName}</p>
                )}
              </div>

              {/* Mobile Number & Username */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">+91</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={doctorMobile}
                      onChange={(e) => setDoctorMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9845199887"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors font-medium"
                    />
                  </div>
                  {fieldErrors.doctorMobile && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.doctorMobile}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Doctor Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={doctorUsername}
                    onChange={(e) => setDoctorUsername(e.target.value.toLowerCase())}
                    placeholder="e.g. dr_priya"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                  />
                  {fieldErrors.doctorUsername && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.doctorUsername}</p>
                  )}
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Password (min. 8 chars) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={doctorPassword}
                    onChange={(e) => setDoctorPassword(e.target.value)}
                    placeholder="Create strong password"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                  />
                  {fieldErrors.doctorPassword && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.doctorPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={doctorConfirmPassword}
                    onChange={(e) => setDoctorConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                  />
                  {fieldErrors.doctorConfirmPassword && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.doctorConfirmPassword}</p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs text-sky-800 flex items-start gap-2">
                <FileCheck className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                <span>
                  Doctor accounts are stored in the verified <code className="font-mono font-bold">doctor_profiles</code> registry. Doctors do not receive Health Wallet IDs.
                </span>
              </div>

              <PrimaryButton
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isSubmitting}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Register Doctor Account
              </PrimaryButton>
            </form>
          ) : (
            /* PATIENT REGISTRATION FORM */
            <form onSubmit={handlePatientSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Patient Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Sunita Patil"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                />
                {fieldErrors.patientName && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.patientName}</p>
                )}
              </div>

              {/* Mobile Number & Aadhaar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">+91</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9845122334"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors font-medium"
                    />
                  </div>
                  {fieldErrors.mobileNumber && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.mobileNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Aadhaar Number (12 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={displayAadhaar}
                    onChange={handleAadhaarChange}
                    placeholder="XXXX XXXX XXXX"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors font-mono"
                  />
                  {fieldErrors.aadhaarNumber && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.aadhaarNumber}</p>
                  )}
                </div>
              </div>

              {/* Blood Group, Gender & State */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Blood Group <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors font-semibold"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                  >
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    State / UT <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={patientUsername}
                  onChange={(e) => setPatientUsername(e.target.value)}
                  placeholder="e.g. sunita_patil"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                />
                {fieldErrors.username && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.username}</p>
                )}
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Password (min. 8 chars) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={patientPassword}
                    onChange={(e) => setPatientPassword(e.target.value)}
                    placeholder="Create strong password"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                  />
                  {fieldErrors.password && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={patientConfirmPassword}
                    onChange={(e) => setPatientConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <PrimaryButton
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isSubmitting}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Activate Health Wallet ID
              </PrimaryButton>
            </form>
          )}

          <div className="pt-2 text-center text-xs text-slate-400">
            <span>By proceeding, you agree to national health data security standards.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
