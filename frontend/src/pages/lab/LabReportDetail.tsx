import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  ArrowLeft,
  Download,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { getLabReportDetail, type LabReportDetailView } from '../../services/lab';
import { LoadingState } from '../../components/ui/LoadingState';
import { Badge } from '../../components/ui/Badge';
import { SecondaryButton } from '../../components/ui/SecondaryButton';

export const LabReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<LabReportDetailView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await getLabReportDetail(id);
        if (res.success && res.data) {
          setReport(res.data);
        } else {
          setErrorMessage(res.error || 'Laboratory report not found.');
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Error fetching report.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Loading laboratory report details..." />
      </div>
    );
  }

  if (errorMessage || !report) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Report Unavailable</h2>
        <p className="text-xs text-slate-500">{errorMessage || 'Report not found'}</p>
        <Link
          to="/lab/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NORMAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            NORMAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
            HIGH
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200/60">
            LOW
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
            CRITICAL
          </span>
        );
      case 'ABNORMAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
            ABNORMAL
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            N/A
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/lab/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Laboratory Dashboard</span>
        </Link>

        <Link
          to="/lab/reports/new"
          className="text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors"
        >
          + Create Another Report
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60 inline-block mb-1">
                Diagnostic Report
              </span>
              <h1 className="text-xl font-bold text-slate-900">{report.report_type}</h1>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {report.laboratory_name}
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {report.report_date}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <ShieldCheck className="w-4 h-4" />
              <span>Record Sealed in Health Wallet</span>
            </span>
          </div>
        </div>

        {/* Patient Reference Strip */}
        <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Patient
            </span>
            <span className="font-bold text-slate-800">
              {report.patient?.patient_name || 'Verified Patient'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Health Wallet ID
            </span>
            <span className="font-mono font-bold text-teal-800">
              {report.patient?.health_wallet_id || 'HW-ID'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Blood Group
            </span>
            <span className="font-bold text-rose-600">
              {report.patient?.blood_group || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              State
            </span>
            <span className="font-semibold text-slate-700">
              {report.patient?.state || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Structured Lab Results Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-soft space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Structured Laboratory Results
        </h2>

        {report.test_results && report.test_results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pl-2">Test Name</th>
                  <th className="pb-3">Observed Value</th>
                  <th className="pb-3">Unit</th>
                  <th className="pb-3">Reference Range</th>
                  <th className="pb-3 pr-2 text-right">Status Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {report.test_results.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pl-2 font-bold text-slate-900">{t.test_name}</td>
                    <td className="py-3 font-bold text-slate-800">{t.value}</td>
                    <td className="py-3 text-slate-500 font-mono text-[11px]">{t.unit || '—'}</td>
                    <td className="py-3 font-mono text-slate-600 text-[11px]">
                      {t.reference_range || '—'}
                    </td>
                    <td className="py-3 pr-2 text-right">{getStatusBadge(t.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No individual test rows recorded.</p>
        )}
      </div>

      {/* Original Document Attachment */}
      {report.original_file_path && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-soft">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
            Original Laboratory Report Document
          </h2>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-teal-600" />
              <div>
                <p className="text-xs font-bold text-slate-800">Original Document Attachment</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Secured in private clinical document storage
                </p>
              </div>
            </div>

            {report.signed_file_url ? (
              <a
                href={report.signed_file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Original Report</span>
              </a>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Signed URL Expired</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default LabReportDetail;
