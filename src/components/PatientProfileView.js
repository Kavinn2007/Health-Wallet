import { Icons } from './icons.js';
import { store } from '../state/store.js';

export function renderPatientProfileView(state) {
  const patient = state.patient;

  return `
    <div class="patient-profile-wrap animate-fade-in">
      <div style="margin-bottom: 1.5rem;">
        <h2 class="section-header-title">Patient Profile</h2>
        <p class="section-header-subtitle">Verified identity credentials and emergency health attributes.</p>
      </div>

      <!-- Main Profile Card -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 1.25rem; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--light-green); color: var(--dark-green); font-size: 1.35rem; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid var(--primary-green);">
              AS
            </div>
            <div>
              <h3 style="font-size: 1.35rem; font-weight: 700; color: var(--text-primary); margin: 0;">${patient.fullName}</h3>
              <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.15rem;">
                ABHA Address: <strong style="color: var(--dark-green);">${patient.abhaAddress}</strong>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span class="badge badge-verified">
              ${Icons.check('w-3.5 h-3.5')}
              <span>ABHA Connected</span>
            </span>
            <button class="btn btn-secondary btn-sm" id="btn-profile-qr">
              ${Icons.qrCode('w-3.5 h-3.5')}
              <span>Health QR</span>
            </button>
          </div>
        </div>

        <!-- Demographic Details Grid (Section 13) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
          <div class="profile-field-box">
            <span class="profile-field-label">Health Wallet ID</span>
            <div class="profile-field-value" style="font-family: var(--font-mono); font-weight: 700; color: var(--dark-green);">
              ${patient.id}
            </div>
          </div>

          <div class="profile-field-box">
            <span class="profile-field-label">Age</span>
            <div class="profile-field-value">${patient.age} Years</div>
          </div>

          <div class="profile-field-box">
            <span class="profile-field-label">Gender</span>
            <div class="profile-field-value">${patient.gender}</div>
          </div>

          <div class="profile-field-box">
            <span class="profile-field-label">Location</span>
            <div class="profile-field-value">${patient.city}, ${patient.state}</div>
          </div>

          <div class="profile-field-box">
            <span class="profile-field-label">Blood Group</span>
            <div class="profile-field-value" style="font-weight: 700; color: var(--text-primary);">${patient.bloodGroup}</div>
          </div>

          <div class="profile-field-box">
            <span class="profile-field-label">Emergency Information</span>
            <div class="profile-field-value" style="color: var(--primary-green); font-weight: 600;">Available (Triage Verified)</div>
          </div>
        </div>

        <!-- Privacy & Security Attestation Note -->
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-btn); padding: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; font-size: 0.8125rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${Icons.shieldCheck('w-4 h-4')}
            <span>Aadhaar Link: <strong>${patient.maskedAadhaar}</strong> (Protected Encrypted Reference — Never Exposed Publicly)</span>
          </div>
          <span class="badge badge-neutral" style="font-family: var(--font-mono); font-size: 0.7rem;">
            DPDP Act 2023 Compliant
          </span>
        </div>
      </div>

      <!-- Emergency Contacts & ICE Information -->
      <div class="card">
        <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          ${Icons.siren('w-4 h-4')}
          <span>In Case of Emergency (ICE) Contacts</span>
        </h4>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
          <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-btn); padding: 1rem;">
            <div style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">${patient.emergencyContact.name}</div>
            <div style="font-size: 0.8125rem; color: var(--text-secondary); margin: 0.2rem 0 0.5rem 0;">Relationship: ${patient.emergencyContact.relation}</div>
            <div style="font-size: 0.875rem; font-family: var(--font-mono); font-weight: 600; color: var(--primary-green);">
              📞 ${patient.emergencyContact.phone}
            </div>
          </div>

          <div style="background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); border-radius: var(--radius-btn); padding: 1rem;">
            <div style="font-weight: 700; color: var(--color-danger); font-size: 0.95rem;">Severe Allergy Notice</div>
            <div style="font-size: 0.8125rem; color: #7F1D1D; margin: 0.2rem 0 0.5rem 0;">
              Penicillin (Severe Anaphylaxis Risk). Beta-lactams contraindicated.
            </div>
            <span class="badge badge-emergency">Broadcast to Emergency Responders</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function attachPatientProfileEvents(container) {
  const btnQr = container.querySelector('#btn-profile-qr');
  if (btnQr) {
    btnQr.addEventListener('click', () => {
      store.openModal('qrCode');
    });
  }
}
