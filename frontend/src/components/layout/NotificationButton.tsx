import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const NotificationButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    {
      id: '1',
      title: 'Lab Report Verified',
      desc: 'Blood Metabolic Panel published by Metropolis Healthcare',
      time: '2 hours ago',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      unread: true,
    },
    {
      id: '2',
      title: 'Consent Access Logged',
      desc: 'Dr. Arvind Kumar reviewed consultation history',
      time: 'Yesterday',
      icon: <ShieldCheck className="w-4 h-4 text-sky-600" />,
      unread: true,
    },
    {
      id: '3',
      title: 'Prescription Refill Notice',
      desc: 'Azithromycin 500mg course completed',
      time: '3 days ago',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      unread: false,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setHasUnread(false);
        }}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sky-500 rounded-full ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Notifications
            </h4>
            <span className="text-[11px] font-semibold text-sky-600 cursor-pointer hover:underline">
              Mark all read
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors ${
                  n.unread ? 'bg-sky-50/40' : ''
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">{n.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{n.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.desc}</p>
                  <span className="text-[10px] text-slate-400 font-medium block mt-1">{n.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 text-center">
            <button
              type="button"
              className="text-xs font-bold text-slate-600 hover:text-sky-600 transition-colors cursor-pointer"
            >
              View Full Audit Trail
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
