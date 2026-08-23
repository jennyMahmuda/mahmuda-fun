const JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
  'cache-control': 'no-store',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return origin && allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin) {
  return origin ? {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'false',
    'access-control-allow-headers': 'content-type, x-anonymous-key, authorization',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'vary': 'Origin',
  } : {};
}

function routeStoryId(pathname) {
  const match = pathname.match(/^\/api\/stories\/([^/]+)\/(ratings|reviews|reactions)$/);
  return match ? { storyId: decodeURIComponent(match[1]), resource: match[2] } : null;
}

function routeStoryContent(pathname) {
  const match = pathname.match(/^\/api\/stories\/([^/]+)\/content$/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Action-suffixed POST routes (/update, /publish, /delete) rather than
// PUT/DELETE verbs — this Worker only accepts GET/POST at the top of the
// dispatcher (see fetch() below); reusing that instead of widening the
// allowed-methods/CORS surface for one feature.
function routeAdminStoryAction(pathname) {
  const match = pathname.match(/^\/api\/admin\/stories\/([^/]+)\/(update|publish|delete)$/);
  return match ? { storyId: decodeURIComponent(match[1]), action: match[2] } : null;
}

function routeAdminReviewAction(pathname) {
  const match = pathname.match(/^\/api\/admin\/reviews\/(\d+)\/(approve|reject)$/);
  return match ? { reviewId: Number(match[1]), action: match[2] } : null;
}

function validStoryId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(value);
}

function validAnonymousKey(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9._:-]{16,160}$/.test(value);
}

function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validContactCategory(value) {
  return typeof value === 'string' && ['creator', 'advertising', 'other'].includes(value);
}

// HTML-escapes text going into an email body built from visitor input —
// this is server-generated HTML (unlike the JSON API responses elsewhere
// in this file), so it needs its own escaping, not the frontend's.
function escapeHtmlEmail(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 256;
}

// ---------- admin content validators ----------
// Content submitted here goes through the same admin-only trust boundary
// as a direct GitHub commit already has (see getAdminUser/requireAdmin
// below) — these are sanity limits (size, obviously-bad values), not
// public-input sanitization.

function validAdminTitle(value) {
  return typeof value === 'string' && value.trim().length >= 2 && value.length <= 300;
}
function validAdminExcerpt(value) {
  return typeof value === 'string' && value.trim().length >= 2 && value.length <= 600;
}
function validAdminContent(value) {
  return typeof value === 'string' && value.trim().length >= 20 && value.length <= 200000;
}
function validAdminCategory(value) {
  return typeof value === 'string' && value.trim().length >= 1 && value.length <= 60;
}
function validAdminTags(value) {
  return Array.isArray(value) && value.length <= 15 &&
    value.every((t) => typeof t === 'string' && t.length >= 1 && t.length <= 40);
}
// Optional media reference: a URL or a relative path already inside this
// repo (e.g. "story-post/image/x.jpg"). Rejects control characters and
// the javascript: scheme; does not otherwise restrict — the site owner's
// own markdown files already reference arbitrary paths/URLs the same way.
function validAdminMediaRef(value) {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value !== 'string' || value.length > 600) return false;
  if (/[\x00-\x1f]/.test(value)) return false;
  if (/^\s*javascript:/i.test(value)) return false;
  return true;
}

function validToken(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// ---------- crypto helpers ----------

function base64UrlEncodeString(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeBytes(bytes) {
  let binary = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Accepts a PEM private key either with real newlines or with literal
// "\n" escape sequences (common when pasting a multi-line PEM into a
// single-line secret store), strips the PEM header/footer, and returns
// the raw PKCS8 key bytes for crypto.subtle.importKey.
function pemToArrayBuffer(pem) {
  const normalized = String(pem || '').replace(/\\n/g, '\n');
  const b64 = normalized.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufToHex(buf) {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuf(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const PBKDF2_ITERATIONS = 100000;
// A syntactically valid (but unreachable) salt:hash pair used to keep login
// timing constant for emails that don't exist — see handleLogin.
const DUMMY_PASSWORD_HASH = '00'.repeat(16) + ':' + '00'.repeat(32);

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, keyMaterial, 256);
  return bufToHex(salt) + ':' + bufToHex(new Uint8Array(bits));
}

async function verifyPassword(password, stored) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 2) return false;
  const [saltHex, hashHex] = parts;
  if (!/^[a-f0-9]+$/.test(saltHex) || !/^[a-f0-9]+$/.test(hashHex)) return false;
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hexToBuf(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, keyMaterial, 256);
  return timingSafeEqualHex(bufToHex(new Uint8Array(bits)), hashHex);
}

function generateToken() {
  return bufToHex(crypto.getRandomValues(new Uint8Array(32)));
}

async function hashIp(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const pepper = env.AUTH_SECRET || 'unconfigured-pepper';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + ':' + pepper));
  return bufToHex(new Uint8Array(digest));
}

