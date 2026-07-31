-- ============================================================
-- v3.5 — Commercial Features
-- Workspace-scoped Sponsor catalog + per-event attachment.
-- Coexists with the legacy Event.sponsors JSONB column.
-- Run ONCE if NOT using TypeORM synchronize=true.
-- ============================================================

CREATE TABLE IF NOT EXISTS sponsors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name           VARCHAR(200) NOT NULL,
  description    TEXT,
  logo_url       VARCHAR(500),
  website_url    VARCHAR(500),
  category       VARCHAR(60),
  tier           VARCHAR(30),
  contact_name   VARCHAR(200),
  contact_email  VARCHAR(200),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  start_date     TIMESTAMP WITHOUT TIME ZONE,
  end_date       TIMESTAMP WITHOUT TIME ZONE,
  notes          TEXT,
  created_at     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_by     UUID,
  updated_at     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by     UUID,
  is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at     TIMESTAMP WITHOUT TIME ZONE,
  deleted_by     UUID
);

CREATE INDEX IF NOT EXISTS idx_sponsors_workspace_id     ON sponsors (workspace_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_workspace_active ON sponsors (workspace_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sponsors_tier             ON sponsors (tier);

CREATE TABLE IF NOT EXISTS event_sponsors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sponsor_id     UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  tier           VARCHAR(30),
  display_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_by     UUID,
  updated_at     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by     UUID,
  is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at     TIMESTAMP WITHOUT TIME ZONE,
  deleted_by     UUID,
  CONSTRAINT uq_event_sponsors_event_sponsor UNIQUE (event_id, sponsor_id)
);

CREATE INDEX IF NOT EXISTS idx_event_sponsors_event_id   ON event_sponsors (event_id);
CREATE INDEX IF NOT EXISTS idx_event_sponsors_sponsor_id ON event_sponsors (sponsor_id);
