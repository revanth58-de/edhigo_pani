import { api } from "../api.js";

const templates = [
  { title: "🌧️ Heavy Rain Warning", body: "Heavy rainfall expected in your area tomorrow. Please avoid outdoor farm work and ensure your crops are protected.", category: "weather", target: "all" },
  { title: "💰 MSP Price Update", body: "New Minimum Support Price (MSP) for paddy has been announced by the government. Please check the official notice.", category: "price", target: "farmer" },
  { title: "🏛️ PM-KISAN Installment", body: "The next PM-KISAN installment has been released. Check your bank account or nearest CSC center for details.", category: "scheme", target: "farmer" },
  { title: "🔔 Platform Maintenance", body: "DINASARI will undergo maintenance on Sunday 2 AM – 4 AM. The app will be temporarily unavailable during this time.", category: "platform", target: "all" },
  { title: "🌾 Harvest Season Open", body: "Harvest season jobs are now open! Farmers are posting daily wage jobs. Check the app for available opportunities.", category: "announcement", target: "worker" },
];

const categoryEmojis = { announcement: "📣", weather: "🌧️", price: "💰", scheme: "🏛️", platform: "🔔", emergency: "🚨" };

function renderTemplates() {
  return templates.map((t, i) => `
    <button data-template="${i}" style="text-align:left;background:rgba(255,255,255,0.03);border:1px solid var(--glass-border);border-radius:10px;padding:10px 12px;cursor:pointer;transition:background 0.2s;color:#fff;font-size:12px;font-weight:600;width:100%">
      ${t.title}
      <span style="display:block;font-size:11px;font-weight:400;color:var(--text-muted);margin-top:2px">→ ${t.target === "all" ? "All Users" : t.target.charAt(0).toUpperCase() + t.target.slice(1) + "s"}</span>
    </button>
  `).join("");
}

