import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isConfigured } = useAuth();

  const [identifier, setIdentifier] = useState('sunita_patil');
  const [password, setPassword] = useState('PatientPass@123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fromPath = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Please enter your Username or 10-digit Mobile Number.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(identifier, password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(fromPath, { replace: true });
    } else {
      setErrorMsg(result.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-md space-y-6">
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

        {/* Configuration notice if Supabase is pending in .env */}
        {!isConfigured && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Supabase Credentials Notice</p>
              <p className="text-amber-800">
                To connect to live Supabase PostgreSQL, populate <code className="font-mono font-semibold">VITE_SUPABASE_URL</code> and{' '}
                <code className="font-mono font-semibold">VITE_SUPABASE_ANON_KEY</code> in your <code className="font-mono">.env</code>.
                Pre-seeded test account <code className="font-mono font-semibold">sunita_patil</code> or newly registered accounts can be tested now.
              </p>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-card p-6 md:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Patient Portal Sign In
            </h2>
            <p className="text-xs text-slate-500">
              Access your verified medical records and emergency wallet
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Username or 10-Digit Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors font-medium"
                  placeholder="e.g. sunita_patil or 9845122334"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold text-slate-700"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-sm text-slate-900 outline-none transition-colors"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <PrimaryButton
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isSubmitting}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In with Supabase Auth
            </PrimaryButton>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center space-y-3">
            <p className="text-xs text-slate-500">
              New patient without a Health Wallet ID?
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Activate New Health Wallet ID &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>256-Bit Cryptographic Supabase Auth & RLS Guard</span>
        </div>
      </div>
    </div>
  );
};
