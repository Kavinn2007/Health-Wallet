import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ScanLine,
  Pill,
  Users,
  Droplet,
  Heart,
  ShieldAlert,
  QrCode,
  User,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { Logo } from './Logo';

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose, isMobile = false }) => {
  const location = useLocation();

  const mainNavItems = [
    {
      to: '/dashboard',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      to: '/health-records',
      label: 'Health Records',
      icon: <FileText className="w-4 h-4" />,
      badge: '4',
    },
    {
      to: '/scan-report',
      label: 'Scan Report',
      icon: <ScanLine className="w-4 h-4" />,
      badge: 'AI Ready',
      badgeVariant: 'sky',
    },
    {
      to: '/medicines',
      label: 'Medicines',
      icon: <Pill className="w-4 h-4" />,
    },
    {
      to: '/family',
      label: 'Family Members',
      icon: <Users className="w-4 h-4" />,
    },
    {
      to: '/blood-donation',
      label: 'Blood Donation',
      icon: <Droplet className="w-4 h-4" />,
    },
    {
      to: '/organ-donation',
      label: 'Organ Donation',
      icon: <Heart className="w-4 h-4" />,
    },
    {
      to: '/emergency',
      label: 'Emergency SOS',
      icon: <ShieldAlert className="w-4 h-4" />,
      danger: true,
    },
    {
      to: '/offline-wallet',
      label: 'Offline Wallet',
      icon: <QrCode className="w-4 h-4" />,
    },
  ];

  const bottomNavItems = [
    {
      to: '/profile',
      label: 'Profile',
      icon: <User className="w-4 h-4" />,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
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
        <Logo />
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

      {/* Main Navigation links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Main Menu
          </p>
          <nav className="space-y-1" aria-label="Main Navigation">
            {mainNavItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-150 group outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    isActive
                      ? item.danger
                        ? 'bg-rose-50 text-rose-700 shadow-2xs font-bold'
                        : 'bg-sky-50 text-sky-700 shadow-2xs font-bold'
                      : item.danger
                      ? 'text-rose-600 hover:bg-rose-50/70 hover:text-rose-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`transition-colors ${
                        isActive
                          ? item.danger
                            ? 'text-rose-600'
                            : 'text-sky-600'
                          : item.danger
                          ? 'text-rose-500'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        item.badgeVariant === 'sky'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Account & System
          </p>
          <nav className="space-y-1" aria-label="System Navigation">
            {bottomNavItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-150 group outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <span
                    className={`transition-colors ${
                      isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Verified Status Card / Quick Helper */}
      <div className="p-3 border-t border-slate-100">
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>ABDM Synchronized</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Unified digital health wallet verified and synced with National Health Stack.
          </p>
          <div className="pt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Node: Tamil Nadu</span>
            <span className="text-sky-600 font-semibold cursor-pointer hover:underline">
              Check
            </span>
          </div>
        </div>

        <NavLink
          to="/login"
          onClick={onClose}
          className="mt-2 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit / Sign In</span>
        </NavLink>
      </div>
    </aside>
  );
};
