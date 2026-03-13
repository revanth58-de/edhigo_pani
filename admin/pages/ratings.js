import { api } from '../api.js';

export async function loadRatings() {
  const el = document.getElementById('page-ratings');
  el.innerHTML = `
    <div class="section-header">
      <div class="section-title">Ratings & Reviews</div>
    </div>
    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th>From</th><th>To</th><th>Job Type</th>
            <th>Rating</th><th>Feedback</th><th>Date</th>
          </tr></thead>
          <tbody id="ratingsBody"><tr><td colspan="6" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
    </div>`;

  try {
    const data = await api.getRatings();
    const ratings = data.ratings || [];
    const stars = n => '⭐'.repeat(Math.round(n)) + ` (${Number(n).toFixed(1)})`;
    const roleBadge = r => r === 'farmer' ? 'badge-blue' : r === 'leader' ? 'badge-purple' : 'badge-yellow';

    const rows = ratings.map(r => `
      <tr>
        <td>
          <strong>${r.fromUser?.name || '—'}</strong><br>
          <span class="badge ${roleBadge(r.fromUser?.role)} " style="margin-top:4px">${r.fromUser?.role||'?'}</span>
        </td>
        <td>
          <strong>${r.toUser?.name || '—'}</strong><br>
          <span class="badge ${roleBadge(r.toUser?.role)}" style="margin-top:4px">${r.toUser?.role||'?'}</span>
        </td>
        <td style="color:var(--text-muted)">${r.job?.workType || '—'}</td>
        <td>${stars(r.rating)}</td>
        <td style="color:var(--text-muted);font-size:13px;max-width:200px">${r.feedback || '—'}</td>
        <td style="color:var(--text-muted);font-size:13px">${new Date(r.createdAt).toLocaleDateString()}</td>
      </tr>`).join('') || `<tr><td colspan="6" class="table-empty">No ratings yet.</td></tr>`;
    document.getElementById('ratingsBody').innerHTML = rows;
  } catch (e) {
    document.getElementById('ratingsBody').innerHTML = `<tr><td colspan="6" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}
