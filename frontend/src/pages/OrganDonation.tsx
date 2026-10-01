import React, { useState, useEffect } from 'react';
import {
  Heart,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  History,
  Lock,
  Edit3,
  RefreshCw,
  Info,
  Check,
  Award,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { HealthCard } from '../components/ui/HealthCard';
import { Badge } from '../components/ui/Badge';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import type {
  OrganDonorFullData,
  OrganDonationConsentRecord,
  OrganKey,
} from '../services/organDonation';
import {
  getMyOrganDonorProfile,
  registerOrganDonor,
  updateOrganDonationPreferences,
  revokeOrganDonationConsent,
  reactivateOrganDonor,
  getMyOrganConsentHistory,
  ORGAN_LABELS,
  ORGAN_DONATION_DISCLAIMER,
  CONSENT_CONFIRMATION_STATEMENT,
  DEFAULT_CONSENT_TEXT,
  DEFAULT_REVOKE_TEXT,
  hasAtLeastOneOrganSelected,
} from '../services/organDonation';

const ORGAN_KEYS: OrganKey[] = [
  'kidneys',
  'liver',
  'heart',
  'lungs',
  'pancreas',
  'intestines',
  'corneas',
  'skin',
  'bone',
  'tissues_other',
];

const INITIAL_ORGAN_SELECTIONS: Record<OrganKey, boolean> = {
  kidneys: false,
  liver: false,
  heart: false,
  lungs: false,
  pancreas: false,
  intestines: false,
  corneas: false,
  skin: false,
  bone: false,
  tissues_other: false,
};

export const OrganDonation: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [donorData, setDonorData] = useState<OrganDonorFullData | null>(null);
  const [consentHistory, setConsentHistory] = useState<OrganDonationConsentRecord[]>([]);

  // Registration form state
  const [regPrefs, setRegPrefs] = useState<Record<OrganKey, boolean>>({ ...INITIAL_ORGAN_SELECTIONS });
  const [regConfirmed, setRegConfirmed] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Update preferences modal state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updatePrefs, setUpdatePrefs] = useState<Record<OrganKey, boolean>>({ ...INITIAL_ORGAN_SELECTIONS });
  const [updateConfirmed, setUpdateConfirmed] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Revoke consent modal state
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokeConfirmed, setRevokeConfirmed] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Reactivate modal state
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [reactivatePrefs, setReactivatePrefs] = useState<Record<OrganKey, boolean>>({ ...INITIAL_ORGAN_SELECTIONS });
  const [reactivateConfirmed, setReactivateConfirmed] = useState(false);
  const [reactivateError, setReactivateError] = useState<string | null>(null);

  // Status banner / feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [profileRes, historyRes] = await Promise.all([
        getMyOrganDonorProfile(),
        getMyOrganConsentHistory(),
      ]);

      if (profileRes.data) {
        setDonorData(profileRes.data);
        // Pre-fill update preferences from current data
        const currentPrefs: Record<OrganKey, boolean> = {
          kidneys: profileRes.data.preferences.kidneys,
          liver: profileRes.data.preferences.liver,
          heart: profileRes.data.preferences.heart,
          lungs: profileRes.data.preferences.lungs,
          pancreas: profileRes.data.preferences.pancreas,
          intestines: profileRes.data.preferences.intestines,
          corneas: profileRes.data.preferences.corneas,
          skin: profileRes.data.preferences.skin,
          bone: profileRes.data.preferences.bone,
          tissues_other: profileRes.data.preferences.tissues_other,
        };
        setUpdatePrefs(currentPrefs);
        setReactivatePrefs(currentPrefs);
      } else {
        setDonorData(null);
      }

      setConsentHistory(historyRes.data || []);
    } catch (err: any) {
      console.error('Failed to load organ donation data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle registration submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!hasAtLeastOneOrganSelected(regPrefs)) {
      setRegError('Please select at least one organ or tissue for donation.');
      return;
    }

    if (!regConfirmed) {
      setRegError('You must explicitly confirm the voluntary donation acknowledgement checkbox.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await registerOrganDonor({
        preferences: regPrefs,
        confirmedCheckbox: regConfirmed,
        consentText: DEFAULT_CONSENT_TEXT,
        consentVersion: 'v1.0',
      });

      if (!res.success) {
        setRegError(res.error || 'Failed to complete registration.');
        return;
      }

      setStatusMessage({
        type: 'success',
        text: 'Your voluntary organ donation registration has been recorded successfully.',
      });
      await loadData();
    } catch (err: any) {
      setRegError(err?.message || 'Registration failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle preference update
  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);

    if (!hasAtLeastOneOrganSelected(updatePrefs)) {
      setUpdateError('Please select at least one organ or tissue for donation.');
      return;
    }

    if (!updateConfirmed) {
      setUpdateError('Please confirm your updated preferences before saving.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await updateOrganDonationPreferences({
        preferences: updatePrefs,
        consentText: DEFAULT_CONSENT_TEXT,
        consentVersion: 'v1.0',
      });

      if (!res.success) {
        setUpdateError(res.error || 'Failed to update preferences.');
        return;
      }

      setIsUpdateModalOpen(false);
      setUpdateConfirmed(false);
      setStatusMessage({
        type: 'success',
        text: 'Your organ donation preferences have been updated.',
      });
      await loadData();
    } catch (err: any) {
      setUpdateError(err?.message || 'Update failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle consent revocation
  const handleRevokeConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevokeError(null);

    if (!revokeConfirmed) {
      setRevokeError('You must confirm withdrawal before proceeding.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await revokeOrganDonationConsent({
        consentText: DEFAULT_REVOKE_TEXT,
        consentVersion: 'v1.0',
      });

      if (!res.success) {
        setRevokeError(res.error || 'Failed to revoke organ donation consent.');
        return;
      }

      setIsRevokeModalOpen(false);
      setRevokeConfirmed(false);
      setStatusMessage({
        type: 'info',
        text: 'Your organ donation registration has been revoked.',
      });
      await loadData();
    } catch (err: any) {
      setRevokeError(err?.message || 'Revocation failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle re-activation
  const handleReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setReactivateError(null);

    if (!hasAtLeastOneOrganSelected(reactivatePrefs)) {
      setReactivateError('Please select at least one organ or tissue for donation.');
      return;
    }

    if (!reactivateConfirmed) {
      setReactivateError('You must explicitly confirm the voluntary donation acknowledgement checkbox.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await reactivateOrganDonor({
        preferences: reactivatePrefs,
        confirmedCheckbox: reactivateConfirmed,
        consentText: DEFAULT_CONSENT_TEXT,
        consentVersion: 'v1.0',
      });

      if (!res.success) {
        setReactivateError(res.error || 'Failed to reactivate registration.');
        return;
      }

      setIsReactivateModalOpen(false);
      setReactivateConfirmed(false);
      setStatusMessage({
        type: 'success',
        text: 'Your organ donation registration has been reactivated.',
      });
      await loadData();
    } catch (err: any) {
      setReactivateError(err?.message || 'Reactivation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const selectAllOrgans = (setter: React.Dispatch<React.SetStateAction<Record<OrganKey, boolean>>>) => {
    setter((prev) => {
      const updated = { ...prev };
      ORGAN_KEYS.forEach((k) => {
        if (ORGAN_LABELS[k].category === 'Organ') updated[k] = true;
      });
      return updated;
    });
  };

  const selectAllTissues = (setter: React.Dispatch<React.SetStateAction<Record<OrganKey, boolean>>>) => {
    setter((prev) => {
      const updated = { ...prev };
      ORGAN_KEYS.forEach((k) => {
        if (ORGAN_LABELS[k].category === 'Tissue') updated[k] = true;
      });
      return updated;
    });
  };

  const selectAll = (setter: React.Dispatch<React.SetStateAction<Record<OrganKey, boolean>>>) => {
    setter(() => {
      const updated = {} as Record<OrganKey, boolean>;
      ORGAN_KEYS.forEach((k) => {
        updated[k] = true;
      });
      return updated;
    });
  };

  const clearAll = (setter: React.Dispatch<React.SetStateAction<Record<OrganKey, boolean>>>) => {
    setter(() => ({ ...INITIAL_ORGAN_SELECTIONS }));
  };

  const getActiveOrganCount = (prefs: Record<OrganKey, boolean>) => {
    return ORGAN_KEYS.filter((k) => prefs[k]).length;
  };

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState message="Loading organ donation registration and consent history..." />
      </div>
    );
  }

  const isRegistered = Boolean(donorData && donorData.profile);
  const isActive = donorData?.profile.status === 'ACTIVE';
  const isRevoked = donorData?.profile.status === 'REVOKED';

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Organ & Tissue Donation"
        subtitle="Patient-controlled voluntary organ and tissue donation declaration & consent management"
        badge={
          <Badge variant={isActive ? 'success' : isRevoked ? 'danger' : 'info'} size="sm">
            {isActive ? 'Active Intent' : isRevoked ? 'Consent Revoked' : 'Voluntary Registration'}
          </Badge>
        }
      />

      {/* Global Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-sky-50 text-sky-900 border-sky-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
            {statusMessage.type === 'info' && <Info className="w-5 h-5 text-sky-600 flex-shrink-0" />}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: Organ Donation Overview Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-semibold flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-300 fill-rose-300" />
                Voluntary Gift of Life
              </span>
              <span className="text-xs text-emerald-200/80 font-mono">Confidential & Patient Controlled</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pledge the Gift of Life through <span className="text-emerald-300">Organ & Tissue Donation</span>
            </h2>

            <p className="text-sm text-emerald-100/90 leading-relaxed">
              One voluntary organ donor can save up to 8 lives and heal over 75 individuals through tissue donation.
              Your decision to register reflects a powerful commitment to life.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[200px] text-center">
            <ShieldCheck className="w-8 h-8 text-emerald-300 mb-1" />
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">Registration Status</span>
            <span className="text-lg font-bold mt-1 text-white">
              {isActive ? 'ACTIVE' : isRevoked ? 'REVOKED' : 'NOT REGISTERED'}
            </span>
            <span className="text-[11px] text-emerald-200/70 mt-1">Immutable Consent Log</span>
          </div>
        </div>
      </div>

      {/* SECTION 5: My Donation Status (Displayed when patient is registered) */}
      {isRegistered && donorData && (
        <HealthCard
          title="My Organ Donation Status"
          action={
            <Badge variant={isActive ? 'success' : 'danger'} size="md">
              {donorData.profile.status}
            </Badge>
          }
        >
          <div className="space-y-6">
            {/* Status Heading & Description */}
            <div
              className={`p-5 rounded-2xl border ${
                isActive
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/70 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {isActive ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <h3 className="text-base font-bold">
                    {isActive
                      ? 'Your voluntary organ donation intent is active.'
                      : 'Your organ donation registration has been revoked.'}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {isActive
                      ? 'Your intention to donate the selected organs and tissues is recorded in your Health Wallet. You retain full control and may update or withdraw your consent at any time.'
                      : 'You have withdrawn your voluntary donation registration. No active donor status is associated with your profile.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Metadata Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200/70 rounded-2xl text-xs">
              <div>
                <span className="text-slate-500 font-medium block">Current Status:</span>
                <span className="text-slate-900 font-bold text-sm block mt-0.5">{donorData.profile.status}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Consent Version:</span>
                <span className="text-slate-900 font-mono font-semibold block mt-0.5">
                  {donorData.profile.consent_version}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Consent Recorded:</span>
                <span className="text-slate-900 font-semibold block mt-0.5">
                  {donorData.profile.consented_at
                    ? new Date(donorData.profile.consented_at).toLocaleString()
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Last Updated:</span>
                <span className="text-slate-900 font-semibold block mt-0.5">
                  {new Date(donorData.profile.updated_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Selected Organs & Tissues (Active State) */}
            {isActive && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    Selected Organs & Tissues ({getActiveOrganCount(donorData.preferences as any)} selected)
                  </h4>
                  <SecondaryButton
                    size="sm"
                    icon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setUpdatePrefs({
                        kidneys: donorData.preferences.kidneys,
                        liver: donorData.preferences.liver,
                        heart: donorData.preferences.heart,
                        lungs: donorData.preferences.lungs,
                        pancreas: donorData.preferences.pancreas,
                        intestines: donorData.preferences.intestines,
                        corneas: donorData.preferences.corneas,
                        skin: donorData.preferences.skin,
                        bone: donorData.preferences.bone,
                        tissues_other: donorData.preferences.tissues_other,
                      });
                      setUpdateConfirmed(false);
                      setUpdateError(null);
                      setIsUpdateModalOpen(true);
                    }}
                  >
                    Update Preferences
                  </SecondaryButton>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {ORGAN_KEYS.map((key) => {
                    const selected = donorData.preferences[key];
                    const info = ORGAN_LABELS[key];
                    return (
                      <div
                        key={key}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                          selected
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                            : 'bg-slate-50/50 border-slate-200/50 text-slate-400 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/70 border border-slate-200/40">
                            {info.category}
                          </span>
                          {selected ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">Not selected</span>
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-xs block text-slate-900">{info.label}</span>
                          <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{info.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Bar for Registered Donors */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Encrypted & private to your Health Wallet. No public visibility.</span>
              </div>

              <div className="flex items-center gap-3">
                {isActive ? (
                  <PrimaryButton
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-500 border-none text-white shadow-sm"
                    icon={<XCircle className="w-4 h-4" />}
                    onClick={() => {
                      setRevokeConfirmed(false);
                      setRevokeError(null);
                      setIsRevokeModalOpen(true);
                    }}
                  >
                    Withdraw Organ Donation Consent
                  </PrimaryButton>
                ) : (
                  <PrimaryButton
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 border-none text-white shadow-sm"
                    icon={<RefreshCw className="w-4 h-4" />}
                    onClick={() => {
                      setReactivateConfirmed(false);
                      setReactivateError(null);
                      setIsReactivateModalOpen(true);
                    }}
                  >
                    Reactivate Organ Donation
                  </PrimaryButton>
                )}
              </div>
            </div>
          </div>
        </HealthCard>
      )}

      {/* SECTION 2, 3, 4: Become an Organ Donor (Shown when patient has no profile yet) */}
      {!isRegistered && (
        <form onSubmit={handleRegister} className="space-y-6">
          <HealthCard
            title="Become an Organ & Tissue Donor"
            action={
              <Badge variant="primary" size="sm">
                Step 1 of 1: Voluntary Consent
              </Badge>
            }
          >
            <div className="space-y-6">
              <div className="p-4 bg-sky-50/70 border border-sky-200/80 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-sky-950">
                  <span className="font-bold block">Patient-Controlled Voluntary Declaration</span>
                  <p className="leading-relaxed">
                    You can specify exactly which organs and tissues you wish to donate. You retain complete autonomy
                    and can update or revoke this registration at any time in the future.
                  </p>
                </div>
              </div>

              {/* SECTION 3: Select Donation Preferences */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Select Organs & Tissues to Donate</h3>
                    <p className="text-xs text-slate-500">
                      Choose at least one organ or tissue. You can update these selections at any time.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => selectAllOrgans(setRegPrefs)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 transition-colors"
                    >
                      All Organs
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAllTissues(setRegPrefs)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 transition-colors"
                    >
                      All Tissues
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAll(setRegPrefs)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 font-semibold text-emerald-700 border border-emerald-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => clearAll(setRegPrefs)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-600 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {ORGAN_KEYS.map((key) => {
                    const isChecked = regPrefs[key];
                    const info = ORGAN_LABELS[key];
                    return (
                      <label
                        key={key}
                        className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start gap-3 select-none ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setRegPrefs((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                          className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 focus:ring-offset-0"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{info.label}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                info.category === 'Organ'
                                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {info.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-snug">{info.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: Consent Statement & Explicit Checkbox */}
              <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Voluntary Consent Statement (v1.0)
                  </h4>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 italic leading-relaxed">
                  "{DEFAULT_CONSENT_TEXT}"
                </div>

                {/* Mandatory Explicit Confirmation Checkbox (NOT Pre-checked) */}
                <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={regConfirmed}
                    onChange={(e) => setRegConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-900 leading-relaxed">
                    {CONSENT_CONFIRMATION_STATEMENT}
                  </span>
                </label>
              </div>

              {/* Form Validation Error Display */}
              {regError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <PrimaryButton
                  type="submit"
                  size="md"
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 border-none text-white shadow-md px-6"
                  icon={actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                >
                  {actionLoading ? 'Recording Registration...' : 'Register as Voluntary Donor'}
                </PrimaryButton>
              </div>
            </div>
          </HealthCard>
        </form>
      )}

      {/* SECTION 6: Consent History (Immutable Chronological Log) */}
      <HealthCard
        title="Consent History"
        action={
          <Badge variant="neutral" size="sm" icon={<History className="w-3 h-3" />}>
            Immutable Audit Trail
          </Badge>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Every registration, preference update, and revocation is recorded as an immutable consent event. Historical
            consent records cannot be modified or deleted.
          </p>

          {consentHistory.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-slate-200/70 rounded-2xl text-center text-xs text-slate-500">
              No organ donation consent records found.
            </div>
          ) : (
            <div className="space-y-3">
              {consentHistory.map((item, index) => {
                const actionBadgeVariant =
                  item.action === 'REGISTER' ? 'success' : item.action === 'UPDATE' ? 'info' : 'danger';
                return (
                  <div
                    key={item.id || index}
                    className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={actionBadgeVariant} size="sm">
                          {item.action}
                        </Badge>
                        <span className="text-xs font-mono font-semibold text-slate-700">
                          Version {item.consent_version}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 italic bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      "{item.consent_text}"
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </HealthCard>

      {/* SECTION 7: Safety & Legal Disclaimers */}
      <HealthCard title="Safety, Legal & Privacy Disclaimers">
        <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
          {/* Prominent Required Disclaimer */}
          <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-amber-950 font-medium">
            <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block uppercase tracking-wider text-[11px] text-amber-800">
                Official Regulatory Notice
              </span>
              <p className="leading-relaxed">{ORGAN_DONATION_DISCLAIMER}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-1.5">
              <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Next of Kin & Family Awareness
              </span>
              <p>
                Under prevailing medical and legal frameworks, family consent is typically consulted at the time of
                donation. We encourage you to share your voluntary registration decision with your family members.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-1.5">
              <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-teal-600" />
                Zero Public Exposure & Strict Confidentiality
              </span>
              <p>
                Your organ donation preferences and consent logs are private to your Health Wallet. No public directory
                exists, and no Aadhaar numbers, contact information, or medical records are ever exposed.
              </p>
            </div>
          </div>
        </div>
      </HealthCard>

      {/* MODAL 1: Update Preferences Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Update Donation Preferences"
        subtitle="Modify your selected organs and tissues"
        maxWidth="lg"
      >
        <form onSubmit={handleUpdatePreferences} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 font-medium">Choose organs/tissues to update:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => selectAll(setUpdatePrefs)}
                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => clearAll(setUpdatePrefs)}
                className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto p-1">
            {ORGAN_KEYS.map((key) => {
              const isChecked = updatePrefs[key];
              const info = ORGAN_LABELS[key];
              return (
                <label
                  key={key}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer select-none ${
                    isChecked
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      setUpdatePrefs((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{info.label}</span>
                    <span className="text-[11px] text-slate-500">{info.category}</span>
                  </div>
                </label>
              );
            })}
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-slate-100">
            <input
              type="checkbox"
              checked={updateConfirmed}
              onChange={(e) => setUpdateConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-semibold text-slate-800 leading-snug">
              I confirm that I wish to update my voluntary organ and tissue donation preferences.
            </span>
          </label>

          {updateError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
              {updateError}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <SecondaryButton size="sm" onClick={() => setIsUpdateModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              size="sm"
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-500 border-none text-white shadow-sm"
            >
              {actionLoading ? 'Saving...' : 'Save Updated Preferences'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Revoke Organ Donation Consent Modal */}
      <Modal
        isOpen={isRevokeModalOpen}
        onClose={() => setIsRevokeModalOpen(false)}
        title="Withdraw Organ Donation Consent"
        subtitle="Confirm revocation of voluntary registration"
        maxWidth="md"
      >
        <form onSubmit={handleRevokeConsent} className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-950 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-sm">
                Are you sure you want to withdraw your organ donation registration?
              </span>
              <p className="leading-relaxed text-slate-600">
                Withdrawing your consent sets your donor status to REVOKED. Your registration will no longer be active.
                A permanent revocation record will be appended to your consent history.
              </p>
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={revokeConfirmed}
              onChange={(e) => setRevokeConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
            />
            <span className="text-xs font-semibold text-slate-800 leading-snug">
              Yes, I explicitly confirm that I wish to withdraw my voluntary organ donation consent.
            </span>
          </label>

          {revokeError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
              {revokeError}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <SecondaryButton size="sm" onClick={() => setIsRevokeModalOpen(false)}>
              Keep Registration Active
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              size="sm"
              disabled={actionLoading}
              className="bg-rose-600 hover:bg-rose-500 border-none text-white shadow-sm"
            >
              {actionLoading ? 'Withdrawing...' : 'Withdraw Consent'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Reactivate Organ Donor Modal */}
      <Modal
        isOpen={isReactivateModalOpen}
        onClose={() => setIsReactivateModalOpen(false)}
        title="Reactivate Organ Donation Registration"
        subtitle="Record a new voluntary donation consent"
        maxWidth="lg"
      >
        <form onSubmit={handleReactivate} className="space-y-5">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950">
            Reactivation will restore your status to <strong>ACTIVE</strong> and create a new immutable consent event.
            Your previous revocation remains part of your permanent audit trail.
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 font-medium">Select organs and tissues for reactivation:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => selectAll(setReactivatePrefs)}
                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => clearAll(setReactivatePrefs)}
                className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[250px] overflow-y-auto p-1">
            {ORGAN_KEYS.map((key) => {
              const isChecked = reactivatePrefs[key];
              const info = ORGAN_LABELS[key];
              return (
                <label
                  key={key}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer select-none ${
                    isChecked
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      setReactivatePrefs((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{info.label}</span>
                    <span className="text-[11px] text-slate-500">{info.category}</span>
                  </div>
                </label>
              );
            })}
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-slate-100">
            <input
              type="checkbox"
              checked={reactivateConfirmed}
              onChange={(e) => setReactivateConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-semibold text-slate-900 leading-snug">
              {CONSENT_CONFIRMATION_STATEMENT}
            </span>
          </label>

          {reactivateError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
              {reactivateError}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <SecondaryButton size="sm" onClick={() => setIsReactivateModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              size="sm"
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-500 border-none text-white shadow-sm"
            >
              {actionLoading ? 'Reactivating...' : 'Reactivate Registration'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};
