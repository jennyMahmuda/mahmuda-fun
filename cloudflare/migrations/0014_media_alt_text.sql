-- Accessibility metadata for admin-managed media.
ALTER TABLE admin_stories ADD COLUMN cover_alt TEXT;
ALTER TABLE admin_stories ADD COLUMN thumbnail_alt TEXT;

-- Existing rows remain valid; the editor will guide authors to add descriptive alt text.
UPDATE admin_stories
SET cover_alt = COALESCE(NULLIF(cover_alt, ''), title)
WHERE cover_url IS NOT NULL AND (cover_alt IS NULL OR cover_alt = '');

UPDATE admin_stories
SET thumbnail_alt = COALESCE(NULLIF(thumbnail_alt, ''), title)
WHERE thumbnail_url IS NOT NULL AND (thumbnail_alt IS NULL OR thumbnail_alt = '');

CREATE INDEX IF NOT EXISTS idx_admin_stories_media_alt ON admin_stories(cover_alt, thumbnail_alt);

-- End migration.
