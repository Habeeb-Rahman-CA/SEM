-- ============================================================
-- v3.5 — Commercial Features
-- Workspace billing centre: profile, contacts, invoices.
-- Run ONCE if NOT using TypeORM synchronize=true.
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  company_name        VARCHAR(200),
  address_line1       VARCHAR(200),
  address_line2       VARCHAR(200),
  city                VARCHAR(100),
  state               VARCHAR(100),
  postal_code         VARCHAR(30),
  country             VARCHAR(100),
  tax_id              VARCHAR(60),
  tax_id_type         VARCHAR(20),
  tax_rate_percent    NUMERIC(5,2) NOT NULL DEFAULT 0,
  default_currency    VARCHAR(8)   NOT NULL DEFAULT 'USD',
  notes               TEXT,
  created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_by          UUID,
  updated_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by          UUID,
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMP WITHOUT TIME ZONE,
  deleted_by          UUID
);

CREATE TABLE IF NOT EXISTS billing_contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name              VARCHAR(150) NOT NULL,
  email             VARCHAR(200) NOT NULL,
  phone             VARCHAR(50),
  role              VARCHAR(30) NOT NULL DEFAULT 'primary',
  receives_invoices BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_by        UUID,
  updated_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by        UUID,
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMP WITHOUT TIME ZONE,
  deleted_by        UUID
);

CREATE INDEX IF NOT EXISTS idx_billing_contacts_workspace_id
  ON billing_contacts (workspace_id);

CREATE TABLE IF NOT EXISTS invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subscription_id   UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  plan_id           UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  invoice_number    VARCHAR(40) NOT NULL UNIQUE,
  status            VARCHAR(20) NOT NULL DEFAULT 'issued',
  issued_at         TIMESTAMP WITHOUT TIME ZONE,
  due_at            TIMESTAMP WITHOUT TIME ZONE,
  paid_at           TIMESTAMP WITHOUT TIME ZONE,
  period_start      TIMESTAMP WITHOUT TIME ZONE,
  period_end        TIMESTAMP WITHOUT TIME ZONE,
  subtotal_cents    INTEGER NOT NULL DEFAULT 0,
  tax_cents         INTEGER NOT NULL DEFAULT 0,
  total_cents       INTEGER NOT NULL DEFAULT 0,
  currency          VARCHAR(8) NOT NULL DEFAULT 'USD',
  line_items        JSONB NOT NULL DEFAULT '[]'::jsonb,
  payments          JSONB NOT NULL DEFAULT '[]'::jsonb,
  bill_to           JSONB,
  notes             TEXT,
  created_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_by        UUID,
  updated_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by        UUID,
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMP WITHOUT TIME ZONE,
  deleted_by        UUID
);

CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id       ON invoices (workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status             ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_at          ON invoices (issued_at);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_status   ON invoices (workspace_id, status);
