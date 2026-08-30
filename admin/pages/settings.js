import { api } from '../api.js';

let settingsData = {};

export async function loadSettings() {
  const el = document.getElementById('page-settings');
  el.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">System Settings &amp; <span style="color:var(--primary)">Control Panel</span></div>
        <div class="section-sub">Configure wages, minimum wage policy, rental commissions, location telemetry parameters, and core mobile client features.</div>
      </div>
      <div class="section-controls">
        <button class="btn btn-primary" id="saveSettingsBtn">💾 Save Configuration</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <!-- Wages and Crop Rates -->
      <div class="card" style="padding:24px">
        <div style="font-size:16px;font-weight:800;color:var(--primary);margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <span>🌾</span> Labor &amp; Wage Parameters
        </div>
        <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:16px">
          <div class="form-group" style="flex:1">
            <label class="form-label" style="font-size:12px;color:var(--text-dim)">Minimum Daily Worker Wage (₹)</label>
            <input type="number" class="form-input" id="minDailyWage" style="margin-top:6px" placeholder="400" />
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:12px;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.2);margin-bottom:16px">
          <div>
            <div style="font-size:13px;font-weight:700;color:#fff">Enforce Minimum Wage</div>
            <div style="font-size:11px;color:var(--text-muted)">Reject job postings below the minimum wage floor</div>
          </div>
          <label class="switch-container" style="position:relative;display:inline-block;width:48px;height:24px">
            <input type="checkbox" id="enforceMinimum" style="opacity:0;width:0;height:0" />
            <span class="slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:rgba(255,255,255,0.1);border-radius:24px;transition:0.3s"></span>
          </label>
        </div>
        <div style="border-top:1px solid var(--glass-border);padding-top:16px">
          <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:12px">Crop-Specific Wage Rates (₹/day)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🌾 Paddy Harvesting</label>
              <input type="number" class="form-input" id="cropPaddy" style="margin-top:4px" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🎋 Sugarcane Cutting</label>
              <input type="number" class="form-input" id="cropSugarcane" style="margin-top:4px" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">💧 Watering / Spraying</label>
              <input type="number" class="form-input" id="cropWatering" style="margin-top:4px" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🚜 Ploughing</label>
              <input type="number" class="form-input" id="cropPloughing" style="margin-top:4px" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🌿 Cotton Picking</label>
              <input type="number" class="form-input" id="cropCotton" style="margin-top:4px" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🌶️ Chilli Harvesting</label>
              <input type="number" class="form-input" id="cropChilli" style="margin-top:4px" />
            </div>
          </div>
        </div>
      </div>

      <!-- Rents and Machinery -->
      <div class="card" style="padding:24px">
        <div style="font-size:16px;font-weight:800;color:var(--accent);margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <span>🚜</span> Machinery &amp; Rental Rates
        </div>
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label" style="font-size:12px;color:var(--text-dim)">Platform Rental Commission (%)</label>
          <input type="number" class="form-input" id="machineryCommission" style="margin-top:6px" placeholder="10" />
        </div>
        <div style="border-top:1px solid var(--glass-border);padding-top:16px">
          <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:12px">Standard Machine Base Rates (₹/hr)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🚜 Tractor</label>
              <input type="number" class="form-input" id="rentTractor" style="margin-top:4px" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🌾 Harvester</label>
              <input type="number" class="form-input" id="rentHarvester" style="margin-top:4px" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">💧 Pump Set</label>
              <input type="number" class="form-input" id="rentPump" style="margin-top:4px" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">⚙️ Plough</label>
              <input type="number" class="form-input" id="rentPlough" style="margin-top:4px" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🌿 Sprayer</label>
              <input type="number" class="form-input" id="rentSprayer" style="margin-top:4px" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🔧 Thresher</label>
              <input type="number" class="form-input" id="rentThresher" style="margin-top:4px" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:20px;margin-bottom:20px">
      <!-- App Rules & Telemetry -->
      <div class="card" style="padding:24px">
        <div style="font-size:16px;font-weight:800;color:#fff;margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <span>⚙️</span> Telemetry &amp; Platform Fees
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div class="form-group">
            <label class="form-label" style="font-size:12px;color:var(--text-dim)">Platform Commission (Jobs %)</label>
            <input type="number" class="form-input" id="platformCommission" style="margin-top:6px" placeholder="5" />
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;color:var(--text-dim)">Telemetry Ping Interval (sec)</label>
            <input type="number" class="form-input" id="telemetryPingInterval" style="margin-top:6px" placeholder="30" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:12px;color:var(--text-dim)">Telemetry Distance Threshold (meters)</label>
          <input type="number" class="form-input" id="telemetryDistanceThreshold" style="margin-top:6px" placeholder="20" />
        </div>
      </div>

      <!-- Feature Flags & Switches -->
      <div class="card" style="padding:24px;display:flex;flex-direction:column;gap:12px">
        <div style="font-size:16px;font-weight:800;color:var(--danger);margin-bottom:4px;display:flex;align-items:center;gap:8px">
          <span>⚡</span> System Flags &amp; Toggles
        </div>
        
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:12px;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15)">
          <div>
            <div style="font-size:13px;font-weight:700;color:#fff">System Maintenance Mode</div>
            <div style="font-size:11px;color:var(--text-muted)">Block all mobile logins and active app requests</div>
          </div>
          <label class="switch-container" style="position:relative;display:inline-block;width:48px;height:24px">
            <input type="checkbox" id="maintenanceMode" style="opacity:0;width:0;height:0" />
            <span class="slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:rgba(255,255,255,0.1);border-radius:24px;transition:0.3s"></span>
          </label>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:12px;background:rgba(255,255,255,0.02);border:1px solid var(--glass-border)">
          <div>
            <div style="font-size:13px;font-weight:700;color:#fff">SMS / WhatsApp Notifications</div>
            <div style="font-size:11px;color:var(--text-muted)">Enable external SMS/WhatsApp API dispatch</div>
          </div>
          <label class="switch-container" style="position:relative;display:inline-block;width:48px;height:24px">
            <input type="checkbox" id="notificationsEnabled" style="opacity:0;width:0;height:0" />
            <span class="slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:rgba(255,255,255,0.1);border-radius:24px;transition:0.3s"></span>
          </label>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:12px;background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2)">
          <div>
            <div style="font-size:13px;font-weight:700;color:#fff">🔔 Admin Job Alerts</div>
            <div style="font-size:11px;color:var(--text-muted)">Notify admin in real-time when a new job is posted</div>
          </div>
          <label class="switch-container" style="position:relative;display:inline-block;width:48px;height:24px">
            <input type="checkbox" id="adminJobAlerts" style="opacity:0;width:0;height:0" />
            <span class="slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:rgba(255,255,255,0.1);border-radius:24px;transition:0.3s"></span>
          </label>
        </div>
      </div>
    </div>
  `;

  // Inject Slider CSS dynamic rules directly in DOM
  if (!document.getElementById('slider-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'slider-styles';
    styleEl.innerHTML = `
      .switch-container input:checked + .slider {
        background-color: var(--primary) !important;
      }
      .switch-container .slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        border-radius: 50%;
        transition: 0.3s;
      }
      .switch-container input:checked + .slider:before {
        transform: translateX(24px);
      }
    `;
    document.head.appendChild(styleEl);
  }

  // Bind save listener
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

  await loadData();
}

async function loadData() {
  try {
    const res = await api.getSettings();
    settingsData = res.settings || {};

    // Populating Wage Rates
    document.getElementById('minDailyWage').value = settingsData['wages.minDailyWage'] || '400';
    document.getElementById('enforceMinimum').checked = settingsData['wages.enforceMinimum'] !== 'false';
    
    let cropRates = {};
    try {
      cropRates = JSON.parse(settingsData['wages.cropRates'] || '{}');
    } catch (_) {}
    document.getElementById('cropPaddy').value = cropRates.paddy_harvesting || '';
    document.getElementById('cropSugarcane').value = cropRates.sugarcane_cutting || '';
    document.getElementById('cropWatering').value = cropRates.watering || '';
    document.getElementById('cropPloughing').value = cropRates.ploughing || '';
    document.getElementById('cropCotton').value = cropRates.cotton_picking || '';
    document.getElementById('cropChilli').value = cropRates.chilli_harvesting || '';

    // Populating Rental Rates
    document.getElementById('machineryCommission').value = settingsData['rents.machineryCommission'] || '10';
    
    let rentRates = {};
    try {
      rentRates = JSON.parse(settingsData['rents.machineryBaseRates'] || '{}');
    } catch (_) {}
    document.getElementById('rentTractor').value = rentRates.Tractor || '';
    document.getElementById('rentHarvester').value = rentRates.Harvester || '';
    document.getElementById('rentPump').value = rentRates['Pump Set'] || '';
    document.getElementById('rentPlough').value = rentRates.Plough || '';
    document.getElementById('rentSprayer').value = rentRates.Sprayer || '';
    document.getElementById('rentThresher').value = rentRates.Thresher || '';

    // Populating Telemetry and Flags
    document.getElementById('platformCommission').value = settingsData['app.platformCommission'] || '5';
    document.getElementById('telemetryPingInterval').value = settingsData['app.telemetryPingInterval'] || '30';
    document.getElementById('telemetryDistanceThreshold').value = settingsData['app.telemetryDistanceThreshold'] || '20';

    document.getElementById('maintenanceMode').checked = settingsData['app.maintenanceMode'] === 'true';
    document.getElementById('notificationsEnabled').checked = settingsData['app.notificationsEnabled'] !== 'false';
    document.getElementById('adminJobAlerts').checked = settingsData['app.adminJobAlerts'] !== 'false';

  } catch (e) {
    window.showToast('Failed to load settings: ' + e.message, 'error');
  }
}

async function saveSettings() {
  const saveBtn = document.getElementById('saveSettingsBtn');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = '⏳ Saving...';

  try {
    // Construct updates payload
    const updates = {
      'wages.minDailyWage': document.getElementById('minDailyWage').value || '400',
      'wages.enforceMinimum': String(document.getElementById('enforceMinimum').checked),
      'wages.cropRates': JSON.stringify({
        paddy_harvesting: parseInt(document.getElementById('cropPaddy').value) || 500,
        sugarcane_cutting: parseInt(document.getElementById('cropSugarcane').value) || 600,
        watering: parseInt(document.getElementById('cropWatering').value) || 350,
        ploughing: parseInt(document.getElementById('cropPloughing').value) || 450,
        cotton_picking: parseInt(document.getElementById('cropCotton').value) || 480,
        chilli_harvesting: parseInt(document.getElementById('cropChilli').value) || 520,
      }),
      'rents.machineryCommission': document.getElementById('machineryCommission').value || '10',
      'rents.machineryBaseRates': JSON.stringify({
        Tractor: parseInt(document.getElementById('rentTractor').value) || 800,
        Harvester: parseInt(document.getElementById('rentHarvester').value) || 1500,
        'Pump Set': parseInt(document.getElementById('rentPump').value) || 200,
        Plough: parseInt(document.getElementById('rentPlough').value) || 350,
        Sprayer: parseInt(document.getElementById('rentSprayer').value) || 250,
        Thresher: parseInt(document.getElementById('rentThresher').value) || 900,
      }),
      'app.platformCommission': document.getElementById('platformCommission').value || '5',
      'app.telemetryPingInterval': document.getElementById('telemetryPingInterval').value || '30',
      'app.telemetryDistanceThreshold': document.getElementById('telemetryDistanceThreshold').value || '20',
      'app.maintenanceMode': String(document.getElementById('maintenanceMode').checked),
      'app.notificationsEnabled': String(document.getElementById('notificationsEnabled').checked),
      'app.adminJobAlerts': String(document.getElementById('adminJobAlerts').checked),
    };

    const res = await api.updateSettings(updates);
    settingsData = res.settings || {};
    window.showToast('Configuration applied and saved successfully! ✓');
  } catch (e) {
    window.showToast(e.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}
