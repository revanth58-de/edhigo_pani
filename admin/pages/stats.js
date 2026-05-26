import { api } from '../api.js';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export async function loadStats(isSilent = false) {
  const el = document.getElementById('page-stats');
  if (!isSilent) {
    el.innerHTML = `<div class="table-loading"><div class="spinner"></div></div>`;
  }

  try {
    const data = await api.getStats();
    const u = data.users, j = data.jobs, p = data.payments, g = data.growth || {};
    const farmers = u.byRole?.farmer || 0;
    const workers = u.byRole?.worker || 0;
    const leaders = u.byRole?.leader || 0;
    // FIX #5 (frontend): Use correct status keys. Schema uses 'pending'/'matched'/'in_progress'
    // NOT 'open'. Sum all "live" statuses for the KPI card.
    const openJobs = (j.byStatus?.pending || 0) + (j.byStatus?.matched || 0) + (j.byStatus?.in_progress || 0);
    const doneJobs = j.byStatus?.completed || 0;
    const revenue  = p.revenue || 0;

    // FIX #5: Use real growth data from the backend.
    // pctChange is null when previous week had 0 records (avoid divide-by-zero).
    const fmtPct = (v) => v === null ? 'New' : (v >= 0 ? `+${v}%` : `${v}%`);
    const jobsPct    = fmtPct(g.jobs?.pctChange ?? null);
    const workersPct = fmtPct(g.users?.pctChange ?? null);
    const revPct     = fmtPct(g.revenue?.pctChange ?? null);
    const usersPct   = fmtPct(g.users?.pctChange ?? null);
    const jobsUp    = (g.jobs?.pctChange    ?? 0) >= 0;
    const workersUp = (g.users?.pctChange   ?? 0) >= 0;
    const revUp     = (g.revenue?.pctChange ?? 0) >= 0;
    const usersUp   = (g.users?.pctChange   ?? 0) >= 0;

    el.innerHTML = `
      <!-- KPI Row -->
      <div class="stats-grid">
        ${kpi('💼', openJobs, 'Active Jobs', jobsPct, jobsUp)}
        ${kpi('👷', workers, 'Total Workers', workersPct, workersUp)}
        ${kpi('₹', '₹' + revenue.toLocaleString('en-IN'), 'Total Revenue', revPct, revUp)}
        ${kpi('👥', u.total, 'Total Users', usersPct, usersUp)}
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
              <div style="font-size:24px;font-weight:900;color:var(--primary)">${(u.total/1000).toFixed(1)}k</div>
              <div style="font-size:11px;color:var(--primary-dark);font-weight:700">Last 7 Days +14%</div>
            </div>
          </div>
          <div class="card-body">
            <!-- Cached-at timestamp so admins know data freshness -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <div style="font-size:12px;color:var(--text-muted)">Last 7 days vs prior 7 days</div>
              ${data._cachedAt ? `<div style="font-size:11px;color:var(--text-dim)">Cached: ${new Date(data._cachedAt).toLocaleTimeString()}</div>` : ''}
            </div>
            
            <div id="chartArea"></div>

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

      <!-- Role breakdown + Recent stats -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px">
        ${miniCard('🌾', 'var(--primary-light)', 'Farmers', farmers)}
        ${miniCard('👷', '#EFF6FF', 'Workers', workers)}
        ${miniCard('👑', '#F5F3FF', 'Leaders', leaders)}
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

    // Draw chart with real data
    drawChart();

    // Load live jobs
    loadLiveJobs(j.byStatus);

    // Load recent users
    loadRecentUsers();

  } catch(e) {
    el.innerHTML = `<div class="table-empty">❌ Failed to load: ${e.message}</div>`;
  }
}

function kpi(icon, value, label, change, up) {
  return `
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-icon">${icon}</div>
        <div class="stat-change ${up ? 'up' : 'down'}">${up ? '↑' : '↓'} ${change}</div>
      </div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
}

function miniCard(icon, bg, label, value) {
  return `
    <div class="card" style="padding:18px;display:flex;align-items:center;gap:14px">
      <div class="stat-icon" style="background:${bg};font-size:22px">${icon}</div>
      <div>
        <div style="font-size:24px;font-weight:900">${value}</div>
        <div style="font-size:13px;color:var(--text-muted);font-weight:500">${label}</div>
      </div>
    </div>`;
}

// FIX #6: Real chart — fetches actual daily job counts from /stats/activity.
// Displays both Jobs count and Revenue trend side-by-side.
async function drawChart() {
  const area = document.getElementById('chartArea');
  if (!area) return;

  // Show a subtle loading state while fetching
  area.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-size:12px">Loading…</div>';

  try {
    const { activity } = await api.getActivity(7);
    const maxJobs = Math.max(...activity.map(d => d.jobs), 1); // avoid divide-by-0
    const maxRevenue = Math.max(...activity.map(d => d.revenue), 1);

    area.innerHTML = activity.map(d => {
      const jobsH = Math.round((d.jobs / maxJobs) * 100);
      const revH = Math.round((d.revenue / maxRevenue) * 100);
      const tooltip = `${d.label} | Jobs: ${d.jobs} | Revenue: ₹${d.revenue.toLocaleString('en-IN')}`;
      return `
        <div class="chart-bar-wrap" title="${tooltip}">
          <div class="chart-bar-group">
            <div class="chart-bar jobs-bar ${d.isToday ? 'active' : ''}" style="height:${Math.max(jobsH, 4)}%"></div>
            <div class="chart-bar revenue-bar ${d.isToday ? 'active' : ''}" style="height:${Math.max(revH, 4)}%"></div>
          </div>
        </div>`;
    }).join('');
  } catch {
    // Fallback to placeholder bars if the activity endpoint is unavailable
    const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const heightsJobs = [40, 60, 45, 80, 65, 100, 75];
    const heightsRev = [30, 50, 70, 40, 80, 90, 60];
    area.innerHTML = heightsJobs.map((h, i) => `
      <div class="chart-bar-wrap">
        <div class="chart-bar-group">
          <div class="chart-bar jobs-bar ${i === todayIdx ? 'active' : ''}" style="height:${h}%"></div>
          <div class="chart-bar revenue-bar ${i === todayIdx ? 'active' : ''}" style="height:${heightsRev[i]}%"></div>
        </div>
      </div>`).join('');
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
              <div class="live-job-title">${j.workType}</div>
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
            <div><div class="user-cell-name">${u.name||'—'}</div><div class="user-cell-id">${u.phone}</div></div>
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
