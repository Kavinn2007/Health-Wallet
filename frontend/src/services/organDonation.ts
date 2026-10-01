import { supabase, isSupabaseConfigured } from './supabase';
import { recordMockAuditLog } from './audit';
import { recordMockNotification } from './notifications';

export type OrganDonorStatus = 'ACTIVE' | 'REVOKED';

export type OrganDonationConsentAction = 'REGISTER' | 'UPDATE' | 'REVOKE';

export interface OrganDonorProfile {
  id: string;
  user_id: string;
  patient_id: string;
  status: OrganDonorStatus;
  consent_version: string;
  consented_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganDonationPreferences {
  id: string;
  donor_profile_id: string;
  kidneys: boolean;
  liver: boolean;
  heart: boolean;
  lungs: boolean;
  pancreas: boolean;
  intestines: boolean;
  corneas: boolean;
  skin: boolean;
  bone: boolean;
  tissues_other: boolean;
  updated_at: string;
}

export interface OrganDonationConsentRecord {
  id: string;
  donor_profile_id?: string;
  patient_id?: string;
  consent_version: string;
  consent_text: string;
  action: OrganDonationConsentAction;
  created_at: string;
}

export interface OrganDonorFullData {
  profile: OrganDonorProfile;
  preferences: OrganDonationPreferences;
}

export type OrganKey =
  | 'kidneys'
  | 'liver'
  | 'heart'
  | 'lungs'
  | 'pancreas'
  | 'intestines'
  | 'corneas'
  | 'skin'
  | 'bone'
  | 'tissues_other';

export const ORGAN_LABELS: Record<OrganKey, { label: string; description: string; category: 'Organ' | 'Tissue' }> = {
  kidneys: { label: 'Kidneys', description: 'Filters waste & excess fluid from blood', category: 'Organ' },
  liver: { label: 'Liver', description: 'Essential metabolic & detoxifying organ', category: 'Organ' },
  heart: { label: 'Heart', description: 'Life-sustaining circulatory organ', category: 'Organ' },
  lungs: { label: 'Lungs', description: 'Respiratory organs vital for oxygen exchange', category: 'Organ' },
  pancreas: { label: 'Pancreas', description: 'Regulates glucose levels and insulin production', category: 'Organ' },
  intestines: { label: 'Intestines', description: 'Digestive organ for nutrient absorption', category: 'Organ' },
  corneas: { label: 'Corneas', description: 'Restores clear vision to individuals with blindness', category: 'Tissue' },
  skin: { label: 'Skin', description: 'Critical biological graft for severe burn victims', category: 'Tissue' },
  bone: { label: 'Bone', description: 'Restorative orthopedic bone grafts', category: 'Tissue' },
  tissues_other: { label: 'Other Tissues', description: 'Tendons, heart valves, and vascular grafts', category: 'Tissue' },
};

export const ORGAN_DONATION_DISCLAIMER =
  'Organ donation registration records your voluntary intent. Actual donation eligibility, authorization, and transplantation are determined by authorized medical and legal authorities.';

export const CONSENT_CONFIRMATION_STATEMENT =
  'I understand that this registration records my voluntary donation intent and does not itself authorize transplantation or guarantee donation.';

export const DEFAULT_CONSENT_TEXT =
  'I voluntarily indicate my intention to donate the selected organs and tissues, subject to applicable medical, legal, and authorization requirements.';

export const DEFAULT_REVOKE_TEXT =
  'I hereby withdraw and revoke my organ donation registration.';

// Local storage keys for mock / offline fallback
const STORAGE_KEY_PROFILE = 'health_wallet_v2_organ_donor_profile';
const STORAGE_KEY_PREFERENCES = 'health_wallet_v2_organ_donation_preferences';
const STORAGE_KEY_CONSENTS = 'health_wallet_v2_organ_donation_consents';

export function hasAtLeastOneOrganSelected(prefs: Partial<OrganDonationPreferences>): boolean {
  return Boolean(
    prefs.kidneys ||
      prefs.liver ||
      prefs.heart ||
      prefs.lungs ||
      prefs.pancreas ||
      prefs.intestines ||
      prefs.corneas ||
      prefs.skin ||
      prefs.bone ||
      prefs.tissues_other
  );
}

/**
 * Fetch authenticated patient's organ donor profile and preferences
 */
export async function getMyOrganDonorProfile(): Promise<{
  data: OrganDonorFullData | null;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return getMockOrganDonorProfile();
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) {
      return { data: null, error: 'User is not authenticated' };
    }

