-- Persist editor-supplied SEO metadata for admin-authored stories.
ALTER TABLE admin_stories ADD COLUMN seo_title TEXT;
ALTER TABLE admin_stories ADD COLUMN meta_description TEXT;
ALTER TABLE admin_stories ADD COLUMN seo_keywords TEXT NOT NULL DEFAULT '[]';
