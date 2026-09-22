import { store } from '../state/store.js';
import { INDIAN_STATES, generateHealthWalletId } from '../services/patientService.js';

const ROLES = [
  { id: 'doctor', label: 'Doctor', code: 'DOCTOR' },
  { id: 'patient', label: 'Patient', code: 'PATIENT' },
  { id: 'pharmacist', label: 'Pharmacist', code: 'PHARMACIST' },
  { id: 'lab', label: 'Lab', code: 'LAB' },
  { id: 'record_keeper', label: 'Record Keeper', code: 'RECORD_KEEPER' }
];

export function renderAccountActivationModal(state) {
  if (!state.isActivationModalOpen) return '';

  const activeRole = state.activationRole || 'doctor';
  const successData = state.activationSuccessData;
  const activeRoleObj = ROLES.find(r => r.id === activeRole) || ROLES[0];

  return `
    <div class="modal-backdrop" id="modal-backdrop-activation" style="position: fixed; inset: 0; background: rgba(23, 35, 28, 0.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1.5rem; overflow-y: auto;">
      <div class="modal-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-card); max-width: 540px; width: 100%; box-shadow: var(--shadow-modal); overflow: hidden; margin: auto;">
        
        <!-- Modal Header -->
        <div class="modal-header" style="background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary); margin: 0;">
              ${successData ? 'Account Successfully Created' : 'New User / Activate Account'}
            </h3>
            <p style="font-size: 0.8125rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">
              ${successData ? 'Your credentials have been securely stored in the central medical database' : 'Register your institutional profile or activate your Health Wallet'}
            </p>
          </div>
          <button class="btn btn-ghost btn-sm" id="btn-close-activation" style="font-size: 1.25rem; line-height: 1; padding: 0.25rem 0.5rem; background: none; border: none; cursor: pointer; color: var(--text-secondary);">
            ✕
          </button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body" style="padding: 1.5rem;">
          ${successData ? `
            <!-- REGISTRATION SUCCESS SCREEN -->
            <div style="text-align: center; padding: 0.5rem 0;">
              <div style="width: 56px; height: 56px; background: var(--light-green); color: var(--primary-green); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin: 0 auto 1.25rem auto; font-weight: 800;">
                ✓
              </div>

              <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--primary-green); margin: 0 0 0.5rem 0;">
                ${successData.roleId === 'patient' || successData.role === 'PATIENT' ? 'Patient Account Created Successfully' : `${successData.role} Account Created`}
              </h2>

              <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
                Your account is saved permanently. You can now log in using your registered username and password.
              </p>

              <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1.25rem; text-align: left; margin-bottom: 1.5rem;">
                <div style="margin-bottom: 0.85rem; display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.6rem;">
                  <div>
                    <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Role</div>
                    <div style="font-size: 1rem; font-weight: 800; color: var(--dark-green); text-transform: uppercase;">${successData.role}</div>
                  </div>
                  <div>
                    <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Username</div>
                    <div style="font-size: 1rem; font-weight: 800; color: var(--text-primary); font-family: var(--font-mono);">${successData.username}</div>
                  </div>
                </div>

                <div style="margin-bottom: 0.85rem;">
                  <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Registered Name</div>
                  <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-top: 0.15rem;">${successData.name}</div>
                </div>

                ${successData.state ? `
                  <div style="margin-bottom: 0.85rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <div>
                      <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">State</div>
                      <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-top: 0.15rem;">${successData.state}</div>
                    </div>
                    ${successData.bloodGroup ? `
                      <div>
                        <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Blood Group</div>
                        <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-top: 0.15rem;">${successData.bloodGroup}</div>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}

                ${successData.healthWalletId ? `
                  <div style="background: var(--light-green); border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1.15rem 1rem; margin-top: 0.85rem; text-align: center;">
                    <div style="font-size: 0.75rem; font-weight: 800; color: var(--dark-green); text-transform: uppercase; letter-spacing: 0.05em;">
                      Your Health Wallet ID
                    </div>
                    <div style="font-size: 1.55rem; font-weight: 800; color: var(--primary-green); font-family: var(--font-mono); margin-top: 0.35rem; letter-spacing: 0.06em;">
                      ${successData.healthWalletId}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.4rem;">
                      This Health Wallet ID is automatically generated and is used to access your medical records.
                    </div>
                  </div>
                ` : ''}

                ${successData.entityId && !successData.healthWalletId ? `
                  <div>
                    <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Institutional ID</div>
                    <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); font-family: var(--font-mono); margin-top: 0.15rem;">
                      ${successData.entityId}
                    </div>
                  </div>
                ` : ''}
              </div>

              <button 
                type="button" 
                class="btn btn-primary" 
                id="btn-continue-to-login"
                data-role="${successData.roleId || 'doctor'}"
                data-username="${successData.username}"
                style="width: 100%; padding: 0.85rem; font-size: 1rem; font-weight: 700; background: var(--primary-green); color: #fff; border: none; border-radius: var(--radius-btn); cursor: pointer;"
              >
                <span>Proceed to Login</span>
              </button>
            </div>
          ` : `
            <!-- REGISTRATION FORM -->
            <div>
              <!-- 1. Select Role to Register -->
              <div style="margin-bottom: 1.5rem;">
                <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
                  Step 1: Select Your Role:
                </div>
                
                <div class="role-selector-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.35rem;">
                  ${ROLES.map(role => {
                    const isSelected = activeRole === role.id;
                    return `
                      <button 
                        type="button" 
                        class="btn-act-role-tab ${isSelected ? 'active' : ''}" 
                        data-role="${role.id}"
                        style="padding: 0.55rem 0.2rem; font-size: 0.8125rem; font-weight: ${isSelected ? '800' : '600'}; border-radius: var(--radius-input); border: 1px solid ${isSelected ? 'var(--primary-green)' : 'var(--border-color)'}; background: ${isSelected ? 'var(--primary-green)' : 'var(--bg-secondary)'}; color: ${isSelected ? '#ffffff' : 'var(--text-primary)'}; cursor: pointer; text-align: center; transition: all 0.15s ease;"
                      >
                        ${role.label}
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>

              <div id="activation-error-msg" style="display: none; margin-bottom: 1rem; padding: 0.6rem 0.85rem; background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); color: var(--color-danger); border-radius: var(--radius-input); font-size: 0.85rem; font-weight: 600;"></div>

              <!-- 2. Role-Specific Dynamic Registration Form -->
              <form id="form-register-account">
                <input type="hidden" id="reg-role-id" value="${activeRoleObj.id}" />

                ${activeRole === 'doctor' ? `
                  <!-- DOCTOR FIELDS -->
                  <div style="margin-bottom: 1rem;">
                    <label for="reg-doc-name" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Doctor Name *
                    </label>
                    <input 
                      type="text" 
                      id="reg-doc-name" 
                      placeholder="e.g. Dr. Sarah Johnson" 
                      required 
                      style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>

                  <div style="margin-bottom: 1rem;">
                    <label for="reg-doc-id" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Doctor ID / Medical Registration Number *
                    </label>
                    <input 
                      type="text" 
                      id="reg-doc-id" 
                      placeholder="e.g. DOC-94821 or MCI-2026-4401" 
                      required 
                      style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>
                ` : ''}

                ${activeRole === 'patient' ? `
                  <!-- PATIENT FIELDS -->
                  <div style="margin-bottom: 1rem;">
                    <label for="reg-patient-name" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Patient Name *
                    </label>
                    <input 
                      type="text" 
                      id="reg-patient-name" 
                      placeholder="Enter patient name" 
                      required 
                      style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                    <div>
                      <label for="reg-patient-mobile" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                        Mobile Number *
                      </label>
                      <input 
                        type="tel" 
                        id="reg-patient-mobile" 
                        placeholder="Enter mobile number" 
                        maxlength="10"
                        required 
                        style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                      />
                    </div>

                    <div>
                      <label for="reg-patient-aadhaar" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                        Aadhaar Number *
                      </label>
                      <input 
                        type="text" 
                        id="reg-patient-aadhaar" 
                        placeholder="Enter 12-digit Aadhaar number" 
                        maxlength="12"
                        required 
                        style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                      />
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                    <div>
                      <label for="reg-patient-blood-group" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                        Blood Group *
                      </label>
                      <select 
                        id="reg-patient-blood-group" 
                        required 
                        style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem; background: var(--bg-card); color: var(--text-primary);"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>

                    <div>
                      <label for="reg-patient-gender" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                        Gender *
                      </label>
                      <select 
                        id="reg-patient-gender" 
                        required 
                        style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem; background: var(--bg-card); color: var(--text-primary);"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div style="margin-bottom: 1.25rem;">
                    <label for="reg-patient-state" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      State *
                    </label>
                    <select 
                      id="reg-patient-state" 
                      required 
                      style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem; background: var(--bg-card); color: var(--text-primary);"
                    >
                      <option value="">Select State</option>
                      ${INDIAN_STATES.map(s => `
                        <option value="${s.code}" data-state="${s.name}">
                          ${s.name} — ${s.code}
                        </option>
                      `).join('')}
                    </select>
                  </div>
                ` : ''}

                ${activeRole === 'pharmacist' ? `
                  <!-- PHARMACIST FIELDS -->
                  <div style="margin-bottom: 1rem;">
                    <label for="reg-pharm-name" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Pharmacist Name *
                    </label>
                    <input 
                      type="text" 
                      id="reg-pharm-name" 
                      placeholder="e.g. Manoj Verma" 
                      required 
                      style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>

                  <div style="margin-bottom: 1rem;">
                    <label for="reg-pharm-id" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Pharmacy ID / Dispensing License *
                    </label>
                    <input 
                      type="text" 
                      id="reg-pharm-id" 
                      placeholder="e.g. PHARM-KA-8812" 
                      required 
                      style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>
                ` : ''}

                ${activeRole === 'lab' ? `
                  <!-- LAB FIELDS -->
                  <div style="margin-bottom: 1rem;">
                    <label for="reg-lab-name" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Lab / Staff Name *
                    </label>
                    <input 
                      type="text" 
                      id="reg-lab-name" 
                      placeholder="e.g. Apex Diagnostics Lab / Dr. Sunil Rao" 
                      required 
                      style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>

                  <div style="margin-bottom: 1rem;">
                    <label for="reg-lab-id" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Lab ID / NABL Accreditation ID *
                    </label>
                    <input 
                      type="text" 
                      id="reg-lab-id" 
                      placeholder="e.g. LAB-NABL-401" 
                      required 
                      style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>
                ` : ''}

                ${activeRole === 'record_keeper' ? `
                  <!-- RECORD KEEPER FIELDS -->
                  <div style="margin-bottom: 1rem;">
                    <label for="reg-rk-name" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Record Keeper Name *
                    </label>
                    <input 
                      type="text" 
                      id="reg-rk-name" 
                      placeholder="e.g. Pooja Hegde" 
                      required 
                      style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>

                  <div style="margin-bottom: 1rem;">
                    <label for="reg-rk-id" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Record Keeper ID / Staff ID *
                    </label>
                    <input 
                      type="text" 
                      id="reg-rk-id" 
                      placeholder="e.g. RK-MRD-201" 
                      required 
                      style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>
                ` : ''}

                <!-- COMMON CREDENTIALS FIELDS -->
                <div style="margin-bottom: 1rem;">
                  <label for="reg-username" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                    Username *
                  </label>
                  <input 
                    type="text" 
                    id="reg-username" 
                    placeholder="Create a unique username" 
                    required 
                    autocomplete="username"
                    style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem; font-family: var(--font-mono); font-weight: 600;"
                  />
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem;">
                  <div>
                    <label for="reg-pass" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Password *
                    </label>
                    <input 
                      type="password" 
                      id="reg-pass" 
                      placeholder="Create password" 
                      required 
                      autocomplete="new-password"
                      style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>
                  <div>
                    <label for="reg-pass-confirm" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Confirm Password *
                    </label>
                    <input 
                      type="password" 
                      id="reg-pass-confirm" 
                      placeholder="Confirm password" 
                      required 
                      autocomplete="new-password"
                      style="width: 100%; padding: 0.65rem 0.85rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  class="btn btn-primary" 
                  id="btn-submit-registration" 
                  style="width: 100%; padding: 0.85rem; font-size: 1rem; font-weight: 700; background: var(--primary-green); color: #fff; border: none; border-radius: var(--radius-btn); cursor: pointer;"
                >
                  <span>Create / Activate ${activeRole === 'patient' ? 'Patient' : activeRoleObj.label} Account</span>
                </button>
              </form>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

export function attachAccountActivationEvents(container) {
  const backdrop = container.querySelector('#modal-backdrop-activation');
  const btnClose = container.querySelector('#btn-close-activation');
  const form = container.querySelector('#form-register-account');
  const btnSubmit = container.querySelector('#btn-submit-registration');
  const btnContinue = container.querySelector('#btn-continue-to-login');
  const errorMsg = container.querySelector('#activation-error-msg');
  const btnGenHwid = container.querySelector('#btn-gen-hwid');

  const closeHandler = () => store.closeActivationModal();

  if (btnClose) btnClose.addEventListener('click', closeHandler);
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeHandler();
    });
  }

  // Switch role tabs in registration modal
  const roleButtons = container.querySelectorAll('.btn-act-role-tab');
  roleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.getAttribute('data-role');
      if (role) {
        store.setActivationRole(role);
      }
    });
  });

  // When user clicks "Proceed to Login" on success
  if (btnContinue) {
    btnContinue.addEventListener('click', () => {
      const roleId = btnContinue.getAttribute('data-role');
      const username = btnContinue.getAttribute('data-username');
      
      store.closeActivationModal();
      
      if (roleId) {
        store.setSelectedLoginRole(roleId);
      }
      
      const loginInput = document.querySelector('#input-login-id');
      const passInput = document.querySelector('#input-login-password');
      if (loginInput && username) {
        loginInput.value = username;
      }
      if (passInput) {
        passInput.focus();
      }
    });
  }

  // Handle form submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (errorMsg) {
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';
      }

      const state = store.getState();
      const role = state.activationRole || 'doctor';

      let name = '';
      let entityId = '';
      let healthWalletId = '';
      let patientExtra = {};

      if (role === 'doctor') {
        name = container.querySelector('#reg-doc-name')?.value || '';
        entityId = container.querySelector('#reg-doc-id')?.value || '';
      } else if (role === 'patient') {
        name = container.querySelector('#reg-patient-name')?.value || '';
        const mobile = (container.querySelector('#reg-patient-mobile')?.value || '').trim();
        const aadhaar = (container.querySelector('#reg-patient-aadhaar')?.value || '').replace(/\D/g, '');
        const bloodGroup = container.querySelector('#reg-patient-blood-group')?.value || '';
        const gender = container.querySelector('#reg-patient-gender')?.value || '';
        const curStateSelect = container.querySelector('#reg-patient-state');
        const stateCode = curStateSelect?.value || '';
        const stateName = curStateSelect?.selectedOptions?.[0]?.getAttribute('data-state') || curStateSelect?.selectedOptions?.[0]?.text?.split('—')?.[0]?.trim() || '';
        
        // For Patient: HW ID is never entered or displayed pre-submit; generated upon submission
        healthWalletId = null;
        entityId = null;

        // Strict Validation for Patient
        if (!name.trim()) {
          if (errorMsg) {
            errorMsg.textContent = 'Please enter patient name.';
            errorMsg.style.display = 'block';
          }
          return;
        }
        if (!mobile || !/^\d{10}$/.test(mobile)) {
          if (errorMsg) {
            errorMsg.textContent = 'Please enter a valid 10-digit Indian mobile number (numbers only).';
            errorMsg.style.display = 'block';
          }
          return;
        }
        if (!aadhaar || !/^\d{12}$/.test(aadhaar)) {
          if (errorMsg) {
            errorMsg.textContent = 'Please enter a valid 12-digit Aadhaar number (numbers only).';
            errorMsg.style.display = 'block';
          }
          return;
        }
        if (!bloodGroup) {
          if (errorMsg) {
            errorMsg.textContent = 'Please select a Blood Group.';
            errorMsg.style.display = 'block';
          }
          return;
        }
        if (!gender) {
          if (errorMsg) {
            errorMsg.textContent = 'Please select a Gender.';
            errorMsg.style.display = 'block';
          }
          return;
        }
        if (!stateCode) {
          if (errorMsg) {
            errorMsg.textContent = 'Please select a State.';
            errorMsg.style.display = 'block';
          }
          return;
        }

        patientExtra = {
          mobileNumber: mobile,
          phone: mobile,
          aadhaarNumber: aadhaar,
          bloodGroup,
          gender,
          state: stateName,
          stateCode
        };
      } else if (role === 'pharmacist') {
        name = container.querySelector('#reg-pharm-name')?.value || '';
        entityId = container.querySelector('#reg-pharm-id')?.value || '';
      } else if (role === 'lab') {
        name = container.querySelector('#reg-lab-name')?.value || '';
        entityId = container.querySelector('#reg-lab-id')?.value || '';
      } else if (role === 'record_keeper') {
        name = container.querySelector('#reg-rk-name')?.value || '';
        entityId = container.querySelector('#reg-rk-id')?.value || '';
      }

      const username = container.querySelector('#reg-username')?.value || '';
      const pass = container.querySelector('#reg-pass')?.value || '';
      const passConfirm = container.querySelector('#reg-pass-confirm')?.value || '';

      if (!name || !username || !pass) {
        if (errorMsg) {
          errorMsg.textContent = 'Please fill out all required fields.';
          errorMsg.style.display = 'block';
        }
        return;
      }

      if (pass !== passConfirm) {
        if (errorMsg) {
          errorMsg.textContent = 'Passwords do not match.';
          errorMsg.style.display = 'block';
        }
        return;
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = role === 'patient'
          ? '<span>Creating Patient Account & Generating Health Wallet ID...</span>'
          : '<span>Creating Account in Central Database...</span>';
      }

      try {
        await store.registerNewAccount({
          role,
          name,
          username,
          password: pass,
          doctorId: role === 'doctor' ? entityId : null,
          healthWalletId: null,
          pharmacyId: role === 'pharmacist' ? entityId : null,
          labId: role === 'lab' ? entityId : null,
          recordKeeperId: role === 'record_keeper' ? entityId : null,
          ...patientExtra
        });
      } catch (err) {
        if (errorMsg) {
          errorMsg.textContent = err.message || 'Account registration failed.';
          errorMsg.style.display = 'block';
        }
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = `<span>Create / Activate ${role === 'patient' ? 'Patient' : 'Account'}</span>`;
        }
      }
    });
  }
}
