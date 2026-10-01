import React from 'react';
import {
  Building2,
  MapPin,
  Phone,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Droplet,
  Flame,
  CheckCircle2,
  Minus,
  Mail,
  Navigation,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import type { Hospital } from '../../services/hospitals';

interface HospitalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospital: Hospital | null;
  onRequestEmergencyBlood?: (hospital: Hospital) => void;
  showEmergencyAction?: boolean;
}

export const HospitalDetailsModal: React.FC<HospitalDetailsModalProps> = ({
  isOpen,
  onClose,
  hospital,
  onRequestEmergencyBlood,
  showEmergencyAction = true,
}) => {
  if (!hospital) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hospital Details & Clinical Capabilities"
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs text-slate-700">
        {/* Hospital Header Banner */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Building2 className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {hospital.hospital_name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-semibold">
                  {hospital.hospital_code}
                </span>
                {hospital.verified ? (
                  <Badge variant="info" size="sm" icon={<ShieldCheck className="w-3 h-3 text-blue-600" />}>
                    Verified Medical Facility
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm" icon={<AlertCircle className="w-3 h-3 text-amber-600" />}>
                    Verification Pending
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Location & Contact Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <MapPin className="w-4 h-4 text-rose-600" />
              <span>Location & Address</span>
            </div>
            <div className="space-y-1 text-slate-600">
              <p className="font-medium text-slate-800">{hospital.address || 'Address not listed'}</p>
              <p>
                {hospital.city}
                {hospital.district && hospital.district !== hospital.city ? `, ${hospital.district}` : ''}
              </p>
              <p>
                {hospital.state_name}
                {hospital.pincode ? ` - ${hospital.pincode}` : ''}
              </p>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Helpline & Emergency Contacts</span>
            </div>
            <div className="space-y-1.5 text-slate-600">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">General Phone</span>
                <span className="font-bold text-slate-800 text-xs">{hospital.phone_number || 'Not available'}</span>
              </div>
              {hospital.emergency_contact && (
                <div>
                  <span className="text-[11px] text-rose-500 font-medium block">Emergency Hotline</span>
                  <span className="font-bold text-rose-700 text-xs">{hospital.emergency_contact}</span>
                </div>
              )}
              {hospital.website && (
                <div className="pt-1">
                  <a
                    href={hospital.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-semibold"
                  >
                    <span>Visit Official Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clinical & Emergency Capabilities */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Emergency & Transfusion Services
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Emergency Department</p>
                <p className="text-[11px] text-slate-500">24/7 Trauma and Acute Care</p>
              </div>
              {hospital.emergency_available ? (
                <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}>
                  Available
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm" icon={<Minus className="w-3 h-3 text-slate-400" />}>
                  Not Listed
                </Badge>
              )}
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">Licensed Blood Bank</p>
                <p className="text-[11px] text-slate-500">Storage & Blood Component Separation</p>
              </div>
              {hospital.blood_bank_available ? (
                <Badge variant="danger" size="sm" icon={<Droplet className="w-3 h-3 text-rose-600" />}>
                  Available
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm" icon={<Minus className="w-3 h-3 text-slate-400" />}>
                  Not Listed
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Regulatory & Safety Notice */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
          Hospital profile data reflects verified clinical facility records. Blood component availability is subject to real-time blood bank inventory and statutory cross-matching protocol.
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <SecondaryButton onClick={onClose} size="md">
            Close
          </SecondaryButton>

          {showEmergencyAction && onRequestEmergencyBlood && (
            <PrimaryButton
              size="md"
              icon={<Flame className="w-4 h-4 text-rose-100" />}
              className="bg-rose-600 hover:bg-rose-700 text-xs font-bold border-none"
              onClick={() => {
                onClose();
                onRequestEmergencyBlood(hospital);
              }}
            >
              Request Emergency Blood
            </PrimaryButton>
          )}
        </div>
      </div>
    </Modal>
  );
};