    const { data, error } = await supabase.rpc('get_my_organ_donor_profile');
    if (error) {
      console.warn('RPC get_my_organ_donor_profile failed, falling back:', error.message);
      return getMockOrganDonorProfile();
    }

    if (!data || !data.profile) {
      return { data: null };
    }

    return {
      data: {
        profile: data.profile as OrganDonorProfile,
        preferences: data.preferences as OrganDonationPreferences,
      },
    };
  } catch (err: any) {
    console.warn('getMyOrganDonorProfile exception:', err);
    return getMockOrganDonorProfile();
  }
}

/**
 * Register as a voluntary organ donor
 */
export async function registerOrganDonor(params: {
  preferences: Record<OrganKey, boolean>;
  consentText?: string;
  consentVersion?: string;
  confirmedCheckbox: boolean;
}): Promise<{ success: boolean; donorId?: string; error?: string }> {
  if (!params.confirmedCheckbox) {
    return {
      success: false,
      error: 'You must confirm the voluntary donation acknowledgement checkbox before registering.',
    };
  }

  if (!hasAtLeastOneOrganSelected(params.preferences)) {
    return {
      success: false,
      error: 'Selection required: At least one organ or tissue must be selected for donation.',
    };
  }

  const consentText = params.consentText || DEFAULT_CONSENT_TEXT;
  const consentVersion = params.consentVersion || 'v1.0';

  if (!isSupabaseConfigured) {
    return registerMockOrganDonor(params.preferences, consentText, consentVersion);
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) {
      return { success: false, error: 'User is not authenticated' };
    }

    const { data, error } = await supabase.rpc('register_organ_donor', {
      p_kidneys: params.preferences.kidneys || false,
      p_liver: params.preferences.liver || false,
      p_heart: params.preferences.heart || false,
      p_lungs: params.preferences.lungs || false,
      p_pancreas: params.preferences.pancreas || false,
      p_intestines: params.preferences.intestines || false,
      p_corneas: params.preferences.corneas || false,
      p_skin: params.preferences.skin || false,
      p_bone: params.preferences.bone || false,
      p_tissues_other: params.preferences.tissues_other || false,
      p_consent_text: consentText,
      p_consent_version: consentVersion,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, donorId: data as string };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to register organ donor' };
  }
}

/**
 * Update organ and tissue donation preferences
 */