export async function loadNotifications() {
  const el = document.getElementById("page-notifications");
  el.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">📢 Broadcast <span style="color:var(--primary)">Notifications</span></div>
        <div class="section-sub">Compose and dispatch alerts to Farmers, Workers, or all platform users.</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:20px;margin-bottom:20px;align-items:start">
      <div class="card" style="padding:28px">
        <div style="font-size:15px;font-weight:800;color:var(--primary);margin-bottom:20px">✍️ Compose Broadcast</div>
        <div class="form-group" style="margin-bottom:14px">
          <label class="form-label" style="font-size:12px;color:var(--text-dim)">Target Audience</label>
          <select class="form-input" id="broadcastTarget" style="margin-top:6px">
            <option value="all">👥 All Users</option>
            <option value="farmer">🌾 Farmers Only</option>
            <option value="worker">👷 Workers Only</option>
            <option value="leader">👑 Leaders Only</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:14px">
          <label class="form-label" style="font-size:12px;color:var(--text-dim)">Category / Type</label>
          <select class="form-input" id="broadcastCategory" style="margin-top:6px">
            <option value="announcement">📣 General Announcement</option>
            <option value="weather">🌧️ Weather Alert</option>
            <option value="price">💰 Price Advisory</option>
            <option value="scheme">🏛️ Government Scheme</option>
            <option value="platform">🔔 Platform Update</option>
            <option value="emergency">🚨 Emergency Alert</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:14px">
          <label class="form-label" style="font-size:12px;color:var(--text-dim)">Notification Title</label>
          <input type="text" class="form-input" id="broadcastTitle" maxlength="80" style="margin-top:6px" placeholder="e.g. Heavy Rain Warning — Tuesday" />
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px;text-align:right"><span id="titleCount">0</span>/80</div>
        </div>
        <div class="form-group" style="margin-bottom:18px">
          <label class="form-label" style="font-size:12px;color:var(--text-dim)">Message Body</label>
          <textarea class="form-input" id="broadcastBody" rows="4" maxlength="300" style="margin-top:6px;resize:vertical" placeholder="Enter the message content users will receive..."></textarea>
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px;text-align:right"><span id="bodyCount">0</span>/300</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--glass-border);border-radius:14px;padding:16px;margin-bottom:18px">
          <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;font-weight:700;margin-bottom:8px">Preview</div>
          <div style="display:flex;align-items:flex-start;gap:10px">
            <div style="font-size:28px;line-height:1" id="previewEmoji">📣</div>
            <div>
              <div style="font-size:13px;font-weight:800;color:#fff" id="previewTitle">Notification Title</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:3px;line-height:1.4" id="previewBody">Your message will appear here...</div>
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-full" id="sendBroadcastBtn">📡 Send Broadcast</button>
        <div id="broadcastResult" style="display:none;margin-top:12px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600"></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card" style="padding:20px">
          <div style="font-size:14px;font-weight:800;color:#fff;margin-bottom:12px">⚡ Quick Templates</div>
          <div style="display:flex;flex-direction:column;gap:8px" id="templateList">${renderTemplates()}</div>
        </div>
        <div class="card" style="padding:20px">
          <div style="font-size:14px;font-weight:800;color:#fff;margin-bottom:12px">📊 Reach Overview</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:10px">
              <span style="font-size:12px;color:var(--text-muted)">🌾 Farmers</span>
              <span style="font-size:12px;font-weight:700;color:#fff" id="statFarmers">—</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:10px">
              <span style="font-size:12px;color:var(--text-muted)">👷 Workers</span>
              <span style="font-size:12px;font-weight:700;color:#fff" id="statWorkers">—</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:10px">
              <span style="font-size:12px;color:var(--text-muted)">👑 Leaders</span>
              <span style="font-size:12px;font-weight:700;color:#fff" id="statLeaders">—</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(16,185,129,0.08);border-radius:10px;border:1px solid rgba(16,185,129,0.2)">
              <span style="font-size:12px;color:var(--primary);font-weight:700">Total Reach</span>
              <span style="font-size:12px;font-weight:800;color:var(--primary)" id="statTotal">—</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="card" style="padding:24px">
      <div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:16px">📜 Broadcast History</div>
      <div class="table-wrap"><div class="table-scroll">
        <table>
          <thead><tr><th>Title</th><th>Target</th><th>Category</th><th>Recipients</th><th>Sent At</th></tr></thead>
          <tbody id="broadcastHistory"><tr><td colspan="5" class="table-loading"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div></div>
    </div>
  `;

  el.querySelector("#broadcastTitle").addEventListener("input", function() {
    el.querySelector("#titleCount").textContent = this.value.length;
    el.querySelector("#previewTitle").textContent = this.value || "Notification Title";
  });
  el.querySelector("#broadcastBody").addEventListener("input", function() {
    el.querySelector("#bodyCount").textContent = this.value.length;
    el.querySelector("#previewBody").textContent = this.value || "Your message will appear here...";
  });
  el.querySelector("#broadcastCategory").addEventListener("change", function() {
    el.querySelector("#previewEmoji").textContent = categoryEmojis[this.value] || "📣";
  });

  el.querySelector("#templateList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-template]");
    if (!btn) return;
    const tpl = templates[parseInt(btn.dataset.template)];
    el.querySelector("#broadcastTitle").value = tpl.title;
    el.querySelector("#broadcastBody").value = tpl.body;
    el.querySelector("#broadcastCategory").value = tpl.category;
    el.querySelector("#broadcastTarget").value = tpl.target;
    el.querySelector("#titleCount").textContent = tpl.title.length;
    el.querySelector("#bodyCount").textContent = tpl.body.length;
    el.querySelector("#previewTitle").textContent = tpl.title;
    el.querySelector("#previewBody").textContent = tpl.body;
    el.querySelector("#previewEmoji").textContent = categoryEmojis[tpl.category] || "📣";
  });

  el.querySelector("#sendBroadcastBtn").addEventListener("click", async () => {
    const title = el.querySelector("#broadcastTitle").value.trim();
    const body  = el.querySelector("#broadcastBody").value.trim();
    const targetRole = el.querySelector("#broadcastTarget").value;
    const category   = el.querySelector("#broadcastCategory").value;
    const resultEl   = el.querySelector("#broadcastResult");
    const btn        = el.querySelector("#sendBroadcastBtn");
    if (!title || !body) { window.showToast("Title and message body are required", "error"); return; }
    btn.disabled = true;
    btn.textContent = "⏳ Sending...";
    resultEl.style.display = "none";
    try {
      const res = await api.sendBroadcast({ title, body, targetRole, category });
      resultEl.style.cssText = "display:block;margin-top:12px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:var(--primary)";
      resultEl.textContent = "✓ " + res.message;
      window.showToast(res.message || "Broadcast sent!");
      el.querySelector("#broadcastTitle").value = "";
      el.querySelector("#broadcastBody").value = "";
      el.querySelector("#titleCount").textContent = "0";
      el.querySelector("#bodyCount").textContent = "0";
      el.querySelector("#previewTitle").textContent = "Notification Title";
      el.querySelector("#previewBody").textContent = "Your message will appear here...";
      loadHistory();
    } catch(e) {
      resultEl.style.cssText = "display:block;margin-top:12px;padding:12px 16px;border-radius:10px;font-size:13px;font-weight:600;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:var(--danger)";
      resultEl.textContent = "✕ " + e.message;
      window.showToast(e.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "📡 Send Broadcast";
    }
  });

  loadReachStats();
  loadHistory();
}

async function loadReachStats() {
  try {
    const data = await api.getStats();
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setVal("statFarmers", data.farmers ?? 0);
    setVal("statWorkers", data.workers ?? 0);
    setVal("statLeaders", data.leaders ?? 0);
    setVal("statTotal", data.totalUsers ?? 0);
  } catch(_) {}
}

async function loadHistory() {
  const tbody = document.getElementById("broadcastHistory");
  if (!tbody) return;
  try {
    const data = await api.getAuditLogs();
    const broadcasts = (data.logs || []).filter(l => l.action === "broadcast_sent").slice(0, 20);
    if (broadcasts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No broadcasts sent yet</td></tr>`;
      return;
    }
    tbody.innerHTML = broadcasts.map(b => {
      const d = b.details || {};
      return `<tr>
        <td style="font-weight:700;color:#fff;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.title || "—"}</td>
        <td><span class="badge badge-${d.targetRole === "all" ? "green" : "purple"}">${d.targetRole === "all" ? "All Users" : (d.targetRole || "—")}</span></td>
        <td><span class="badge badge-gray">${d.category || "—"}</span></td>
        <td style="font-weight:700;color:var(--primary)">${d.recipientCount ?? "—"}</td>
        <td style="color:var(--text-muted)">${new Date(b.createdAt).toLocaleString()}</td>
      </tr>`;
    }).join("");
  } catch(e) {
    const t = document.getElementById("broadcastHistory");
    if (t) t.innerHTML = `<tr><td colspan="5" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}
