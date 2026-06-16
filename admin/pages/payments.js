import { api } from '../api.js';

let allPayments = [];
let allSettlements = [];
let activeTab = 'transactions'; // 'transactions' or 'settlements'
let payPage = 1;
let settlePage = 1;
const PER_PAGE = 8;
let paySortField = 'createdAt';
let paySortOrder = 'desc';
let settleSortField = 'createdAt';
let settleSortOrder = 'desc';

export async function loadPayments() {
  const el = document.getElementById('page-payments');
  el.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Payments &amp; <span style="color:var(--primary)">Financials</span></div>
        <div class="section-sub">Monitor platform-wide transaction health, track platform commission, and manage worker manual payouts.</div>
      </div>
      <div class="section-controls">
        <button class="btn btn-outline btn-sm" id="exportCsvBtn">⬇ Export CSV</button>
      </div>
    </div>

    <div class="stats-grid" id="payKpis" style="margin-bottom:20px">
      <div class="table-loading"><div class="spinner"></div></div>
    </div>

    <!-- Premium Tab Control -->
    <div class="tab-container" style="display:flex;gap:12px;margin-bottom:20px;border-bottom:1px solid #E5E7EB;padding-bottom:10px">
      <button class="tab-btn active" id="tabTransactionsBtn" style="background:none;border:none;padding:8px 16px;font-weight:700;font-size:14px;color:var(--primary);cursor:pointer;border-bottom:3px solid var(--primary)">Transaction Logs</button>
      <button class="tab-btn" id="tabSettlementsBtn" style="background:none;border:none;padding:8px 16px;font-weight:700;font-size:14px;color:var(--text-muted);cursor:pointer">Pending Settlements</button>
    </div>

    <!-- Table Container -->
    <div class="table-wrap" id="paymentsContainer">
      <div class="card-header" style="padding:16px 20px;display:flex;justify-content:space-between;align-items:center">
        <div class="card-title" id="tableHeaderTitle">Recent Transactions</div>
        <select class="filter-select" id="payStatusFilter">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <div class="table-scroll">
        <table id="financialTable">
          <thead><tr id="tableHeaders"></tr></thead>
          <tbody id="financialBody"><tr><td colspan="8" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
      <div class="pagination" id="payPagination" style="display:none"></div>
    </div>`;

  // Attach Listeners
  el.querySelector('#tabTransactionsBtn').addEventListener('click', () => switchTab('transactions'));
  el.querySelector('#tabSettlementsBtn').addEventListener('click', () => switchTab('settlements'));
  el.querySelector('#payStatusFilter').addEventListener('change', () => { 
    if (activeTab === 'transactions') {
      payPage = 1;
    } else {
      settlePage = 1;
    }
    renderActiveTab(); 
  });
  el.querySelector('#exportCsvBtn').addEventListener('click', exportCsv);

  await loadData();
}

async function loadData() {
  try {
    const [payData, settleData, statsData] = await Promise.all([
      api.getPayments(),
      api.getSettlements(),
      api.getStats()
    ]);

    allPayments = payData.payments || [];
    allSettlements = settleData.settlements || [];
    const statsPay = statsData.payments || { total: 0, revenue: 0, pending: 0 };

    // Calculate Platform KPIs
    const done = statsPay.revenue;
    const pending = statsPay.pending;
    const count = statsPay.total;
    
    // Internal manual payout status KPI logic — shifted to backend statistics endpoint
    const totalCom = statsPay.commission || 0;
    const pendingSettleVal = statsPay.pendingSettlements || 0;

    document.getElementById('payKpis').innerHTML = `
      ${kpi('₹' + done.toLocaleString('en-IN'), 'Total Gross Revenue', 'Farmer deposits completed', true)}
      ${kpi('₹' + totalCom.toLocaleString('en-IN'), 'Dinasari 5% Commission', 'Net platform earnings', true)}
      ${kpi('₹' + pendingSettleVal.toLocaleString('en-IN'), 'Pending Manual Payouts', allSettlements.filter(s => s.status==='pending').length + ' settlements', null)}
      ${kpi(count.toLocaleString(), 'Farmer Payments Count', 'Total ledger entries', null)}`;

    renderActiveTab();
  } catch(e) {
    document.getElementById('financialBody').innerHTML = `<tr><td colspan="8" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function kpi(val, label, sub, up) {
  const subHtml = up === true  ? `<div style="font-size:12px;color:var(--primary-dark);font-weight:700;margin-top:4px">✓ ${sub}</div>`
                : sub ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${sub}</div>` : '';
  return `<div class="stat-card"><div class="stat-value" style="font-size:22px">${val}</div><div class="stat-label">${label}</div>${subHtml}</div>`;
}

function switchTab(tab) {
  activeTab = tab;
  const transBtn = document.getElementById('tabTransactionsBtn');
  const settleBtn = document.getElementById('tabSettlementsBtn');

  if (tab === 'transactions') {
    transBtn.style.color = 'var(--primary)';
    transBtn.style.borderBottom = '3px solid var(--primary)';
    settleBtn.style.color = 'var(--text-muted)';
    settleBtn.style.borderBottom = 'none';
    document.getElementById('tableHeaderTitle').textContent = 'Recent Transactions';
    document.getElementById('payStatusFilter').style.display = 'block';
  } else {
    settleBtn.style.color = 'var(--primary)';
    settleBtn.style.borderBottom = '3px solid var(--primary)';
    transBtn.style.color = 'var(--text-muted)';
    transBtn.style.borderBottom = 'none';
    document.getElementById('tableHeaderTitle').textContent = 'Pending Worker Payouts';
    document.getElementById('payStatusFilter').style.display = 'none';
  }
  renderActiveTab();
}

function renderActiveTab() {
  if (activeTab === 'transactions') {
    renderTransactions();
  } else {
    renderSettlements();
  }
}

function renderTransactions() {
  const headers = [
    { label: 'Transaction ID', sort: 'id' },
    { label: 'Booking ID' },
    { label: 'Farmer → Worker' },
    { label: 'Gross Paid', sort: 'amount' },
    { label: '5% Fee' },
    { label: '95% Worker Net' },
    { label: 'Method' },
    { label: 'Date', sort: 'createdAt' },
    { label: 'Status', sort: 'status' },
    { label: 'Action' }
  ];
  document.getElementById('tableHeaders').innerHTML = headers.map(h => {
    if (h.sort) {
      return `<th class="sort-header" data-sort="${h.sort}">${h.label} <span id="sort-${h.sort}-icon">↕</span></th>`;
    }
    return `<th>${h.label}</th>`;
  }).join('');

  // Re-attach event listeners to headers
  document.querySelectorAll('#financialTable th.sort-header').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.dataset.sort;
      if (paySortField === field) {
        paySortOrder = paySortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        paySortField = field;
        paySortOrder = 'asc';
      }
      renderActiveTab();
    });
  });

  const status = document.getElementById('payStatusFilter')?.value || '';
  const filtered = allPayments.filter(p => !status || p.status === status);

  const sorted = [...filtered].sort((a, b) => {
    let valA = a[paySortField];
    let valB = b[paySortField];
    if (paySortField === 'createdAt') {
      valA = new Date(valA || 0);
      valB = new Date(valB || 0);
    }
    valA = valA || '';
    valB = valB || '';
    if (typeof valA === 'string') {
      return paySortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      return paySortOrder === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Update sort icons after DOM elements are drawn
  setTimeout(() => {
    document.querySelectorAll('#financialTable th.sort-header span').forEach(span => {
      span.textContent = '↕';
      span.style.color = 'var(--text-dim)';
    });
    const activeIcon = document.getElementById(`sort-${paySortField}-icon`);
    if (activeIcon) {
      activeIcon.textContent = paySortOrder === 'asc' ? '↑' : '↓';
      activeIcon.style.color = 'var(--primary)';
    }
  }, 0);

  const total = filtered.length;
  const totalPages = Math.ceil(total / PER_PAGE);
  if (payPage > totalPages) payPage = 1;
  const slice = sorted.slice((payPage-1)*PER_PAGE, payPage*PER_PAGE);

  const statusBadge = s => ({completed:'badge-green',pending:'badge-yellow',failed:'badge-red'}[s]||'badge-gray');
  const methodIcon  = m => m==='upi' ? '🏦' : m==='cash' ? '💵' : '💳';

  document.getElementById('financialBody').innerHTML = slice.map((p,i) => {
    const txId = `#TRX-${p.id?.slice(-6)?.toUpperCase() || String(i+1).padStart(5,'0')}`;
    const jobId = `JOB-${p.jobId?.slice(-4)?.toUpperCase()||'????'}`;
    const com = p.commissionAmount || Math.round((p.amount * 0.05) * 100)/100;
    const net = p.workerAmount || Math.round((p.amount - com) * 100)/100;
    
    return `<tr>
      <td style="font-weight:700;color:var(--text)">${txId}</td>
      <td style="color:var(--primary-dark);font-weight:600;${p.jobId ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${p.jobId ? `window._inspectJob('${p.jobId}')` : ''}">${jobId}</td>
      <td>
        <div style="font-size:13px;${p.farmer?.id ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${p.farmer?.id ? `window._inspectUser('${p.farmer.id}')` : ''}">${p.farmer?.name||'—'}</div>
        <div style="font-size:12px;color:var(--text-muted)">→ <span style="${p.worker?.id ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${p.worker?.id ? `window._inspectUser('${p.worker.id}')` : ''}">${p.worker?.name||'—'}</span></div>
      </td>
      <td style="font-weight:700">₹${(p.amount||0).toLocaleString('en-IN')}</td>
      <td style="color:var(--danger)">₹${com.toLocaleString('en-IN')}</td>
      <td style="color:var(--primary-dark);font-weight:800">₹${net.toLocaleString('en-IN')}</td>
      <td>${methodIcon(p.method)} ${p.method?.toUpperCase()||'—'}</td>
      <td style="color:var(--text-muted);font-size:13px">${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
      <td><span class="badge ${statusBadge(p.status)}">${p.status}</span></td>
      <td>
        ${p.status!=='completed'
          ? `<button class="btn btn-success btn-xs" onclick="window._markAdminPay('${p.id}')">✓ Complete</button>`
          : `<span style="color:var(--text-dim);font-size:12px">Processed</span>`}
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="10" class="table-empty">No payments found.</td></tr>`;

  renderPagination(total, payPage, 'pay');
}

function renderSettlements() {
  const headers = [
    { label: 'Settlement ID', sort: 'id' },
    { label: 'Booking ID' },
    { label: 'Worker Details' },
    { label: 'Bank/UPI coordinate' },
    { label: 'Platform Comm (5%)' },
    { label: 'Worker Share (95%)', sort: 'amount' },
    { label: 'Date', sort: 'createdAt' },
    { label: 'Status', sort: 'status' },
    { label: 'Action' }
  ];
  document.getElementById('tableHeaders').innerHTML = headers.map(h => {
    if (h.sort) {
      return `<th class="sort-header" data-sort="${h.sort}">${h.label} <span id="sort-${h.sort}-icon">↕</span></th>`;
    }
    return `<th>${h.label}</th>`;
  }).join('');

  // Re-attach event listeners to headers
  document.querySelectorAll('#financialTable th.sort-header').forEach(header => {
    header.addEventListener('click', () => {
      const field = header.dataset.sort;
      if (settleSortField === field) {
        settleSortOrder = settleSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        settleSortField = field;
        settleSortOrder = 'asc';
      }
      renderActiveTab();
    });
  });

  const sorted = [...allSettlements].sort((a, b) => {
    let valA = a[settleSortField];
    let valB = b[settleSortField];
    if (settleSortField === 'createdAt') {
      valA = new Date(valA || 0);
      valB = new Date(valB || 0);
    }
    valA = valA || '';
    valB = valB || '';
    if (typeof valA === 'string') {
      return settleSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      return settleSortOrder === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Update sort icons after DOM elements are drawn
  setTimeout(() => {
    document.querySelectorAll('#financialTable th.sort-header span').forEach(span => {
      span.textContent = '↕';
      span.style.color = 'var(--text-dim)';
    });
    const activeIcon = document.getElementById(`sort-${settleSortField}-icon`);
    if (activeIcon) {
      activeIcon.textContent = settleSortOrder === 'asc' ? '↑' : '↓';
      activeIcon.style.color = 'var(--primary)';
    }
  }, 0);

  const total = allSettlements.length;
  const totalPages = Math.ceil(total / PER_PAGE);
  if (settlePage > totalPages) settlePage = 1;
  const slice = sorted.slice((settlePage-1)*PER_PAGE, settlePage*PER_PAGE);

  const statusBadge = s => ({settled:'badge-green',pending:'badge-yellow'}[s]||'badge-gray');

  document.getElementById('financialBody').innerHTML = slice.map((s,i) => {
    const settleId = `#SET-${s.id?.slice(-6)?.toUpperCase() || String(i+1).padStart(5,'0')}`;
    const jobId = `JOB-${s.payment?.job?.id?.slice(-4)?.toUpperCase()||'????'}`;
    const com = s.payment?.commissionAmount || Math.round(((s.amount / 0.95) * 0.05) * 100)/100;
    
    return `<tr>
      <td style="font-weight:700;color:var(--text)">${settleId}</td>
      <td style="color:var(--primary-dark);font-weight:600;${s.payment?.job?.id ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${s.payment?.job?.id ? `window._inspectJob('${s.payment.job.id}')` : ''}">${jobId}</td>
      <td>
        <div style="font-size:13px;font-weight:700;${s.worker?.id ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${s.worker?.id ? `window._inspectUser('${s.worker.id}')` : ''}">${s.worker?.name||'—'}</div>
        <div style="font-size:12px;color:var(--text-muted)">Ph: ${s.worker?.phone||'—'}</div>
      </td>
      <td style="color:var(--primary-dark);font-weight:700">${s.worker?.upiId || `${s.worker?.phone}@upi`}</td>
      <td style="color:var(--danger)">₹${com.toLocaleString('en-IN')}</td>
      <td style="color:var(--primary-dark);font-weight:900;font-size:14px">₹${(s.amount||0).toLocaleString('en-IN')}</td>
      <td style="color:var(--text-muted);font-size:13px">${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</td>
      <td><span class="badge ${statusBadge(s.status)}">${s.status}</span></td>
      <td>
        ${s.status === 'pending'
          ? `<button class="btn btn-success btn-xs" onclick="window._markManualSettle('${s.id}')">💸 Mark Settled</button>`
          : `<span style="color:var(--text-dim);font-size:12px">Transferred</span>`}
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="9" class="table-empty">No pending payouts found.</td></tr>`;

  renderPagination(total, settlePage, 'settle');
}

function renderPagination(total, currentPage, prefix) {
  const pag = document.getElementById('payPagination');
  const totalPages = Math.ceil(total / PER_PAGE);
  if (total > 0) {
    pag.style.display = 'flex';
    const btns = [];
    btns.push(`<button class="btn btn-outline btn-sm" onclick="window._financialPage('${prefix}', ${currentPage-1})" ${currentPage<=1?'disabled':''}>Previous</button>`);
    if (totalPages > 1) {
      for (let i=1; i<=Math.min(totalPages, 5); i++) {
        btns.push(`<button class="page-btn ${i===currentPage?'active':''}" onclick="window._financialPage('${prefix}', ${i})">${i}</button>`);
      }
    }
    btns.push(`<button class="btn btn-primary btn-sm" onclick="window._financialPage('${prefix}', ${currentPage+1})" ${currentPage>=totalPages?'disabled':''}>Next</button>`);
    pag.innerHTML = `<div class="pagination-info">Showing ${sliceBounds(currentPage, total)} of ${total} entries</div><div class="pagination-btns">${btns.join('')}</div>`;
  } else { 
    pag.style.display = 'none'; 
  }
}

function sliceBounds(curr, total) {
  const start = (curr - 1) * PER_PAGE + 1;
  const end = Math.min(curr * PER_PAGE, total);
  return `${start}-${end}`;
}

window._financialPage = (prefix, p) => {
  if (prefix === 'pay') {
    payPage = p;
  } else {
    settlePage = p;
  }
  renderActiveTab();
};

window._markAdminPay = async (id) => {
  try {
    await api.updatePayment(id, { status: 'completed' });
    const p = allPayments.find(p => p.id === id);
    if (p) p.status = 'completed';
    await loadData();
    window.showToast('Payment marked as completed');
  } catch(e) { 
    window.showToast(e.message, 'error'); 
  }
};

window._markManualSettle = async (id) => {
  try {
    await api.settlePayment(id);
    await loadData();
    window.showToast('Manual settlement marked successfully!');
  } catch(e) { 
    window.showToast(e.message, 'error'); 
  }
};

function exportCsv() {
  if (activeTab === 'transactions') {
    const rows = [['TxID','Farmer','Worker','Gross Amount','5% Commission','95% Net','Method','Status','Date']];
    allPayments.forEach((p,i) => {
      const com = p.commissionAmount || p.amount * 0.05;
      rows.push([
        `TRX-${p.id?.slice(-6)?.toUpperCase()}`, p.farmer?.name||'', p.worker?.name||'',
        p.amount||0, com, p.amount - com, p.method||'', p.status, new Date(p.createdAt).toLocaleDateString()
      ]);
    });
    triggerCsvDownload(rows, 'transactions');
  } else {
    const rows = [['SettleID','Worker','Worker Phone','Worker UPI','Earning Share','Status','Date']];
    allSettlements.forEach((s,i) => {
      rows.push([
        `SET-${s.id?.slice(-6)?.toUpperCase()}`, s.worker?.name||'', s.worker?.phone||'',
        s.worker?.upiId||'', s.amount||0, s.status, new Date(s.createdAt).toLocaleDateString()
      ]);
    });
    triggerCsvDownload(rows, 'settlements');
  }
}

function triggerCsvDownload(rows, name) {
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = `data:text/csv,${encodeURIComponent(csv)}`;
  a.download = `${name}_${Date.now()}.csv`;
  a.click();
  window.showToast('CSV exported successfully');
}
