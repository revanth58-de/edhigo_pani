import { api } from '../api.js';

export async function loadAttendance() {
  const el = document.getElementById('page-attendance');
  el.innerHTML = `
    <div class="section-header">
      <div class="section-title">Attendance Records</div>
    </div>
    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th>Worker</th><th>Phone</th><th>Job Type</th>
            <th>Farm Address</th><th>Check-In</th><th>Check-Out</th><th>Date</th>
          </tr></thead>
          <tbody id="attendanceBody"><tr><td colspan="7" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
    </div>`;

  try {
    const data = await api.getAttendance();
    const records = data.records || [];
    const rows = records.map(r => `
      <tr>
        <td><strong>${r.worker?.name || '—'}</strong></td>
        <td style="color:var(--text-muted)">${r.worker?.phone || '—'}</td>
        <td>${r.job?.workType || '—'}</td>
        <td style="color:var(--text-muted);font-size:13px">${r.job?.farmAddress || '—'}</td>
        <td>${r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}</td>
        <td>${r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '<span style="color:var(--warning)">Not out</span>'}</td>
        <td style="color:var(--text-muted);font-size:13px">${new Date(r.createdAt).toLocaleDateString()}</td>
      </tr>`).join('') || `<tr><td colspan="7" class="table-empty">No attendance records.</td></tr>`;
    document.getElementById('attendanceBody').innerHTML = rows;
  } catch (e) {
    document.getElementById('attendanceBody').innerHTML = `<tr><td colspan="7" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}
