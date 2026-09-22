import { Icons } from './icons.js';
import { store } from '../state/store.js';

export function renderRecordDetailModal(state) {
  if (!state.modals.recordDetail || !state.selectedRecordForDetail) {
    return '';
  }

  const rec = state.selectedRecordForDetail;
  const isVerified = rec.verificationStatus === 'verified_by_provider';
  
  // Find related audit logs for this record
  const relatedAudits = state.auditLogs.filter(log => 
    log.resource.includes(rec.id) || 
    log.resource.includes(rec.title) || 
    (log.accessorName && log.accessorName.includes(rec.doctor))
  ).slice(0, 4);

  return `
    <div class="modal-backdrop" id="modal-backdrop-record-detail">
      <div class="modal-card" style="max-width: 680px; width: 95%;">
        <!-- Header -->
        <div class="modal-header" style="border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); padding: 1.25rem 1.5rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge ${isVerified ? 'badge-verified' : 'badge-unverified'}">
                ${isVerified ? Icons.check('w-3 h-3') : Icons.alertTriangle('w-3 h-3')}
                <span>${isVerified ? 'Attested Medical Record' : 'Unverified Self-Upload'}</span>
              </span>
              <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${rec.id}</span>
            </div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0;">${rec.title}</h3>
          </div>
          <button class="btn btn-ghost btn-sm" id="btn-close-record-detail" style="padding: 0.35rem;">
            ${Icons.close('w-5 h-5')}
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body" style="padding: 1.5rem; max-height: 75vh; overflow-y: auto;">
          <!-- Metadata Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-btn); padding: 1rem; margin-bottom: 1.5rem;">
            <div>
              <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Date</span>
              <div style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem; margin-top: 0.15rem;">${rec.date}</div>
            </div>

            <div>
              <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Attending Doctor</span>
              <div style="font-weight: 600; color: var(--dark-green); font-size: 0.95rem; margin-top: 0.15rem;">${rec.doctor || rec.providerName}</div>
            </div>

            <div>
              <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Hospital / Facility</span>
              <div style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem; margin-top: 0.15rem;">${rec.hospital || 'Accredited Health Node'}</div>
            </div>

            <div>
              <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Record Type</span>
              <div style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem; margin-top: 0.15rem;">${rec.recordType || rec.category}</div>
            </div>
          </div>

          <!-- Clinical Details List -->
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <!-- Diagnosis -->
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.35rem;">
                Diagnosis
              </div>
              <div style="background: #FFFDFC; border: 1px solid var(--border-color); border-left: 3px solid var(--primary-green); padding: 0.75rem 1rem; border-radius: var(--radius-btn); font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">
                ${rec.diagnosis || 'Clinical follow-up and monitoring'}
              </div>
            </div>

            <!-- Treatment & Symptoms -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.35rem;">
                  Observed Symptoms
                </div>
                <div style="background: #FFFDFC; border: 1px solid var(--border-color); padding: 0.75rem 1rem; border-radius: var(--radius-btn); font-size: 0.875rem; color: var(--text-secondary); min-height: 60px;">
                  ${rec.symptoms || 'Routine follow-up assessment'}
                </div>
              </div>

              <div>
                <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.35rem;">
                  Treatment Prescribed
                </div>
                <div style="background: #FFFDFC; border: 1px solid var(--border-color); padding: 0.75rem 1rem; border-radius: var(--radius-btn); font-size: 0.875rem; color: var(--text-secondary); min-height: 60px;">
                  ${rec.treatment || 'Maintenance therapy continued'}
                </div>
              </div>
            </div>

            <!-- Prescription -->
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.35rem;">
                Prescription
              </div>
              <div style="background: #FFFDFC; border: 1px solid var(--border-color); padding: 0.875rem 1rem; border-radius: var(--radius-btn);">
                <div style="font-weight: 600; color: var(--dark-green); font-size: 0.95rem; margin-bottom: 0.35rem;">
                  ${rec.prescription || 'No new pharmacological prescription'}
                </div>
                ${rec.rxItems ? `
                  <div style="display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-subtle);">
                    ${rec.rxItems.map(rx => `
                      <div style="display: flex; justify-content: space-between; font-size: 0.8125rem;">
                        <span style="font-weight: 600; color: var(--text-primary);">${rx.drug}</span>
                        <span style="color: var(--text-muted);">${rx.dose} • ${rx.days} (${rx.instructions})</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Reports & Investigations -->
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.35rem;">
                Reports & Diagnostic Telemetry
              </div>
              <div style="background: #FFFDFC; border: 1px solid var(--border-color); padding: 0.75rem 1rem; border-radius: var(--radius-btn); font-size: 0.875rem; color: var(--text-secondary);">
                ${rec.reports || 'Routine clinical investigation on file'}
              </div>
            </div>

            <!-- Clinical Notes -->
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.35rem;">
                Doctor's Clinical Notes
              </div>
              <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 0.75rem 1rem; border-radius: var(--radius-btn); font-size: 0.875rem; color: var(--text-secondary); font-style: italic;">
                "${rec.notes || rec.summary}"
              </div>
            </div>

            <!-- Verification Status -->
            <div style="background: var(--very-light-green); border: 1px solid var(--green-accent-subtle); border-radius: var(--radius-btn); padding: 0.875rem 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <div style="font-size: 0.75rem; font-weight: 700; color: var(--dark-green); text-transform: uppercase;">
                  Attestation & Verification Status
                </div>
                <span class="badge badge-verified">
                  ${Icons.shieldCheck('w-3.5 h-3.5')}
                  <span>${isVerified ? 'Cryptographically Attested' : 'Self-Uploaded'}</span>
                </span>
              </div>
              <div style="font-size: 0.8125rem; color: var(--text-secondary);">
                ${rec.verificationDetails?.verifiedBy ? `Attested by: <strong>${rec.verificationDetails.verifiedBy}</strong>` : 'Awaiting clinical attestation'}
                ${rec.verificationDetails?.signatureHash ? ` • Signature: <code style="font-family: var(--font-mono); font-size: 0.75rem;">${rec.verificationDetails.signatureHash}</code>` : ''}
              </div>
            </div>

            <!-- Access History for this Record -->
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 0.5rem;">
                Record Access History (Audit Trail)
              </div>
              <div style="border: 1px solid var(--border-color); border-radius: var(--radius-btn); overflow: hidden;">
                ${relatedAudits.length > 0 ? relatedAudits.map((log, idx) => `
                  <div style="padding: 0.6rem 0.875rem; font-size: 0.78125rem; display: flex; justify-content: space-between; align-items: center; background: ${idx % 2 === 0 ? '#FFFDFC' : 'var(--bg-secondary)'}; border-bottom: 1px solid var(--border-subtle);">
                    <div>
                      <strong style="color: var(--text-primary);">${log.accessorName}</strong>
                      <span style="color: var(--text-muted);"> (${log.organization})</span>
                      <div style="font-size: 0.72rem; color: var(--primary-green);">${log.action} — ${log.purpose}</div>
                    </div>
                    <span style="color: var(--text-muted); font-size: 0.72rem; white-space: nowrap;">${log.timestamp}</span>
                  </div>
                `).join('') : `
                  <div style="padding: 0.75rem; font-size: 0.8125rem; color: var(--text-muted); text-align: center; background: #FFFDFC;">
                    Access logged under primary patient timeline ledger.
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer" style="padding: 1rem 1.5rem; background: var(--bg-secondary); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between;">
          <button class="btn btn-ghost btn-sm" id="btn-audit-single-record">
            ${Icons.eye('w-3.5 h-3.5')}
            <span>Log Explicit View</span>
          </button>
          <button class="btn btn-primary btn-sm" id="btn-close-record-detail-bottom">
            Close Record
          </button>
        </div>
      </div>
    </div>
  `;
}

export function attachRecordDetailEvents(container) {
  const backdrop = container.querySelector('#modal-backdrop-record-detail');
  const btnClose = container.querySelector('#btn-close-record-detail');
  const btnCloseBottom = container.querySelector('#btn-close-record-detail-bottom');

  const closeHandler = () => store.closeRecordDetail();

  if (btnClose) btnClose.addEventListener('click', closeHandler);
  if (btnCloseBottom) btnCloseBottom.addEventListener('click', closeHandler);
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeHandler();
    });
  }

  const btnAudit = container.querySelector('#btn-audit-single-record');
  if (btnAudit) {
    btnAudit.addEventListener('click', () => {
      const state = store.getState();
      const rec = state.selectedRecordForDetail;
      if (rec) {
        store.logAccess({
          accessorName: state.activeRole === 'patient' ? state.patient.fullName + ' (Patient)' : 'Dr. Authorized Session',
          accessorRole: state.activeRole,
          organization: 'Health Wallet Verified Portal',
          action: 'VIEW_RECORD',
          resource: `${rec.id} (${rec.title})`,
          purpose: 'Detailed clinical inspection',
          isEmergency: false,
          securityLevel: 'Cryptographically Verified View',
          verifiedProvider: true
        });
        store.showToast('Access Logged', `Audit ledger updated for ${rec.id}`, 'info');
      }
    });
  }
}
