-- First-party accounts + exclusive-story gating. No third-party login
-- provider is involved; this is a plain email/password system.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_algo TEXT NOT NULL DEFAULT 'pbkdf2-sha256-100000',
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Opaque bearer session tokens (sent as `Authorization: Bearer <token>`,
-- not a cookie — this API lives on a different registrable domain from
-- the site, so a cross-site cookie would be silently dropped by Safari/
-- Brave/Firefox tracking protection for a meaningful share of visitors).
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

-- Single-use tokens emailed to the user for email verification and
-- password reset.
CREATE TABLE IF NOT EXISTS email_tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  used_at TEXT
);

-- Failed-login tracking for basic brute-force throttling. Rows are cheap
-- to prune; a login attempt (success or failure) writes exactly one row.
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  success INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Full body text for stories marked `exclusive: true` in their markdown
-- frontmatter. The public stories/<id>.json the static build produces
-- omits `content` for these — only this table has it. Kept in sync from
-- story-post/*.md by the build (see script/blog-builder.js) via a
-- generated SQL file applied on every Worker deploy.
CREATE TABLE IF NOT EXISTS exclusive_content (
  story_id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id, purpose);
CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_hash, created_at);
