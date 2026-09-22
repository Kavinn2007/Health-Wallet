import React from 'react';
import { Pill, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { HealthCard } from '../components/ui/HealthCard';
import { Badge } from '../components/ui/Badge';
import { SecondaryButton } from '../components/ui/SecondaryButton';

export const Medicines: React.FC = () => {
  const medications = [
    {
      id: 'med-1',
      name: 'Azithromycin',
      dosage: '500mg',
      frequency: 'Once Daily (8:00 PM after dinner)',
      duration: '3 Days (Course)',
      instructions: 'Take with a full glass of water. Complete the entire 3-day course.',
      prescribedBy: 'Dr. Arvind Kumar (DOC-AK-8821)',
      dispensedBy: 'Rajesh Gupta (MedPlus Pharmacy)',
      dispensedAt: '2026-09-07',
      status: 'Active',
      adherence: 'Taken Today (Day 2 of 3)',
    },
    {
      id: 'med-2',
      name: 'Paracetamol',
      dosage: '650mg',
      frequency: 'SOS (As needed for fever > 100°F)',
      duration: 'As required',
      instructions: 'Keep minimum 6 hours gap between two doses. Max 3 tablets in 24 hours.',
      prescribedBy: 'Dr. Arvind Kumar',
      dispensedBy: 'MedPlus Care Pharmacy',
      dispensedAt: '2026-09-07',
      status: 'As Needed (SOS)',
      adherence: 'Not required today',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicines & Prescriptions"
        subtitle="Digital medication schedule, dosage instructions, and verified pharmacy dispensations"
        action={
          <SecondaryButton icon={<RefreshCw className="w-4 h-4" />}>
            Request Prescription Refill
          </SecondaryButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-4">
          {medications.map((med) => (
            <div
              key={med.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-soft hover:shadow-card transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">{med.name}</h3>
                      <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {med.dosage}
                      </span>
                      <Badge variant="success" size="sm">
                        {med.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Prescribed by <span className="text-slate-700 font-semibold">{med.prescribedBy}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{med.adherence}</span>
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Frequency & Timing:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    {med.frequency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Duration:</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{med.duration}</span>
                </div>
              </div>

              <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600">
                <span className="font-bold text-slate-700">Special Instructions: </span>
                {med.instructions}
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Dispensed by: {med.dispensedBy}</span>
                <span className="font-mono">Fulfillment: {med.dispensedAt}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Medication Schedule / Adherence Card */}
        <div className="space-y-6">
          <HealthCard title="Daily Dose Tracker" subtitle="Today's medication schedule">
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="font-bold text-slate-900">Azithromycin 500mg</p>
                    <p className="text-[11px] text-slate-500">Night • 8:00 PM</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700">Done</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="font-bold text-slate-900">Paracetamol 650mg</p>
                    <p className="text-[11px] text-slate-500">As needed (SOS)</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-400">Standby</span>
              </div>
            </div>
          </HealthCard>

          <HealthCard title="Verified Dispensation Policy">
            <p className="text-xs text-slate-600 leading-relaxed">
              All medicines are electronically validated against original digital prescription tokens
              before dispensation to prevent unauthorized duplicates.
            </p>
          </HealthCard>
        </div>
      </div>
    </div>
  );
};
