-- ============================================================
-- v3.0 — Public Engagement
-- Add profile fields to players and teams
-- Run ONCE if NOT using TypeORM synchronize=true.
-- ============================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS position VARCHAR(100),
  ADD COLUMN IF NOT EXISTS achievements JSONB;

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS coaches JSONB,
  ADD COLUMN IF NOT EXISTS achievements JSONB;
