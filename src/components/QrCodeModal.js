import { Icons } from './icons.js';
import { store } from '../state/store.js';

export function renderQrCodeModal(state) {
  if (!state.modals.qrCode) return '';

  const patient = state.patient;

  return `
    <div class="modal-backdrop" id="modal-backdrop-qr">
      <div class="modal-card" style="max-width: 420px; text-align: center;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--primary-green);">
            ${Icons.qrCode('w-5 h-5')}
            <h3>Encrypted Health QR</h3>
          </div>
          <button class="btn btn-ghost btn-sm" id="btn-close-qr">
            ${Icons.close('w-5 h-5')}
          </button>
        </div>

        <div class="modal-body" style="padding: 1.5rem;">
          <div style="background: #FFFFFF; padding: 1.25rem; border-radius: var(--radius-btn); display: inline-block; border: 1px solid var(--border-color); box-shadow: var(--shadow-card); margin-bottom: 1.25rem;">
            <!-- High-Contrast Clean SVG QR with Green Shield -->
            <svg width="190" height="190" viewBox="0 0 200 200" style="display: block;">
              <!-- Outer Corner Position Locators -->
              <rect x="10" y="10" width="50" height="50" fill="#17211C" rx="4"/>
              <rect x="20" y="20" width="30" height="30" fill="#ffffff"/>
              <rect x="26" y="26" width="18" height="18" fill="#1F6B4F"/>

              <rect x="140" y="10" width="50" height="50" fill="#17211C" rx="4"/>
              <rect x="150" y="20" width="30" height="30" fill="#ffffff"/>
              <rect x="156" y="26" width="18" height="18" fill="#1F6B4F"/>

              <rect x="10" y="140" width="50" height="50" fill="#17211C" rx="4"/>
              <rect x="20" y="150" width="30" height="30" fill="#ffffff"/>
              <rect x="26" y="156" width="18" height="18" fill="#1F6B4F"/>

              <!-- Simulated data modules in charcoal -->
              <g fill="#17211C">
                <rect x="70" y="15" width="10" height="10"/>
                <rect x="90" y="15" width="10" height="10"/>
                <rect x="115" y="15" width="10" height="10"/>
                <rect x="70" y="35" width="10" height="10"/>
                <rect x="100" y="35" width="10" height="10"/>
                <rect x="120" y="35" width="10" height="10"/>
                
                <rect x="15" y="70" width="10" height="10"/>
                <rect x="35" y="70" width="10" height="10"/>
                <rect x="15" y="90" width="10" height="10"/>
                <rect x="35" y="90" width="10" height="10"/>

                <rect x="150" y="70" width="10" height="10"/>
                <rect x="175" y="70" width="10" height="10"/>
                <rect x="150" y="90" width="10" height="10"/>
                <rect x="175" y="110" width="10" height="10"/>

                <rect x="70" y="150" width="10" height="10"/>
                <rect x="95" y="150" width="10" height="10"/>
                <rect x="120" y="150" width="10" height="10"/>
                <rect x="70" y="175" width="10" height="10"/>
                <rect x="100" y="175" width="10" height="10"/>
                <rect x="125" y="175" width="10" height="10"/>
                <rect x="150" y="175" width="10" height="10"/>
                <rect x="175" y="175" width="10" height="10"/>
              </g>

              <!-- Central Medical Cross Emblem -->
              <rect x="80" y="80" width="40" height="40" fill="#1F6B4F" rx="8"/>
              <path d="M93 100h14 M100 93v14" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>

          <div style="font-family: var(--font-mono); font-size: 1.05rem; font-weight: 700; color: var(--dark-green); margin-bottom: 0.25rem;">
            ${patient.id}
          </div>
          <div style="font-size: 0.78125rem; color: var(--text-muted); margin-bottom: 1rem;">
            Dynamic Ephemeral Token • Valid for next <strong>04:42</strong> minutes
          </div>

          <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: var(--radius-btn); font-size: 0.75rem; color: var(--text-secondary); text-align: left; margin-bottom: 1.25rem; border: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 0.35rem; color: var(--dark-green); font-weight: 600; margin-bottom: 0.2rem;">
              ${Icons.shieldCheck('w-3.5 h-3.5')}
              <span>Zero-Knowledge Compliant</span>
            </div>
            This QR transmits only a safe transient token and public key signature. <strong>Aadhaar is never stored or transmitted.</strong>
          </div>

          <button class="btn btn-primary" id="btn-simulate-qr-scan" style="width: 100%;">
            ${Icons.hospital('w-4 h-4')}
            <span>Simulate OPD Hospital Check-In</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function attachQrCodeEvents(container) {
  const btnClose = container.querySelector('#btn-close-qr');
  const backdrop = container.querySelector('#modal-backdrop-qr');

  const closeHandler = () => store.closeModal('qrCode');
  if (btnClose) btnClose.addEventListener('click', closeHandler);
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeHandler();
    });
  }

  const btnScan = container.querySelector('#btn-simulate-qr-scan');
  if (btnScan) {
    btnScan.addEventListener('click', () => {
      store.logAccess({
        accessorName: 'Outpatient Kiosk #03',
        accessorRole: 'hospital',
        organization: 'Metro Health Institute',
        action: 'VIEW_RECORD',
        resource: 'Contactless QR Admission Token',
        purpose: 'Fast-track OPD check-in & token registration',
        isEmergency: false,
        securityLevel: 'NFC/QR Ephemeral Token'
      });

      store.showToast('Check-In Successful', 'OPD Token generated at Metro Health Institute.', 'success');
      closeHandler();
    });
  }
}
