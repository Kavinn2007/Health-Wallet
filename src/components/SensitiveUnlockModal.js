import { Icons } from './icons.js';
import { store } from '../state/store.js';

export function renderSensitiveUnlockModal(state) {
  if (!state.modals.sensitiveUnlock) return '';

  return `
    <div class="modal-backdrop" id="modal-backdrop-sensitive">
      <div class="modal-card" style="max-width: 440px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--primary-green);">
            ${Icons.lock('w-5 h-5')}
            <h3>Security Authorization</h3>
          </div>
          <button class="btn btn-ghost btn-sm" id="btn-close-sensitive">
            ${Icons.close('w-5 h-5')}
          </button>
        </div>

        <div class="modal-body">
          <div style="text-align: center; margin-bottom: 1.25rem;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--light-green); display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem auto; color: var(--primary-green);">
              ${Icons.fingerprint('w-6 h-6')}
            </div>
            <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">
              Tier-3 Sensitive Record Unlock
            </h4>
            <p style="font-size: 0.8125rem; color: var(--text-secondary);">
              Psychiatric and neurological assessments require explicit patient authentication. Enter the Aadhaar-linked OTP or use biometric verification.
            </p>
          </div>

          <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-btn); border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
            <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.5rem; text-align: center;">
              One-Time Passcode (SMS to +91 ******2890)
            </label>
            <div style="display: flex; justify-content: center;">
              <input type="password" maxlength="4" id="sensitive-otp-input" placeholder="7492" value="7492" style="font-family: var(--font-mono); font-size: 1.35rem; letter-spacing: 0.4em; text-align: center; width: 160px; padding: 0.5rem;" />
            </div>
            <div style="font-size: 0.75rem; color: var(--primary-green); text-align: center; margin-top: 0.5rem; font-weight: 500;">
              Demo Code: <strong>7492</strong>
            </div>
          </div>

          <div style="display: grid; gap: 0.5rem;">
            <button class="btn btn-primary" id="btn-submit-sensitive-otp" style="width: 100%;">
              ${Icons.unlock('w-4 h-4')}
              <span>Verify & Decrypt Record</span>
            </button>

            <button class="btn btn-secondary" id="btn-biometric-mock" style="width: 100%;">
              ${Icons.fingerprint('w-4 h-4')}
              <span>Authenticate with Biometrics</span>
            </button>
          </div>
        </div>

        <div class="modal-footer" style="justify-content: center; font-size: 0.75rem; color: var(--text-muted);">
          Every decryption event is recorded in your Access Transparency Log.
        </div>
      </div>
    </div>
  `;
}

export function attachSensitiveUnlockEvents(container) {
  const btnClose = container.querySelector('#btn-close-sensitive');
  const backdrop = container.querySelector('#modal-backdrop-sensitive');

  const closeHandler = () => store.closeModal('sensitiveUnlock');
  if (btnClose) btnClose.addEventListener('click', closeHandler);
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeHandler();
    });
  }

  const btnSubmit = container.querySelector('#btn-submit-sensitive-otp');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      const input = container.querySelector('#sensitive-otp-input');
      const val = input ? input.value : '';
      const res = store.unlockSensitiveData(val);
      if (!res.success) {
        alert(res.error);
      }
    });
  }

  const btnBiometric = container.querySelector('#btn-biometric-mock');
  if (btnBiometric) {
    btnBiometric.addEventListener('click', () => {
      store.unlockSensitiveData('7492');
    });
  }
}
