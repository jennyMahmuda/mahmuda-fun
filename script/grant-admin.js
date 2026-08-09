#!/usr/bin/env node
'use strict';

/**
 * One-off admin bootstrap: verifies an existing account's email AND
 * grants it is_admin, in one step — for when transactional email
 * (RESEND_API_KEY / RESEND_FROM_EMAIL) isn't configured/working yet and
 * someone who already signed up for a real account is stuck unable to
 * log in at all (handleLogin in cloudflare/worker/src/index.js rejects
 * any unverified account, verified or not, admin or not).
 *
 * Deliberately requires the account to already exist — created normally
 * on /account/ with a real password, hashed and stored exactly like
 * every other account. This never creates a login or sets a password;
 * it only flips two flags on a row that's already there. There is still
 * no separate/hardcoded admin credential anywhere in this project.
 *
 * Run via .github/workflows/grant-admin.yml (workflow_dispatch, an
 * `email` input) so it reuses the CLOUDFLARE_API_TOKEN /
 * CLOUDFLARE_ACCOUNT_ID secrets already configured for D1 migrations —
 * nobody needs direct Cloudflare dashboard access to run this.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB_NAME = 'mahmuda_fun_reviews';

function sqlString(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function runD1(sql) {
  const out = execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['wrangler', 'd1', 'execute', DB_NAME, '--remote', '--json', '--command', sql],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 * 8 }
  );
  const start = out.indexOf('[');
  return JSON.parse(start >= 0 ? out.slice(start) : out);
}

function main() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    console.error('[grant-admin] Not a valid email address: ' + JSON.stringify(process.env.ADMIN_EMAIL || ''));
    process.exit(1);
  }
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.error('[grant-admin] CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set — cannot reach D1.');
    process.exit(1);
  }

  const sql = "UPDATE users SET email_verified = 1, is_admin = 1, updated_at = datetime('now') WHERE email = " + sqlString(email);
  let result;
  try {
    result = runD1(sql);
  } catch (err) {
    console.error('[grant-admin] D1 query failed: ' + err.message);
    process.exit(1);
  }

  const changes = result[0] && result[0].meta && result[0].meta.changes;
  if (!changes) {
    console.error('[grant-admin] No account found for ' + email + ' — sign up on /account/ first (real email + password), then run this again with that same email.');
    process.exit(1);
  }
  console.log('[grant-admin] Done — ' + email + ' is now email-verified and an admin. Log in at /account/, then visit /admin/.');
}

main();
