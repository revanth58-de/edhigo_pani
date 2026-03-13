import { api } from '../api.js';
import { initials, avatarColor } from './stats.js';

let allUsers = [];
let page = 1;
const PER_PAGE = 8;

export async function loadUsers() {
  const el = document.getElementById('page-users');
  el.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">User Management</div>
        <div class="section-sub">Control access and verify status for all network participants.</div>
      </div>
    </div>

    <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
      <div class="search-box" style="flex:1;min-width:240px">
        <span class="search-icon">🔍</span>
        <input type="text" id="userSearch" placeholder="Search by name, location or ID..." />
      </div>
      <select class="filter-select" id="userRoleFilter">
        <option value="">👤 Role: All</option>
        <option value="farmer">🌾 Farmer</option>
        <option value="worker">👷 Worker</option>
        <option value="leader">👑 Leader</option>
      </select>
      <select class="filter-select" id="userStatusFilter">
        <option value="">⚡ Status: Any</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </select>
    </div>
    <div id="activeFilters" class="active-filters"></div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th>User Name</th><th>Role</th><th>Location</th>
            <th>Status</th><th>Rating</th><th>Actions</th>
          </tr></thead>
          <tbody id="usersBody"><tr><td colspan="6" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
      <div class="pagination" id="usersPagination" style="display:none"></div>
    </div>`;

  el.querySelector('#userSearch').addEventListener('input', () => { page=1; renderUsers(); });
  el.querySelector('#userRoleFilter').addEventListener('change', () => { page=1; renderUsers(); });
  el.querySelector('#userStatusFilter').addEventListener('change', () => { page=1; renderUsers(); });

  try {
    const data = await api.getUsers();
    allUsers = data.users || [];
    renderUsers();
  } catch(e) {
    document.getElementById('usersBody').innerHTML = `<tr><td colspan="6" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function renderUsers() {
  const search = document.getElementById('userSearch')?.value.toLowerCase() || '';
  const role   = document.getElementById('userRoleFilter')?.value || '';
  const status = document.getElementById('userStatusFilter')?.value || '';

  // Active filter chips
  const chips = [];
  if (role)   chips.push(`<div class="filter-chip" onclick="document.getElementById('userRoleFilter').value='';document.getElementById('userRoleFilter').dispatchEvent(new Event('change'))">Role: ${role} ✕</div>`);
  if (status) chips.push(`<div class="filter-chip" onclick="document.getElementById('userStatusFilter').value='';document.getElementById('userStatusFilter').dispatchEvent(new Event('change'))">Status: ${status} ✕</div>`);
  if (chips.length) chips.push(`<div class="filter-chip" style="background:transparent;border-color:transparent;color:var(--text-muted)" onclick="document.getElementById('userRoleFilter').value='';document.getElementById('userStatusFilter').value='';document.getElementById('userSearch').value='';renderUsersProxy()">Clear all</div>`);
  document.getElementById('activeFilters').innerHTML = chips.join('');

  const filtered = allUsers.filter(u =>
    (!role   || u.role === role) &&
    (!status || (u.status||'active') === status) &&
    (!search || `${u.name} ${u.phone} ${u.village}`.toLowerCase().includes(search))
  );

  const total = filtered.length;
  const totalPages = Math.ceil(total / PER_PAGE);
  if (page > totalPages) page = 1;
  const slice = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const roleBadge = r => r==='farmer' ? 'badge-blue' : r==='leader' ? 'badge-purple' : 'badge-yellow';
  const statusBadge = s => s==='active'||!s ? 'badge-green' : 'badge-red';

  document.getElementById('usersBody').innerHTML = slice.map(u => `
    <tr>
      <td>
        <div class="user-cell">
          <div class="avatar" style="background:${avatarColor(u.name||'')}">${initials(u.name||'')}</div>
          <div>
            <div class="user-cell-name">${u.name||'—'}</div>
            <div class="user-cell-id">ID: #${u.id.slice(-4).toUpperCase()}</div>
          </div>
        </div>
      </td>
      <td><span class="badge ${roleBadge(u.role)}">${u.role}</span></td>
      <td style="color:var(--text-muted)">📍 ${u.village||'—'}</td>
      <td><span class="badge ${statusBadge(u.status)}">${u.status||'active'}</span></td>
      <td style="color:var(--warning)">★ ${u.ratingAvg ? Number(u.ratingAvg).toFixed(1) : '—'}${u.ratingCount ? ` <span style="color:var(--text-muted)">(${u.ratingCount})</span>` : ''}</td>
      <td>
        <div class="actions">
          <button class="btn btn-outline btn-xs" onclick="window._editUser('${u.id}')">✏ Edit</button>
          <button class="btn btn-danger btn-xs" onclick="window._deleteUser('${u.id}','${u.name}')">🗑</button>
        </div>
      </td>
    </tr>`).join('') || `<tr><td colspan="6" class="table-empty">No users found.</td></tr>`;

  // Pagination
  const pag = document.getElementById('usersPagination');
  if (totalPages > 1) {
    pag.style.display = 'flex';
    const btns = [];
    btns.push(`<button class="page-btn" onclick="window._usersPage(${page-1})" ${page<=1?'disabled':''}>‹</button>`);
    for (let i=1;i<=totalPages;i++) {
      btns.push(`<button class="page-btn ${i===page?'active':''}" onclick="window._usersPage(${i})">${i}</button>`);
    }
    btns.push(`<button class="page-btn" onclick="window._usersPage(${page+1})" ${page>=totalPages?'disabled':''}>›</button>`);
    pag.innerHTML = `<div class="pagination-info">Showing ${(page-1)*PER_PAGE+1} to ${Math.min(page*PER_PAGE,total)} of ${total} entries</div><div class="pagination-btns">${btns.join('')}</div>`;
  } else {
    pag.style.display = total > 0 ? 'flex' : 'none';
    pag.innerHTML = `<div class="pagination-info">Showing ${total} entries</div><div></div>`;
  }
}

window._usersPage = (p) => { page = p; renderUsers(); };
window.renderUsersProxy = () => { page=1; renderUsers(); };

window._editUser = (id) => {
  const u = allUsers.find(u => u.id === id);
  if (!u) return;
  document.getElementById('editUserSubtitle').textContent = `${u.phone} · ID ${u.id}`;
  document.getElementById('editUserName').value = u.name||'';
  document.getElementById('editUserRole').value = u.role||'worker';
  document.getElementById('editUserStatus').value = u.status||'active';
  document.getElementById('editUserVillage').value = u.village||'';
  document.getElementById('editUserModal').classList.add('open');

  document.getElementById('editUserSave').onclick = async () => {
    try {
      await api.updateUser(id, {
        name: document.getElementById('editUserName').value,
        role: document.getElementById('editUserRole').value,
        status: document.getElementById('editUserStatus').value,
        village: document.getElementById('editUserVillage').value,
      });
      document.getElementById('editUserModal').classList.remove('open');
      window.showToast('User updated');
      await loadUsers();
    } catch(e) { window.showToast(e.message,'error'); }
  };
};

window._deleteUser = async (id, name) => {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await api.deleteUser(id);
    allUsers = allUsers.filter(u => u.id !== id);
    renderUsers();
    window.showToast('User deleted');
  } catch(e) { window.showToast(e.message,'error'); }
};
