import { Icons } from './icons.js';
import { store } from '../state/store.js';

export function renderMedicinesView(state) {
  // Categorized as specified: Recently Started, Recently Stopped / Past, Long-Term / Ongoing
  const recentlyStarted = [
    {
      name: 'Telmisartan',
      dosage: '40 mg · Once daily (Morning)',
      started: '15 Aug 2026',
      doctor: 'Dr. Priya Nair, MD',
      facility: 'Metro Health Institute',
      status: 'Recently Started',
      statusType: 'active'
    }
  ];

  const ongoing = [
    {
      name: 'Metformin',
      dosage: '500 mg · Twice daily (With meals)',
      started: '12 Aug 2026',
      doctor: 'Dr. Priya Nair, MD',
      facility: 'Metro Health Institute',
      status: 'Ongoing',
      statusType: 'active'
    },
    {
      name: 'Aspirin (Cardio)',
      dosage: '75 mg · Once daily (Post-Dinner)',
      started: '10 Feb 2025',
      doctor: 'Dr. Priya Nair, MD',
      facility: 'Metro Health Institute',
      status: 'Ongoing',
      statusType: 'active'
    }
  ];

  const past = [
    {
      name: 'Amoxicillin + Clavulanate',
      dosage: '625 mg · Twice daily',
      started: '10 Jan 2024',
      ended: '17 Jan 2024',
      doctor: 'Dr. Anand Kumar, MD',
      facility: 'City Health Clinic',
      status: 'Discontinued (Penicillin Allergy Noted)',
      statusType: 'danger'
    },
    {
      name: 'Pantoprazole',
      dosage: '40 mg · Once daily (Before breakfast)',
      started: '12 Jun 2026',
      ended: '26 Jun 2026',
      doctor: 'Dr. Vikram Malhotra, MD',
      facility: 'Metro Health Institute',
      status: 'Course Completed',
      statusType: 'neutral'
    }
  ];

  return `
    <div style="background: #FFFFFF;">
      <div style="margin-bottom: 2rem;">
        <h2 class="section-header-title">Medicines & Prescriptions</h2>
        <p class="section-header-subtitle">Active medication regimen, dosage timings, and clinical history.</p>
      </div>

      <!-- Section: Recently Started -->
      <div class="medicines-category-block">
        <h3 class="medicines-category-title">
          <span>Recently Started</span>
          <span class="badge badge-verified" style="font-size: 0.7rem;">Active</span>
        </h3>
        <div class="medicines-grid">
          ${recentlyStarted.map(med => renderMedicineCard(med)).join('')}
        </div>
      </div>

      <!-- Section: Long-Term / Ongoing -->
      <div class="medicines-category-block">
        <h3 class="medicines-category-title">
          <span>Long-Term / Ongoing</span>
          <span class="badge badge-verified" style="font-size: 0.7rem;">Maintenance</span>
        </h3>
        <div class="medicines-grid">
          ${ongoing.map(med => renderMedicineCard(med)).join('')}
        </div>
      </div>

      <!-- Section: Recently Stopped / Past -->
      <div class="medicines-category-block">
        <h3 class="medicines-category-title" style="color: var(--text-secondary);">
          <span>Recently Stopped / Past</span>
          <span class="badge badge-neutral" style="font-size: 0.7rem;">Historical</span>
        </h3>
        <div class="medicines-grid">
          ${past.map(med => renderMedicineCard(med)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderMedicineCard(med) {
  const isDanger = med.statusType === 'danger';
  const isActive = med.statusType === 'active';

  return `
    <div class="medicine-card">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div class="med-name">${med.name}</div>
            <div class="med-dosage">${med.dosage}</div>
          </div>
          <span class="badge ${isDanger ? 'badge-emergency' : (isActive ? 'badge-verified' : 'badge-neutral')}">
            ● ${med.status}
          </span>
        </div>

        <div class="med-details-box">
          <div><strong>Prescribed by:</strong> ${med.doctor}</div>
          <div><strong>Facility:</strong> ${med.facility}</div>
          <div><strong>Started:</strong> ${med.started} ${med.ended ? `• <strong>Stopped:</strong> ${med.ended}` : ''}</div>
        </div>
      </div>

      <div class="med-status-row">
        <span style="color: var(--text-muted);">Verified Electronic Rx</span>
        <button class="btn btn-ghost btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; color: var(--primary-green);">
          View Details
        </button>
      </div>
    </div>
  `;
}

export function attachMedicinesEvents(container) {
  // Placeholder for any interactive buttons inside medicines view
}
