import { store } from '../state/store.js';

export function renderPharmacyPortalView(state) {
  const patient = state.searchedPatient;
  const isSearched = state.isPatientSearched && patient;
  const prescriptions = state.patientPrescriptions || [];
  const records = state.patientRecords || [];
  const searchError = state.searchError;
  const isSearching = state.isSearching;
  const currentUser = state.currentUser;

  const latestRecord = records.length > 0 ? records[0] : null;

  return `
    <div class="pharmacy-portal-container" style="max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Pharmacy Profile Header -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.25rem 1.5rem; border-radius: var(--radius-card);">
        <div style="font-size: 0.75rem; font-weight: 800; color: var(--primary-green); text-transform: uppercase; letter-spacing: 0.05em;">
          Licensed Dispensing Pharmacy Console
        </div>
        <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary); margin-top: 0.25rem;">
          ${currentUser?.full_name || currentUser?.name || currentUser?.organization || 'Pharmacy Console'}
        </div>
        <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.15rem;">
          ${currentUser?.pharmacy_id ? `Pharmacy ID: ${currentUser.pharmacy_id} • ` : ''}${currentUser?.organization || 'Authorized Dispensing Facility'}
        </div>
      </div>

      <!-- Search Patient Card -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
        <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.35rem;">
          SEARCH PATIENT FOR PRESCRIPTION DISPENSING
        </div>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
          Enter patient's Health Wallet ID to view authorized digital prescriptions and record verified medication dispensing.
        </p>

        <form id="form-pharmacy-search-patient" style="display: flex; gap: 0.75rem; align-items: stretch; flex-wrap: wrap;">
          <input 
            type="text" 
            id="input-pharmacy-search-hwid" 
            placeholder="e.g. HW-IN-2026-XXXX-XXXX" 
            value="${state.searchedPatientId || ''}"
            required
            style="flex: 1; min-width: 280px; padding: 0.75rem 1rem; font-size: 0.95rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); background: var(--bg-card); font-family: var(--font-mono); font-weight: 600;"
          />
          <button 
            type="submit" 
            class="btn btn-primary" 
            id="btn-pharmacy-search-submit"
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
        <!-- Patient Banner (Only Medication-Related Information) -->
        <div class="card" style="background: var(--light-green); border: 1px solid var(--border-color); padding: 1.25rem 1.5rem; border-radius: var(--radius-card);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 800; color: var(--dark-green); letter-spacing: 0.05em; margin-bottom: 0.25rem;">
                PATIENT MEDICATION CONTEXT
              </div>
              <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary);">
                ${patient.full_name}
              </div>
              <div style="font-size: 0.875rem; color: var(--dark-green); font-family: var(--font-mono); font-weight: 700; margin-top: 0.2rem;">
                ${patient.health_wallet_id}
              </div>
            </div>

            <div>
              <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Relevant Allergy</div>
              <div style="font-size: 1rem; font-weight: 800; color: ${patient.allergies && patient.allergies.toLowerCase() !== 'none' ? 'var(--color-danger)' : 'var(--text-primary)'}; background: ${patient.allergies && patient.allergies.toLowerCase() !== 'none' ? 'var(--color-danger-bg)' : 'transparent'}; padding: 0.2rem 0.5rem; border-radius: var(--radius-btn); border: ${patient.allergies && patient.allergies.toLowerCase() !== 'none' ? '1px solid var(--color-danger-border)' : 'none'};">
                ${patient.allergies && patient.allergies.toLowerCase() !== 'none' ? `⚠️ ${patient.allergies}` : 'None reported'}
              </div>
            </div>
          </div>

          ${latestRecord && latestRecord.treatment ? `
            <div style="margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px solid rgba(20, 90, 58, 0.2); font-size: 0.875rem;">
              <strong style="color: var(--dark-green);">Latest Treatment Regimen:</strong>
              <span style="color: var(--text-primary); margin-left: 0.35rem;">${latestRecord.treatment}</span>
            </div>
          ` : ''}
        </div>

        <!-- Prescriptions List for Dispensing -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem;">
            <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
              AUTHORIZED DIGITAL PRESCRIPTIONS
            </h2>
            <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600;">
              ${prescriptions.length} item${prescriptions.length === 1 ? '' : 's'}
            </span>
          </div>

          ${prescriptions.length === 0 ? `
            <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color); font-size: 0.9rem;">
              No prescriptions recorded for this Health Wallet yet.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${prescriptions.map(p => {
                const isDispensed = p.status === 'Dispensed';
                const createdDate = p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                const doctorInfo = p.prescribing_doctor ? `Prescribing Doctor: ${p.prescribing_doctor} (${p.doctor_org || 'Clinic'})` : '';

                return `
                  <div style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1.25rem; background: var(--bg-card);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
                      <div>
                        <div style="font-size: 1.15rem; font-weight: 800; color: var(--dark-green);">
                          ${p.medicine}
                        </div>
                        <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.2rem;">
                          ${doctorInfo ? `${doctorInfo} • ` : ''}Date: ${createdDate}
                        </div>
                      </div>

                      <div>
                        <span style="padding: 0.3rem 0.75rem; border-radius: 9999px; font-size: 0.8125rem; font-weight: 700; background: ${isDispensed ? 'var(--light-green)' : 'var(--bg-secondary)'}; color: ${isDispensed ? 'var(--dark-green)' : 'var(--text-secondary)'}; border: 1px solid var(--border-color);">
                          ${isDispensed ? '✓ Dispensed' : 'Active / Ready to Dispense'}
                        </span>
                      </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; font-size: 0.875rem; margin-bottom: 1rem;">
                      <div>
                        <span style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Dosage:</span>
                        <div style="font-weight: 700; color: var(--text-primary);">${p.dosage || 'As directed'}</div>
                      </div>
                      <div>
                        <span style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Frequency:</span>
                        <div style="font-weight: 700; color: var(--text-primary);">${p.frequency || 'As prescribed'}</div>
                      </div>
                      <div>
                        <span style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Duration:</span>
                        <div style="font-weight: 700; color: var(--text-primary);">${p.duration || '30 days'}</div>
                      </div>
                    </div>

                    ${p.instructions ? `
                      <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 1rem; background: var(--bg-secondary); padding: 0.5rem 0.75rem; border-radius: var(--radius-btn);">
                        <strong>Instructions:</strong> ${p.instructions}
                      </div>
                    ` : ''}

                    <div style="display: flex; justify-content: flex-end;">
                      ${isDispensed ? `
                        <span style="font-size: 0.8125rem; color: var(--text-secondary);">
                          Dispensed by ${p.dispensed_by || 'MedPlus Pharmacy'} ${p.dispensed_at ? `on ${new Date(p.dispensed_at).toLocaleDateString()}` : ''}
                        </span>
                      ` : `
                        <button 
                          type="button" 
                          class="btn btn-primary btn-dispense-rx" 
                          data-rxid="${p.id}"
                          style="padding: 0.6rem 1.25rem; font-size: 0.875rem; font-weight: 700; background: var(--primary-green); color: #fff; border: none; border-radius: var(--radius-btn); cursor: pointer;"
                        >
                          Mark as Dispensed
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      ` : ''}
    </div>
  `;
}

export function attachPharmacyPortalEvents(container) {
  const searchForm = container.querySelector('#form-pharmacy-search-patient');
  const searchInput = container.querySelector('#input-pharmacy-search-hwid');

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hwid = searchInput.value.trim();
      await store.searchPatient(hwid);
    });
  }

  const dispenseBtns = container.querySelectorAll('.btn-dispense-rx');
  dispenseBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const rxId = btn.getAttribute('data-rxid');
      if (rxId) {
        btn.disabled = true;
        btn.textContent = 'Dispensing...';
        await store.dispenseMedication(rxId);
      }
    });
  });
}
