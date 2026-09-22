import React from 'react';
import { Droplet, Heart, CheckCircle2, MapPin } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { HealthCard } from '../components/ui/HealthCard';
import { Badge } from '../components/ui/Badge';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';

export const BloodDonation: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Blood Donation & Registry"
        subtitle="National voluntary blood donor registry, emergency donor matching, and donation history"
        badge={
          <Badge variant="info" size="sm">
            Phase 1 UI Shell
          </Badge>
        }
      />

      {/* Donor Status Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-200 border border-rose-300/30 text-xs font-bold flex items-center gap-1.5">
              <Droplet className="w-3.5 h-3.5 fill-current" />
              Verified Voluntary Donor
            </span>
            <span className="text-xs text-rose-200 font-mono">Registry ID: BDR-TN-9921</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight">
            Blood Group: <span className="text-rose-300">B+ (Rh Positive)</span>
          </h2>

          <p className="text-xs sm:text-sm text-rose-100/80 max-w-xl">
            You are registered as an active emergency voluntary donor. You can receive blood from B+,
            B-, O+, O- and donate to B+ and AB+.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PrimaryButton
            size="md"
            className="bg-rose-600 hover:bg-rose-500 border-none shadow-md"
            icon={<Heart className="w-4 h-4" />}
          >
            Find Blood Bank Nearby
          </PrimaryButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Emergency Blood Requests */}
        <div className="lg:col-span-2 space-y-6">
          <HealthCard
            title="Urgent Emergency Blood Calls"
            subtitle="Verified clinical requests near Chennai / Tamil Nadu"
          >
            <div className="space-y-3">
              <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    B+
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        Govt. General Hospital • ICU Node
                      </h4>
                      <Badge variant="danger" size="sm">
                        Critical Needed
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      Chennai Central • 3.2 km away
                    </p>
                    <p className="text-xs text-slate-600 mt-1">2 Units required for emergency surgical trauma.</p>
                  </div>
                </div>

                <SecondaryButton size="sm" className="border-rose-200 text-rose-700 hover:bg-rose-100/50">
                  Respond to SOS
                </SecondaryButton>
              </div>
            </div>
          </HealthCard>

          <HealthCard title="Donation History Log">
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Rotary Blood Bank • Whole Blood (350ml)</p>
                  <p className="text-slate-400">Anna Nagar Center • Verified certificate issued</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-slate-500">2026-03-15</span>
                  <Badge variant="success" size="sm" className="block mt-1">
                    Completed
                  </Badge>
                </div>
              </div>
            </div>
          </HealthCard>
        </div>

        {/* Eligibility Checklist */}
        <div className="space-y-6">
          <HealthCard title="Donor Eligibility Checklist">
            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Age between 18 and 65 years.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Weight above 45 kg.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Hemoglobin level &gt; 12.5 g/dL.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Minimum 90 days gap since last whole blood donation.</span>
              </li>
            </ul>
          </HealthCard>
        </div>
      </div>
    </div>
  );
};
