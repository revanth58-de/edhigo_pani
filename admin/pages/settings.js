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

      <!-- Construction & Skilled Trades Wage Rates -->
      <div class="card" style="padding:24px;grid-column:1 / -1">
        <div style="font-size:16px;font-weight:800;color:#F59E0B;margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <span>🏗️</span> Construction &amp; Skilled Labour Standard Rates (₹/day)
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
          Configure benchmark wages for the 5 core civil labour activity categories and technical specialist positions.
        </div>

        <!-- 5 Construction Categories -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-bottom:20px">
          <!-- 1. Earthwork -->
          <div style="background:rgba(255,255,255,0.02);border:1px solid var(--glass-border);border-radius:12px;padding:16px">
            <div style="font-size:13px;font-weight:700;color:#F59E0B;margin-bottom:10px">1. మట్టి / భూమి పనులు (Earthwork)</div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">త్రవ్వకం (Excavation)</label>
              <input type="number" class="form-input" id="constEarthworkExcavation" style="margin-top:2px" placeholder="550" />
            </div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">స్థలాన్ని సమం చేయడం (Grading)</label>
              <input type="number" class="form-input" id="constEarthworkGrading" style="margin-top:2px" placeholder="500" />
            </div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">మట్టిని గట్టిపరచడం (Compaction)</label>
              <input type="number" class="form-input" id="constEarthworkCompaction" style="margin-top:2px" placeholder="480" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">టన్నెలింగ్ (Tunneling)</label>
              <input type="number" class="form-input" id="constEarthworkTunneling" style="margin-top:2px" placeholder="600" />
            </div>
          </div>

          <!-- 2. Concrete Work -->
          <div style="background:rgba(255,255,255,0.02);border:1px solid var(--glass-border);border-radius:12px;padding:16px">
            <div style="font-size:13px;font-weight:700;color:#60A5FA;margin-bottom:10px">2. కాంక్రీట్ పనులు (Concrete Work)</div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">కాంక్రీట్ కలపడం (Mixing)</label>
              <input type="number" class="form-input" id="constConcreteMixing" style="margin-top:2px" placeholder="550" />
            </div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">ఫార్మ్‌వర్క్ అమర్చడం (Formwork)</label>
              <input type="number" class="form-input" id="constConcreteFormwork" style="margin-top:2px" placeholder="650" />
            </div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">కాంక్రీట్ పోయడం & ముగించడం (Pouring)</label>
              <input type="number" class="form-input" id="constConcretePouring" style="margin-top:2px" placeholder="600" />
            </div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">షాట్‌క్రీట్ (Shotcrete)</label>
              <input type="number" class="form-input" id="constConcreteShotcrete" style="margin-top:2px" placeholder="700" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">క్యూరింగ్ (Curing)</label>
              <input type="number" class="form-input" id="constConcreteCuring" style="margin-top:2px" placeholder="450" />
            </div>
          </div>

          <!-- 3. Structural Support -->
          <div style="background:rgba(255,255,255,0.02);border:1px solid var(--glass-border);border-radius:12px;padding:16px">
            <div style="font-size:13px;font-weight:700;color:#34D399;margin-bottom:10px">3. నిర్మాణానికి మద్దతు ఇచ్చే పనులు (Structural Support)</div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">స్కాఫోల్డింగ్ ఏర్పాటు/తొలగింపు (Scaffolding)</label>
              <input type="number" class="form-input" id="constStructuralScaffolding" style="margin-top:2px" placeholder="650" />
            </div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">బ్రేసింగ్ (Bracing)</label>
              <input type="number" class="form-input" id="constStructuralBracing" style="margin-top:2px" placeholder="600" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">తాత్కాలిక నిర్మాణాలు (Temp Structures)</label>
              <input type="number" class="form-input" id="constStructuralTemporary" style="margin-top:2px" placeholder="550" />
            </div>
          </div>

          <!-- 4. Utility Installation -->
          <div style="background:rgba(255,255,255,0.02);border:1px solid var(--glass-border);border-radius:12px;padding:16px">
            <div style="font-size:13px;font-weight:700;color:#38BDF8;margin-bottom:10px">4. యుటిలిటీ అమరికలు (Utility Installation)</div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">డ్రైనేజ్ పైపులు వేయడం (Drainage Pipes)</label>
              <input type="number" class="form-input" id="constUtilityDrainage" style="margin-top:2px" placeholder="580" />
            </div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">విద్యుత్ కండ్యూట్లు ఏర్పాటు (Conduits)</label>
              <input type="number" class="form-input" id="constUtilityConduits" style="margin-top:2px" placeholder="620" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">తుఫాను నీటి డ్రైన్లు (Storm Drains)</label>
              <input type="number" class="form-input" id="constUtilityStormDrains" style="margin-top:2px" placeholder="560" />
            </div>
          </div>

          <!-- 5. Maintenance -->
          <div style="background:rgba(255,255,255,0.02);border:1px solid var(--glass-border);border-radius:12px;padding:16px">
            <div style="font-size:13px;font-weight:700;color:#A78BFA;margin-bottom:10px">5. నిర్వహణ మరియు శుభ్రత (Maintenance)</div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">సైట్ శుభ్రం చేయడం (Site Cleanup)</label>
              <input type="number" class="form-input" id="constMaintenanceCleanup" style="margin-top:2px" placeholder="450" />
            </div>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">పరికరాల నిర్వహణ (Tool Maintenance)</label>
              <input type="number" class="form-input" id="constMaintenanceTools" style="margin-top:2px" placeholder="500" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">ట్రాఫిక్ నియంత్రణ (Traffic Control)</label>
              <input type="number" class="form-input" id="constMaintenanceTraffic" style="margin-top:2px" placeholder="480" />
            </div>
          </div>
        </div>

        <!-- Key Specialist Roles -->
        <div style="border-top:1px solid var(--glass-border);padding-top:16px">
          <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:12px">ప్రధాన సాంకేతిక వృత్తులు (Key Specialist Roles ₹/day)</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px">
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🧱 మేస్త్రీలు (Masons/Bricklayers)</label>
              <input type="number" class="form-input" id="constRoleMason" style="margin-top:4px" placeholder="800" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🪚 వడ్రంగులు (Carpenters)</label>
              <input type="number" class="form-input" id="constRoleCarpenter" style="margin-top:4px" placeholder="800" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🔧 ప్లంబర్లు (Plumbers)</label>
              <input type="number" class="form-input" id="constRolePlumber" style="margin-top:4px" placeholder="750" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">⚡ ఎలక్ట్రీషియన్లు (Electricians)</label>
              <input type="number" class="form-input" id="constRoleElectrician" style="margin-top:4px" placeholder="750" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🔥 వెల్డర్లు (Welders)</label>
              <input type="number" class="form-input" id="constRoleWelder" style="margin-top:4px" placeholder="750" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🎨 పెయింటర్లు (Painters)</label>
              <input type="number" class="form-input" id="constRolePainter" style="margin-top:4px" placeholder="700" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🏗️ భారీ యంత్రాల ఆపరేటర్లు (Heavy Machinery)</label>
              <input type="number" class="form-input" id="constRoleMachinery" style="margin-top:4px" placeholder="900" />
            </div>
            <div class="form-group">
              <label class="form-label" style="font-size:11px;color:var(--text-muted)">🔩 స్టీల్ ఫిక్సర్లు (Steel Fixers)</label>
              <input type="number" class="form-input" id="constRoleSteel" style="margin-top:4px" placeholder="800" />
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

    // Populating Construction Category Rates
    let constRates = {};
    try {
      constRates = JSON.parse(settingsData['wages.constructionRates'] || '{}');
    } catch (_) {}
    document.getElementById('constEarthworkExcavation').value = constRates.earthwork_excavation || 550;
    document.getElementById('constEarthworkGrading').value = constRates.earthwork_grading || 500;
    document.getElementById('constEarthworkCompaction').value = constRates.earthwork_compaction || 480;
    document.getElementById('constEarthworkTunneling').value = constRates.earthwork_tunneling || 600;

    document.getElementById('constConcreteMixing').value = constRates.concrete_mixing || 550;
    document.getElementById('constConcreteFormwork').value = constRates.concrete_formwork || 650;
    document.getElementById('constConcretePouring').value = constRates.concrete_pouring || 600;
    document.getElementById('constConcreteShotcrete').value = constRates.concrete_shotcrete || 700;
    document.getElementById('constConcreteCuring').value = constRates.concrete_curing || 450;

    document.getElementById('constStructuralScaffolding').value = constRates.structural_scaffolding || 650;
    document.getElementById('constStructuralBracing').value = constRates.structural_bracing || 600;
    document.getElementById('constStructuralTemporary').value = constRates.structural_temporary || 550;

    document.getElementById('constUtilityDrainage').value = constRates.utility_drainage || 580;
    document.getElementById('constUtilityConduits').value = constRates.utility_conduits || 620;
    document.getElementById('constUtilityStormDrains').value = constRates.utility_storm_drains || 560;

    document.getElementById('constMaintenanceCleanup').value = constRates.maintenance_cleanup || 450;
    document.getElementById('constMaintenanceTools').value = constRates.maintenance_tools || 500;
    document.getElementById('constMaintenanceTraffic').value = constRates.maintenance_traffic || 480;

    // Populating Skilled Trade Rates
    let skilledRates = {};
    try {
      skilledRates = JSON.parse(settingsData['wages.skilledTradeRates'] || '{}');
    } catch (_) {}
    document.getElementById('constRoleMason').value = skilledRates.mason || 800;
    document.getElementById('constRoleCarpenter').value = skilledRates.carpenter || 800;
    document.getElementById('constRolePlumber').value = skilledRates.plumber || 750;
    document.getElementById('constRoleElectrician').value = skilledRates.electrician || 750;
    document.getElementById('constRoleWelder').value = skilledRates.welder || 750;
    document.getElementById('constRolePainter').value = skilledRates.painter || 700;
    document.getElementById('constRoleMachinery').value = skilledRates.machinery_operator || 900;
    document.getElementById('constRoleSteel').value = skilledRates.steel_erector || 800;

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
      'wages.constructionRates': JSON.stringify({
        earthwork_excavation: parseInt(document.getElementById('constEarthworkExcavation').value) || 550,
        earthwork_grading: parseInt(document.getElementById('constEarthworkGrading').value) || 500,
        earthwork_compaction: parseInt(document.getElementById('constEarthworkCompaction').value) || 480,
        earthwork_tunneling: parseInt(document.getElementById('constEarthworkTunneling').value) || 600,
        concrete_mixing: parseInt(document.getElementById('constConcreteMixing').value) || 550,
        concrete_formwork: parseInt(document.getElementById('constConcreteFormwork').value) || 650,
        concrete_pouring: parseInt(document.getElementById('constConcretePouring').value) || 600,
        concrete_shotcrete: parseInt(document.getElementById('constConcreteShotcrete').value) || 700,
        concrete_curing: parseInt(document.getElementById('constConcreteCuring').value) || 450,
        structural_scaffolding: parseInt(document.getElementById('constStructuralScaffolding').value) || 650,
        structural_bracing: parseInt(document.getElementById('constStructuralBracing').value) || 600,
        structural_temporary: parseInt(document.getElementById('constStructuralTemporary').value) || 550,
        utility_drainage: parseInt(document.getElementById('constUtilityDrainage').value) || 580,
        utility_conduits: parseInt(document.getElementById('constUtilityConduits').value) || 620,
        utility_storm_drains: parseInt(document.getElementById('constUtilityStormDrains').value) || 560,
        maintenance_cleanup: parseInt(document.getElementById('constMaintenanceCleanup').value) || 450,
        maintenance_tools: parseInt(document.getElementById('constMaintenanceTools').value) || 500,
        maintenance_traffic: parseInt(document.getElementById('constMaintenanceTraffic').value) || 480,
      }),
      'wages.skilledTradeRates': JSON.stringify({
        mason: parseInt(document.getElementById('constRoleMason').value) || 800,
        carpenter: parseInt(document.getElementById('constRoleCarpenter').value) || 800,
        plumber: parseInt(document.getElementById('constRolePlumber').value) || 750,
        electrician: parseInt(document.getElementById('constRoleElectrician').value) || 750,
        welder: parseInt(document.getElementById('constRoleWelder').value) || 750,
        painter: parseInt(document.getElementById('constRolePainter').value) || 700,
        machinery_operator: parseInt(document.getElementById('constRoleMachinery').value) || 900,
        steel_erector: parseInt(document.getElementById('constRoleSteel').value) || 800,
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
