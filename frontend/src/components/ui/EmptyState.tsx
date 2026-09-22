import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`text-center py-12 px-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-soft flex items-center justify-center text-sky-600 mb-4">
        {icon}
      </div>
      <h4 className="text-base font-bold text-slate-800 tracking-tight mb-1">
        {title}
      </h4>
      <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-5">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
