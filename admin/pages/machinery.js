import { api } from "../api.js";

let allMachinery = [];
let allBookings = [];
let activeTab = "inventory"; // "inventory" | "bookings"
let page = 1;
const PER_PAGE = 8;
let sortField = "name";
let sortOrder = "asc";

export async function loadMachinery() {
  const el = document.getElementById("page-machinery");
  el.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">🚜 Machinery &amp; <span style="color:var(--primary)">Equipment Rentals</span></div>
        <div class="section-sub">Manage farm machinery listings, hourly rates, availability, and rental bookings.</div>
      </div>
      <div class="section-controls">
        <button class="btn btn-outline btn-sm" id="exportMachineryCsvBtn">⬇ Export CSV</button>
      </div>
    </div>

    <!-- Tab Switcher -->
    <div style="display:flex;gap:10px;margin-bottom:16px">
      <button class="btn btn-sm ${activeTab === 'inventory' ? 'btn-primary' : 'btn-outline'}" id="tabInventoryBtn">🚜 Equipment Inventory (<span id="machineryCount">0</span>)</button>
      <button class="btn btn-sm ${activeTab === 'bookings' ? 'btn-primary' : 'btn-outline'}" id="tabBookingsBtn">📋 Rental Bookings (<span id="bookingsCount">0</span>)</button>
    </div>

    <!-- Inventory View -->
    <div id="machineryInventoryView">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
        <div class="search-box" style="flex:1;min-width:220px">
          <span class="search-icon">🔍</span>
          <input type="text" id="machinerySearch" placeholder="Search machine, model, owner name or phone..." />
        </div>
        <select class="filter-select" id="machineryTypeFilter">
          <option value="">⚙️ Type: All</option>
          <option value="Tractor">🚜 Tractor</option>
          <option value="Harvester">🌾 Harvester</option>
          <option value="Pump Set">💧 Pump Set</option>
          <option value="Plough">⚙️ Plough</option>
          <option value="Sprayer">🌿 Sprayer</option>
          <option value="Thresher">🔧 Thresher</option>
        </select>
        <select class="filter-select" id="machineryStatusFilter">
          <option value="">⚡ Status: All</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      <div class="table-wrap">
        <div class="table-scroll">
          <table>
            <thead><tr>
              <th class="sort-header" data-sort="name">Equipment Name <span id="sort-mach-name-icon">↕</span></th>
              <th>Type</th>
              <th>Owner / Farmer</th>
              <th>Location</th>
              <th class="sort-header" data-sort="pricePerHour">Rate (₹/hr) <span id="sort-mach-price-icon">↕</span></th>
              <th>Bookings</th>
              <th>Status</th>
              <th>Actions</th>
            </tr></thead>
            <tbody id="machineryBody"><tr><td colspan="8" class="table-loading"><div class="spinner"></div></td></tr></tbody>
          </table>
        </div>
        <div class="pagination" id="machineryPagination" style="display:none"></div>
      </div>
    </div>

    <!-- Bookings View -->
    <div id="machineryBookingsView" style="display:none">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
        <div class="search-box" style="flex:1;min-width:220px">
          <span class="search-icon">🔍</span>
          <input type="text" id="bookingSearch" placeholder="Search by farmer name, machine, or village..." />
        </div>
        <select class="filter-select" id="bookingStatusFilter">
          <option value="">📋 Status: All</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div class="table-wrap">
        <div class="table-scroll">
          <table>
            <thead><tr>
              <th>Booking ID</th>
              <th>Equipment</th>
              <th>Rented By (Farmer)</th>
              <th>Slot / Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Booked At</th>
            </tr></thead>
            <tbody id="bookingsBody"><tr><td colspan="7" class="table-loading"><div class="spinner"></div></td></tr></tbody>
          </table>
        </div>
        <div class="pagination" id="bookingsPagination" style="display:none"></div>
      </div>
    </div>
  `;

  // Bind tab events
  el.querySelector("#tabInventoryBtn").addEventListener("click", () => switchTab("inventory"));
  el.querySelector("#tabBookingsBtn").addEventListener("click", () => switchTab("bookings"));

  // Inventory listeners
  el.querySelector("#machinerySearch").addEventListener("input", () => { page = 1; renderMachinery(); });
  el.querySelector("#machineryTypeFilter").addEventListener("change", () => { page = 1; renderMachinery(); });
  el.querySelector("#machineryStatusFilter").addEventListener("change", () => { page = 1; renderMachinery(); });
  el.querySelector("#exportMachineryCsvBtn").addEventListener("click", exportCsv);

  // Bookings listeners
  el.querySelector("#bookingSearch").addEventListener("input", () => renderBookings());
  el.querySelector("#bookingStatusFilter").addEventListener("change", () => renderBookings());

  // Sorting
  el.querySelectorAll(".sort-header").forEach(header => {
    header.addEventListener("click", () => {
      const field = header.dataset.sort;
      if (sortField === field) {
        sortOrder = sortOrder === "asc" ? "desc" : "asc";
      } else {
        sortField = field;
        sortOrder = "asc";
      }
      renderMachinery();
    });
  });

  await loadData();
}

function switchTab(tab) {
  activeTab = tab;
  const invBtn = document.getElementById("tabInventoryBtn");
  const bkBtn = document.getElementById("tabBookingsBtn");
  const invView = document.getElementById("machineryInventoryView");
  const bkView = document.getElementById("machineryBookingsView");

  if (tab === "inventory") {
    invBtn.className = "btn btn-sm btn-primary";
    bkBtn.className = "btn btn-sm btn-outline";
    invView.style.display = "block";
    bkView.style.display = "none";
    renderMachinery();
  } else {
    invBtn.className = "btn btn-sm btn-outline";
    bkBtn.className = "btn btn-sm btn-primary";
    invView.style.display = "none";
    bkView.style.display = "block";
    renderBookings();
  }
}

async function loadData() {
  try {
    const [machData, bkData] = await Promise.all([
      api.getMachinery(),
      api.getMachineryBookings()
    ]);
    allMachinery = machData.machinery || [];
    allBookings = bkData.bookings || [];

    const mcEl = document.getElementById("machineryCount");
    const bcEl = document.getElementById("bookingsCount");
    if (mcEl) mcEl.textContent = allMachinery.length;
    if (bcEl) bcEl.textContent = allBookings.length;

    renderMachinery();
    renderBookings();
  } catch (e) {
    const tbody = document.getElementById("machineryBody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function renderMachinery() {
  const search = document.getElementById("machinerySearch")?.value.toLowerCase() || "";
  const type   = document.getElementById("machineryTypeFilter")?.value || "";
  const status = document.getElementById("machineryStatusFilter")?.value || "";

  const filtered = allMachinery.filter(m =>
    (!type || m.type === type) &&
    (!status || m.status === status) &&
    (!search || `${m.name} ${m.type} ${m.owner?.name} ${m.owner?.phone} ${m.owner?.village}`.toLowerCase().includes(search))
  );

  filtered.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const tbody = document.getElementById("machineryBody");
  if (!tbody) return;

  if (paged.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No farm machinery found</td></tr>`;
    document.getElementById("machineryPagination").style.display = "none";
    return;
  }

  const typeIcons = { Tractor: "🚜", Harvester: "🌾", "Pump Set": "💧", Plough: "⚙️", Sprayer: "🌿", Thresher: "🔧" };

  tbody.innerHTML = paged.map(m => {
    const isAvail = m.status === "available";
    return `
      <tr>
        <td>
          <div style="font-weight:700;color:#fff">${m.name || '—'}</div>
          <div style="font-size:11px;color:var(--text-dim)">ID: ${m.id ? m.id.slice(0,8) : '—'}</div>
        </td>
        <td>
          <span class="badge badge-purple">${typeIcons[m.type] || '🚜'} ${m.type || 'Machinery'}</span>
        </td>
        <td>
          <div style="font-weight:600;color:#fff">${m.owner?.name || '—'}</div>
          <div style="font-size:11px;color:var(--text-muted)">Ph: ${m.owner?.phone || '—'}</div>
        </td>
        <td style="color:var(--text-muted)">📍 ${m.owner?.village || '—'}</td>
        <td style="font-weight:800;color:var(--primary);font-size:14px">₹${m.pricePerHour || 0}/hr</td>
        <td>
          <span class="badge badge-gray">${m._count?.bookings ?? 0} bookings</span>
        </td>
        <td>
          <span class="badge badge-${isAvail ? 'green' : 'red'}">${isAvail ? 'Available' : 'Unavailable'}</span>
        </td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-xs" onclick="window._toggleMachineryStatus('${m.id}', '${isAvail ? 'unavailable' : 'available'}')">
              ${isAvail ? 'Set Unavailable' : 'Set Available'}
            </button>
            <button class="btn btn-outline btn-xs" style="color:var(--danger);border-color:rgba(239,68,68,0.3)" onclick="window._deleteMachinery('${m.id}')" title="Delete">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  renderPagination(total, totalPages);
}

function renderPagination(total, totalPages) {
  const pag = document.getElementById("machineryPagination");
  if (!pag) return;
  if (totalPages > 1) {
    pag.style.display = "flex";
    const btns = [];
    btns.push(`<button class="page-btn" onclick="window._machineryPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹</button>`);
    for (let p = 1; p <= totalPages; p++) {
      btns.push(`<button class="page-btn ${p === page ? 'active' : ''}" onclick="window._machineryPage(${p})">${p}</button>`);
    }
    btns.push(`<button class="page-btn" onclick="window._machineryPage(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>›</button>`);
    pag.innerHTML = `<div class="pagination-info">Showing ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, total)} of ${total} machines</div><div class="pagination-btns">${btns.join('')}</div>`;
  } else {
    pag.style.display = total > 0 ? "flex" : "none";
    pag.innerHTML = `<div class="pagination-info">Showing ${total} machine${total !== 1 ? 's' : ''}</div><div></div>`;
  }
}

