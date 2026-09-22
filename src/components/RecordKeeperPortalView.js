import { store } from '../state/store.js';

export function renderRecordKeeperPortalView(state) {
  const currentUser = state.currentUser;
  const staffName = currentUser?.full_name || currentUser?.name || 'Medical Records Officer';
  const staffId = currentUser?.record_keeper_id || currentUser?.login_id || 'RK-MRD-001';
  const organization = currentUser?.organization || 'Medical Records Department (MRD)';

  const patient = state.searchedPatient;
  const isSearched = state.isPatientSearched && patient;
  const records = state.patientRecords || [];
  const labs = state.patientLabReports || [];
  const prescriptions = state.patientPrescriptions || [];
  const searchError = state.searchError;
  const isSearching = state.isSearching;
  const logs = state.accessLogs || [];

  return `
    <div class="record-keeper-portal-container" style="max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem;">
      
      <!-- Record Keeper Staff Profile Header -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.25rem 1.5rem; border-radius: var(--radius-card);">
        <div style="font-size: 0.75rem; font-weight: 800; color: var(--primary-green); text-transform: uppercase; letter-spacing: 0.05em;">
          Institutional Registry & Medical Records Office
        </div>
        <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary); margin-top: 0.25rem;">
          ${staffName}
        </div>
        <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.15rem;">
          Staff ID: <strong>${staffId}</strong> • ${organization} • Master Health Index Registrar
        </div>
      </div>

      <!-- Patient Archive Search Card -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
        <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.35rem;">
          SEARCH PATIENT ARCHIVE
        </div>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
          Enter the patient's unique Health Wallet ID to retrieve longitudinal medical history, clinical documentation, laboratory telemetry, and audit trails.
        </p>

        <form id="form-rk-search-patient" style="display: flex; gap: 0.75rem; align-items: stretch; flex-wrap: wrap;">
          <input 
            type="text" 
            id="input-rk-search-hwid" 
            placeholder="e.g. HW-IN-2026-XXXX-XXXX" 
            value="${state.searchedPatientId || ''}"
            required
            style="flex: 1; min-width: 280px; padding: 0.75rem 1rem; font-size: 0.95rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); background: var(--bg-card); font-family: var(--font-mono); font-weight: 600;"
          />
          <button 
            type="submit" 
            class="btn btn-primary" 
            id="btn-rk-search-submit"
            ${isSearching ? 'disabled' : ''}
            style="padding: 0.75rem 1.75rem; font-weight: 700; background: var(--primary-green); color: #fff; border: none; border-radius: var(--radius-btn); cursor: pointer;"
          >
            ${isSearching ? 'Searching Archive...' : 'Search Record'}
          </button>
        </form>

        ${searchError ? `
          <div class="alert alert-error" style="margin-top: 1rem; padding: 0.75rem 1rem; background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); color: var(--color-danger); border-radius: var(--radius-input); font-size: 0.9rem; font-weight: 600;">
            ${searchError}
          </div>
        ` : ''}
      </div>

      <!-- When Patient is Found -->
      ${isSearched ? `
        <!-- Patient Identity Banner -->
        <div class="card" style="background: var(--light-green); border: 1px solid var(--border-color); padding: 1.25rem 1.5rem; border-radius: var(--radius-card);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid rgba(20, 90, 58, 0.2); padding-bottom: 1rem; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 800; color: var(--dark-green); letter-spacing: 0.05em; margin-bottom: 0.25rem;">
                VERIFIED ARCHIVE RECORD ✓
              </div>
              <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">
                ${patient.full_name || patient.name}
              </div>
              <div style="font-size: 0.9rem; color: var(--dark-green); font-family: var(--font-mono); font-weight: 700; margin-top: 0.2rem;">
                ${patient.health_wallet_id}
              </div>
            </div>

            <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;">
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Blood Group</div>
                <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary);">${patient.blood_group || patient.bloodGroup || 'Not specified'}</div>
              </div>
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Allergies</div>
                <div style="font-size: 1.05rem; font-weight: 800; color: ${patient.allergies && patient.allergies.toLowerCase() !== 'none' ? 'var(--color-danger)' : 'var(--text-primary)'};">
                  ${patient.allergies || 'None'}
                </div>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 2rem; font-size: 0.8125rem; color: var(--dark-green); flex-wrap: wrap;">
            <span>Longitudinal Consultations: <strong>${records.length}</strong></span>
            <span>Diagnostic Lab Records: <strong>${labs.length}</strong></span>
            <span>Prescriptions: <strong>${prescriptions.length}</strong></span>
          </div>
        </div>

        <!-- 1. Medical Records Section -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem;">
            <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
              CLINICAL CONSULTATIONS ARCHIVE
            </h2>
            <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600;">
              ${records.length} consultation record${records.length === 1 ? '' : 's'}
            </span>
          </div>

          ${records.length === 0 ? `
            <div style="padding: 2rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color); font-size: 0.875rem;">
              No consultation records on file for this patient.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${records.map(rec => {
                const docName = rec.doctor?.full_name || rec.doctor_name || 'Attending Physician';
                const docOrg = rec.doctor?.organization || rec.doctor_organization || 'Medical Center';
                const dateStr = rec.visit_date ? new Date(rec.visit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'N/A';

                return `
                  <div style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1rem 1.25rem; background: var(--bg-card);">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                      <div>
                        <span style="font-size: 0.8125rem; font-weight: 800; color: var(--primary-green); text-transform: uppercase;">
                          ${dateStr}
                        </span>
                        <span style="margin: 0 0.5rem; color: var(--text-muted);">•</span>
                        <span style="font-size: 0.875rem; font-weight: 700; color: var(--text-primary);">
                          Diagnosis: ${rec.diagnosis}
                        </span>
                      </div>
                      <div style="font-size: 0.8125rem; color: var(--text-secondary);">
                        Doctor: <strong style="color: var(--text-primary);">${docName}</strong> (${docOrg})
                      </div>
                    </div>

                    <div style="font-size: 0.85rem; display: grid; gap: 0.35rem;">
                      ${rec.treatment ? `<div><strong>Treatment:</strong> ${rec.treatment}</div>` : ''}
                      ${rec.medicine ? `<div><strong>Prescribed:</strong> ${rec.medicine} ${rec.dosage ? `(${rec.dosage})` : ''}</div>` : ''}
                      ${rec.follow_up_date ? `<div><strong>Follow-up:</strong> ${rec.follow_up_date}</div>` : ''}
                      ${rec.doctor_notes ? `<div style="font-size: 0.8125rem; color: var(--text-secondary);"><strong>Notes:</strong> ${rec.doctor_notes}</div>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- 2. Lab Records Section -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem;">
            <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
              LABORATORY TELEMETRY ARCHIVE
            </h2>
            <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600;">
              ${labs.length} lab report${labs.length === 1 ? '' : 's'}
            </span>
          </div>

          ${labs.length === 0 ? `
            <div style="padding: 2rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color); font-size: 0.875rem;">
              No laboratory reports archived for this patient.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${labs.map(lab => {
                const formattedDate = lab.test_date ? new Date(lab.test_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (lab.report_date || 'N/A');
                const hasFile = Boolean(lab.report_file_path);

                return `
                  <div style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1rem 1.25rem; background: var(--bg-card);">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                      <div>
                        <span style="font-size: 0.75rem; font-weight: 800; color: var(--primary-green); text-transform: uppercase;">
                          LAB RECORD
                        </span>
                        <span style="margin: 0 0.5rem; color: var(--text-muted);">•</span>
                        <span style="font-size: 1rem; font-weight: 800; color: var(--text-primary);">
                          ${lab.test_name}
                        </span>
                      </div>
                      <span style="padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; background: var(--light-green); color: var(--dark-green); border: 1px solid var(--border-color);">
                        ${lab.status || 'Verified Provider'}
                      </span>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.6rem; font-size: 0.85rem;">
                      <div><strong>Lab:</strong> ${lab.lab_name || 'Apex Diagnostics'}</div>
                      <div><strong>Date:</strong> ${formattedDate}</div>
                      <div><strong>Result:</strong> <span style="font-weight: 800; color: var(--dark-green);">${lab.result}</span></div>
                      ${lab.reference_range ? `<div><strong>Range:</strong> ${lab.reference_range}</div>` : ''}
                    </div>

                    ${hasFile ? `
                      <div style="display: flex; justify-content: flex-end; padding-top: 0.5rem; margin-top: 0.5rem; border-top: 1px dashed var(--border-color);">
                        <button 
                          type="button" 
                          class="btn btn-secondary btn-rk-view-lab-report" 
                          data-filepath="${lab.report_file_path}"
                          data-testname="${lab.test_name}"
                          style="font-size: 0.8125rem; font-weight: 700; padding: 0.35rem 0.85rem; border: 1px solid var(--primary-green); color: var(--primary-green); background: var(--bg-card); border-radius: var(--radius-btn); cursor: pointer;"
                        >
                          📄 View Document
                        </button>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- 3. Prescriptions Archive -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem;">
            <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
              ACTIVE & DISPENSED PRESCRIPTIONS
            </h2>
            <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600;">
              ${prescriptions.length} item${prescriptions.length === 1 ? '' : 's'}
            </span>
          </div>

          ${prescriptions.length === 0 ? `
            <div style="padding: 2rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color); font-size: 0.875rem;">
              No prescriptions recorded for this patient.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${prescriptions.map(p => `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 0.85rem 1.25rem; background: var(--bg-card); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; font-size: 0.875rem;">
                  <div>
                    <div style="font-weight: 800; color: var(--dark-green); font-size: 0.95rem;">${p.medicine}</div>
                    <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.15rem;">
                      ${p.dosage ? `Dosage: ${p.dosage}` : ''} ${p.frequency ? `• ${p.frequency}` : ''} ${p.duration ? `• ${p.duration}` : ''}
                    </div>
                  </div>
                  <div>
                    <span style="padding: 0.25rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; background: ${p.status === 'Dispensed' ? 'var(--light-green)' : 'var(--bg-secondary)'}; color: ${p.status === 'Dispensed' ? 'var(--dark-green)' : 'var(--text-secondary)'}; border: 1px solid var(--border-color);">
                      ${p.status || 'Prescribed'}
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

      ` : ''}

      <!-- 4. Global Institutional Audit Trail -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
            SYSTEM COMPLIANCE & ACCESS AUDIT TRAIL
          </h2>
          <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600;">
            ${logs.length} logged event${logs.length === 1 ? '' : 's'}
          </span>
        </div>

        ${logs.length === 0 ? `
          <div style="padding: 1.5rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color); font-size: 0.875rem;">
            No audit logs recorded yet.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.65rem;">
            ${logs.slice(0, 10).map(log => `
              <div style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 0.75rem 1rem; background: var(--bg-card); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; font-size: 0.85rem;">
                <div>
                  <div style="font-weight: 700; color: var(--text-primary);">${log.action}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.1rem;">
                    User: <strong>${log.user_name || log.user_id || 'System'}</strong> • Role: <strong>${log.role || 'USER'}</strong>
                    ${log.purpose ? `• Purpose: ${log.purpose}` : ''}
                  </div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
                  ${new Date(log.timestamp || log.created_at).toLocaleString()}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Document Viewer Modal -->
      <div id="modal-rk-report-viewer" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9999; align-items: center; justify-content: center; padding: 1.5rem;">
        <div style="background: var(--bg-card); border-radius: var(--radius-card); max-width: 800px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color); box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
          <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-primary);" id="modal-rk-report-title">
              Archived Document Preview
            </div>
            <button type="button" id="btn-close-rk-modal" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-secondary);">
              ✕
            </button>
          </div>
          <div id="modal-rk-report-content" style="flex: 1; padding: 1rem; overflow: auto; min-height: 350px; display: flex; align-items: center; justify-content: center;">
          </div>
        </div>
      </div>

    </div>
  `;
}

export function attachRecordKeeperPortalEvents(container) {
  const searchForm = container.querySelector('#form-rk-search-patient');
  const searchInput = container.querySelector('#input-rk-search-hwid');

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hwid = searchInput.value.trim();
      await store.searchPatient(hwid);
    });
  }

  // Document preview modal
  const modal = container.querySelector('#modal-rk-report-viewer');
  const modalTitle = container.querySelector('#modal-rk-report-title');
  const modalContent = container.querySelector('#modal-rk-report-content');
  const btnCloseModal = container.querySelector('#btn-close-rk-modal');

  if (btnCloseModal && modal) {
    btnCloseModal.addEventListener('click', () => {
      modal.style.display = 'none';
      if (modalContent) modalContent.innerHTML = '';
    });
  }

  const viewBtns = container.querySelectorAll('.btn-rk-view-lab-report');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filePath = btn.getAttribute('data-filepath');
      const testName = btn.getAttribute('data-testname');

      if (!filePath) return;

      if (modal && modalContent) {
        if (modalTitle) modalTitle.textContent = `Archived Diagnostic Document — ${testName || 'Document'}`;
        if (filePath.startsWith('data:image/') || filePath.match(/\.(png|jpg|jpeg)$/i)) {
          modalContent.innerHTML = `<img src="${filePath}" alt="Document" style="max-width: 100%; max-height: 70vh; border-radius: var(--radius-input); object-fit: contain;" />`;
        } else {
          modalContent.innerHTML = `
            <iframe src="${filePath}" style="width: 100%; height: 70vh; border: none; border-radius: var(--radius-input);" title="Document Preview"></iframe>
          `;
        }
        modal.style.display = 'flex';
      } else {
        window.open(filePath, '_blank');
      }
    });
  });
}
