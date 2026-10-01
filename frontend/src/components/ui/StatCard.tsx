import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    text: string;
    isPositive?: boolean;
  };
  iconBgColor?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  trend,
  iconBgColor = 'bg-sky-50 text-sky-600 border border-sky-100',
  className = '',
}) => {
  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-2xl p-5 shadow-soft hover:shadow-card transition-all duration-200 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {value}
          </p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgColor}`}>
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500 font-medium">{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold ml-auto ${
                trend.isPositive ? 'text-emerald-600' : 'text-slate-600'
              }`}
            >
              {trend.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