function renderBookings() {
  const search = document.getElementById("bookingSearch")?.value.toLowerCase() || "";
  const status = document.getElementById("bookingStatusFilter")?.value || "";

  const filtered = allBookings.filter(b =>
    (!status || b.status === status) &&
    (!search || `${b.farmer?.name} ${b.farmer?.phone} ${b.machinery?.name} ${b.machinery?.type} ${b.id}`.toLowerCase().includes(search))
  );

  const tbody = document.getElementById("bookingsBody");
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No machinery bookings found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => {
    const statusClass = b.status === "confirmed" ? "green" : b.status === "cancelled" ? "red" : "amber";
    return `
      <tr>
        <td style="font-weight:700;font-size:12px;color:var(--text-dim)">#${b.id.slice(0,8)}</td>
        <td>
          <div style="font-weight:700;color:#fff">${b.machinery?.name || '—'}</div>
          <div style="font-size:11px;color:var(--text-muted)">Type: ${b.machinery?.type || '—'} · Owner: ${b.machinery?.owner?.name || '—'}</div>
        </td>
        <td>
          <div style="font-weight:600;color:#fff">${b.farmer?.name || '—'}</div>
          <div style="font-size:11px;color:var(--text-muted)">Ph: ${b.farmer?.phone || '—'} · 📍 ${b.farmer?.village || '—'}</div>
        </td>
        <td>
          <div style="font-weight:700;color:#fff">${new Date(b.date).toLocaleDateString()}</div>
          <div style="font-size:11px;color:var(--text-muted)">Slot: <b>${b.slot || 'Full Day'}</b></div>
        </td>
        <td style="font-weight:800;color:var(--primary);font-size:14px">₹${b.totalAmount || 0}</td>
        <td><span class="badge badge-${statusClass}">${b.status || 'pending'}</span></td>
        <td style="color:var(--text-muted);font-size:12px">${new Date(b.createdAt).toLocaleDateString()}</td>
      </tr>
    `;
  }).join("");
}

