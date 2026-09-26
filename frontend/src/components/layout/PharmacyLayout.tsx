import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, Store, LogOut } from 'lucide-react';
import { PharmacySidebar } from './PharmacySidebar';
import { NotificationButton } from './NotificationButton';
import { useAuth } from '../../context/AuthContext';

export const PharmacyLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pharmacyProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/pharmacy/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 overflow-x-hidden">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block h-screen sticky top-0 z-20 flex-shrink-0">
        <PharmacySidebar />
      </div>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full max-w-xs w-full shadow-2xl animate-in slide-in-from-left duration-200">
            <PharmacySidebar onClose={() => setMobileMenuOpen(false)} isMobile />
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* TopBar */}
        <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-800 md:hidden rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>{pharmacyProfile?.pharmacy_name || 'Pharmacy Console'}</span>
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Pharmacist: {pharmacyProfile?.pharmacist_name || 'Authorized Dispenser'} • Reg: {pharmacyProfile?.registration_number || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationButton />

            <button
              type="button"
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100 ml-2"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
