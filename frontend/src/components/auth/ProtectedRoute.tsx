import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingState } from '../ui/LoadingState';

export const ProtectedRoute: React.FC = () => {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <LoadingState message="Restoring verified patient session..." />
      </div>
    );
  }

  // If user or profile is not present, redirect to /login
  if (!user && !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
