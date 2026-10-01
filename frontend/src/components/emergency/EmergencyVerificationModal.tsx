import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import {
  CheckCircle2,
  AlertTriangle,
  Building2,
  Clock,
  Droplet,
  ShieldCheck,
  FileCheck,
  MapPin,
  Info,
} from 'lucide-react';
import type { EmergencyBloodRequest, DonorVerificationConfirmations } from '../../services/emergencyBlood';

interface EmergencyVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: EmergencyBloodRequest | null;
  donorBloodGroup?: string;
  onSubmit: (confirmations: DonorVerificationConfirmations) => Promise<boolean>;
}

export const EmergencyVerificationModal: React.FC<EmergencyVerificationModalProps> = ({
  isOpen,
  onClose,
  request,
  donorBloodGroup = 'O+',
  onSubmit,
}) => {
  const [bloodGroupConfirmed, setBloodGroupConfirmed] = useState(false);
  const [availabilityConfirmed, setAvailabilityConfirmed] = useState(false);
  const [hospitalAuthorityUnderstood, setHospitalAuthorityUnderstood] = useState(false);
  const [unitsOffered, setUnitsOffered] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!request) return null;

  const allConfirmed = bloodGroupConfirmed && availabilityConfirmed && hospitalAuthorityUnderstood;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allConfirmed) {
      setErrorMsg('Please confirm all three eligibility requirements.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const ok = await onSubmit({
        bloodGroupConfirmed,
        availabilityConfirmed,
        hospitalAuthorityUnderstood,
        unitsOffered: unitsOffered > 0 ? unitsOffered : 1,
        notes: notes.trim() || undefined,
      });

      if (ok) {
        setIsSubmittedSuccess(true);
      } else {
        setErrorMsg('Failed to submit verification. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSubmittedSuccess(false);
    setBloodGroupConfirmed(false);
    setAvailabilityConfirmed(false);
    setHospitalAuthorityUnderstood(false);
    setErrorMsg(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={isSubmittedSuccess ? 'Verification Status' : 'Emergency Blood Verification'}
      maxWidth="lg"
    >
      {isSubmittedSuccess ? (
        <div className="py-6 text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">
              Your response has been submitted for verification.
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Status:{' '}
              <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                VERIFICATION_PENDING
              </span>
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 max-w-md mx-auto text-left space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />
              <span>What happens next?</span>
            </div>
            <p>
              The authorized medical team at <strong>{request.hospital_name}</strong> has received your readiness update. They will contact you or update your verification status after checking medical compatibility and donation timing.
            </p>
            <p className="text-[11px] text-slate-500 italic">
              Notice: Health Wallet does not determine medical eligibility. Confirmation is exclusively granted by authorized hospital/blood bank personnel.
            </p>
          </div>

          <div className="pt-2">
            <PrimaryButton onClick={handleResetAndClose} size="md">
              Done
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Emergency Request Summary Header */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Emergency Blood Request
                </p>
                <p className="text-sm font-mono font-bold text-rose-700">
                  {request.request_code}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                {request.priority} PRIORITY
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-slate-500 font-medium">Hospital</p>
                <p className="font-semibold text-slate-900 truncate" title={request.hospital_name}>
                  {request.hospital_name}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Location</p>
                <p className="font-semibold text-slate-900 truncate">
                  {request.hospital_location}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Blood Group</p>
                <p className="font-bold text-rose-600">
                  {request.blood_group} ({request.units_required} {request.units_required === 1 ? 'Unit' : 'Units'})
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Required Within</p>
                <p className="font-semibold text-slate-900">
                  {Math.round(request.required_within_minutes / 60)} Hours
                </p>
              </div>
            </div>
          </div>

          {/* Donor Verification Confirmations Checklist */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-rose-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Donor Readiness Affirmations
              </h4>
            </div>

            <div className="space-y-3 bg-white border border-slate-200 rounded-2xl p-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={bloodGroupConfirmed}
                  onChange={(e) => setBloodGroupConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                  id="chk-blood-group"
                />
                <div className="text-xs text-slate-700 leading-relaxed select-none">
                  <span className="font-semibold text-slate-900 block group-hover:text-rose-700 transition-colors">
                    My blood group information ({donorBloodGroup}) is correct.
                  </span>
                  I confirm that my blood group matches the donor profile recorded on Health Wallet.
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={availabilityConfirmed}
                  onChange={(e) => setAvailabilityConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                  id="chk-availability"
                />
                <div className="text-xs text-slate-700 leading-relaxed select-none">
                  <span className="font-semibold text-slate-900 block group-hover:text-rose-700 transition-colors">
                    I am currently available to donate.
                  </span>
                  I am able to proceed to the designated hospital center if verified by the medical team.
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={hospitalAuthorityUnderstood}
                  onChange={(e) => setHospitalAuthorityUnderstood(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                  id="chk-authority"
                />
                <div className="text-xs text-slate-700 leading-relaxed select-none">
                  <span className="font-semibold text-slate-900 block group-hover:text-rose-700 transition-colors">
                    I understand that final eligibility will be determined by the authorized hospital/blood bank.
                  </span>
                  Submitting readiness does not guarantee donation acceptance. Clinical vitals and hemoglobin will be verified on site.
                </div>
              </label>
            </div>

            {/* Optional Units & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1" htmlFor="input-units-offered">
                  Units Available to Offer
                </label>
                <input
                  id="input-units-offered"
                  type="number"
                  min="1"
                  max="4"
                  value={unitsOffered}
                  onChange={(e) => setUnitsOffered(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1" htmlFor="input-notes">
                  Additional Notes (Optional)
                </label>
                <input
                  id="input-notes"
                  type="text"
                  placeholder="e.g. Can reach hospital within 45 mins"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  maxLength={150}
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <SecondaryButton onClick={handleResetAndClose} size="md" disabled={isSubmitting}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              size="md"
              disabled={!allConfirmed || isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 font-bold"
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
            </PrimaryButton>
          </div>
        </form>
      )}
    </Modal>
  );
};
