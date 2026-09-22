import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Sparkles, Copy, Check } from 'lucide-react';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { INDIAN_STATES, BLOOD_GROUPS, GENDERS, type PatientProfile } from '../services/supabase';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isConfigured } = useAuth();

  // The EXACT 9 patient fields:
  const [patientName, setPatientName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [bloodGroup, setBloodGroup] = useState<typeof BLOOD_GROUPS[number]>('B+');
  const [gender, setGender] = useState<typeof GENDERS[number]>('Female');
  const [stateName, setStateName] = useState('Tamil Nadu');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProfile, setCreatedProfile] = useState<PatientProfile | null>(null);
  const [copiedHwId, setCopiedHwId] = useState(false);

  // Format Aadhaar with spaces (#### #### ####)
  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaarNumber(raw);
  };

  const displayAadhaar = aadhaarNumber
    ? aadhaarNumber.replace(/(\d{4})(?=\d)/g, '$1 ')
    : '';

  // Validation function
  const validate = (): boolean => {
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

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      errors.username = 'Username is required.';
    } else if (cleanUser.length < 3) {
      errors.username = 'Username must be at least 3 characters.';
    } else if (!/^[a-z0-9_.-]+$/.test(cleanUser)) {
      errors.username = 'Username can only contain lowercase letters, numbers, and _.-';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    const result = await register({
      patientName: patientName.trim(),
      mobileNumber: mobileNumber.replace(/\D/g, ''),
      aadhaarNumber,
      bloodGroup,
      gender,
      stateName,
      username: username.trim().toLowerCase(),
      password,
    });

    setIsSubmitting(false);

    if (result.success && result.profile) {
      setCreatedProfile(result.profile);
    } else {
      setGeneralError(result.error || 'Registration failed. Please review your information.');
    }
  };

  // SUCCESS SCREEN
  if (createdProfile) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F8FAFC]">
        <div className="w-full max-w-lg space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Brand header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-md mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Patient Account Created Successfully
            </h1>
            <p className="text-xs text-slate-500">
              Your official National Health Wallet identity is active and ready
            </p>
          </div>

          {/* Health Wallet ID Showcase Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-card p-6 md:p-8 space-y-6">
            <div className="p-5 bg-gradient-to-r from-sky-900 to-slate-900 text-white rounded-2xl text-center space-y-2 relative overflow-hidden shadow-inner">
              <span className="text-[11px] font-bold uppercase tracking-widest text-sky-300">
                Your Health Wallet ID
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl sm:text-3xl font-mono font-extrabold tracking-widest text-sky-200">
                  {createdProfile.health_wallet_id}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdProfile.health_wallet_id);
                    setCopiedHwId(true);
                    setTimeout(() => setCopiedHwId(false), 2000);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-sky-200"
                  title="Copy Health Wallet ID"
                  aria-label="Copy Health Wallet ID"
                >
                  {copiedHwId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-sky-100/70">
                Format: HW-[STATE CODE]-[8 RANDOM DIGITS]
              </p>
            </div>

            {/* Registered Patient Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Registered Patient Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-medium">Patient Name</span>
                  <span className="font-bold text-slate-800">{createdProfile.patient_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Username</span>
                  <span className="font-mono font-bold text-sky-700">{createdProfile.username}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Mobile Number</span>
                  <span className="font-mono font-semibold text-slate-800">+91 {createdProfile.mobile_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Blood Group</span>
                  <span className="font-bold text-rose-600">{createdProfile.blood_group}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Gender</span>
                  <span className="font-semibold text-slate-800">{createdProfile.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">State (Code)</span>
                  <span className="font-semibold text-slate-800">
                    {createdProfile.state} ({createdProfile.state_code})
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 block font-medium">Aadhaar Verification (Masked)</span>
                  <span className="font-mono font-bold text-emerald-700">
                    XXXX XXXX {createdProfile.aadhaar_last_four}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    (Full 12-digit number is cryptographically hashed and never stored in plaintext)
                  </span>
                </div>
              </div>
            </div>

            {/* Proceed to Login Button */}
            <div className="pt-2">
              <PrimaryButton
                size="lg"
                className="w-full"
                onClick={() => navigate('/login')}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Proceed to Login
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // REGISTRATION FORM
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-600 text-white shadow-md mb-1">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Patient Registration
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Register your verified Health Wallet account on the Unified National Health Network
          </p>
        </div>

        {/* Configuration notice if Supabase is pending in .env */}
        {!isConfigured && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Supabase Credentials Notice</p>
              <p className="text-amber-800">
                To connect to live Supabase PostgreSQL, add <code className="font-mono font-semibold">VITE_SUPABASE_URL</code> and{' '}
                <code className="font-mono font-semibold">VITE_SUPABASE_ANON_KEY</code> to your <code className="font-mono">.env</code>.
                Validation and flow will run smoothly in local verification mode.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-card p-6 md:p-8 space-y-6">
          {generalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* 1. Patient Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                1. Patient Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => {
                  setPatientName(e.target.value);
                  if (fieldErrors.patientName) setFieldErrors((prev) => ({ ...prev, patientName: '' }));
                }}
                placeholder="Full legal name (e.g. Sunita Patil)"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 outline-none transition-colors ${
                  fieldErrors.patientName
                    ? 'border-rose-300 focus:border-rose-500 bg-rose-50/30'
                    : 'border-slate-200 focus:border-sky-500 focus:bg-white'
                }`}
              />
              {fieldErrors.patientName && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.patientName}</p>
              )}
            </div>

            {/* 2 & 3: Mobile Number and Aadhaar Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                      if (fieldErrors.mobileNumber) setFieldErrors((prev) => ({ ...prev, mobileNumber: '' }));
                    }}
                    placeholder="10-digit mobile"
                    className={`w-full pl-11 pr-3 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 outline-none transition-colors font-mono ${
                      fieldErrors.mobileNumber
                        ? 'border-rose-300 focus:border-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:border-sky-500 focus:bg-white'
                    }`}
                  />
                </div>
                {fieldErrors.mobileNumber && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.mobileNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Aadhaar Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={14}
                  value={displayAadhaar}
                  onChange={handleAadhaarChange}
                  placeholder="12-digit Aadhaar"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 outline-none transition-colors font-mono ${
                    fieldErrors.aadhaarNumber
                      ? 'border-rose-300 focus:border-rose-500 bg-rose-50/30'
                      : 'border-slate-200 focus:border-sky-500 focus:bg-white'
                  }`}
                />
                {fieldErrors.aadhaarNumber && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.aadhaarNumber}</p>
                )}
              </div>
            </div>

            {/* 4 & 5: Blood Group & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Blood Group <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  5. Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 6: State (Contains ALL 28 Indian States) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                6. State (India) <span className="text-rose-500">*</span>
              </label>
              <select
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name} — {s.code}
                  </option>
                ))}
              </select>
            </div>

            {/* 7: Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                7. Username <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase());
                  if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: '' }));
                }}
                placeholder="Unique patient handle (e.g. sunita_patil)"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 outline-none transition-colors font-mono ${
                  fieldErrors.username
                    ? 'border-rose-300 focus:border-rose-500 bg-rose-50/30'
                    : 'border-slate-200 focus:border-sky-500 focus:bg-white'
                }`}
              />
              {fieldErrors.username && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.username}</p>
              )}
            </div>

            {/* 8 & 9: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  8. Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  placeholder="Min 8 characters"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 outline-none transition-colors ${
                    fieldErrors.password
                      ? 'border-rose-300 focus:border-rose-500 bg-rose-50/30'
                      : 'border-slate-200 focus:border-sky-500 focus:bg-white'
                  }`}
                />
                {fieldErrors.password && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  9. Confirm Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  placeholder="Confirm password"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 outline-none transition-colors ${
                    fieldErrors.confirmPassword
                      ? 'border-rose-300 focus:border-rose-500 bg-rose-50/30'
                      : 'border-slate-200 focus:border-sky-500 focus:bg-white'
                  }`}
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <PrimaryButton
                type="submit"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
                icon={<Sparkles className="w-4 h-4" />}
              >
                Create Health Wallet Account
              </PrimaryButton>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-bold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Already have an ID? Sign In</span>
            </Link>
            <span className="text-slate-400">9 Required Fields</span>
          </div>
        </div>
      </div>
    </div>
  );
};
