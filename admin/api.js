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
  // Without this, every page shows "Request failed" with no explanation.
  if (res.status === 401) {
    clearSession();
    window.location.href = `index.html?reason=expired`;
    return; // Never resolves — navigation is in progress
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
  getAttendance:  ()           => call('/attendance'),
  getRatings:     ()           => call('/ratings'),
  getGroups:      ()           => call('/groups'),
};
