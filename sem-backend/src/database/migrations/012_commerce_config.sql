-- ============================================================
-- v3.5 — Commercial Features
-- Runtime commerce config (subscriptions on/off, free-until date,
-- payment provider, Stripe keys). Managed via the super-admin UI —
-- replaces SUBSCRIPTIONS_ENABLED / PAYMENT_PROVIDER / STRIPE_* env vars.
-- Run ONCE if NOT using TypeORM synchronize=true.
-- ============================================================

CREATE TABLE IF NOT EXISTS commerce_config (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriptions_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  free_until_date           TIMESTAMP WITHOUT TIME ZONE,
  payment_provider          VARCHAR(30) NOT NULL DEFAULT 'mock',
  stripe_publishable_key    TEXT,
  stripe_secret_key         TEXT,
  stripe_webhook_secret     TEXT,
  default_currency          VARCHAR(8) NOT NULL DEFAULT 'USD',
  updated_at                TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by                UUID
);

-- Seed the singleton row. Additional inserts are prevented by the
-- service, but re-running this migration on a populated DB is a no-op.
INSERT INTO commerce_config (subscriptions_enabled, payment_provider, default_currency)
SELECT FALSE, 'mock', 'USD'
WHERE NOT EXISTS (SELECT 1 FROM commerce_config);
