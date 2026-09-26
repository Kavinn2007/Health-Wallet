import React, { useState, useEffect } from 'react';
import {
  Store,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  X,
  Share2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import {
  searchPharmacies,
  patientSharePrescription,
} from '../../services/pharmacy';
import type { PharmacyProfile } from '../../services/supabase';

interface SharePrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptionId: string;
  medicineName: string;
  dosage?: string;
  onShared?: () => void;
}

export const SharePrescriptionModal: React.FC<SharePrescriptionModalProps> = ({
  isOpen,
  onClose,
  prescriptionId,
  medicineName,
  dosage,
  onShared,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pharmacies, setPharmacies] = useState<PharmacyProfile[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<PharmacyProfile | null>(null);
  const [durationHours, setDurationHours] = useState(48);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedPharmacy(null);
      setError(null);
      setSuccess(false);
      loadPharmacies('');
    }
  }, [isOpen]);

  const loadPharmacies = async (q: string) => {
    const list = await searchPharmacies(q);
    setPharmacies(list);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    loadPharmacies(val);
  };

  const handleConfirmShare = async () => {
    if (!selectedPharmacy) {
      setError('Please select a pharmacy to share this prescription with.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await patientSharePrescription(
        prescriptionId,
        selectedPharmacy.id,
        durationHours
      );

      if (!res.success) {
        setError(res.error || 'Failed to share prescription.');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      if (onShared) onShared();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Unexpected error while sharing prescription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Prescription with Pharmacy"
      subtitle={`Medication: ${medicineName}${dosage ? ` (${dosage})` : ''}`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {success ? (
          <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-emerald-950">Prescription Shared Successfully!</h4>
            <p className="text-emerald-800 text-xs">
              <strong>{selectedPharmacy?.pharmacy_name}</strong> is now authorized to view and fulfill this prescription.
            </p>
          </div>
        ) : (
          <>
            {/* Security notice */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Controlled Authorization: </span>
                Only this selected pharmacy will be granted access to this specific prescription for dispensing. Your full medical history remains private.
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Pharmacy Search Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Pharmacy
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by Pharmacy Name or Registration No..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Pharmacies List */}
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {pharmacies.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  No verified pharmacies found matching your search.
                </div>
              ) : (
                pharmacies.map((pharmacy) => {
                  const isSelected = selectedPharmacy?.id === pharmacy.id;
                  return (
                    <div
                      key={pharmacy.id}
                      onClick={() => setSelectedPharmacy(pharmacy)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Store className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {pharmacy.pharmacy_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {pharmacy.pharmacist_name} • Reg: {pharmacy.registration_number}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Duration Selector */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Access Valid For:
              </span>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
              >
                <option value={24}>24 Hours</option>
                <option value={48}>48 Hours (Recommended)</option>
                <option value={72}>72 Hours</option>
                <option value={168}>7 Days</option>
              </select>
            </div>

            {/* Confirmation Box */}
            {selectedPharmacy && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900">
                <p className="font-bold text-xs">Confirm Sharing:</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Are you sure you want to share <strong>{medicineName}</strong> with{' '}
                  <strong>{selectedPharmacy.pharmacy_name}</strong>?
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <SecondaryButton onClick={onClose} disabled={isSubmitting}>
                Cancel
              </SecondaryButton>
              <PrimaryButton
                onClick={handleConfirmShare}
                disabled={!selectedPharmacy || isSubmitting}
                icon={<Share2 className="w-3.5 h-3.5" />}
              >
                {isSubmitting ? 'Sharing...' : 'Share Prescription'}
              </PrimaryButton>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
