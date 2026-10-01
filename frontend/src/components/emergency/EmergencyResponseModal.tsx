import React from 'react';
import { Modal } from '../ui/Modal';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import { Heart, Building2, MapPin, Droplet, ShieldCheck, ArrowRight } from 'lucide-react';
import type { EmergencyBloodRequest } from '../../services/emergencyBlood';

interface EmergencyResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: EmergencyBloodRequest | null;
  onContinueVerification: () => void;
}

export const EmergencyResponseModal: React.FC<EmergencyResponseModalProps> = ({
  isOpen,
  onClose,
  request,
  onContinueVerification,
}) => {
  if (!request) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Emergency Response Recorded"
      maxWidth="md"
    >
      <div className="space-y-6 text-center py-2">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
          <Heart className="w-8 h-8 fill-rose-500 text-rose-500 animate-pulse" />
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-slate-900">
            Thank you for responding. ❤️
          </h3>
          <p className="text-sm text-slate-600 font-medium">
            Your willingness to help has been received for:
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <Droplet className="w-5 h-5 fill-rose-600 text-rose-600" />
            </span>
            <div>
              <p className="text-xs text-slate-500 font-medium">Requirement</p>
              <p className="text-base font-bold text-slate-900">
                🩸 {request.blood_group} Blood — {request.units_required} {request.units_required === 1 ? 'Unit' : 'Units'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs text-slate-500 font-medium">Authorized Hospital</p>
              <p className="text-sm font-bold text-slate-900">
                🏥 {request.hospital_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-slate-200 text-slate-700">
              <MapPin className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs text-slate-500 font-medium">Location</p>
              <p className="text-sm font-semibold text-slate-800">
                📍 {request.hospital_location}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-left text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Next Step: Verification Protocol</span>
          </div>
          <p className="leading-relaxed">
            Your eligibility and blood-group information will be verified by the authorized hospital/blood bank. Your willingness to help does not automatically confirm blood donation.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <SecondaryButton onClick={onClose} size="md">
            Close
          </SecondaryButton>
          <PrimaryButton
            onClick={() => {
              onClose();
              onContinueVerification();
            }}
            size="md"
            className="gap-2 bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
          >
            <span>Continue Verification</span>
            <ArrowRight className="w-4 h-4" />
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
};
