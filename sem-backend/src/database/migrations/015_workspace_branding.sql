-- ============================================================
-- v3.5 — Commercial Features
-- White-label branding per workspace.
-- Run ONCE if NOT using TypeORM synchronize=true.
-- Access is gated in the service by the workspace's active plan
-- (plan.customBranding=true on Professional and Enterprise).
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_branding (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  is_enabled               BOOLEAN NOT NULL DEFAULT FALSE,
  brand_name               VARCHAR(100),
  tagline                  VARCHAR(200),
  logo_url                 VARCHAR(500),
  favicon_url              VARCHAR(500),
  primary_color            VARCHAR(30),
  secondary_color          VARCHAR(30),
  accent_color             VARCHAR(30),
  custom_domain            VARCHAR(200),
  custom_domain_token      VARCHAR(60),
  custom_domain_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  login_message            TEXT,
  login_background_url     VARCHAR(500),
  email_from_name          VARCHAR(100),
  email_from_address       VARCHAR(200),
  email_header_html        TEXT,
  email_footer_html        TEXT,
  pdf_header_html          TEXT,
  pdf_footer_html          TEXT,
  social_links             JSONB,
  created_at               TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_by               UUID,
  updated_at               TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by               UUID,
  is_deleted               BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at               TIMESTAMP WITHOUT TIME ZONE,
  deleted_by               UUID
);

CREATE INDEX IF NOT EXISTS idx_branding_custom_domain
  ON workspace_branding (custom_domain);