function getBearerToken(request) {
  const header = request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function getSessionUser(request, env) {
  const token = getBearerToken(request);
  if (!validToken(token) || !env.REVIEWS_DB) return null;
  return env.REVIEWS_DB.prepare(
    `SELECT u.id AS userId, u.email AS email, u.email_verified AS emailVerified, u.is_admin AS isAdmin
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > datetime('now')`
  ).bind(token).first();
}

// Admin gate: reuses the exact same session/Bearer-token lookup as every
// other authenticated endpoint — there is no separate admin credential.
// "Admin" is just an is_admin=1 flag on a normal, real, password-hashed
// account (see cloudflare/migrations/0004_admin_content.sql and
// cloudflare/README.md for how to grant it). Returns the user row, or
// null if not logged in / not an admin — callers must check for null and
// return 401/403, never assume this succeeded.
async function getAdminUser(request, env) {
  const user = await getSessionUser(request, env);
  return user && user.isAdmin ? user : null;
}

// ---------- email ----------

async function sendEmail(env, to, subject, html, options) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return false;
  try {
    const body = { from: env.RESEND_FROM_EMAIL, to: [to], subject, html };
    if (options && options.replyTo) body.reply_to = options.replyTo;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------- server-side GA4 events (Measurement Protocol) ----------

// Only fires when the visitor already accepted analytics client-side (the
// frontend passes gaClientId from gtag's own client_id, and only does so
// when GA already loaded under consent — see assets/js/auth.js). No
// consent, no gaClientId, no event: this must stay opt-in, same as the
// existing client-side analytics.
async function sendGaEvent(env, gaClientId, name, params) {
  if (!env.GA_API_SECRET || !env.GA_MEASUREMENT_ID || !gaClientId) return;
  if (typeof gaClientId !== 'string' || gaClientId.length > 200) return;
  try {
    await fetch(
      'https://www.google-analytics.com/mp/collect?measurement_id=' + encodeURIComponent(env.GA_MEASUREMENT_ID) + '&api_secret=' + encodeURIComponent(env.GA_API_SECRET),
      {
        method: 'POST',
        body: JSON.stringify({ client_id: gaClientId, events: [{ name, params: params || {} }] }),
      }
    );
  } catch {
    // Analytics is best-effort — never let a GA outage affect signup/login.
  }
}

function verifyEmailHtml(link) {
  return '<p>Confirm your mahmuda.fun account:</p><p><a href="' + link + '">' + link + '</a></p><p>This link expires in 24 hours. If you did not create this account, ignore this email.</p>';
}

function resetEmailHtml(link) {
  return '<p>Reset your mahmuda.fun password:</p><p><a href="' + link + '">' + link + '</a></p><p>This link expires in 1 hour. If you did not request this, ignore this email — your password will not change.</p>';
}

// ---------- rate limiting ----------

const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_MAX_ATTEMPTS = 8;

async function isRateLimited(env, email, ipHash) {
  const row = await env.REVIEWS_DB.prepare(
    `SELECT COUNT(*) AS n FROM login_attempts
     WHERE success = 0 AND created_at > datetime('now', '-' || ? || ' minutes')
       AND (email = ? OR ip_hash = ?)`
  ).bind(LOGIN_WINDOW_MINUTES, email, ipHash).first();
  return Number(row?.n || 0) >= LOGIN_MAX_ATTEMPTS;
}

async function recordLoginAttempt(env, email, ipHash, success) {
  await env.REVIEWS_DB.prepare(
    'INSERT INTO login_attempts (email, ip_hash, success) VALUES (?, ?, ?)'
  ).bind(email, ipHash, success ? 1 : 0).run();
}

// ---------- auth routes ----------

async function handleSignup(request, env, origin) {
  const body = await readJson(request);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body?.password;
  const gaClientId = typeof body?.gaClientId === 'string' ? body.gaClientId : null;
  if (!validEmail(email) || !validPassword(password)) {
    return json({ error: 'A valid email and a password of at least 8 characters are required' }, 400, corsHeaders(origin));
  }

  const existing = await env.REVIEWS_DB.prepare('SELECT id, email_verified AS emailVerified FROM users WHERE email = ?').bind(email).first();
  // Always return the same response whether or not the email is already
  // registered — this avoids leaking which email addresses have an
  // account on an adult-content site, which is more sensitive than usual.
  const genericResponse = json({ ok: true, status: 'check_your_email' }, 201, corsHeaders(origin));

  if (existing) {
    if (!existing.emailVerified) {
      // Unverified account retrying signup — resend a fresh verification link.
      const token = generateToken();
      await env.REVIEWS_DB.prepare(
        "INSERT INTO email_tokens (token, user_id, purpose, expires_at) VALUES (?, ?, 'verify', datetime('now', '+24 hours'))"
      ).bind(token, existing.id).run();
      await sendEmail(env, email, 'Confirm your mahmuda.fun account', verifyEmailHtml(verifyLink(env, token)));
    }
    return genericResponse;
  }

  const passwordHash = await hashPassword(password);
  let inserted;
  try {
    inserted = await env.REVIEWS_DB.prepare(
      'INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id'
    ).bind(email, passwordHash).first();
  } catch {
    // UNIQUE constraint on email — a concurrent signup for the same address
    // landed between our existence check and this insert. Same response
    // either way, so this isn't observable as a distinct outcome.
    return genericResponse;
  }
  const token = generateToken();
  await env.REVIEWS_DB.prepare(
    "INSERT INTO email_tokens (token, user_id, purpose, expires_at) VALUES (?, ?, 'verify', datetime('now', '+24 hours'))"
  ).bind(token, inserted.id).run();
  await sendEmail(env, email, 'Confirm your mahmuda.fun account', verifyEmailHtml(verifyLink(env, token)));
  await sendGaEvent(env, gaClientId, 'sign_up', { method: 'email' });
  return genericResponse;
}

function verifyLink(env, token) {
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean);
  const base = allowed[0] || 'https://mahmuda.fun';
  return base + '/account/verify.html?token=' + encodeURIComponent(token);
}

function resetLink(env, token) {
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean);
  const base = allowed[0] || 'https://mahmuda.fun';
  return base + '/account/reset.html?token=' + encodeURIComponent(token);
}

async function handleVerifyEmail(request, env, origin) {
  const body = await readJson(request);
  const token = body?.token;
  if (!validToken(token)) return json({ error: 'Invalid or expired verification link' }, 400, corsHeaders(origin));

  const row = await env.REVIEWS_DB.prepare(
    "SELECT user_id AS userId FROM email_tokens WHERE token = ? AND purpose = 'verify' AND used_at IS NULL AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!row) return json({ error: 'Invalid or expired verification link' }, 400, corsHeaders(origin));

  await env.REVIEWS_DB.batch([
    env.REVIEWS_DB.prepare("UPDATE email_tokens SET used_at = datetime('now') WHERE token = ?").bind(token),
    env.REVIEWS_DB.prepare("UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?").bind(row.userId),
  ]);

  const sessionToken = generateToken();
  await env.REVIEWS_DB.prepare(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))"
  ).bind(sessionToken, row.userId).run();
  return json({ ok: true, sessionToken }, 200, corsHeaders(origin));
}

