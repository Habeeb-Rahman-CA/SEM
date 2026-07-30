-- ============================================================
-- Event Templates Table
-- Run ONCE if NOT using TypeORM synchronize=true.
-- TypeORM synchronize will auto-create this table; this script
-- is provided for environments that manage migrations manually.
-- ============================================================

CREATE TABLE IF NOT EXISTS event_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  logo_url        VARCHAR(500),
  sport           VARCHAR(100),
  venue           VARCHAR(150),
  organizers      VARCHAR(255),
  default_registration_status VARCHAR(50) NOT NULL DEFAULT 'open',
  is_public       BOOLEAN NOT NULL DEFAULT FALSE,
  competition_blueprints JSONB,
  use_count       INTEGER NOT NULL DEFAULT 0,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMP WITHOUT TIME ZONE
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_event_templates_workspace_id
  ON event_templates (workspace_id);

-- Full-text search on template name and description
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_templates_fts
  ON event_templates
  USING GIN (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  );
