import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from '../../context/AuthContext';
import { LoadingState } from '../ui/LoadingState';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, profile, doctorProfile, labProfile, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <LoadingState message="Verifying national digital health credentials..." />
      </div>
    );
  }

  // If user is completely unauthenticated, redirect to appropriate login page
  if (!user && !profile && !doctorProfile && !labProfile) {
    if (allowedRoles && allowedRoles.includes('LAB') && !allowedRoles.includes('PATIENT')) {
      return <Navigate to="/lab/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are restricted on this route:
  if (allowedRoles && allowedRoles.length > 0) {
    if (role === 'PATIENT' && !allowedRoles.includes('PATIENT')) {
      // Patient attempting to access Doctor or Lab route -> redirect to Patient dashboard
      return <Navigate to="/dashboard" replace />;
    }

    if (role === 'DOCTOR' && !allowedRoles.includes('DOCTOR')) {
      // Doctor attempting to access Patient or Lab route -> redirect to Doctor dashboard
      return <Navigate to="/doctor/dashboard" replace />;
    }

    if (role === 'LAB' && !allowedRoles.includes('LAB')) {
      // Lab attempting to access Patient or Doctor route -> redirect to Lab dashboard
      return <Navigate to="/lab/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
