-- ============================================================
-- v3.0 — Public Engagement
-- Organized event/competition/match gallery photos.
-- Run ONCE if NOT using TypeORM synchronize=true.
-- ============================================================

CREATE TABLE IF NOT EXISTS gallery_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  competition_id  UUID REFERENCES competitions(id) ON DELETE SET NULL,
  match_id        UUID REFERENCES matches(id) ON DELETE SET NULL,
  url             VARCHAR(500) NOT NULL,
  public_id       VARCHAR(255),
  caption         VARCHAR(255),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_by      UUID,
  updated_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by      UUID,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMP WITHOUT TIME ZONE,
  deleted_by      UUID
);

CREATE INDEX IF NOT EXISTS idx_gallery_event_id
  ON gallery_photos (event_id);
CREATE INDEX IF NOT EXISTS idx_gallery_competition_id
  ON gallery_photos (competition_id);
CREATE INDEX IF NOT EXISTS idx_gallery_match_id
  ON gallery_photos (match_id);
CREATE INDEX IF NOT EXISTS idx_gallery_event_competition_match
  ON gallery_photos (event_id, competition_id, match_id);
