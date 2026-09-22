import { Icons } from './icons.js';
import { store } from '../state/store.js';

export function renderConsentPrivacyView(state) {
  const consents = state.consents;

  return `
    <div style="background: #FFFFFF;">
      <!-- Header -->
      <div style="margin-bottom: 2rem;">
        <h2 class="section-header-title">Consent & Privacy</h2>
        <p class="section-header-subtitle">Your health data. Your control. Granular DPDP permissions & provider revocations.</p>
      </div>

      <!-- Trust Assurance Box -->
      <div style="background: var(--very-light-green); border: 1px solid var(--green-accent-subtle); border-radius: var(--radius-card); padding: 1.25rem 1.5rem; margin-bottom: 2rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="color: var(--primary-green);">
            ${Icons.shieldCheck('w-6 h-6')}
          </div>
          <div>
            <strong style="color: var(--dark-green); font-size: 0.95rem;">Active Consent Boundaries Enforced</strong>
            <div style="font-size: 0.8125rem; color: var(--text-secondary);">
              Healthcare providers can only read categories explicitly authorized by your signed digital policy.
            </div>
          </div>
        </div>

        <button class="btn btn-secondary btn-sm" id="btn-open-consent-modal-direct">
          ${Icons.settings('w-3.5 h-3.5')}
          <span>Configure Permissions</span>
        </button>
      </div>

      <!-- Active Permissions List -->
      <div style="margin-bottom: 1.25rem;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem;">
          Active Permissions (${consents.length})
        </h3>

        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${consents.map(c => {
            const activeScopes = [];
            if (c.scope.demographics) activeScopes.push('Demographics');
            if (c.scope.diagnostics) activeScopes.push('Reports');
            if (c.scope.prescriptions) activeScopes.push('Medicines');
            if (c.scope.sensitiveRecords) activeScopes.push('Tier-3 Sensitive');

            return `
              <div class="card" style="padding: 1.25rem 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                  <div>
                    <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">${c.providerName}</h4>
                    <div style="font-size: 0.8125rem; color: var(--text-secondary);">${c.organization}</div>
                  </div>

                  <span class="badge badge-verified">
                    ${Icons.check('w-3 h-3')}
                    <span>${c.status}</span>
                  </span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin: 1rem 0; padding: 0.75rem 0; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); font-size: 0.8125rem;">
                  <div>
                    <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Allowed Scope</span>
                    <div style="font-weight: 600; color: var(--dark-green); margin-top: 0.15rem;">
                      ${activeScopes.length > 0 ? activeScopes.join(' + ') : 'None (Revoked)'}
                    </div>
                  </div>

                  <div>
                    <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Purpose</span>
                    <div style="font-weight: 600; color: var(--text-primary); margin-top: 0.15rem;">
                      Clinical Consultation & Treatment
                    </div>
                  </div>

                  <div>
                    <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Access Expires</span>
                    <div style="font-weight: 600; color: var(--text-primary); margin-top: 0.15rem;">
                      ${c.validUntil}
                    </div>
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
                  <span style="color: var(--text-muted);">Policy Token: <code>${c.id}</code></span>

                  <button class="btn btn-secondary btn-sm btn-revoke-consent-view" data-id="${c.id}" style="color: var(--color-danger); border-color: var(--color-danger-border);">
                    Revoke Access
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

export function attachConsentPrivacyEvents(container) {
  const btnOpenModal = container.querySelector('#btn-open-consent-modal-direct');
  if (btnOpenModal) {
    btnOpenModal.addEventListener('click', () => {
      store.openModal('consentManager');
    });
  }

  const revokeBtns = container.querySelectorAll('.btn-revoke-consent-view');
  revokeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      store.updateConsentScope(id, 'demographics', false);
      store.updateConsentScope(id, 'diagnostics', false);
      store.updateConsentScope(id, 'prescriptions', false);
      store.updateConsentScope(id, 'sensitiveRecords', false);
      store.showToast('Access Revoked', 'All permissions revoked for this provider.', 'info');
    });
  });
}
