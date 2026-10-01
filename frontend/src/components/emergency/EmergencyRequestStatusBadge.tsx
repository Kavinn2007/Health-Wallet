import React from 'react';
import { Badge } from '../ui/Badge';
import { AlertCircle, CheckCircle2, Clock, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { EmergencyBloodRequestStatus, EmergencyBloodResponseStatus } from '../../services/emergencyBlood';

interface StatusBadgeProps {
  status: EmergencyBloodRequestStatus | EmergencyBloodResponseStatus | string;
  type?: 'request' | 'response';
  size?: 'sm' | 'md';
}

export const EmergencyRequestStatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'request', size = 'sm' }) => {
  switch (status) {
    case 'ACTIVE':
      return (
        <Badge variant="danger" size={size} icon={<AlertCircle className="w-3 h-3 text-rose-500 animate-pulse" />}>
          ACTIVE EMERGENCY
        </Badge>
      );
    case 'PARTIALLY_FULFILLED':
      return (
        <Badge variant="warning" size={size} icon={<Clock className="w-3 h-3 text-amber-500" />}>
          PARTIALLY FULFILLED
        </Badge>
      );
    case 'FULFILLED':
      return (
        <Badge variant="success" size={size} icon={<CheckCircle2 className="w-3 h-3 text-emerald-500" />}>
          FULFILLED
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="neutral" size={size} icon={<XCircle className="w-3 h-3 text-slate-400" />}>
          CANCELLED
        </Badge>
      );
    case 'EXPIRED':
      return (
        <Badge variant="neutral" size={size} icon={<Clock className="w-3 h-3 text-slate-400" />}>
          EXPIRED
        </Badge>
      );
    // Response statuses
    case 'WILLING_TO_HELP':
      return (
        <Badge variant="info" size={size} icon={<ShieldCheck className="w-3 h-3 text-blue-500" />}>
          WILLING TO HELP
        </Badge>
      );
    case 'AVAILABLE':
      return (
        <Badge variant="success" size={size} icon={<CheckCircle2 className="w-3 h-3 text-emerald-500" />}>
          AVAILABLE (CALL)
        </Badge>
      );
    case 'PARTIALLY_AVAILABLE':
      return (
        <Badge variant="warning" size={size} icon={<AlertTriangle className="w-3 h-3 text-amber-500" />}>
          PARTIALLY AVAILABLE
        </Badge>
      );
    case 'UNAVAILABLE':
      return (
        <Badge variant="neutral" size={size} icon={<XCircle className="w-3 h-3 text-slate-400" />}>
          UNAVAILABLE
        </Badge>
      );
    case 'VERIFICATION_PENDING':
      return (
        <Badge variant="warning" size={size} icon={<Clock className="w-3 h-3 text-amber-500" />}>
          VERIFICATION PENDING
        </Badge>
      );
    case 'VERIFIED':
      return (
        <Badge variant="success" size={size} icon={<ShieldCheck className="w-3 h-3 text-emerald-600 font-bold" />}>
          VERIFIED BY HOSPITAL
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="danger" size={size} icon={<XCircle className="w-3 h-3 text-rose-500" />}>
          INELIGIBLE / REJECTED
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size={size}>
          {String(status).replace(/_/g, ' ')}
        </Badge>
      );
  }
};
