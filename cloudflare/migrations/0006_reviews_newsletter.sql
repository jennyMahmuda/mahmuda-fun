-- Extends story_reviews with the fields a proper "Leave a Reply"-style
-- form collects (email, optional website), and adds a lightweight
-- newsletter_subscribers table for "email me when new stories publish".
-- Neither is required for the existing review flow to keep working —
-- both are nullable / independently optional.

ALTER TABLE story_reviews ADD COLUMN email TEXT;
ALTER TABLE story_reviews ADD COLUMN website TEXT;
-- Never actually triggers anything yet — there's no reply/comment-thread
-- system for a "follow-up comment" to exist on. Stored so the checkbox
-- in the form is honest (the choice is recorded) without pretending a
-- notification gets sent; wire this up if/when replies are built.
ALTER TABLE story_reviews ADD COLUMN notify_follow_up INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  -- 'review_form' | 'footer' | ... — where the signup came from, for
  -- context only, not enforced against a fixed list.
  source TEXT NOT NULL DEFAULT 'unknown',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created ON newsletter_subscribers(created_at DESC);
