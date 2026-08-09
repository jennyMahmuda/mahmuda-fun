-- Admin flag on the EXISTING accounts table — there is deliberately no
-- separate/hardcoded admin credential anywhere in this project. To make
-- an account an admin: sign up normally on /account/ with a real email,
-- then run:
--   UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;

-- Stories submitted through the admin content manager (/admin/). This
-- table is the source of truth only until they're synced into a real
-- story-post/<id>.md file committed to the repo — see
-- script/sync-admin-stories.js and
-- .github/workflows/sync-admin-stories.yml. After a row's synced_at is
-- set, the git-committed markdown is the source of truth for that story,
-- same as every other story on this site; the row stays as a record of
-- what was submitted, not something the live site reads from directly.
CREATE TABLE IF NOT EXISTS admin_stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL, -- markdown-lite body text, same syntax as story-post/*.md (blank-line paragraphs, #/##/### headings, ![](...) images, [text](url) links) — script/sync-admin-stories.js writes this verbatim as a .md body and the normal build (mdToHtml in blog-builder.js) renders it exactly like a hand-authored story
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  series TEXT,
  episode INTEGER,
  language TEXT NOT NULL DEFAULT 'bn',
  cover_url TEXT,
  video_url TEXT,
  audio_url TEXT,
  exclusive INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_stories_status ON admin_stories (status, synced_at);
