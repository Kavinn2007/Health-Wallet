import React from 'react';
import {
  Building2,
  MapPin,
  Phone,
  CheckCircle2,
  Minus,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Droplet,
  Flame,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import type { Hospital } from '../../services/hospitals';

interface HospitalCardProps {
  hospital: Hospital;
  onView: (hospital: Hospital) => void;
  onRequestEmergencyBlood?: (hospital: Hospital) => void;
  showEmergencyAction?: boolean;
}

export const HospitalCard: React.FC<HospitalCardProps> = ({
  hospital,
  onView,
  onRequestEmergencyBlood,
  showEmergencyAction = true,
}) => {
  return (
    <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-rose-300 hover:shadow-md transition-all flex flex-col justify-between gap-4">
      {/* Top Header: Hospital Name & Status Badge */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-rose-600 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Building2 className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                🏥 {hospital.hospital_name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>
                  📍 {hospital.city}, {hospital.state_name}
                  {hospital.district && hospital.district !== hospital.city ? ` (${hospital.district})` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0">
            {hospital.verified ? (
              <Badge variant="info" size="sm" icon={<ShieldCheck className="w-3 h-3 text-blue-600" />}>
                ✓ Verified Hospital
              </Badge>
            ) : (
              <Badge variant="warning" size="sm" icon={<AlertCircle className="w-3 h-3 text-amber-600" />}>
                Verification Pending
              </Badge>
            )}
          </div>
        </div>

        {/* Address and Phone */}
        <div className="pt-2 text-xs space-y-1 text-slate-600 border-t border-slate-100">
          {hospital.address && (
            <p className="line-clamp-2 text-slate-600">
              <span className="font-medium text-slate-700">Address:</span> {hospital.address}
              {hospital.pincode ? ` - ${hospital.pincode}` : ''}
            </p>
          )}

          {hospital.phone_number && (
            <p className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>📞 {hospital.phone_number}</span>
            </p>
          )}
        </div>
      </div>

      {/* Facility Badges: Emergency & Blood Bank */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
        {hospital.emergency_available ? (
          <Badge
            variant="success"
            size="sm"
            icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}
            className="font-medium"
          >
            ✓ Emergency Available
          </Badge>
        ) : (
          <Badge
            variant="neutral"
            size="sm"
            icon={<Minus className="w-3 h-3 text-slate-400" />}
            className="text-slate-500"
          >
            — Emergency Availability Not Listed
          </Badge>
        )}

        {hospital.blood_bank_available ? (
          <Badge
            variant="danger"
            size="sm"
            icon={<Droplet className="w-3 h-3 text-rose-600" />}
            className="font-medium"
          >
            ✓ Blood Bank Available
          </Badge>
        ) : (
          <Badge
            variant="neutral"
            size="sm"
            icon={<Minus className="w-3 h-3 text-slate-400" />}
            className="text-slate-500"
          >
            — Blood Bank Availability Not Listed
          </Badge>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <SecondaryButton
          size="sm"
          onClick={() => onView(hospital)}
          className="text-xs font-semibold hover:border-slate-300"
        >
          View Hospital
        </SecondaryButton>

        {showEmergencyAction && onRequestEmergencyBlood && (
          <PrimaryButton
            size="sm"
            icon={<Flame className="w-3.5 h-3.5 text-rose-100" />}
            className="bg-rose-600 hover:bg-rose-700 text-xs font-bold shadow-xs border-none"
            onClick={() => onRequestEmergencyBlood(hospital)}
          >
            Request Emergency Blood
          </PrimaryButton>
        )}
      </div>
    </div>
  );
};
