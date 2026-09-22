import { store } from '../state/store.js';

export function renderPatientDashboardView(state) {
  const patient = state.currentPatient || {
    health_wallet_id: 'HW-IN-2026-PENDING',
    full_name: state.currentUser?.full_name || 'Patient',
    blood_group: 'Not specified',
    allergies: 'None'
  };

  const records = state.patientRecords || [];
  const labs = state.patientLabReports || [];
  const prescriptions = state.patientPrescriptions || [];
  const logs = state.accessLogs || [];

  return `
    <div class="patient-portal-container" style="max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem;">
      
      <!-- Patient Identity Header -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
        <div style="font-size: 0.75rem; font-weight: 800; color: var(--primary-green); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">
          Verified Health Wallet
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1.25rem; margin-bottom: 1.25rem;">
          <div>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary);">
              ${patient.full_name}
            </div>
            <div style="font-size: 1rem; color: var(--dark-green); font-family: var(--font-mono); font-weight: 800; margin-top: 0.25rem; letter-spacing: 0.03em;">
              ${patient.health_wallet_id}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
          <div style="background: var(--bg-secondary); padding: 0.85rem 1rem; border-radius: var(--radius-input); border: 1px solid var(--border-color);">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
              Blood Group
            </div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-top: 0.2rem;">
              ${patient.blood_group || 'Not specified'}
            </div>
          </div>

          <div style="background: var(--bg-secondary); padding: 0.85rem 1rem; border-radius: var(--radius-input); border: 1px solid var(--border-color);">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
              State & Region
            </div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-top: 0.2rem;">
              ${patient.state ? `${patient.state}${patient.state_code ? ` (${patient.state_code})` : ''}` : 'National Registry'}
            </div>
          </div>

          <div style="background: var(--bg-secondary); padding: 0.85rem 1rem; border-radius: var(--radius-input); border: 1px solid var(--border-color);">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
              Gender
            </div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-top: 0.2rem;">
              ${patient.gender || 'Not specified'}
            </div>
          </div>

          <div style="background: var(--bg-secondary); padding: 0.85rem 1rem; border-radius: var(--radius-input); border: 1px solid var(--border-color);">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
              Aadhaar (Protected)
            </div>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--dark-green); font-family: var(--font-mono); margin-top: 0.2rem;">
              ${patient.aadhaar_number && patient.aadhaar_number.length >= 4 ? `XXXX-XXXX-${patient.aadhaar_number.slice(-4)}` : 'Securely Linked'}
            </div>
          </div>
        </div>
      </div>

      <!-- Section 1: Medical Records -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
            MEDICAL RECORDS
          </h2>
          <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600;">
            ${records.length} saved record${records.length === 1 ? '' : 's'}
          </span>
        </div>

        ${records.length === 0 ? `
          <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color);">
            <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">
              No medical records yet.
            </div>
            <div style="font-size: 0.8125rem;">
              Consultation history and diagnoses documented by your attending doctors will appear here.
            </div>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${records.map(rec => {
              const docName = rec.doctor?.full_name || rec.doctor_name || 'Attending Physician';
              const docOrg = rec.doctor?.organization || rec.doctor_organization || 'Medical Center';
              const dateFormatted = rec.visit_date ? new Date(rec.visit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'N/A';

              return `
                <div class="medical-record-entry" style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1.25rem; background: var(--bg-card);">
                  <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--border-color); padding-bottom: 0.6rem; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                      <span style="font-size: 0.8125rem; font-weight: 800; color: var(--primary-green); text-transform: uppercase;">
                        ${dateFormatted}
                      </span>
                      <span style="margin: 0 0.5rem; color: var(--text-muted);">•</span>
                      <span style="font-size: 0.875rem; font-weight: 700; color: var(--text-primary);">
                        ${rec.record_type || 'Consultation'}
                      </span>
                    </div>
                    <div style="font-size: 0.8125rem; color: var(--text-secondary);">
                      Doctor: <strong style="color: var(--text-primary);">${docName}</strong> (${docOrg})
                    </div>
                  </div>

                  <div style="display: grid; gap: 0.45rem; font-size: 0.875rem;">
                    ${rec.symptoms || rec.chief_complaint ? `
                      <div>
                        <strong style="color: var(--text-secondary);">Symptoms:</strong>
                        <span style="color: var(--text-primary); margin-left: 0.35rem;">${rec.symptoms || rec.chief_complaint}</span>
                      </div>
                    ` : ''}

                    <div>
                      <strong style="color: var(--text-secondary);">Diagnosis:</strong>
                      <span style="color: var(--text-primary); font-weight: 800; margin-left: 0.35rem;">${rec.diagnosis}</span>
                    </div>

                    ${rec.treatment ? `
                      <div>
                        <strong style="color: var(--text-secondary);">Treatment:</strong>
                        <span style="color: var(--text-primary); margin-left: 0.35rem;">${rec.treatment}</span>
                      </div>
                    ` : ''}

                    ${rec.medicine || rec.prescription ? `
                      <div style="background: var(--bg-secondary); padding: 0.5rem 0.75rem; border-radius: var(--radius-input); margin-top: 0.25rem;">
                        <strong style="color: var(--dark-green);">Prescription:</strong>
                        <span style="color: var(--dark-green); font-weight: 800; margin-left: 0.35rem;">${rec.medicine || rec.prescription}</span>
                        ${rec.dosage ? `<span style="color: var(--text-secondary); margin-left: 0.5rem;">(${rec.dosage}${rec.frequency ? `, ${rec.frequency}` : ''})</span>` : ''}
                      </div>
                    ` : ''}

                    ${rec.follow_up_date ? `
                      <div style="font-size: 0.8125rem; color: var(--text-secondary);">
                        <strong>Follow-up Date:</strong> <span style="color: var(--text-primary); font-weight: 600;">${rec.follow_up_date}</span>
                      </div>
                    ` : ''}

                    ${rec.doctor_notes ? `
                      <div style="margin-top: 0.35rem; padding-top: 0.35rem; border-top: 1px dashed var(--border-color); color: var(--text-secondary); font-size: 0.8125rem;">
                        <strong>Doctor Notes:</strong> ${rec.doctor_notes}
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Section 2: Lab Reports -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
            LAB REPORTS
          </h2>
          <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600;">
            ${labs.length} report${labs.length === 1 ? '' : 's'}
          </span>
        </div>

        ${labs.length === 0 ? `
          <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color);">
            <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">
              No lab reports yet.
            </div>
            <div style="font-size: 0.8125rem;">
              Diagnostic telemetry and pathology reports from accredited labs will be securely delivered here.
            </div>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${labs.map(lab => {
              const formattedDate = lab.test_date ? new Date(lab.test_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (lab.report_date || 'N/A');
              const hasFile = Boolean(lab.report_file_path);

              return `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1.25rem; background: var(--bg-card);">
                  <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                      <span style="font-size: 0.75rem; font-weight: 800; color: var(--primary-green); text-transform: uppercase;">
                        LAB RECORD
                      </span>
                      <span style="margin: 0 0.5rem; color: var(--text-muted);">•</span>
                      <span style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary);">
                        ${lab.test_name}
                      </span>
                    </div>
                    <span style="padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; background: var(--light-green); color: var(--dark-green); border: 1px solid var(--border-color);">
                      ${lab.status || 'Verified Provider'}
                    </span>
                  </div>

                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; font-size: 0.875rem; margin-bottom: 0.5rem;">
                    <div>
                      <span style="color: var(--text-secondary); font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">Lab:</span>
                      <div style="font-weight: 700; color: var(--text-primary); margin-top: 0.1rem;">
                        ${lab.lab_name || 'Apex Diagnostics'}
                      </div>
                    </div>
                    <div>
                      <span style="color: var(--text-secondary); font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">Date:</span>
                      <div style="font-weight: 700; color: var(--text-primary); margin-top: 0.1rem;">
                        ${formattedDate}
                      </div>
                    </div>
                    <div>
                      <span style="color: var(--text-secondary); font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">Result:</span>
                      <div style="font-size: 1.15rem; font-weight: 800; color: var(--dark-green); margin-top: 0.05rem;">
                        ${lab.result}
                      </div>
                    </div>
                    ${lab.reference_range ? `
                      <div>
                        <span style="color: var(--text-secondary); font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">Reference Range:</span>
                        <div style="font-weight: 600; color: var(--text-secondary); margin-top: 0.1rem;">
                          ${lab.reference_range}
                        </div>
                      </div>
                    ` : ''}
                  </div>

                  ${lab.notes ? `
                    <div style="font-size: 0.8125rem; color: var(--text-secondary); background: var(--bg-secondary); padding: 0.4rem 0.6rem; border-radius: var(--radius-input); margin-top: 0.5rem;">
                      <strong>Notes:</strong> ${lab.notes}
                    </div>
                  ` : ''}

                  ${hasFile ? `
                    <div style="display: flex; justify-content: flex-end; padding-top: 0.5rem; margin-top: 0.5rem; border-top: 1px dashed var(--border-color);">
                      <button 
                        type="button" 
                        class="btn btn-secondary btn-patient-view-lab-report" 
                        data-filepath="${lab.report_file_path}"
                        data-testname="${lab.test_name}"
                        style="font-size: 0.8125rem; font-weight: 700; padding: 0.4rem 0.85rem; border: 1px solid var(--primary-green); color: var(--primary-green); background: var(--bg-card); border-radius: var(--radius-btn); cursor: pointer; display: flex; align-items: center; gap: 0.35rem;"
                      >
                        📄 View Report
                      </button>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Section 3: Prescriptions -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
            PRESCRIPTIONS
          </h2>
          <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600;">
            ${prescriptions.length} item${prescriptions.length === 1 ? '' : 's'}
          </span>
        </div>

        ${prescriptions.length === 0 ? `
          <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color);">
            <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">
              No prescriptions yet.
            </div>
            <div style="font-size: 0.8125rem;">
              Active medication prescriptions from your doctors will appear here.
            </div>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${prescriptions.map(p => `
              <div style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1rem; background: var(--bg-card); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <div style="font-size: 1rem; font-weight: 800; color: var(--dark-green);">
                    ${p.medicine}
                  </div>
                  <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.2rem;">
                    ${p.dosage ? `Dosage: ${p.dosage}` : ''} ${p.frequency ? `• Frequency: ${p.frequency}` : ''} ${p.duration ? `• Duration: ${p.duration}` : ''}
                  </div>
                </div>
                <div>
                  <span style="padding: 0.25rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; background: ${p.status === 'Dispensed' ? 'var(--light-green)' : 'var(--bg-secondary)'}; color: ${p.status === 'Dispensed' ? 'var(--dark-green)' : 'var(--text-secondary)'}; border: 1px solid var(--border-color);">
                    ${p.status || 'Active'}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Section 4: Recent Activity & Audit History -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
            RECENT ACTIVITY & ACCESS LOGS
          </h2>
          <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600;">
            ${logs.length} logged event${logs.length === 1 ? '' : 's'}
          </span>
        </div>

        ${logs.length === 0 ? `
          <div style="padding: 1.5rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color); font-size: 0.875rem;">
            No activity logged yet.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.65rem;">
            ${logs.slice(0, 8).map(log => `
              <div style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 0.75rem 1rem; background: var(--bg-card); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; font-size: 0.875rem;">
                <div>
                  <div style="font-weight: 700; color: var(--text-primary);">${log.action}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">
                    By: <strong>${log.role || 'System'}</strong> ${log.purpose ? `• ${log.purpose}` : ''}
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

    </div>

    <!-- Patient Lab Report Viewer Modal -->
    <div id="modal-patient-lab-report-viewer" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9999; align-items: center; justify-content: center; padding: 1.5rem;">
      <div style="background: var(--bg-card); border-radius: var(--radius-card); max-width: 800px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color); box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-primary);" id="modal-patient-report-title">
            Lab Diagnostic Report
          </div>
          <button type="button" id="btn-close-patient-report-modal" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-secondary);">
            ✕
          </button>
        </div>
        <div id="modal-patient-report-content" style="flex: 1; padding: 1rem; overflow: auto; min-height: 350px; display: flex; align-items: center; justify-content: center;">
        </div>
      </div>
    </div>
  `;
}

export function attachPatientDashboardEvents(container) {
  const modal = container.querySelector('#modal-patient-lab-report-viewer');
  const modalTitle = container.querySelector('#modal-patient-report-title');
  const modalContent = container.querySelector('#modal-patient-report-content');
  const btnCloseModal = container.querySelector('#btn-close-patient-report-modal');

  if (btnCloseModal && modal) {
    btnCloseModal.addEventListener('click', () => {
      modal.style.display = 'none';
      if (modalContent) modalContent.innerHTML = '';
    });
  }

  const viewBtns = container.querySelectorAll('.btn-patient-view-lab-report');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filePath = btn.getAttribute('data-filepath');
      const testName = btn.getAttribute('data-testname');

      if (!filePath) return;

      if (modal && modalContent) {
        if (modalTitle) modalTitle.textContent = `Diagnostic Report — ${testName || 'Document'}`;
        if (filePath.startsWith('data:image/') || filePath.match(/\.(png|jpg|jpeg)$/i)) {
          modalContent.innerHTML = `<img src="${filePath}" alt="Lab Report" style="max-width: 100%; max-height: 70vh; border-radius: var(--radius-input); object-fit: contain;" />`;
        } else {
          modalContent.innerHTML = `
            <iframe src="${filePath}" style="width: 100%; height: 70vh; border: none; border-radius: var(--radius-input);" title="Lab Report Preview"></iframe>
          `;
        }
        modal.style.display = 'flex';
      } else {
        window.open(filePath, '_blank');
      }
    });
  });
}
