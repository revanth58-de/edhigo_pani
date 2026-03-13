import { api } from '../api.js';

let allPayments = [];

export async function loadPayments() {
  const el = document.getElementById('page-payments');
  el.innerHTML = `
    <div class="section-header">
      <div class="section-title">Payments</div>
      <div class="section-controls">
        <select class="filter-select" id="payStatusFilter">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>
    </div>
    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th>Farmer</th><th>Worker</th><th>Job Type</th>
            <th>Amount</th><th>Method</th><th>Status</th>
            <th>Date</th><th>Action</th>
          </tr></thead>
          <tbody id="paymentsBody"><tr><td colspan="8" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
    </div>`;

  el.querySelector('#payStatusFilter').addEventListener('change', renderPayments);

  try {
    const data = await api.getPayments();
    allPayments = data.payments || [];
    renderPayments();
  } catch (e) {
    document.getElementById('paymentsBody').innerHTML = `<tr><td colspan="8" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function renderPayments() {
  const status = document.getElementById('payStatusFilter')?.value || '';
  const filtered = allPayments.filter(p => !status || p.status === status);
  const statusBadge = s => ({ pending:'badge-yellow', completed:'badge-green', failed:'badge-red' }[s] || 'badge-gray');

  const rows = filtered.map(p => `
    <tr>
      <td>${p.farmer?.name || '—'}<br><span style="color:var(--text-muted);font-size:12px">${p.farmer?.phone||''}</span></td>
      <td>${p.worker?.name || '—'}<br><span style="color:var(--text-muted);font-size:12px">${p.worker?.phone||''}</span></td>
      <td>${p.job?.workType || '—'}</td>
      <td><strong>₹${(p.amount||0).toLocaleString()}</strong></td>
      <td style="color:var(--text-muted)">${p.method || '—'}</td>
      <td><span class="badge ${statusBadge(p.status)}">${p.status}</span></td>
      <td style="color:var(--text-muted);font-size:13px">${new Date(p.createdAt).toLocaleDateString()}</td>
      <td>
        ${p.status !== 'completed' ? `
          <button class="btn btn-success btn-sm" onclick="window._markPaymentComplete('${p.id}')">✅ Mark Complete</button>
        ` : '<span style="color:var(--text-dim);font-size:13px">Done</span>'}
      </td>
    </tr>`).join('') || `<tr><td colspan="8" class="table-empty">No payments found.</td></tr>`;

  document.getElementById('paymentsBody').innerHTML = rows;
}

window._markPaymentComplete = async (id) => {
  try {
    await api.updatePayment(id, { status: 'completed' });
    const p = allPayments.find(p => p.id === id);
    if (p) p.status = 'completed';
    renderPayments();
    window.showToast('Payment marked as completed');
  } catch (e) {
    window.showToast(e.message, 'error');
  }
};
