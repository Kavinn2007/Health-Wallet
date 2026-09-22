import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  Camera,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { HealthCard } from '../components/ui/HealthCard';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { Badge } from '../components/ui/Badge';
import { ToastItem, type ToastMessage } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import {
  validateReportFile,
  uploadScannedReportDocument,
  performOpticalCharacterRecognition,
  extractStructuredReportData,
  confirmAndSaveScannedReport,
  type ProcessingStatus,
  type ExtractedReportData,
  type ExtractedReportTest,
  type UploadDocumentResult,
} from '../services/reportScanner';

export const ScanReport: React.FC = () => {
  const { profile } = useAuth();
  const patientId = profile?.id;

  // Processing state
  const [status, setStatus] = useState<ProcessingStatus>('SELECT_DOCUMENT');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected or captured document
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadDocumentResult | null>(null);

  // Camera capture state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Extracted data (patient-editable)
  const [extractedData, setExtractedData] = useState<ExtractedReportData | null>(null);

  // Saved record reference
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], title: string, message?: string) => {
    setToasts((prev) => [
      ...prev,
      { id: `toast-${Date.now()}-${Math.random()}`, type, title, message },
    ]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Clean up camera stream on unmount or mode switch
  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
      if (capturedBlobUrl) URL.revokeObjectURL(capturedBlobUrl);
    };
  }, [capturedBlobUrl]);

  // 1. Camera Initialization
  const startCamera = async () => {
    setCameraError(null);
    setCapturedBlobUrl(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by this browser. Please use file upload.');
      addToast('warning', 'Camera Unsupported', 'Your browser does not support optical camera capture.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera permission error:', err);
      let msg = 'Unable to access device camera. Please check browser permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera access in browser settings or upload a file.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device. Please upload a report file.';
      }
      setCameraError(msg);
      addToast('error', 'Camera Unavailable', msg);
    }
  };

  // 2. Capture Photo from Video Stream
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `camera_scan_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        setSelectedFile(capturedFile);
        const url = URL.createObjectURL(blob);
        setCapturedBlobUrl(url);
        stopCameraStream();
      },
      'image/jpeg',
      0.92
    );
  };

  // 3. File Input Selection
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateReportFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file format.');
      addToast('error', 'Invalid File', validation.error);
      e.target.value = '';
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setCapturedBlobUrl(URL.createObjectURL(file));
  };

  // 4. Ingest & OCR/AI Processing Pipeline
  const processDocument = async () => {
    if (!selectedFile) {
      addToast('warning', 'No Document', 'Please select or capture a medical report first.');
      return;
    }
    if (!patientId) {
      addToast('error', 'Session Required', 'Please log in to ingest records.');
      return;
    }

    setErrorMessage(null);

    try {
      // Step A: UPLOADING
      setStatus('UPLOADING');
      setStatusMessage('Uploading your report...');
      const uploadedDoc = await uploadScannedReportDocument(patientId, selectedFile);
      setUploadResult(uploadedDoc);

      // Step B: OCR PROCESSING
      setStatus('OCR_PROCESSING');
      setStatusMessage('Reading your medical report...');
      const ocrResult = await performOpticalCharacterRecognition(selectedFile);

      // Step C: AI STRUCTURED EXTRACTION
      setStatus('AI_EXTRACTING');
      setStatusMessage('Extracting information...');
      const structured = extractStructuredReportData(ocrResult.text, selectedFile.name);

      // Step D: PATIENT REVIEW MANDATORY
      setExtractedData(structured);
      setStatus('REVIEW_REQUIRED');
      setStatusMessage('Please review the extracted information before saving.');
    } catch (err: any) {
      console.error('Scan processing error:', err);
      setStatus('ERROR');
      setErrorMessage(err?.message || 'Unable to read this report. Please try another image.');
      addToast('error', 'Extraction Error', err?.message || 'Unable to parse document.');
    }
  };

  // 5. Patient Editing Handlers (Never overwritten by AI)
  const handleUpdateTest = (
    id: string,
    field: keyof ExtractedReportTest,
    value: string
  ) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      tests: extractedData.tests.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    });
  };

  const handleRemoveTest = (id: string) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      tests: extractedData.tests.filter((t) => t.id !== id),
    });
    addToast('info', 'Test Removed', 'The parameter was removed from extraction.');
  };

  const handleAddTest = () => {
    if (!extractedData) return;
    const newTest: ExtractedReportTest = {
      id: `test-man-${Date.now()}`,
      testName: 'New Test Parameter',
      value: '',
      unit: '',
      referenceRange: '',
      status: 'NORMAL',
      confidence: 1.0,
    };
    setExtractedData({
      ...extractedData,
      tests: [...extractedData.tests, newTest],
    });
  };

  // 6. Confirm & Save to Database (Master medical_records & lab_reports)
  const handleConfirmAndSave = async () => {
    if (!patientId || !extractedData || !uploadResult) {
      addToast('error', 'Error', 'Missing confirmed report information.');
      return;
    }

    setStatus('SAVING');
    setStatusMessage('Saving confirmed medical record to your Health Wallet...');

    try {
      const res = await confirmAndSaveScannedReport(patientId, extractedData, uploadResult);
      if (!res.success) {
        setStatus('REVIEW_REQUIRED');
        setErrorMessage(res.error || 'Failed to save confirmed report.');
        addToast('error', 'Save Failed', res.error || 'Database error.');
        return;
      }

      setSavedRecordId(res.recordId || null);
      setStatus('SUCCESS');
      setStatusMessage('Report saved successfully.');
      addToast('success', 'Report Saved', 'Your verified report has been added to your timeline.');
    } catch (err: any) {
      setStatus('REVIEW_REQUIRED');
      setErrorMessage(err?.message || 'Failed to save health record.');
      addToast('error', 'Error', err?.message || 'Database transaction failure.');
    }
  };

  // 7. Reset / Scan Another Report
  const handleResetScanner = () => {
    stopCameraStream();
    if (capturedBlobUrl) URL.revokeObjectURL(capturedBlobUrl);
    setSelectedFile(null);
    setUploadResult(null);
    setExtractedData(null);
    setCapturedBlobUrl(null);
    setSavedRecordId(null);
    setErrorMessage(null);
    setCameraError(null);
    setStatus('SELECT_DOCUMENT');
    setStatusMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>

      {/* Header */}
      <PageHeader
        title="Scan Medical Report"
        subtitle="Upload or scan your medical report. AI will extract the information for your review."
        badge={
          <Badge variant="primary" size="sm">
            AI Extraction Engine
          </Badge>
        }
      />

      {/* ------------------------------------------------------------- */}
      {/* STATE 1: SELECT_DOCUMENT (Initial Input Options)                */}
      {/* ------------------------------------------------------------- */}
      {status === 'SELECT_DOCUMENT' && (
        <div className="space-y-6">
          {/* Information & Privacy Notice */}
          <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-3 text-xs text-sky-900">
            <Sparkles className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sky-950">Patient-Controlled Medical Digitization</p>
              <p className="text-sky-800 leading-relaxed">
                Optical intelligence scans your lab report, prescription, or clinical summary. You
                will have full opportunity to review, correct, or add parameters before anything is
                saved to your verified Health Wallet.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary Action Card: Upload & Camera Options */}
            <div className="lg:col-span-2 space-y-6">
              <HealthCard title="Upload or Capture Document">
                {/* Live Camera View if Active */}
                {isCameraActive ? (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-700 shadow-inner">
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-4">
                        <SecondaryButton
                          type="button"
                          onClick={stopCameraStream}
                          className="bg-white/90 hover:bg-white text-slate-800"
                        >
                          Cancel
                        </SecondaryButton>
                        <PrimaryButton
                          type="button"
                          icon={<Camera className="w-4 h-4" />}
                          onClick={capturePhoto}
                          className="shadow-lg"
                        >
                          Capture Document
                        </PrimaryButton>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 text-center font-medium">
                      Position the medical document flat and ensure adequate lighting.
                    </p>
                  </div>
                ) : capturedBlobUrl ? (
                  /* Preview Selected or Captured File */
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-soft">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {selectedFile?.name || 'Document Ready for Ingest'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Size: {selectedFile ? (selectedFile.size / 1024).toFixed(0) : 0} KB • Format:{' '}
                        {selectedFile?.type || 'application/pdf'}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <SecondaryButton
                        type="button"
                        icon={<RefreshCw className="w-3.5 h-3.5" />}
                        onClick={handleResetScanner}
                      >
                        Choose Different File
                      </SecondaryButton>
                      <PrimaryButton
                        type="button"
                        id="process-report-btn"
                        icon={<Sparkles className="w-4 h-4" />}
                        onClick={processDocument}
                      >
                        Extract with AI
                      </PrimaryButton>
                    </div>
                  </div>
                ) : (
                  /* Standard Dropzone */
                  <div className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-2xl p-8 sm:p-12 text-center transition-all bg-slate-50/50 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 shadow-soft">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">
                      Drag and drop your medical report here
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6 leading-relaxed">
                      Supports PDF, JPG, JPEG, and PNG laboratory and clinical summaries up to 10 MB.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <PrimaryButton
                        type="button"
                        id="scan-camera-btn"
                        icon={<Camera className="w-4 h-4" />}
                        onClick={startCamera}
                      >
                        Scan with Camera
                      </PrimaryButton>

                      <label className="cursor-pointer">
                        <input
                          type="file"
                          id="file-upload-input"
                          className="hidden"
                          accept=".pdf, .jpg, .jpeg, .png, application/pdf, image/jpeg, image/png"
                          onChange={handleFileInputChange}
                        />
                        <SecondaryButton
                          type="button"
                          id="upload-file-btn"
                          icon={<FileText className="w-4 h-4" />}
                          onClick={(e) => {
                            (e.currentTarget.parentElement?.querySelector('input') as HTMLElement)?.click();
                          }}
                        >
                          Upload File
                        </SecondaryButton>
                      </label>
                    </div>

                    {cameraError && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>{cameraError}</span>
                      </div>
                    )}

                    {errorMessage && (
                      <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}
                  </div>
                )}
              </HealthCard>
            </div>

            {/* Scanning Guidelines & Info */}
            <div className="space-y-6">
              <HealthCard title="Scanning Guidelines">
                <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Ensure test names, observed values, and reference units are clearly visible.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Avoid glares or strong reflections when taking photos of printed paper.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Original documents are preserved in private storage and never made public.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>You will review and approve all extracted fields before anything is saved.</span>
                  </li>
                </ul>
              </HealthCard>

              <HealthCard title="Supported Formats">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <span className="font-bold text-slate-800 block">PDF Documents</span>
                    <span className="text-[11px] text-slate-400">Lab & Discharge sheets</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <span className="font-bold text-slate-800 block">JPG / PNG Images</span>
                    <span className="text-[11px] text-slate-400">Camera photos & scans</span>
                  </div>
                </div>
              </HealthCard>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PROCESSING STATE: UPLOADING, OCR, AI EXTRACTING, SAVING        */}
      {/* ------------------------------------------------------------- */}
      {(status === 'UPLOADING' ||
        status === 'OCR_PROCESSING' ||
        status === 'AI_EXTRACTING' ||
        status === 'SAVING') && (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-card max-w-xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-3xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto shadow-soft">
            <Clock className="w-8 h-8 animate-spin" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">{statusMessage}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {status === 'UPLOADING' && 'Safely transferring your report to encrypted private storage...'}
              {status === 'OCR_PROCESSING' && 'Analyzing document typography and optical text elements...'}
              {status === 'AI_EXTRACTING' && 'Structuring diagnostic panels, numerical values, and clinical ranges...'}
              {status === 'SAVING' && 'Writing confirmed record to your longitudinal timeline...'}
            </p>
          </div>

          {/* Stepper Progress */}
          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto pt-2 text-[11px] font-bold">
            <div
              className={`p-2 rounded-xl border ${
                status === 'UPLOADING'
                  ? 'bg-sky-50 border-sky-300 text-sky-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              1. Secure Upload
            </div>
            <div
              className={`p-2 rounded-xl border ${
                status === 'OCR_PROCESSING'
                  ? 'bg-sky-50 border-sky-300 text-sky-800'
                  : status === 'AI_EXTRACTING' || status === 'SAVING'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              2. Optical OCR
            </div>
            <div
              className={`p-2 rounded-xl border ${
                status === 'AI_EXTRACTING'
                  ? 'bg-sky-50 border-sky-300 text-sky-800'
                  : status === 'SAVING'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              3. AI Parsing
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ERROR STATE                                                    */}
      {/* ------------------------------------------------------------- */}
      {status === 'ERROR' && (
        <div className="bg-white border border-rose-200 rounded-3xl p-8 sm:p-12 text-center shadow-card max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Extraction Error</h3>
            <p className="text-xs text-rose-700 leading-relaxed">{errorMessage}</p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <SecondaryButton onClick={handleResetScanner} icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Try Again / Re-scan
            </SecondaryButton>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATE 2: REVIEW_REQUIRED (Mandatory Patient Review & Edit)     */}
      {/* ------------------------------------------------------------- */}
      {status === 'REVIEW_REQUIRED' && extractedData && (
        <div className="space-y-6">
          {/* Review Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-950">
                  Review Extracted Information
                </h4>
                <p className="text-[11px] text-emerald-800">
                  Please review the extracted clinical information. You can edit any parameter,
                  remove incorrect values, or add missing tests before confirming.
                </p>
              </div>
            </div>

            {uploadResult?.previewUrl && (
              <a
                href={uploadResult.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold transition-all flex-shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                View Original Document
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Extracted Tests & Metadata Editor */}
            <div className="lg:col-span-2 space-y-6">
              {/* Report Metadata Editor */}
              <HealthCard title="Report Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">
                      Report Classification
                    </label>
                    <select
                      value={extractedData.reportType}
                      onChange={(e) =>
                        setExtractedData({ ...extractedData, reportType: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                    >
                      <option value="LAB_REPORT">Lab Report</option>
                      <option value="CONSULTATION">Consultation</option>
                      <option value="PRESCRIPTION">Prescription</option>
                      <option value="IMAGING">Imaging / Radiology</option>
                      <option value="OTHER">Other Health Record</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Report Date</label>
                    <input
                      type="date"
                      value={extractedData.reportDate || ''}
                      onChange={(e) =>
                        setExtractedData({ ...extractedData, reportDate: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">
                      Hospital / Diagnostic Facility
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Metropolis Healthcare"
                      value={extractedData.hospitalOrLab || ''}
                      onChange={(e) =>
                        setExtractedData({ ...extractedData, hospitalOrLab: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">
                      Attending Doctor / Specialist
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Arvind Kumar"
                      value={extractedData.providerName || ''}
                      onChange={(e) =>
                        setExtractedData({ ...extractedData, providerName: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              </HealthCard>

              {/* Extracted Test Results Table */}
              <HealthCard
                title={`Extracted Test Results (${extractedData.tests.length})`}
                subtitle="All values extracted directly from the uploaded report. Click any field to edit."
                action={
                  <SecondaryButton
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={handleAddTest}
                  >
                    Add Test
                  </SecondaryButton>
                }
              >
                {extractedData.tests.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/70 rounded-xl border border-slate-100">
                    No individual test parameters detected. Click "Add Test" above to manually enter values.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                          <th className="pb-2 pl-2">Test Name</th>
                          <th className="pb-2">Value</th>
                          <th className="pb-2">Unit</th>
                          <th className="pb-2">Reference Range</th>
                          <th className="pb-2 text-right pr-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {extractedData.tests.map((test) => (
                          <tr key={test.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 pl-2">
                              <input
                                type="text"
                                value={test.testName}
                                onChange={(e) =>
                                  handleUpdateTest(test.id, 'testName', e.target.value)
                                }
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                              />
                            </td>
                            <td className="py-2.5 pr-2">
                              <input
                                type="text"
                                value={test.value}
                                onChange={(e) =>
                                  handleUpdateTest(test.id, 'value', e.target.value)
                                }
                                className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                              />
                            </td>
                            <td className="py-2.5 pr-2">
                              <input
                                type="text"
                                placeholder="unit"
                                value={test.unit || ''}
                                onChange={(e) =>
                                  handleUpdateTest(test.id, 'unit', e.target.value)
                                }
                                className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600"
                              />
                            </td>
                            <td className="py-2.5 pr-2">
                              <input
                                type="text"
                                placeholder="ref range"
                                value={test.referenceRange || ''}
                                onChange={(e) =>
                                  handleUpdateTest(test.id, 'referenceRange', e.target.value)
                                }
                                className="w-32 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-600"
                              />
                            </td>
                            <td className="py-2.5 text-right pr-2">
                              <button
                                type="button"
                                onClick={() => handleRemoveTest(test.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                                aria-label="Remove test"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </HealthCard>

              {/* Mentions & Clinical Notes */}
              <HealthCard title="Document Mentions & Clinical Notes">
                <div className="space-y-3 text-xs">
                  {extractedData.diagnosesMentioned.length > 0 && (
                    <div>
                      <span className="text-slate-500 font-bold block mb-1">
                        Diagnoses Mentioned in Source:
                      </span>
                      <div className="flex gap-2 flex-wrap">
                        {extractedData.diagnosesMentioned.map((d, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg font-medium text-[11px]"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Clinical Notes</label>
                    <textarea
                      rows={2}
                      value={extractedData.notes || ''}
                      onChange={(e) =>
                        setExtractedData({ ...extractedData, notes: e.target.value })
                      }
                      placeholder="Doctor recommendations or test specimen remarks..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              </HealthCard>
            </div>

            {/* Right 1 Col: Summary & Confirmation Actions */}
            <div className="space-y-6">
              <HealthCard title="Attached Source Document">
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-sky-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">
                          {uploadResult?.name || selectedFile?.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {uploadResult
                            ? `${(uploadResult.size / (1024 * 1024)).toFixed(2)} MB`
                            : ''}
                        </p>
                      </div>
                    </div>
                    {uploadResult?.previewUrl && (
                      <a
                        href={uploadResult.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-600 hover:text-sky-700 p-1"
                        aria-label="View source"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                    <span className="font-bold">Patient Confirmation:</span> Confirming this report
                    will attach the original document and structured parameters directly into your
                    secure medical timeline as a verified personal record.
                  </div>
                </div>
              </HealthCard>

              {/* Action Buttons */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-soft space-y-3">
                <PrimaryButton
                  type="button"
                  id="confirm-save-btn"
                  className="w-full justify-center"
                  icon={<Check className="w-4 h-4" />}
                  onClick={handleConfirmAndSave}
                >
                  Confirm & Save
                </PrimaryButton>

                <SecondaryButton
                  type="button"
                  id="cancel-rescan-btn"
                  className="w-full justify-center"
                  icon={<X className="w-4 h-4" />}
                  onClick={handleResetScanner}
                >
                  Cancel / Re-scan
                </SecondaryButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATE 3: SUCCESS                                              */}
      {/* ------------------------------------------------------------- */}
      {status === 'SUCCESS' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center shadow-card max-w-lg mx-auto space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-soft">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Report Saved Successfully
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Your verified diagnostic record has been ingested and linked to your Health Wallet
              timeline with the original document attachment.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/health-records" className="w-full sm:w-auto">
              <PrimaryButton
                type="button"
                id="view-health-records-btn"
                className="w-full justify-center"
                icon={<Eye className="w-4 h-4" />}
              >
                View Health Records
              </PrimaryButton>
            </Link>
            <SecondaryButton
              type="button"
              id="scan-another-btn"
              className="w-full sm:w-auto justify-center"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={handleResetScanner}
            >
              Scan Another Report
            </SecondaryButton>
          </div>
        </div>
      )}
    </div>
  );
};
