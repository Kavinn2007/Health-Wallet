import { store } from '../state/store.js';

export function renderHeader(state) {
  const currentUser = state.currentUser;
  if (!currentUser) return '';

  const role = currentUser.role || 'patient';
  const doctor = state.currentDoctor;
  const patient = state.currentPatient;

  let displayName = currentUser.full_name;
  let subInfo = currentUser.organization || '';

  if (role === 'doctor' && doctor) {
    displayName = doctor.full_name;
    subInfo = `${doctor.specialization} • ${doctor.organization}`;
  } else if (role === 'patient' && patient) {
    displayName = patient.full_name;
    subInfo = `ID: ${patient.health_wallet_id}`;
  } else if (role === 'record_keeper') {
    displayName = currentUser.full_name || currentUser.name;
    subInfo = currentUser.record_keeper_id ? `Keeper ID: ${currentUser.record_keeper_id}` : (currentUser.organization || 'Institutional Registry');
  } else if (role === 'pharmacist' || role === 'pharmacy') {
    displayName = currentUser.full_name || currentUser.name;
    subInfo = currentUser.pharmacy_id ? `Pharmacy ID: ${currentUser.pharmacy_id}` : (currentUser.organization || 'Dispensing Center');
  } else if (role === 'lab') {
    displayName = currentUser.full_name || currentUser.name;
    subInfo = currentUser.lab_id ? `Lab ID: ${currentUser.lab_id}` : (currentUser.organization || 'Diagnostic Lab');
  }

  const roleTitles = {
    doctor: 'Clinical Doctor Portal',
    patient: 'Patient Health Portal',
    lab: 'Diagnostic Laboratory Portal',
    pharmacy: 'Prescription Dispensing Portal',
    pharmacist: 'Prescription Dispensing Portal',
    record_keeper: 'Institutional Record Keeper Portal',
    hospital: 'Hospital Health Portal',
    emergency: 'Emergency Services Portal'
  };

  return `
    <header class="app-header" style="background: var(--bg-card); border-bottom: 1px solid var(--border-color);">
      <div class="header-inner" style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0.85rem 1.5rem;">
        <!-- Left: Brand / Portal Context -->
        <div class="header-left" style="display: flex; align-items: center; gap: 1rem;">
          <div>
            <div style="font-size: 0.75rem; font-weight: 800; color: var(--primary-green); text-transform: uppercase; letter-spacing: 0.05em;">
              HEALTH WALLET
            </div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">
              ${roleTitles[role] || 'Digital Health Platform'}
            </div>
          </div>
        </div>

        <!-- Right: User Credentials & Logout -->
        <div class="header-right" style="display: flex; align-items: center; gap: 1.25rem;">
          <div style="text-align: right;">
            <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary);">
              ${displayName}
            </div>
            <div style="font-size: 0.8125rem; color: var(--text-secondary); font-family: ${role === 'patient' ? 'var(--font-mono)' : 'var(--font-sans)'};">
              ${subInfo}
            </div>
          </div>

          <button 
            class="btn btn-secondary btn-sm" 
            id="btn-header-logout" 
            title="Sign out of Health Wallet"
            style="padding: 0.5rem 1rem; font-weight: 700; border: 1px solid var(--border-color); border-radius: var(--radius-btn); background: var(--bg-secondary); cursor: pointer;"
          >
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

export function attachHeaderEvents(container) {
  const btnLogout = container.querySelector('#btn-header-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      store.logout();
    });
  }
}
