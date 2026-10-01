import React, { useState } from 'react';
import { UserPlus, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { Modal } from '../components/ui/Modal';

export const Family: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);

  const familyMembers = [
    {
      id: 'fam-1',
      name: 'Sunita Patil',
      relation: 'Self (Primary Account Holder)',
      healthWalletId: 'HW-TN-38236621',
      age: 42,
      gender: 'Female',
      bloodGroup: 'B+',
      recordsCount: 4,
      isPrimary: true,
    },
    {
      id: 'fam-2',
      name: 'Ramesh Patil',
      relation: 'Spouse',
      healthWalletId: 'HW-TN-88421092',
      age: 46,
      gender: 'Male',
      bloodGroup: 'O+',
      recordsCount: 2,
      isPrimary: false,
    },
    {
      id: 'fam-3',
      name: 'Aarav Patil',
      relation: 'Son (Dependent Minor)',
      healthWalletId: 'HW-TN-47109231',
      age: 12,
      gender: 'Male',
      bloodGroup: 'B+',
      recordsCount: 6,
      isPrimary: false,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Family Members & Dependents"
        subtitle="Manage linked health wallets, pediatric immunizations, and elder care access from one unified dashboard"
        action={
          <PrimaryButton
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
          >
            Add Family Member
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {familyMembers.map((member) => (
          <div
            key={member.id}
            className={`bg-white border rounded-2xl p-6 shadow-soft transition-all duration-200 flex flex-col justify-between ${
              member.isPrimary
                ? 'border-sky-300 ring-1 ring-sky-200'
                : 'border-slate-200/90 hover:border-sky-300'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center font-bold text-base">
                  {member.name.charAt(0)}
                </div>
                {member.isPrimary ? (
                  <Badge variant="primary" size="sm">
                    Primary Holder
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    {member.relation}
                  </Badge>
                )}
              </div>

              <div className="mt-4">
                <h3 className="text-base font-bold text-slate-900">{member.name}</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">{member.healthWalletId}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block uppercase">Age</span>
                  <span className="font-bold text-slate-800">{member.age} yrs</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block uppercase">Blood</span>
                  <span className="font-bold text-rose-600">{member.bloodGroup}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block uppercase">Records</span>
                  <span className="font-bold text-slate-800">{member.recordsCount}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <SecondaryButton
                size="sm"
                className="w-full justify-between"
                icon={<ChevronRight className="w-4 h-4 order-last" />}
              >
                <span>Switch to {member.name.split(' ')[0]}'s Wallet</span>
              </SecondaryButton>
            </div>
          </div>
        ))}
      </div>

      {/* Add Family Member Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Link Family Member Health Wallet"
        subtitle="Add a dependent or link an existing ABDM Health ID"
        footer={
          <>
            <SecondaryButton onClick={() => setShowAddModal(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => setShowAddModal(false)}>
              Send Verification OTP
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Relationship to Patient</label>
            <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none">
              <option>Child / Dependent Minor</option>
              <option>Spouse</option>
              <option>Parent / Senior Citizen</option>
              <option>Sibling</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Ananya Patil"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Existing Health Wallet ID (Optional)</label>
            <input
              type="text"
              placeholder="e.g. HW-TN-XXXXXXXX"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
