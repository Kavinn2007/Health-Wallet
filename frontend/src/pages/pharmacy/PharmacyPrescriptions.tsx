import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Pill,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  User,
  Calendar,
  Building2,
  FileText,
  Filter,
  Check,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getPharmacyPrescriptions,
  pharmacyViewPrescription,
  pharmacyDispensePrescription,
  type AuthorizedPrescriptionView,
} from '../../services/pharmacy';
import type { DispensingStatus } from '../../services/supabase';
import { Modal } from '../../components/ui/Modal';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SecondaryButton } from '../../components/ui/SecondaryButton';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/LoadingState';

export const PharmacyPrescriptions: React.FC = () => {
  const { pharmacyProfile } = useAuth();
  const [searchParams] = useSearchParams();

  const [hwIdQuery, setHwIdQuery] = useState(searchParams.get('hwid') || '');
  const [prescriptions, setPrescriptions] = useState<AuthorizedPrescriptionView[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Prescription for Viewing / Dispensing
  const [selectedRx, setSelectedRx] = useState<AuthorizedPrescriptionView | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dispense Form State
  const [dispenseStatus, setDispenseStatus] = useState<DispensingStatus>('DISPENSED');
  const [quantityDispensed, setQuantityDispensed] = useState('');
  const [dispenseNotes, setDispenseNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadPrescriptions = async (hwidFilter?: string) => {
    if (!pharmacyProfile?.id) return;
    setIsLoading(true);
    try {
      const list = await getPharmacyPrescriptions(pharmacyProfile.id, hwidFilter);
      setPrescriptions(list);
    } catch (err) {
      console.warn('Error fetching pharmacy prescriptions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions(hwIdQuery);
  }, [pharmacyProfile?.id]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPrescriptions(hwIdQuery);
  };

  const handleOpenRxModal = async (rx: AuthorizedPrescriptionView) => {
    setSelectedRx(rx);
    setDispenseStatus(rx.dispensing_status === 'PARTIALLY_DISPENSED' ? 'PARTIALLY_DISPENSED' : 'DISPENSED');
    setQuantityDispensed('');
    setDispenseNotes('');
    setActionError(null);
    setActionSuccess(null);
    setIsModalOpen(true);

    // Call view RPC to log PHARMACY_VIEW_PRESCRIPTION audit & PRESCRIPTION_VIEWED_BY_PHARMACY notification
    try {
      await pharmacyViewPrescription(rx.prescription_id);
    } catch (e) {
      console.warn('Error recording view event:', e);
    }
  };

  const handleDispenseSubmit = async () => {
    if (!selectedRx || !pharmacyProfile?.id) return;

    if (selectedRx.dispensing_status === 'DISPENSED' && dispenseStatus === 'DISPENSED') {
      setActionError('This prescription has already been fully dispensed.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const res = await pharmacyDispensePrescription({
        prescriptionId: selectedRx.prescription_id,
        pharmacyId: pharmacyProfile.id,
        status: dispenseStatus,
        quantityDispensed: quantityDispensed.trim() || undefined,
        notes: dispenseNotes.trim() || undefined,
      });

      if (!res.success) {
        setActionError(res.error || 'Failed to complete dispensing.');
        setIsSubmitting(false);
        return;
      }

      setActionSuccess(
        dispenseStatus === 'DISPENSED'
          ? 'Prescription marked as fully dispensed!'
          : dispenseStatus === 'PARTIALLY_DISPENSED'
          ? 'Prescription marked as partially dispensed.'
          : 'Prescription marked as not dispensed.'
      );

      // Refresh list
      await loadPrescriptions(hwIdQuery);

      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setActionError(err?.message || 'An error occurred during fulfillment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Prescriptions for Fulfillment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            View actively shared prescriptions authorized by patients and record medication fulfillment status.
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-soft">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Filter by Health Wallet ID (e.g. HW-TN-10293847)..."
              value={hwIdQuery}
              onChange={(e) => setHwIdQuery(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <PrimaryButton
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 text-xs font-bold"
              icon={<Search className="w-3.5 h-3.5" />}
            >
              Filter
            </PrimaryButton>

            {hwIdQuery && (
              <SecondaryButton
                onClick={() => {
                  setHwIdQuery('');
                  loadPrescriptions('');
                }}
                className="px-4 py-2.5 text-xs font-semibold"
              >
                Clear
              </SecondaryButton>
            )}
          </div>
        </form>
      </div>

      {/* Prescriptions List */}
      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <LoadingState message="Loading authorized prescriptions..." />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center shadow-soft space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Pill className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Prescriptions Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {hwIdQuery
              ? `No active prescriptions shared with this pharmacy for Health Wallet ID "${hwIdQuery}".`
              : 'There are currently no active prescriptions shared with this pharmacy.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((rx) => {
            const isDispensed = rx.dispensing_status === 'DISPENSED';
            const isPartial = rx.dispensing_status === 'PARTIALLY_DISPENSED';

            return (
              <div
                key={rx.prescription_id}
                className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-soft hover:shadow-card transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top row: Medicine Name, Dosage, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-slate-900 truncate">
                          {rx.medicine_name}
                        </h3>
                        {rx.dosage && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold">
                            {rx.dosage}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Patient: <strong className="text-slate-800">{rx.patient_name}</strong> &bull;{' '}
                        <span className="font-mono text-slate-600 font-semibold">{rx.health_wallet_id}</span>
                      </p>
                    </div>

                    <Badge
                      variant={
                        isDispensed
                          ? 'success'
                          : isPartial
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {rx.dispensing_status || 'Pending Dispense'}
                    </Badge>
                  </div>

                  {/* Prescription Regimen Metadata */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block">Frequency:</span>
                      <span className="font-bold text-slate-800">{rx.frequency || 'As prescribed'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Duration:</span>
                      <span className="font-bold text-slate-800">{rx.duration || 'Standard course'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Prescribed Date:</span>
                      <span className="font-mono font-bold text-slate-800">{rx.prescribed_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Doctor:</span>
                      <span className="font-bold text-slate-800 truncate block">{rx.doctor_name}</span>
                    </div>
                  </div>

                  {rx.instructions && (
                    <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100 text-[11px] text-amber-900">
                      <span className="font-bold">Instructions: </span>
                      {rx.instructions}
                    </div>
                  )}
                </div>

                {/* Card Footer: Action button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Shared: {new Date(rx.shared_at).toLocaleDateString()}
                  </span>

                  <PrimaryButton
                    onClick={() => handleOpenRxModal(rx)}
                    className="px-4 py-2 text-xs font-bold"
                    icon={<Pill className="w-3.5 h-3.5" />}
                  >
                    {isDispensed ? 'View Dispensed Record' : 'Dispense Prescription'}
                  </PrimaryButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: View Details & Dispensing Form */}
      {selectedRx && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Prescription Fulfillment"
          subtitle={`Patient: ${selectedRx.patient_name} (${selectedRx.health_wallet_id})`}
          maxWidth="xl"
        >
          <div className="space-y-4 text-xs">
            {actionSuccess ? (
              <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-emerald-950">{actionSuccess}</h4>
                <p className="text-emerald-800 text-xs">
                  Dispensation status has been recorded in the patient's Health Wallet audit trail.
                </p>
              </div>
            ) : (
              <>
                {/* Doctor Prescription Details (Immutable) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Doctor Prescription (Read-Only)
                    </span>
                    <Badge variant="neutral" size="sm">
                      Immutable
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Medication</span>
                      <span className="text-sm font-bold text-slate-900">{selectedRx.medicine_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Dosage</span>
                      <span className="text-sm font-bold text-slate-900">{selectedRx.dosage || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Frequency</span>
                      <span className="font-semibold text-slate-800">{selectedRx.frequency || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Duration</span>
                      <span className="font-semibold text-slate-800">{selectedRx.duration || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Prescribing Doctor</span>
                      <span className="font-semibold text-slate-800">{selectedRx.doctor_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Facility / Hospital</span>
                      <span className="font-semibold text-slate-800">{selectedRx.hospital_name || 'N/A'}</span>
                    </div>
                  </div>

                  {selectedRx.instructions && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-400 block font-medium mb-0.5">Instructions</span>
                      <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                        {selectedRx.instructions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {actionError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {/* Dispensing Action Form */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Record Dispensation Status
                  </h4>

                  {/* Status Radio Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDispenseStatus('DISPENSED')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        dispenseStatus === 'DISPENSED'
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                      <span className="block text-xs">Dispensed</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDispenseStatus('PARTIALLY_DISPENSED')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        dispenseStatus === 'PARTIALLY_DISPENSED'
                          ? 'bg-amber-50 border-amber-600 text-amber-950 font-bold ring-2 ring-amber-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Clock className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                      <span className="block text-xs">Partially</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDispenseStatus('NOT_DISPENSED')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        dispenseStatus === 'NOT_DISPENSED'
                          ? 'bg-rose-50 border-rose-600 text-rose-950 font-bold ring-2 ring-rose-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <XCircle className="w-4 h-4 mx-auto mb-1 text-rose-600" />
                      <span className="block text-xs">Not Dispensed</span>
                    </button>
                  </div>

                  {/* Quantity Dispensed */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Quantity Dispensed <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 10 Tablets (5-day supply)"
                      value={quantityDispensed}
                      onChange={(e) => setQuantityDispensed(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  {/* Pharmacist Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pharmacist Notes / Batch Info <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Advised patient to take after meals. Batch #B4920."
                      value={dispenseNotes}
                      onChange={(e) => setDispenseNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <SecondaryButton onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                    Close
                  </SecondaryButton>
                  <PrimaryButton
                    onClick={handleDispenseSubmit}
                    disabled={isSubmitting}
                    icon={<Check className="w-3.5 h-3.5" />}
                  >
                    {isSubmitting ? 'Recording...' : 'Confirm Dispensation'}
                  </PrimaryButton>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