window._machineryPage = (p) => { page = p; renderMachinery(); };

window._toggleMachineryStatus = async (id, newStatus) => {
  try {
    await api.updateMachinery(id, { status: newStatus });
    const item = allMachinery.find(m => m.id === id);
    if (item) item.status = newStatus;
    renderMachinery();
    window.showToast(`Machinery marked as ${newStatus}`);
  } catch (e) {
    window.showToast(e.message, "error");
  }
};

window._deleteMachinery = async (id) => {
  if (!confirm("Are you sure you want to delete this machinery listing?")) return;
  try {
    await api.deleteMachinery(id);
    allMachinery = allMachinery.filter(m => m.id !== id);
    renderMachinery();
    const mcEl = document.getElementById("machineryCount");
    if (mcEl) mcEl.textContent = allMachinery.length;
    window.showToast("Machinery deleted successfully");
  } catch (e) {
    window.showToast(e.message, "error");
  }
};

function exportCsv() {
  const rows = [["ID", "Name", "Type", "Owner Name", "Owner Phone", "Village", "Price Per Hour", "Status", "Bookings Count", "Created At"]];
  allMachinery.forEach(m => rows.push([
    `"${m.id}"`,
    `"${(m.name || '').replace(/"/g, '""')}"`,
    `"${m.type || ''}"`,
    `"${(m.owner?.name || '').replace(/"/g, '""')}"`,
    `"${m.owner?.phone || ''}"`,
    `"${(m.owner?.village || '').replace(/"/g, '""')}"`,
    m.pricePerHour,
    `"${m.status}"`,
    m._count?.bookings ?? 0,
    `"${new Date(m.createdAt).toLocaleDateString()}"`
  ]));
  const csv = rows.map(r => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = `data:text/csv,${encodeURIComponent(csv)}`;
  a.download = `machinery_${Date.now()}.csv`;
  a.click();
  window.showToast("Machinery CSV exported");
}
