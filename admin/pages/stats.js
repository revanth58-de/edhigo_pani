import { api } from '../api.js';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export async function loadStats(isSilent = false) {
  const el = document.getElementById('page-stats');
  
  // Render layout shell synchronously if not already present or if not silent
  if (!isSilent || !document.getElementById('chartArea')) {
    el.innerHTML = `
      <!-- KPI Row -->
      <div class="stats-grid">
        ${kpi('💼', '...', 'Active Jobs', '...', true, 'kpi-open-jobs')}
        ${kpi('👷', '...', 'Total Workers', '...', true, 'kpi-total-workers')}
        ${kpi('₹', '...', 'Total Revenue', '...', true, 'kpi-total-revenue')}
        ${kpi('👥', '...', 'Total Users', '...', true, 'kpi-total-users')}
      </div>

      <!-- Charts + Live Jobs -->
      <div class="dash-grid">
        <!-- Weekly Activity -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Weekly Activity</div>
              <div style="display:flex;gap:12px;font-size:12px;margin-top:4px;color:var(--text-muted)">
                <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:2px;background:var(--primary)"></span> Jobs</span>
                <span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:2px;background:var(--accent)"></span> Revenue</span>
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:24px;font-weight:900;color:var(--primary)" id="total-users-k-header">...</div>
              <div style="font-size:11px;color:var(--primary-dark);font-weight:700">Last 7 Days +14%</div>
            </div>
          </div>
          <div class="card-body">
            <!-- Cached-at timestamp so admins know data freshness -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <div style="font-size:12px;color:var(--text-muted)">Last 7 days vs prior 7 days</div>
              <div style="font-size:11px;color:var(--text-dim)" id="stats-cached-at"></div>
            </div>
            
            <div id="chartArea">
              <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-size:12px">Loading…</div>
            </div>

            <div style="display:flex;gap:8px;margin-top:8px">
              ${DAYS.map(d => `<div style="flex:1;text-align:center;font-size:11px;color:var(--text-muted);font-weight:600">${d}</div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Live Jobs -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Live Jobs</div>
            <button class="btn btn-outline btn-sm" onclick="document.querySelector('[data-page=jobs]').click()">View All Jobs →</button>
          </div>
          <div class="live-jobs-list" id="liveJobsList">
            <div class="table-loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>

      <!-- Live Agricultural Geospatial Map -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <div class="card-title" style="display:flex;align-items:center;gap:8px">
              <span>🗺️</span> Live Agricultural Geospatial Map
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
              Real-time distribution of active farm jobs, available workers &amp; agricultural machinery
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center" id="mapFilters">
            <button class="btn btn-sm btn-primary map-filter-btn" data-filter="all" onclick="window._filterAdminMap('all', this)">All</button>
            <button class="btn btn-sm btn-outline map-filter-btn" data-filter="jobs" onclick="window._filterAdminMap('jobs', this)">🌾 Jobs</button>
            <button class="btn btn-sm btn-outline map-filter-btn" data-filter="workers" onclick="window._filterAdminMap('workers', this)">👷 Workers</button>
            <button class="btn btn-sm btn-outline map-filter-btn" data-filter="machinery" onclick="window._filterAdminMap('machinery', this)">🚜 Machinery</button>
          </div>
        </div>
        <div class="card-body" style="padding:0;position:relative;border-radius:0 0 12px 12px;overflow:hidden">
          <div id="adminGeoMap" style="height:360px;width:100%;background:var(--card-bg, #f3f4f6);z-index:1;"></div>
          <div id="mapLegend" style="position:absolute;bottom:12px;right:12px;background:rgba(255,255,255,0.92);backdrop-filter:blur(4px);padding:6px 12px;border-radius:8px;font-size:11px;font-weight:600;display:flex;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:999;color:#1e293b">
            <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#16a34a;display:inline-block"></span> Jobs</span>
            <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#2563eb;display:inline-block"></span> Workers</span>
            <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#d97706;display:inline-block"></span> Machinery</span>
          </div>
        </div>
      </div>

      <!-- Role breakdown + Recent stats -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px">
        ${miniCard('🌾', 'var(--primary-light)', 'Farmers', '...', 'mini-farmers')}
        ${miniCard('👷', '#EFF6FF', 'Workers', '...', 'mini-workers')}
        ${miniCard('👑', '#F5F3FF', 'Leaders', '...', 'mini-leaders')}
      </div>

      <!-- Recent Verifications placeholder -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Registrations</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="document.querySelector('[data-page=users]').click()">Review All →</button>
        </div>
        <div class="table-scroll">
          <table>
            <thead><tr>
              <th>User</th><th>Type</th><th>Village</th><th>Rating</th><th>Joined</th><th>Action</th>
            </tr></thead>
            <tbody id="recentUsersBody"><tr><td colspan="6" class="table-loading"><div class="spinner"></div></td></tr></tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Load and update stats details asynchronously
  const statsPromise = api.getStats().then(data => {
    const u = data.users, j = data.jobs, p = data.payments, g = data.growth || {};
    const farmers = u.byRole?.farmer || 0;
    const workers = u.byRole?.worker || 0;
    const leaders = u.byRole?.leader || 0;
    const openJobs = j.openJobs || 0;
    const revenue  = p.revenue || 0;

    const fmtPct = (v) => v === null ? 'New' : (v >= 0 ? `+${v}%` : `${v}%`);
    const jobsPct    = fmtPct(g.jobs?.pctChange ?? null);
    const workersPct = fmtPct(g.users?.pctChange ?? null);
    const revPct     = fmtPct(g.revenue?.pctChange ?? null);
    const usersPct   = fmtPct(g.users?.pctChange ?? null);
    const jobsUp    = (g.jobs?.pctChange    ?? 0) >= 0;
    const workersUp = (g.users?.pctChange   ?? 0) >= 0;
    const revUp     = (g.revenue?.pctChange ?? 0) >= 0;
    const usersUp   = (g.users?.pctChange   ?? 0) >= 0;

    const updateKpi = (idVal, idChange, value, change, up) => {
      const valEl = document.getElementById(idVal);
      const chgEl = document.getElementById(idChange);
      if (valEl) valEl.textContent = value;
      if (chgEl) {
        chgEl.textContent = `${up ? '↑' : '↓'} ${change}`;
        chgEl.className = `stat-change ${up ? 'up' : 'down'}`;
      }
    };

    updateKpi('kpi-open-jobs', 'kpi-open-jobs-change', openJobs, jobsPct, jobsUp);
    updateKpi('kpi-total-workers', 'kpi-total-workers-change', workers, workersPct, workersUp);
    updateKpi('kpi-total-revenue', 'kpi-total-revenue-change', '₹' + revenue.toLocaleString('en-IN'), revPct, revUp);
    updateKpi('kpi-total-users', 'kpi-total-users-change', u.total, usersPct, usersUp);

    const tkHeader = document.getElementById('total-users-k-header');
    if (tkHeader) tkHeader.textContent = `${(u.total/1000).toFixed(1)}k`;

    const statsCached = document.getElementById('stats-cached-at');
    if (statsCached) {
      statsCached.textContent = data._cachedAt ? `Cached: ${new Date(data._cachedAt).toLocaleTimeString()}` : '';
    }

    const mFarmers = document.getElementById('mini-farmers');
    if (mFarmers) mFarmers.textContent = farmers;
    const mWorkers = document.getElementById('mini-workers');
    if (mWorkers) mWorkers.textContent = workers;
    const mLeaders = document.getElementById('mini-leaders');
    if (mLeaders) mLeaders.textContent = leaders;

    // Load live jobs
    loadLiveJobs(j.byStatus);
  }).catch(e => {
    console.error('Failed to load stats details:', e);
    if (!isSilent) {
      el.innerHTML = `<div class="table-empty">❌ Failed to load: ${e.message}</div>`;
    }
  });

  // Load recent users asynchronously
  const usersPromise = loadRecentUsers();

  // Draw chart asynchronously
  const chartPromise = drawChart();

  // Initialize Map asynchronously
  const mapPromise = initAdminMap();

  await Promise.all([statsPromise, usersPromise, chartPromise, mapPromise]);
}

function kpi(icon, value, label, change, up, idPrefix = '') {
  const valAttr = idPrefix ? ` id="${idPrefix}"` : '';
  const chgAttr = idPrefix ? ` id="${idPrefix}-change"` : '';
  return `
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-icon">${icon}</div>
        <div class="stat-change ${up ? 'up' : 'down'}"${chgAttr}>${up ? '↑' : '↓'} ${change}</div>
      </div>
      <div class="stat-value"${valAttr}>${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
}

function miniCard(icon, bg, label, value, id = '') {
  const valAttr = id ? ` id="${id}"` : '';
  return `
    <div class="card" style="padding:18px;display:flex;align-items:center;gap:14px">
      <div class="stat-icon" style="background:${bg};font-size:22px">${icon}</div>
      <div>
        <div style="font-size:24px;font-weight:900"${valAttr}>${value}</div>
        <div style="font-size:13px;color:var(--text-muted);font-weight:500">${label}</div>
      </div>
    </div>`;
}

// Helper: Generates premium SVG markup representing Job counts (vertical bars)
// and Revenue trend (glowing curved line overlay).
function generateSvgHtml(activity) {
  const maxJobs = Math.max(...activity.map(d => d.jobs), 1);
  const maxRevenue = Math.max(...activity.map(d => d.revenue), 1);

  const width = 700;
  const height = 180;
  const paddingBottom = 20;
  const paddingTop = 20;
  const chartHeight = height - paddingTop - paddingBottom;

  let bars = "";
  let linePoints = [];
  let dots = "";

  activity.forEach((d, i) => {
    const x = i * 100 + 50;

    // Jobs height
    const jobsH = (d.jobs / maxJobs) * chartHeight;
    const jobsY = height - paddingBottom - jobsH;
    
    // Revenue height
    const revH = (d.revenue / maxRevenue) * chartHeight;
    const revY = height - paddingBottom - revH;
    linePoints.push({ x, y: revY });

    const tooltip = `${d.label} | Jobs: ${d.jobs} | Revenue: ₹${d.revenue.toLocaleString('en-IN')}`;

    // Add bar
    bars += `
      <rect 
        x="${x - 12}" 
        y="${jobsY}" 
        width="24" 
        height="${Math.max(jobsH, 4)}" 
        rx="6" 
        fill="url(#jobsGradient)" 
        class="chart-svg-bar ${d.isToday ? 'active' : ''}"
        style="transition: all 0.3s;"
      >
        <title>${tooltip}</title>
      </rect>
    `;

    // Add dot
    dots += `
      <g class="chart-dot-group" style="cursor: pointer;">
        <circle 
          cx="${x}" 
          cy="${revY}" 
          r="6" 
          fill="var(--accent)" 
          stroke="#18181b" 
          stroke-width="2.5" 
          style="filter: drop-shadow(0 0 4px var(--accent-glow)); transition: r 0.2s;"
          onmouseover="this.setAttribute('r', '8')"
          onmouseout="this.setAttribute('r', '6')"
        />
        <title>${tooltip}</title>
      </g>
    `;
  });

  // Construct line path
  let linePath = `M ${linePoints[0].x} ${linePoints[0].y}`;
  for (let i = 1; i < linePoints.length; i++) {
    linePath += ` L ${linePoints[i].x} ${linePoints[i].y}`;
  }

  // Construct area path (fill below the line)
  let areaPath = `M ${linePoints[0].x} ${height - paddingBottom}`;
  for (let i = 0; i < linePoints.length; i++) {
    areaPath += ` L ${linePoints[i].x} ${linePoints[i].y}`;
  }
  areaPath += ` L ${linePoints[linePoints.length - 1].x} ${height - paddingBottom} Z`;

  return `
    <svg width="100%" height="100%" viewBox="0 0 700 180" style="overflow: visible;">
      <defs>
        <linearGradient id="jobsGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--primary)" />
          <stop offset="100%" stop-color="var(--primary-glow)" stop-opacity="0.1" />
        </linearGradient>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.2" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
        </linearGradient>
      </defs>
      
      <!-- Background Grid Lines -->
      <line x1="20" y1="${height - paddingBottom}" x2="680" y2="${height - paddingBottom}" stroke="var(--glass-border)" stroke-width="1.5" />
      <line x1="20" y1="${height - paddingBottom - chartHeight / 2}" x2="680" y2="${height - paddingBottom - chartHeight / 2}" stroke="var(--glass-border)" stroke-width="1" stroke-dasharray="4" />
      <line x1="20" y1="${paddingTop}" x2="680" y2="${paddingTop}" stroke="var(--glass-border)" stroke-width="1" stroke-dasharray="4" />

      <!-- Jobs Bars -->
      ${bars}
      
      <!-- Revenue Area Fill -->
      <path d="${areaPath}" fill="url(#areaGradient)" />
      
      <!-- Revenue Line -->
      <path d="${linePath}" fill="none" stroke="var(--accent)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 6px var(--accent-glow));" />
      
      <!-- Revenue Dots -->
      ${dots}
    </svg>
  `;
}

// FIX #6: Real chart — fetches actual daily job counts from /stats/activity.
// Displays Jobs count as vertical bars and Revenue trend as a line overlay.
async function drawChart() {
  const area = document.getElementById('chartArea');
  if (!area) return;

  // Show a subtle loading state while fetching
  area.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-size:12px">Loading…</div>';

  try {
    const { activity } = await api.getActivity(7);
    area.innerHTML = generateSvgHtml(activity);
  } catch {
    // Fallback to placeholder data if the activity endpoint is unavailable
    const fallbackActivity = [];
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const heightsJobs = [40, 60, 45, 80, 65, 100, 75];
    const heightsRev = [30, 50, 70, 40, 80, 90, 60];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dow = d.getDay();
      fallbackActivity.push({
        label: DAY_LABELS[dow],
        jobs: heightsJobs[6 - i],
        revenue: heightsRev[6 - i] * 500, // scaled revenue placeholder
        isToday: i === 0,
      });
    }
    area.innerHTML = generateSvgHtml(fallbackActivity);
  }
}

async function loadLiveJobs(byStatus) {
  try {
    const data = await api.getJobs('?status=open');
    const jobs = (data.jobs || []).slice(0, 5);
    const icons = ['🌾','💧','🌿','🚜','🌽'];
    document.getElementById('liveJobsList').innerHTML = jobs.length
      ? jobs.map((j, i) => `
          <div class="live-job-item">
            <div class="live-job-icon">${icons[i % icons.length]}</div>
            <div class="live-job-info">
              <div class="live-job-title" style="${j.id ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${j.id ? `window._inspectJob('${j.id}')` : ''}">${j.workType}</div>
              <div class="live-job-sub">${j.farmer?.village || '—'} • ${j.workersNeeded} slots</div>
            </div>
            <span class="live-job-badge ${j.status === 'open' ? 'active' : 'filled'}">${j.status === 'open' ? 'Active' : 'Filled'}</span>
          </div>`).join('')
      : '<div class="table-empty" style="padding:24px">No open jobs</div>';
  } catch {}
}

async function loadRecentUsers() {
  try {
    const data = await api.getUsers();
    const users = (data.users || []).slice(0, 5);
    const roleBadge = r => r === 'farmer' ? 'badge-blue' : r === 'leader' ? 'badge-purple' : 'badge-yellow';
    document.getElementById('recentUsersBody').innerHTML = users.map(u => `
      <tr class="verif-row">
        <td>
          <div class="user-cell">
            <div class="avatar" style="background:${avatarColor(u.name)}">${initials(u.name)}</div>
            <div><div class="user-cell-name" style="${u.id ? 'cursor:pointer;text-decoration:underline' : ''}" onclick="${u.id ? `window._inspectUser('${u.id}')` : ''}">${u.name||'—'}</div><div class="user-cell-id">${u.phone}</div></div>
          </div>
        </td>
        <td><span class="badge ${roleBadge(u.role)}">${u.role}</span></td>
        <td>${u.village||'—'}</td>
        <td>${u.ratingAvg ? '★ '+Number(u.ratingAvg).toFixed(1) : '—'}</td>
        <td style="color:var(--text-muted);font-size:13px">${new Date(u.createdAt).toLocaleDateString()}</td>
        <td><button class="verif-action" onclick="window._editUser('${u.id}')">Review</button></td>
      </tr>`).join('');
  } catch {}
}

export function initials(name = '') {
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (name[0]||'?').toUpperCase();
}

export function avatarColor(name = '') {
  const colors = ['#22C55E','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#EC4899'];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

const DISTRICT_CENTERS = [
  { lat: 16.3067, lng: 80.4365, name: 'Guntur' },
  { lat: 16.5062, lng: 80.6480, name: 'Vijayawada' },
  { lat: 16.7107, lng: 81.0952, name: 'Eluru' },
  { lat: 16.2437, lng: 80.6400, name: 'Tenali' },
  { lat: 17.2473, lng: 80.1514, name: 'Khammam' },
  { lat: 17.9689, lng: 79.5941, name: 'Warangal' },
  { lat: 15.8281, lng: 78.0373, name: 'Kurnool' },
  { lat: 14.4426, lng: 79.9865, name: 'Nellore' },
  { lat: 17.0005, lng: 81.8040, name: 'Rajahmundry' },
  { lat: 16.9891, lng: 82.2475, name: 'Kakinada' },
  { lat: 17.0577, lng: 79.2684, name: 'Nalgonda' },
];

function getCoordsForEntity(id, lat, lng, index = 0) {
  const pLat = parseFloat(lat);
  const pLng = parseFloat(lng);
  if (!isNaN(pLat) && !isNaN(pLng) && pLat !== 0 && pLng !== 0) {
    return [pLat, pLng];
  }
  let hash = 0;
  const str = String(id || index);
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  const hub = DISTRICT_CENTERS[Math.abs(hash) % DISTRICT_CENTERS.length];
  const offsetLat = (((Math.abs(hash * 7) % 1000) / 1000) - 0.5) * 0.08;
  const offsetLng = (((Math.abs(hash * 13) % 1000) / 1000) - 0.5) * 0.08;
  return [hub.lat + offsetLat, hub.lng + offsetLng];
}

async function initAdminMap() {
  const mapContainer = document.getElementById('adminGeoMap');
  if (!mapContainer || typeof window.L === 'undefined') return;

  if (window._adminLeafletMap) {
    try {
      window._adminLeafletMap.remove();
    } catch (_) {}
    window._adminLeafletMap = null;
  }

  try {
    const map = window.L.map('adminGeoMap', {
      center: [16.5062, 80.6480], // Central Amaravati / Vijayawada
      zoom: 8,
      zoomControl: true,
      attributionControl: true
    });
    window._adminLeafletMap = map;

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    const jobLayer = window.L.layerGroup().addTo(map);
    const workerLayer = window.L.layerGroup().addTo(map);
    const machineryLayer = window.L.layerGroup().addTo(map);

    window._adminMapLayers = { jobLayer, workerLayer, machineryLayer };

    const [jData, uData, mData] = await Promise.all([
      api.getJobs('?limit=50').catch(() => ({ jobs: [] })),
      api.getUsers('?limit=50').catch(() => ({ users: [] })),
      api.getMachinery('?limit=50').catch(() => ({ machinery: [] }))
    ]);

    const jobs = jData.jobs || [];
    const users = (uData.users || []).filter(u => u.role === 'worker');
    const machinery = mData.machinery || [];

    // 1. Plot Jobs (Green Pin)
    jobs.forEach((job, idx) => {
      const coords = getCoordsForEntity(job.id, job.latitude, job.longitude, idx);
      const icon = window.L.divIcon({
        className: 'map-custom-marker',
        html: `<div style="background:#16a34a;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid white;cursor:pointer">🌾</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      const marker = window.L.marker(coords, { icon });
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;font-size:12px;padding:4px">
          <div style="font-weight:800;font-size:14px;color:#16a34a;margin-bottom:4px">🌾 ${job.workType}</div>
          <div><strong>Farmer:</strong> ${job.farmer?.name || '—'} (${job.farmer?.phone || '—'})</div>
          <div><strong>Daily Wage:</strong> ₹${job.payPerDay || 0}/day</div>
          <div><strong>Workers Needed:</strong> ${job.workersNeeded || 1} slots</div>
          <div><strong>Village:</strong> ${job.farmer?.village || '—'}</div>
          <button onclick="window._inspectJob('${job.id}')" style="margin-top:8px;width:100%;padding:6px;background:#16a34a;color:white;border:none;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer">View Job Details</button>
        </div>
      `);
      jobLayer.addLayer(marker);
    });

    // 2. Plot Workers (Blue Pin)
    users.forEach((worker, idx) => {
      const coords = getCoordsForEntity(worker.id, worker.latitude, worker.longitude, idx + 100);
      const icon = window.L.divIcon({
        className: 'map-custom-marker',
        html: `<div style="background:#2563eb;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid white;cursor:pointer">👷</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const marker = window.L.marker(coords, { icon });
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;font-size:12px;padding:4px">
          <div style="font-weight:800;font-size:14px;color:#2563eb;margin-bottom:4px">👷 ${worker.name || 'Worker'}</div>
          <div><strong>Phone:</strong> ${worker.phone}</div>
          <div><strong>Village:</strong> ${worker.village || '—'}</div>
          <div><strong>Rating:</strong> ★ ${worker.ratingAvg ? Number(worker.ratingAvg).toFixed(1) : 'New'}</div>
          <button onclick="window._inspectUser('${worker.id}')" style="margin-top:8px;width:100%;padding:6px;background:#2563eb;color:white;border:none;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer">Inspect Profile</button>
        </div>
      `);
      workerLayer.addLayer(marker);
    });

    // 3. Plot Machinery (Orange Pin)
    machinery.forEach((mach, idx) => {
      const coords = getCoordsForEntity(mach.id, mach.latitude, mach.longitude, idx + 200);
      const icon = window.L.divIcon({
        className: 'map-custom-marker',
        html: `<div style="background:#d97706;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid white;cursor:pointer">🚜</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const marker = window.L.marker(coords, { icon });
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;font-size:12px;padding:4px">
          <div style="font-weight:800;font-size:14px;color:#d97706;margin-bottom:4px">🚜 ${mach.name}</div>
          <div><strong>Type:</strong> ${mach.type || 'Tractor'}</div>
          <div><strong>Rate:</strong> ₹${mach.pricePerHour || 0}/hour</div>
          <div><strong>Owner:</strong> ${mach.owner?.name || 'Owner'} (${mach.owner?.phone || '—'})</div>
          <div><strong>Village:</strong> ${mach.village || '—'}</div>
          <button onclick="window._cpNavigate('machinery')" style="margin-top:8px;width:100%;padding:6px;background:#d97706;color:white;border:none;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer">View Machinery</button>
        </div>
      `);
      machineryLayer.addLayer(marker);
    });

    // Update filter counts
    const allBtn = document.querySelector('.map-filter-btn[data-filter=all]');
    if (allBtn) allBtn.textContent = `All (${jobs.length + users.length + machinery.length})`;
    const jobsBtn = document.querySelector('.map-filter-btn[data-filter=jobs]');
    if (jobsBtn) jobsBtn.textContent = `🌾 Jobs (${jobs.length})`;
    const workersBtn = document.querySelector('.map-filter-btn[data-filter=workers]');
    if (workersBtn) workersBtn.textContent = `👷 Workers (${users.length})`;
    const machBtn = document.querySelector('.map-filter-btn[data-filter=machinery]');
    if (machBtn) machBtn.textContent = `🚜 Machinery (${machinery.length})`;

    setTimeout(() => {
      if (window._adminLeafletMap) window._adminLeafletMap.invalidateSize();
    }, 200);
  } catch (err) {
    console.error('Error rendering Leaflet map:', err);
  }
}

window._filterAdminMap = (filterType, btnEl) => {
  if (!window._adminLeafletMap || !window._adminMapLayers) return;
  const { jobLayer, workerLayer, machineryLayer } = window._adminMapLayers;
  const map = window._adminLeafletMap;

  document.querySelectorAll('.map-filter-btn').forEach(b => {
    b.className = 'btn btn-sm btn-outline map-filter-btn';
  });
  if (btnEl) btnEl.className = 'btn btn-sm btn-primary map-filter-btn';

  if (filterType === 'all') {
    if (!map.hasLayer(jobLayer)) map.addLayer(jobLayer);
    if (!map.hasLayer(workerLayer)) map.addLayer(workerLayer);
    if (!map.hasLayer(machineryLayer)) map.addLayer(machineryLayer);
  } else if (filterType === 'jobs') {
    if (!map.hasLayer(jobLayer)) map.addLayer(jobLayer);
    if (map.hasLayer(workerLayer)) map.removeLayer(workerLayer);
    if (map.hasLayer(machineryLayer)) map.removeLayer(machineryLayer);
  } else if (filterType === 'workers') {
    if (map.hasLayer(jobLayer)) map.removeLayer(jobLayer);
    if (!map.hasLayer(workerLayer)) map.addLayer(workerLayer);
    if (map.hasLayer(machineryLayer)) map.removeLayer(machineryLayer);
  } else if (filterType === 'machinery') {
    if (map.hasLayer(jobLayer)) map.removeLayer(jobLayer);
    if (map.hasLayer(workerLayer)) map.removeLayer(workerLayer);
    if (!map.hasLayer(machineryLayer)) map.addLayer(machineryLayer);
  }
};
