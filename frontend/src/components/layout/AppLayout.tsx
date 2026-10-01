import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 overflow-x-hidden">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block h-screen sticky top-0 z-20 flex-shrink-0">
        <Sidebar />
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
            <Sidebar onClose={() => setMobileMenuOpen(false)} isMobile />
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <TopBar onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
