import React from 'react';
import { ShieldCheck, CheckCircle2, FileText } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { HealthCard } from '../components/ui/HealthCard';
import { Badge } from '../components/ui/Badge';
import { PrimaryButton } from '../components/ui/PrimaryButton';

export const OrganDonation: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Organ Donation Pledge & Registry"
        subtitle="National Organ and Tissue Transplant Organization (NOTTO) integrated donor declaration"
        badge={
          <Badge variant="info" size="sm">
            Phase 1 UI Shell
          </Badge>
        }
      />

      {/* Pledge Card Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-300/30 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Active NOTTO Pledge
            </span>
            <span className="text-xs text-emerald-200 font-mono">Pledge Ref: OD-IN-889123</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight">
            I have pledged to be an <span className="text-emerald-300">Organ Donor</span>
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl">
            Your generous pledge is securely registered with the National Health Authority and linked
            to your Health Wallet ID. In case of tragedy, your gift can save up to 8 lives.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PrimaryButton
            size="md"
            className="bg-emerald-600 hover:bg-emerald-500 border-none shadow-md"
            icon={<FileText className="w-4 h-4" />}
          >
            Download Donor Card
          </PrimaryButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <HealthCard title="Pledged Organs & Tissues">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                'Kidneys',
                'Heart',
                'Lungs',
                'Liver',
                'Pancreas',
                'Corneas (Eyes)',
                'Skin Tissue',
                'Heart Valves',
                'Bone Marrow',
              ].map((organ) => (
                <div
                  key={organ}
                  className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-800"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{organ}</span>
                </div>
              ))}
            </div>
          </HealthCard>
        </div>

        <div className="space-y-6">
          <HealthCard title="Family Notification">
            <p className="text-xs text-slate-600 leading-relaxed">
              In India, family consent is required at the time of donation. Inform your next of kin
              about your noble decision.
            </p>
            <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
              <span className="text-slate-400 block font-medium">Notified Next of Kin:</span>
              <span className="font-bold text-slate-800 block">Ramesh Patil (Spouse)</span>
            </div>
          </HealthCard>
        </div>
      </div>
    </div>
  );
};
