import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Stethoscope,
  Building2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  UserCheck,
  Calendar,
  Lock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getPatientAccessRequests,
  getPatientConsents,
  approveAccessRequest,
  denyAccessRequest,
  revokeConsent,
} from '../services/consent';
import { type AccessRequest, type Consent } from '../services/supabase';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';

export const PatientAccessRequests: React.FC = () => {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'HISTORY'>('PENDING');

  // Modal States
  const [approvingReq, setApprovingReq] = useState<AccessRequest | null>(null);
  const [denyingReq, setDenyingReq] = useState<AccessRequest | null>(null);
  const [revokingConsent, setRevokingConsent] = useState<Consent | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const loadData = async () => {
    setIsLoading(true);
    const [reqs, cons] = await Promise.all([
      getPatientAccessRequests(profile?.id),
      getPatientConsents(profile?.id),
    ]);
    setRequests(reqs);
    setConsents(cons);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  const handleApprove = async () => {
    if (!approvingReq) return;
    setActionInProgress(true);
    setFeedbackMsg(null);
    const res = await approveAccessRequest(approvingReq.id);
    setActionInProgress(false);

    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: `Access approved for ${approvingReq.doctor?.doctor_name || 'the doctor'}. Valid for ${
          approvingReq.duration_hours
        } hours.`,
      });
      setApprovingReq(null);
      await loadData();
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Failed to approve access request.',
      });
    }
  };

  const handleDeny = async () => {
    if (!denyingReq) return;
    setActionInProgress(true);
    setFeedbackMsg(null);
    const res = await denyAccessRequest(denyingReq.id);
    setActionInProgress(false);

    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: 'Access request successfully denied.',
      });
      setDenyingReq(null);
      await loadData();
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Failed to deny access request.',
      });
    }
  };

  const handleRevoke = async () => {
    if (!revokingConsent) return;
    setActionInProgress(true);
    setFeedbackMsg(null);
    const res = await revokeConsent(revokingConsent.id);
    setActionInProgress(false);

    if (res.success) {
      setFeedbackMsg({
        type: 'success',
        text: 'Doctor medical record access has been immediately revoked.',
      });
      setRevokingConsent(null);
      await loadData();
    } else {
      setFeedbackMsg({
        type: 'error',
        text: res.error || 'Failed to revoke consent.',
      });
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const approvedConsents = consents.filter(
    (c) => c.status === 'APPROVED' && new Date(c.expires_at).getTime() > Date.now()
  );
  const historyConsents = consents.filter(
    (c) =>
      c.status === 'DENIED' ||
      c.status === 'REVOKED' ||
      (c.status === 'APPROVED' && new Date(c.expires_at).getTime() <= Date.now())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
          Doctor Access Requests & Consents
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review, approve, or deny clinical record access requests initiated by licensed doctors.
        </p>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-200 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 shadow-xs flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'PENDING'
              ? 'bg-sky-50 text-sky-700 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>Pending Requests</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === 'PENDING'
                ? 'bg-sky-200/70 text-sky-900'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {pendingRequests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('APPROVED')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'APPROVED'
              ? 'bg-sky-50 text-sky-700 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>Active Consents</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-200/70 text-emerald-900'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {approvedConsents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'HISTORY'
              ? 'bg-sky-50 text-sky-700 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>History & Expired</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === 'HISTORY'
                ? 'bg-slate-200 text-slate-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {historyConsents.length}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingState message="Loading doctor access requests..." />
      ) : activeTab === 'PENDING' ? (
        /* PENDING REQUESTS TAB */
        pendingRequests.length === 0 ? (
          <EmptyState
            title="No Pending Access Requests"
            description="When a doctor requests access to your Health Wallet records using your Health Wallet ID, it will appear here for your review and approval."
            icon={<KeyRound className="w-8 h-8 text-slate-400" />}
          />
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5 hover:border-sky-200 transition-all"
              >
                {/* Doctor Identity Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">
                          {req.doctor?.doctor_name || 'Dr. Medical Practitioner'}
                        </h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Pending Approval
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {req.doctor?.specialization} •{' '}
                        <span className="text-slate-700">{req.doctor?.hospital_name}</span>
                      </p>
                      {req.doctor?.registration_number && (
                        <p className="text-[11px] font-mono text-sky-800">
                          Reg: {req.doctor.registration_number}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <span className="block">Requested:</span>
                    <span className="font-medium text-slate-700">
                      {new Date(req.requested_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Clinical Justification */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <span className="text-slate-500 font-semibold block text-[11px]">
                    Clinical Reason for Request:
                  </span>
                  <p className="text-slate-800 font-medium leading-relaxed">
                    &ldquo;{req.reason}&rdquo;
                  </p>
                </div>

                {/* Requested Record Categories */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-slate-500 font-semibold block text-[11px]">
                    Requested Health Record Categories:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {req.requested_record_types.map((type) => (
                      <span
                        key={type}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-100 text-xs font-semibold"
                      >
                        ✓ {type}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Duration notice */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Requested Duration:{' '}
                    <strong className="text-slate-800">{req.duration_hours} Hours</strong>{' '}
                    (access will automatically expire afterwards)
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <SecondaryButton
                    onClick={() => setDenyingReq(req)}
                    className="text-rose-600 hover:bg-rose-50"
                  >
                    Deny
                  </SecondaryButton>
                  <PrimaryButton
                    onClick={() => setApprovingReq(req)}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Review &amp; Approve
                  </PrimaryButton>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'APPROVED' ? (
        /* ACTIVE CONSENTS TAB */
        approvedConsents.length === 0 ? (
          <EmptyState
            title="No Active Consents"
            description="You do not have any currently active consents granted to doctors."
            icon={<ShieldCheck className="w-8 h-8 text-slate-400" />}
          />
        ) : (
          <div className="space-y-4">
            {approvedConsents.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {c.doctor?.doctor_name || 'Dr. Medical Practitioner'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {c.doctor?.specialization} • {c.doctor?.hospital_name}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Active Consent
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">
                      Approved Record Categories:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {c.approved_record_types.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-[11px] font-semibold"
                        >
                          ✓ {type}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 block text-[11px]">Expires On:</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(c.expires_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    You can revoke this consent at any time to immediately cut off record viewing.
                  </span>
                  <button
                    type="button"
                    onClick={() => setRevokingConsent(c)}
                    className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
                  >
                    Revoke Access
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* HISTORY TAB */
        historyConsents.length === 0 ? (
          <EmptyState
            title="No Past Consents"
            description="Historical decisions (denied, revoked, and expired consents) will appear here."
            icon={<Clock className="w-8 h-8 text-slate-400" />}
          />
        ) : (
          <div className="space-y-3">
            {historyConsents.map((c) => {
              const isExpired =
                c.status === 'APPROVED' && new Date(c.expires_at).getTime() <= Date.now();
              const displayStatus = isExpired ? 'EXPIRED' : c.status;

              return (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {c.doctor?.doctor_name || 'Dr. Medical Practitioner'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          displayStatus === 'DENIED'
                            ? 'bg-rose-100 text-rose-800'
                            : displayStatus === 'REVOKED'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {displayStatus}
                      </span>
                    </div>
                    <p className="text-slate-500">
                      {c.doctor?.specialization} • {c.doctor?.hospital_name}
                    </p>
                  </div>

                  <div className="text-right text-[11px] text-slate-400">
                    <span>
                      {displayStatus === 'REVOKED' && c.revoked_at
                        ? `Revoked on ${new Date(c.revoked_at).toLocaleDateString()}`
                        : displayStatus === 'DENIED' && c.denied_at
                        ? `Denied on ${new Date(c.denied_at).toLocaleDateString()}`
                        : `Expired on ${new Date(c.expires_at).toLocaleDateString()}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* APPROVAL CONFIRMATION MODAL */}
      {approvingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Approve Medical Record Access?
                </h3>
                <p className="text-xs text-slate-500">Verify authorization details before confirming</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-bold text-slate-900">
                  {approvingReq.doctor?.doctor_name || 'Dr. Medical Practitioner'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hospital:</span>
                <span className="font-medium text-slate-700">
                  {approvingReq.doctor?.hospital_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-bold text-sky-800">
                  {approvingReq.duration_hours} Hours
                </span>
              </div>
              <div className="pt-1">
                <span className="text-slate-500 block text-[11px] mb-1">Approved Categories:</span>
                <div className="flex flex-wrap gap-1">
                  {approvingReq.requested_record_types.map((type) => (
                    <span
                      key={type}
                      className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-semibold"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Only the approved categories above will be shared. Access automatically expires after{' '}
              {approvingReq.duration_hours} hours. You may revoke access at any time.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <SecondaryButton
                onClick={() => setApprovingReq(null)}
                disabled={actionInProgress}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton
                onClick={handleApprove}
                isLoading={actionInProgress}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Approve Access
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* DENIAL CONFIRMATION MODAL */}
      {denyingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Deny Access Request?</h3>
                <p className="text-xs text-slate-500">
                  {denyingReq.doctor?.doctor_name || 'The doctor'} will not receive access to any records.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to decline this request? The doctor will be notified that the request was declined.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <SecondaryButton
                onClick={() => setDenyingReq(null)}
                disabled={actionInProgress}
              >
                Cancel
              </SecondaryButton>
              <button
                type="button"
                onClick={handleDeny}
                disabled={actionInProgress}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              >
                {actionInProgress ? 'Denying...' : 'Confirm Denial'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVOKE CONFIRMATION MODAL */}
      {revokingConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Revoke Medical Access?</h3>
                <p className="text-xs text-slate-500">
                  Immediately terminate {revokingConsent.doctor?.doctor_name || 'the doctor&apos;s'} access
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              This will immediately cut off record viewing. The doctor will be blocked from viewing any further records for your Health Wallet.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <SecondaryButton
                onClick={() => setRevokingConsent(null)}
                disabled={actionInProgress}
              >
                Cancel
              </SecondaryButton>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={actionInProgress}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              >
                {actionInProgress ? 'Revoking...' : 'Revoke Access Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
