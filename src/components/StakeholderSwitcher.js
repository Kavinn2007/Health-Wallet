import { Icons } from './icons.js';
import { store } from '../state/store.js';

export function renderStakeholderSwitcher(state) {
  const currentRole = state.activeRole;
  const currentDoctor = state.activeDoctor || 'doctorA';

  const demoRoles = [
    { id: 'patient', label: 'Patient (Aarav)', icon: Icons.user, active: currentRole === 'patient' },
    { id: 'doctorA', label: 'Doctor A (Dr. Priya)', icon: Icons.stethoscope, active: currentRole === 'doctor' && currentDoctor === 'doctorA' },
    { id: 'doctorB', label: 'Doctor B (Dr. Rahul)', icon: Icons.stethoscope, active: currentRole === 'doctor' && currentDoctor === 'doctorB' },
    { id: 'hospital', label: 'Hospital', icon: Icons.hospital, active: currentRole === 'hospital' },
    { id: 'lab', label: 'Diagnostic Lab', icon: Icons.flask, active: currentRole === 'lab' },
    { id: 'pharmacy', label: 'Pharmacy', icon: Icons.pill, active: currentRole === 'pharmacy' },
    { id: 'emergency', label: 'Emergency Override', icon: Icons.siren, active: currentRole === 'emergency' }
  ];

  return `
    <div class="sih-demo-bar-wrap">
      <div class="sih-demo-bar-inner">
        <div class="sih-demo-brand-tag">
          <span class="sih-pulse-dot"></span>
          <span style="font-weight: 700; color: var(--dark-green); letter-spacing: 0.02em;">SIH 2026 DEMO PERSPECTIVE:</span>
        </div>

        <div class="sih-role-buttons-row">
          ${demoRoles.map(r => `
            <button 
              class="sih-role-btn ${r.active ? 'active' : ''} ${r.id === 'emergency' ? 'emergency-btn' : ''}" 
              data-demo-role="${r.id}"
            >
              ${r.icon('w-3.5 h-3.5')}
              <span>${r.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

export function attachStakeholderEvents(container) {
  const buttons = container.querySelectorAll('.sih-role-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const demoRole = btn.getAttribute('data-demo-role');
      if (demoRole === 'emergency') {
        store.openModal('emergency');
      } else if (demoRole === 'doctorA') {
        store.setRole('doctorA');
      } else if (demoRole === 'doctorB') {
        store.setRole('doctorB');
      } else {
        store.setRole(demoRole);
      }
    });
  });
}
