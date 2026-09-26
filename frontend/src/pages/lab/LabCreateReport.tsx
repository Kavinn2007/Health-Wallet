import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  FlaskConical,
  Upload,
  Plus,
  Trash2,
  Calendar,
  Building2,
  User,
  Shield,
  AlertCircle,
  FileCheck2,
  Search,
  CheckCircle2,
  ArrowLeft,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  searchPatientForLab,
  createLabReport,
  type LabTestResultItem,
} from '../../services/lab';
import { type MinimalPatientInfo } from '../../services/supabase';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { SecondaryButton } from '../../components/ui/SecondaryButton';

const COMMON_REPORT_TYPES = [
  'Complete Blood Count (CBC)',
  'Lipid Profile',
  'HbA1c',
  'Blood Glucose (Fasting / PP)',
  'Liver Function Test (LFT)',
  'Kidney Function Test (KFT)',
  'Thyroid Profile (T3, T4, TSH)',
  'Urine Routine & Microscopy',
  'Serum Electrolytes',
  'Other',
];

const TEST_STATUS_OPTIONS: Array<LabTestResultItem['status']> = [
  'NORMAL',
  'HIGH',
  'LOW',
  'CRITICAL',
  'ABNORMAL',
  'NOT_AVAILABLE',
];

export const LabCreateReport: React.FC = () => {
  const { labProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Patient Selection State
  const [patient, setPatient] = useState<MinimalPatientInfo | null>(null);
  const [searchHwId, setSearchHwId] = useState('');
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);

  // Form State
  const [selectedReportType, setSelectedReportType] = useState('Complete Blood Count (CBC)');
  const [customReportType, setCustomReportType] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [laboratoryName, setLaboratoryName] = useState(
    labProfile?.laboratory_name || 'Accredited Diagnostics Lab'
  );

  // Structured Tests State (supports multiple tests)
  const [tests, setTests] = useState<LabTestResultItem[]>([
    {
      test_name: 'Hemoglobin',
      value: '13.5',
      unit: 'g/dL',
      reference_range: '12.0 - 15.5 g/dL',
      status: 'NORMAL',
    },
    {
      test_name: 'Total Leucocyte Count (WBC)',
      value: '7500',
      unit: '/mcL',
      reference_range: '4000 - 11000 /mcL',
      status: 'NORMAL',
    },
  ]);

  // Original Report Attachment
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize from Query Params if coming from Patient Search
  useEffect(() => {
    const patientId = searchParams.get('patientId');
    const hwId = searchParams.get('hwId');
    const patientName = searchParams.get('patientName');
    const bloodGroup = searchParams.get('bloodGroup');
    const state = searchParams.get('state');

    if (patientId && hwId && patientName) {
      setPatient({
        id: patientId,
        patient_name: patientName,
        health_wallet_id: hwId,
        blood_group: bloodGroup || 'N/A',
        state: state || 'N/A',
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (labProfile?.laboratory_name) {
      setLaboratoryName(labProfile.laboratory_name);
    }
  }, [labProfile]);

  // Inline Patient Search
  const handleSearchPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setPatientSearchError(null);

    const clean = searchHwId.trim().toUpperCase();
    if (!clean) {
      setPatientSearchError('Please enter a Health Wallet ID.');
      return;
    }

    setIsSearchingPatient(true);
    try {
      const res = await searchPatientForLab(clean);
      if (res.success && res.patient) {
        setPatient(res.patient);
        setSearchHwId('');
      } else {
        setPatientSearchError(res.error || 'Patient not found with this ID.');
      }
    } catch (err: any) {
      setPatientSearchError(err?.message || 'Error finding patient.');
    } finally {
      setIsSearchingPatient(false);
    }
  };

  // Structured Tests Handlers
  const handleAddTestRow = () => {
    setTests((prev) => [
      ...prev,
      {
        test_name: '',
        value: '',
        unit: '',
        reference_range: '',
        status: 'NORMAL',
      },
    ]);
  };

  const handleRemoveTestRow = (index: number) => {
    if (tests.length <= 1) return;
    setTests((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleTestFieldChange = (
    index: number,
    field: keyof LabTestResultItem,
    value: string
  ) => {
    setTests((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  // File Attachment Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowed = ['pdf', 'jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowed.includes(ext)) {
      setFileError('Invalid file type. Supported formats: PDF, JPG, JPEG, PNG.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError('File exceeds maximum allowed size of 10 MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!patient) {
      setSubmitError('Please verify and select the patient first.');
      return;
    }

    const finalReportType =
      selectedReportType === 'Other' ? customReportType.trim() : selectedReportType.trim();

    if (!finalReportType) {
      setSubmitError('Please enter a valid report type.');
      return;
    }

    if (!laboratoryName.trim()) {
      setSubmitError('Laboratory name is required.');
      return;
    }

    if (tests.length === 0) {
      setSubmitError('Please enter at least one test measurement.');
      return;
    }

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      if (!t.test_name.trim()) {
        setSubmitError(`Row ${i + 1}: Test name cannot be empty.`);
        return;
      }
      if (!t.value.trim()) {
        setSubmitError(`Row ${i + 1}: Observed value is required for ${t.test_name || 'test'}.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await createLabReport({
        patient_id: patient.id,
        report_type: finalReportType,
        report_date: reportDate,
        laboratory_name: laboratoryName.trim(),
        file: selectedFile,
        test_results: tests,
      });

      if (res.success && res.reportId) {
        navigate(`/lab/reports/${res.reportId}`);
      } else {
        setSubmitError(res.error || 'Failed to create laboratory report.');
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Unexpected error while creating report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/lab/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lab Dashboard</span>
        </Link>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Create Laboratory Report
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Issue a verified diagnostic test report and structured results directly to the patient's Health Wallet.
        </p>
      </div>

      {submitError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{submitError}</div>
        </div>
      )}

      {/* STEP 1: PATIENT IDENTIFICATION */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-black flex items-center justify-center">
              1
            </span>
            <span>Target Patient Verification</span>
          </h2>

          {patient && (
            <button
              type="button"
              onClick={() => setPatient(null)}
              className="text-xs text-slate-400 hover:text-rose-600 font-semibold transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Change Patient</span>
            </button>
          )}
        </div>

        {!patient ? (
          <form onSubmit={handleSearchPatient} className="space-y-3">
            <p className="text-xs text-slate-500">
              Enter the patient's national Health Wallet ID to verify identity before issuing reports.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. HW-TN-38236621"
                  value={searchHwId}
                  onChange={(e) => setSearchHwId(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>
              <PrimaryButton
                type="submit"
                isLoading={isSearchingPatient}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs"
              >
                <span>Verify Patient</span>
              </PrimaryButton>
            </div>
            {patientSearchError && (
              <p className="text-xs text-rose-600 font-medium">{patientSearchError}</p>
            )}
          </form>
        ) : (
          <div className="bg-teal-50/50 border border-teal-200/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-teal-100">
              <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Verified Patient Record</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-white text-teal-800 px-2 py-0.5 rounded border border-teal-200">
                {patient.health_wallet_id}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Name</span>
                <span className="font-bold text-slate-900">{patient.patient_name}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Health Wallet ID</span>
                <span className="font-mono font-semibold text-slate-800">{patient.health_wallet_id}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Group</span>
                <span className="font-bold text-rose-700">{patient.blood_group}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">State</span>
                <span className="font-semibold text-slate-800">{patient.state}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 2: REPORT METADATA */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-soft space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-black flex items-center justify-center">
              2
            </span>
            <span>Report Details</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reportTypeSelect" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Report Type <span className="text-rose-500">*</span>
              </label>
              <select
                id="reportTypeSelect"
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
              >
                {COMMON_REPORT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {selectedReportType === 'Other' && (
                <input
                  type="text"
                  required
                  placeholder="Specify custom report panel name..."
                  value={customReportType}
                  onChange={(e) => setCustomReportType(e.target.value)}
                  className="mt-2 w-full px-3.5 py-2 bg-white border border-teal-300 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              )}
            </div>

            <div>
              <label htmlFor="reportDateInput" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Report Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="reportDateInput"
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="laboratoryNameInput" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Laboratory Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="laboratoryNameInput"
              type="text"
              required
              placeholder="e.g. City Diagnostics & Research Centre"
              value={laboratoryName}
              onChange={(e) => setLaboratoryName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>

        {/* STEP 3: STRUCTURED LAB RESULTS */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-black flex items-center justify-center">
                3
              </span>
              <span>Structured Test Results</span>
            </h2>
            <button
              type="button"
              onClick={handleAddTestRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-teal-200/60"
            >
              <Plus className="w-3.5 h-3.5 text-teal-600" />
              <span>Add Test</span>
            </button>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 text-[11px] text-slate-500">
            <strong>Diagnostic Record Policy:</strong> Enter the laboratory-provided values directly. The system does not interpret or diagnose medical conditions.
          </div>

          <div className="space-y-3">
            {tests.map((test, index) => (
              <div
                key={index}
                className="p-4 bg-slate-50/60 border border-slate-200 rounded-2xl space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Test #{index + 1}
                  </span>
                  {tests.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTestRow(index)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                      title="Remove Test"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Test Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hemoglobin, Total Cholesterol, TSH..."
                      value={test.test_name}
                      onChange={(e) => handleTestFieldChange(index, 'test_name', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Observed Value <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 13.5, 180, 4.2..."
                      value={test.value}
                      onChange={(e) => handleTestFieldChange(index, 'value', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit</label>
                    <input
                      type="text"
                      placeholder="e.g. g/dL, mg/dL, /mcL..."
                      value={test.unit || ''}
                      onChange={(e) => handleTestFieldChange(index, 'unit', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Reference Range
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 12.0 - 15.5, < 200..."
                      value={test.reference_range || ''}
                      onChange={(e) =>
                        handleTestFieldChange(index, 'reference_range', e.target.value)
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Status Flag
                    </label>
                    <select
                      value={test.status}
                      onChange={(e) =>
                        handleTestFieldChange(
                          index,
                          'status',
                          e.target.value as LabTestResultItem['status']
                        )
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:border-teal-600 focus:outline-none"
                    >
                      {TEST_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* STEP 4: ORIGINAL REPORT UPLOAD */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-soft space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-black flex items-center justify-center">
              4
            </span>
            <span>Attach Original Diagnostic Document</span>
          </h2>

          <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <input
              type="file"
              id="reportFileInput"
              accept=".pdf, .jpg, .jpeg, .png, application/pdf, image/jpeg, image/png"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="reportFileInput"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  {selectedFile ? selectedFile.name : 'Click or drag original laboratory report'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(0)} KB &bull; Secured private storage`
                    : 'Supported: PDF, JPG, JPEG, PNG (Max 10 MB)'}
                </span>
              </div>
            </label>
          </div>

          {fileError && <p className="text-xs text-rose-600 font-medium">{fileError}</p>}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <SecondaryButton
            type="button"
            onClick={() => navigate('/lab/dashboard')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold"
          >
            Cancel
          </SecondaryButton>

          <PrimaryButton
            type="submit"
            isLoading={isSubmitting}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-xs"
          >
            <span>Issue &amp; Save Lab Report</span>
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
};
export default LabCreateReport;
