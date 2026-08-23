'use strict';

const crypto = require('crypto');
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB_NAME = 'mahmuda_fun_reviews';
const ITERATIONS = 100000;

function sqlString(value) { return "'" + String(value).replace(/'/g, "''") + "'"; }
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
  return salt.toString('hex') + ':' + hash.toString('hex');
}
function runD1(sql) {
  const out = execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['wrangler', 'd1', 'execute', DB_NAME, '--remote', '--json', '--command', sql], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 * 8 });
  const start = out.indexOf('[');
  return JSON.parse(start >= 0 ? out.slice(start) : out);
}

const username = String(process.env.ADMIN_USERNAME || '').trim();
const password = String(process.env.ADMIN_PASSWORD || '');
if (!username || username.length > 254 || !password || password.length < 10 || password.length > 512) {
  console.error('[bootstrap-admin] ADMIN_USERNAME is required and ADMIN_PASSWORD must be 10–512 characters.');
  process.exit(1);
}
const hash = hashPassword(password);
const sql = "INSERT INTO users (email, password_hash, email_verified, is_admin) VALUES (" + sqlString(username) + "," + sqlString(hash) + ",1,1) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash, email_verified=1, is_admin=1, updated_at=datetime('now');";
try {
  runD1(sql);
  console.log('[bootstrap-admin] Admin credentials provisioned for the configured username.');
} catch (err) {
  console.error('[bootstrap-admin] D1 provisioning failed: ' + err.message);
  process.exit(1);
}
