-- Generic short-lived cache for the Google OAuth access token and the GA4
-- Data API "top content" result, so a page view never triggers a live
-- Google OAuth/Analytics call — it reads this cache, refreshing it only
-- when expired.
CREATE TABLE IF NOT EXISTS analytics_cache (
  cache_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
