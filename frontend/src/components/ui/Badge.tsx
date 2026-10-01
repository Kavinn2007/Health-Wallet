import React from 'react';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] font-semibold gap-1 rounded-md',
    md: 'px-2.5 py-1 text-xs font-semibold gap-1.5 rounded-lg',
  };

  const variantClasses = {
    primary: 'bg-sky-50 text-sky-700 border border-sky-200/80',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200/80',
  };

  return (
    <span
      className={`inline-flex items-center tracking-wide ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {icon ? <span className="flex-shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
};
