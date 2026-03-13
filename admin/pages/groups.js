import { api } from '../api.js';

export async function loadGroups() {
  const el = document.getElementById('page-groups');
  el.innerHTML = `
    <div class="section-header">
      <div class="section-title">Worker Groups</div>
    </div>
    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th></th><th>Group Name</th><th>Leader</th>
            <th>Members</th><th>Status</th><th>Created</th>
          </tr></thead>
          <tbody id="groupsBody"><tr><td colspan="6" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
    </div>`;

  try {
    const data = await api.getGroups();
    const groups = data.groups || [];
    const rows = groups.flatMap((g, i) => {
      const memberNames = (g.members || []).map(m => m.worker?.name || '?');
      const hasMembers = memberNames.length > 0;
      const statusBadge = g.status === 'available' ? 'badge-green' : 'badge-gray';
      return [
        `<tr>
          <td>
            ${hasMembers ? `<button class="expand-btn" id="exp-${i}" onclick="window._toggleGroup(${i})">▶</button>` : ''}
          </td>
          <td><strong>${g.name || '—'}</strong></td>
          <td>${g.leader?.name || '—'}<br><span style="color:var(--text-muted);font-size:12px">${g.leader?.phone||''}</span></td>
          <td>${memberNames.length}</td>
          <td><span class="badge ${statusBadge}">${g.status || 'forming'}</span></td>
          <td style="color:var(--text-muted);font-size:13px">${new Date(g.createdAt).toLocaleDateString()}</td>
        </tr>`,
        hasMembers ? `
        <tr class="sub-row" id="sub-${i}" style="display:none">
          <td colspan="6">
            <div class="sub-row-inner">
              <div style="font-size:13px;font-weight:700;color:var(--text-muted);margin-bottom:8px">MEMBERS</div>
              <div class="member-chips">
                ${memberNames.map(n => `<div class="member-chip">👷 ${n}</div>`).join('')}
              </div>
            </div>
          </td>
        </tr>` : ''
      ];
    }).join('') || `<tr><td colspan="6" class="table-empty">No groups yet.</td></tr>`;

    document.getElementById('groupsBody').innerHTML = rows;
  } catch (e) {
    document.getElementById('groupsBody').innerHTML = `<tr><td colspan="6" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

window._toggleGroup = (i) => {
  const sub = document.getElementById(`sub-${i}`);
  const btn = document.getElementById(`exp-${i}`);
  const isOpen = sub.style.display !== 'none';
  sub.style.display = isOpen ? 'none' : 'table-row';
  btn.classList.toggle('open', !isOpen);
};
