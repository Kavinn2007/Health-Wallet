import { store } from '../state/store.js';

export function renderLabPortalView(state) {
  const patient = state.searchedPatient;
  const isSearched = state.isPatientSearched && patient;
  const labs = state.patientLabReports || [];
  const searchError = state.searchError;
  const isSearching = state.isSearching;
  const currentUser = state.currentUser;

  return `
    <div class="lab-portal-container" style="max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Lab Profile Header -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.25rem 1.5rem; border-radius: var(--radius-card);">
        <div style="font-size: 0.75rem; font-weight: 800; color: var(--primary-green); text-transform: uppercase; letter-spacing: 0.05em;">
          Diagnostic Laboratory Console
        </div>
        <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary); margin-top: 0.25rem;">
          ${currentUser?.full_name || currentUser?.name || currentUser?.organization || 'Diagnostic Laboratory'}
        </div>
        <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.15rem;">
          ${currentUser?.lab_id ? `Lab ID: ${currentUser.lab_id} • ` : ''}${currentUser?.organization || 'Certified Telemetry & Diagnostics Center'}
        </div>
      </div>

      <!-- Search Patient Card -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
        <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.35rem;">
          SEARCH PATIENT FOR DIAGNOSTIC REPORT
        </div>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
          Enter the patient's unique Health Wallet ID to transmit authenticated diagnostic telemetry and lab results.
        </p>

        <form id="form-lab-search-patient" style="display: flex; gap: 0.75rem; align-items: stretch; flex-wrap: wrap;">
          <input 
            type="text" 
            id="input-lab-search-hwid" 
            placeholder="e.g. HW-IN-2026-XXXX-XXXX" 
            value="${state.searchedPatientId || ''}"
            required
            style="flex: 1; min-width: 280px; padding: 0.75rem 1rem; font-size: 0.95rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); background: var(--bg-card); font-family: var(--font-mono); font-weight: 600;"
          />
          <button 
            type="submit" 
            class="btn btn-primary" 
            id="btn-lab-search-submit"
            ${isSearching ? 'disabled' : ''}
            style="padding: 0.75rem 1.75rem; font-weight: 700; background: var(--primary-green); color: #fff; border: none; border-radius: var(--radius-btn); cursor: pointer;"
          >
            ${isSearching ? 'Searching...' : 'Search Patient'}
          </button>
        </form>

        ${searchError ? `
          <div class="alert alert-error" style="margin-top: 1rem; padding: 0.75rem 1rem; background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); color: var(--color-danger); border-radius: var(--radius-input); font-size: 0.9rem; font-weight: 600;">
            ${searchError}
          </div>
        ` : ''}
      </div>

      ${isSearched ? `
        <!-- Patient Banner -->
        <div class="card" style="background: var(--light-green); border: 1px solid var(--border-color); padding: 1.25rem 1.5rem; border-radius: var(--radius-card);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 800; color: var(--dark-green); letter-spacing: 0.05em; margin-bottom: 0.25rem;">
                ACTIVE PATIENT
              </div>
              <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary);">
                ${patient.full_name}
              </div>
              <div style="font-size: 0.875rem; color: var(--dark-green); font-family: var(--font-mono); font-weight: 700; margin-top: 0.2rem;">
                ${patient.health_wallet_id}
              </div>
            </div>

            <div style="display: flex; gap: 1.5rem; align-items: center;">
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Blood Group</div>
                <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary);">${patient.blood_group || 'Not specified'}</div>
              </div>
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Allergies</div>
                <div style="font-size: 1.05rem; font-weight: 800; color: ${patient.allergies && patient.allergies.toLowerCase() !== 'none' ? 'var(--color-danger)' : 'var(--text-primary)'};">
                  ${patient.allergies || 'None'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Lab Report Card -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
          <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0 0 1rem 0;">
            + Add Lab Report
          </h2>

          <form id="form-add-lab-report" style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label for="input-lab-test-name" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                  Test Name *
                </label>
                <input 
                  type="text" 
                  id="input-lab-test-name" 
                  placeholder="e.g. HbA1c, Complete Blood Count, Lipid Profile" 
                  required 
                  style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                />
              </div>

              <div>
                <label for="input-lab-test-date" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                  Test Date *
                </label>
                <input 
                  type="date" 
                  id="input-lab-test-date" 
                  value="${new Date().toISOString().split('T')[0]}" 
                  required 
                  style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label for="input-lab-result" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                  Result *
                </label>
                <input 
                  type="text" 
                  id="input-lab-result" 
                  placeholder="e.g. 6.2%" 
                  required 
                  style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                />
              </div>

              <div>
                <label for="input-lab-ref-range" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                  Reference Range
                </label>
                <input 
                  type="text" 
                  id="input-lab-ref-range" 
                  placeholder="e.g. < 5.7% Normal, 5.7-6.4% Prediabetes" 
                  style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                />
              </div>
            </div>

            <div>
              <label for="input-lab-notes" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                Notes / Clinical Impression
              </label>
              <textarea 
                id="input-lab-notes" 
                rows="2" 
                placeholder="Diagnostic telemetry notes..." 
                style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
              ></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <button 
                type="submit" 
                class="btn btn-primary" 
                id="btn-save-lab-submit"
                style="padding: 0.75rem 1.75rem; font-weight: 700; background: var(--primary-green); color: #fff; border: none; border-radius: var(--radius-btn); cursor: pointer;"
              >
                Save Lab Report
              </button>
            </div>
          </form>
        </div>

        <!-- Saved Lab Reports List -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
          <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0 0 1rem 0;">
            SAVED LAB REPORTS
          </h2>

          ${labs.length === 0 ? `
            <div style="padding: 2rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color); font-size: 0.875rem;">
              No lab reports yet for this patient.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${labs.map(l => `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1rem 1.25rem; background: var(--bg-card); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                  <div>
                    <div style="font-size: 1rem; font-weight: 800; color: var(--text-primary);">
                      ${l.test_name}
                    </div>
                    <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.2rem;">
                      Date: <strong>${l.test_date}</strong> ${l.reference_range ? `• Reference: ${l.reference_range}` : ''}
                    </div>
                    ${l.notes ? `<div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.15rem;">${l.notes}</div>` : ''}
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 1.35rem; font-weight: 800; color: var(--dark-green);">
                      ${l.result}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      ` : ''}
    </div>
  `;
}

export function attachLabPortalEvents(container) {
  const searchForm = container.querySelector('#form-lab-search-patient');
  const searchInput = container.querySelector('#input-lab-search-hwid');

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hwid = searchInput.value.trim();
      await store.searchPatient(hwid);
    });
  }

  const labForm = container.querySelector('#form-add-lab-report');
  if (labForm) {
    labForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const testName = container.querySelector('#input-lab-test-name')?.value;
      const testDate = container.querySelector('#input-lab-test-date')?.value;
      const result = container.querySelector('#input-lab-result')?.value;
      const referenceRange = container.querySelector('#input-lab-ref-range')?.value;
      const notes = container.querySelector('#input-lab-notes')?.value;

      await store.addLabReport({
        testName,
        testDate,
        result,
        referenceRange,
        notes
      });
    });
  }
}
