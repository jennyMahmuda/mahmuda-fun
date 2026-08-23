-- Optional dedicated poster image for video posts. Existing cover_url remains
-- supported for older records and non-video content.
ALTER TABLE admin_stories ADD COLUMN thumbnail_url TEXT;

CREATE INDEX IF NOT EXISTS idx_admin_stories_content_type ON admin_stories(content_type);

-- Migration complete.

