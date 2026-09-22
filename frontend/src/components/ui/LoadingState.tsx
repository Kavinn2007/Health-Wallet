import React from 'react';

interface LoadingStateProps {
  message?: string;
  variant?: 'spinner' | 'card-skeleton' | 'table-skeleton';
  count?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading health records...',
  variant = 'spinner',
  count = 3,
}) => {
  if (variant === 'spinner') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 gap-3">
        <div className="w-8 h-8 border-3 border-sky-100 border-t-sky-600 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">{message}</p>
      </div>
    );
  }

  if (variant === 'card-skeleton') {
    return (
      <div className="space-y-4 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-soft animate-pulse space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 bg-slate-200 rounded-md w-1/3" />
              <div className="h-4 bg-slate-200 rounded-md w-1/6" />
            </div>
            <div className="h-3 bg-slate-100 rounded-md w-2/3" />
            <div className="h-3 bg-slate-100 rounded-md w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-4 shadow-soft animate-pulse space-y-3">
      <div className="h-8 bg-slate-100 rounded-lg w-full mb-4" />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-10 bg-slate-50 border-b border-slate-100 rounded flex items-center px-3" />
      ))}
    </div>
  );
};
