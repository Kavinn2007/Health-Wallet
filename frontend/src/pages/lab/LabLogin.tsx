import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FlaskConical, Shield, ArrowRight, AlertCircle, Lock, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PrimaryButton } from '../../components/ui/PrimaryButton';

export const LabLogin: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await login(identifier, password, 'LAB');
      if (res.success && res.role === 'LAB') {
        navigate('/lab/dashboard', { replace: true });
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify your lab credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#F8FAFC]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Portal Icon & Title */}
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md">
            <FlaskConical className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-center text-2xl font-black text-slate-900 tracking-tight">
          Laboratory Staff Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Authorized diagnostic personnel authentication
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-soft sm:rounded-3xl border border-slate-200/90 sm:px-10">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Lab Username or Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="identifier"
                  type="text"
                  required
                  placeholder="e.g. city_lab or 9876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password
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

            <div className="pt-2">
              <PrimaryButton
                type="submit"
                isLoading={isLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl shadow-xs"
              >
                <span>Sign In to Lab Console</span>
                <ArrowRight className="w-4 h-4 ml-1.5 inline" />
              </PrimaryButton>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-500">
              New laboratory or staff member?{' '}
              <Link to="/lab/register" className="font-bold text-teal-600 hover:text-teal-800">
                Register Laboratory Account
              </Link>
            </p>

            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              <Link to="/login" className="hover:text-slate-700 transition-colors">
                Patient Portal
              </Link>
              <span>&bull;</span>
              <Link to="/doctor" className="hover:text-slate-700 transition-colors">
                Doctor Console
              </Link>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-teal-600" />
          <span>Restricted to accredited diagnostic facilities</span>
        </div>
      </div>
    </div>
  );
};
export default LabLogin;
