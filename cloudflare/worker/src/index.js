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
  const match = pathname.match(/^\/api\/stories\/([^/]+)\/(ratings|reviews)$/);
  return match ? { storyId: decodeURIComponent(match[1]), resource: match[2] } : null;
}

function routeStoryContent(pathname) {
  const match = pathname.match(/^\/api\/stories\/([^/]+)\/content$/);
  return match ? decodeURIComponent(match[1]) : null;
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

function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 256;
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
    `SELECT u.id AS userId, u.email AS email, u.email_verified AS emailVerified
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > datetime('now')`
  ).bind(token).first();
}

// ---------- email ----------

async function sendEmail(env, to, subject, html) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [to], subject, html }),
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
  return json({ authenticated: true, email: user.email, emailVerified: !!user.emailVerified }, 200, corsHeaders(origin));
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

// ---------- exclusive story content ----------

async function handleStoryContent(request, env, origin, storyId) {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: 'Log in to read this story' }, 401, corsHeaders(origin));
  if (!user.emailVerified) return json({ error: 'Please verify your email to read exclusive stories' }, 403, corsHeaders(origin));

  const row = await env.REVIEWS_DB.prepare('SELECT content FROM exclusive_content WHERE story_id = ?').bind(storyId).first();
  if (!row) return json({ error: 'Not found' }, 404, corsHeaders(origin));
  return json({ storyId, content: row.content }, 200, corsHeaders(origin));
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

    // ----- auth -----
    if (pathname === '/api/auth/signup' && request.method === 'POST') return handleSignup(request, env, origin);
    if (pathname === '/api/auth/verify' && request.method === 'POST') return handleVerifyEmail(request, env, origin);
    if (pathname === '/api/auth/login' && request.method === 'POST') return handleLogin(request, env, origin);
    if (pathname === '/api/auth/logout' && request.method === 'POST') return handleLogout(request, env, origin);
    if (pathname === '/api/auth/me' && request.method === 'GET') return handleMe(request, env, origin);
    if (pathname === '/api/auth/request-password-reset' && request.method === 'POST') return handleRequestPasswordReset(request, env, origin);
    if (pathname === '/api/auth/reset-password' && request.method === 'POST') return handleResetPassword(request, env, origin);

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

    const reviewText = typeof body?.reviewText === 'string' ? body.reviewText.trim() : '';
    const displayName = typeof body?.displayName === 'string' ? body.displayName.trim().slice(0, 80) : null;
    if (reviewText.length < 2 || reviewText.length > 2000) {
      return json({ error: 'Review must be between 2 and 2000 characters' }, 400, corsHeaders(origin));
    }
    await env.REVIEWS_DB.prepare(
      'INSERT INTO story_reviews (story_id, display_name, review_text, anonymous_key) VALUES (?, ?, ?, ?)'
    ).bind(route.storyId, displayName, reviewText, anonymousKey).run();
    return json({ ok: true, status: 'pending_moderation' }, 201, corsHeaders(origin));
  },
};
