import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  FilePlus2,
  Bell,
  LogOut,
  X,
  FlaskConical,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../../context/AuthContext';

interface LabSidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export const LabSidebar: React.FC<LabSidebarProps> = ({ onClose, isMobile = false }) => {
  const navigate = useNavigate();
  const { labProfile, logout } = useAuth();

  const handleLogout = async () => {
    if (onClose) onClose();
    await logout();
    navigate('/lab/login', { replace: true });
  };

  const navItems = [
    {
      to: '/lab/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      to: '/lab/patients',
      label: 'Find Patient',
      icon: <Search className="w-4 h-4" />,
    },
    {
      to: '/lab/reports/new',
      label: 'Create Lab Report',
      icon: <FilePlus2 className="w-4 h-4" />,
    },
    {
      to: '/lab/notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 h-full bg-white border-r border-slate-200/90 flex flex-col justify-between select-none">
      {/* Top Header & Branding */}
      <div>
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60">
              Lab Portal
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

        {/* Laboratory Profile Banner */}
        <div className="p-4 mx-3 my-3 bg-slate-50/80 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {labProfile?.laboratory_name || 'Accredited Diagnostics'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {labProfile?.lab_name || 'Laboratory Staff'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-teal-800 font-mono font-medium bg-teal-50/60 px-2 py-0.5 rounded-md border border-teal-100/60">
            <ShieldCheck className="w-3 h-3 text-teal-600 flex-shrink-0" />
            <span className="truncate">{labProfile?.registration_number || 'VERIFIED LAB'}</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => isMobile && onClose && onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer & Logout */}
      <div className="p-3 border-t border-slate-100">
        <div className="px-3 py-2 text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span className="truncate">{labProfile?.laboratory_name || 'Diagnostic Laboratory'}</span>
          </div>
          <p className="text-[10px]">Staff Console &bull; Role LAB</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full mt-2 flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
