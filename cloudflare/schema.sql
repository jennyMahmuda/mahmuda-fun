-- Cloudflare D1 (SQLite) schema for the future rating/review feature.
-- Do not run until the API, moderation policy and consent notice are reviewed.
CREATE TABLE IF NOT EXISTS story_ratings (
  story_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  anonymous_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (story_id, anonymous_key)
);

CREATE TABLE IF NOT EXISTS story_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id TEXT NOT NULL,
  display_name TEXT,
  review_text TEXT NOT NULL CHECK (length(review_text) BETWEEN 2 AND 2000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  moderation_reason TEXT,
  anonymous_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_story_ratings_story ON story_ratings(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reviews_story_status ON story_reviews(story_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_reviews_anonymous ON story_reviews(anonymous_key, created_at DESC);
