import { api } from '../api.js';

let allGroups = [];
let sortField = 'createdAt';
let sortOrder = 'desc';

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
            <th></th>
            <th class="sort-header" data-sort="name">Group Name <span id="sort-name-icon">↕</span></th>
            <th class="sort-header" data-sort="leader">Leader <span id="sort-leader-icon">↕</span></th>
            <th class="sort-header" data-sort="members">Members <span id="sort-members-icon">↕</span></th>
            <th class="sort-header" data-sort="status">Status <span id="sort-status-icon">↕</span></th>
            <th class="sort-header" data-sort="createdAt">Created <span id="sort-createdAt-icon">↕</span></th>
          </tr></thead>
          <tbody id="groupsBody"><tr><td colspan="6" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
    </div>`;

  el.querySelectorAll('.sort-header').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.dataset.sort;
      if (sortField === field) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortOrder = 'asc';
      }
      renderGroups();
    });
  });

  try {
    const data = await api.getGroups();
    allGroups = data.groups || [];
    renderGroups();
  } catch (e) {
    document.getElementById('groupsBody').innerHTML = `<tr><td colspan="6" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function renderGroups() {
  const sorted = [...allGroups].sort((a, b) => {
    let valA, valB;
    if (sortField === 'leader') {
      valA = a.leader?.name || '';
      valB = b.leader?.name || '';
    } else if (sortField === 'members') {
      valA = a.members?.length || 0;
      valB = b.members?.length || 0;
    } else if (sortField === 'createdAt') {
      valA = new Date(a.createdAt || 0);
      valB = new Date(b.createdAt || 0);
    } else {
      valA = a[sortField] || '';
      valB = b[sortField] || '';
    }

    if (typeof valA === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Update sort icons after DOM elements are drawn
  setTimeout(() => {
    document.querySelectorAll('.sort-header span').forEach(span => {
      span.textContent = '↕';
      span.style.color = 'var(--text-dim)';
    });
    const activeIcon = document.getElementById(`sort-${sortField}-icon`);
    if (activeIcon) {
      activeIcon.textContent = sortOrder === 'asc' ? '↑' : '↓';
      activeIcon.style.color = 'var(--primary)';
    }
  }, 0);

  const rows = sorted.flatMap((g, i) => {
    const memberChips = (g.members || []).map(m => {
      const w = m.worker;
      if (!w) return '';
      return `<div class="member-chip" style="${w.id ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${w.id ? `window._inspectUser('${w.id}')` : ''}">👷 ${w.name || '—'}</div>`;
    }).filter(Boolean);
    const hasMembers = memberChips.length > 0;
    const statusBadge = g.status === 'available' ? 'badge-green' : 'badge-gray';
    
    return [
      `<tr>
        <td>
          ${hasMembers ? `<button class="expand-btn" id="exp-${i}" onclick="window._toggleGroup(${i})">▶</button>` : ''}
        </td>
        <td><strong>${g.name || '—'}</strong></td>
        <td>
          <span style="${g.leader?.id ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${g.leader?.id ? `window._inspectUser('${g.leader.id}')` : ''}"><strong>${g.leader?.name || '—'}</strong></span>
          <br><span style="color:var(--text-muted);font-size:12px">${g.leader?.phone||''}</span>
        </td>
        <td>${memberChips.length}</td>
        <td><span class="badge ${statusBadge}">${g.status || 'forming'}</span></td>
        <td style="color:var(--text-muted);font-size:13px">${new Date(g.createdAt).toLocaleDateString()}</td>
      </tr>`,
      hasMembers ? `
      <tr class="sub-row" id="sub-${i}" style="display:none">
        <td colspan="6">
          <div class="sub-row-inner">
            <div style="font-size:13px;font-weight:700;color:var(--text-muted);margin-bottom:8px">MEMBERS</div>
            <div class="member-chips">
              ${memberChips.join('')}
            </div>
          </div>
        </td>
      </tr>` : ''
    ];
  }).join('') || `<tr><td colspan="6" class="table-empty">No groups yet.</td></tr>`;

  document.getElementById('groupsBody').innerHTML = rows;
}

window._toggleGroup = (i) => {
  const sub = document.getElementById(`sub-${i}`);
  const btn = document.getElementById(`exp-${i}`);
  const isOpen = sub.style.display !== 'none';
  sub.style.display = isOpen ? 'none' : 'table-row';
  btn.classList.toggle('open', !isOpen);
};
