import { getSecret, getBaseUrl } from './auth.js';

async function call(path, method = 'GET', body = null) {
  const url = `${getBaseUrl()}/api/admin${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': getSecret(),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getStats:       ()           => call('/stats'),
  getUsers:       (q = '')     => call(`/users${q}`),
  updateUser:     (id, data)   => call(`/users/${id}`, 'PATCH', data),
  deleteUser:     (id)         => call(`/users/${id}`, 'DELETE'),
  getJobs:        (q = '')     => call(`/jobs${q}`),
  updateJob:      (id, data)   => call(`/jobs/${id}`, 'PATCH', data),
  getPayments:    (q = '')     => call(`/payments${q}`),
  updatePayment:  (id, data)   => call(`/payments/${id}`, 'PATCH', data),
  getAttendance:  ()           => call('/attendance'),
  getRatings:     ()           => call('/ratings'),
  getGroups:      ()           => call('/groups'),
};
