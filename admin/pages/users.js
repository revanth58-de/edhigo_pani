import { api } from '../api.js';

let allUsers = [];

export async function loadUsers() {
  const el = document.getElementById('page-users');
  el.innerHTML = `
    <div class="section-header">
      <div class="section-title">Users</div>
      <div class="section-controls">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="userSearch" placeholder="Search name, phone, village..." />
        </div>
        <select class="filter-select" id="userRoleFilter">
          <option value="">All Roles</option>
          <option value="farmer">Farmer</option>
          <option value="worker">Worker</option>
          <option value="leader">Leader</option>
        </select>
      </div>
    </div>
    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th>Name</th><th>Phone</th><th>Role</th>
            <th>Village</th><th>Status</th><th>Rating</th>
            <th>Jobs</th><th>Joined</th><th>Actions</th>
          </tr></thead>
          <tbody id="usersBody"><tr><td colspan="9" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
    </div>`;

  el.querySelector('#userSearch').addEventListener('input', renderUsers);
  el.querySelector('#userRoleFilter').addEventListener('change', renderUsers);

  try {
    const data = await api.getUsers();
    allUsers = data.users || [];
    renderUsers();
  } catch (e) {
    document.getElementById('usersBody').innerHTML = `<tr><td colspan="9" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function renderUsers() {
  const search = document.getElementById('userSearch')?.value.toLowerCase() || '';
  const role = document.getElementById('userRoleFilter')?.value || '';
  const filtered = allUsers.filter(u =>
    (!role || u.role === role) &&
    (!search || `${u.name} ${u.phone} ${u.village}`.toLowerCase().includes(search))
  );

  const statusBadge = s => s === 'active' ? 'badge-green' : 'badge-red';
  const roleBadge = r => r === 'farmer' ? 'badge-blue' : r === 'leader' ? 'badge-purple' : 'badge-yellow';

  const rows = filtered.map(u => `
    <tr>
      <td><strong>${u.name || '—'}</strong></td>
      <td style="color:var(--text-muted)">${u.phone}</td>
      <td><span class="badge ${roleBadge(u.role)}">${u.role}</span></td>
      <td>${u.village || '—'}</td>
      <td><span class="badge ${statusBadge(u.status || 'active')}">${u.status || 'active'}</span></td>
      <td>${u.ratingAvg ? '⭐ ' + Number(u.ratingAvg).toFixed(1) : '—'}</td>
      <td>${u._count?.jobsPosted ?? u._count?.attendances ?? 0}</td>
      <td style="color:var(--text-muted);font-size:13px">${new Date(u.createdAt).toLocaleDateString()}</td>
      <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" onclick="window._editUser('${u.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="window._deleteUser('${u.id}', '${u.name}')">🗑️</button>
        </div>
      </td>
    </tr>`).join('') || `<tr><td colspan="9" class="table-empty">No users found.</td></tr>`;

  document.getElementById('usersBody').innerHTML = rows;
}

window._editUser = (id) => {
  const u = allUsers.find(u => u.id === id);
  if (!u) return;
  document.getElementById('editUserSubtitle').textContent = `${u.phone} · ${u.id}`;
  document.getElementById('editUserName').value = u.name || '';
  document.getElementById('editUserRole').value = u.role || 'worker';
  document.getElementById('editUserStatus').value = u.status || 'active';
  document.getElementById('editUserVillage').value = u.village || '';
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
      window.showToast('User updated successfully');
      await loadUsers();
    } catch (e) {
      window.showToast(e.message, 'error');
    }
  };
};

document.getElementById('editUserCancel')?.addEventListener('click', () => {
  document.getElementById('editUserModal').classList.remove('open');
});

window._deleteUser = async (id, name) => {
  if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
  try {
    await api.deleteUser(id);
    allUsers = allUsers.filter(u => u.id !== id);
    renderUsers();
    window.showToast('User deleted');
  } catch (e) {
    window.showToast(e.message, 'error');
  }
};
