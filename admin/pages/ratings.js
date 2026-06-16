import { api } from '../api.js';

let allRatings = [];
let sortField = 'createdAt';
let sortOrder = 'desc';

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
            <th class="sort-header" data-sort="from">From <span id="sort-from-icon">↕</span></th>
            <th class="sort-header" data-sort="to">To <span id="sort-to-icon">↕</span></th>
            <th class="sort-header" data-sort="job">Job Type <span id="sort-job-icon">↕</span></th>
            <th class="sort-header" data-sort="rating">Rating <span id="sort-rating-icon">↕</span></th>
            <th>Feedback</th>
            <th class="sort-header" data-sort="createdAt">Date <span id="sort-createdAt-icon">↕</span></th>
          </tr></thead>
          <tbody id="ratingsBody"><tr><td colspan="6" class="table-loading"><div class="spinner"></div></td></tr></tbody>
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
      renderRatings();
    });
  });

  try {
    const data = await api.getRatings();
    allRatings = data.ratings || [];
    renderRatings();
  } catch (e) {
    document.getElementById('ratingsBody').innerHTML = `<tr><td colspan="6" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function renderRatings() {
  const sorted = [...allRatings].sort((a, b) => {
    let valA, valB;
    if (sortField === 'from') {
      valA = a.fromUser?.name || '';
      valB = b.fromUser?.name || '';
    } else if (sortField === 'to') {
      valA = a.toUser?.name || '';
      valB = b.toUser?.name || '';
    } else if (sortField === 'job') {
      valA = a.job?.workType || '';
      valB = b.job?.workType || '';
    } else if (sortField === 'createdAt') {
      valA = new Date(a.createdAt || 0);
      valB = new Date(b.createdAt || 0);
    } else {
      valA = a[sortField] || 0;
      valB = b[sortField] || 0;
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

  const stars = n => '⭐'.repeat(Math.round(n)) + ` (${Number(n).toFixed(1)})`;
  const roleBadge = r => r === 'farmer' ? 'badge-blue' : r === 'leader' ? 'badge-purple' : 'badge-yellow';

  const rows = sorted.map(r => `
    <tr>
      <td>
        <strong style="${r.fromUser?.id ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${r.fromUser?.id ? `window._inspectUser('${r.fromUser.id}')` : ''}">${r.fromUser?.name || '—'}</strong><br>
        <span class="badge ${roleBadge(r.fromUser?.role)} " style="margin-top:4px">${r.fromUser?.role||'?'}</span>
      </td>
      <td>
        <strong style="${r.toUser?.id ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${r.toUser?.id ? `window._inspectUser('${r.toUser.id}')` : ''}">${r.toUser?.name || '—'}</strong><br>
        <span class="badge ${roleBadge(r.toUser?.role)}" style="margin-top:4px">${r.toUser?.role||'?'}</span>
      </td>
      <td style="color:var(--text-muted);${r.job?.id ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${r.job?.id ? `window._inspectJob('${r.job.id}')` : ''}">${r.job?.workType || '—'}</td>
      <td>${stars(r.rating)}</td>
      <td style="color:var(--text-muted);font-size:13px;max-width:200px">${r.feedback || '—'}</td>
      <td style="color:var(--text-muted);font-size:13px">${new Date(r.createdAt).toLocaleDateString()}</td>
    </tr>`).join('') || `<tr><td colspan="6" class="table-empty">No ratings yet.</td></tr>`;
  
  document.getElementById('ratingsBody').innerHTML = rows;
}
