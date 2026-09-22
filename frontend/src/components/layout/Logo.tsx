import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ collapsed = false, className = '' }) => {
  return (
    <Link
      to="/dashboard"
      className={`inline-flex items-center gap-3 group outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl p-1 ${className}`}
      aria-label="Health Wallet Home"
    >
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      </div>

      {!collapsed && (
        <div className="flex flex-col">
          <span className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
            Health<span className="text-sky-600">Wallet</span>
          </span>
          <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
            National Health ID
          </span>
        </div>
      )}
    </Link>
  );
};