export async function updateOrganDonationPreferences(params: {
  preferences: Record<OrganKey, boolean>;
  consentText?: string;
  consentVersion?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!hasAtLeastOneOrganSelected(params.preferences)) {
    return {
      success: false,
      error: 'Selection required: At least one organ or tissue must be selected for donation.',
    };
  }

  const consentText = params.consentText || DEFAULT_CONSENT_TEXT;
  const consentVersion = params.consentVersion || 'v1.0';

  if (!isSupabaseConfigured) {
    return updateMockOrganDonationPreferences(params.preferences, consentText, consentVersion);
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) {
      return { success: false, error: 'User is not authenticated' };
    }

    const { error } = await supabase.rpc('update_organ_donation_preferences', {
      p_kidneys: params.preferences.kidneys || false,
      p_liver: params.preferences.liver || false,
      p_heart: params.preferences.heart || false,
      p_lungs: params.preferences.lungs || false,
      p_pancreas: params.preferences.pancreas || false,
      p_intestines: params.preferences.intestines || false,
      p_corneas: params.preferences.corneas || false,
      p_skin: params.preferences.skin || false,
      p_bone: params.preferences.bone || false,
      p_tissues_other: params.preferences.tissues_other || false,
      p_consent_text: consentText,
      p_consent_version: consentVersion,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update organ preferences' };
  }
}

/**
 * Revoke voluntary organ donation consent
 */
export async function revokeOrganDonationConsent(params?: {
  consentText?: string;
  consentVersion?: string;
}): Promise<{ success: boolean; error?: string }> {
  const consentText = params?.consentText || DEFAULT_REVOKE_TEXT;
  const consentVersion = params?.consentVersion || 'v1.0';

  if (!isSupabaseConfigured) {
    return revokeMockOrganDonationConsent(consentText, consentVersion);
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) {
      return { success: false, error: 'User is not authenticated' };
    }

    const { error } = await supabase.rpc('revoke_organ_donation_consent', {
      p_consent_text: consentText,
      p_consent_version: consentVersion,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to revoke organ donation consent' };
  }
}

/**
 * Reactivate a previously revoked organ donor registration
 */
export async function reactivateOrganDonor(params: {
  preferences: Record<OrganKey, boolean>;
  consentText?: string;
  consentVersion?: string;
  confirmedCheckbox: boolean;
}): Promise<{ success: boolean; error?: string }> {
  if (!params.confirmedCheckbox) {
    return {
      success: false,
      error: 'You must confirm the voluntary donation acknowledgement checkbox before reactivating.',
    };
  }

  if (!hasAtLeastOneOrganSelected(params.preferences)) {
    return {
      success: false,
      error: 'Selection required: At least one organ or tissue must be selected for donation.',
    };
  }

  const consentText = params.consentText || DEFAULT_CONSENT_TEXT;
  const consentVersion = params.consentVersion || 'v1.0';

  if (!isSupabaseConfigured) {
    return reactivateMockOrganDonor(params.preferences, consentText, consentVersion);
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) {
      return { success: false, error: 'User is not authenticated' };
    }

    const { error } = await supabase.rpc('reactivate_organ_donor', {
      p_kidneys: params.preferences.kidneys || false,
      p_liver: params.preferences.liver || false,
      p_heart: params.preferences.heart || false,
      p_lungs: params.preferences.lungs || false,
      p_pancreas: params.preferences.pancreas || false,
      p_intestines: params.preferences.intestines || false,
      p_corneas: params.preferences.corneas || false,
      p_skin: params.preferences.skin || false,
      p_bone: params.preferences.bone || false,
      p_tissues_other: params.preferences.tissues_other || false,
      p_consent_text: consentText,
      p_consent_version: consentVersion,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reactivate organ donation registration' };
  }
}

/**
 * Fetch patient's immutable consent history
 */
export async function getMyOrganConsentHistory(): Promise<{
  data: OrganDonationConsentRecord[];
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return getMockOrganConsentHistory();
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) {
      return { data: [], error: 'User is not authenticated' };
    }

    const { data, error } = await supabase.rpc('get_my_organ_consent_history');
    if (error) {
      console.warn('RPC get_my_organ_consent_history failed, falling back:', error.message);
      return getMockOrganConsentHistory();
    }

    return { data: (data as OrganDonationConsentRecord[]) || [] };
  } catch (err: any) {
    console.warn('getMyOrganConsentHistory exception:', err);
    return getMockOrganConsentHistory();
  }
}

// ====================================================================
// Mock / LocalStorage Offline Fallback Implementation
// ====================================================================

function getMockOrganDonorProfile(): { data: OrganDonorFullData | null; error?: string } {
  try {
    const pStr = localStorage.getItem(STORAGE_KEY_PROFILE);
    const prefStr = localStorage.getItem(STORAGE_KEY_PREFERENCES);
    if (!pStr || !prefStr) return { data: null };

    return {
      data: {
        profile: JSON.parse(pStr),
        preferences: JSON.parse(prefStr),
      },
    };
  } catch {
    return { data: null };
  }
}

function registerMockOrganDonor(
  preferences: Record<OrganKey, boolean>,
  consentText: string,
  consentVersion: string
): { success: boolean; donorId?: string; error?: string } {
  try {
    const now = new Date().toISOString();
    const donorId = `donor-${Date.now()}`;
    const profile: OrganDonorProfile = {
      id: donorId,
      user_id: 'mock-patient-uid',
      patient_id: 'mock-patient-pid',
      status: 'ACTIVE',
      consent_version: consentVersion,
      consented_at: now,
      revoked_at: null,
      created_at: now,
      updated_at: now,
    };

    const organPrefs: OrganDonationPreferences = {
      id: `pref-${Date.now()}`,
      donor_profile_id: donorId,
      kidneys: Boolean(preferences.kidneys),
      liver: Boolean(preferences.liver),
      heart: Boolean(preferences.heart),
      lungs: Boolean(preferences.lungs),
      pancreas: Boolean(preferences.pancreas),
      intestines: Boolean(preferences.intestines),
      corneas: Boolean(preferences.corneas),
      skin: Boolean(preferences.skin),
      bone: Boolean(preferences.bone),
      tissues_other: Boolean(preferences.tissues_other),
      updated_at: now,
    };

    const consentRecord: OrganDonationConsentRecord = {
      id: `consent-${Date.now()}`,
      donor_profile_id: donorId,
      patient_id: 'mock-patient-pid',
      consent_version: consentVersion,
      consent_text: consentText,
      action: 'REGISTER',
      created_at: now,
    };

    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(organPrefs));

    const consentsStr = localStorage.getItem(STORAGE_KEY_CONSENTS);
    const consents: OrganDonationConsentRecord[] = consentsStr ? JSON.parse(consentsStr) : [];
    consents.unshift(consentRecord);
    localStorage.setItem(STORAGE_KEY_CONSENTS, JSON.stringify(consents));

    // Audit Log
    recordMockAuditLog({
      user_id: 'mock-patient-uid',
      patient_id: 'mock-patient-pid',
      role: 'PATIENT',
      action: 'REGISTER_ORGAN_DONOR',
      status: 'ACTIVE',
      metadata: { donor_id: donorId, consent_version: consentVersion },
    });

    // Notification
    recordMockNotification({
      user_id: 'mock-patient-uid',
      patient_id: 'mock-patient-pid',
      type: 'ORGAN_DONATION_REGISTERED',
      title: 'Organ Donation Registered',
      message: 'Your voluntary organ donation registration has been recorded.',
      is_read: false,
    });

    return { success: true, donorId };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Mock registration failed' };
  }
}

