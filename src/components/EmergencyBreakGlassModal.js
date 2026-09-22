import { Icons } from './icons.js';
import { store } from '../state/store.js';

export function renderEmergencyBreakGlassModal(state) {
  if (!state.modals.emergency) return '';

  const patient = state.patient;
  const isBreakGlassActive = state.isEmergencyBreakGlassActive;

  return `
    <div class="modal-backdrop" id="modal-backdrop-emergency">
      <div class="modal-card emergency-modal">
        <!-- Header: Clean White with Restrained Red Accent -->
        <div class="modal-header" style="border-bottom: 1px solid var(--color-danger-border); background: var(--color-danger-bg);">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--color-danger);">
            ${Icons.siren('w-5 h-5')}
            <h3 style="color: var(--color-danger); font-size: 1.15rem;">Emergency Access — Break-Glass Protocol</h3>
          </div>
          <button class="btn btn-ghost btn-sm" id="btn-close-emergency" style="color: var(--text-secondary);">
            ${Icons.close('w-5 h-5')}
          </button>
        </div>

        <div class="modal-body">
          <!-- Critical Notice -->
          <div class="emergency-hazard-banner">
            <div style="color: var(--color-danger); flex-shrink: 0; margin-top: 2px;">
              ${Icons.alertTriangle('w-5 h-5')}
            </div>
            <div style="font-size: 0.8125rem; color: #7F1D1D; line-height: 1.45;">
              <strong>Critical Information Only:</strong><br/>
              Break-Glass exposes strictly life-saving emergency metrics. Full historical consultation notes and financial details remain restricted. This override is logged to the national audit registry and notifies Next-of-Kin.
            </div>
          </div>

          <!-- Paramedic Form if not yet executed -->
          ${!isBreakGlassActive ? `
            <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-btn); border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
              <h4 style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em;">
                Paramedic / Clinical Attestation
              </h4>
              <div style="display: grid; gap: 0.75rem;">
                <div>
                  <label>Authorized Responder Name & Badge</label>
                  <input type="text" id="emergency-responder-name" value="Dr. Arvind Rao, MD (Trauma Lead - Reg: 2017/02/1182)" style="width: 100%;" />
                </div>
                <div>
                  <label>Clinical Justification for Emergency Override</label>
                  <input type="text" id="emergency-reason" value="Unconscious trauma patient admitted via 108 Ambulance triage" style="width: 100%;" />
                </div>
              </div>

              <div style="margin-top: 1rem;">
                <button class="btn btn-emergency" id="btn-confirm-break-glass" style="width: 100%;">
                  ${Icons.siren('w-4 h-4')}
                  <span>Authorize & Decrypt Emergency Metrics</span>
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Emergency Profile: White Panel with Restrained Highlights -->
          <div style="border: 1px solid var(--border-color); background: #FFFFFF; border-radius: var(--radius-card); padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem;">
              <div>
                <span style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.04em;">PATIENT SAFE ID</span>
                <div style="font-family: var(--font-mono); font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">${patient.id}</div>
              </div>
              <div class="badge badge-emergency">
                <span>Critical Triage Metrics</span>
              </div>
            </div>

            <!-- Triage Grid -->
            <div class="emergency-triage-grid">
              <div class="triage-box">
                <h4>Blood Group</h4>
                <div class="highlight" style="color: var(--dark-green);">${patient.bloodGroup}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Universal Red Cell Match</div>
              </div>

              <div class="triage-box" style="border-color: var(--color-danger-border); background: var(--color-danger-bg);">
                <h4 style="color: var(--color-danger);">Severe Allergies</h4>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--color-danger);">
                  ⚠️ Penicillin (Anaphylaxis)
                </div>
                <div style="font-size: 0.75rem; color: #991B1B; margin-top: 0.25rem;">
                  Sulfonamides (Cutaneous rash)
                </div>
              </div>

              <div class="triage-box">
                <h4>In Case of Emergency (ICE)</h4>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">
                  ${patient.emergencyContact.name} (${patient.emergencyContact.relation})
                </div>
                <div style="font-size: 0.8125rem; color: var(--primary-green); margin-top: 0.25rem; font-family: var(--font-mono); font-weight: 600;">
                  📞 ${patient.emergencyContact.phone}
                </div>
              </div>

              <div class="triage-box">
                <h4>Directive & Donor</h4>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--dark-green);">
                  ${patient.resuscitationDirective}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                  Organ Donor: Registered (${patient.organDonorCategories.join(', ')})
                </div>
              </div>
            </div>

            <!-- Critical Medications -->
            <div style="background: var(--bg-secondary); padding: 0.875rem; border-radius: var(--radius-btn); margin-bottom: 0.75rem; border: 1px solid var(--border-color);">
              <h4 style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.04em;">
                Critical Medicines
              </h4>
              <div style="display: grid; gap: 0.35rem;">
                ${patient.currentCriticalMeds.map(med => `
                  <div style="display: flex; justify-content: space-between; font-size: 0.8125rem;">
                    <strong style="color: var(--text-primary);">${med.name} (${med.dosage})</strong>
                    <span style="color: var(--text-secondary);">${med.frequency}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; margin-top: 0.75rem;">
              Access will be logged permanently to the patient's transparency audit ledger.
            </div>
          </div>
        </div>

        <div class="modal-footer" style="justify-content: space-between;">
          <div style="font-size: 0.75rem; color: var(--color-danger); display: flex; align-items: center; gap: 0.35rem;">
            ${Icons.shield('w-3.5 h-3.5')}
            <span>Break-Glass Logged to National Registry</span>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-dismiss-emergency">
            Close Triage View
          </button>
        </div>
      </div>
    </div>
  `;
}

export function attachEmergencyEvents(container) {
  const btnClose = container.querySelector('#btn-close-emergency');
  const btnDismiss = container.querySelector('#btn-dismiss-emergency');
  const backdrop = container.querySelector('#modal-backdrop-emergency');

  const closeHandler = () => store.closeModal('emergency');

  if (btnClose) btnClose.addEventListener('click', closeHandler);
  if (btnDismiss) btnDismiss.addEventListener('click', closeHandler);
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeHandler();
    });
  }

  const btnConfirm = container.querySelector('#btn-confirm-break-glass');
  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      const nameInput = container.querySelector('#emergency-responder-name');
      const reasonInput = container.querySelector('#emergency-reason');
      const responder = nameInput ? nameInput.value : 'ER-108 Trauma Team';
      const reason = reasonInput ? reasonInput.value : 'Acute Emergency Triage';

      store.triggerBreakGlass(responder, 'Metro Trauma Center & ER-108', reason);
    });
  }
}
