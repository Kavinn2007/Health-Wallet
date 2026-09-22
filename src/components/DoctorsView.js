import { Icons } from './icons.js';
import { store } from '../state/store.js';

export function renderDoctorsView(state) {
  const doctors = [
    {
      id: 'DOC-01',
      name: 'Dr. Priya Nair, MD',
      specialty: 'Cardiologist',
      facility: 'Metro Health Institute',
      experience: '12 years experience',
      availability: 'Available Today',
      verified: true
    },
    {
      id: 'DOC-02',
      name: 'Dr. Vikram Malhotra, MD',
      specialty: 'Intensivist & Emergency Medicine',
      facility: 'Apollo Trauma Care Center',
      experience: '15 years experience',
      availability: 'On-Call',
      verified: true
    },
    {
      id: 'DOC-03',
      name: 'Dr. Anirudh Sen, MD',
      specialty: 'Neuro-Psychiatrist',
      facility: 'MindCare Neuro-Psychiatry Institute',
      experience: '10 years experience',
      availability: 'Available Tomorrow',
      verified: true
    },
    {
      id: 'DOC-04',
      name: 'Dr. S. K. Roy, MD',
      specialty: 'Lead Pathologist',
      facility: 'Apex Diagnostics & Pathology',
      experience: '18 years experience',
      availability: 'Lab Consultations Active',
      verified: true
    }
  ];

  return `
    <div style="background: #FFFFFF;">
      <div style="margin-bottom: 1.5rem;">
        <h2 class="section-header-title">Doctor Search & Directory</h2>
        <p class="section-header-subtitle">Find accredited specialists, verify medical council credentials, and share consent-managed records.</p>
      </div>

      <!-- Search Input -->
      <div class="doctor-search-bar">
        <div style="position: relative; flex: 1; max-width: 440px;">
          <input type="text" id="input-search-doctors" placeholder="Search doctors by name or specialty..." style="width: 100%; padding-left: 2.25rem;" />
          <div style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
            ${Icons.search('w-4 h-4')}
          </div>
        </div>

        <button class="btn btn-secondary" id="btn-search-doctors-action">
          Search
        </button>
      </div>

      <!-- Doctor Cards Grid -->
      <div class="doctor-cards-grid">
        ${doctors.map(doc => `
          <div class="doctor-card">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <div>
                  <div class="doctor-card-name">${doc.name}</div>
                  <div class="doctor-card-specialty">${doc.specialty}</div>
                </div>
                <span class="badge badge-verified" style="font-size: 0.7rem;">
                  ${Icons.check('w-3 h-3')}
                  <span>✓ Verified</span>
                </span>
              </div>

              <div class="doctor-card-meta">
                <div>${doc.facility}</div>
                <div>${doc.experience}</div>
              </div>

              <div style="margin-top: 0.85rem; font-size: 0.75rem; color: var(--primary-green); font-weight: 600; display: flex; align-items: center; gap: 0.35rem;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--primary-green);"></span>
                <span>${doc.availability}</span>
              </div>
            </div>

            <div style="margin-top: 1.25rem; display: flex; gap: 0.5rem;">
              <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="alert('Appointment booking flow initiated with ${doc.name}')">
                Book Appointment
              </button>
              <button class="btn btn-secondary btn-sm" onclick="alert('Displaying credentials and council registrations for ${doc.name}')">
                Profile
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function attachDoctorsEvents(container) {
  // Event attachments for doctor interactions
}
