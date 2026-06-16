import { api } from '../api.js';

let allAttendance = [];
let sortField = 'createdAt';
let sortOrder = 'desc';

export async function loadAttendance() {
  const el = document.getElementById('page-attendance');
  el.innerHTML = `
    <div class="section-header">
      <div class="section-title">Attendance Records</div>
      <div class="section-controls">
        <button class="btn btn-outline btn-sm" id="exportAttendanceCsvBtn">⬇ Export CSV</button>
      </div>
    </div>
    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th class="sort-header" data-sort="worker">Worker <span id="sort-worker-icon">↕</span></th>
            <th>Phone</th>
            <th>Job Type</th>
            <th>Farm Address</th>
            <th class="sort-header" data-sort="checkIn">Check-In <span id="sort-checkIn-icon">↕</span></th>
            <th class="sort-header" data-sort="checkOut">Check-Out <span id="sort-checkOut-icon">↕</span></th>
            <th class="sort-header" data-sort="createdAt">Date <span id="sort-createdAt-icon">↕</span></th>
          </tr></thead>
          <tbody id="attendanceBody"><tr><td colspan="7" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
    </div>`;

  el.querySelector('#exportAttendanceCsvBtn').addEventListener('click', exportAttendanceCsv);

  el.querySelectorAll('.sort-header').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.dataset.sort;
      if (sortField === field) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        sortField = field;
        sortOrder = 'asc';
      }
      renderAttendance();
    });
  });

  try {
    const data = await api.getAttendance();
    allAttendance = data.records || [];
    renderAttendance();
  } catch (e) {
    document.getElementById('attendanceBody').innerHTML = `<tr><td colspan="7" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function renderAttendance() {
  const sorted = [...allAttendance].sort((a, b) => {
    let valA, valB;
    if (sortField === 'worker') {
      valA = a.worker?.name || '';
      valB = b.worker?.name || '';
    } else if (sortField === 'checkIn') {
      valA = a.checkIn ? new Date(a.checkIn) : new Date(0);
      valB = b.checkIn ? new Date(b.checkIn) : new Date(0);
    } else if (sortField === 'checkOut') {
      valA = a.checkOut ? new Date(a.checkOut) : new Date(0);
      valB = b.checkOut ? new Date(b.checkOut) : new Date(0);
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

  const rows = sorted.map(r => `
    <tr>
      <td><strong style="${r.worker?.id ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${r.worker?.id ? `window._inspectUser('${r.worker.id}')` : ''}">${r.worker?.name || '—'}</strong></td>
      <td style="color:var(--text-muted)">${r.worker?.phone || '—'}</td>
      <td style="${r.job?.id ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${r.job?.id ? `window._inspectJob('${r.job.id}')` : ''}">${r.job?.workType || '—'}</td>
      <td style="color:var(--text-muted);font-size:13px">${r.job?.farmAddress || '—'}</td>
      <td>${r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}</td>
      <td>${r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '<span style="color:var(--warning)">Not out</span>'}</td>
      <td style="color:var(--text-muted);font-size:13px">${new Date(r.createdAt).toLocaleDateString()}</td>
    </tr>`).join('') || `<tr><td colspan="7" class="table-empty">No attendance records.</td></tr>`;
  
  document.getElementById('attendanceBody').innerHTML = rows;
}

function exportAttendanceCsv() {
  const rows = [['Worker', 'Phone', 'Job Type', 'Farm Address', 'Check-In', 'Check-Out', 'Date']];
  allAttendance.forEach(r => rows.push([
    `"${(r.worker?.name || '').replace(/"/g, '""')}"`,
    `"${r.worker?.phone || ''}"`,
    `"${(r.job?.workType || '').replace(/"/g, '""')}"`,
    `"${(r.job?.farmAddress || '').replace(/"/g, '""')}"`,
    r.checkIn ? `"${new Date(r.checkIn).toLocaleString()}"` : '',
    r.checkOut ? `"${new Date(r.checkOut).toLocaleString()}"` : '',
    `"${new Date(r.createdAt).toLocaleDateString()}"`
  ]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = `data:text/csv,${encodeURIComponent(csv)}`;
  a.download = `attendance_${Date.now()}.csv`;
  a.click();
  window.showToast('CSV exported');
}
