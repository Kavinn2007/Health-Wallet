import React from 'react';
import { Download, WifiOff, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { HealthCard } from '../components/ui/HealthCard';
import { Badge } from '../components/ui/Badge';
import { PrimaryButton } from '../components/ui/PrimaryButton';

export const OfflineWallet: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Offline Health Wallet & QR Code"
        subtitle="Zero-internet emergency verifiable credentials and digital health card"
        badge={
          <Badge variant="success" size="sm">
            Offline Ready
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Offline Card Representation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-card border border-sky-800/40 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-3 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
                    Govt. of India • ABDM Compliant
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight">Sunita Patil</h2>

                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Health Wallet ID</p>
                  <p className="text-lg font-mono font-bold tracking-widest text-sky-200">
                    HW-TN-38236621
                  </p>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-4 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Blood</span>
                    <span className="font-bold text-rose-400">B+</span>
                  </div>
                  <div className="w-px h-6 bg-slate-700" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Gender / Age</span>
                    <span className="font-bold">Female / 42</span>
                  </div>
                  <div className="w-px h-6 bg-slate-700" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">State</span>
                    <span className="font-bold">Tamil Nadu</span>
                  </div>
                </div>
              </div>

              {/* Verified QR Code Card */}
              <div className="p-4 bg-white rounded-2xl shadow-xl flex flex-col items-center gap-2 flex-shrink-0">
                {/* SVG QR Code Simulation */}
                <div className="w-36 h-36 bg-slate-950 rounded-xl p-2 flex items-center justify-center">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full text-white fill-current"
                    shapeRendering="crispEdges"
                  >
                    <rect x="0" y="0" width="100" height="100" fill="white" />
                    {/* Corners */}
                    <rect x="10" y="10" width="25" height="25" fill="#0F172A" />
                    <rect x="15" y="15" width="15" height="15" fill="white" />
                    <rect x="18" y="18" width="9" height="9" fill="#0284C7" />

                    <rect x="65" y="10" width="25" height="25" fill="#0F172A" />
                    <rect x="70" y="15" width="15" height="15" fill="white" />
                    <rect x="73" y="18" width="9" height="9" fill="#0284C7" />

                    <rect x="10" y="65" width="25" height="25" fill="#0F172A" />
                    <rect x="15" y="70" width="15" height="15" fill="white" />
                    <rect x="18" y="73" width="9" height="9" fill="#0284C7" />

                    {/* Matrix data dots */}
                    <rect x="42" y="12" width="6" height="6" fill="#0F172A" />
                    <rect x="52" y="18" width="6" height="6" fill="#0F172A" />
                    <rect x="42" y="28" width="6" height="6" fill="#0F172A" />
                    <rect x="12" y="42" width="6" height="6" fill="#0F172A" />
                    <rect x="22" y="50" width="6" height="6" fill="#0F172A" />
                    <rect x="45" y="45" width="10" height="10" fill="#0284C7" />
                    <rect x="65" y="45" width="6" height="6" fill="#0F172A" />
                    <rect x="78" y="55" width="6" height="6" fill="#0F172A" />
                    <rect x="45" y="65" width="6" height="6" fill="#0F172A" />
                    <rect x="58" y="75" width="6" height="6" fill="#0F172A" />
                    <rect x="72" y="72" width="6" height="6" fill="#0F172A" />
                    <rect x="82" y="82" width="6" height="6" fill="#0F172A" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-slate-800 tracking-wider uppercase">
                  Scan to Verify
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5 text-sky-400" />
                Verified Offline Cryptographic Token
              </span>

              <div className="flex items-center gap-2">
                <PrimaryButton size="sm" icon={<Download className="w-3.5 h-3.5" />}>
                  Save Offline Card Image
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>

        {/* Security and Offline Usage Details */}
        <div className="space-y-6">
          <HealthCard title="How Offline QR Works">
            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  Contains cryptographically signed clinical vitals, allergies, and emergency
                  contacts.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  Any ABDM scanner, hospital kiosk, or ER paramedic can read this without active
                  cellular data.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Zero confidential records are leaked; tamper-proof digital signature.</span>
              </li>
            </ul>
          </HealthCard>
        </div>
      </div>
    </div>
  );
};