async function handleLogin(request, env, origin) {
  const body = await readJson(request);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body?.password;
  const gaClientId = typeof body?.gaClientId === 'string' ? body.gaClientId : null;
  const ipHash = await hashIp(request, env);

  if (!validEmail(email) || typeof password !== 'string' || !password) {
    return json({ error: 'Email and password are required' }, 400, corsHeaders(origin));
  }
  if (await isRateLimited(env, email, ipHash)) {
    return json({ error: 'Too many attempts. Try again in a few minutes.' }, 429, corsHeaders(origin));
  }

  const user = await env.REVIEWS_DB.prepare(
    'SELECT id, password_hash AS passwordHash, email_verified AS emailVerified FROM users WHERE email = ?'
  ).bind(email).first();

  // Always run the (slow, ~100k-iteration) password check, even for a
  // nonexistent account, against a fixed dummy hash of the same format.
  // Skipping it when `user` is null would make login respond measurably
  // faster for unregistered emails than for wrong-password attempts on
  // real accounts — an email-enumeration side channel we specifically
  // don't want on a site where account existence itself is sensitive.
  const ok = await verifyPassword(password, user ? user.passwordHash : DUMMY_PASSWORD_HASH);
  await recordLoginAttempt(env, email, ipHash, ok && !!user);
  if (!user || !ok) return json({ error: 'Incorrect email or password' }, 401, corsHeaders(origin));
  if (!user.emailVerified) return json({ error: 'Please verify your email before logging in' }, 403, corsHeaders(origin));

  const sessionToken = generateToken();
  await env.REVIEWS_DB.prepare(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))"
  ).bind(sessionToken, user.id).run();
  await sendGaEvent(env, gaClientId, 'login', { method: 'email' });
  return json({ ok: true, sessionToken }, 200, corsHeaders(origin));
}

async function handleAdminLogin(request, env, origin) {
  const body = await readJson(request);
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const ipHash = await hashIp(request, env);
  if (!username || !password || !env.ADMIN_USERNAME || !env.REVIEWS_DB) return json({ error: 'Admin login is not configured' }, 503, corsHeaders(origin));
  if (await isRateLimited(env, username, ipHash)) return json({ error: 'Too many attempts. Try again in a few minutes.' }, 429, corsHeaders(origin));
  const user = await env.REVIEWS_DB.prepare('SELECT id, password_hash AS passwordHash FROM users WHERE email = ? AND is_admin = 1').bind(username).first();
  const ok = await verifyPassword(password, user ? user.passwordHash : DUMMY_PASSWORD_HASH);
  await recordLoginAttempt(env, username, ipHash, ok && !!user);
  if (!user || username !== env.ADMIN_USERNAME || !ok) return json({ error: 'Incorrect admin username or password' }, 401, corsHeaders(origin));
  const sessionToken = generateToken();
  await env.REVIEWS_DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))").bind(sessionToken, user.id).run();
  return json({ ok: true, sessionToken }, 200, corsHeaders(origin));
}

async function handleLogout(request, env, origin) {
  const token = getBearerToken(request);
  if (validToken(token)) {
    await env.REVIEWS_DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }
  return json({ ok: true }, 200, corsHeaders(origin));
}

async function handleMe(request, env, origin) {
  const user = await getSessionUser(request, env);
  if (!user) return json({ authenticated: false }, 200, corsHeaders(origin));
  return json({ authenticated: true, email: user.email, emailVerified: !!user.emailVerified, isAdmin: !!user.isAdmin }, 200, corsHeaders(origin));
}

async function handleRequestPasswordReset(request, env, origin) {
  const body = await readJson(request);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const generic = json({ ok: true, status: 'check_your_email' }, 200, corsHeaders(origin));
  if (!validEmail(email)) return generic;

  const user = await env.REVIEWS_DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (user) {
    const token = generateToken();
    await env.REVIEWS_DB.prepare(
      "INSERT INTO email_tokens (token, user_id, purpose, expires_at) VALUES (?, ?, 'reset', datetime('now', '+1 hour'))"
    ).bind(token, user.id).run();
    await sendEmail(env, email, 'Reset your mahmuda.fun password', resetEmailHtml(resetLink(env, token)));
  }
  return generic;
}

async function handleResetPassword(request, env, origin) {
  const body = await readJson(request);
  const token = body?.token;
  const password = body?.password;
  if (!validToken(token) || !validPassword(password)) {
    return json({ error: 'Invalid link or password is too short (minimum 8 characters)' }, 400, corsHeaders(origin));
  }

  const row = await env.REVIEWS_DB.prepare(
    "SELECT user_id AS userId FROM email_tokens WHERE token = ? AND purpose = 'reset' AND used_at IS NULL AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!row) return json({ error: 'Invalid or expired reset link' }, 400, corsHeaders(origin));

  const passwordHash = await hashPassword(password);
  await env.REVIEWS_DB.batch([
    env.REVIEWS_DB.prepare("UPDATE email_tokens SET used_at = datetime('now') WHERE token = ?").bind(token),
    env.REVIEWS_DB.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").bind(passwordHash, row.userId),
    // Changing the password invalidates every existing session, everywhere.
    env.REVIEWS_DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.userId),
  ]);
  return json({ ok: true }, 200, corsHeaders(origin));
}

// ---------- generic D1 cache (Google OAuth token, GA4 top-content result) ----------

async function cacheGet(env, key) {
  const row = await env.REVIEWS_DB.prepare(
    "SELECT value_json AS v FROM analytics_cache WHERE cache_key = ? AND expires_at > datetime('now')"
  ).bind(key).first();
  if (!row) return null;
  try { return JSON.parse(row.v); } catch { return null; }
}

async function cacheSet(env, key, value, ttlSeconds) {
  await env.REVIEWS_DB.prepare(
    `INSERT INTO analytics_cache (cache_key, value_json, expires_at, updated_at)
     VALUES (?, ?, datetime('now', '+' || ? || ' seconds'), datetime('now'))
     ON CONFLICT(cache_key) DO UPDATE SET value_json = excluded.value_json, expires_at = excluded.expires_at, updated_at = excluded.updated_at`
  ).bind(key, JSON.stringify(value), ttlSeconds).run();
}

// ---------- Google Analytics Data API (GA4) — "Trending" content ----------
// Server-side only: uses a Google service account (GOOGLE_CLIENT_EMAIL +
// GOOGLE_PRIVATE_KEY, both Worker secrets — never referenced from any
// frontend file) to sign a JWT, exchange it for an OAuth access token,
// then call the GA4 Data API for the most-viewed story pages. Both the
// access token and the report result are cached in D1 so a page view
// never triggers a live Google call — only a cache read, refreshed at
// most once an hour.

