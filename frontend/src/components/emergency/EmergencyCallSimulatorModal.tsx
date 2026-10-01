import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SecondaryButton } from '../ui/SecondaryButton';
import {
  PhoneCall,
  Volume2,
  PhoneOff,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { EmergencyBloodRequest, EmergencyBloodResponseStatus } from '../../services/emergencyBlood';
import {
  generateEmergencyCallMessage,
  handleEmergencyCallResponse,
} from '../../services/emergencyBlood';

interface EmergencyCallSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: EmergencyBloodRequest | null;
  donorId?: string;
  onResponseRecorded?: (status: EmergencyBloodResponseStatus) => void;
}

export const EmergencyCallSimulatorModal: React.FC<EmergencyCallSimulatorModalProps> = ({
  isOpen,
  onClose,
  request,
  donorId = 'mock-patient-uid',
  onResponseRecorded,
}) => {
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [unitsOffered, setUnitsOffered] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [callStatus, setCallStatus] = useState<'IN_PROGRESS' | 'COMPLETED' | 'ERROR'>('IN_PROGRESS');
  const [resultStatus, setResultStatus] = useState<EmergencyBloodResponseStatus | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!request) return null;

  const spokenTranscript = generateEmergencyCallMessage(request);

  const handleDigitPress = async (digit: number) => {
    setSelectedDigit(digit);
    setFeedbackMsg(null);

    // If partially available, prompt for units before sending
    if (digit === 2 && unitsOffered <= 0) {
      setFeedbackMsg('Please select units offered for partially available response.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await handleEmergencyCallResponse(
        request.id,
        donorId,
        digit,
        digit === 1 ? (unitsOffered || 1) : digit === 2 ? unitsOffered : 0
      );

      if (res.success && res.status) {
        setCallStatus('COMPLETED');
        setResultStatus(res.status);
        if (onResponseRecorded) {
          onResponseRecorded(res.status);
        }
      } else {
        setFeedbackMsg(res.error || 'Failed to process DTMF input');
      }
    } catch (err: any) {
      setFeedbackMsg(err?.message || 'Call processing error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetAndClose = () => {
    setSelectedDigit(null);
    setCallStatus('IN_PROGRESS');
    setResultStatus(null);
    setFeedbackMsg(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title="Automated Emergency Voice Call Dispatch"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Calling Header Indicator */}
        <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-2xl">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-rose-600 text-white animate-pulse">
              <PhoneCall className="w-5 h-5" />
            </span>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                AI Emergency Voice Channel
              </p>
              <p className="text-sm font-bold text-white">HEALTH WALLET EMERGENCY</p>
            </div>
          </div>
          <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
            {callStatus === 'COMPLETED' ? '00:48 • Call Ended' : '00:15 • Live'}
          </span>
        </div>

        {/* AI Voice Spoken Message Script Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Volume2 className="w-4 h-4 text-sky-600 flex-shrink-0 animate-bounce" />
            <span>Spoken Dispatch Transcript (AI Voice)</span>
          </div>
          <p className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            {spokenTranscript}
          </p>
        </div>

        {callStatus === 'COMPLETED' ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">DTMF Response Captured</h4>
              <p className="text-xs text-slate-600 mt-1">
                Response recorded as:{' '}
                <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  {resultStatus}
                </span>
              </p>
            </div>
            <p className="text-[11px] text-slate-500">
              The hospital emergency desk has been notified of your response. Thank you for using Health Wallet Emergency Network.
            </p>
            <div className="pt-1">
              <PrimaryButton onClick={handleResetAndClose} size="sm">
                Close Call Simulator
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Interactive DTMF Telephone Keypad</span>
              <span className="text-slate-500 text-[11px]">Press key to respond</span>
            </div>

            {/* DTMF Keypad Grid */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleDigitPress(1)}
                disabled={isProcessing}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  selectedDigit === 1
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-300'
                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-slate-800'
                }`}
                id="btn-dtmf-1"
              >
                <span className="text-xl font-bold font-mono">1</span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">Available</span>
              </button>

              <button
                type="button"
                onClick={() => handleDigitPress(2)}
                disabled={isProcessing}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  selectedDigit === 2
                    ? 'bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-300'
                    : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-slate-800'
                }`}
                id="btn-dtmf-2"
              >
                <span className="text-xl font-bold font-mono">2</span>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Partially Avail</span>
              </button>

              <button
                type="button"
                onClick={() => handleDigitPress(3)}
                disabled={isProcessing}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  selectedDigit === 3
                    ? 'bg-slate-100 border-slate-400 text-slate-800 ring-2 ring-slate-300'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
                id="btn-dtmf-3"
              >
                <span className="text-xl font-bold font-mono">3</span>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Unavailable</span>
              </button>
            </div>

            {/* Units Selector if Key 2 is selected */}
            {selectedDigit === 2 && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-2">
                <label className="block font-semibold text-amber-900" htmlFor="dtmf-units">
                  Specify Units Offered for Partial Availability:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="dtmf-units"
                    type="number"
                    min="1"
                    max="3"
                    value={unitsOffered}
                    onChange={(e) => setUnitsOffered(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-xs font-bold"
                  />
                  <span className="text-slate-600">Unit(s)</span>
                  <PrimaryButton
                    onClick={() => handleDigitPress(2)}
                    size="sm"
                    className="ml-auto bg-amber-600 hover:bg-amber-700"
                  >
                    Confirm Units
                  </PrimaryButton>
                </div>
              </div>
            )}

            {feedbackMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{feedbackMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                DTMF standard mapping: 1 = AVAILABLE, 2 = PARTIALLY_AVAILABLE, 3 = UNAVAILABLE
              </span>
              <SecondaryButton onClick={handleResetAndClose} size="sm">
                End Call
              </SecondaryButton>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
