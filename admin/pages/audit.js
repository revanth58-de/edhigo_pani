import { apiFetch } from '../api.js';

export async function loadAudit() {
  const container = document.getElementById('page-audit');
  container.innerHTML = `<div class="loading"></div>`;

  try {
    const data = await apiFetch('/admin/audit');

    if (!data.logs || data.logs.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div style="text-align:center; color:#64748B; padding: 2rem;">
            No audit logs found.
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="card" style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${data.logs.map(log => `
              <tr>
                <td>
                  <div style="font-size: 13px;">${new Date(log.createdAt).toLocaleDateString()}</div>
                  <div style="color: #64748b; font-size: 12px;">${new Date(log.createdAt).toLocaleTimeString()}</div>
                </td>
                <td>
                  <div class="user-cell">
                    <div class="avatar" style="background:#E2E8F0; color:#475569;">
                      ${log.admin?.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <div style="font-weight:600; color:#1E293B;">${log.admin?.name || 'Unknown Admin'}</div>
                      <div style="color:#64748B; font-size:12px;">${log.admin?.phone || ''}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge" style="
                    background: ${log.action.includes('delete') || log.action.includes('suspend') ? '#FEE2E2' : '#E0E7FF'};
                    color: ${log.action.includes('delete') || log.action.includes('suspend') ? '#991B1B' : '#3730A3'};
                  ">
                    ${log.action.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td style="font-family: monospace; font-size: 12px; color: #475569;">
                  ${log.targetId || '-'}
                </td>
                <td>
                  <pre style="margin:0; font-size:11px; background:#F8FAFC; padding:4px 8px; border-radius:4px; border:1px solid #E2E8F0; max-height:60px; overflow-y:auto;">${JSON.stringify(log.details || {}, null, 2)}</pre>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

  } catch (error) {
    console.error('Failed to load audit logs:', error);
    container.innerHTML = `
      <div class="card">
        <div style="text-align:center; color:#EF4444; padding: 2rem;">
          Failed to load audit logs. Please try again.
        </div>
      </div>
    `;
    window.showToast('Failed to load audit logs', 'error');
  }
}
