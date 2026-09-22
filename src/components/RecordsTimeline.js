import { Icons } from './icons.js';
import { store } from '../state/store.js';
import { renderPageHeader } from './master/MasterComponents.js';

export function renderRecordsTimeline(state, mode = 'auto') {
  const records = state.records;
  const currentFilter = state.activeRecordFilter || 'all';
  const activeNav = state.activeNav;
  const isTimelineView = mode === 'timeline' || (mode === 'auto' && activeNav === 'timeline');

  // Filter records per Section 11
  const filteredRecords = records.filter(rec => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'consultations') return rec.category === 'consultation' || rec.recordType === 'Consultation';
    if (currentFilter === 'diagnoses') return rec.diagnosis && rec.diagnosis !== 'Clinical Evaluation';
    if (currentFilter === 'prescriptions') return rec.category === 'prescription' || (rec.prescription && rec.prescription !== 'None');
    if (currentFilter === 'reports') return rec.category === 'diagnostic' || rec.recordType === 'Lab Report' || rec.isConsolidatedGroup;
    if (currentFilter === 'hospital_visits') return rec.category === 'discharge_summary' || rec.hospital?.includes('Hospital');
    if (currentFilter === 'surgeries') return rec.category === 'surgery' || rec.recordType?.includes('Surgery');
    return true;
  });

  if (isTimelineView) {
    // Section 12: Official Medical Timeline (DATE -> PROVIDER -> EVENT -> DETAILS)
    const recordsByYear = {};
    filteredRecords.forEach(rec => {
      const year = rec.date ? rec.date.substring(0, 4) : '2026';
      if (!recordsByYear[year]) recordsByYear[year] = [];
      recordsByYear[year].push(rec);
    });

    const sortedYears = Object.keys(recordsByYear).sort((a, b) => b.localeCompare(a));

    return `
      <div class="master-page-container animate-fade-in">
        ${renderPageHeader({
          title: 'Medical Timeline',
          subtitle: 'Chronological progression of your attested digital health records.',
          rightContent: `
            <span class="badge badge-verified">
              ${Icons.activity('w-3.5 h-3.5')}
              <span>Connected Longitudinal Journey</span>
            </span>
          `
        })}

        <!-- Vertical Connected Spine Timeline (Section 12: Thin subtle line, small green indicators) -->
        <div class="timeline-vertical-spine-tree">
          ${sortedYears.map(year => `
            <div class="timeline-year-block">
              <div class="timeline-year-node">
                <span class="year-label">${year}</span>
              </div>

              <div class="timeline-nodes-list">
                ${recordsByYear[year].map(rec => {
                  const isVerified = rec.verificationStatus === 'verified_by_provider';
                  return `
                    <div class="timeline-spine-item">
                      <div class="timeline-spine-marker"></div>
                      <div class="timeline-spine-content">
                        <!-- DATE & STATUS -->
                        <div class="timeline-top-row">
                          <span class="timeline-item-date">${rec.date.toUpperCase()}</span>
                          <span class="badge ${isVerified ? 'badge-verified' : 'badge-unverified'}">
                            ${isVerified ? '✓ Verified Provider' : 'Self-Uploaded'}
                          </span>
                        </div>

                        <!-- EVENT TITLE -->
                        <h4 class="timeline-item-title">${rec.title}</h4>

                        <!-- PROVIDER -->
                        <div class="timeline-item-source">
                          <strong>${rec.doctor || rec.providerName}</strong> • ${rec.hospital || 'Metro Health Institute'}
                        </div>

                        <!-- CLINICAL DETAILS -->
                        <div class="timeline-details-stack">
                          ${rec.diagnosis ? `
                            <div class="timeline-detail-line">
                              <span class="detail-label">Diagnosis:</span>
                              <span class="detail-val" style="font-weight: 600;">${rec.diagnosis}</span>
                            </div>
                          ` : ''}

                          ${rec.treatment ? `
                            <div class="timeline-detail-line">
                              <span class="detail-label">Treatment:</span>
                              <span class="detail-val">${rec.treatment}</span>
                            </div>
                          ` : ''}

                          ${rec.prescription && rec.prescription !== 'None' ? `
                            <div class="timeline-detail-line">
                              <span class="detail-label">Prescription:</span>
                              <span class="detail-val" style="color: var(--dark-green); font-weight: 600;">${rec.prescription}</span>
                            </div>
                          ` : ''}

                          ${rec.reports ? `
                            <div class="timeline-detail-line">
                              <span class="detail-label">Reports:</span>
                              <span class="detail-val">${rec.reports}</span>
                            </div>
                          ` : ''}
                        </div>

                        <div class="timeline-card-action">
                          <button class="btn btn-secondary btn-sm btn-view-full-detail" data-id="${rec.id}">
                            View Full Record →
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Section 11: Standard Medical Records Filterable Page (Strong Information Hierarchy)
  return `
    <div class="master-page-container animate-fade-in">
      ${renderPageHeader({
        title: 'Medical Records',
        subtitle: 'Attested longitudinal clinical records across Indian healthcare providers.',
        rightContent: `
          <button class="btn btn-secondary btn-sm" id="btn-switch-to-timeline-view">
            ${Icons.heartPulse('w-3.5 h-3.5')}
            <span>Switch to Timeline View</span>
          </button>
        `
      })}

      <!-- Section 11 Filters -->
      <div class="records-filters-bar">
        <button class="filter-tab ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">All (${records.length})</button>
        <button class="filter-tab ${currentFilter === 'consultations' ? 'active' : ''}" data-filter="consultations">Consultations</button>
        <button class="filter-tab ${currentFilter === 'diagnoses' ? 'active' : ''}" data-filter="diagnoses">Diagnoses</button>
        <button class="filter-tab ${currentFilter === 'prescriptions' ? 'active' : ''}" data-filter="prescriptions">Prescriptions</button>
        <button class="filter-tab ${currentFilter === 'reports' ? 'active' : ''}" data-filter="reports">Reports</button>
        <button class="filter-tab ${currentFilter === 'hospital_visits' ? 'active' : ''}" data-filter="hospital_visits">Hospital Visits</button>
        <button class="filter-tab ${currentFilter === 'surgeries' ? 'active' : ''}" data-filter="surgeries">Surgeries</button>
      </div>

      <!-- Section 11 Records Cards List (Official Administrative Panel Style) -->
      <div class="records-cards-stack">
        ${filteredRecords.map(rec => {
          const isVerified = rec.verificationStatus === 'verified_by_provider';
          const isSensitive = rec.isSensitive;
          const isUnlocked = state.isSensitiveUnlocked;

          return `
            <div class="card record-entry-card" id="record-${rec.id}">
              <!-- Official Header: Category & Date -->
              <div class="record-top-meta">
                <div class="record-kicker-label">MEDICAL RECORD • <span class="record-date-kicker">${rec.date.toUpperCase()}</span></div>
                <div class="record-type-badge">${rec.recordType || rec.category}</div>
              </div>

              <!-- Main Consultation Title & Provider Organization -->
              <div class="record-main-block">
                <h3 class="record-title-text">${rec.title}</h3>
                <div class="record-provider-text">
                  <strong>${rec.doctor || rec.providerName}</strong> • ${rec.hospital || 'Metro Health Institute'}
                </div>
              </div>

              <!-- Content Body -->
              ${isSensitive && !isUnlocked ? `
                <div class="sensitive-locked-panel">
                  <div style="color: var(--primary-green);">${Icons.lock('w-4.5 h-4.5')}</div>
                  <div>
                    <strong style="font-size: 0.875rem;">Tier-3 Confidential Record</strong>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Requires patient biometric or OTP consent verification.</div>
                  </div>
                  <button class="btn btn-primary btn-sm btn-unlock-otp-action" data-id="${rec.id}">
                    Unlock (Demo OTP: 7492)
                  </button>
                </div>
              ` : `
                <!-- Clinical Summary Grid (Scannable for Doctor Review) -->
                <div class="record-info-grid">
                  ${rec.diagnosis ? `
                    <div class="info-cell">
                      <div class="info-label">Diagnosis</div>
                      <div class="info-value" style="font-weight: 600; color: var(--text-primary);">${rec.diagnosis}</div>
                    </div>
                  ` : ''}

                  ${rec.treatment ? `
                    <div class="info-cell">
                      <div class="info-label">Treatment</div>
                      <div class="info-value">${rec.treatment}</div>
                    </div>
                  ` : ''}

                  ${rec.prescription && rec.prescription !== 'None' ? `
                    <div class="info-cell">
                      <div class="info-label">Prescription</div>
                      <div class="info-value" style="color: var(--dark-green); font-weight: 600;">${rec.prescription}</div>
                    </div>
                  ` : ''}

                  ${rec.reports ? `
                    <div class="info-cell">
                      <div class="info-label">Reports</div>
                      <div class="info-value">${rec.reports}</div>
                    </div>
                  ` : ''}
                </div>
              `}

              <!-- Bottom Bar: Verified Badge & View Details -->
              <div class="record-bottom-bar">
                <div>
                  ${isVerified ? `
                    <span class="badge badge-verified">
                      ${Icons.check('w-3.5 h-3.5')}
                      <span>✓ Verified Provider</span>
                    </span>
                  ` : `
                    <span class="badge badge-unverified">
                      ${Icons.alertTriangle('w-3.5 h-3.5')}
                      <span>Self-Uploaded</span>
                    </span>
                  `}
                </div>

                <button class="btn btn-secondary btn-sm btn-view-full-detail" data-id="${rec.id}">
                  View Details →
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function attachRecordsTimelineEvents(container) {
  // Filter tabs
  const filterTabs = container.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.getAttribute('data-filter');
      store.setFilter(filter);
    });
  });

  // Switch to timeline view button
  const btnTimeline = container.querySelector('#btn-switch-to-timeline-view');
  if (btnTimeline) {
    btnTimeline.addEventListener('click', () => {
      store.setActiveNav('timeline');
    });
  }

  // View full detail modal buttons
  const detailBtns = container.querySelectorAll('.btn-view-full-detail');
  detailBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.getAttribute('data-id');
      if (recordId) {
        store.openRecordDetail(recordId);
      }
    });
  });

  // Sensitive record unlock button
  const unlockBtns = container.querySelectorAll('.btn-unlock-otp-action');
  unlockBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.getAttribute('data-id');
      store.openModal('unlock', { recordId });
    });
  });
}
