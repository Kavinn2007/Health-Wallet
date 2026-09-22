import { store } from '../state/store.js';

const ROLES = [
  { id: 'doctor', label: 'Doctor', code: 'DOCTOR' },
  { id: 'patient', label: 'Patient', code: 'PATIENT' },
  { id: 'pharmacist', label: 'Pharmacist', code: 'PHARMACIST' },
  { id: 'lab', label: 'Lab', code: 'LAB' },
  { id: 'record_keeper', label: 'Record Keeper', code: 'RECORD_KEEPER' }
];

export function renderLoginView(state) {
  const selectedRole = state.selectedLoginRole || 'doctor';
  const activeRoleObj = ROLES.find(r => r.id === selectedRole) || ROLES[0];
  const errorMsg = state.loginError || '';

  return `
    <div class="login-viewport-wrapper" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-canvas); padding: 1.5rem;">
      <div class="login-center-container" style="width: 100%; max-width: 480px;">
        
        <!-- Brand Header -->
        <div class="login-brand-header" style="text-align: center; margin-bottom: 1.75rem;">
          <h1 class="login-brand-title" style="font-size: 1.85rem; font-weight: 800; color: var(--primary-green); letter-spacing: -0.02em; margin: 0;">
            HEALTH WALLET
          </h1>
          <p class="login-brand-subtitle" style="font-size: 0.95rem; font-weight: 500; color: var(--text-secondary); margin-top: 0.35rem;">
            Unified National Digital Health Platform
          </p>
        </div>

        <!-- Master Login Card -->
        <div class="card login-card-surface" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-card); padding: 2rem; box-shadow: var(--shadow-card);">
          
          <!-- Role Selection Header -->
          <div style="margin-bottom: 1.5rem;">
            <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem;">
              Select Account Type:
            </div>
            
            <div class="role-selector-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.35rem;">
              ${ROLES.map(role => {
                const isSelected = selectedRole === role.id;
                return `
                  <button 
                    type="button" 
                    class="btn-role-tab ${isSelected ? 'active' : ''}" 
                    data-role="${role.id}"
                    style="padding: 0.6rem 0.25rem; font-size: 0.8125rem; font-weight: ${isSelected ? '800' : '600'}; border-radius: var(--radius-input); border: 1px solid ${isSelected ? 'var(--primary-green)' : 'var(--border-color)'}; background: ${isSelected ? 'var(--primary-green)' : 'var(--bg-secondary)'}; color: ${isSelected ? '#ffffff' : 'var(--text-primary)'}; cursor: pointer; text-align: center; transition: all 0.15s ease;"
                  >
                    ${role.label}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Active Role Indicator -->
          <div style="background: var(--light-green); border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 0.65rem 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.8125rem;">
            <span style="color: var(--dark-green); font-weight: 700;">Role:</span>
            <span style="font-weight: 800; color: var(--dark-green); text-transform: uppercase; letter-spacing: 0.04em;">
              ${activeRoleObj.label} Portal Access
            </span>
          </div>

          <!-- Error Alert -->
          <div id="login-error-alert" style="${errorMsg ? 'display: block;' : 'display: none;'} margin-bottom: 1.25rem; padding: 0.75rem 1rem; background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); color: var(--color-danger); border-radius: var(--radius-input); font-size: 0.875rem; font-weight: 600; text-align: center; line-height: 1.4;">
            ${errorMsg}
          </div>

          <!-- Login Form -->
          <form id="form-health-wallet-login" class="login-form-body" style="display: flex; flex-direction: column; gap: 1.25rem;">
            
            <div class="login-field-group">
              <label for="input-login-id" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.4rem;">
                Username
              </label>
              <div class="login-input-wrap">
                <input 
                  type="text" 
                  id="input-login-id" 
                  name="username" 
                  placeholder="Enter ${activeRoleObj.label.toLowerCase()} username" 
                  required 
                  autocomplete="username"
                  style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); background: var(--bg-card); color: var(--text-primary); font-size: 0.95rem; outline: none; transition: border-color 0.15s ease;"
                />
              </div>
            </div>

            <div class="login-field-group">
              <label for="input-login-password" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.4rem;">
                Password
              </label>
              <div class="login-input-wrap">
                <input 
                  type="password" 
                  id="input-login-password" 
                  name="password" 
                  placeholder="Enter password" 
                  required 
                  autocomplete="current-password"
                  style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); background: var(--bg-card); color: var(--text-primary); font-size: 0.95rem; outline: none; transition: border-color 0.15s ease;"
                />
              </div>
            </div>

            <button 
              type="submit" 
              class="btn btn-primary btn-login-submit" 
              id="btn-login-submit"
              style="width: 100%; padding: 0.85rem; font-size: 1rem; font-weight: 700; border-radius: var(--radius-btn); background: var(--primary-green); color: #ffffff; border: none; cursor: pointer; transition: background 0.15s ease; margin-top: 0.25rem;"
            >
              <span>Login as ${activeRoleObj.label}</span>
            </button>
          </form>

          <!-- New User / Activate Account Option -->
          <div class="login-card-footer" style="margin-top: 1.75rem; text-align: center; font-size: 0.9rem; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
            <span>Need an account?</span>
            <button 
              type="button" 
              class="btn-text-link" 
              id="btn-open-activation"
              style="background: none; border: none; color: var(--primary-green); font-weight: 800; cursor: pointer; text-decoration: underline; font-size: 0.95rem; padding: 0.25rem 0.5rem;"
            >
              New User / Activate Account
            </button>
          </div>

        </div>
      </div>
    </div>
  `;
}

export function attachLoginEvents(container) {
  // Role Selector Switcher
  const roleButtons = container.querySelectorAll('.btn-role-tab');
  roleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.getAttribute('data-role');
      if (role) {
        store.setSelectedLoginRole(role);
      }
    });
  });

  // Login Form Submission
  const form = container.querySelector('#form-health-wallet-login');
  const inputId = container.querySelector('#input-login-id');
  const inputPass = container.querySelector('#input-login-password');
  const btnSubmit = container.querySelector('#btn-login-submit');
  const errorAlert = container.querySelector('#login-error-alert');

  if (form && inputId && inputPass) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = inputId.value.trim();
      const password = inputPass.value;
      const state = store.getState();
      const selectedRole = state.selectedLoginRole || 'doctor';

      if (errorAlert) {
        errorAlert.style.display = 'none';
        errorAlert.textContent = '';
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span>Verifying Credentials...</span>';
      }

      const success = await store.login(username, password, selectedRole);

      if (!success) {
        const latestState = store.getState();
        if (errorAlert) {
          errorAlert.textContent = latestState.loginError || 'Invalid username or password.';
          errorAlert.style.display = 'block';
        }
      }

      if (btnSubmit) {
        btnSubmit.disabled = false;
        const activeRoleObj = ROLES.find(r => r.id === selectedRole) || ROLES[0];
        btnSubmit.innerHTML = `<span>Login as ${activeRoleObj.label}</span>`;
      }
    });
  }

  // Open "New User / Activate Account" modal
  const btnActivation = container.querySelector('#btn-open-activation');
  if (btnActivation) {
    btnActivation.addEventListener('click', () => {
      const state = store.getState();
      const currentRole = state.selectedLoginRole || 'doctor';
      store.openActivationModal(currentRole);
    });
  }
}
