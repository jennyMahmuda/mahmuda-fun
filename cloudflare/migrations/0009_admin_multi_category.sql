-- Allow one admin story to appear in every checked category feed.
ALTER TABLE admin_stories ADD COLUMN categories_json TEXT NOT NULL DEFAULT '[]';
