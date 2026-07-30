-- ============================================================
-- v3.0 — Public Engagement
-- Match summary + external highlight videos (YouTube/Vimeo).
-- Run ONCE if NOT using TypeORM synchronize=true.
-- ============================================================

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS highlight_videos JSONB;
