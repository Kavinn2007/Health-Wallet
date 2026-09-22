import { store } from './state/store.js';
import { initDatabaseConfig } from './services/supabaseClient.js';
import { renderLoginView, attachLoginEvents } from './components/LoginView.js';
import { renderAccountActivationModal, attachAccountActivationEvents } from './components/AccountActivationModal.js';
import { renderHeader, attachHeaderEvents } from './components/Header.js';
import { renderSidebar, attachSidebarEvents } from './components/Sidebar.js';
import { renderPatientDashboardView, attachPatientDashboardEvents } from './components/PatientDashboardView.js';
import { renderDoctorPortalView, attachDoctorPortalEvents } from './components/DoctorPortalView.js';
import { renderLabPortalView, attachLabPortalEvents } from './components/LabPortalView.js';
import { renderPharmacyPortalView, attachPharmacyPortalEvents } from './components/PharmacyPortalView.js';
import { renderRecordKeeperPortalView, attachRecordKeeperPortalEvents } from './components/RecordKeeperPortalView.js';
import { renderNotificationToasts, attachNotificationEvents } from './components/NotificationToast.js';

function renderAccessHistoryView(state) {
  const logs = state.accessLogs || [];
  return `
    <div class="card" style="max-width: 900px; margin: 0 auto; background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem;">
        <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
          Audit Trail & Access Log History
        </h2>
        <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600;">
          ${logs.length} logged event${logs.length === 1 ? '' : 's'}
        </span>
      </div>

      ${logs.length === 0 ? `
        <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color);">
          <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">
            No audit logs recorded yet.
          </div>
          <div style="font-size: 0.8125rem;">
            Clinical and administrative accesses will be logged transparently here.
          </div>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${logs.map(log => {
            const time = new Date(log.timestamp || log.created_at).toLocaleString();
            return `
              <div style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1rem; background: var(--bg-card); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary);">
                    ${log.action}
                  </div>
                  <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.2rem;">
                    User: <strong>${log.user_name || log.user_id || 'System'}</strong> • Role: <strong>${log.role || log.accessor_role || 'user'}</strong> 
                    ${log.patient_hw_id ? `• Patient: <span style="font-family: var(--font-mono); font-weight: 700;">${log.patient_hw_id}</span>` : ''}
                    ${log.purpose ? `• Purpose: ${log.purpose}` : ''}
                  </div>
                  ${log.details ? `<div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.15rem;">${log.details}</div>` : ''}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
                  ${time}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

function renderApp() {
  const root = document.getElementById('root');
  if (!root) return;

  const state = store.getState();
  const currentUser = state.currentUser;

  // 1. Unauthenticated State: Render Login Page strictly per prompt
  if (!currentUser) {
    root.innerHTML = `
      ${renderLoginView(state)}
      ${renderAccountActivationModal(state)}
      ${renderNotificationToasts(state)}
    `;

    attachLoginEvents(root);
    attachAccountActivationEvents(root);
    attachNotificationEvents(root);
    return;
  }

  // 2. Authenticated State: Role-Based Portal
  const role = currentUser.role || 'patient';
  const activeNav = state.activeNav || 'dashboard';

  let mainContentHtml = '';

  if (activeNav === 'access-history') {
    mainContentHtml = renderAccessHistoryView(state);
  } else if (role === 'doctor') {
    mainContentHtml = renderDoctorPortalView(state);
  } else if (role === 'lab') {
    mainContentHtml = renderLabPortalView(state);
  } else if (role === 'pharmacy' || role === 'pharmacist') {
    mainContentHtml = renderPharmacyPortalView(state);
  } else if (role === 'record_keeper') {
    mainContentHtml = renderRecordKeeperPortalView(state);
  } else {
    // Default: Patient portal
    mainContentHtml = renderPatientDashboardView(state);
  }

  root.innerHTML = `
    <div class="app-layout" style="display: flex; min-height: 100vh; background: var(--bg-canvas);">
      ${renderSidebar(state)}

      <div class="app-main-viewport" style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
        ${renderHeader(state)}

        <main class="app-content-area" style="flex: 1; padding: 1.5rem; overflow-y: auto;">
          ${mainContentHtml}
        </main>
      </div>
    </div>

    ${renderNotificationToasts(state)}
  `;

  // Attach event handlers based on active view
  attachSidebarEvents(root);
  attachHeaderEvents(root);

  if (activeNav !== 'access-history') {
    if (role === 'doctor') {
      attachDoctorPortalEvents(root);
    } else if (role === 'lab') {
      attachLabPortalEvents(root);
    } else if (role === 'pharmacy' || role === 'pharmacist') {
      attachPharmacyPortalEvents(root);
    } else if (role === 'record_keeper') {
      attachRecordKeeperPortalEvents(root);
    } else {
      attachPatientDashboardEvents(root);
    }
  }

  attachNotificationEvents(root);
}

// Global reference for console debugging
window.__healthWalletStore = store;

document.addEventListener('DOMContentLoaded', async () => {
  await initDatabaseConfig();
  renderApp();
  store.subscribe(() => {
    renderApp();
  });
});
