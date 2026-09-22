import { store } from '../state/store.js';

export function renderDoctorPortalView(state) {
  const doctor = state.currentDoctor || {
    full_name: state.currentUser?.full_name || state.currentUser?.name || 'Practicing Physician',
    specialization: state.currentUser?.specialization || 'Attending Physician',
    organization: state.currentUser?.organization || 'Medical Center'
  };

  const patient = state.searchedPatient;
  const isSearched = state.isPatientSearched && patient;
  const records = state.patientRecords || [];
  const labs = state.patientLabReports || [];
  const prescriptions = state.patientPrescriptions || [];
  const searchError = state.searchError;
  const isSearching = state.isSearching;
  const isAddRecordOpen = state.isAddRecordOpen;
  const isAddDoctorLabOpen = state.isAddDoctorLabOpen;
  const activeTab = state.doctorClinicalTab || 'all';
  const isSaving = state.isSavingRecord;
  const saveSuccess = state.recordSaveSuccess;
  const saveError = state.recordSaveError;
  const labSuccess = state.labSaveSuccess;
  const labError = state.labSaveError;

  return `
    <div class="doctor-portal-container" style="max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem;">
      
      <!-- Doctor Profile Summary -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.25rem 1.5rem; border-radius: var(--radius-card);">
        <div style="font-size: 0.75rem; font-weight: 800; color: var(--primary-green); text-transform: uppercase; letter-spacing: 0.05em;">
          Active Clinical Practitioner
        </div>
        <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-primary); margin-top: 0.25rem;">
          ${doctor.full_name}
        </div>
        <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.15rem;">
          ${doctor.specialization} • ${doctor.organization} ${doctor.medical_registration_number ? `• Reg: ${doctor.medical_registration_number}` : ''}
        </div>
      </div>

      <!-- Patient Search Card -->
      <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
        <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.35rem;">
          SEARCH PATIENT
        </div>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
          Enter the patient's unique Health Wallet ID to retrieve longitudinal medical history, lab telemetry, and active prescriptions.
        </p>

        <form id="form-doctor-search-patient" style="display: flex; gap: 0.75rem; align-items: stretch; flex-wrap: wrap;">
          <input 
            type="text" 
            id="input-doctor-search-hwid" 
            placeholder="e.g. HW-IN-2026-XXXX-XXXX" 
            value="${state.searchedPatientId || ''}"
            required
            style="flex: 1; min-width: 280px; padding: 0.75rem 1rem; font-size: 0.95rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); background: var(--bg-card); font-family: var(--font-mono); font-weight: 600;"
          />
          <button 
            type="submit" 
            class="btn btn-primary" 
            id="btn-doctor-search-submit"
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

      <!-- Patient Found & Clinical Records -->
      ${isSearched ? `
        <!-- Patient Consent / Access Indicator -->
        <div class="consent-indicator" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-secondary); border: 1px solid var(--border-color); border-left: 4px solid var(--primary-green); border-radius: var(--radius-input); padding: 0.75rem 1rem; font-size: 0.8125rem; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-weight: 800; color: var(--dark-green); text-transform: uppercase; letter-spacing: 0.03em;">Patient Record Access:</span>
            <span style="color: var(--text-primary); font-weight: 600;">Authorized clinical access</span>
          </div>
          <div style="color: var(--text-secondary); font-size: 0.75rem;">
            Attending: <strong style="color: var(--text-primary);">${doctor.full_name}</strong> • Access Time: <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-primary);">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <!-- Patient Found Header Banner -->
        <div class="card" style="background: var(--light-green); border: 1px solid var(--border-color); padding: 1.25rem 1.5rem; border-radius: var(--radius-card);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid rgba(20, 90, 58, 0.2); padding-bottom: 1rem; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 800; color: var(--dark-green); letter-spacing: 0.05em; margin-bottom: 0.25rem;">
                PATIENT RECORD FOUND ✓
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

          <div>
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--dark-green); text-transform: uppercase;">Current Medicines:</span>
            <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary); margin-left: 0.4rem;">
              ${patient.current_medicines || 'None documented'}
            </span>
          </div>
        </div>

        <!-- Success or Error Feedback -->
        ${saveSuccess ? `
          <div class="alert alert-success" style="padding: 0.875rem 1.25rem; background: var(--color-success-bg); border: 1px solid var(--primary-green); color: var(--primary-green); border-radius: var(--radius-input); font-size: 0.95rem; font-weight: 700;">
            ✓ ${saveSuccess}
          </div>
        ` : ''}

        ${saveError ? `
          <div class="alert alert-error" style="padding: 0.875rem 1.25rem; background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); color: var(--color-danger); border-radius: var(--radius-input); font-size: 0.95rem; font-weight: 700;">
            ${saveError}
          </div>
        ` : ''}

        ${labSuccess ? `
          <div class="alert alert-success" style="padding: 0.875rem 1.25rem; background: var(--color-success-bg); border: 1px solid var(--primary-green); color: var(--primary-green); border-radius: var(--radius-input); font-size: 0.95rem; font-weight: 700;">
            ✓ ${labSuccess}
          </div>
        ` : ''}

        ${labError ? `
          <div class="alert alert-error" style="padding: 0.875rem 1.25rem; background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); color: var(--color-danger); border-radius: var(--radius-input); font-size: 0.95rem; font-weight: 700;">
            ${labError}
          </div>
        ` : ''}

        <!-- Clinical Navigation Tabs -->
        <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap;">
          <button 
            type="button" 
            class="btn-doctor-tab ${activeTab === 'all' ? 'active' : ''}" 
            data-tab="all" 
            style="padding: 0.5rem 1.1rem; font-size: 0.875rem; font-weight: 700; border-radius: var(--radius-btn); border: 1px solid var(--border-color); background: ${activeTab === 'all' ? 'var(--light-green)' : 'var(--bg-card)'}; color: ${activeTab === 'all' ? 'var(--dark-green)' : 'var(--text-secondary)'}; cursor: pointer;"
          >
            All Clinical Records
          </button>
          <button 
            type="button" 
            class="btn-doctor-tab ${activeTab === 'consultations' ? 'active' : ''}" 
            data-tab="consultations" 
            style="padding: 0.5rem 1.1rem; font-size: 0.875rem; font-weight: 700; border-radius: var(--radius-btn); border: 1px solid var(--border-color); background: ${activeTab === 'consultations' ? 'var(--light-green)' : 'var(--bg-card)'}; color: ${activeTab === 'consultations' ? 'var(--dark-green)' : 'var(--text-secondary)'}; cursor: pointer;"
          >
            Medical Consultations (${records.length})
          </button>
          <button 
            type="button" 
            class="btn-doctor-tab ${activeTab === 'labs' ? 'active' : ''}" 
            data-tab="labs" 
            style="padding: 0.5rem 1.1rem; font-size: 0.875rem; font-weight: 700; border-radius: var(--radius-btn); border: 1px solid var(--border-color); background: ${activeTab === 'labs' ? 'var(--light-green)' : 'var(--bg-card)'}; color: ${activeTab === 'labs' ? 'var(--dark-green)' : 'var(--text-secondary)'}; cursor: pointer;"
          >
            Lab Records (${labs.length})
          </button>
          <button 
            type="button" 
            class="btn-doctor-tab ${activeTab === 'prescriptions' ? 'active' : ''}" 
            data-tab="prescriptions" 
            style="padding: 0.5rem 1.1rem; font-size: 0.875rem; font-weight: 700; border-radius: var(--radius-btn); border: 1px solid var(--border-color); background: ${activeTab === 'prescriptions' ? 'var(--light-green)' : 'var(--bg-card)'}; color: ${activeTab === 'prescriptions' ? 'var(--dark-green)' : 'var(--text-secondary)'}; cursor: pointer;"
          >
            Prescriptions (${prescriptions.length})
          </button>
        </div>

        <!-- 1. MEDICAL CONSULTATIONS SECTION -->
        ${(activeTab === 'all' || activeTab === 'consultations') ? `
          <!-- Add Medical Record Form Card -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${isAddRecordOpen ? '1.25rem' : '0'}; flex-wrap: wrap; gap: 0.75rem;">
              <div>
                <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
                  Clinical Consultation & Documentation
                </h2>
                <p style="font-size: 0.8125rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">
                  Record symptoms, diagnosis, treatment, and prescription to persist to the central medical database.
                </p>
              </div>
              <button 
                type="button" 
                class="btn ${isAddRecordOpen ? 'btn-secondary' : 'btn-primary'}" 
                id="btn-toggle-add-record-form"
                style="font-weight: 700; padding: 0.65rem 1.25rem; background: ${isAddRecordOpen ? 'var(--bg-secondary)' : 'var(--primary-green)'}; color: ${isAddRecordOpen ? 'var(--text-primary)' : '#fff'}; border: 1px solid var(--border-color); border-radius: var(--radius-btn); cursor: pointer;"
              >
                ${isAddRecordOpen ? 'Close Form' : '+ Add Medical Record'}
              </button>
            </div>

            ${isAddRecordOpen ? `
              <form id="form-add-medical-record" style="border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                  <div>
                    <label for="input-record-date" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Date *
                    </label>
                    <input 
                      type="date" 
                      id="input-record-date" 
                      value="${new Date().toISOString().split('T')[0]}" 
                      required 
                      style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>

                  <div>
                    <label for="input-record-followup" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Follow-up Date
                    </label>
                    <input 
                      type="date" 
                      id="input-record-followup" 
                      style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>
                </div>

                <div style="margin-bottom: 1rem;">
                  <label for="input-record-symptoms" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                    Symptoms / Chief Complaint
                  </label>
                  <input 
                    type="text" 
                    id="input-record-symptoms" 
                    placeholder="e.g. Occasional exertional palpitations, headache" 
                    style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                  />
                </div>

                <div style="margin-bottom: 1rem;">
                  <label for="input-record-diagnosis" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                    Diagnosis *
                  </label>
                  <input 
                    type="text" 
                    id="input-record-diagnosis" 
                    placeholder="e.g. Hypertension" 
                    required 
                    style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                  />
                </div>

                <div style="margin-bottom: 1rem;">
                  <label for="input-record-treatment" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                    Treatment
                  </label>
                  <input 
                    type="text" 
                    id="input-record-treatment" 
                    placeholder="e.g. Medication management, low sodium diet" 
                    style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                  />
                </div>

                <!-- Prescription Details -->
                <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1rem; margin-bottom: 1rem;">
                  <div style="font-size: 0.8125rem; font-weight: 800; color: var(--dark-green); text-transform: uppercase; margin-bottom: 0.75rem;">
                    Medication / Prescription
                  </div>

                  <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.75rem;">
                    <div>
                      <label for="input-record-medicine" style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem;">
                        Medicine
                      </label>
                      <input 
                        type="text" 
                        id="input-record-medicine" 
                        placeholder="e.g. Telmisartan 40mg" 
                        style="width: 100%; padding: 0.6rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.875rem;"
                      />
                    </div>

                    <div>
                      <label for="input-record-dosage" style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem;">
                        Dosage
                      </label>
                      <input 
                        type="text" 
                        id="input-record-dosage" 
                        placeholder="e.g. 40mg" 
                        style="width: 100%; padding: 0.6rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.875rem;"
                      />
                    </div>

                    <div>
                      <label for="input-record-frequency" style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.25rem;">
                        Frequency
                      </label>
                      <input 
                        type="text" 
                        id="input-record-frequency" 
                        placeholder="e.g. Once daily" 
                        style="width: 100%; padding: 0.6rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.875rem;"
                      />
                    </div>
                  </div>
                </div>

                <div style="margin-bottom: 1.25rem;">
                  <label for="input-record-notes" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                    Doctor Notes
                  </label>
                  <textarea 
                    id="input-record-notes" 
                    rows="2" 
                    placeholder="Additional clinical guidance, dietary precautions, follow-up timelines..." 
                    style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                  ></textarea>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                  <button type="button" class="btn btn-secondary" id="btn-cancel-add-record" style="padding: 0.65rem 1.25rem; border: 1px solid var(--border-color); border-radius: var(--radius-btn); background: var(--bg-card); cursor: pointer;">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    class="btn btn-primary" 
                    id="btn-save-record-submit"
                    ${isSaving ? 'disabled' : ''}
                    style="padding: 0.65rem 1.5rem; font-weight: 700; background: var(--primary-green); color: #fff; border: none; border-radius: var(--radius-btn); cursor: pointer;"
                  >
                    ${isSaving ? 'Saving to Database...' : 'Save Medical Record'}
                  </button>
                </div>
              </form>
            ` : ''}
          </div>

          <!-- Previous Medical Records -->
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem;">
              <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
                PREVIOUS MEDICAL RECORDS
              </h2>
              <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600;">
                ${records.length} record${records.length === 1 ? '' : 's'} found
              </span>
            </div>

            ${records.length === 0 ? `
              <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color);">
                <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">
                  No medical records yet.
                </div>
                <div style="font-size: 0.8125rem;">
                  Medical records saved by any attending doctor will appear here chronologically.
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
                            <strong style="color: var(--dark-green);">Prescribed Medication:</strong>
                            <span style="color: var(--dark-green); font-weight: 800; margin-left: 0.35rem;">${rec.medicine || rec.prescription}</span>
                            ${rec.dosage ? `<span style="color: var(--text-secondary); margin-left: 0.5rem;">(${rec.dosage}${rec.frequency ? `, ${rec.frequency}` : ''})</span>` : ''}
                          </div>
                        ` : ''}

                        ${rec.follow_up_date ? `
                          <div style="font-size: 0.8125rem; color: var(--text-secondary);">
                            <strong>Follow-up:</strong> ${rec.follow_up_date}
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
        ` : ''}

        <!-- 2. LAB RECORDS SECTION -->
        ${(activeTab === 'all' || activeTab === 'labs') ? `
          <div class="card" id="section-doctor-lab-records" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${isAddDoctorLabOpen ? '1.25rem' : '1.25rem'}; flex-wrap: wrap; gap: 0.75rem;">
              <div>
                <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
                  LAB RECORDS
                </h2>
                <p style="font-size: 0.8125rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">
                  Diagnostic telemetry, pathology findings, and verified laboratory documentation.
                </p>
              </div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600;">
                  ${labs.length} record${labs.length === 1 ? '' : 's'}
                </span>
                <button 
                  type="button" 
                  class="btn ${isAddDoctorLabOpen ? 'btn-secondary' : 'btn-primary'}" 
                  id="btn-doctor-toggle-add-lab"
                  style="font-weight: 700; padding: 0.6rem 1.2rem; font-size: 0.85rem; background: ${isAddDoctorLabOpen ? 'var(--bg-secondary)' : 'var(--primary-green)'}; color: ${isAddDoctorLabOpen ? 'var(--text-primary)' : '#fff'}; border: 1px solid var(--border-color); border-radius: var(--radius-btn); cursor: pointer;"
                >
                  ${isAddDoctorLabOpen ? 'Close Form' : '+ Add Lab Record'}
                </button>
              </div>
            </div>

            ${isAddDoctorLabOpen ? `
              <form id="form-doctor-add-lab" style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1.25rem; background: var(--bg-secondary); margin-bottom: 1.5rem;">
                <div style="font-size: 0.875rem; font-weight: 800; color: var(--dark-green); text-transform: uppercase; margin-bottom: 1rem;">
                  Add Diagnostic Lab Record
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                  <div>
                    <label for="input-doctor-lab-name" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Lab / Diagnostic Center *
                    </label>
                    <input 
                      type="text" 
                      id="input-doctor-lab-name" 
                      value="Apex Diagnostics" 
                      required 
                      style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>

                  <div>
                    <label for="input-doctor-lab-test" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Test Name *
                    </label>
                    <input 
                      type="text" 
                      id="input-doctor-lab-test" 
                      placeholder="e.g. HbA1c, Complete Blood Count" 
                      required 
                      style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                  <div>
                    <label for="input-doctor-lab-date" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Test Date *
                    </label>
                    <input 
                      type="date" 
                      id="input-doctor-lab-date" 
                      value="${new Date().toISOString().split('T')[0]}" 
                      required 
                      style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>

                  <div>
                    <label for="input-doctor-lab-result" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Result *
                    </label>
                    <input 
                      type="text" 
                      id="input-doctor-lab-result" 
                      placeholder="e.g. 6.2 %" 
                      required 
                      style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>

                  <div>
                    <label for="input-doctor-lab-ref" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                      Reference Range
                    </label>
                    <input 
                      type="text" 
                      id="input-doctor-lab-ref" 
                      placeholder="e.g. < 5.7 % Normal" 
                      style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                    />
                  </div>
                </div>

                <div style="margin-bottom: 1rem;">
                  <label for="input-doctor-lab-notes" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                    Notes / Clinical Interpretation
                  </label>
                  <input 
                    type="text" 
                    id="input-doctor-lab-notes" 
                    placeholder="e.g. Optimal glycemic control maintained" 
                    style="width: 100%; padding: 0.65rem; border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.9rem;"
                  />
                </div>

                <div style="margin-bottom: 1.25rem;">
                  <label for="input-doctor-lab-file" style="display: block; font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">
                    Attach Report / Document (PDF / JPG / PNG)
                  </label>
                  <input 
                    type="file" 
                    id="input-doctor-lab-file" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    style="width: 100%; padding: 0.5rem; background: var(--bg-card); border: 1px solid var(--border-input); border-radius: var(--radius-input); font-size: 0.85rem;"
                  />
                  <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                    Stored securely in Supabase Storage with authorized provider access control.
                  </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                  <button type="button" class="btn btn-secondary" id="btn-doctor-cancel-add-lab" style="padding: 0.6rem 1.25rem; border: 1px solid var(--border-color); border-radius: var(--radius-btn); background: var(--bg-card); cursor: pointer;">
                    Cancel
                  </button>
                  <button type="submit" class="btn btn-primary" id="btn-doctor-save-lab-submit" style="padding: 0.6rem 1.5rem; font-weight: 700; background: var(--primary-green); color: #fff; border: none; border-radius: var(--radius-btn); cursor: pointer;">
                    Save Lab Record
                  </button>
                </div>
              </form>
            ` : ''}

            ${labs.length === 0 ? `
              <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color); font-size: 0.875rem;">
                <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">
                  No lab reports yet.
                </div>
                <div style="font-size: 0.8125rem;">
                  Diagnostic test results and verified pathology reports will appear here.
                </div>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${labs.map(lab => {
                  const formattedDate = lab.test_date ? new Date(lab.test_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (lab.report_date || 'N/A');
                  const hasFile = Boolean(lab.report_file_path);

                  return `
                    <div class="lab-record-card" style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1.25rem; background: var(--bg-card);">
                      <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--border-color); padding-bottom: 0.6rem; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                        <div>
                          <span style="font-size: 0.75rem; font-weight: 800; color: var(--primary-green); text-transform: uppercase; letter-spacing: 0.04em;">
                            LAB RECORD
                          </span>
                          <span style="margin: 0 0.5rem; color: var(--text-muted);">•</span>
                          <span style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary);">
                            ${lab.test_name}
                          </span>
                        </div>
                        <span style="padding: 0.25rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; background: var(--light-green); color: var(--dark-green); border: 1px solid var(--border-color);">
                          ${lab.status || 'Verified Provider'}
                        </span>
                      </div>

                      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.85rem; font-size: 0.875rem; margin-bottom: 0.75rem;">
                        <div>
                          <span style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Lab:</span>
                          <div style="font-weight: 700; color: var(--text-primary); margin-top: 0.15rem;">
                            ${lab.lab_name || 'Apex Diagnostics'}
                          </div>
                        </div>

                        <div>
                          <span style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Date:</span>
                          <div style="font-weight: 700; color: var(--text-primary); margin-top: 0.15rem;">
                            ${formattedDate}
                          </div>
                        </div>

                        <div>
                          <span style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Result:</span>
                          <div style="font-size: 1.25rem; font-weight: 800; color: var(--dark-green); margin-top: 0.1rem;">
                            ${lab.result}
                          </div>
                        </div>

                        ${lab.reference_range ? `
                          <div>
                            <span style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Reference Range:</span>
                            <div style="font-weight: 600; color: var(--text-secondary); margin-top: 0.15rem;">
                              ${lab.reference_range}
                            </div>
                          </div>
                        ` : ''}

                        <div>
                          <span style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Doctor / Provider:</span>
                          <div style="font-weight: 600; color: var(--text-primary); margin-top: 0.15rem;">
                            ${lab.doctor_name || doctor.full_name || 'Attending Physician'}
                          </div>
                        </div>
                      </div>

                      ${lab.notes ? `
                        <div style="font-size: 0.8125rem; color: var(--text-secondary); background: var(--bg-secondary); padding: 0.5rem 0.75rem; border-radius: var(--radius-input); margin-bottom: 0.75rem;">
                          <strong>Notes:</strong> ${lab.notes}
                        </div>
                      ` : ''}

                      ${hasFile ? `
                        <div style="display: flex; justify-content: flex-end; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
                          <button 
                            type="button" 
                            class="btn btn-secondary btn-view-lab-report" 
                            data-filepath="${lab.report_file_path}"
                            data-testname="${lab.test_name}"
                            style="font-size: 0.8125rem; font-weight: 700; padding: 0.45rem 1rem; border: 1px solid var(--primary-green); color: var(--primary-green); background: var(--bg-card); border-radius: var(--radius-btn); cursor: pointer; display: flex; align-items: center; gap: 0.35rem;"
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
        ` : ''}

        <!-- 3. PRESCRIPTIONS SECTION -->
        ${(activeTab === 'all' || activeTab === 'prescriptions') ? `
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius-card);">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem;">
              <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
                PRESCRIPTIONS
              </h2>
              <span style="font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600;">
                ${prescriptions.length} prescription${prescriptions.length === 1 ? '' : 's'}
              </span>
            </div>

            ${prescriptions.length === 0 ? `
              <div style="padding: 2rem 1rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: var(--radius-input); border: 1px dashed var(--border-color); font-size: 0.875rem;">
                No prescriptions yet.
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${prescriptions.map(p => `
                  <div style="border: 1px solid var(--border-color); border-radius: var(--radius-input); padding: 1rem; background: var(--bg-card); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <div>
                      <div style="font-weight: 800; color: var(--dark-green); font-size: 0.95rem;">
                        ${p.medicine}
                      </div>
                      <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.15rem;">
                        ${p.dosage ? `Dosage: ${p.dosage}` : ''} ${p.frequency ? `• Frequency: ${p.frequency}` : ''} ${p.duration ? `• Duration: ${p.duration}` : ''}
                      </div>
                    </div>
                    <div>
                      <span style="padding: 0.25rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; background: ${p.status === 'Dispensed' || p.status === 'DISPENSED' ? 'var(--light-green)' : 'var(--bg-secondary)'}; color: ${p.status === 'Dispensed' || p.status === 'DISPENSED' ? 'var(--dark-green)' : 'var(--text-secondary)'}; border: 1px solid var(--border-color);">
                        ${p.status || 'PRESCRIBED'}
                      </span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        ` : ''}

      ` : ''}
    </div>

    <!-- Report Preview Modal -->
    <div id="modal-lab-report-viewer" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9999; align-items: center; justify-content: center; padding: 1.5rem;">
      <div style="background: var(--bg-card); border-radius: var(--radius-card); max-width: 800px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color); box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-primary);" id="modal-report-title">
            Lab Diagnostic Report
          </div>
          <button type="button" id="btn-close-report-modal" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-secondary);">
            ✕
          </button>
        </div>
        <div id="modal-report-content" style="flex: 1; padding: 1rem; overflow: auto; min-height: 350px; display: flex; align-items: center; justify-content: center;">
          <!-- Preview Frame or Image injected dynamically -->
        </div>
      </div>
    </div>
  `;
}

export function attachDoctorPortalEvents(container) {
  // Search Form
  const searchForm = container.querySelector('#form-doctor-search-patient');
  const searchInput = container.querySelector('#input-doctor-search-hwid');

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const hwid = searchInput.value.trim();
      await store.searchPatient(hwid);
    });
  }

  // Clinical Tab Switcher
  const tabBtns = container.querySelectorAll('.btn-doctor-tab');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) {
        store.setDoctorClinicalTab(tab);
      }
    });
  });

  // Toggle Add Medical Record Form
  const btnToggleForm = container.querySelector('#btn-toggle-add-record-form');
  if (btnToggleForm) {
    btnToggleForm.addEventListener('click', () => {
      store.toggleAddRecordForm();
    });
  }

  const btnCancelForm = container.querySelector('#btn-cancel-add-record');
  if (btnCancelForm) {
    btnCancelForm.addEventListener('click', () => {
      store.toggleAddRecordForm(false);
    });
  }

  // Toggle Add Doctor Lab Record Form
  const btnToggleLab = container.querySelector('#btn-doctor-toggle-add-lab');
  if (btnToggleLab) {
    btnToggleLab.addEventListener('click', () => {
      store.toggleAddDoctorLabForm();
    });
  }

  const btnCancelLab = container.querySelector('#btn-doctor-cancel-add-lab');
  if (btnCancelLab) {
    btnCancelLab.addEventListener('click', () => {
      store.toggleAddDoctorLabForm(false);
    });
  }

  // Add Medical Record Form Submit
  const recordForm = container.querySelector('#form-add-medical-record');
  if (recordForm) {
    recordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const visitDate = container.querySelector('#input-record-date')?.value;
      const followUpDate = container.querySelector('#input-record-followup')?.value;
      const symptoms = container.querySelector('#input-record-symptoms')?.value;
      const diagnosis = container.querySelector('#input-record-diagnosis')?.value;
      const treatment = container.querySelector('#input-record-treatment')?.value;
      const medicine = container.querySelector('#input-record-medicine')?.value;
      const dosage = container.querySelector('#input-record-dosage')?.value;
      const frequency = container.querySelector('#input-record-frequency')?.value;
      const doctorNotes = container.querySelector('#input-record-notes')?.value;

      await store.addMedicalRecord({
        visitDate,
        followUpDate,
        symptoms,
        diagnosis,
        treatment,
        medicine,
        dosage,
        frequency,
        doctorNotes
      });
    });
  }

  // Add Lab Record Form Submit
  const labForm = container.querySelector('#form-doctor-add-lab');
  if (labForm) {
    labForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const labName = container.querySelector('#input-doctor-lab-name')?.value;
      const testName = container.querySelector('#input-doctor-lab-test')?.value;
      const testDate = container.querySelector('#input-doctor-lab-date')?.value;
      const result = container.querySelector('#input-doctor-lab-result')?.value;
      const referenceRange = container.querySelector('#input-doctor-lab-ref')?.value;
      const notes = container.querySelector('#input-doctor-lab-notes')?.value;
      const fileInput = container.querySelector('#input-doctor-lab-file');
      const file = fileInput?.files?.[0] || null;

      let reportFilePath = null;
      if (file) {
        // Create Data URL for instant rendering & local fallback compatibility
        reportFilePath = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
      }

      const saveBtn = container.querySelector('#btn-doctor-save-lab-submit');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving to Database...';
      }

      await store.addLabReport({
        labName,
        testName,
        testDate,
        result,
        referenceRange,
        notes,
        status: 'Verified Provider',
        reportFilePath,
        file
      });
    });
  }

  // View Report Modal
  const modal = container.querySelector('#modal-lab-report-viewer');
  const modalTitle = container.querySelector('#modal-report-title');
  const modalContent = container.querySelector('#modal-report-content');
  const btnCloseModal = container.querySelector('#btn-close-report-modal');

  if (btnCloseModal && modal) {
    btnCloseModal.addEventListener('click', () => {
      modal.style.display = 'none';
      if (modalContent) modalContent.innerHTML = '';
    });
  }

  const viewBtns = container.querySelectorAll('.btn-view-lab-report');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filePath = btn.getAttribute('data-filepath');
      const testName = btn.getAttribute('data-testname');

      if (!filePath) return;

      if (modal && modalContent) {
        if (modalTitle) modalTitle.textContent = `Lab Diagnostic Report — ${testName || 'Document'}`;

        if (filePath.startsWith('data:image/') || filePath.match(/\.(png|jpg|jpeg)$/i)) {
          modalContent.innerHTML = `<img src="${filePath}" alt="Lab Report" style="max-width: 100%; max-height: 70vh; border-radius: var(--radius-input); object-fit: contain;" />`;
        } else {
          // PDF or iframe preview
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
