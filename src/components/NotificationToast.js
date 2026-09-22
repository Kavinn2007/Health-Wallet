import { store } from '../state/store.js';

export function renderNotificationToasts(state) {
  const toasts = state.toasts || [];
  if (toasts.length === 0) return '';

  return `
    <div class="toast-container" style="position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem; max-width: 380px;">
      ${toasts.map(t => {
        const isError = t.type === 'error';
        const isSuccess = t.type === 'success';

        let borderColor = 'var(--border-color)';
        let textColor = 'var(--text-primary)';
        let bgColor = 'var(--bg-card)';

        if (isError) {
          borderColor = 'var(--color-danger-border)';
          bgColor = 'var(--color-danger-bg)';
          textColor = 'var(--color-danger)';
        } else if (isSuccess) {
          borderColor = 'var(--primary-green)';
          bgColor = 'var(--light-green)';
          textColor = 'var(--dark-green)';
        }

        return `
          <div class="toast animate-fade-in" style="background: ${bgColor}; border: 1px solid ${borderColor}; padding: 0.85rem 1rem; border-radius: var(--radius-btn); box-shadow: var(--shadow-modal); display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;">
            <div style="font-size: 0.875rem; font-weight: 600; color: ${textColor}; line-height: 1.35;">
              ${t.message}
            </div>
            <button class="btn btn-ghost btn-sm btn-dismiss-toast" data-id="${t.id}" style="padding: 0.15rem 0.35rem; font-size: 0.9rem; color: var(--text-secondary); cursor: pointer;">
              ✕
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function attachNotificationEvents(container) {
  const dismissBtns = container.querySelectorAll('.btn-dismiss-toast');
  dismissBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      store.removeToast(Number(id) || id);
    });
  });
}
