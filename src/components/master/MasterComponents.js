import { Icons } from '../icons.js';

/**
 * Health Wallet Master UI Template Components
 * Standardized government digital service presentation used across all roles.
 */

// 1. Standard Page Header
export function renderPageHeader({ title, subtitle, badgeHtml = '', badge = '', actionsHtml = '', rightContent = '' }) {
  const finalBadge = badgeHtml || (badge ? `<span class="badge badge-verified">${badge}</span>` : '');
  const finalActions = actionsHtml || rightContent || '';

  return `
    <div class="master-page-header">
      <div>
        <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
          <h1 class="master-page-title">${title}</h1>
          ${finalBadge}
        </div>
        ${subtitle ? `<p class="master-page-subtitle">${subtitle}</p>` : ''}
      </div>
      ${finalActions ? `<div class="master-header-actions">${finalActions}</div>` : ''}
    </div>
  `;
}

// 2. Standard Section Panel / Card
export function renderSection({ 
  kicker = '', 
  title = '', 
  subtitle = '', 
  headerActionHtml = '', 
  rightAction = '', 
  contentHtml = '', 
  content = '', 
  badge = '',
  isAlert = false, 
  id = '' 
}) {
  const finalContent = contentHtml || content || '';
  const finalAction = headerActionHtml || rightAction || '';
  const finalBadge = badge ? `<span class="badge badge-verified">${badge}</span>` : '';

  return `
    <div class="master-section-card ${isAlert ? 'alert-card' : ''}" ${id ? `id="${id}"` : ''}>
      ${(kicker || title || finalAction || finalBadge) ? `
        <div class="master-section-header">
          <div>
            ${kicker ? `<div class="master-section-kicker">${kicker}</div>` : ''}
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              ${title ? `<h3 class="master-section-title">${title}</h3>` : ''}
              ${finalBadge}
            </div>
            ${subtitle ? `<div class="master-section-subtitle">${subtitle}</div>` : ''}
          </div>
          ${finalAction ? `<div class="master-section-action">${finalAction}</div>` : ''}
        </div>
      ` : ''}
      <div class="master-section-body">
        ${finalContent}
      </div>
    </div>
  `;
}

// 3. Official Health Summary Strip (Section 9 & 10)
export function renderHealthSummaryStrip(patient) {
  const allergy = patient.allergies || 'Penicillin';
  const hasAllergy = allergy && allergy !== 'None' && allergy !== 'No Known Allergies';

  return `
    <div class="master-summary-strip">
      <div class="summary-field-cell">
        <span class="summary-cell-label">HEALTH WALLET ID</span>
        <span class="summary-cell-value mono-id">${patient.id}</span>
      </div>

      <div class="summary-field-cell">
        <span class="summary-cell-label">BLOOD GROUP</span>
        <span class="summary-cell-value">${patient.bloodGroup || 'O+'}</span>
      </div>

      <div class="summary-field-cell ${hasAllergy ? 'cell-danger' : ''}">
        <span class="summary-cell-label ${hasAllergy ? 'label-danger' : ''}">CRITICAL ALLERGY</span>
        <span class="summary-cell-value ${hasAllergy ? 'value-danger' : ''}">${allergy}</span>
      </div>

      <div class="summary-field-cell">
        <span class="summary-cell-label">ABHA</span>
        <span class="summary-cell-value abha-status">Connected ✓</span>
      </div>
    </div>
  `;
}

