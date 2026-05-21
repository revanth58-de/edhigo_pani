import { api } from '../api.js';

export async function loadAudit() {
  const container = document.getElementById('page-audit');
  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">System Audit Logs</div>
        <div class="section-sub">Track administrator actions and security events.</div>
      </div>
      <div class="section-controls">
        <button class="btn btn-outline btn-sm" id="exportAuditCsvBtn">⬇ Export CSV</button>
      </div>
    </div>
    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody id="auditBody">
            <tr><td colspan="5" class="table-loading"><div class="spinner"></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  try {
    const data = await api.getAuditLogs();
    const logs = data.logs || [];

    if (logs.length === 0) {
      document.getElementById('auditBody').innerHTML = `
        <tr>
          <td colspan="5" class="table-empty">
            No audit logs found.
          </td>
        </tr>`;
      return;
    }

    document.getElementById('exportAuditCsvBtn').onclick = () => exportAuditCsv(logs);

    document.getElementById('auditBody').innerHTML = logs.map(log => {
      const avatarColor = getAvatarColor(log.admin?.name || '');
      const initials = getInitials(log.admin?.name || '');
      const isRedBadge = log.action.includes('delete') || log.action.includes('suspend');

      return `
        <tr>
          <td>
            <div style="font-size: 14px; font-weight: 600;">${new Date(log.createdAt).toLocaleDateString()}</div>
            <div style="color: var(--text-dim); font-size: 12px; margin-top: 2px;">${new Date(log.createdAt).toLocaleTimeString()}</div>
          </td>
          <td>
            <div class="user-cell">
              <div class="avatar" style="background:${avatarColor}; font-size: 13px;">
                ${initials}
              </div>
              <div>
                <div class="user-cell-name">${log.admin?.name || 'Unknown Admin'}</div>
                <div class="user-cell-id">${log.admin?.phone || ''}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="badge ${isRedBadge ? 'badge-red' : 'badge-purple'}">
              ${log.action.replace('_', ' ').toUpperCase()}
            </span>
          </td>
          <td style="font-family: monospace; font-size: 12px; color: var(--text-muted);">
            ${log.targetId || '-'}
          </td>
          <td>
            <pre style="margin:0; font-family: monospace; font-size:11px; color:var(--text-muted); background:rgba(0,0,0,0.2); padding:6px 10px; border-radius:6px; border:1px solid var(--glass-border); max-height:80px; overflow-y:auto; max-width: 320px; white-space: pre-wrap;">${JSON.stringify(log.details || {}, null, 2)}</pre>
          </td>
        </tr>`;
    }).join('');

  } catch (error) {
    console.error('Failed to load audit logs:', error);
    document.getElementById('auditBody').innerHTML = `
      <tr>
        <td colspan="5" class="table-empty" style="color: var(--danger);">
          ❌ Failed to load audit logs.
        </td>
      </tr>`;
    window.showToast('Failed to load audit logs', 'error');
  }
}

function exportAuditCsv(logs) {
  const rows = [['Date/Time', 'Admin', 'Admin Phone', 'Action', 'Target ID', 'Details']];
  logs.forEach(log => rows.push([
    `"${new Date(log.createdAt).toLocaleDateString()} ${new Date(log.createdAt).toLocaleTimeString()}"`,
    `"${log.admin?.name || 'Unknown Admin'}"`,
    `"${log.admin?.phone || ''}"`,
    `"${log.action}"`,
    `"${log.targetId || ''}"`,
    `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`
  ]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = `data:text/csv,${encodeURIComponent(csv)}`;
  a.download = `audit_logs_${Date.now()}.csv`;
  a.click();
  window.showToast('CSV exported');
}

function getInitials(name = '') {
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (name[0]||'?').toUpperCase();
}

function getAvatarColor(name = '') {
  const colors = ['#22C55E','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#EC4899'];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}