function updateMockOrganDonationPreferences(
  preferences: Record<OrganKey, boolean>,
  consentText: string,
  consentVersion: string
): { success: boolean; error?: string } {
  try {
    const pStr = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!pStr) return { success: false, error: 'Organ donor profile not found' };
    const profile: OrganDonorProfile = JSON.parse(pStr);

    if (profile.status !== 'ACTIVE') {
      return {
        success: false,
        error: `Cannot update preferences: Organ donor status is not ACTIVE (status: ${profile.status})`,
      };
    }

    const now = new Date().toISOString();
    profile.updated_at = now;
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));

    const organPrefs: OrganDonationPreferences = {
      id: `pref-${Date.now()}`,
      donor_profile_id: profile.id,
      kidneys: Boolean(preferences.kidneys),
      liver: Boolean(preferences.liver),
      heart: Boolean(preferences.heart),
      lungs: Boolean(preferences.lungs),
      pancreas: Boolean(preferences.pancreas),
      intestines: Boolean(preferences.intestines),
      corneas: Boolean(preferences.corneas),
      skin: Boolean(preferences.skin),
      bone: Boolean(preferences.bone),
      tissues_other: Boolean(preferences.tissues_other),
      updated_at: now,
    };
    localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(organPrefs));

    // Append new immutable consent
    const consentRecord: OrganDonationConsentRecord = {
      id: `consent-${Date.now()}`,
      donor_profile_id: profile.id,
      patient_id: profile.patient_id,
      consent_version: consentVersion,
      consent_text: consentText,
      action: 'UPDATE',
      created_at: now,
    };

    const consentsStr = localStorage.getItem(STORAGE_KEY_CONSENTS);
    const consents: OrganDonationConsentRecord[] = consentsStr ? JSON.parse(consentsStr) : [];
    consents.unshift(consentRecord);
    localStorage.setItem(STORAGE_KEY_CONSENTS, JSON.stringify(consents));

    // Audit Log
    recordMockAuditLog({
      user_id: profile.user_id,
      patient_id: profile.patient_id,
      role: 'PATIENT',
      action: 'UPDATE_ORGAN_DONATION_PREFERENCES',
      status: 'SUCCESS',
      metadata: { donor_id: profile.id },
    });

    // Notification
    recordMockNotification({
      user_id: profile.user_id,
      patient_id: profile.patient_id,
      type: 'ORGAN_DONATION_UPDATED',
      title: 'Organ Donation Preferences Updated',
      message: 'Your organ donation preferences have been updated.',
      is_read: false,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Mock update failed' };
  }
}

