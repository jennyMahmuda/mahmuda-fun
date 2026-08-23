-- Prevent the same anonymous reader from submitting identical comments
-- multiple times on the same story. Existing rows remain valid because the
-- new column is nullable and only new submissions receive a dedupe key.
ALTER TABLE story_reviews ADD COLUMN dedupe_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_story_reviews_dedupe ON story_reviews(story_id, anonymous_key, dedupe_key);
