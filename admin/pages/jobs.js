import { api } from '../api.js';

let allJobs = [];

export async function loadJobs() {
  const el = document.getElementById('page-jobs');
  el.innerHTML = `
    <div class="section-header">
      <div class="section-title">Jobs</div>
      <div class="section-controls">
        <select class="filter-select" id="jobStatusFilter">
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="accepted">Accepted</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
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
    </div>`;

  el.querySelector('#jobStatusFilter').addEventListener('change', renderJobs);

  try {
    const data = await api.getJobs();
    allJobs = data.jobs || [];
    renderJobs();
  } catch (e) {
    document.getElementById('jobsBody').innerHTML = `<tr><td colspan="9" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function renderJobs() {
  const status = document.getElementById('jobStatusFilter')?.value || '';
  const filtered = allJobs.filter(j => !status || j.status === status);
  const statusBadge = s => ({
    open:'badge-blue', accepted:'badge-yellow', completed:'badge-green',
    cancelled:'badge-red', 'in-progress':'badge-purple'
  }[s] || 'badge-gray');

  const rows = filtered.map(j => `
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
          <option value="open">Open</option>
          <option value="accepted">Accepted</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </td>
    </tr>`).join('') || `<tr><td colspan="9" class="table-empty">No jobs found.</td></tr>`;

  document.getElementById('jobsBody').innerHTML = rows;
}

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