function revokeMockOrganDonationConsent(
  consentText: string,
  consentVersion: string
): { success: boolean; error?: string } {
  try {
    const pStr = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!pStr) return { success: false, error: 'Organ donor profile not found' };
    const profile: OrganDonorProfile = JSON.parse(pStr);

    if (profile.status === 'REVOKED') {
      return { success: false, error: 'Organ donation registration is already revoked' };
    }

    const now = new Date().toISOString();
    profile.status = 'REVOKED';
    profile.revoked_at = now;
    profile.updated_at = now;
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));

    // Append immutable REVOKE consent
    const consentRecord: OrganDonationConsentRecord = {
      id: `consent-${Date.now()}`,
      donor_profile_id: profile.id,
      patient_id: profile.patient_id,
      consent_version: consentVersion,
      consent_text: consentText,
      action: 'REVOKE',
      created_at: now,
    };

    const consentsStr = localStorage.getItem(STORAGE_KEY_CONSENTS);
    const consents: OrganDonationConsentRecord[] = consentsStr ? JSON.parse(consentsStr) : [];
    consents.unshift(consentRecord);
    localStorage.setItem(STORAGE_KEY_CONSENTS, JSON.stringify(consents));

    // Audit Log
    recordMockAuditLog({
      user_id: profile.user_id,
      patient_id: profile.patient_id,
      role: 'PATIENT',
      action: 'REVOKE_ORGAN_DONATION_CONSENT',
      status: 'REVOKED',
      metadata: { donor_id: profile.id },
    });

    // Notification
    recordMockNotification({
      user_id: profile.user_id,
      patient_id: profile.patient_id,
      type: 'ORGAN_DONATION_REVOKED',
      title: 'Organ Donation Registration Revoked',
      message: 'Your organ donation registration has been revoked.',
      is_read: false,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Mock revocation failed' };
  }
}

function reactivateMockOrganDonor(
  preferences: Record<OrganKey, boolean>,
  consentText: string,
  consentVersion: string
): { success: boolean; error?: string } {
  try {
    const pStr = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!pStr) {
      return registerMockOrganDonor(preferences, consentText, consentVersion);
    }
    const profile: OrganDonorProfile = JSON.parse(pStr);

    const now = new Date().toISOString();
    profile.status = 'ACTIVE';
    profile.consented_at = now;
    profile.revoked_at = null;
    profile.consent_version = consentVersion;
    profile.updated_at = now;
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));

    const organPrefs: OrganDonationPreferences = {
      id: `pref-${Date.now()}`,
      donor_profile_id: profile.id,
      kidneys: Boolean(preferences.kidneys),
      liver: Boolean(preferences.liver),
      heart: Boolean(preferences.heart),
      lungs: Boolean(preferences.lungs),
      pancreas: Boolean(preferences.pancreas),
      intestines: Boolean(preferences.intestines),
      corneas: Boolean(preferences.corneas),
      skin: Boolean(preferences.skin),
      bone: Boolean(preferences.bone),
      tissues_other: Boolean(preferences.tissues_other),
      updated_at: now,
    };
    localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(organPrefs));

    // Append new immutable consent (REGISTER action)
    const consentRecord: OrganDonationConsentRecord = {
      id: `consent-${Date.now()}`,
      donor_profile_id: profile.id,
      patient_id: profile.patient_id,
      consent_version: consentVersion,
      consent_text: consentText,
      action: 'REGISTER',
      created_at: now,
    };

    const consentsStr = localStorage.getItem(STORAGE_KEY_CONSENTS);
    const consents: OrganDonationConsentRecord[] = consentsStr ? JSON.parse(consentsStr) : [];
    consents.unshift(consentRecord);
    localStorage.setItem(STORAGE_KEY_CONSENTS, JSON.stringify(consents));

    // Audit Log
    recordMockAuditLog({
      user_id: profile.user_id,
      patient_id: profile.patient_id,
      role: 'PATIENT',
      action: 'REACTIVATE_ORGAN_DONOR',
      status: 'ACTIVE',
      metadata: { donor_id: profile.id },
    });

    // Notification
    recordMockNotification({
      user_id: profile.user_id,
      patient_id: profile.patient_id,
      type: 'ORGAN_DONATION_REACTIVATED',
      title: 'Organ Donation Registration Reactivated',
      message: 'Your organ donation registration has been reactivated.',
      is_read: false,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Mock reactivation failed' };
  }
}

function getMockOrganConsentHistory(): { data: OrganDonationConsentRecord[]; error?: string } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONSENTS);
    const list: OrganDonationConsentRecord[] = stored ? JSON.parse(stored) : [];
    return {
      data: list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    };
  } catch {
    return { data: [] };
  }
}
