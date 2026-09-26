import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FlaskConical,
  Shield,
  ArrowRight,
  AlertCircle,
  Lock,
  User,
  Building2,
  Phone,
  FileCheck2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PrimaryButton } from '../../components/ui/PrimaryButton';

export const LabRegister: React.FC = () => {
  const [labName, setLabName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [laboratoryName, setLaboratoryName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { registerLab } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    const cleanStaff = labName.trim();
    const cleanReg = registrationNumber.trim().toUpperCase();
    const cleanLab = laboratoryName.trim();
    const cleanMobile = mobileNumber.replace(/\D/g, '');
    const cleanUser = username.trim().toLowerCase();

    if (!cleanStaff) {
      setErrorMessage('Please enter the Lab Staff Name.');
      return;
    }
    if (!cleanReg) {
      setErrorMessage('Please enter the Laboratory Registration Number.');
      return;
    }
    if (!cleanLab) {
      setErrorMessage('Please enter the Laboratory Facility Name.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (cleanUser.length < 3) {
      setErrorMessage('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerLab({
        labName: cleanStaff,
        registrationNumber: cleanReg,
        laboratoryName: cleanLab,
        mobileNumber: cleanMobile,
        username: cleanUser,
        password,
      });

      if (res.success) {
        navigate('/lab/dashboard', { replace: true });
      } else {
        setErrorMessage(res.error || 'Failed to complete laboratory registration.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected registration error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-10 sm:px-6 lg:px-8 bg-[#F8FAFC]">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md">
            <FlaskConical className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-center text-2xl font-black text-slate-900 tracking-tight">
          Register Laboratory Account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Accredited diagnostic facility and laboratory staff enrolment
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-soft sm:rounded-3xl border border-slate-200/90 sm:px-10">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Laboratory Facility Name */}
            <div>
              <label
                htmlFor="laboratoryName"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Laboratory Facility Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  id="laboratoryName"
                  type="text"
                  required
                  placeholder="e.g. Apex Diagnostics & Research Lab"
                  value={laboratoryName}
                  onChange={(e) => setLaboratoryName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Lab Staff Name */}
              <div>
                <label
                  htmlFor="labName"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Lab Staff Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="labName"
                    type="text"
                    required
                    placeholder="e.g. Suresh Mehta"
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Registration Number */}
              <div>
                <label
                  htmlFor="registrationNumber"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Registration Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <input
                    id="registrationNumber"
                    type="text"
                    required
                    placeholder="e.g. LAB-TN-2022-9988"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none uppercase font-mono transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Mobile Number */}
              <div>
                <label
                  htmlFor="mobileNumber"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="mobileNumber"
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Staff Username <span className="text-rose-500">*</span>
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="e.g. suresh_lab"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Password (min 8) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 text-[11px] text-teal-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <span>
                Accredited lab accounts can create diagnostic reports and upload original test findings. Lab accounts do NOT receive Health Wallet IDs.
              </span>
            </div>

            <div className="pt-2">
              <PrimaryButton
                type="submit"
                isLoading={isLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl shadow-xs"
              >
                <span>Register Laboratory Staff Account</span>
                <ArrowRight className="w-4 h-4 ml-1.5 inline" />
              </PrimaryButton>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already registered?{' '}
              <Link to="/lab/login" className="font-bold text-teal-600 hover:text-teal-800">
                Sign in to Lab Portal
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-teal-600" />
          <span>Compliant with national clinical laboratory standards</span>
        </div>
      </div>
    </div>
  );
};
export default LabRegister;
