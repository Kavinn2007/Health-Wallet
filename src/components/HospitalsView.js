import { Icons } from './icons.js';

export function renderHospitalsView(state) {
  const hospitals = [
    {
      name: 'Metro Health Institute & Multi-Specialty',
      tier: 'Tertiary Care Hospital',
      location: 'Koramangala, Bengaluru',
      accreditation: 'NABH & JCI Accredited',
      abdmNode: 'Connected (ABDM-IN-KA-0941)',
      specialties: ['Cardiology', 'Neurology', 'Oncology', 'Emergency 24x7']
    },
    {
      name: 'Apollo Trauma Care Center',
      tier: 'Level 1 Trauma & Emergency Care',
      location: 'Bannerghatta Road, Bengaluru',
      accreditation: 'NABH Accredited',
      abdmNode: 'Connected (ABDM-IN-KA-1182)',
      specialties: ['Trauma ICU', 'Orthopedics', 'Intensive Care']
    },
    {
      name: 'Apex Diagnostics & Pathology Network',
      tier: 'NABL Reference Laboratory',
      location: 'Indiranagar, Bengaluru',
      accreditation: 'NABL Certified (MC-2849)',
      abdmNode: 'Connected (ABDM-IN-KA-2849)',
      specialties: ['Biochemistry', 'Hematology', 'Molecular Diagnostics']
    },
    {
      name: 'MedPlus Care Pharmacy #104',
      tier: 'Certified Drug Dispensation Partner',
      location: 'HSR Layout, Bengaluru',
      accreditation: 'Drug Control Dept KA-BLR-94812',
      abdmNode: 'Connected (ABDM-IN-KA-9481)',
      specialties: ['E-Prescription Dispense', 'Serial Authentication']
    }
  ];

  return `
    <div style="background: #FFFFFF;">
      <div style="margin-bottom: 1.5rem;">
        <h2 class="section-header-title">Connected Healthcare Facilities</h2>
        <p class="section-header-subtitle">Accredited network hospitals, diagnostic chains, and verified pharmacies connected to your Health Wallet.</p>
      </div>

      <div class="doctor-cards-grid">
        ${hospitals.map(h => `
          <div class="doctor-card">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <div>
                  <div class="doctor-card-name">${h.name}</div>
                  <div class="doctor-card-specialty">${h.tier}</div>
                </div>
                <span class="badge badge-verified" style="font-size: 0.7rem;">
                  ${Icons.check('w-3 h-3')}
                  <span>Active Node</span>
                </span>
              </div>

              <div class="doctor-card-meta">
                <div>📍 ${h.location}</div>
                <div>🏛️ ${h.accreditation}</div>
                <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--primary-green); margin-top: 0.25rem;">${h.abdmNode}</div>
              </div>

              <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.75rem;">
                ${h.specialties.map(s => `
                  <span class="badge badge-neutral" style="font-size: 0.7rem;">${s}</span>
                `).join('')}
              </div>
            </div>

            <div style="margin-top: 1.25rem; display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="alert('Viewing facility accreditation details for ${h.name}')">
                Facility Info
              </button>
              <button class="btn btn-primary btn-sm" onclick="alert('Opening consent linkage for ${h.name}')">
                Manage Consent
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
