-- Store the member-facing name separately from the login email.
-- Existing accounts remain valid with an empty name and can add one later.
ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
