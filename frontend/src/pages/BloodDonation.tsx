import React, { useState, useEffect, useId } from 'react';
import {
  Heart,
  Droplet,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Send,
  Calendar,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { HealthCard } from '../components/ui/HealthCard';
import { Badge } from '../components/ui/Badge';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { useAuth } from '../context/AuthContext';
import type {
  BloodGroup,
  UrgencyLevel,
  BloodDonorProfile,
  BloodDonationRequest,
} from '../services/bloodDonation';
import {
  getMyDonorProfile,
  registerDonor,
  updateDonorProfile,
  searchCompatibleDonors,
  createDonationRequest,
  getMyBloodRequests,
  getIncomingDonationRequests,
  acceptDonationRequest,
  declineDonationRequest,
  cancelDonationRequest,
  getCompatibleDonorGroups,
  canDonate,
} from '../services/bloodDonation';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const INDIAN_STATES = [
  'Tamil Nadu',
  'Karnataka',
  'Kerala',
  'Andhra Pradesh',
  'Telangana',
  'Maharashtra',
  'Delhi',
  'Gujarat',
  'West Bengal',
  'Uttar Pradesh',
  'Punjab',
  'Rajasthan',
];

export const BloodDonation: React.FC = () => {
  const { patientProfile } = useAuth();

  // Donor Profile State
  const [donorProfile, setDonorProfile] = useState<BloodDonorProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  // Form State for Registration / Update
  const [regBloodGroup, setRegBloodGroup] = useState<BloodGroup>(
    (patientProfile?.blood_group as BloodGroup) || 'O+'
  );
  const [regState, setRegState] = useState<string>(patientProfile?.state || 'Tamil Nadu');
  const [regCity, setRegCity] = useState<string>('');
  const [regAvailable, setRegAvailable] = useState<boolean>(true);
  const [regLastDonation, setRegLastDonation] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Donor Search State
  const [searchBloodGroup, setSearchBloodGroup] = useState<BloodGroup>('O+');
  const [searchState, setSearchState] = useState<string>(patientProfile?.state || 'Tamil Nadu');
  const [searchCity, setSearchCity] = useState<string>('');
  const [searchAvailOnly, setSearchAvailOnly] = useState<boolean>(true);
  const [searchResults, setSearchResults] = useState<BloodDonorProfile[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Request Creation Modal State
  const [selectedDonor, setSelectedDonor] = useState<BloodDonorProfile | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [reqUrgency, setReqUrgency] = useState<UrgencyLevel>('NORMAL');
  const [reqMessage, setReqMessage] = useState<string>('');
  const [isSendingRequest, setIsSendingRequest] = useState<boolean>(false);
  const [requestFeedback, setRequestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Requests Lists State
  const [mySentRequests, setMySentRequests] = useState<BloodDonationRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<BloodDonationRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(true);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Generate unique IDs for form labels
  const regBloodGroupId = useId();
  const regStateId = useId();
  const regCityId = useId();
  const regAvailableId = useId();
  const regLastDonationId = useId();
  const searchBloodGroupId = useId();
  const searchStateId = useId();
  const searchCityId = useId();
  const searchAvailOnlyId = useId();
  const reqUrgencyId = useId();
  const reqMessageId = useId();

  // Load donor profile & requests on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoadingProfile(true);
    setIsLoadingRequests(true);
    try {
      const [profile, sent, incoming] = await Promise.all([
        getMyDonorProfile(),
        getMyBloodRequests(),
        getIncomingDonationRequests(),
      ]);

      setDonorProfile(profile);
      if (profile) {
        setRegBloodGroup(profile.blood_group);
        setRegState(profile.state_code);
        setRegCity(profile.city || '');
        setRegAvailable(profile.is_available);
        setRegLastDonation(profile.last_donation_date || '');
      }

      setMySentRequests(sent);
      setIncomingRequests(incoming);
    } catch (err) {
      console.error('Failed to load blood donation data', err);
    } finally {
      setIsLoadingProfile(false);
      setIsLoadingRequests(false);
    }
  };

  // Handle Donor Registration / Update
  const handleSaveDonorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!regBloodGroup) {
      setFormError('Please select a valid blood group');
      return;
    }
    if (!regState.trim()) {
      setFormError('Please specify state location');
      return;
    }

    setIsRegistering(true);
    try {
      if (donorProfile) {
        await updateDonorProfile({
          blood_group: regBloodGroup,
          state_code: regState,
          city: regCity.trim() || undefined,
          is_available: regAvailable,
          last_donation_date: regLastDonation || undefined,
        });
        setFormSuccess('Donor profile updated successfully.');
        setIsEditingProfile(false);
      } else {
        const created = await registerDonor({
          blood_group: regBloodGroup,
          state_code: regState,
          city: regCity.trim() || undefined,
          is_available: regAvailable,
          last_donation_date: regLastDonation || undefined,
        });
        setDonorProfile(created);
        setFormSuccess('Registered successfully as a voluntary blood donor!');
      }

      const refreshed = await getMyDonorProfile();
      setDonorProfile(refreshed);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save donor profile');
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle Compatible Donor Search
  const handleSearchDonors = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchBloodGroup || !searchState.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await searchCompatibleDonors({
        required_blood_group: searchBloodGroup,
        state_code: searchState,
        city: searchCity.trim() || undefined,
        availability_only: searchAvailOnly,
      });
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching compatible donors', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Open Request Modal for a selected donor
  const handleInitiateRequest = (donor: BloodDonorProfile) => {
    setSelectedDonor(donor);
    setReqUrgency('NORMAL');
    setReqMessage('');
    setRequestFeedback(null);
    setIsRequestModalOpen(true);
  };

  // Submit Donation Request
  const handleSubmitRequest = async () => {
    if (!selectedDonor) return;
    setIsSendingRequest(true);
    setRequestFeedback(null);

    try {
      await createDonationRequest({
        donor_patient_id: selectedDonor.patient_id,
        blood_group: searchBloodGroup,
        state_code: selectedDonor.state_code,
        city: selectedDonor.city || undefined,
        urgency: reqUrgency,
        message: reqMessage.trim() || undefined,
      });

      setRequestFeedback({
        type: 'success',
        message: 'Blood donation request sent successfully! The voluntary donor has been notified.',
      });

      // Refresh sent requests
      const sent = await getMyBloodRequests();
      setMySentRequests(sent);

      setTimeout(() => {
        setIsRequestModalOpen(false);
        setSelectedDonor(null);
        setRequestFeedback(null);
      }, 1500);
    } catch (err: any) {
      setRequestFeedback({
        type: 'error',
        message: err.message || 'Failed to send donation request',
      });
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Accept Request
  const handleAccept = async (requestId: string) => {
    setActionInProgressId(requestId);
    try {
      await acceptDonationRequest(requestId);
      const incoming = await getIncomingDonationRequests();
      setIncomingRequests(incoming);
    } catch (err: any) {
      alert(err.message || 'Failed to accept request');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Decline Request
  const handleDecline = async (requestId: string) => {
    setActionInProgressId(requestId);
    try {
      await declineDonationRequest(requestId);
      const incoming = await getIncomingDonationRequests();
      setIncomingRequests(incoming);
    } catch (err: any) {
      alert(err.message || 'Failed to decline request');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Cancel Sent Request
  const handleCancel = async (requestId: string) => {
    setActionInProgressId(requestId);
    try {
      await cancelDonationRequest(requestId);
      const sent = await getMyBloodRequests();
      setMySentRequests(sent);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel request');
    } finally {
      setActionInProgressId(null);
    }
  };

  const compatibleDonorGroups = getCompatibleDonorGroups(searchBloodGroup);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* SECTION 1: Blood Donation Overview */}
      <PageHeader
        title="Voluntary Blood Donor Matching"
        subtitle="Coordinate voluntary blood donor connections, register availability, and locate compatible donors in emergency and clinical needs."
        badge={
          <Badge variant="success" size="sm">
            Phase 11 Verified
          </Badge>
        }
      />

      {/* Mandatory Regulatory Disclaimer Banner */}
      <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm space-y-1">
          <p className="font-semibold text-amber-950">Safety & Screening Notice</p>
          <p>
            Blood donation eligibility must be confirmed by an authorized blood bank or medical professional. Compatibility shown is a preliminary blood-group match and does not replace blood-bank screening or medical verification.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Droplet className="w-6 h-6 fill-rose-600 text-rose-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">My Donor Status</p>
            <p className="text-base font-bold text-slate-800">
              {donorProfile ? (donorProfile.is_available ? 'Available' : 'Unavailable') : 'Not Registered'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Incoming Requests</p>
            <p className="text-base font-bold text-slate-800">
              {incomingRequests.filter((r) => r.status === 'PENDING').length} Pending
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">My Sent Requests</p>
            <p className="text-base font-bold text-slate-800">
              {mySentRequests.filter((r) => r.status === 'PENDING').length} Pending / {mySentRequests.length} Total
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Privacy Protection</p>
            <p className="text-base font-bold text-slate-800">Zero Contact Leak</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SECTIONS 2 & 3: Become a Donor / My Donor Status */}
        <div className="lg:col-span-1 space-y-6">
          <HealthCard
            title={donorProfile && !isEditingProfile ? 'My Donor Status' : donorProfile ? 'Update Donor Profile' : 'Become a Blood Donor'}
            subtitle={
              donorProfile && !isEditingProfile
                ? 'Your registered voluntary donor profile'
                : 'Voluntary registration for compatible matching'
            }
          >
            {isLoadingProfile ? (
              <LoadingState message="Loading donor details..." />
            ) : donorProfile && !isEditingProfile ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Blood Group</span>
                    <Badge variant="danger" size="md" className="font-extrabold text-sm">
                      {donorProfile.blood_group}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Availability</span>
                    <Badge variant={donorProfile.is_available ? 'success' : 'neutral'} size="sm">
                      {donorProfile.is_available ? 'Available to Donate' : 'Temporarily Unavailable'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Region</span>
                    <span className="text-xs font-medium text-slate-800">
                      {donorProfile.city ? `${donorProfile.city}, ` : ''}{donorProfile.state_code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Last Donation</span>
                    <span className="text-xs font-mono text-slate-700">
                      {donorProfile.last_donation_date || 'Not recorded'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 bg-rose-50/50 p-3 rounded-xl border border-rose-100 flex items-start gap-2">
                  <Info className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>
                    You can donate to recipients with blood groups:{' '}
                    <strong>{getCompatibleDonorGroups(donorProfile.blood_group).join(', ')}</strong>
                  </span>
                </div>

                <SecondaryButton
                  size="sm"
                  className="w-full text-slate-700 hover:bg-slate-100"
                  onClick={() => setIsEditingProfile(true)}
                >
                  Edit Availability & Preferences
                </SecondaryButton>
              </div>
            ) : (
              <form onSubmit={handleSaveDonorProfile} className="space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
                    {formSuccess}
                  </div>
                )}

                <div>
                  <label htmlFor={regBloodGroupId} className="block font-semibold text-slate-700 mb-1">
                    Blood Group *
                  </label>
                  <select
                    id={regBloodGroupId}
                    value={regBloodGroup}
                    onChange={(e) => setRegBloodGroup(e.target.value as BloodGroup)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={regStateId} className="block font-semibold text-slate-700 mb-1">
                    State *
                  </label>
                  <select
                    id={regStateId}
                    value={regState}
                    onChange={(e) => setRegState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={regCityId} className="block font-semibold text-slate-700 mb-1">
                    City (Optional)
                  </label>
                  <input
                    id={regCityId}
                    type="text"
                    placeholder="e.g. Chennai, Madurai"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label htmlFor={regLastDonationId} className="block font-semibold text-slate-700 mb-1">
                    Last Donation Date (Optional)
                  </label>
                  <input
                    id={regLastDonationId}
                    type="date"
                    value={regLastDonation}
                    onChange={(e) => setRegLastDonation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id={regAvailableId}
                    type="checkbox"
                    checked={regAvailable}
                    onChange={(e) => setRegAvailable(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                  />
                  <label htmlFor={regAvailableId} className="font-semibold text-slate-700">
                    I am actively available to donate
                  </label>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                  Registering as a donor does not confirm medical eligibility. Eligibility must be assessed by an authorized blood bank or medical professional.
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <PrimaryButton
                    type="submit"
                    size="sm"
                    className="flex-1 bg-rose-600 hover:bg-rose-500 border-none shadow-sm"
                    disabled={isRegistering}
                  >
                    {isRegistering ? 'Saving...' : donorProfile ? 'Save Changes' : 'Register as Donor'}
                  </PrimaryButton>
                  {donorProfile && (
                    <SecondaryButton
                      size="sm"
                      onClick={() => setIsEditingProfile(false)}
                      disabled={isRegistering}
                    >
                      Cancel
                    </SecondaryButton>
                  )}
                </div>
              </form>
            )}
          </HealthCard>

          {/* SECTION 7: Safety & Eligibility Checklist */}
          <HealthCard title="Eligibility & Health Safety" subtitle="Standard blood donation guidelines">
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Age between 18 and 65 years.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Body weight above 45 kg.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Minimum 90 days gap between whole blood donations.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>Zero personal contact details or medical histories exposed.</span>
              </li>
            </ul>
          </HealthCard>
        </div>

        {/* SECTION 4: Find Compatible Donors */}
        <div className="lg:col-span-2 space-y-6">
          <HealthCard
            title="Find Compatible Voluntary Donors"
            subtitle="Search active voluntary donors by required blood group and location"
          >
            <form onSubmit={handleSearchDonors} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor={searchBloodGroupId} className="block text-xs font-semibold text-slate-700 mb-1">
                    Required Blood Group *
                  </label>
                  <select
                    id={searchBloodGroupId}
                    value={searchBloodGroup}
                    onChange={(e) => setSearchBloodGroup(e.target.value as BloodGroup)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg} (Recipient)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={searchStateId} className="block text-xs font-semibold text-slate-700 mb-1">
                    State *
                  </label>
                  <select
                    id={searchStateId}
                    value={searchState}
                    onChange={(e) => setSearchState(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor={searchCityId} className="block text-xs font-semibold text-slate-700 mb-1">
                    City (Optional)
                  </label>
                  <input
                    id={searchCityId}
                    type="text"
                    placeholder="e.g. Chennai"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    id={searchAvailOnlyId}
                    type="checkbox"
                    checked={searchAvailOnly}
                    onChange={(e) => setSearchAvailOnly(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                  />
                  <label htmlFor={searchAvailOnlyId} className="text-xs font-medium text-slate-600">
                    Show only available donors
                  </label>
                </div>

                <PrimaryButton
                  type="submit"
                  size="sm"
                  icon={<Search className="w-3.5 h-3.5" />}
                  className="bg-rose-600 hover:bg-rose-500 border-none shadow-sm"
                  disabled={isSearching}
                >
                  {isSearching ? 'Searching...' : 'Find Compatible Donors'}
                </PrimaryButton>
              </div>

              {/* Compatible group tags */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-500 font-medium">Compatible Donor Groups for {searchBloodGroup}:</span>
                {compatibleDonorGroups.map((grp) => (
                  <span
                    key={grp}
                    className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[11px]"
                  >
                    {grp}
                  </span>
                ))}
              </div>
            </form>

            {/* Results Grid */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              {isSearching ? (
                <LoadingState message="Matching compatible blood donors..." />
              ) : hasSearched && searchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Droplet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No compatible donors found in this location</p>
                  <p className="mt-1">Try expanding search to other cities or adjacent districts.</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-700">
                    {searchResults.length} Compatible Donor{searchResults.length > 1 ? 's' : ''} Found:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {searchResults.map((donor) => {
                      const isCompat = canDonate(donor.blood_group, searchBloodGroup);
                      return (
                        <div
                          key={donor.id}
                          className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-rose-300 transition-all flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-extrabold text-sm">
                                {donor.blood_group}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-900">Voluntary Donor</span>
                                  {isCompat && (
                                    <Badge variant="success" size="sm">
                                      Match
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">
                                  {donor.city ? `${donor.city}, ` : ''}{donor.state_code}
                                </p>
                              </div>
                            </div>

                            <Badge variant={donor.is_available ? 'success' : 'neutral'} size="sm">
                              {donor.is_available ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">
                              Last: {donor.last_donation_date || 'N/A'}
                            </span>
                            <PrimaryButton
                              size="sm"
                              icon={<Send className="w-3 h-3" />}
                              className="bg-rose-600 hover:bg-rose-500 border-none text-xs"
                              disabled={!donor.is_available}
                              onClick={() => handleInitiateRequest(donor)}
                            >
                              Request
                            </PrimaryButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </HealthCard>

          {/* SECTION 6: My Donation Requests (Incoming to Donor) */}
          <HealthCard
            title="My Donation Requests (Incoming)"
            subtitle="Requests from patients in your region seeking blood donation"
          >
            {isLoadingRequests ? (
              <LoadingState message="Loading requests..." />
            ) : incomingRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
                <UserCheck className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p>No incoming blood donation requests at this time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="danger" size="sm" className="font-bold">
                          {req.blood_group} Required
                        </Badge>
                        <Badge variant={req.urgency === 'URGENT' ? 'danger' : 'info'} size="sm">
                          {req.urgency}
                        </Badge>
                        <Badge
                          variant={
                            req.status === 'ACCEPTED'
                              ? 'success'
                              : req.status === 'DECLINED'
                              ? 'neutral'
                              : req.status === 'CANCELLED'
                              ? 'neutral'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {req.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-600">
                        Location: {req.city ? `${req.city}, ` : ''}{req.state_code} • Requested on{' '}
                        {new Date(req.requested_at).toLocaleDateString()}
                      </p>

                      {req.message && (
                        <p className="text-xs italic text-slate-500 bg-slate-50 p-2 rounded-lg mt-1">
                          "{req.message}"
                        </p>
                      )}
                    </div>

                    {req.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <PrimaryButton
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 border-none text-xs"
                          disabled={actionInProgressId === req.id}
                          onClick={() => handleAccept(req.id)}
                        >
                          Accept
                        </PrimaryButton>
                        <SecondaryButton
                          size="sm"
                          className="text-xs text-slate-600 hover:bg-slate-100"
                          disabled={actionInProgressId === req.id}
                          onClick={() => handleDecline(req.id)}
                        >
                          Decline
                        </SecondaryButton>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </HealthCard>

          {/* SECTION 5: My Blood Requests (Sent by Requester) */}
          <HealthCard
            title="My Blood Requests (Sent)"
            subtitle="Status of donation requests you have sent to voluntary donors"
          >
            {isLoadingRequests ? (
              <LoadingState message="Loading sent requests..." />
            ) : mySentRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
                <Clock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p>You have not sent any blood donation requests yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mySentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Blood Group: {req.blood_group}
                        </span>
                        <Badge variant={req.urgency === 'URGENT' ? 'danger' : 'info'} size="sm">
                          {req.urgency}
                        </Badge>
                        <Badge
                          variant={
                            req.status === 'ACCEPTED'
                              ? 'success'
                              : req.status === 'DECLINED'
                              ? 'neutral'
                              : req.status === 'CANCELLED'
                              ? 'neutral'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {req.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-500">
                        Region: {req.city ? `${req.city}, ` : ''}{req.state_code} • Sent{' '}
                        {new Date(req.requested_at).toLocaleDateString()}
                      </p>
                    </div>

                    {req.status === 'PENDING' && (
                      <SecondaryButton
                        size="sm"
                        className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                        disabled={actionInProgressId === req.id}
                        onClick={() => handleCancel(req.id)}
                      >
                        Cancel Request
                      </SecondaryButton>
                    )}
                  </div>
                ))}
              </div>
            )}
          </HealthCard>
        </div>
      </div>

      {/* REQUEST BLOOD DONATION MODAL */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Blood Donation"
        subtitle="Coordinate voluntary donation matching"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <SecondaryButton
              size="sm"
              onClick={() => setIsRequestModalOpen(false)}
              disabled={isSendingRequest}
            >
              Cancel
            </SecondaryButton>
            <PrimaryButton
              size="sm"
              className="bg-rose-600 hover:bg-rose-500 border-none shadow-sm"
              disabled={isSendingRequest}
              onClick={handleSubmitRequest}
            >
              {isSendingRequest ? 'Sending Request...' : 'Send Donation Request'}
            </PrimaryButton>
          </div>
        }
      >
        {selectedDonor && (
          <div className="space-y-4 text-xs">
            {requestFeedback && (
              <div
                className={`p-3 rounded-xl border ${
                  requestFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {requestFeedback.message}
              </div>
            )}

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Required Blood Group</span>
                <span className="font-bold text-rose-600 text-sm">{searchBloodGroup}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Donor Blood Group</span>
                <span className="font-bold text-slate-800 text-sm">{selectedDonor.blood_group}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Donor Region</span>
                <span className="font-medium text-slate-700">
                  {selectedDonor.city ? `${selectedDonor.city}, ` : ''}{selectedDonor.state_code}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor={reqUrgencyId} className="block font-semibold text-slate-700 mb-1">
                Urgency Level *
              </label>
              <select
                id={reqUrgencyId}
                value={reqUrgency}
                onChange={(e) => setReqUrgency(e.target.value as UrgencyLevel)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
              >
                <option value="NORMAL">Normal (Elective / Scheduled)</option>
                <option value="URGENT">Urgent (Immediate Need)</option>
              </select>
            </div>

            <div>
              <label htmlFor={reqMessageId} className="block font-semibold text-slate-700 mb-1">
                Hospital / Requirement Note (Optional)
              </label>
              <textarea
                id={reqMessageId}
                rows={3}
                placeholder="e.g. Needed for patient undergoing surgical procedure at City Hospital"
                value={reqMessage}
                onChange={(e) => setReqMessage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] leading-relaxed">
              <p className="font-semibold mb-1">Confirmation & Consent</p>
              You are requesting blood donation from this donor. The donor may accept or decline the request. Donor contact information remains private. Eligibility must be verified by the hospital blood bank.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
