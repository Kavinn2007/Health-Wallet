import React, { useState } from 'react';
import { PhoneCall, AlertOctagon, CheckCircle2, Lock } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { HealthCard } from '../components/ui/HealthCard';
import { Badge } from '../components/ui/Badge';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { Modal } from '../components/ui/Modal';

export const Emergency: React.FC = () => {
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Medical Assistance & SOS"
        subtitle="Immediate clinical emergency profile with break-glass override for emergency responders"
        badge={
          <Badge variant="danger" size="sm">
            Emergency Ready
          </Badge>
        }
      />

      {/* SOS Alert Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-card border border-rose-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="animate-pulse w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
              High Priority Medical Response
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Emergency SOS Medical Card
          </h2>

          <p className="text-xs sm:text-sm text-rose-100/90 max-w-xl">
            In an emergency, authorized paramedics or ER physicians can unlock vital medical records
            and blood details via the Emergency Break-Glass protocol.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <a href="tel:112">
            <PrimaryButton
              size="lg"
              variant="danger"
              className="w-full sm:w-auto shadow-lg"
              icon={<PhoneCall className="w-5 h-5" />}
            >
              Call 112 (National Emergency)
            </PrimaryButton>
          </a>
          <SecondaryButton
            size="lg"
            className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white/20"
            icon={<AlertOctagon className="w-5 h-5 text-rose-400" />}
            onClick={() => setShowBreakGlassModal(true)}
          >
            Trigger Break-Glass SOS
          </SecondaryButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Critical Health Vitals Card */}
        <HealthCard title="Critical Emergency Profile" subtitle="Publicly accessible to first responders">
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl flex items-center justify-between">
              <span className="font-bold text-slate-700">Blood Group</span>
              <span className="text-base font-extrabold text-rose-600">B+ (Rh Positive)</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
              <span className="font-bold text-slate-700">Known Allergies</span>
              <span className="font-semibold text-emerald-700">None Recorded</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
              <span className="font-bold text-slate-700">Chronic Conditions</span>
              <span className="font-semibold text-slate-800">None (Healthy)</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
              <span className="font-bold text-slate-700">Current Medications</span>
              <span className="font-semibold text-slate-800">Azithromycin 500mg</span>
            </div>
          </div>
        </HealthCard>

        {/* ICE Contacts */}
        <HealthCard title="In Case of Emergency (ICE)" subtitle="Primary next-of-kin contacts">
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Ramesh Patil</span>
                <Badge variant="primary" size="sm">
                  Spouse
                </Badge>
              </div>
              <p className="text-slate-500 font-mono">+91 97312 34567</p>
              <div className="pt-2 flex items-center gap-2">
                <a
                  href="tel:+919731234567"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:underline"
                >
                  <PhoneCall className="w-3 h-3" />
                  Call Contact
                </a>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Kavinn P.</span>
                <Badge variant="neutral" size="sm">
                  Son
                </Badge>
              </div>
              <p className="text-slate-500 font-mono">+91 98451 22334</p>
              <div className="pt-2 flex items-center gap-2">
                <a
                  href="tel:+919845122334"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:underline"
                >
                  <PhoneCall className="w-3 h-3" />
                  Call Contact
                </a>
              </div>
            </div>
          </div>
        </HealthCard>

        {/* Break-Glass Security & Audit */}
        <HealthCard title="Break-Glass Protocol" subtitle="Emergency access audit guarantee">
          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <p>
                When activated, emergency providers receive 1-hour read access to critical health
                history.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p>
                Every emergency query is cryptographically signed and permanently logged in your Audit
                Trail with the doctor's registration ID.
              </p>
            </div>
          </div>
        </HealthCard>
      </div>

      {/* Break Glass Modal */}
      <Modal
        isOpen={showBreakGlassModal}
        onClose={() => setShowBreakGlassModal(false)}
        title="Emergency Break-Glass Access Request"
        subtitle="Attending Physician / Paramedic Emergency Override"
        footer={
          <>
            <SecondaryButton onClick={() => setShowBreakGlassModal(false)}>Cancel</SecondaryButton>
            <PrimaryButton
              variant="danger"
              onClick={() => {
                alert('Emergency Break-Glass access token logged and granted for 60 minutes.');
                setShowBreakGlassModal(false);
              }}
            >
              Confirm Emergency Access
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-700">
          <p className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-medium">
            <strong>WARNING:</strong> This action is strictly restricted to life-saving emergency
            care. An immediate SMS and push notification will be broadcast to patient ICE contacts.
          </p>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Stated Clinical Purpose</label>
            <textarea
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              rows={3}
              defaultValue="Trauma triage & unconscious patient allergy verification."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
