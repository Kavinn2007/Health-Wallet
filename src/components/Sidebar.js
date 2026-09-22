import { store } from '../state/store.js';

export function renderSidebar(state) {
  const currentUser = state.currentUser;
  if (!currentUser) return '';

  const activeRole = currentUser.role || 'patient';
  const activeNav = state.activeNav || 'dashboard';

  // Role-specific compact navigation
  const navConfig = {
    doctor: [
      { id: 'dashboard', label: 'Doctor Dashboard' },
      { id: 'access-history', label: 'Audit Trail' }
    ],
    patient: [
      { id: 'dashboard', label: 'Health Dashboard' },
      { id: 'access-history', label: 'Access History' }
    ],
    lab: [
      { id: 'dashboard', label: 'Diagnostic Console' },
      { id: 'access-history', label: 'Telemetry Logs' }
    ],
    pharmacy: [
      { id: 'dashboard', label: 'Dispensing Console' },
      { id: 'access-history', label: 'Dispense History' }
    ],
    pharmacist: [
      { id: 'dashboard', label: 'Dispensing Console' },
      { id: 'access-history', label: 'Dispense History' }
    ],
    record_keeper: [
      { id: 'dashboard', label: 'Registry Archive' },
      { id: 'access-history', label: 'Compliance Audit Trail' }
    ],
    hospital: [
      { id: 'dashboard', label: 'Hospital Console' },
      { id: 'access-history', label: 'Access Logs' }
    ],
    emergency: [
      { id: 'dashboard', label: 'Emergency Console' },
      { id: 'access-history', label: 'Access Logs' }
    ]
  };

  const navItems = navConfig[activeRole] || navConfig.patient;

  return `
    <aside class="app-sidebar" id="app-sidebar" style="width: 230px; background: var(--bg-card); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between; padding: 1.25rem 1rem;">
      <div>
        <!-- Brand Header -->
        <div style="padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.25rem;">
          <div style="font-size: 1.15rem; font-weight: 800; color: var(--primary-green); letter-spacing: -0.01em;">
            Health Wallet
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem; text-transform: uppercase; font-weight: 700;">
            ${(activeRole === 'record_keeper' ? 'RECORD KEEPER' : activeRole).toUpperCase()} PORTAL
          </div>
        </div>

        <!-- Navigation Links -->
        <nav>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem;">
            ${navItems.map(item => `
              <li>
                <button 
                  class="nav-item-btn ${activeNav === item.id ? 'active' : ''}" 
                  data-nav="${item.id}"
                  style="width: 100%; text-align: left; padding: 0.7rem 0.85rem; border-radius: var(--radius-btn); border: none; background: ${activeNav === item.id ? 'var(--light-green)' : 'transparent'}; color: ${activeNav === item.id ? 'var(--dark-green)' : 'var(--text-primary)'}; font-weight: ${activeNav === item.id ? '800' : '600'}; font-size: 0.875rem; cursor: pointer; transition: background 0.15s ease;"
                >
                  ${item.label}
                </button>
              </li>
            `).join('')}
          </ul>
        </nav>
      </div>

      <!-- Logout Action -->
      <div style="padding-top: 1rem; border-top: 1px solid var(--border-color);">
        <button 
          class="btn btn-secondary btn-sm" 
          id="btn-sidebar-logout" 
          style="width: 100%; justify-content: center; padding: 0.7rem; font-weight: 700; border: 1px solid var(--border-color); border-radius: var(--radius-btn); background: var(--bg-secondary); cursor: pointer; color: var(--text-primary);"
        >
          <span>Logout</span>
        </button>
      </div>
    </aside>
  `;
}

export function attachSidebarEvents(container) {
  const navBtns = container.querySelectorAll('.nav-item-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const navId = btn.getAttribute('data-nav');
      if (navId) {
        store.setActiveNav(navId);
      }
    });
  });

  const btnLogout = container.querySelector('#btn-sidebar-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      store.logout();
    });
  }
}
