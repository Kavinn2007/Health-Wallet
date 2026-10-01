import React from 'react';
import {
  Stethoscope,
  Building2,
  Phone,
  User,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DoctorProfilePage: React.FC = () => {
  const { doctorProfile } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
          Doctor Profile & Credentials
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Registered Medical Practitioner identity under the National Digital Health Framework.
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                {doctorProfile?.doctor_name || 'Dr. Medical Practitioner'}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Doctor
              </span>
            </div>
            <p className="text-xs font-medium text-slate-600">
              {doctorProfile?.specialization} • {doctorProfile?.hospital_name}
            </p>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-semibold text-[11px] block">
              Medical Registration Number
            </span>
            <span className="font-mono text-base font-bold text-sky-900">
              {doctorProfile?.registration_number || 'N/A'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-semibold text-[11px] block">
              Specialization
            </span>
            <span className="text-sm font-bold text-slate-800">
              {doctorProfile?.specialization || 'N/A'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-semibold text-[11px] block">
              Affiliated Hospital / Clinic
            </span>
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              {doctorProfile?.hospital_name || 'N/A'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-semibold text-[11px] block">
              Doctor Username
            </span>
            <span className="font-mono text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              {doctorProfile?.username || 'N/A'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-semibold text-[11px] block">
              Registered Mobile Number
            </span>
            <span className="font-mono text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-slate-400" />
              +91 {doctorProfile?.mobile_number || 'XXXXXXXXXX'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-semibold text-[11px] block">
              Profile Registration Date
            </span>
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              {doctorProfile?.created_at
                ? new Date(doctorProfile.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Active'}
            </span>
          </div>
        </div>

        {/* Security and Architectural Notice */}
        <div className="p-4 bg-sky-50 border border-sky-100 rounded-xl space-y-1.5 text-xs text-sky-900">
          <div className="flex items-center gap-2 font-bold text-sky-800">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Health Wallet Architectural Specification</span>
          </div>
          <p className="text-sky-800 leading-relaxed text-[11px]">
            Doctor profiles are securely linked to verified medical licensing boards. Health Wallet IDs belong exclusively to citizens and patients. Doctors utilize their medical registration credentials to request patient access.
          </p>
        </div>
      </div>
    </div>
  );
};
