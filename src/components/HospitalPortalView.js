import { Icons } from './icons.js';
import { store } from '../state/store.js';
import {
  renderPageHeader,
  renderPatientSearchCard,
  renderPatientFoundBanner,
  renderHealthSummaryStrip,
  renderSection,
  renderRecordRow,
  renderEmptyState
} from './master/MasterComponents.js';

export function renderHospitalPortalView(state) {
  const patient = state.patient;
  const records = state.records || [];
  const isSearched = state.isPatientSearched;
  const searchedId = state.searchedPatientId || 'HW-IN-2026-8834-9120';

  const hospitalRecords = records.filter(r => r.category === 'discharge_summary' || r.hospital?.includes('Metro') || r.category === 'consultation');

  const headerRight = `
    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
      <span class="badge badge-verified" style="display: inline-flex; align-items: center; gap: 0.35rem;">
        ${Icons.hospital('w-3.5 h-3.5')}
        <span>NABH Accredited Tertiary Center</span>
      </span>
      <span class="badge" style="background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); font-weight: 600;">
        Care Node: WARD-CARDIAC-4B
      </span>
    </div>
  `;

  return `
    <div class="master-page-container animate-fade-in">
      <!-- 1. Master Page Header -->
      ${renderPageHeader({
        title: 'Metro Health Institute & Multi-Specialty',
        subtitle: 'Hospital Admissions & Inpatient EMR Gateway • Ayushman Bharat Digital Mission (ABDM) Node',
        rightContent: headerRight
      })}

      <!-- 2. Master Patient Search Card -->
      ${renderPatientSearchCard({
        inputId: 'input-hospital-patient-id',
        btnId: 'btn-hospital-search-patient',
        value: searchedId,
        placeholder: 'e.g. HW-IN-2026-8834-9120',
        hint: 'Search patient by Safe Health Wallet ID to view admission records, discharge summaries, and inpatient charts.',
        quickFillBtnHtml: '<button class="btn btn-secondary btn-sm" id="btn-hospital-demo-fill">Demo Patient: Aarav</button>'
      })}

      <!-- 3. Hospital Care Context (When Searched) -->
      ${isSearched ? `
        <!-- Patient Found Banner -->
        ${renderPatientFoundBanner(patient)}

        <!-- Health Summary Strip -->
        ${renderHealthSummaryStrip(patient)}

        <!-- Care Actions & Self-Upload Certification -->
        ${renderSection({
          title: 'Admission & Inpatient Care Coordination',
          subtitle: 'Clinical verification queue and hospital discharge records',
          badge: 'NABH Inpatient Gateway',
          content: `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 1rem;">
              <div style="background: var(--bg-secondary); padding: 1.25rem; border-radius: var(--radius-btn); border: 1px solid var(--border-color);">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.35rem;">Admission Records Archive</div>
                <h4 style="color: var(--text-primary); margin-bottom: 0.25rem; font-weight: 700;">Discharge Summary (NABH Certified)</h4>
                <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                  Previous admission on 2026-06-12 for Cardiac Evaluation. Stress test clear. Digital signature verified by Medical Superintendent.
                </p>
                <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
                  NABH Signature: <code>0x17faee3...32bf</code>
                </div>
              </div>

              <div style="background: var(--bg-secondary); padding: 1.25rem; border-radius: var(--radius-btn); border: 1px solid var(--border-color);">
                <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.35rem;">Instant Care Actions</div>
                <h4 style="color: var(--text-primary); margin-bottom: 0.35rem; font-weight: 700;">Clinical Verification of Self-Uploads</h4>
                <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 1rem;">
                  Patient has self-uploaded diagnostic records awaiting hospital physician attestation and digital signature.
                </p>
                <button class="btn btn-primary btn-sm" id="btn-hospital-verify-upload">
                  ${Icons.shieldCheck('w-4 h-4')}
                  <span>Physician Certify & Mark as Verified</span>
                </button>
              </div>
            </div>
          `
        })}

        <!-- Discharge & Inpatient Records Section -->
        ${renderSection({
          title: 'Hospital Clinical Records',
          subtitle: 'Institutional admissions, procedures, and discharge summaries',
          badge: `${hospitalRecords.length} Hospital Records`,
          content: `
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${hospitalRecords.map(rec => renderRecordRow(rec, { showDetailsBtn: true })).join('')}
            </div>
          `
        })}
      ` : `
        ${renderEmptyState({
          title: 'No Patient Record Loaded',
          message: 'Enter the patient\'s Health Wallet ID above to access hospital admission records and clinical review queues.',
          actionHtml: '<button class="btn btn-primary btn-sm" id="btn-empty-hospital-search">Search Patient Aarav (HW-IN-2026-8834-9120)</button>'
        })}
      `}
    </div>
  `;
}

export function attachHospitalPortalEvents(container) {
  const btnSearch = container.querySelector('#btn-hospital-search-patient');
  const inputSearch = container.querySelector('#input-hospital-patient-id');
  if (btnSearch && inputSearch) {
    btnSearch.addEventListener('click', () => {
      store.searchPatient(inputSearch.value);
    });
    inputSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') store.searchPatient(inputSearch.value);
    });
  }

  const btnDemoFill = container.querySelector('#btn-hospital-demo-fill');
  if (btnDemoFill && inputSearch) {
    btnDemoFill.addEventListener('click', () => {
      inputSearch.value = 'HW-IN-2026-8834-9120';
      store.searchPatient('HW-IN-2026-8834-9120');
    });
  }

  const btnEmptySearch = container.querySelector('#btn-empty-hospital-search');
  if (btnEmptySearch) {
    btnEmptySearch.addEventListener('click', () => {
      store.searchPatient('HW-IN-2026-8834-9120');
    });
  }

  const btnVerify = container.querySelector('#btn-hospital-verify-upload');
  if (btnVerify) {
    btnVerify.addEventListener('click', () => {
      // Upgrade patient upload to verified
      store.state.records = store.state.records.map(r => {
        if (r.id === 'REC-2026-033') {
          return {
            ...r,
            verificationStatus: 'verified_by_provider',
            verificationDetails: {
              verifiedBy: 'Dr. Anand Kumar, MD (Chief Physician - Metro Health)',
              timestamp: new Date().toLocaleDateString() + ' IST',
              signatureHash: '0x33aa...99cd (Hospital Signed)',
              accreditation: 'NABH Clinical Review'
            },
            summary: 'Scanned 12-lead baseline ECG. Clinically reviewed and certified by Metro Health Institute.'
          };
        }
        return r;
      });

      store.logAccess({
        accessorName: 'Dr. Anand Kumar, MD',
        accessorRole: 'hospital',
        organization: 'Metro Health Institute',
        action: 'SUBMIT_LAB_REPORT',
        resource: 'REC-2026-033 (Baseline ECG)',
        purpose: 'Clinical verification and cryptographic attestation of patient-uploaded record',
        isEmergency: false,
        securityLevel: 'Hospital Attestation'
      });

      store.showToast('Record Verified', 'Self-uploaded ECG certified by Metro Health. Trust badge updated.', 'success');
      store.notify();
    });
  }
}
