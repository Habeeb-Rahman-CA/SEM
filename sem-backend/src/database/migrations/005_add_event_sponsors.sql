-- ============================================================
-- v3.0 — Public Engagement
-- Add sponsors[] JSONB column to events
-- Run ONCE if NOT using TypeORM synchronize=true.
-- ============================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS sponsors JSONB;
