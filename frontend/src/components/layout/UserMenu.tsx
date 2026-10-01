import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, ShieldCheck, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { profile, logout } = useAuth();

  const displayName = profile?.patient_name || 'Patient';
  const displayId = profile?.health_wallet_id || 'Health Wallet';
  const initial = displayName.charAt(0).toUpperCase() || 'P';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 pl-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        aria-label="User profile menu"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-200 text-sky-700 flex items-center justify-center font-bold text-xs">
          {initial}
        </div>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-bold text-slate-900 leading-tight">
            {displayName}
          </span>
          <span className="text-[10px] font-medium text-slate-500 font-mono leading-none mt-0.5">
            {displayId}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <p className="text-xs font-bold text-slate-900">{displayName}</p>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">{displayId}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-sky-50 text-sky-700 border border-sky-200/80">
                <ShieldCheck className="w-3 h-3 text-sky-600" />
                Verified Patient
              </span>
            </div>
          </div>

          <div className="p-1.5 space-y-0.5">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span>Profile & Demographics</span>
            </Link>
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Settings & Privacy</span>
            </Link>
          </div>

          <div className="p-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
