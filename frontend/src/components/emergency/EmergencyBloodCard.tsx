import React from 'react';
import {
  AlertCircle,
  Building2,
  Clock,
  Droplet,
  MapPin,
  ShieldAlert,
  PhoneCall,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import { EmergencyRequestStatusBadge } from './EmergencyRequestStatusBadge';
import type {
  EmergencyBloodRequest,
  EmergencyBloodResponse,
} from '../../services/emergencyBlood';

interface EmergencyBloodCardProps {
  request: EmergencyBloodRequest;
  response?: EmergencyBloodResponse | null;
  onHelpClick: (request: EmergencyBloodRequest) => void;
  onVerificationClick: (request: EmergencyBloodRequest) => void;
  onCallSimulatorClick: (request: EmergencyBloodRequest) => void;
  isResponding?: boolean;
}

export const EmergencyBloodCard: React.FC<EmergencyBloodCardProps> = ({
  request,
  response,
  onHelpClick,
  onVerificationClick,
  onCallSimulatorClick,
  isResponding = false,
}) => {
  const isTerminal = ['FULFILLED', 'CANCELLED', 'EXPIRED'].includes(request.status);
  const hasResponded = !!response;
  const isWilling = response?.response_status === 'WILLING_TO_HELP';
  const isPending = response?.response_status === 'VERIFICATION_PENDING';
  const isVerified = response?.response_status === 'VERIFIED';
  const isRejected = response?.response_status === 'REJECTED';

  const hoursRemaining = Math.max(1, Math.round(request.required_within_minutes / 60));

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all shadow-sm ${
        request.priority === 'CRITICAL'
          ? 'bg-linear-to-br from-rose-50/70 via-white to-red-50/40 border-rose-300 shadow-rose-100/50'
          : 'bg-white border-amber-200'
      }`}
      id={`emergency-card-${request.request_code}`}
    >
      {/* Top Banner Accent */}
      <div className="bg-rose-600 text-white px-4 py-2 flex items-center justify-between text-xs font-bold tracking-wide">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 animate-pulse" />
          <span>🚨 EMERGENCY BLOOD REQUIREMENT</span>
        </div>
        <span className="font-mono text-[11px] bg-rose-700/80 px-2 py-0.5 rounded text-rose-100">
          {request.request_code}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Main Details Grid */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-rose-600">
                🩸 {request.blood_group}
              </span>
              <span className="text-xl font-extrabold text-slate-800">•</span>
              <span className="text-lg font-bold text-slate-900">
                {request.units_required} {request.units_required === 1 ? 'Unit' : 'Units'} Required
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200 ml-1">
                {request.priority}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-1 font-semibold text-slate-900">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {request.hospital_name}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {request.hospital_location}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-rose-700 font-semibold">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                Within {hoursRemaining} {hoursRemaining === 1 ? 'Hour' : 'Hours'}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 pt-0.5">
              Authorized by: <strong className="text-slate-700">{request.authorized_department}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 flex-shrink-0">
            <EmergencyRequestStatusBadge status={request.status} size="md" />
            {response && (
              <div className="pt-1">
                <EmergencyRequestStatusBadge status={response.response_status} size="sm" type="response" />
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Status / Feedback Strip */}
        {hasResponded ? (
          <div
            className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isVerified
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : isRejected
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : isPending
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {isVerified ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 font-bold" />
              ) : isPending ? (
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              )}
              <div>
                <span className="font-bold">
                  {isVerified
                    ? '✓ Hospital Verified Readiness'
                    : isPending
                    ? 'Verification Pending'
                    : '✓ Willingness to Help Recorded'}
                </span>
                <span className="block text-[11px] opacity-80">
                  {isVerified
                    ? 'The hospital blood bank has verified your response. Follow hospital guidance.'
                    : isPending
                    ? 'Hospital clinical team is reviewing your response and donation timing.'
                    : 'Final medical verification required by hospital personnel.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {isWilling && (
                <PrimaryButton
                  onClick={() => onVerificationClick(request)}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-xs"
                >
                  Continue Verification
                </PrimaryButton>
              )}
              <SecondaryButton
                onClick={() => onCallSimulatorClick(request)}
                size="sm"
                className="text-xs gap-1.5 text-slate-700"
              >
                <PhoneCall className="w-3.5 h-3.5 text-sky-600" />
                <span>AI Call Test</span>
              </SecondaryButton>
            </div>
          </div>
        ) : (
          <div className="bg-white/80 border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800 block">
                Compatible voluntary donors in this region are alerted.
              </span>
              Your response is securely shared with the authorized hospital/blood bank.
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <SecondaryButton
                onClick={() => onCallSimulatorClick(request)}
                size="sm"
                className="text-xs gap-1.5 text-slate-700 border-slate-200"
                id={`btn-call-sim-${request.request_code}`}
              >
                <PhoneCall className="w-3.5 h-3.5 text-sky-600" />
                <span>AI Call Dispatch</span>
              </SecondaryButton>

              <PrimaryButton
                onClick={() => onHelpClick(request)}
                disabled={isResponding || isTerminal}
                size="md"
                className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 font-extrabold text-xs tracking-wide shadow-sm"
                id={`btn-i-can-help-${request.request_code}`}
              >
                {isResponding ? 'Recording...' : 'I CAN HELP'}
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
