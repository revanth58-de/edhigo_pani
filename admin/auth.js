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

export function getToken()   { return sessionStorage.getItem(SESSION_TOKEN) || ''; }
export function getBaseUrl() { return sessionStorage.getItem(SESSION_URL) || 'http://localhost:5000'; }

// Check if a valid (non-expired) token exists in sessionStorage
export function isLoggedIn() {
  const token = getToken();
  if (!token) return false;
  const exp = parseInt(sessionStorage.getItem(SESSION_EXP) || '0', 10);
  return Date.now() < exp;
}

// Called after a successful POST /api/admin/auth/login
export function saveSession(token, url, expiresInHours = 2) {
  sessionStorage.setItem(SESSION_TOKEN, token);
  sessionStorage.setItem(SESSION_URL, url.replace(/\/$/, ''));
  sessionStorage.setItem(SESSION_EXP, String(Date.now() + expiresInHours * 60 * 60 * 1000));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_TOKEN);
  sessionStorage.removeItem(SESSION_URL);
  sessionStorage.removeItem(SESSION_EXP);
}

export function guardAuth() {
  if (!isLoggedIn()) {
    clearSession();
    window.location.href = 'index.html';
  }
}

// Exchange the admin secret for a JWT token via the backend login endpoint.
// Returns { ok: true, token } or { ok: false, error }
export async function loginWithSecret(secret, baseUrl) {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Login failed' };
    return { ok: true, token: data.token };
  } catch (err) {
    return { ok: false, error: `Cannot reach server: ${err.message}` };
  }
}
