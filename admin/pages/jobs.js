import { api } from '../api.js';

let allJobs = [];
let page = 1;
const PER_PAGE = 10;

export async function loadJobs() {
  const el = document.getElementById('page-jobs');
  el.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Job Management</div>
        <div class="section-sub">Monitor and manage all posted farm jobs.</div>
      </div>
    </div>

    <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
      <div class="search-box" style="flex:1;min-width:220px">
        <span class="search-icon">🔍</span>
        <input type="text" id="jobSearch" placeholder="Search by work type, farmer or village..." />
      </div>
      <select class="filter-select" id="jobStatusFilter">
        <option value="">📋 Status: All</option>
        <option value="pending">Pending</option>
        <option value="accepted">Accepted</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <select class="filter-select" id="jobTypeFilter">
        <option value="">🌾 Type: All</option>
        <option value="Harvesting">Harvesting</option>
        <option value="Sowing">Sowing</option>
        <option value="Irrigation">Irrigation</option>
        <option value="Labour">Labour</option>
        <option value="Tractor">Tractor</option>
      </select>
    </div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th>Work Type</th><th>Farmer</th><th>Village</th>
            <th>Workers</th><th>Pay/Day</th><th>Status</th>
            <th>Attendance</th><th>Date</th><th>Action</th>
          </tr></thead>
          <tbody id="jobsBody"><tr><td colspan="9" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
      <div class="pagination" id="jobsPagination" style="display:none"></div>
    </div>`;

  el.querySelector('#jobSearch').addEventListener('input', () => { page = 1; renderJobs(); });
  el.querySelector('#jobStatusFilter').addEventListener('change', () => { page = 1; renderJobs(); });
  el.querySelector('#jobTypeFilter').addEventListener('change', () => { page = 1; renderJobs(); });

  try {
    const data = await api.getJobs();
    allJobs = data.jobs || [];
    renderJobs();
  } catch (e) {
    document.getElementById('jobsBody').innerHTML = `<tr><td colspan="9" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function renderJobs() {
  const status  = document.getElementById('jobStatusFilter')?.value || '';
  const type    = document.getElementById('jobTypeFilter')?.value || '';
  const search  = document.getElementById('jobSearch')?.value.toLowerCase() || '';

  const filtered = allJobs.filter(j =>
    (!status || j.status === status) &&
    (!type   || j.workType === type) &&
    (!search || `${j.workType} ${j.farmer?.name} ${j.farmer?.village} ${j.farmAddress}`.toLowerCase().includes(search))
  );

  const total = filtered.length;
  const totalPages = Math.ceil(total / PER_PAGE) || 1;
  if (page > totalPages) page = 1;
  const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const statusBadge = s => ({
    pending: 'badge-blue', accepted: 'badge-yellow', completed: 'badge-green',
    cancelled: 'badge-red', in_progress: 'badge-purple'
  }[s] || 'badge-gray');

  const rows = slice.map(j => `
    <tr>
      <td><strong>${j.workType}</strong></td>
      <td>${j.farmer?.name || '—'}<br><span style="color:var(--text-muted);font-size:12px">${j.farmer?.phone || ''}</span></td>
      <td style="color:var(--text-muted)">${j.farmer?.village || '—'}</td>
      <td>${j.workersNeeded}</td>
      <td>₹${j.payPerDay}/day</td>
      <td><span class="badge ${statusBadge(j.status)}">${j.status}</span></td>
      <td>${j._count?.attendances ?? 0}</td>
      <td style="color:var(--text-muted);font-size:13px">${new Date(j.createdAt).toLocaleDateString()}</td>
      <td>
        <select class="filter-select" style="font-size:13px;padding:6px"
          onchange="window._updateJobStatus('${j.id}', this.value)">
          <option value="">Change status...</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </td>
    </tr>`).join('') || `<tr><td colspan="9" class="table-empty">No jobs found.</td></tr>`;

  document.getElementById('jobsBody').innerHTML = rows;

  // ── Pagination ──
  const pag = document.getElementById('jobsPagination');
  if (totalPages > 1) {
    pag.style.display = 'flex';
    const btns = [];
    btns.push(`<button class="page-btn" onclick="window._jobsPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹</button>`);

    // Smart page range: show first, last, current ±1, with ellipsis
    const range = new Set([1, totalPages, page, page - 1, page + 1].filter(p => p >= 1 && p <= totalPages));
    let prev = 0;
    [...range].sort((a, b) => a - b).forEach(p => {
      if (prev && p - prev > 1) btns.push(`<span class="page-btn" style="pointer-events:none">…</span>`);
      btns.push(`<button class="page-btn ${p === page ? 'active' : ''}" onclick="window._jobsPage(${p})">${p}</button>`);
      prev = p;
    });

    btns.push(`<button class="page-btn" onclick="window._jobsPage(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>›</button>`);
    pag.innerHTML = `<div class="pagination-info">Showing ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, total)} of ${total} jobs</div><div class="pagination-btns">${btns.join('')}</div>`;
  } else {
    pag.style.display = total > 0 ? 'flex' : 'none';
    pag.innerHTML = `<div class="pagination-info">Showing ${total} job${total !== 1 ? 's' : ''}</div><div></div>`;
  }
}

window._jobsPage = (p) => { page = p; renderJobs(); };

window._updateJobStatus = async (id, status) => {
  if (!status) return;
  try {
    await api.updateJob(id, { status });
    const job = allJobs.find(j => j.id === id);
    if (job) job.status = status;
    renderJobs();
    window.showToast('Job status updated');
  } catch (e) {
    window.showToast(e.message, 'error');
  }
};
