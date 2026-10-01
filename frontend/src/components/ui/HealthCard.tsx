import React from 'react';

interface HealthCardProps {
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const HealthCard: React.FC<HealthCardProps> = ({
  title,
  subtitle,
  action,
  children,
  footer,
  className = '',
  bodyClassName = '',
}) => {
  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-2xl shadow-soft overflow-hidden transition-all duration-200 ${className}`}
    >
      {(title || action) && (
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs font-medium text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      <div className={`p-6 ${bodyClassName}`}>{children}</div>

      {footer && (
        <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-600">
          {footer}
        </div>
      )}
    </div>
  );
};
