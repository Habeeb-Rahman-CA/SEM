-- ============================================================
-- v3.5 — Commercial Features
-- Advertisement management: banner creatives, scheduling,
-- placements, sponsor-first rotation, impression + click tracking.
-- Run ONCE if NOT using TypeORM synchronize=true.
-- ============================================================

CREATE TABLE IF NOT EXISTS advertisements (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name               VARCHAR(200) NOT NULL,
  title              VARCHAR(200),
  image_url          VARCHAR(500) NOT NULL,
  target_url         VARCHAR(500) NOT NULL,
  placement          VARCHAR(30) NOT NULL,
  event_id           UUID REFERENCES events(id) ON DELETE SET NULL,
  sponsor_id         UUID REFERENCES sponsors(id) ON DELETE SET NULL,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  start_date         TIMESTAMP WITHOUT TIME ZONE,
  end_date           TIMESTAMP WITHOUT TIME ZONE,
  weight             INTEGER NOT NULL DEFAULT 1,
  impression_count   INTEGER NOT NULL DEFAULT 0,
  click_count        INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_by         UUID,
  updated_at         TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by         UUID,
  is_deleted         BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at         TIMESTAMP WITHOUT TIME ZONE,
  deleted_by         UUID
);

CREATE INDEX IF NOT EXISTS idx_ads_workspace_id
  ON advertisements (workspace_id);
CREATE INDEX IF NOT EXISTS idx_ads_placement
  ON advertisements (placement);
CREATE INDEX IF NOT EXISTS idx_ads_workspace_active_placement
  ON advertisements (workspace_id, is_active, placement);
CREATE INDEX IF NOT EXISTS idx_ads_event_id
  ON advertisements (event_id);
CREATE INDEX IF NOT EXISTS idx_ads_sponsor_id
  ON advertisements (sponsor_id);

CREATE TABLE IF NOT EXISTS ad_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id        UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  event_type   VARCHAR(20) NOT NULL,
  source_ip    VARCHAR(60),
  user_agent   VARCHAR(400),
  referrer     VARCHAR(500),
  created_at   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_events_ad_id      ON ad_events (ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_ad_type    ON ad_events (ad_id, event_type);
CREATE INDEX IF NOT EXISTS idx_ad_events_created_at ON ad_events (created_at);
