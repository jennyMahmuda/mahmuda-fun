-- The admin story editor had no way to say "this is a video" or "this is
-- a gallery image" — sync-admin-stories.js hardcoded every admin-authored
-- story as `type: text` in the generated frontmatter, regardless of
-- whether a video/cover URL was filled in. That's the reason an
-- admin-created video post never showed up on /video/ (which — per
-- guideline.md — is supposed to filter by `type: video`): the field it
-- was documented to read was never actually being set.

ALTER TABLE admin_stories ADD COLUMN content_type TEXT NOT NULL DEFAULT 'text';
