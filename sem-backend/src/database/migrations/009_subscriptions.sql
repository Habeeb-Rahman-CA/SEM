-- ============================================================
-- v3.5 — Commercial Features
-- Subscription plans + per-workspace subscription records.
-- Run ONCE if NOT using TypeORM synchronize=true.
-- Enforcement is off by default; set SUBSCRIPTIONS_ENABLED=true
-- in the backend env to start gating on plan limits.
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(50) NOT NULL UNIQUE,
  name              VARCHAR(100) NOT NULL,
  tier              VARCHAR(20) NOT NULL,
  description       TEXT,
  limits            JSONB NOT NULL,
  price_cents       INTEGER NOT NULL DEFAULT 0,
  currency          VARCHAR(8) NOT NULL DEFAULT 'USD',
  billing_interval  VARCHAR(20) NOT NULL DEFAULT 'month',
  trial_days        INTEGER NOT NULL DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_by        UUID,
  updated_at        TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by        UUID,
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMP WITHOUT TIME ZONE,
  deleted_by        UUID
);

CREATE INDEX IF NOT EXISTS idx_plans_tier ON subscription_plans (tier);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id                UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status                 VARCHAR(20) NOT NULL DEFAULT 'active',
  current_period_start   TIMESTAMP WITHOUT TIME ZONE,
  current_period_end     TIMESTAMP WITHOUT TIME ZONE,
  trial_ends_at          TIMESTAMP WITHOUT TIME ZONE,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at           TIMESTAMP WITHOUT TIME ZONE,
  created_at             TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_by             UUID,
  updated_at             TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by             UUID,
  is_deleted             BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at             TIMESTAMP WITHOUT TIME ZONE,
  deleted_by             UUID
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions (status);

-- ── Seed the plan catalog (idempotent — safe to re-run) ──────────────
INSERT INTO subscription_plans (code, name, tier, description, limits, price_cents, currency, billing_interval, trial_days, sort_order, is_active)
VALUES
  ('free', 'Free', 'free',
   'Perfect for a one-off tournament or a first tryout of the platform.',
   '{"workspaces":1,"membersPerWorkspace":10,"eventsPerWorkspace":3,"storageMb":250,"reportsLevel":"basic","publicPortal":true,"liveScoring":true,"customBranding":false,"apiAccess":false,"prioritySupport":false}',
   0, 'USD', 'month', 0, 1, TRUE),

  ('standard', 'Standard', 'standard',
   'For active clubs and small leagues running regular events.',
   '{"workspaces":3,"membersPerWorkspace":50,"eventsPerWorkspace":25,"storageMb":5000,"reportsLevel":"standard","publicPortal":true,"liveScoring":true,"customBranding":false,"apiAccess":false,"prioritySupport":false}',
   1900, 'USD', 'month', 14, 2, TRUE),

  ('professional', 'Professional', 'professional',
   'For federations, academies and multi-league organizers.',
   '{"workspaces":10,"membersPerWorkspace":250,"eventsPerWorkspace":-1,"storageMb":50000,"reportsLevel":"advanced","publicPortal":true,"liveScoring":true,"customBranding":true,"apiAccess":true,"prioritySupport":false}',
   4900, 'USD', 'month', 14, 3, TRUE),

  ('enterprise', 'Enterprise', 'enterprise',
   'For governing bodies and rights-holders that need unlimited scale.',
   '{"workspaces":-1,"membersPerWorkspace":-1,"eventsPerWorkspace":-1,"storageMb":-1,"reportsLevel":"advanced","publicPortal":true,"liveScoring":true,"customBranding":true,"apiAccess":true,"prioritySupport":true}',
   0, 'USD', 'month', 30, 4, TRUE)
ON CONFLICT (code) DO NOTHING;
