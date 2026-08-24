-- Consent-based Premium lead capture. One lead per account user.
CREATE TABLE IF NOT EXISTS premium_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  consent INTEGER NOT NULL DEFAULT 0 CHECK (consent IN (0, 1)),
  source TEXT NOT NULL DEFAULT 'premium_page',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_premium_leads_created ON premium_leads(created_at DESC);

-- One private thread per account user and the site admin. Message bodies are
-- authenticated and never exposed through public/static endpoints.
CREATE TABLE IF NOT EXISTS admin_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin')),
  body TEXT NOT NULL,
  client_key TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, client_key)
);
CREATE INDEX IF NOT EXISTS idx_admin_messages_thread ON admin_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_messages_unread ON admin_messages(sender_role, read_at);
