import React from 'react';

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  children,
  icon,
  size = 'md',
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm font-semibold rounded-xl gap-2',
    lg: 'px-5 py-3 text-base font-bold rounded-xl gap-2.5',
  };

  return (
    <button
      className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none select-none active:scale-[0.98] border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon ? <span className="flex-shrink-0 text-slate-500">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
};
