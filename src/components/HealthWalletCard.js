import { Icons } from './icons.js';
import { store } from '../state/store.js';

export function renderHealthWalletCard(state) {
  const patient = state.patient;

  return `
    <div class="hw-card">
      <!-- Top Row: Card Title & ABHA Badge -->
      <div class="hw-card-header">
        <div>
          <div class="hw-card-type-label">HEALTH WALLET</div>
          <div class="hw-card-id">${patient.id}</div>
        </div>

        <div class="badge badge-verified">
          ${Icons.check('w-3.5 h-3.5')}
          <span>ABHA Connected ✓</span>
        </div>
      </div>

      <!-- Patient Demographics Row -->
      <div class="hw-card-patient-row">
        <div>
          <div class="hw-patient-name">${patient.fullName}</div>
          <div class="hw-patient-meta">
            ${patient.age} Yrs • ${patient.gender} • ${patient.city}, ${patient.state}
          </div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 0.75rem; color: var(--text-muted);">ABHA Address</div>
          <div style="font-weight: 600; color: var(--dark-green); font-size: 0.8125rem;">${patient.abhaAddress}</div>
        </div>
      </div>

      <!-- Vitals & Emergency Indicators (Subtle Green Panel) -->
      <div class="hw-vitals-grid">
        <div class="hw-vital-item">
          <span class="hw-vital-label">Blood Group</span>
          <span class="hw-vital-value">${patient.bloodGroup}</span>
        </div>

        <div class="hw-vital-item">
          <span class="hw-vital-label">Emergency Info</span>
          <span class="hw-vital-value" style="color: var(--primary-green);">Available</span>
        </div>

        <div class="hw-vital-item">
          <span class="hw-vital-label">Critical Allergy</span>
          <span class="hw-vital-value" style="color: var(--color-danger); font-size: 0.875rem;">Penicillin (Severe)</span>
        </div>

        <div class="hw-vital-item">
          <span class="hw-vital-label">Organ Donor</span>
          <span class="hw-vital-value" style="font-size: 0.875rem;">Registered (Yes)</span>
        </div>
      </div>

      <!-- Footer Actions: Protected Hash & Show QR -->
      <div class="hw-card-footer">
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          ${Icons.lock('w-3.5 h-3.5')}
          <span>Aadhaar Link: <strong>${patient.maskedAadhaar}</strong> (Encrypted Hash)</span>
        </div>

        <button class="btn btn-primary btn-sm" id="btn-show-qr">
          ${Icons.qrCode('w-3.5 h-3.5')}
          <span>Show Health QR</span>
        </button>
      </div>
    </div>
  `;
}

export function attachHealthWalletCardEvents(container) {
  const btnShowQr = container.querySelector('#btn-show-qr');
  if (btnShowQr) {
    btnShowQr.addEventListener('click', () => {
      store.openModal('qrCode');
    });
  }
}
