import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, ShieldAlert, QrCode } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { NotificationButton } from './NotificationButton';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';

interface TopBarProps {
  onMenuClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  return (
    <header className="h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 flex-shrink-0">
      {/* Mobile Menu & Logo */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Logo />
      </div>

      {/* Desktop Search */}
      <div className="hidden md:flex flex-1 max-w-md">
        <SearchBar />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {/* Quick Offline QR Shortcut */}
        <Link
          to="/offline-wallet"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-colors"
          title="Open Offline Health QR Code"
        >
          <QrCode className="w-3.5 h-3.5 text-sky-600" />
          <span>My QR</span>
        </Link>

        {/* Emergency SOS Shortcut */}
        <Link
          to="/emergency"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 rounded-xl transition-colors"
          title="Emergency SOS Medical Assistance"
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span className="hidden xs:inline">SOS</span>
        </Link>

        <div className="h-6 w-px bg-slate-200 mx-0.5 hidden sm:block" />

        <NotificationButton />
        <UserMenu />
      </div>
    </header>
  );
};
