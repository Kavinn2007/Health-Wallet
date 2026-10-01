import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Pill,
  LogOut,
  X,
  Store,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../../context/AuthContext';

interface PharmacySidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export const PharmacySidebar: React.FC<PharmacySidebarProps> = ({ onClose, isMobile = false }) => {
  const navigate = useNavigate();
  const { pharmacyProfile, logout } = useAuth();

  const handleLogout = async () => {
    if (onClose) onClose();
    await logout();
    navigate('/pharmacy/login', { replace: true });
  };

  const navItems = [
    {
      to: '/pharmacy/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      to: '/pharmacy/patients',
      label: 'Find Patient',
      icon: <Search className="w-4 h-4" />,
    },
    {
      to: '/pharmacy/prescriptions',
      label: 'Prescriptions',
      icon: <Pill className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 h-full bg-white border-r border-slate-200/90 flex flex-col justify-between select-none">
      {/* Top Header & Branding */}
      <div>
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              Pharmacy
            </span>
          </div>

          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Pharmacy Profile Banner */}
        <div className="p-4 mx-3 my-3 bg-slate-50/80 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {pharmacyProfile?.pharmacy_name || 'Accredited Pharmacy'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {pharmacyProfile?.pharmacist_name || 'Registered Pharmacist'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-mono font-medium bg-emerald-50/60 px-2 py-0.5 rounded-md border border-emerald-100/60">
            <ShieldCheck className="w-3 h-3 text-emerald-600 flex-shrink-0" />
            <span className="truncate">{pharmacyProfile?.registration_number || 'VERIFIED CHEMIST'}</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Logout Action */}
      <div className="p-3 border-t border-slate-100">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