// 4. Unified Patient Search Bar (Used across Doctor, Pharmacy, Hospital, Lab, Emergency)
export function renderPatientSearchCard({
  searchedId = '',
  title = 'SEARCH PATIENT',
  subtitle = 'Enter Patient Safe Health Wallet ID to access attested records',
  inputId = 'input-patient-search-id',
  buttonId = 'btn-patient-search-submit',
  quickFillId = 'btn-quick-fill-patient',
  placeholder = 'e.g. HW-IN-2026-8834-9120'
}) {
  return `
    <div class="master-section-card master-search-section">
      <div class="master-section-header">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          ${Icons.search('w-4.5 h-4.5')}
          <h3 class="master-section-title">${title}</h3>
        </div>
        <span class="master-section-subtitle">${subtitle}</span>
      </div>

      <div class="master-search-form">
        <div class="master-search-input-wrap">
          <input 
            type="text" 
            id="${inputId}" 
            value="${searchedId}" 
            placeholder="${placeholder}" 
            class="master-search-input"
          />
        </div>

        <button class="btn btn-primary" id="${buttonId}">
          ${Icons.search('w-4 h-4')}
          <span>Search</span>
        </button>

        ${quickFillId ? `
          <button class="btn btn-secondary btn-sm" id="${quickFillId}" title="Quick fill Aarav's Demo ID">
            Demo ID: Aarav
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// 5. Patient Found Attestation Banner
export function renderPatientFoundBanner(patient, extraActionsHtml = '') {
  return `
    <div class="master-patient-found-banner">
      <div class="patient-found-left">
        <div class="patient-found-check">✓</div>
        <div>
          <div class="patient-found-name-row">
            <span class="patient-found-name">${patient.fullName}</span>
            <span class="badge badge-verified">PATIENT FOUND ✓</span>
            <span class="patient-found-demographics">${patient.gender || 'Male'}, ${patient.age || '34'} yrs</span>
          </div>
          <div class="patient-found-meta">
            Health Wallet ID: <strong>${patient.id}</strong> • ABHA: <strong>${patient.abhaAddress || 'aarav.sharma@abdm'}</strong>
          </div>
        </div>
      </div>

      ${extraActionsHtml ? `<div class="patient-found-actions">${extraActionsHtml}</div>` : ''}
    </div>
  `;
}

// 6. Scannable Medical Record Row (Section 11 & 18)
export function renderRecordRow(rec, { showDetailsBtn = true, isMasterTable = false } = {}) {
  const isVerified = rec.verificationStatus === 'verified_by_provider';
  const isSensitive = rec.isSensitive;

  if (isMasterTable) {
    return `
      <tr class="master-table-row" id="record-${rec.id}">
        <td class="mono" style="font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); white-space: nowrap;">
          ${rec.date}
        </td>
        <td>
          <div style="font-weight: 600; color: var(--text-primary); font-size: 0.875rem;">
            ${rec.title || rec.recordType || 'Consultation & Record'}
          </div>
          ${rec.prescription && rec.prescription !== 'None' ? `
            <div style="font-size: 0.78125rem; color: var(--dark-green); margin-top: 0.15rem; font-weight: 500;">
              Rx: ${rec.prescription}
            </div>
          ` : ''}
          ${rec.diagnosis ? `
            <div style="font-size: 0.78125rem; color: var(--text-muted); margin-top: 0.1rem;">
              Dx: ${rec.diagnosis}
            </div>
          ` : ''}
        </td>
        <td style="font-size: 0.875rem; color: var(--text-primary); font-weight: 500;">
          ${rec.doctor || rec.providerName || 'Attending Physician'}
        </td>
        <td style="font-size: 0.8125rem; color: var(--text-secondary);">
          ${rec.hospital || 'Metro Health Institute'}
        </td>
        <td style="text-align: right;">
          <button class="btn btn-ghost btn-sm btn-open-detail" data-id="${rec.id}" style="padding: 0.25rem 0.55rem; font-size: 0.75rem;">
            View
          </button>
        </td>
      </tr>
    `;
  }

  return `
    <div class="master-record-row" id="record-${rec.id}">
      <div class="record-row-top">
        <div class="record-date-kicker">${rec.date.toUpperCase()}</div>
        <span class="badge ${isVerified ? 'badge-verified' : 'badge-unverified'}">
          ${isVerified ? '✓ Verified Provider' : 'Self-Uploaded'}
        </span>
      </div>

      <div class="record-row-title-row">
        <h4 class="record-row-title">${rec.title || rec.recordType}</h4>
        <div class="record-row-facility">
          <strong>${rec.doctor || rec.providerName}</strong> • ${rec.hospital || 'Metro Health Institute'}
        </div>
      </div>

      <div class="record-clinical-specs">
        ${rec.diagnosis ? `
          <div class="clinical-spec-item">
            <span class="spec-label">Diagnosis:</span>
            <span class="spec-value" style="font-weight: 600; color: var(--text-primary);">${rec.diagnosis}</span>
          </div>
        ` : ''}

        ${rec.treatment ? `
          <div class="clinical-spec-item">
            <span class="spec-label">Treatment:</span>
            <span class="spec-value">${rec.treatment}</span>
          </div>
        ` : ''}

        ${rec.prescription && rec.prescription !== 'None' ? `
          <div class="clinical-spec-item">
            <span class="spec-label">Prescription:</span>
            <span class="spec-value" style="color: var(--dark-green); font-weight: 600;">${rec.prescription}</span>
          </div>
        ` : ''}

        ${rec.reports ? `
          <div class="clinical-spec-item">
            <span class="spec-label">Reports:</span>
            <span class="spec-value">${rec.reports}</span>
          </div>
        ` : ''}
      </div>

      ${showDetailsBtn ? `
        <div class="record-row-footer">
          <button class="btn btn-secondary btn-sm btn-open-detail btn-open-record-detail" data-id="${rec.id}">
            View Details →
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

// 7. Clean Vertical Timeline Node (Section 19)
export function renderTimelineItem(event) {
  return `
    <div class="master-timeline-node">
      <div class="timeline-date-col">${event.date.toUpperCase()}</div>
      <div class="timeline-spine-track">
        <div class="timeline-dot-marker"></div>
      </div>
      <div class="timeline-content-card">
        <div class="timeline-card-header">
          <h4 class="timeline-event-title">${event.title}</h4>
          ${event.badgeText ? `<span class="badge badge-verified">${event.badgeText}</span>` : ''}
        </div>
        <div class="timeline-provider-meta">
          <strong>${event.provider}</strong> • ${event.organization}
        </div>
        ${event.summary ? `<div class="timeline-summary-text">${event.summary}</div>` : ''}
      </div>
    </div>
  `;
}

// 8. Access Audit Transparency Ledger Row (Section 13)
export function renderAccessAuditRow(log, { isMasterTable = false } = {}) {
  const isEmergency = log.isEmergency;

  if (isMasterTable) {
    return `
      <tr class="master-table-row">
        <td class="mono" style="font-size: 0.8125rem; color: var(--text-secondary); white-space: nowrap;">
          ${log.timestamp}
        </td>
        <td>
          <strong style="color: var(--text-primary); font-size: 0.875rem;">${log.accessorName}</strong>
        </td>
        <td style="font-size: 0.8125rem; color: var(--text-secondary);">
          ${log.organization}
        </td>
        <td style="font-size: 0.8125rem; color: var(--text-primary);">
          ${log.purpose || 'Clinical Review'} <span style="color: var(--text-muted);">(${log.resource})</span>
        </td>
        <td style="text-align: center;">
          ${isEmergency 
            ? '<span class="badge badge-emergency" style="font-size: 0.6875rem;">Override</span>' 
            : '<span class="badge badge-verified" style="font-size: 0.6875rem;">Granted ✓</span>'}
        </td>
      </tr>
    `;
  }

  return `
    <div class="master-access-row ${isEmergency ? 'emergency-access' : ''}">
      <div class="access-row-icon">
        ${isEmergency ? Icons.siren('w-4 h-4') : Icons.shieldCheck('w-4 h-4')}
      </div>

      <div class="access-row-content">
        <div class="access-header-line">
          <div>
            <strong class="access-actor-name">${log.accessorName}</strong>
            <span class="access-org-name">• ${log.organization}</span>
          </div>
          <span class="access-timestamp">${log.timestamp}</span>
        </div>

        <div class="access-body-line">
          <span class="access-lbl">Viewed:</span>
          <strong class="access-val">${log.resource}</strong>
          <span class="access-divider">|</span>
          <span class="access-lbl">Purpose:</span>
          <span class="access-val" style="color: var(--text-secondary);">${log.purpose || 'Clinical Review'}</span>
        </div>

          <div class="access-security-tag">Security: <strong>${log.securityLevel || 'Encrypted Level-3'}</strong></div>
        </div>
      </div>
    </div>
  `;
}

// 9. Standard Intentional Empty State (Section 10 & 27)
export function renderEmptyState({ title, description, message, actionHtml = '' }) {
  const text = description || message || '';
  return `
    <div class="master-empty-state">
      <div class="empty-state-icon-box">
        ${Icons.fileText('w-5 h-5')}
      </div>
      <h4 class="empty-state-title">${title}</h4>
      ${text ? `<p class="empty-state-desc">${text}</p>` : ''}
      ${actionHtml ? `<div class="empty-state-action">${actionHtml}</div>` : ''}
    </div>
  `;
}

// 10. Standard Medication Check Block (Section 14)
export function renderMedicationCheck(checks = []) {
  return `
    <div class="master-med-check-box">
      <div class="med-check-header">
        ${Icons.shieldCheck('w-4 h-4')}
        <span>MEDICATION SAFETY CHECK</span>
      </div>
      <div class="med-check-list">
        ${checks.map(item => `
          <div class="med-check-item ${item.isAlert ? 'check-alert' : 'check-ok'}">
            <span class="check-symbol">${item.isAlert ? '⚠' : '✓'}</span>
            <span class="check-text">${item.text}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