async function getGoogleAccessToken(env) {
  if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY) return null;
  const cached = await cacheGet(env, 'google_access_token');
  if (cached && cached.token) return cached.token;

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const signingInput = base64UrlEncodeString(JSON.stringify(header)) + '.' + base64UrlEncodeString(JSON.stringify(claims));

  let accessToken = null;
  try {
    const keyBuf = pemToArrayBuffer(env.GOOGLE_PRIVATE_KEY);
    const cryptoKey = await crypto.subtle.importKey('pkcs8', keyBuf, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
    const jwt = signingInput + '.' + base64UrlEncodeBytes(signature);

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(jwt),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        accessToken = data.access_token;
        // Refresh a minute before actual expiry, never past it.
        await cacheSet(env, 'google_access_token', { token: accessToken }, Math.max(60, (data.expires_in || 3600) - 60));
      }
    }
  } catch {
    return null;
  }
  return accessToken;
}

async function fetchTopContentFromGa4(env) {
  const accessToken = await getGoogleAccessToken(env);
  if (!accessToken || !env.GA_PROPERTY_ID) return [];
  const propertyId = String(env.GA_PROPERTY_ID).replace(/^properties\//, '');

  try {
    const res = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 25,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rows = data.rows || [];
    const seen = {};
    const out = [];
    for (const row of rows) {
      const path = row.dimensionValues && row.dimensionValues[0] && row.dimensionValues[0].value;
      const views = row.metricValues && row.metricValues[0] ? Number(row.metricValues[0].value) : 0;
      if (!path) continue;
      const m = path.match(/[?&]story=([^&]+)/);
      if (!m) continue;
      const storyId = decodeURIComponent(m[1]);
      if (seen[storyId] || !validStoryId(storyId)) continue;
      seen[storyId] = true;
      out.push({ storyId, views });
      if (out.length >= 10) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function getTopContent(env) {
  const cached = await cacheGet(env, 'top_content');
  if (cached) return cached;
  const fresh = await fetchTopContentFromGa4(env);
  await cacheSet(env, 'top_content', fresh, 3600);
  return fresh;
}

// ---------- admin: GA4 connection diagnostic ----------
// getGoogleAccessToken()/fetchTopContentFromGa4() above deliberately
// swallow every failure into null/[] — that's the right behavior for a
// page render (fail quiet, show nothing), but it means "Trending is
// empty" is genuinely ambiguous from the outside: no credentials? a bad
// private key? a Google API error? a real zero (no story pageviews in
// GA4 yet)? Those are four different fixes. This repeats the same two
// live calls (bypassing every cache, unlike the real path) and reports
// exactly which stage it got to, so that question has a real answer
// instead of a guess — without ever returning the private key or token.
async function diagnoseGa4(env) {
  if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
    return { ok: false, stage: 'credentials', message: 'GOOGLE_CLIENT_EMAIL and/or GOOGLE_PRIVATE_KEY are not set on the Worker — add them as repo secrets and re-run "Deploy Cloudflare Worker".' };
  }
  if (!env.GA_PROPERTY_ID) {
    return { ok: false, stage: 'credentials', message: 'GA_PROPERTY_ID is not set on the Worker — add it as a repo secret (GA4 Admin → Property Settings → Property ID, a plain number) and re-run "Deploy Cloudflare Worker".' };
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const signingInput = base64UrlEncodeString(JSON.stringify(header)) + '.' + base64UrlEncodeString(JSON.stringify(claims));

  let accessToken;
  try {
    const keyBuf = pemToArrayBuffer(env.GOOGLE_PRIVATE_KEY);
    const cryptoKey = await crypto.subtle.importKey('pkcs8', keyBuf, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
    const jwt = signingInput + '.' + base64UrlEncodeBytes(signature);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(jwt),
    });
    if (!tokenRes.ok) {
      const bodyText = await tokenRes.text().catch(() => '');
      let reason = bodyText;
      try { reason = JSON.parse(bodyText).error_description || JSON.parse(bodyText).error || bodyText; } catch {}
      return {
        ok: false, stage: 'token',
        message: 'Google rejected the service-account credentials (HTTP ' + tokenRes.status + '): ' + String(reason).slice(0, 300) +
          '. Usually means GOOGLE_PRIVATE_KEY is malformed/truncated, or GOOGLE_CLIENT_EMAIL does not match the key.',
      };
    }
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return { ok: false, stage: 'token', message: 'Google returned no access_token for these credentials.' };
    }
    accessToken = tokenData.access_token;
  } catch (err) {
    return { ok: false, stage: 'token', message: 'Could not sign/exchange the service-account JWT: ' + (err && err.message ? err.message : 'unknown error') + '. Usually means GOOGLE_PRIVATE_KEY is not a valid PKCS8 PEM key.' };
  }

  const propertyId = String(env.GA_PROPERTY_ID).replace(/^properties\//, '');
  try {
    const res = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 25,
      }),
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      let reason = bodyText;
      try { reason = JSON.parse(bodyText).error?.message || bodyText; } catch {}
      return {
        ok: false, stage: 'api', message: 'Token exchange succeeded, but the GA4 Data API call failed (HTTP ' + res.status + '): ' + String(reason).slice(0, 300) +
          '. Usually means GA_PROPERTY_ID is wrong, or the service account (' + env.GOOGLE_CLIENT_EMAIL + ') was never added as a Viewer on that GA4 property.',
      };
    }
    const data = await res.json();
    const rows = data.rows || [];
    const storyRows = rows.filter((row) => row.dimensionValues && row.dimensionValues[0] && /[?&]story=/.test(row.dimensionValues[0].value || ''));
    if (!storyRows.length) {
      return {
        ok: true, stage: 'data', rows: 0,
        message: rows.length
          ? 'Connected — GA4 returned ' + rows.length + ' page(s) with views, but none were story reader URLs (?story=...) in the last 28 days yet.'
          : 'Connected — GA4 returned no pageview data at all for the last 28 days yet (a brand-new property, or the cookie-consent banner is being rejected by most visitors, both suppress this).',
      };
    }
    return { ok: true, stage: 'data', rows: storyRows.length, message: 'Connected — ' + storyRows.length + ' story page(s) with real GA4 pageviews in the last 28 days.' };
  } catch (err) {
    return { ok: false, stage: 'api', message: 'Token exchange succeeded, but the GA4 Data API request itself failed: ' + (err && err.message ? err.message : 'unknown error') };
  }
}

