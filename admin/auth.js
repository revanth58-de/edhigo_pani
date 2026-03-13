// Auth helpers
const SESSION_KEY = 'edhigo_admin_key';
const SESSION_URL = 'edhigo_admin_url';

export function getSecret() { return sessionStorage.getItem(SESSION_KEY) || ''; }
export function getBaseUrl() { return sessionStorage.getItem(SESSION_URL) || 'http://localhost:5000'; }

export function isLoggedIn() { return !!getSecret(); }

export function saveSession(secret, url) {
  sessionStorage.setItem(SESSION_KEY, secret);
  sessionStorage.setItem(SESSION_URL, url.replace(/\/$/, ''));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_URL);
}

export function guardAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'index.html';
  }
}
