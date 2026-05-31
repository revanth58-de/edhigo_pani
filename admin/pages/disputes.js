import { api } from '../api.js';
import { initials, avatarColor } from './stats.js';

let allDisputes = [];
let page = 1;
const PER_PAGE = 8;

export async function loadDisputes() {
  const el = document.getElementById('page-disputes');
  el.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Disputes Management</div>
        <div class="section-sub">Investigate and resolve user disputes regarding payments, hours worked, and no-shows.</div>
      </div>
    </div>

    <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
      <div class="search-box" style="flex:1;min-width:240px">
        <span class="search-icon">🔍</span>
        <input type="text" id="disputeSearch" placeholder="Search by initiator, category, or description..." />
      </div>
      <select class="filter-select" id="disputeStatusFilter">
        <option value="">⚡ Status: Any</option>
        <option value="pending">Pending</option>
        <option value="investigating">Investigating</option>
        <option value="resolved">Resolved</option>
        <option value="dismissed">Dismissed</option>
      </select>
    </div>
    <div id="disputeActiveFilters" class="active-filters"></div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th>Initiator</th><th>Category</th><th>Details</th>
            <th>Related Job/Payment</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody id="disputesBody"><tr><td colspan="6" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
      <div class="pagination" id="disputesPagination" style="display:none"></div>
    </div>`;

  el.querySelector('#disputeSearch').addEventListener('input', () => { page = 1; renderDisputes(); });
  el.querySelector('#disputeStatusFilter').addEventListener('change', () => { page = 1; renderDisputes(); });

  try {
    const data = await api.getDisputes();
    allDisputes = data.disputes || [];
    renderDisputes();
  } catch(e) {
    document.getElementById('disputesBody').innerHTML = `<tr><td colspan="6" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function renderDisputes() {
  const search = document.getElementById('disputeSearch')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('disputeStatusFilter')?.value || '';

  const chips = [];
  if (statusFilter) {
    chips.push(`<div class="filter-chip" onclick="document.getElementById('disputeStatusFilter').value='';document.getElementById('disputeStatusFilter').dispatchEvent(new Event('change'))">Status: ${statusFilter} ✕</div>`);
  }
  if (chips.length) {
    chips.push(`<div class="filter-chip" style="background:transparent;border-color:transparent;color:var(--text-muted)" onclick="document.getElementById('disputeStatusFilter').value='';document.getElementById('disputeSearch').value='';renderDisputesProxy()">Clear all</div>`);
  }
  document.getElementById('disputeActiveFilters').innerHTML = chips.join('');

  const filtered = allDisputes.filter(d => {
    const initiatorName = d.initiator?.name || '';
    const initiatorRole = d.initiator?.role || '';
    const matchesSearch = !search ||
      initiatorName.toLowerCase().includes(search) ||
      initiatorRole.toLowerCase().includes(search) ||
      d.category.toLowerCase().includes(search) ||
      d.description.toLowerCase().includes(search);
    const matchesStatus = !statusFilter || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / PER_PAGE);
  if (page > totalPages) page = 1;
  const slice = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const statusBadgeClass = s => {
    switch(s) {
      case 'pending': return 'badge-red';
      case 'investigating': return 'badge-yellow';
      case 'resolved': return 'badge-green';
      default: return 'badge-gray';
    }
  };

  const formatCategory = cat => {
    return cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatDate = dateStr => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  document.getElementById('disputesBody').innerHTML = slice.map(d => {
    const isClosed = d.status === 'resolved' || d.status === 'dismissed';
    return `
    <tr style="${isClosed ? 'opacity:0.8' : ''}">
      <td>
        <div class="user-cell">
          <div class="avatar" style="background:${avatarColor(d.initiator?.name||'')}">
            ${initials(d.initiator?.name||'')}
          </div>
          <div>
            <div class="user-cell-name">${d.initiator?.name||'System Admin'}</div>
            <div class="user-cell-id" style="text-transform: capitalize">${d.initiator?.role || 'admin'} · ${d.initiator?.phone || ''}</div>
          </div>
        </div>
      </td>
      <td>
        <span style="font-weight:600">${formatCategory(d.category)}</span>
      </td>
      <td>
        <div style="max-width:300px; word-break:break-word">
          <div style="font-size:13px;color:var(--text-main)">${d.description}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Filed on ${formatDate(d.createdAt)}</div>
          ${d.resolutionDetails ? `<div style="font-size:12px;color:var(--success);margin-top:8px;padding-top:4px;border-top:1px dashed #e2e8f0"><strong>Resolution:</strong> ${d.resolutionDetails}</div>` : ''}
        </div>
      </td>
      <td>
        <div style="font-size:12px;line-height:1.4">
          <div>💼 Job: #${d.jobId.slice(-4).toUpperCase()}</div>
          ${d.payment ? `<div>💳 Payment: ${d.payment.amount ? '₹' + d.payment.amount : '—'} (${d.payment.method.toUpperCase()})</div>` : ''}
        </div>
      </td>
      <td>
        <span class="badge ${statusBadgeClass(d.status)}">${d.status}</span>
      </td>
      <td>
        <div class="actions">
          ${d.status === 'pending' ? `
            <button class="btn btn-outline btn-xs" onclick="window._updateDisputeStatus('${d.id}', 'investigating')">🔍 Investigate</button>
          ` : ''}
          ${!isClosed ? `
            <button class="btn btn-primary btn-xs" onclick="window._openResolveDisputeModal('${d.id}', '${d.category}')">🎯 Resolve</button>
          ` : `<span style="font-size:11px;color:var(--text-muted)">Resolved ${formatDate(d.resolvedAt)}</span>`}
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" class="table-empty">No disputes found.</td></tr>`;

  // Pagination
  const pag = document.getElementById('disputesPagination');
  if (totalPages > 1) {
    pag.style.display = 'flex';
    const btns = [];
    btns.push(`<button class="page-btn" onclick="window._disputesPage(${page-1})" ${page<=1?'disabled':''}>‹</button>`);
    for (let i=1;i<=totalPages;i++) {
      btns.push(`<button class="page-btn ${i===page?'active':''}" onclick="window._disputesPage(${i})">${i}</button>`);
    }
    btns.push(`<button class="page-btn" onclick="window._disputesPage(${page+1})" ${page>=totalPages?'disabled':''}>›</button>`);
    pag.innerHTML = `<div class="pagination-info">Showing ${(page-1)*PER_PAGE+1} to ${Math.min(page*PER_PAGE,total)} of ${total} entries</div><div class="pagination-btns">${btns.join('')}</div>`;
  } else {
    pag.style.display = total > 0 ? 'flex' : 'none';
    pag.innerHTML = `<div class="pagination-info">Showing ${total} entries</div><div></div>`;
  }
}

window._disputesPage = (p) => { page = p; renderDisputes(); };
window.renderDisputesProxy = () => { page=1; renderDisputes(); };

window._updateDisputeStatus = async (id, status) => {
  try {
    await api.updateDispute(id, { status });
    window.showToast(`Dispute status updated to ${status}`);
    const d = allDisputes.find(x => x.id === id);
    if (d) d.status = status;
    renderDisputes();
  } catch(e) { window.showToast(e.message, 'error'); }
};

window._openResolveDisputeModal = (id, category) => {
  document.getElementById('resolveDisputeId').value = id;
  document.getElementById('resolveDisputeSubtitle').textContent = `Category: ${category.replace('_', ' ')}`;
  document.getElementById('resolveDisputeComments').value = '';
  document.getElementById('resolveDisputeModal').classList.add('open');
};

document.getElementById('resolveDisputeSubmit').addEventListener('click', async () => {
  const id = document.getElementById('resolveDisputeId').value;
  const status = document.getElementById('resolveDisputeStatus').value;
  const comments = document.getElementById('resolveDisputeComments').value;

  if (!comments.trim()) {
    window.showToast('Please enter resolution comments', 'error');
    return;
  }

  try {
    const res = await api.updateDispute(id, { status, resolutionDetails: comments });
    document.getElementById('resolveDisputeModal').classList.remove('open');
    window.showToast(`Dispute marked as ${status} ✓`);
    
    // Refresh disputes list
    const data = await api.getDisputes();
    allDisputes = data.disputes || [];
    renderDisputes();
  } catch(e) { window.showToast(e.message, 'error'); }
});
