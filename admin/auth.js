// FIX #1: Admin Auth — JWT-based sessions replace the static shared secret.
//
// Flow:
//   1. User enters their secret on the login page.
//   2. We POST to /api/admin/auth/login — the backend validates and returns a JWT.
//   3. The JWT is stored in sessionStorage (cleared when tab/browser closes).
//   4. All API calls attach: Authorization: Bearer <token>
//   5. The token auto-expires in 2 hours; after that the user must re-login.

const SESSION_TOKEN = 'edhigo_admin_token';
const SESSION_URL   = 'edhigo_admin_url';
const SESSION_EXP   = 'edhigo_admin_exp';
const SESSION_ROLE  = 'edhigo_admin_role';

export function getToken()     { return sessionStorage.getItem(SESSION_TOKEN) || ''; }
export function getBaseUrl()   { return sessionStorage.getItem(SESSION_URL) || 'http://localhost:5000'; }
export function getAdminRole() { return sessionStorage.getItem(SESSION_ROLE) || 'super_admin'; }

// Check if a valid (non-expired) token exists in sessionStorage
export function isLoggedIn() {
  const token = getToken();
  if (!token) return false;
  const exp = parseInt(sessionStorage.getItem(SESSION_EXP) || '0', 10);
  return Date.now() < exp;
}

// Called after a successful POST /api/admin/auth/login
export function saveSession(token, url, expiresInHours = 2, role = 'super_admin') {
  sessionStorage.setItem(SESSION_TOKEN, token);
  sessionStorage.setItem(SESSION_URL, url.replace(/\/$/, ''));
  sessionStorage.setItem(SESSION_EXP, String(Date.now() + expiresInHours * 60 * 60 * 1000));
  sessionStorage.setItem(SESSION_ROLE, role);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_TOKEN);
  sessionStorage.removeItem(SESSION_URL);
  sessionStorage.removeItem(SESSION_EXP);
  sessionStorage.removeItem(SESSION_ROLE);
}

export function guardAuth() {
  if (!isLoggedIn()) {
    clearSession();
    window.location.href = 'index.html';
  }
}

// Exchange the admin secret for a JWT token via the backend login endpoint.
// Returns { ok: true, token, adminRole } or { ok: false, error }
export async function loginWithSecret(secret, baseUrl, role = 'super_admin') {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, role }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Login failed' };
    return { ok: true, token: data.token, adminRole: data.adminRole || role };
  } catch (err) {
    return { ok: false, error: `Cannot reach server: ${err.message}` };
  }
}
