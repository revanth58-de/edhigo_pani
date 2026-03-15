import { api } from '../api.js';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export async function loadStats() {
  const el = document.getElementById('page-stats');
  el.innerHTML = `<div class="table-loading"><div class="spinner"></div></div>`;

  try {
    const data = await api.getStats();
    const u = data.users, j = data.jobs, p = data.payments;
    const farmers   = u.byRole?.farmer  || 0;
    const workers   = u.byRole?.worker  || 0;
    const leaders   = u.byRole?.leader  || 0;
    const openJobs  = j.byStatus?.open  || 0;
    const doneJobs  = j.byStatus?.completed || 0;
    const revenue   = p.revenue || 0;

    el.innerHTML = `
      <!-- KPI Row -->
      <div class="stats-grid">
        ${kpi('💼', '#F0FDF4', openJobs, 'Active Jobs', '+12.5%', true)}
        ${kpi('👤', '#EFF6FF', workers, 'Online Workers', '+5.2%', true)}
        ${kpi('₹', '#FFF5F5', '₹' + revenue.toLocaleString('en-IN'), 'Total Revenue', '-2.4%', false)}
        ${kpi('⏳', '#FFFBEB', u.total, 'Total Users', '+18.1%', true)}
      </div>

      <!-- Charts + Live Jobs -->
      <div class="dash-grid">
        <!-- Weekly Activity -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Weekly Activity</div>
              <div class="card-sub">Jobs &amp; Engagement</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:24px;font-weight:900;color:var(--primary)">${(u.total/1000).toFixed(1)}k</div>
              <div style="font-size:11px;color:var(--primary-dark);font-weight:700">Last 7 Days +14%</div>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-area" id="chartArea"></div>
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

    // Draw chart
    drawChart();

    // Load live jobs
    loadLiveJobs(j.byStatus);

    // Load recent users
    loadRecentUsers();

  } catch(e) {
    el.innerHTML = `<div class="table-empty">❌ Failed to load: ${e.message}</div>`;
  }
}

function kpi(icon, bg, value, label, change, up) {
  return `
    <div class="stat-card">
      <div class="stat-card-header">
        <div class="stat-icon" style="background:${bg}">${icon}</div>
        <div class="stat-change ${up?'up':'down'}">${up?'↑':'↓'} ${change}</div>
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

function drawChart() {
  const area = document.getElementById('chartArea');
  if (!area) return;
  const heights = [40, 60, 45, 80, 65, 100, 75];
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  area.innerHTML = heights.map((h, i) => `
    <div class="chart-bar-wrap">
      <div class="chart-bar ${i === todayIdx ? 'active' : ''}" style="height:${h}%"></div>
    </div>`).join('');
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
