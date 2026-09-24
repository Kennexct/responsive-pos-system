-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 008: cash register shifts, cash movements, redemption rules,
-- and per-merchant receipt number formats.
--
-- Why: cash had no owner. A shortfall belonged to nobody, refunds and voids sat
-- outside any shift, and receipt numbers restarted on every page reload.
--
-- Requires 006 (tenant isolation) and 007. Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS register_sessions (
  id             TEXT NOT NULL,
  merchant_id    TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  opened_at      TIMESTAMPTZ NOT NULL,
  opened_by_id   TEXT,
  opened_by_name TEXT NOT NULL,
  opening_float  INT NOT NULL DEFAULT 0,
  opening_note   TEXT,
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at      TIMESTAMPTZ,
  closed_by_id   TEXT,
  closed_by_name TEXT,
  counted_cash   INT,
  denomination_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  expected_cash  INT,
  variance       INT,
  closing_note   TEXT,
  approved_by_name TEXT,
  auto_closed    BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, id)
);

-- One open shift per merchant at a time: a second open drawer makes every count meaningless.
CREATE UNIQUE INDEX IF NOT EXISTS uq_register_sessions_one_open
  ON register_sessions (merchant_id) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS cash_movements (
  id          TEXT NOT NULL,
  merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('in', 'out')),
  amount      INT NOT NULL CHECK (amount > 0),
  reason      TEXT NOT NULL,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  by_name     TEXT NOT NULL,
  PRIMARY KEY (merchant_id, id),
  FOREIGN KEY (merchant_id, session_id) REFERENCES register_sessions(merchant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(merchant_id, session_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(merchant_id, session_id);

-- Redemption rules, enforced in the app by lib/loyalty.ts
ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS redeem_enabled      BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS min_redeem_points   INT NOT NULL DEFAULT 0;
ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS redeem_step_points  INT NOT NULL DEFAULT 1;
ALTER TABLE loyalty_settings ADD COLUMN IF NOT EXISTS max_redeem_percent  INT NOT NULL DEFAULT 100;

-- Receipt numbering and register rules live with the business profile.
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS receipt_format   JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS register_rules   JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Same tenant rules as every other table: members read and record, owners and managers correct.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['register_sessions', 'cash_movements'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_select ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_insert ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_update ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_delete ON %I', t);
    EXECUTE format('CREATE POLICY tenant_select ON %I FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id))', t);
    EXECUTE format('CREATE POLICY tenant_insert ON %I FOR INSERT TO authenticated WITH CHECK (public.is_merchant_member(merchant_id))', t);
    EXECUTE format('CREATE POLICY tenant_update ON %I FOR UPDATE TO authenticated USING (public.is_merchant_member(merchant_id)) WITH CHECK (public.is_merchant_member(merchant_id))', t);
    -- A closed shift is an audit record: only owners and managers may remove one.
    EXECUTE format('CREATE POLICY tenant_delete ON %I FOR DELETE TO authenticated USING (public.is_merchant_manager(merchant_id))', t);
  END LOOP;
END $$;

COMMIT;
