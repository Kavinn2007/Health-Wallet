import React from 'react';
import { ShieldCheck, CheckCircle2, Edit3 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { HealthCard } from '../components/ui/HealthCard';
import { Badge } from '../components/ui/Badge';
import { SecondaryButton } from '../components/ui/SecondaryButton';

export const Profile: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Profile & Identity"
        subtitle="Verified demographic records and government identity linkages"
        action={
          <SecondaryButton icon={<Edit3 className="w-4 h-4" />}>
            Request Detail Correction
          </SecondaryButton>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Main identity */}
        <div className="lg:col-span-2 space-y-6">
          <HealthCard title="Verified Demographics">
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Full Name (Govt. ID)</span>
                  <span className="text-sm font-bold text-slate-800">Sunita Patil</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Health Wallet ID</span>
                  <span className="text-sm font-mono font-bold text-sky-700">HW-TN-38236621</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Gender</span>
                  <span className="font-bold text-slate-800">Female</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Blood Group</span>
                  <span className="font-bold text-rose-600">B+</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">State Code</span>
                  <span className="font-bold text-slate-800">Tamil Nadu (TN)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Mobile Number</span>
                  <span className="font-mono font-bold text-slate-800">+91 98451 22334</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">Aadhaar Verification</span>
                  <span className="font-mono font-bold text-emerald-700">XXXX-XXXX-9901 (Verified)</span>
                </div>
              </div>
            </div>
          </HealthCard>

          <HealthCard title="Primary Care Association">
            <div className="text-xs text-slate-600 space-y-2">
              <p>
                <strong>Attending Family Physician:</strong> Dr. Arvind Kumar (DOC-AK-8821)
              </p>
              <p>
                <strong>Registered Facility:</strong> Apollo Healthcare Clinic &bull; Chennai Node
              </p>
            </div>
          </HealthCard>
        </div>

        {/* Right Card: Security & ABDM Status */}
        <div className="space-y-6">
          <HealthCard title="Government Linkage">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800">ABHA / ABDM Linked</span>
                </div>
                <Badge variant="success" size="sm">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-sky-50/70 border border-sky-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" />
                  <span className="font-bold text-slate-800">DigiLocker Synced</span>
                </div>
                <Badge variant="primary" size="sm">
                  Connected
                </Badge>
              </div>
            </div>
          </HealthCard>
        </div>
      </div>
    </div>
  );
};
