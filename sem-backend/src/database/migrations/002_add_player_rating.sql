-- Migration 002: Add per-match player rating to match_players table
-- Rating range: 5.0–10.0 (NULL = not yet rated)

ALTER TABLE match_players
  ADD COLUMN IF NOT EXISTS rating DECIMAL(4, 2) DEFAULT NULL
    CONSTRAINT chk_match_player_rating CHECK (rating IS NULL OR (rating >= 5.0 AND rating <= 10.0));

COMMENT ON COLUMN match_players.rating IS
  'Per-match player rating (5.0–10.0). NULL means the match is not yet completed or the rating has not been calculated. Set automatically on match completion or manually overridden by an admin.';
