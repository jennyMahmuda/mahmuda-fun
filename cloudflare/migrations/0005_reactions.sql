-- A single "recommend" reaction per story per (anonymous) reader — one
-- reaction type, not a multi-emoji picker. Toggled: reacting again
-- removes it. Same anonymous_key model as story_ratings/story_reviews
-- (a client-generated key in localStorage, not an account).
CREATE TABLE IF NOT EXISTS story_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id TEXT NOT NULL,
  anonymous_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(story_id, anonymous_key)
);

CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions (story_id);
