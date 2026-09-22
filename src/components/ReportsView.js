import { Icons } from './icons.js';
import { store } from '../state/store.js';

export function renderReportsView(state) {
  const records = state.records;

  // Format records into table rows
  const reportsList = records.map(r => {
    let type = 'Clinical File';
    if (r.category === 'diagnostic') type = 'Lab Report';
    else if (r.category === 'prescription') type = 'Digital Rx';
    else if (r.category === 'discharge_summary') type = 'Hospital Summary';
    else if (r.category === 'sensitive_mental_health') type = 'Neuro Assessment';

    return {
      id: r.id,
      title: r.title,
      date: r.date,
      source: r.providerName,
      type: type,
      isVerified: r.verificationStatus === 'verified_by_provider',
      isSensitive: r.isSensitive,
      raw: r
    };
  });

  return `
    <div style="background: #FFFFFF;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 class="section-header-title">Diagnostic Reports & Documents</h2>
          <p class="section-header-subtitle">Direct provider telemetry, laboratory results, and attested hospital summaries.</p>
        </div>

        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" id="btn-reports-filter-lab">
            ${Icons.flask('w-3.5 h-3.5')}
            <span>Lab Telemetry Only</span>
          </button>
        </div>
      </div>

      <!-- Clean Minimal Table -->
      <div class="reports-table-container">
        <table class="reports-table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Date</th>
              <th>Source</th>
              <th>Type</th>
              <th>Verification</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${reportsList.map(item => `
              <tr>
                <td>
                  <strong style="color: var(--text-primary); font-weight: 600;">${item.title}</strong>
                  ${item.raw.isConsolidatedGroup ? `
                    <div style="font-size: 0.72rem; color: var(--primary-green); margin-top: 0.15rem;">
                      ${Icons.refresh('w-3 h-3')} Unified ${item.raw.consolidatedItemsCount} serial tests
                    </div>
                  ` : ''}
                </td>
                <td style="color: var(--text-secondary); white-space: nowrap;">${item.date}</td>
                <td style="color: var(--text-secondary);">${item.source}</td>
                <td>
                  <span class="badge badge-neutral" style="font-size: 0.72rem;">${item.type}</span>
                </td>
                <td>
                  ${item.isVerified ? `
                    <span class="badge badge-verified" style="font-size: 0.72rem;">
                      ${Icons.check('w-3 h-3')}
                      <span>✓ Verified</span>
                    </span>
                  ` : `
                    <span class="badge badge-unverified" style="font-size: 0.72rem;">
                      ${Icons.alertTriangle('w-3 h-3')}
                      <span>Unverified</span>
                    </span>
                  `}
                </td>
                <td style="text-align: right; white-space: nowrap;">
                  <button class="btn btn-secondary btn-sm btn-view-report" data-id="${item.id}" style="padding: 0.3rem 0.65rem;">
                    View
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function attachReportsEvents(container) {
  const viewBtns = container.querySelectorAll('.btn-view-report');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      store.setActiveNav('timeline');
      setTimeout(() => {
        const el = document.getElementById(`record-${id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
  });
}
