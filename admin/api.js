import { getToken, getBaseUrl, clearSession } from './auth.js';

async function call(path, method = 'GET', body = null) {
  const url = `${getBaseUrl()}/api/admin${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);

  // A2 FIX: Detect expired/invalid JWT and redirect to login immediately.
  if (res.status === 401) {
    clearSession();
    window.location.href = `index.html?reason=expired`;
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getStats:       ()           => call('/stats'),
  getActivity:    (days = 7)   => call(`/stats/activity?days=${days}`),
  invalidateStats:()           => call('/stats/invalidate', 'POST'),
  getUsers:       (q = '')     => call(`/users${q}`),
  updateUser:     (id, data)   => call(`/users/${id}`, 'PATCH', data),
  suspendUser:    (id, suspend) => call(`/users/${id}/suspend`, 'PATCH', { suspend }),
  deleteUser:     (id)         => call(`/users/${id}`, 'DELETE'),
  getJobs:        (q = '')     => call(`/jobs${q}`),
  updateJob:      (id, data)   => call(`/jobs/${id}`, 'PATCH', data),
  getPayments:    (q = '')     => call(`/payments${q}`),
  updatePayment:  (id, data)   => call(`/payments/${id}`, 'PATCH', data),
  getSettlements: (q = '')     => call(`/settlements${q}`),
  settlePayment:  (id, data = {}) => call(`/settlements/${id}/settle`, 'POST', data),
  getAttendance:  ()           => call('/attendance'),
  getRatings:     ()           => call('/ratings'),
  getGroups:      ()           => call('/groups'),
  getAuditLogs:   ()           => call('/audit'),
  getDisputes:    (q = '')     => call(`/disputes${q}`),
  updateDispute:  (id, data)   => call(`/disputes/${id}`, 'PATCH', data),
  getSettings:    ()           => call('/settings'),
  updateSettings: (data)       => call('/settings', 'PATCH', data),
  // Machinery
  getMachinery:         (q = '')   => call(`/machinery${q}`),
  updateMachinery:      (id, data) => call(`/machinery/${id}`, 'PATCH', data),
  deleteMachinery:      (id)       => call(`/machinery/${id}`, 'DELETE'),
  getMachineryBookings: (q = '')   => call(`/machinery-bookings${q}`),
  // Notifications & Broadcast
  getNotifications: ()     => call('/notifications'),
  sendBroadcast:    (data) => call('/notifications/broadcast', 'POST', data),
  // Admin Alerts
  getAlerts: () => call('/alerts'),
};

let _socket = null;

export function initAdminSocket(onEvent) {
  if (typeof window.io === 'undefined') return null;
  if (_socket && _socket.connected) return _socket;

  const baseUrl = getBaseUrl();
  const token = getToken();

  if (!token) return null;

  try {
    _socket = window.io(baseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    _socket.on('connect', () => {
      console.log('⚡ Admin Live WebSocket Connected');
      const pill = document.getElementById('socketStatusPill');
      if (pill) {
        pill.innerHTML = '🟢 Live Sync';
        pill.className = 'live-pill live-connected';
      }
      if (onEvent) onEvent('connect');
    });

    _socket.on('disconnect', (reason) => {
      console.log('⚡ Admin Live WebSocket Disconnected:', reason);
      const pill = document.getElementById('socketStatusPill');
      if (pill) {
        pill.innerHTML = '🔴 Reconnecting...';
        pill.className = 'live-pill live-disconnected';
      }
      if (onEvent) onEvent('disconnect', reason);
    });

    _socket.on('job:created', (data) => {
      if (window.showToast) window.showToast(`🌾 New Job: ${data.workType || 'Farming'} posted`, 'info');
      if (onEvent) onEvent('job:created', data);
    });

    _socket.on('payment:completed', (data) => {
      if (window.showToast) window.showToast(`💳 Payment received: ₹${data.totalAmount || data.amount || 0}`, 'success');
      if (onEvent) onEvent('payment:completed', data);
    });

    _socket.on('settlement:completed', (data) => {
      if (window.showToast) window.showToast(`💸 Settled ₹${data.amount} to ${data.workerName || 'Worker'} (UTR: ${data.utr})`, 'success');
      if (onEvent) onEvent('settlement:completed', data);
    });

    _socket.on('dispute:created', (data) => {
      if (window.showToast) window.showToast(`⚠️ New Dispute: ${data.category || 'Dispute'} filed`, 'error');
      if (onEvent) onEvent('dispute:created', data);
    });

    return _socket;
  } catch (err) {
    console.error('Failed to init Admin Socket:', err);
    return null;
  }
}
