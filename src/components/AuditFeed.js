import { Icons } from './icons.js';
import { store } from '../state/store.js';
import { renderPageHeader } from './master/MasterComponents.js';

export function renderAuditFeed(state) {
  const auditLogs = state.auditLogs;

  return `
    <div class="master-page-container animate-fade-in" id="section-audit-feed">
      <!-- Master Header -->
      ${renderPageHeader({
        title: 'Who viewed my records?',
        subtitle: 'Cryptographically sealed transparency ledger. Real-time audit of all practitioner, lab, and pharmacy queries.',
        rightContent: `
          <button class="btn btn-secondary btn-sm" id="btn-simulate-audit">
            ${Icons.refresh('w-3.5 h-3.5')}
            <span>Simulate Provider Query</span>
          </button>
        `
      })}

      <!-- Official Trust Banner -->
      <div class="audit-official-trust-banner">
        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem;">
          ${Icons.shieldCheck('w-4 h-4')}
          <span>Total Recorded Access Events: <strong>${auditLogs.length} verified operations</strong></span>
        </div>
        <span class="badge badge-verified" style="font-size: 0.7rem;">
          ABDM DPDP Cryptographic Audit Trail
        </span>
      </div>

      <!-- Audit Cards (Section 13 format: WHO, WHEN, WHAT, WHY, Verified Provider) -->
      <div class="audit-list-cards-stack">
        ${auditLogs.map(log => {
          const isEmergency = log.isEmergency;

          return `
            <div class="card audit-entry-card ${isEmergency ? 'emergency-entry' : ''}">
              <div class="audit-left-icon-col">
                <div class="audit-actor-icon ${isEmergency ? 'emergency' : ''}">
                  ${isEmergency ? Icons.siren('w-4 h-4') : Icons.shieldCheck('w-4 h-4')}
                </div>
              </div>

              <div class="audit-content-col">
                <!-- Top Row: WHO + WHEN -->
                <div class="audit-header-row">
                  <div>
                    <span class="audit-who-title">${log.accessorName}</span>
                    <span class="audit-org-text">• ${log.organization}</span>
                  </div>
                  <div class="audit-when-text">${log.timestamp}</div>
                </div>

                <!-- Middle: WHAT & WHY -->
                <div class="audit-body-details">
                  <div class="audit-detail-line">
                    <span class="audit-field-lbl">Viewed:</span>
                    <strong class="audit-field-val">${log.resource}</strong>
                  </div>

                  <div class="audit-detail-line">
                    <span class="audit-field-lbl">Purpose:</span>
                    <span class="audit-field-val" style="color: var(--text-secondary);">${log.purpose || 'Follow-up consultation'}</span>
                  </div>
                </div>

                <!-- Footer: Status & Verification -->
                <div class="audit-bottom-row">
                  <div>
                    ${isEmergency ? `
                      <span class="badge badge-emergency">
                        ${Icons.alertTriangle('w-3 h-3')}
                        <span>🚨 EMERGENCY BREAK-GLASS OVERRIDE</span>
                      </span>
                    ` : `
                      <span class="badge badge-verified">
                        ${Icons.check('w-3 h-3')}
                        <span>✓ Verified Provider</span>
                      </span>
                    `}
                  </div>

                  <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; gap: 0.5rem; align-items: center;">
                    <span>Security: <strong>${log.securityLevel}</strong></span>
                    <span>•</span>
                    <span>Node: <code>${log.nodeId}</code></span>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function attachAuditFeedEvents(container) {
  const btnSimulate = container.querySelector('#btn-simulate-audit');
  if (btnSimulate) {
    btnSimulate.addEventListener('click', () => {
      const state = store.getState();
      const doc = state.activeDoctor === 'doctorB' ? 'Dr. Rahul Mehta, MD (General Physician)' : 'Dr. Priya Nair, MD (Cardiologist)';
      const org = state.activeDoctor === 'doctorB' ? 'City Health Clinic' : 'Metro Health Institute';

      store.logAccess({
        accessorId: 'DOC-SIMULATED-01',
        accessorName: doc,
        organization: org,
        role: 'doctor',
        action: 'READ_HEALTH_SUMMARY',
        resource: 'Longitudinal Vitals & Regimen',
        purpose: 'Periodic Care Review',
        securityLevel: 'LEVEL-3-PKI'
      });
    });
  }
}
