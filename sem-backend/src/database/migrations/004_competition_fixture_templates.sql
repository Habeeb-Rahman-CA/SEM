-- ============================================================
-- Competition Templates & Fixture Templates Tables
-- Run ONCE if NOT using TypeORM synchronize=true.
-- ============================================================

-- ── Competition Templates ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS competition_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  sport_id        UUID REFERENCES sports(id) ON DELETE SET NULL,
  points_config   JSONB,
  stage_blueprints JSONB,
  use_count       INTEGER NOT NULL DEFAULT 0,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_competition_templates_workspace_id
  ON competition_templates (workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competition_templates_fts
  ON competition_templates
  USING GIN (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  );

-- ── Fixture Templates ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fixture_templates (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        VARCHAR(150) NOT NULL,
  description                 TEXT,
  default_kickoff_time        VARCHAR(5),           -- HH:MM
  match_interval_days         INTEGER NOT NULL DEFAULT 1,
  matches_per_day             INTEGER NOT NULL DEFAULT 1,
  gap_between_matches_minutes INTEGER NOT NULL DEFAULT 90,
  venue_slots                 JSONB,
  venue_strategy              VARCHAR(30) NOT NULL DEFAULT 'round_robin',
  use_count                   INTEGER NOT NULL DEFAULT 0,
  workspace_id                UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at                  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at                  TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_fixture_templates_workspace_id
  ON fixture_templates (workspace_id);
