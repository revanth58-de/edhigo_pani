import { api } from '../api.js';

export async function loadStats() {
  const el = document.getElementById('page-stats');
  el.innerHTML = `<div class="table-loading"><div class="spinner"></div></div>`;

  try {
    const data = await api.getStats();
    const u = data.users, j = data.jobs, p = data.payments;

    el.innerHTML = `
      <div class="stats-grid">
        ${card('👥', u.total, 'Total Users', `bg:#3b82f620;color:#3b82f6`, breakdown(u.byRole))}
        ${card('💼', j.total, 'Total Jobs', `bg:#8b5cf620;color:#8b5cf6`, jobBreak(j.byStatus))}
        ${card('💳', '₹' + (p.revenue || 0).toLocaleString(), 'Revenue', `bg:#22c55e20;color:#22c55e`, `${p.total} payments`)}
        ${card('📋', data.attendance, 'Attendance Records', `bg:#f59e0b20;color:#f59e0b`, '')}
        ${card('⭐', data.ratings, 'Ratings Given', `bg:#ec489920;color:#ec4899`, '')}
        ${card('🫂', data.groups, 'Active Groups', `bg:#06b6d420;color:#06b6d4`, '')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px">
        ${roleCard(u.byRole)}
        ${statusCard(j.byStatus)}
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="table-empty">❌ Failed to load stats: ${e.message}</div>`;
  }
}

function card(icon, value, label, iconStyle, sub) {
  const [bg, color] = iconStyle.split(';').map(s => s.split(':')[1]);
  return `
    <div class="stat-card">
      <div class="stat-icon" style="background:${bg};color:${color}">${icon}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
    </div>`;
}

function breakdown(byRole) {
  return Object.entries(byRole || {}).map(([r, c]) => `${c} ${r}s`).join(' · ');
}

function jobBreak(byStatus) {
  return Object.entries(byStatus || {}).map(([s, c]) => `${c} ${s}`).join(' · ');
}

function roleCard(byRole) {
  const chips = Object.entries(byRole || {}).map(([r, c]) => `
    <div class="role-chip">
      <div class="role-chip-num">${c}</div>
      <div class="role-chip-label">${r}</div>
    </div>`).join('');
  return `
    <div class="table-wrap" style="padding:22px">
      <div class="section-title" style="margin-bottom:16px">Users by Role</div>
      <div class="role-row">${chips || '<span style="color:var(--text-muted)">No data</span>'}</div>
    </div>`;
}

function statusCard(byStatus) {
  const colors = { open:'badge-blue', accepted:'badge-yellow', completed:'badge-green', cancelled:'badge-red', 'in-progress':'badge-purple' };
  const rows = Object.entries(byStatus || {}).map(([s, c]) => `
    <tr>
      <td><span class="badge ${colors[s]||'badge-gray'}">${s}</span></td>
      <td style="font-weight:700;font-size:18px">${c}</td>
    </tr>`).join('');
  return `
    <div class="table-wrap" style="padding:22px">
      <div class="section-title" style="margin-bottom:16px">Jobs by Status</div>
      <table><tbody>${rows || '<tr><td colspan="2" class="table-empty">No data</td></tr>'}</tbody></table>
    </div>`;
}
