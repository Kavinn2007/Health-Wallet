import React, { useState } from 'react';
import {
  X,
  Send,
  AlertCircle,
  Clock,
  FileText,
  Activity,
  Pill,
  Microscope,
  Image as ImageIcon,
  CheckCircle2,
  FolderHeart,
  Stethoscope,
} from 'lucide-react';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import {
  createAccessRequest,
  type CreateAccessRequestInput,
} from '../../services/doctors';
import { type MinimalPatientInfo, type RecordCategory } from '../../services/supabase';

interface AccessRequestModalProps {
  patient: MinimalPatientInfo;
  isOpen: boolean;
  onClose: () => void;
  onRequestSubmitted: () => void;
}

const RECORD_OPTIONS: { id: RecordCategory; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: 'CONSULTATIONS',
    label: 'Consultations',
    desc: 'Doctor visit notes, symptoms, and examination history',
    icon: <Stethoscope className="w-4 h-4 text-sky-600" />,
  },
  {
    id: 'DIAGNOSES',
    label: 'Diagnoses',
    desc: 'Clinical disease classifications and diagnoses',
    icon: <Activity className="w-4 h-4 text-emerald-600" />,
  },
  {
    id: 'TREATMENTS',
    label: 'Treatments',
    desc: 'Therapeutic interventions and care plans',
    icon: <FolderHeart className="w-4 h-4 text-indigo-600" />,
  },
  {
    id: 'PRESCRIPTIONS',
    label: 'Prescriptions',
    desc: 'Active medications, dosages, and regimens',
    icon: <Pill className="w-4 h-4 text-amber-600" />,
  },
  {
    id: 'LAB_REPORTS',
    label: 'Lab Reports',
    desc: 'Pathology findings and laboratory test metrics',
    icon: <Microscope className="w-4 h-4 text-purple-600" />,
  },
  {
    id: 'IMAGING',
    label: 'Imaging',
    desc: 'Radiology reports, X-rays, MRI and CT scans',
    icon: <ImageIcon className="w-4 h-4 text-rose-600" />,
  },
  {
    id: 'ALL_RECORDS',
    label: 'All Records',
    desc: 'Comprehensive medical wallet longitudinal history',
    icon: <FileText className="w-4 h-4 text-slate-700" />,
  },
];

const DURATION_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 6, label: '6 hours' },
  { value: 24, label: '24 hours (Recommended)' },
  { value: 168, label: '7 days' },
];

export const AccessRequestModal: React.FC<AccessRequestModalProps> = ({
  patient,
  isOpen,
  onClose,
  onRequestSubmitted,
}) => {
  const [selectedTypes, setSelectedTypes] = useState<RecordCategory[]>([]);
  const [reason, setReason] = useState('');
  const [durationHours, setDurationHours] = useState(24);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const toggleType = (id: RecordCategory) => {
    setErrorMsg('');
    if (id === 'ALL_RECORDS') {
      if (selectedTypes.includes('ALL_RECORDS')) {
        setSelectedTypes([]);
      } else {
        setSelectedTypes(['ALL_RECORDS']);
      }
      return;
    }

    // Toggle specific record type
    if (selectedTypes.includes(id)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== id && t !== 'ALL_RECORDS'));
    } else {
      setSelectedTypes([...selectedTypes.filter((t) => t !== 'ALL_RECORDS'), id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (selectedTypes.length === 0) {
      setErrorMsg('Please select at least one medical record type to request.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Please provide a clinical reason for this access request.');
      return;
    }

    setIsSubmitting(true);
    const result = await createAccessRequest({
      patientId: patient.id,
      patientHwId: patient.health_wallet_id,
      patientName: patient.patient_name,
      requestedRecordTypes: selectedTypes,
      reason: reason.trim(),
      durationHours,
    });
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMsg('Access request successfully sent! Status is currently PENDING patient consent.');
      onRequestSubmitted();
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setErrorMsg(result.error || 'Failed to submit access request.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-bold text-slate-900">Request Medical Record Access</h3>
            <p className="text-xs text-slate-500">Initiate consent-gated clinical record authorization</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Identity Banner */}
        <div className="bg-slate-50 border-b border-slate-200/80 p-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Patient Name:</span>
              <span className="font-bold text-slate-900">{patient.patient_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Health Wallet ID:</span>
              <span className="font-mono font-bold text-sky-800">{patient.health_wallet_id}</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Requested Record Types */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Requested Records <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 mb-2.5">
              Select specific clinical data sets required for diagnosis and care:
            </p>

            <div className="grid grid-cols-1 gap-2">
              {RECORD_OPTIONS.map((item) => {
                const isSelected = selectedTypes.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/60 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleType(item.id)}
                      className="mt-1 w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span className="text-xs font-bold text-slate-900">{item.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Reason for Access */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Reason for Access <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="e.g. Clinical assessment for recurring fever and laboratory evaluation of complete blood count"
              className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-xs text-slate-900 outline-none transition-colors"
            />
          </div>

          {/* Access Duration */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Requested Access Duration</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  type="button"
                  key={d.value}
                  onClick={() => setDurationHours(d.value)}
                  className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition-all ${
                    durationHours === d.value
                      ? 'border-sky-500 bg-sky-50 text-sky-800 font-bold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Consent automatically expires after duration window closes.
            </p>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <SecondaryButton type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              isLoading={isSubmitting}
              icon={<Send className="w-4 h-4" />}
            >
              Send Access Request
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
};