async function handleGa4Status(request, env, origin) {
  const admin = await getAdminUser(request, env);
  if (!admin) return json({ error: 'Admin login required' }, 401, corsHeaders(origin));
  const result = await diagnoseGa4(env);
  return json(result, 200, corsHeaders(origin));
}

async function handleTopContent(request, env, origin) {
  if (!origin && request.headers.get('Origin')) return json({ error: 'Origin not allowed' }, 403);
  const topContent = await getTopContent(env);
  return json({ topContent }, 200, corsHeaders(origin));
}

// ---------- contact form (Become a Creator, Advertising, etc.) ----------

async function handleContact(request, env, origin) {
  const body = await readJson(request);
  const category = validContactCategory(body?.category) ? body.category : 'other';
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!validEmail(email)) return json({ error: 'A valid email is required' }, 400, corsHeaders(origin));
  if (message.length < 10 || message.length > 4000) {
    return json({ error: 'Message must be between 10 and 4000 characters' }, 400, corsHeaders(origin));
  }

  const subject = '[mahmuda.fun ' + category + ' inquiry] from ' + (name || email);
  const html = '<p><strong>Category:</strong> ' + escapeHtmlEmail(category) + '</p>' +
    '<p><strong>Name:</strong> ' + escapeHtmlEmail(name || '(not provided)') + '</p>' +
    '<p><strong>Email:</strong> ' + escapeHtmlEmail(email) + '</p>' +
    '<p><strong>Message:</strong></p><p>' + escapeHtmlEmail(message).replace(/\n/g, '<br>') + '</p>';

  const sent = await sendEmail(env, 'support@mahmuda.fun', subject, html, { replyTo: email });
  if (!sent) return json({ error: 'Could not send right now — please email support@mahmuda.fun directly' }, 503, corsHeaders(origin));
  return json({ ok: true }, 200, corsHeaders(origin));
}

// ---------- newsletter ("email me new stories first") ----------
// Capture-only: this records the subscription. Actually emailing
// subscribers when a new story publishes is a separate, not-yet-built
// piece (a campaign send, not a transactional one like the rest of
// sendEmail's uses) — see cloudflare/README.md.

async function handleNewsletterSubscribe(request, env, origin) {
  const body = await readJson(request);
  const email = validEmail(body?.email) ? String(body.email).trim().slice(0, 254) : '';
  if (!email) return json({ error: 'A valid email is required' }, 400, corsHeaders(origin));
  const source = typeof body?.source === 'string' && body.source.length <= 40 ? body.source : 'unknown';
  await env.REVIEWS_DB.prepare(
    'INSERT INTO newsletter_subscribers (email, source) VALUES (?, ?) ON CONFLICT(email) DO NOTHING'
  ).bind(email, source).run();
  return json({ ok: true }, 200, corsHeaders(origin));
}

// ---------- recent reviews (site-wide marquee) ----------
// Same-shape data as the per-story GET .../reviews, just not scoped to
// one story — the client maps storyId back to a title/link using
// stories/index.json (already fetched on every page), the same pattern
// blog.js's renderTrending() uses for GA4 storyIds.

async function handleRecentReviews(request, env, origin) {
  const result = await env.REVIEWS_DB.prepare(
    "SELECT id, story_id AS storyId, display_name AS displayName, review_text AS reviewText, created_at AS createdAt " +
    "FROM story_reviews WHERE status = 'approved' ORDER BY created_at DESC LIMIT 24"
  ).all();
  return json({ reviews: result.results || [] }, 200, corsHeaders(origin));
}

// ---------- admin review moderation ----------
// Reviews default to status='pending' and the public GET only ever
// returns 'approved' ones (see the ratings/reviews route below) — before
// these three endpoints existed there was no way to move a review out of
// 'pending' at all short of a manual `wrangler d1 execute` UPDATE.

async function handleAdminListReviews(request, env, origin) {
  const admin = await getAdminUser(request, env);
  if (!admin) return json({ error: 'Admin login required' }, 401, corsHeaders(origin));
  const result = await env.REVIEWS_DB.prepare(
    "SELECT id, story_id AS storyId, display_name AS displayName, review_text AS reviewText, email, website, status, created_at AS createdAt " +
    "FROM story_reviews WHERE status = 'pending' ORDER BY created_at DESC LIMIT 100"
  ).all();
  return json({ reviews: result.results || [] }, 200, corsHeaders(origin));
}

