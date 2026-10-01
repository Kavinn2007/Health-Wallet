import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Plus,
  Building2,
  Clock,
  Droplet,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  PhoneCall,
  Search,
  Filter,
  FileText,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SecondaryButton } from '../../components/ui/SecondaryButton';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { EmergencyRequestStatusBadge } from '../../components/emergency/EmergencyRequestStatusBadge';
import { EmergencyCallSimulatorModal } from '../../components/emergency/EmergencyCallSimulatorModal';
import type {
  EmergencyBloodRequest,
  EmergencyBloodResponse,
  EmergencyBloodPriority,
  CreateEmergencyRequestInput,
} from '../../services/emergencyBlood';
import {
  listHospitalEmergencyRequests,
  createEmergencyBloodRequest,
  getEmergencyRequestResponses,
  verifyEmergencyDonor,
  rejectEmergencyDonor,
  updateEmergencyRequestStatus,
  generateEmergencyCallMessage,
} from '../../services/emergencyBlood';
import type { BloodGroup } from '../../services/bloodDonation';
import { getHospitalsByState, type Hospital } from '../../services/hospitals';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const DoctorEmergencyBlood: React.FC = () => {
  const { doctorProfile } = useAuth();

  const [requests, setRequests] = useState<EmergencyBloodRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EmergencyBloodRequest | null>(null);
  const [responses, setResponses] = useState<EmergencyBloodResponse[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(true);
  const [isLoadingResponses, setIsLoadingResponses] = useState<boolean>(false);
  const [directoryHospitals, setDirectoryHospitals] = useState<Hospital[]>([]);

  // Search parameters for deep linking from Hospital Directory
  const [searchParams] = useSearchParams();

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isCallSimOpen, setIsCallSimOpen] = useState<boolean>(false);
  const [isVerifyingResponseId, setIsVerifyingResponseId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form State for Request Creation
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [hospitalName, setHospitalName] = useState<string>(
    doctorProfile?.hospital_name || 'ABC Multi-Speciality Hospital'
  );
  const [hospitalLocation, setHospitalLocation] = useState<string>('Coimbatore');
  const [authorizedDept, setAuthorizedDept] = useState<string>('Emergency Department');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('B+');
  const [unitsRequired, setUnitsRequired] = useState<number>(2);
  const [priority, setPriority] = useState<EmergencyBloodPriority>('CRITICAL');
  const [requiredWithinMinutes, setRequiredWithinMinutes] = useState<number>(120);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  useEffect(() => {
    loadRequests();
    loadDirectoryHospitals();
  }, []);

  // Handle URL query parameters from Hospital Directory
  useEffect(() => {
    const qHospId = searchParams.get('hospitalId');
    const qHospName = searchParams.get('hospitalName');
    const qCity = searchParams.get('city');

    if (qHospId || qHospName) {
      if (qHospId) setSelectedHospitalId(qHospId);
      if (qHospName) setHospitalName(qHospName);
      if (qCity) setHospitalLocation(qCity);
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  const loadDirectoryHospitals = async () => {
    try {
      const hosps = await getHospitalsByState('Tamil Nadu');
      setDirectoryHospitals(hosps);
    } catch (e) {
      console.warn('Failed to load directory hospitals', e);
    }
  };

  const loadRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const data = await listHospitalEmergencyRequests();
      setRequests(data);
      if (data.length > 0 && !selectedRequest) {
        selectRequest(data[0]);
      }
    } catch (err) {
      console.error('Failed to load emergency blood requests', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const selectRequest = async (req: EmergencyBloodRequest) => {
    setSelectedRequest(req);
    setIsLoadingResponses(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const resps = await getEmergencyRequestResponses(req.id);
      setResponses(resps);
    } catch (err) {
      console.error('Failed to load responses for request', err);
    } finally {
      setIsLoadingResponses(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setActionError(null);

    try {
      const result = await createEmergencyBloodRequest({
        hospital_id: selectedHospitalId || undefined,
        hospital_name: hospitalName.trim(),
        hospital_location: hospitalLocation.trim(),
        authorized_department: authorizedDept.trim(),
        blood_group: bloodGroup,
        units_required: unitsRequired,
        priority: priority,
        required_within_minutes: requiredWithinMinutes,
      });

      if (result.success && result.data) {
        setIsCreateModalOpen(false);
        setActionSuccess(`Emergency request created successfully (${result.data.request_code}). Eligible donors notified.`);
        await loadRequests();
        selectRequest(result.data);
      } else {
        setActionError(result.error || 'Failed to create emergency request');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Emergency request creation failed');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleVerifyDonor = async (responseId: string) => {
    setIsVerifyingResponseId(responseId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await verifyEmergencyDonor(responseId, 'Verified by hospital clinical desk');
      if (res.success) {
        setActionSuccess('Donor response verified. Donor notified of acceptance.');
        if (selectedRequest) {
          const updated = await getEmergencyRequestResponses(selectedRequest.id);
          setResponses(updated);
        }
      } else {
        setActionError(res.error || 'Failed to verify donor');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Verification failed');
    } finally {
      setIsVerifyingResponseId(null);
    }
  };

  const handleRejectDonor = async (responseId: string) => {
    setIsVerifyingResponseId(responseId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await rejectEmergencyDonor(responseId, 'Ineligible or timing conflict');
      if (res.success) {
        setActionSuccess('Donor response rejected/closed.');
        if (selectedRequest) {
          const updated = await getEmergencyRequestResponses(selectedRequest.id);
          setResponses(updated);
        }
      } else {
        setActionError(res.error || 'Failed to reject donor');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Rejection failed');
    } finally {
      setIsVerifyingResponseId(null);
    }
  };

  const handleUpdateStatus = async (newStatus: 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED') => {
    if (!selectedRequest) return;
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await updateEmergencyRequestStatus(selectedRequest.id, newStatus);
      if (res.success) {
        setActionSuccess(`Emergency request status updated to ${newStatus}.`);
        await loadRequests();
        const updatedReq = { ...selectedRequest, status: newStatus };
        setSelectedRequest(updatedReq);
      } else {
        setActionError(res.error || 'Failed to update request status');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Status update failed');
    }
  };

  // Response summary counts
  const countWilling = responses.filter((r) => r.response_status === 'WILLING_TO_HELP').length;
  const countAvailable = responses.filter((r) => r.response_status === 'AVAILABLE').length;
  const countPartially = responses.filter((r) => r.response_status === 'PARTIALLY_AVAILABLE').length;
  const countUnavailable = responses.filter((r) => r.response_status === 'UNAVAILABLE').length;
  const countPending = responses.filter((r) => r.response_status === 'VERIFICATION_PENDING').length;
  const countVerified = responses.filter((r) => r.response_status === 'VERIFIED').length;
  const countRejected = responses.filter((r) => r.response_status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <AlertCircle className="w-5 h-5 text-rose-600 animate-pulse" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Emergency Blood Network
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Hospital Emergency Department & Blood Bank Verification Portal
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PrimaryButton
            onClick={() => setIsCreateModalOpen(true)}
            size="md"
            className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 gap-1.5 font-bold"
            id="btn-create-emergency-requirement"
          >
            <Plus className="w-4 h-4" />
            <span>New Emergency Requirement</span>
          </PrimaryButton>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Grid: Left Requests List / Right Detail & Responses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hospital Requests (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Hospital Requirements ({requests.length})
            </h2>
            <button
              onClick={loadRequests}
              className="text-xs text-sky-600 hover:underline cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {isLoadingRequests ? (
            <LoadingState message="Loading requirements..." />
          ) : requests.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
              No emergency blood requests created yet. Click "New Emergency Requirement" to dispatch.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <div
                    key={req.id}
                    onClick={() => selectRequest(req)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-200 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {req.request_code}
                      </span>
                      <EmergencyRequestStatusBadge status={req.status} size="sm" />
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-lg font-black text-rose-600">
                        {req.blood_group}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        • {req.units_required} {req.units_required === 1 ? 'Unit' : 'Units'}
                      </span>
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                        {req.priority}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                      <span className="truncate">{req.hospital_name}</span>
                      <span className="font-medium text-slate-700 flex-shrink-0">
                        {Math.round(req.required_within_minutes / 60)}h limit
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detail, Verification & Donor Responses (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedRequest ? (
            <div className="space-y-6">
              {/* Selected Request Overview Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-rose-700">
                        {selectedRequest.request_code}
                      </span>
                      <EmergencyRequestStatusBadge status={selectedRequest.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Authorized by: <strong>{selectedRequest.authorized_department}</strong>
                    </p>
                  </div>

                  {/* Lifecycle Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <SecondaryButton
                      onClick={() => setIsCallSimOpen(true)}
                      size="sm"
                      className="text-xs gap-1 text-slate-700"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-sky-600" />
                      <span>AI Call Audio</span>
                    </SecondaryButton>

                    {selectedRequest.status === 'ACTIVE' && (
                      <>
                        <SecondaryButton
                          onClick={() => handleUpdateStatus('PARTIALLY_FULFILLED')}
                          size="sm"
                          className="text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                        >
                          Mark Partially Fulfilled
                        </SecondaryButton>
                        <PrimaryButton
                          onClick={() => handleUpdateStatus('FULFILLED')}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                        >
                          Mark Fulfilled
                        </PrimaryButton>
                        <SecondaryButton
                          onClick={() => handleUpdateStatus('CANCELLED')}
                          size="sm"
                          className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                        >
                          Cancel
                        </SecondaryButton>
                      </>
                    )}

                    {selectedRequest.status === 'PARTIALLY_FULFILLED' && (
                      <PrimaryButton
                        onClick={() => handleUpdateStatus('FULFILLED')}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                      >
                        Mark Fulfilled
                      </PrimaryButton>
                    )}
                  </div>
                </div>

                {/* Key Spec Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-slate-500 font-medium">Hospital Center</p>
                    <p className="font-bold text-slate-900 truncate">{selectedRequest.hospital_name}</p>
                    <p className="text-[11px] text-slate-500">
                      {selectedRequest.hospital_location}
                      {selectedRequest.hospital_id ? ' • ID Verified' : ''}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-slate-500 font-medium">Blood Group</p>
                    <p className="font-black text-rose-600 text-sm">{selectedRequest.blood_group}</p>
                    <p className="text-[11px] text-slate-600 font-semibold">{selectedRequest.units_required} Units</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-slate-500 font-medium">Urgency Window</p>
                    <p className="font-bold text-slate-900">
                      {Math.round(selectedRequest.required_within_minutes / 60)} Hours
                    </p>
                    <p className="text-[11px] text-slate-500">Priority: {selectedRequest.priority}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-slate-500 font-medium">Donor Responses</p>
                    <p className="font-bold text-slate-900 text-sm">{responses.length} Total</p>
                    <p className="text-[11px] text-emerald-700 font-semibold">{countVerified} Verified</p>
                  </div>
                </div>

                {/* Response Metrics Aggregation Bar */}
                <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Donor Response Summary ({selectedRequest.blood_group} — {selectedRequest.units_required} Units • {selectedRequest.priority})
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold">
                      Willing to Help: {countWilling}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                      Available (Call): {countAvailable}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">
                      Partially Available: {countPartially}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-semibold">
                      Unavailable: {countUnavailable}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold border border-amber-300">
                      Pending Verification: {countPending}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-950 font-extrabold border border-emerald-300">
                      Verified: {countVerified}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-semibold">
                      Rejected: {countRejected}
                    </span>
                  </div>
                </div>
              </div>

              {/* Donor Responses Table / List */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-rose-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Donor Verification Queue ({responses.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Aadhaar / Mobile masked per security protocol
                  </span>
                </div>

                {isLoadingResponses ? (
                  <LoadingState message="Loading donor responses..." />
                ) : responses.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                    No donor responses recorded for this requirement yet. Compatible donors receive push alerts & AI call options.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {responses.map((resp) => {
                      const isActioning = isVerifyingResponseId === resp.id;
                      return (
                        <div key={resp.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-slate-800">
                                Donor ID: {resp.donor_user_id.substring(0, 8)}...
                              </span>
                              <EmergencyRequestStatusBadge status={resp.response_status} size="sm" type="response" />
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-600">
                              <span>
                                Units Offered: <strong className="text-slate-900">{resp.units_offered ?? 1}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Responded: {new Date(resp.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {resp.verification_notes && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-500 italic max-w-xs truncate" title={resp.verification_notes}>
                                    Note: {resp.verification_notes}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Verification Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {resp.response_status !== 'VERIFIED' && (
                              <PrimaryButton
                                onClick={() => handleVerifyDonor(resp.id)}
                                disabled={isActioning}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                              >
                                {isActioning ? 'Verifying...' : 'Verify Donor'}
                              </PrimaryButton>
                            )}

                            {resp.response_status !== 'REJECTED' && (
                              <SecondaryButton
                                onClick={() => handleRejectDonor(resp.id)}
                                disabled={isActioning}
                                size="sm"
                                className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                              >
                                Reject
                              </SecondaryButton>
                            )}

                            {resp.response_status === 'VERIFIED' && (
                              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-500">
              Select an emergency requirement from the left list to inspect details and verify donor responses.
            </div>
          )}
        </div>
      </div>

      {/* Create Emergency Blood Request Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Emergency Blood Requirement"
        maxWidth="md"
      >
        <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
          {/* Hospital Directory Selection */}
          {directoryHospitals.length > 0 && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="req-hospital-directory-select">
                Select Hospital from Directory (Optional)
              </label>
              <select
                id="req-hospital-directory-select"
                value={selectedHospitalId || ''}
                onChange={(e) => {
                  const hid = e.target.value;
                  setSelectedHospitalId(hid || null);
                  const found = directoryHospitals.find((h) => h.id === hid);
                  if (found) {
                    setHospitalName(found.hospital_name);
                    setHospitalLocation(found.city);
                  }
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none bg-slate-50 font-medium text-slate-800"
              >
                <option value="">-- Choose verified hospital from directory or type below --</option>
                {directoryHospitals.map((hosp) => (
                  <option key={hosp.id} value={hosp.id}>
                    🏥 {hosp.hospital_name} — {hosp.city}, {hosp.state_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="req-hospital-name">
              Hospital Name *
            </label>
            <input
              id="req-hospital-name"
              type="text"
              required
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="req-hospital-location">
                City / Location *
              </label>
              <input
                id="req-hospital-location"
                type="text"
                required
                value={hospitalLocation}
                onChange={(e) => setHospitalLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="req-authorized-dept">
                Authorized Department *
              </label>
              <input
                id="req-authorized-dept"
                type="text"
                required
                value={authorizedDept}
                onChange={(e) => setAuthorizedDept(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="req-blood-group">
                Blood Group *
              </label>
              <select
                id="req-blood-group"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none bg-white font-bold"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="req-units">
                Units Required *
              </label>
              <input
                id="req-units"
                type="number"
                min="1"
                max="10"
                required
                value={unitsRequired}
                onChange={(e) => setUnitsRequired(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="req-priority">
                Priority *
              </label>
              <select
                id="req-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as EmergencyBloodPriority)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none bg-white font-bold text-rose-700"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="NORMAL">NORMAL</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="req-required-time">
              Required Within (Minutes) *
            </label>
            <select
              id="req-required-time"
              value={requiredWithinMinutes}
              onChange={(e) => setRequiredWithinMinutes(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none bg-white"
            >
              <option value="60">Within 1 Hour (60 mins)</option>
              <option value="120">Within 2 Hours (120 mins) — Reference Standard</option>
              <option value="180">Within 3 Hours (180 mins)</option>
              <option value="240">Within 4 Hours (240 mins)</option>
              <option value="360">Within 6 Hours (360 mins)</option>
            </select>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
            <span className="font-bold block">🚨 Emergency Network Dispatch Notice</span>
            <p>
              Creating this requirement will generate a unique <strong>HW-EMR-YYYY-XXXX</strong> tracking code and immediately dispatch emergency alerts to compatible voluntary donors.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <SecondaryButton onClick={() => setIsCreateModalOpen(false)} size="md">
              Cancel
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              disabled={isSubmittingCreate}
              size="md"
              className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 font-bold"
            >
              {isSubmittingCreate ? 'Dispatching...' : 'Dispatch Emergency Requirement'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* AI Call Audio Simulator Modal */}
      {selectedRequest && (
        <EmergencyCallSimulatorModal
          isOpen={isCallSimOpen}
          onClose={() => setIsCallSimOpen(false)}
          request={selectedRequest}
          onResponseRecorded={async () => {
            const updated = await getEmergencyRequestResponses(selectedRequest.id);
            setResponses(updated);
          }}
        />
      )}
    </div>
  );
};
