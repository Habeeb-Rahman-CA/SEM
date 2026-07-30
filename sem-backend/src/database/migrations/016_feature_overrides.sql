-- ============================================================
-- v3.5 — Commercial Features
-- Per-workspace feature entitlement overrides.
-- Managed via the super-admin UI. Read at request-time by the
-- centralised LicensingService.
-- Run ONCE if NOT using TypeORM synchronize=true.
-- ============================================================

CREATE TABLE IF NOT EXISTS feature_overrides (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  feature_code   VARCHAR(60) NOT NULL,
  enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at     TIMESTAMP WITHOUT TIME ZONE,
  reason         TEXT,
  created_at     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_by     UUID,
  updated_at     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by     UUID,
  is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at     TIMESTAMP WITHOUT TIME ZONE,
  deleted_by     UUID,
  CONSTRAINT uq_feature_overrides_workspace_feature UNIQUE (workspace_id, feature_code)
);

CREATE INDEX IF NOT EXISTS idx_feature_overrides_workspace
  ON feature_overrides (workspace_id);