async function handleAdminModerateReview(request, env, origin, reviewId, action) {
  const admin = await getAdminUser(request, env);
  if (!admin) return json({ error: 'Admin login required' }, 401, corsHeaders(origin));
  const status = action === 'approve' ? 'approved' : 'rejected';
  const result = await env.REVIEWS_DB.prepare(
    "UPDATE story_reviews SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(status, reviewId).run();
  if (!result.meta || !result.meta.changes) return json({ error: 'Not found' }, 404, corsHeaders(origin));
  return json({ ok: true, status }, 200, corsHeaders(origin));
}

// ---------- admin: newsletter subscriber list ----------
// Emails are PII, so unlike the ratings/reactions/top-content summaries
// (public, aggregate-only) this is admin-gated — it's the only place the
// actual subscriber list is ever readable anywhere.

async function handleAdminListNewsletter(request, env, origin) {
  const admin = await getAdminUser(request, env);
  if (!admin) return json({ error: 'Admin login required' }, 401, corsHeaders(origin));
  const result = await env.REVIEWS_DB.prepare(
    'SELECT id, email, source, created_at AS createdAt FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 2000'
  ).all();
  const subscribers = result.results || [];
  return json({ subscribers, count: subscribers.length }, 200, corsHeaders(origin));
}

// ---------- exclusive story content ----------

async function handleStoryContent(request, env, origin, storyId) {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Log in to read this story' }, 401, corsHeaders(origin));
  if (!user.emailVerified) return json({ error: 'Please verify your email to read exclusive stories' }, 403, corsHeaders(origin));

  const row = await env.REVIEWS_DB.prepare('SELECT content FROM exclusive_content WHERE story_id = ?').bind(storyId).first();
  if (!row) return json({ error: 'Not found' }, 404, corsHeaders(origin));
  return json({ storyId, content: row.content }, 200, corsHeaders(origin));
}

// ---------- admin content manager ----------
// Everything below is gated by getAdminUser (a real, password-hashed
// account with is_admin=1 — see cloudflare/migrations/0004_admin_content.sql).
// Rows written here are drafts/published-but-not-yet-synced; the actual
// live site never reads this table directly (no per-request DB query on
// page views) — script/sync-admin-stories.js turns 'published' rows into
// real story-post/<id>.md files on a schedule, same pattern as the
// story-translation pipeline used earlier in this project.

function adminStoryRowToJson(row) {
  if (!row) return null;
  let tags = [];
  try { tags = JSON.parse(row.tags || '[]'); } catch { tags = []; }
  return {
    id: row.id, title: row.title, excerpt: row.excerpt, content: row.content,
    category: row.category, tags, series: row.series || null,
    episode: row.episode || null, language: row.language,
    contentType: row.content_type || 'text',
    coverUrl: row.cover_url || null, videoUrl: row.video_url || null, audioUrl: row.audio_url || null,
    seoTitle: row.seo_title || '', metaDescription: row.meta_description || '',
    seoKeywords: (() => { try { return JSON.parse(row.seo_keywords || '[]'); } catch { return []; } })(),
    exclusive: !!row.exclusive, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at, syncedAt: row.synced_at || null,
  };
}

function validContentType(value) {
  return value === 'text' || value === 'video' || value === 'image';
}

async function handleAdminListStories(request, env, origin) {
  const admin = await getAdminUser(request, env);
  if (!admin) return json({ error: 'Admin login required' }, 401, corsHeaders(origin));
  const result = await env.REVIEWS_DB.prepare(
    'SELECT * FROM admin_stories ORDER BY updated_at DESC LIMIT 200'
  ).all();
  return json({ stories: (result.results || []).map(adminStoryRowToJson) }, 200, corsHeaders(origin));
}

function validateAdminStoryBody(body) {
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  if (!validStoryId(id)) return 'A story id is required (letters, numbers, - and _ only, max 160 chars)';
  if (!validAdminTitle(body?.title)) return 'Title is required (2-300 characters)';
  if (!validAdminExcerpt(body?.excerpt)) return 'Excerpt is required (2-600 characters)';
  if (!validAdminContent(body?.content)) return 'Story text is required (at least 20 characters, max 200,000)';
  if (!validAdminCategory(body?.category)) return 'Category is required (max 60 characters)';
  if (body?.tags !== undefined && !validAdminTags(body.tags)) return 'Tags must be an array of up to 15 short strings';
  if (!validAdminMediaRef(body?.coverUrl)) return 'Cover image reference is invalid';
  if (!validAdminMediaRef(body?.videoUrl)) return 'Video reference is invalid';
  if (!validAdminMediaRef(body?.audioUrl)) return 'Audio reference is invalid';
  if (body?.contentType !== undefined && !validContentType(body.contentType)) return 'Content type must be text, video, or image';
  if (body?.seoTitle != null && (typeof body.seoTitle !== 'string' || body.seoTitle.length > 65)) return 'SEO title must be 65 characters or fewer';
  if (body?.metaDescription != null && (typeof body.metaDescription !== 'string' || body.metaDescription.length > 158)) return 'Meta description must be 158 characters or fewer';
  if (body?.seoKeywords != null && (!Array.isArray(body.seoKeywords) || body.seoKeywords.length > 20 || body.seoKeywords.some((k) => typeof k !== 'string' || k.length > 60))) return 'SEO keywords must be up to 20 short phrases';
  if (body?.series !== undefined && body.series !== null && (typeof body.series !== 'string' || body.series.length > 120)) return 'Series name is too long';
  if (body?.episode !== undefined && body.episode !== null && !(Number.isInteger(body.episode) && body.episode > 0 && body.episode < 10000)) return 'Episode must be a positive whole number';
  return null;
}

async function handleAdminCreateStory(request, env, origin) {
  const admin = await getAdminUser(request, env);
  if (!admin) return json({ error: 'Admin login required' }, 401, corsHeaders(origin));
  const body = await readJson(request);
  const error = validateAdminStoryBody(body);
  if (error) return json({ error }, 400, corsHeaders(origin));

  const existing = await env.REVIEWS_DB.prepare('SELECT id FROM admin_stories WHERE id = ?').bind(body.id).first();
  if (existing) return json({ error: 'A story with this id already exists — use the update endpoint instead' }, 409, corsHeaders(origin));

  await env.REVIEWS_DB.prepare(
    `INSERT INTO admin_stories (id, title, excerpt, content, category, tags, series, episode, content_type, cover_url, video_url, audio_url, seo_title, meta_description, seo_keywords, exclusive, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`
  ).bind(
    body.id, body.title.trim(), body.excerpt.trim(), body.content,
    body.category.trim(), JSON.stringify(body.tags || []), body.series || null, body.episode || null,
    body.contentType || 'text', body.coverUrl || null, body.videoUrl || null, body.audioUrl || null,
    body.seoTitle || null, body.metaDescription || null, JSON.stringify(body.seoKeywords || []), body.exclusive ? 1 : 0, admin.userId
  ).run();
  return json({ ok: true, id: body.id }, 201, corsHeaders(origin));
}

async function handleAdminUpdateStory(request, env, origin, storyId) {
  const admin = await getAdminUser(request, env);
  if (!admin) return json({ error: 'Admin login required' }, 401, corsHeaders(origin));
  if (!validStoryId(storyId)) return json({ error: 'Not found' }, 404, corsHeaders(origin));

  const row = await env.REVIEWS_DB.prepare('SELECT id, synced_at FROM admin_stories WHERE id = ?').bind(storyId).first();
  if (!row) return json({ error: 'Not found' }, 404, corsHeaders(origin));

  const body = await readJson(request);
  const error = validateAdminStoryBody({ ...body, id: storyId });
  if (error) return json({ error }, 400, corsHeaders(origin));

  await env.REVIEWS_DB.prepare(
    `UPDATE admin_stories SET title = ?, excerpt = ?, content = ?, category = ?, tags = ?, series = ?, episode = ?,
     content_type = ?, cover_url = ?, video_url = ?, audio_url = ?, seo_title = ?, meta_description = ?, seo_keywords = ?, exclusive = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(
    body.title.trim(), body.excerpt.trim(), body.content, body.category.trim(), JSON.stringify(body.tags || []),
    body.series || null, body.episode || null, body.contentType || 'text', body.coverUrl || null, body.videoUrl || null, body.audioUrl || null,
    body.seoTitle || null, body.metaDescription || null, JSON.stringify(body.seoKeywords || []), body.exclusive ? 1 : 0, storyId
  ).run();
  return json({ ok: true, alreadySynced: !!row.synced_at }, 200, corsHeaders(origin));
}

async function handleAdminPublishStory(request, env, origin, storyId) {
  const admin = await getAdminUser(request, env);
  if (!admin) return json({ error: 'Admin login required' }, 401, corsHeaders(origin));
  if (!validStoryId(storyId)) return json({ error: 'Not found' }, 404, corsHeaders(origin));
  const result = await env.REVIEWS_DB.prepare(
    "UPDATE admin_stories SET status = 'published', updated_at = datetime('now') WHERE id = ?"
  ).bind(storyId).run();
  if (!result.meta || !result.meta.changes) return json({ error: 'Not found' }, 404, corsHeaders(origin));
  return json({ ok: true, status: 'published' }, 200, corsHeaders(origin));
}

async function handleAdminDeleteStory(request, env, origin, storyId) {
  const admin = await getAdminUser(request, env);
  if (!admin) return json({ error: 'Admin login required' }, 401, corsHeaders(origin));
  if (!validStoryId(storyId)) return json({ error: 'Not found' }, 404, corsHeaders(origin));
  const row = await env.REVIEWS_DB.prepare('SELECT synced_at FROM admin_stories WHERE id = ?').bind(storyId).first();
  if (!row) return json({ error: 'Not found' }, 404, corsHeaders(origin));
  if (row.synced_at) {
    return json({ error: 'This story is already published to the live site — remove or edit story-post/' + storyId + '.md in the repo instead of deleting it here' }, 409, corsHeaders(origin));
  }
  await env.REVIEWS_DB.prepare('DELETE FROM admin_stories WHERE id = ?').bind(storyId).run();
  return json({ ok: true }, 200, corsHeaders(origin));
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    const pathname = new URL(request.url).pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, corsHeaders(origin));
    }

    if (pathname === '/health') {
      return json({ ok: true, service: 'mahmuda-fun-api', database: 'configured' }, 200, corsHeaders(origin));
    }

    if (!env.REVIEWS_DB) {
      return json({ error: 'Database binding is not configured' }, 503, corsHeaders(origin));
    }

    if (pathname === '/api/ratings/summary' && request.method === 'GET') {
      if (!origin && request.headers.get('Origin')) return json({ error: 'Origin not allowed' }, 403);
      const result = await env.REVIEWS_DB.prepare(
        'SELECT story_id AS storyId, COUNT(*) AS count, ROUND(AVG(rating), 2) AS average FROM story_ratings GROUP BY story_id ORDER BY average DESC, count DESC LIMIT 200'
      ).all();
      return json({ ratings: result.results || [] }, 200, corsHeaders(origin));
    }

    if (pathname === '/api/reactions/summary' && request.method === 'GET') {
      if (!origin && request.headers.get('Origin')) return json({ error: 'Origin not allowed' }, 403);
      const result = await env.REVIEWS_DB.prepare(
        'SELECT story_id AS storyId, COUNT(*) AS count FROM story_reactions GROUP BY story_id ORDER BY count DESC LIMIT 200'
      ).all();
      return json({ reactions: result.results || [] }, 200, corsHeaders(origin));
    }

    if (pathname === '/api/analytics/top-content' && request.method === 'GET') return handleTopContent(request, env, origin);

    if (pathname === '/api/reviews/recent' && request.method === 'GET') {
      if (!origin && request.headers.get('Origin')) return json({ error: 'Origin not allowed' }, 403);
      return handleRecentReviews(request, env, origin);
    }
    if (pathname === '/api/newsletter/subscribe' && request.method === 'POST') return handleNewsletterSubscribe(request, env, origin);

    // ----- auth -----
    if (pathname === '/api/auth/signup' && request.method === 'POST') return handleSignup(request, env, origin);
    if (pathname === '/api/auth/verify' && request.method === 'POST') return handleVerifyEmail(request, env, origin);
    if (pathname === '/api/auth/login' && request.method === 'POST') return handleLogin(request, env, origin);
    if (pathname === '/api/admin/login' && request.method === 'POST') return handleAdminLogin(request, env, origin);
    if (pathname === '/api/auth/logout' && request.method === 'POST') return handleLogout(request, env, origin);
    if (pathname === '/api/auth/me' && request.method === 'GET') return handleMe(request, env, origin);
    if (pathname === '/api/auth/request-password-reset' && request.method === 'POST') return handleRequestPasswordReset(request, env, origin);
    if (pathname === '/api/auth/reset-password' && request.method === 'POST') return handleResetPassword(request, env, origin);

    // ----- contact form -----
    if (pathname === '/api/contact' && request.method === 'POST') return handleContact(request, env, origin);

    // ----- admin content manager (see getAdminUser — gated by is_admin) -----
    // Defense in depth on top of the auth check: also require a
    // recognized Origin, same as the ratings/reviews write path.
    if (pathname.startsWith('/api/admin/') && !origin && request.headers.get('Origin')) {
      return json({ error: 'Origin not allowed' }, 403);
    }
    if (pathname === '/api/admin/stories' && request.method === 'GET') return handleAdminListStories(request, env, origin);
    if (pathname === '/api/admin/stories' && request.method === 'POST') return handleAdminCreateStory(request, env, origin);
    const adminAction = routeAdminStoryAction(pathname);
    if (adminAction && request.method === 'POST') {
      if (!validStoryId(adminAction.storyId)) return json({ error: 'Not found' }, 404, corsHeaders(origin));
      if (adminAction.action === 'update') return handleAdminUpdateStory(request, env, origin, adminAction.storyId);
      if (adminAction.action === 'publish') return handleAdminPublishStory(request, env, origin, adminAction.storyId);
      if (adminAction.action === 'delete') return handleAdminDeleteStory(request, env, origin, adminAction.storyId);
    }
    if (pathname === '/api/admin/reviews' && request.method === 'GET') return handleAdminListReviews(request, env, origin);
    const adminReviewAction = routeAdminReviewAction(pathname);
    if (adminReviewAction && request.method === 'POST') {
      return handleAdminModerateReview(request, env, origin, adminReviewAction.reviewId, adminReviewAction.action);
    }
    if (pathname === '/api/admin/newsletter' && request.method === 'GET') return handleAdminListNewsletter(request, env, origin);
    if (pathname === '/api/admin/ga4-status' && request.method === 'GET') return handleGa4Status(request, env, origin);

    // ----- exclusive content -----
    const contentStoryId = routeStoryContent(pathname);
    if (contentStoryId !== null && request.method === 'GET') {
      if (!validStoryId(contentStoryId)) return json({ error: 'Not found' }, 404, corsHeaders(origin));
      return handleStoryContent(request, env, origin, contentStoryId);
    }

    // ----- ratings / reviews -----
    const route = routeStoryId(pathname);
    if (!route || !validStoryId(route.storyId)) {
      return json({ error: 'Not found' }, 404, corsHeaders(origin));
    }

    if (!origin && request.headers.get('Origin')) {
      return json({ error: 'Origin not allowed' }, 403);
    }

    if (request.method === 'GET' && route.resource === 'ratings') {
      const result = await env.REVIEWS_DB.prepare(
        'SELECT COUNT(*) AS count, COALESCE(ROUND(AVG(rating), 2), 0) AS average FROM story_ratings WHERE story_id = ?'
      ).bind(route.storyId).first();
      return json({ storyId: route.storyId, count: Number(result?.count || 0), average: Number(result?.average || 0) }, 200, corsHeaders(origin));
    }

    if (request.method === 'GET' && route.resource === 'reviews') {
      const result = await env.REVIEWS_DB.prepare(
        'SELECT id, story_id AS storyId, display_name AS displayName, review_text AS reviewText, created_at AS createdAt FROM story_reviews WHERE story_id = ? AND status = ? ORDER BY created_at DESC LIMIT 50'
      ).bind(route.storyId, 'approved').all();
      return json({ storyId: route.storyId, reviews: result.results || [] }, 200, corsHeaders(origin));
    }

    if (request.method === 'GET' && route.resource === 'reactions') {
      const result = await env.REVIEWS_DB.prepare(
        'SELECT COUNT(*) AS count FROM story_reactions WHERE story_id = ?'
      ).bind(route.storyId).first();
      return json({ storyId: route.storyId, count: Number(result?.count || 0) }, 200, corsHeaders(origin));
    }

    const body = await readJson(request);
    const anonymousKey = request.headers.get('X-Anonymous-Key') || body?.anonymousKey;
    if (!validAnonymousKey(anonymousKey)) {
      return json({ error: 'A client-generated anonymous key is required' }, 400, corsHeaders(origin));
    }

    if (route.resource === 'ratings') {
      const rating = Number(body?.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return json({ error: 'Rating must be an integer from 1 to 5' }, 400, corsHeaders(origin));
      }
      await env.REVIEWS_DB.prepare(
        `INSERT INTO story_ratings (story_id, rating, anonymous_key) VALUES (?, ?, ?)
         ON CONFLICT(story_id, anonymous_key) DO UPDATE SET rating = excluded.rating, updated_at = datetime('now')`
      ).bind(route.storyId, rating, anonymousKey).run();
      return json({ ok: true, status: 'saved' }, 201, corsHeaders(origin));
    }

    // Toggle: reacting again removes the reaction (this is the write path
    // for the "recommend" button — see the GET branch above for the
    // read-only count used everywhere else).
    if (route.resource === 'reactions') {
      const existing = await env.REVIEWS_DB.prepare(
        'SELECT 1 FROM story_reactions WHERE story_id = ? AND anonymous_key = ?'
      ).bind(route.storyId, anonymousKey).first();
      let reacted;
      if (existing) {
        await env.REVIEWS_DB.prepare(
          'DELETE FROM story_reactions WHERE story_id = ? AND anonymous_key = ?'
        ).bind(route.storyId, anonymousKey).run();
        reacted = false;
      } else {
        await env.REVIEWS_DB.prepare(
          'INSERT INTO story_reactions (story_id, anonymous_key) VALUES (?, ?)'
        ).bind(route.storyId, anonymousKey).run();
        reacted = true;
      }
      const countRow = await env.REVIEWS_DB.prepare(
        'SELECT COUNT(*) AS count FROM story_reactions WHERE story_id = ?'
      ).bind(route.storyId).first();
      return json({ ok: true, reacted, count: Number(countRow?.count || 0) }, 200, corsHeaders(origin));
    }

    const reviewText = typeof body?.reviewText === 'string' ? body.reviewText.trim() : '';
    const displayName = typeof body?.displayName === 'string' ? body.displayName.trim().slice(0, 80) : null;
    if (reviewText.length < 2 || reviewText.length > 2000) {
      return json({ error: 'Review must be between 2 and 2000 characters' }, 400, corsHeaders(origin));
    }
    // Every field below is optional — the review form works exactly as
    // before if none of them are sent. Website is never validated as a
    // real URL (it's a free-text credit field, same as WordPress) and
    // never used for anything except display; it's stored, not fetched.
    const reviewEmail = validEmail(body?.email) ? String(body.email).trim().slice(0, 254) : null;
    const website = typeof body?.website === 'string' ? body.website.trim().slice(0, 300) : null;
    const notifyFollowUp = body?.notifyFollowUp === true ? 1 : 0;
    const notifyNewPosts = body?.notifyNewPosts === true;
    await env.REVIEWS_DB.prepare(
      'INSERT INTO story_reviews (story_id, display_name, review_text, anonymous_key, email, website, notify_follow_up) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(route.storyId, displayName, reviewText, anonymousKey, reviewEmail, website, notifyFollowUp).run();
    // "Notify me of new posts by email" — a real newsletter opt-in,
    // independent of review moderation (the review can sit pending while
    // the subscription is active immediately). Silently no-ops without an
    // email or without the checkbox — never required to leave a review.
    if (notifyNewPosts && reviewEmail) {
      await env.REVIEWS_DB.prepare(
        "INSERT INTO newsletter_subscribers (email, source) VALUES (?, 'review_form') ON CONFLICT(email) DO NOTHING"
      ).bind(reviewEmail).run();
    }
    return json({ ok: true, status: 'pending_moderation' }, 201, corsHeaders(origin));
  },
};
