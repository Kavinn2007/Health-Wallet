import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  KeyRound,
  User,
  LogOut,
  X,
  Stethoscope,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../../context/AuthContext';

interface DoctorSidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export const DoctorSidebar: React.FC<DoctorSidebarProps> = ({ onClose, isMobile = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { doctorProfile, logout } = useAuth();

  const handleLogout = async () => {
    if (onClose) onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    {
      to: '/doctor/dashboard',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      to: '/doctor/patients',
      label: 'Patients',
      icon: <Users className="w-4 h-4" />,
    },
    {
      to: '/doctor/access-requests',
      label: 'Access Requests',
      icon: <KeyRound className="w-4 h-4" />,
    },
    {
      to: '/doctor/profile',
      label: 'Doctor Profile',
      icon: <User className="w-4 h-4" />,
    },
  ];

  return (
    <aside
      className={`h-full flex flex-col bg-white border-r border-slate-200/90 select-none ${
        isMobile ? 'w-72' : 'w-64'
      }`}
    >
      {/* Header with Logo */}
      <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
            MD Portal
          </span>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Practitioner Identity Card in Sidebar */}
      <div className="p-3.5 mx-3 mt-3 bg-gradient-to-br from-sky-50/80 to-slate-50 border border-sky-100 rounded-xl space-y-1">
        <div className="flex items-center gap-2 text-sky-800">
          <Stethoscope className="w-4 h-4 text-sky-600 flex-shrink-0" />
          <p className="text-xs font-bold text-slate-900 truncate">
            {doctorProfile?.doctor_name || 'Dr. Practitioner'}
          </p>
        </div>
        <p className="text-[11px] font-mono text-sky-700 truncate pl-6">
          Reg: {doctorProfile?.registration_number || 'TN-MC-XXXX'}
        </p>
        <p className="text-[11px] text-slate-500 truncate pl-6 flex items-center gap-1">
          <Building2 className="w-3 h-3 text-slate-400" />
          <span>{doctorProfile?.hospital_name || 'Affiliated Hospital'}</span>
        </p>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Clinical Console
          </p>
          <nav className="space-y-1" aria-label="Doctor Navigation">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-150 group outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`transition-colors ${
                        isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ABDM Security Footer */}
      <div className="p-3 border-t border-slate-100">
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Consent-Gated Access</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Medical records cannot be retrieved without explicit verified patient consent.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out of Doctor Console</span>
        </button>
      </div>
    </aside>
  );
};
