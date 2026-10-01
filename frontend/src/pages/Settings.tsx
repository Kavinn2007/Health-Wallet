import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { HealthCard } from '../components/ui/HealthCard';
import { SecondaryButton } from '../components/ui/SecondaryButton';

export const Settings: React.FC = () => {
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [breakGlassAlerts, setBreakGlassAlerts] = useState(true);
  const [language, setLanguage] = useState('en');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Privacy Permissions"
        subtitle="Control health data consent, emergency notifications, and regional language display"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Privacy & Consent */}
          <HealthCard title="Consent & Data Governance">
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800">Real-time SMS on Record Access</p>
                  <p className="text-slate-500 mt-0.5">
                    Receive immediate SMS whenever a clinic, hospital, or lab reads your record.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800">Emergency Break-Glass Instant Alerts</p>
                  <p className="text-slate-500 mt-0.5">
                    Immediately notify registered ICE next-of-kin if emergency protocol is triggered.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={breakGlassAlerts}
                  onChange={(e) => setBreakGlassAlerts(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </HealthCard>

          {/* Language & Localization */}
          <HealthCard title="Regional Language Selection">
            <div className="space-y-3 text-xs">
              <label className="block text-slate-700 font-bold">Select Interface Language:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full sm:w-72 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
              >
                <option value="en">English (Universal National)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="ml">Malayalam (മലയാളം)</option>
              </select>
            </div>
          </HealthCard>
        </div>

        {/* Data Portability */}
        <div className="space-y-6">
          <HealthCard title="Data Sovereignty & Portability">
            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Under the Indian National Digital Health Framework, you hold complete ownership over
                all clinical data.
              </p>

              <div className="pt-2">
                <SecondaryButton
                  size="sm"
                  className="w-full"
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Export All Records (FHIR JSON)
                </SecondaryButton>
              </div>
            </div>
          </HealthCard>
        </div>
      </div>
    </div>
  );
};
