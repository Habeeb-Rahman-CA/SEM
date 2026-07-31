-- ============================================================
-- v3.5 — Commercial Features
-- Payment gateway plumbing: intents + audit log.
-- Run ONCE if NOT using TypeORM synchronize=true.
-- PAYMENT_PROVIDER env selects the runtime provider (mock/stripe/…).
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_intents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invoice_id        UUID REFERENCES invoices(id) ON DELETE SET NULL,
  subscription_id   UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  provider_code     VARCHAR(30) NOT NULL,
  provider_ref      VARCHAR(200),
  amount_cents      INTEGER NOT NULL,
  currency          VARCHAR(8) NOT NULL DEFAULT 'USD',
  status            VARCHAR(40) NOT NULL DEFAULT 'requires_payment_method',
  method            VARCHAR(40),
  metadata          JSONB,
  confirmed_at      TIMESTAMP WITHOUT TIME ZONE,
  refunded_at       TIMESTAMP WITHOUT TIME ZONE,
  failure_reason    TEXT,
  created_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_by        UUID,
  updated_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by        UUID,
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMP WITHOUT TIME ZONE,
  deleted_by        UUID
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_workspace     ON payment_intents (workspace_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_invoice       ON payment_intents (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_ref  ON payment_intents (provider_ref);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status        ON payment_intents (status);

CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  payment_intent_id   UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
  provider_code       VARCHAR(30),
  event               VARCHAR(40) NOT NULL,
  payload             JSONB,
  source_ip           VARCHAR(60),
  user_id             UUID,
  created_at          TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_workspace  ON payment_audit_logs (workspace_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_intent     ON payment_audit_logs (payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_event      ON payment_audit_logs (event);
CREATE INDEX IF NOT EXISTS idx_payment_audit_created_at ON payment_audit_logs (created_at);
