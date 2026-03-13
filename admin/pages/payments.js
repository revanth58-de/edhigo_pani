import { api } from '../api.js';

let allPayments = [];
let page = 1;
const PER_PAGE = 8;

export async function loadPayments() {
  const el = document.getElementById('page-payments');
  el.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Payments &amp; <span style="color:var(--primary)">Financials</span></div>
        <div class="section-sub">Monitor platform-wide transaction health, track revenue performance.</div>
      </div>
      <div class="section-controls">
        <button class="btn btn-outline btn-sm" id="exportCsvBtn">⬇ Export CSV</button>
      </div>
    </div>

    <div class="stats-grid" id="payKpis" style="margin-bottom:20px">
      <div class="table-loading"><div class="spinner"></div></div>
    </div>

    <div class="table-wrap">
      <div class="card-header" style="padding:16px 20px">
        <div class="card-title">Recent Transactions</div>
        <select class="filter-select" id="payStatusFilter">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <div class="table-scroll">
        <table>
          <thead><tr>
            <th>Transaction ID</th><th>Job ID</th><th>Farmer → Worker</th>
            <th>Date</th><th>Method</th><th>Status</th><th>Amount</th><th>Action</th>
          </tr></thead>
          <tbody id="paymentsBody"><tr><td colspan="8" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
      <div class="pagination" id="payPagination" style="display:none"></div>
    </div>`;

  el.querySelector('#payStatusFilter').addEventListener('change', () => { page=1; renderPayments(); });
  el.querySelector('#exportCsvBtn').addEventListener('click', exportCsv);

  try {
    const data = await api.getPayments();
    allPayments = data.payments || [];

    // KPIs
    const total  = allPayments.reduce((s,p)=>s+(p.amount||0), 0);
    const done   = allPayments.filter(p=>p.status==='completed').reduce((s,p)=>s+(p.amount||0), 0);
    const pending= allPayments.filter(p=>p.status==='pending').reduce((s,p)=>s+(p.amount||0), 0);
    const count  = allPayments.length;
    document.getElementById('payKpis').innerHTML = `
      ${kpi('₹'+done.toLocaleString('en-IN'), 'Total Paid', '↑ +12.5%', true)}
      ${kpi('₹'+Math.round(total*0.1).toLocaleString('en-IN'), 'Platform Commission', '↑ +8.2%', true)}
      ${kpi('₹'+pending.toLocaleString('en-IN'), 'Pending Payouts', count + ' active jobs', null)}
      ${kpi(count.toLocaleString(), 'Transactions', '', null)}`;

    renderPayments();
  } catch(e) {
    document.getElementById('paymentsBody').innerHTML = `<tr><td colspan="8" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function kpi(val, label, sub, up) {
  const subHtml = up === true  ? `<div style="font-size:12px;color:var(--primary-dark);font-weight:700;margin-top:4px">↑ ${sub}</div>`
                : up === false ? `<div style="font-size:12px;color:var(--danger);font-weight:700;margin-top:4px">↓ ${sub}</div>`
                : sub ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${sub}</div>` : '';
  return `<div class="stat-card"><div class="stat-value" style="font-size:22px">${val}</div><div class="stat-label">${label}</div>${subHtml}</div>`;
}

function renderPayments() {
  const status = document.getElementById('payStatusFilter')?.value || '';
  const filtered = allPayments.filter(p => !status || p.status === status);
  const total = filtered.length;
  const totalPages = Math.ceil(total / PER_PAGE);
  if (page > totalPages) page = 1;
  const slice = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const statusBadge = s => ({completed:'badge-green',pending:'badge-yellow',failed:'badge-red'}[s]||'badge-gray');
  const methodIcon  = m => m==='UPI' ? '🏦' : m==='cash'||m==='Cash' ? '💵' : '💳';

  document.getElementById('paymentsBody').innerHTML = slice.map((p,i) => {
    const txId = `#TRX-${String(i+1).padStart(5,'0')}`;
    const jobId = `JOB-${p.jobId?.slice(-4)?.toUpperCase()||'????'}`;
    return `<tr>
      <td style="font-weight:700;color:var(--text)">${txId}</td>
      <td style="color:var(--primary-dark);font-weight:600">${jobId}</td>
      <td>
        <div style="font-size:13px">${p.farmer?.name||'—'}</div>
        <div style="font-size:12px;color:var(--text-muted)">→ ${p.worker?.name||'—'}</div>
      </td>
      <td style="color:var(--text-muted);font-size:13px">${new Date(p.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
      <td>${methodIcon(p.method)} ${p.method||'—'}</td>
      <td><span class="badge ${statusBadge(p.status)}">${p.status}</span></td>
      <td style="font-weight:800">₹${(p.amount||0).toLocaleString('en-IN')}</td>
      <td>
        ${p.status!=='completed'
          ? `<button class="btn btn-success btn-xs" onclick="window._markPay('${p.id}')">✓ Complete</button>`
          : `<span style="color:var(--text-dim);font-size:12px">Done</span>`}
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="8" class="table-empty">No payments found.</td></tr>`;

  const pag = document.getElementById('payPagination');
  if (total > 0) {
    pag.style.display = 'flex';
    const btns = [];
    btns.push(`<button class="btn btn-outline btn-sm" onclick="window._payPage(${page-1})" ${page<=1?'disabled':''}>Previous</button>`);
    if (totalPages > 1) for (let i=1;i<=Math.min(totalPages,5);i++) btns.push(`<button class="page-btn ${i===page?'active':''}" onclick="window._payPage(${i})">${i}</button>`);
    btns.push(`<button class="btn btn-primary btn-sm" onclick="window._payPage(${page+1})" ${page>=totalPages?'disabled':''}>Next</button>`);
    pag.innerHTML = `<div class="pagination-info">Showing ${total} of ${allPayments.length} transactions</div><div class="pagination-btns">${btns.join('')}</div>`;
  } else { pag.style.display = 'none'; }
}

window._payPage = (p) => { page = p; renderPayments(); };

window._markPay = async (id) => {
  try {
    await api.updatePayment(id, { status: 'completed' });
    const p = allPayments.find(p => p.id === id);
    if (p) p.status = 'completed';
    renderPayments();
    window.showToast('Payment marked as completed');
  } catch(e) { window.showToast(e.message,'error'); }
};

function exportCsv() {
  const rows = [['TxID','Farmer','Worker','Amount','Method','Status','Date']];
  allPayments.forEach((p,i) => rows.push([
    `TRX-${i+1}`, p.farmer?.name||'', p.worker?.name||'',
    p.amount||0, p.method||'', p.status, new Date(p.createdAt).toLocaleDateString()
  ]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = `data:text/csv,${encodeURIComponent(csv)}`;
  a.download = `payments_${Date.now()}.csv`;
  a.click();
  window.showToast('CSV exported');
}
