import { Icons } from './icons.js';
import { store } from '../state/store.js';

export function renderConsentManagerModal(state) {
  if (!state.modals.consentManager) return '';

  const consents = state.consents;

  return `
    <div class="modal-backdrop" id="modal-backdrop-consent">
      <div class="modal-card" style="max-width: 620px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${Icons.shieldCheck('w-5 h-5')}
            <h3>Granular Consent Manager</h3>
          </div>
          <button class="btn btn-ghost btn-sm" id="btn-close-consent">
            ${Icons.close('w-5 h-5')}
          </button>
        </div>

        <div class="modal-body">
          <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            Under the DPDP framework, you specify granular permission boundaries for each healthcare provider.
          </p>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${consents.map(c => `
              <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-btn); padding: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                  <div>
                    <strong style="color: var(--text-primary); font-size: 0.95rem;">${c.providerName}</strong>
                    <div style="font-size: 0.78125rem; color: var(--text-secondary);">${c.organization}</div>
                  </div>
                  <div class="badge badge-verified">
                    ${Icons.check('w-3 h-3')}
                    <span>${c.status}</span>
                  </div>
                </div>

                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.04em;">
                  Permitted Categories:
                </div>

                <!-- Scope Toggles -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; margin-bottom: 0.875rem;">
                  <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: var(--text-primary); cursor: pointer;">
                    <input type="checkbox" class="consent-scope-toggle" data-id="${c.id}" data-scope="demographics" ${c.scope.demographics ? 'checked' : ''} style="accent-color: var(--primary-green);" />
                    <span>Basic Demographics</span>
                  </label>

                  <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: var(--text-primary); cursor: pointer;">
                    <input type="checkbox" class="consent-scope-toggle" data-id="${c.id}" data-scope="diagnostics" ${c.scope.diagnostics ? 'checked' : ''} style="accent-color: var(--primary-green);" />
                    <span>Diagnostic Lab Reports</span>
                  </label>

                  <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: var(--text-primary); cursor: pointer;">
                    <input type="checkbox" class="consent-scope-toggle" data-id="${c.id}" data-scope="prescriptions" ${c.scope.prescriptions ? 'checked' : ''} style="accent-color: var(--primary-green);" />
                    <span>Prescriptions</span>
                  </label>

                  <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: var(--dark-green); cursor: pointer;">
                    <input type="checkbox" class="consent-scope-toggle" data-id="${c.id}" data-scope="sensitiveRecords" ${c.scope.sensitiveRecords ? 'checked' : ''} style="accent-color: var(--primary-green);" />
                    <span>Tier-3 Sensitive Records</span>
                  </label>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
                  <span>Expires: <strong>${c.validUntil}</strong></span>
                  <button class="btn btn-ghost btn-sm btn-revoke-consent" data-id="${c.id}" style="color: var(--color-danger); font-size: 0.75rem; padding: 0.2rem 0.5rem;">
                    Revoke All
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-primary btn-sm" id="btn-dismiss-consent">
            Done
          </button>
        </div>
      </div>
    </div>
  `;
}

export function attachConsentEvents(container) {
  const btnClose = container.querySelector('#btn-close-consent');
  const btnDismiss = container.querySelector('#btn-dismiss-consent');
  const backdrop = container.querySelector('#modal-backdrop-consent');

  const closeHandler = () => store.closeModal('consentManager');
  if (btnClose) btnClose.addEventListener('click', closeHandler);
  if (btnDismiss) btnDismiss.addEventListener('click', closeHandler);
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeHandler();
    });
  }

  // Toggle scope changes
  const checkboxes = container.querySelectorAll('.consent-scope-toggle');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      const consentId = e.target.getAttribute('data-id');
      const scopeKey = e.target.getAttribute('data-scope');
      const isChecked = e.target.checked;
      store.updateConsentScope(consentId, scopeKey, isChecked);
    });
  });

  // Revoke button
  const revokeBtns = container.querySelectorAll('.btn-revoke-consent');
  revokeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const consentId = btn.getAttribute('data-id');
      store.updateConsentScope(consentId, 'demographics', false);
      store.updateConsentScope(consentId, 'diagnostics', false);
      store.updateConsentScope(consentId, 'prescriptions', false);
      store.updateConsentScope(consentId, 'sensitiveRecords', false);
      store.showToast('Consent Revoked', 'All access revoked for this provider.', 'info');
    });
  });
}
