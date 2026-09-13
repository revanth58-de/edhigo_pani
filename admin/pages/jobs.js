import { api } from '../api.js';

let allJobs = [];
let page = 1;
const PER_PAGE = 10;
let sortField = 'workType';
let sortOrder = 'asc';

export async function loadJobs() {
  const el = document.getElementById('page-jobs');
  el.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Job Management &amp; <span style="color:var(--primary)">Wage Tracker</span></div>
        <div class="section-sub">Monitor posted jobs, track daily wage disbursements, and ensure minimum wage compliance across Agriculture and Construction sectors.</div>
      </div>
      <div class="section-controls">
        <button class="btn btn-outline btn-sm" id="exportJobsCsvBtn">⬇ Export CSV</button>
      </div>
    </div>

    <!-- Wage Tracking Live Metric Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:20px" id="jobWageSummaryCards">
      <div class="card" style="padding:16px">
        <div style="font-size:12px;color:var(--text-muted);font-weight:700">💼 Total Jobs Tracked</div>
        <div style="font-size:22px;font-weight:900;color:#fff;margin-top:4px" id="wageCardTotalJobs">0</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:2px">Active &amp; Completed</div>
      </div>
      <div class="card" style="padding:16px">
        <div style="font-size:12px;color:var(--text-muted);font-weight:700">💰 Tracked Wage Volume</div>
        <div style="font-size:22px;font-weight:900;color:var(--primary);margin-top:4px" id="wageCardTotalVolume">₹0</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:2px">Sum of (Pay/day × Workers)</div>
      </div>
      <div class="card" style="padding:16px">
        <div style="font-size:12px;color:var(--text-muted);font-weight:700">📊 Average Daily Wage</div>
        <div style="font-size:22px;font-weight:900;color:var(--accent);margin-top:4px" id="wageCardAvgWage">₹0</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:2px">Across all active contracts</div>
      </div>
      <div class="card" style="padding:16px">
        <div style="font-size:12px;color:var(--text-muted);font-weight:700">🏗️ Construction vs 🌾 Agri</div>
        <div style="font-size:18px;font-weight:900;color:#F59E0B;margin-top:4px" id="wageCardSectorSplit">0 / 0</div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:2px">Sector distribution ratio</div>
      </div>
    </div>

    <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
      <div class="search-box" style="flex:1;min-width:220px">
        <span class="search-icon">🔍</span>
        <input type="text" id="jobSearch" placeholder="Search by work type, farmer or village..." />
      </div>
      <select class="filter-select" id="jobSectorFilter">
        <option value="">🌐 Sector: All</option>
        <option value="agriculture">🌾 Agriculture</option>
        <option value="construction">🏗️ Construction &amp; Civil</option>
      </select>
      <select class="filter-select" id="jobStatusFilter">
        <option value="">📋 Status: All</option>
        <option value="pending">Pending</option>
        <option value="accepted">Accepted</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <select class="filter-select" id="jobTypeFilter">
        <option value="">⚙️ Type: All</option>
        <option value="Harvesting">Harvesting</option>
        <option value="Sowing">Sowing</option>
        <option value="Irrigation">Irrigation</option>
        <option value="Labour">Labour</option>
        <option value="Tractor">Tractor</option>
        <option value="Masonry">Masonry / మేస్త్రీ</option>
        <option value="Carpentry">Carpentry / వడ్రంగి</option>
        <option value="Plumbing">Plumbing / ప్లంబర్</option>
        <option value="Electrical">Electrical / ఎలక్ట్రీషియన్</option>
        <option value="Welding">Welding / వెల్డర్</option>
        <option value="Earthwork">Earthwork / మట్టి పనులు</option>
        <option value="Concrete">Concrete / కాంక్రీట్</option>
      </select>
    </div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th class="sort-header" data-sort="workType">Work Type &amp; Sector <span id="sort-workType-icon">↕</span></th>
            <th>Farmer / Employer</th>
            <th>Village</th>
            <th class="sort-header" data-sort="workersNeeded">Workers <span id="sort-workersNeeded-icon">↕</span></th>
            <th class="sort-header" data-sort="payPerDay">Wage &amp; Total <span id="sort-payPerDay-icon">↕</span></th>
            <th class="sort-header" data-sort="status">Status <span id="sort-status-icon">↕</span></th>
            <th class="sort-header" data-sort="attendanceCount">Attendance <span id="sort-attendanceCount-icon">↕</span></th>
            <th class="sort-header" data-sort="createdAt">Date <span id="sort-createdAt-icon">↕</span></th>
            <th>Action</th>
          </tr></thead>
          <tbody id="jobsBody"><tr><td colspan="10" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
      <div class="pagination" id="jobsPagination" style="display:none"></div>
    </div>`;

  el.querySelector('#jobSearch').addEventListener('input', () => { page = 1; renderJobs(); });
  el.querySelector('#jobSectorFilter').addEventListener('change', () => { page = 1; renderJobs(); });
  el.querySelector('#jobStatusFilter').addEventListener('change', () => { page = 1; renderJobs(); });
  el.querySelector('#jobTypeFilter').addEventListener('change', () => { page = 1; renderJobs(); });
  el.querySelector('#exportJobsCsvBtn').addEventListener('click', exportJobsCsv);

  el.querySelectorAll('.sort-header').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.dataset.sort;
      if (sortField === field) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortOrder = 'asc';
      }
      renderJobs();
    });
  });

  try {
    const data = await api.getJobs();
    allJobs = data.jobs || [];
    renderJobs();
  } catch (e) {
    document.getElementById('jobsBody').innerHTML = `<tr><td colspan="9" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function isConstructionJob(workType) {
  const wt = (workType || '').toLowerCase();
  return wt.includes('const') || wt.includes('mason') || wt.includes('carpenter') || wt.includes('plumb') ||
         wt.includes('electr') || wt.includes('weld') || wt.includes('paint') || wt.includes('earthwork') ||
         wt.includes('excavat') || wt.includes('concrete') || wt.includes('scaffold') || wt.includes('machinery') ||
         wt.includes('మట్టి') || wt.includes('కాంక్రీట్') || wt.includes('మేస్త్రీ') || wt.includes('వడ్రంగి') ||
         wt.includes('ప్లంబర్') || wt.includes('ఎలక్ట్రీషియన్') || wt.includes('వెల్డర్') || wt.includes('పెయింటర్');
}

function renderJobs() {
  const sector  = document.getElementById('jobSectorFilter')?.value || '';
  const status  = document.getElementById('jobStatusFilter')?.value || '';
  const type    = document.getElementById('jobTypeFilter')?.value || '';
  const search  = document.getElementById('jobSearch')?.value.toLowerCase() || '';

  // Update Live Wage Tracker KPIs
  const totalVolume = allJobs.reduce((sum, j) => sum + (Number(j.payPerDay || 0) * Number(j.workersNeeded || 1)), 0);
  const avgWage = allJobs.length ? Math.round(allJobs.reduce((sum, j) => sum + Number(j.payPerDay || 0), 0) / allJobs.length) : 0;
  const constJobsCount = allJobs.filter(j => isConstructionJob(j.workType)).length;
  const agriJobsCount = allJobs.length - constJobsCount;

  const elTotal = document.getElementById('wageCardTotalJobs');
  if (elTotal) elTotal.textContent = allJobs.length;
  const elVol = document.getElementById('wageCardTotalVolume');
  if (elVol) elVol.textContent = '₹' + totalVolume.toLocaleString('en-IN');
  const elAvg = document.getElementById('wageCardAvgWage');
  if (elAvg) elAvg.textContent = '₹' + avgWage.toLocaleString('en-IN') + '/day';
  const elSplit = document.getElementById('wageCardSectorSplit');
  if (elSplit) elSplit.textContent = `${constJobsCount} Const / ${agriJobsCount} Agri`;

  const filtered = allJobs.filter(j => {
    const isConst = isConstructionJob(j.workType);
    if (sector === 'construction' && !isConst) return false;
    if (sector === 'agriculture' && isConst) return false;
    return (!status || j.status === status) &&
      (!type   || (j.workType || '').toLowerCase().includes(type.toLowerCase())) &&
      (!search || `${j.workType} ${j.farmer?.name} ${j.farmer?.village} ${j.farmAddress}`.toLowerCase().includes(search));
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (sortField === 'attendanceCount') {
      valA = a._count?.attendances || 0;
      valB = b._count?.attendances || 0;
    }
    valA = valA || '';
    valB = valB || '';
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

  const total = filtered.length;
  const totalPages = Math.ceil(total / PER_PAGE) || 1;
  if (page > totalPages) page = 1;
  const slice = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const statusBadge = s => ({
    pending: 'badge-blue', accepted: 'badge-yellow', completed: 'badge-green',
    cancelled: 'badge-red', in_progress: 'badge-purple'
  }[s] || 'badge-gray');

  const rows = slice.map(j => {
    const isConst = isConstructionJob(j.workType);
    const totalWage = Number(j.payPerDay || 0) * Number(j.workersNeeded || 1);
    const sectorTag = isConst
      ? `<span class="badge" style="background:rgba(245,158,11,0.15);color:#F59E0B;border:1px solid rgba(245,158,11,0.3);font-size:10px;margin-top:4px;display:inline-block">🏗️ Construction</span>`
      : `<span class="badge" style="background:rgba(16,185,129,0.15);color:#10B981;border:1px solid rgba(16,185,129,0.3);font-size:10px;margin-top:4px;display:inline-block">🌾 Agriculture</span>`;

    return `
    <tr>
      <td>
        <strong style="cursor:pointer;text-decoration:underline;color:#fff" onclick="window._inspectJob('${j.id}')">${j.workType}</strong>
        <br>${sectorTag}
      </td>
      <td>${j.farmer?.name || '—'}<br><span style="color:var(--text-muted);font-size:12px">${j.farmer?.phone || ''}</span></td>
      <td style="color:var(--text-muted)">${j.farmer?.village || '—'}</td>
      <td><strong>${j.workersNeeded}</strong> workers</td>
      <td>
        <span style="font-weight:800;color:var(--primary)">₹${j.payPerDay}</span>/day
        <div style="font-size:11px;color:var(--text-dim)">Total: ₹${totalWage.toLocaleString('en-IN')}</div>
      </td>
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
    </tr>`;
  }).join('') || `<tr><td colspan="9" class="table-empty">No jobs found.</td></tr>`;

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

function exportJobsCsv() {
  const rows = [['ID', 'Work Type', 'Farmer Name', 'Farmer Phone', 'Village', 'Workers Needed', 'Pay Per Day', 'Status', 'Attendance Count', 'Created At']];
  allJobs.forEach(j => rows.push([
    `"${j.id}"`,
    `"${(j.workType || '').replace(/"/g, '""')}"`,
    `"${(j.farmer?.name || '').replace(/"/g, '""')}"`,
    `"${j.farmer?.phone || ''}"`,
    `"${(j.farmer?.village || '').replace(/"/g, '""')}"`,
    j.workersNeeded,
    j.payPerDay,
    `"${j.status}"`,
    j._count?.attendances ?? 0,
    `"${new Date(j.createdAt).toLocaleDateString()}"`
  ]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = `data:text/csv,${encodeURIComponent(csv)}`;
  a.download = `jobs_${Date.now()}.csv`;
  a.click();
  window.showToast('CSV exported');
}
