-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 006: Tenant isolation, Supabase Auth membership, hashed PINs
--
-- Before this migration every policy was USING (true): anyone holding the anon
-- key could read or overwrite every merchant's customers, orders and staff PINs.
--
-- After it:
--   • A signed-in Supabase Auth user sees only merchants they belong to
--     (merchant_members), enforced by Postgres RLS — not by app code.
--   • Platform admins are real auth users listed in platform_super_admins.
--   • Staff / owner / admin PINs are bcrypt-hashed; plaintext columns are dropped.
--     PINs are checked server-side with a lockout (verify_staff_pin).
--   • IDs, phone numbers, promo codes and order numbers are unique per merchant,
--     so two merchants can both have a 'cat-coffee' or customer 0812….
--
-- Run order: after 001–005. Safe to re-run (idempotent guards throughout).
-- Rollback: restore from the backup you take before running this (see UPGRADE_GUIDE.md).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ─── 1. Membership & platform admins ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_members (
  merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'cashier',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_merchant_members_user ON merchant_members(user_id);

ALTER TABLE platform_super_admins ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
-- The seeded admin@vpos.app / 0000 account was a public credential. Remove it;
-- link a real auth user instead (UPGRADE_GUIDE.md, step 3).
DELETE FROM platform_super_admins WHERE user_id IS NULL;

-- ─── 2. Helper functions (SECURITY DEFINER so policies can read membership) ─

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM platform_super_admins WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_merchant_member(p_merchant TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM merchant_members WHERE merchant_id = p_merchant AND user_id = auth.uid())
      OR public.is_platform_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_merchant_manager(p_merchant TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM merchant_members
    WHERE merchant_id = p_merchant AND user_id = auth.uid() AND role IN ('owner', 'manager')
  ) OR public.is_platform_admin();
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin(), public.is_merchant_member(TEXT), public.is_merchant_manager(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(), public.is_merchant_member(TEXT), public.is_merchant_manager(TEXT) TO authenticated;

-- ─── 3. merchant_id everywhere, NOT NULL, per-merchant keys ────────────────

ALTER TABLE loyalty_settings  ADD COLUMN IF NOT EXISTS merchant_id TEXT;
ALTER TABLE loyalty_tiers     ADD COLUMN IF NOT EXISTS merchant_id TEXT;
ALTER TABLE tax_rules         ADD COLUMN IF NOT EXISTS merchant_id TEXT;
ALTER TABLE tax_rules         ADD COLUMN IF NOT EXISTS is_compound BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE discount_settings ADD COLUMN IF NOT EXISTS merchant_id TEXT;
ALTER TABLE payment_methods   ADD COLUMN IF NOT EXISTS merchant_id TEXT;
ALTER TABLE refund_settings   ADD COLUMN IF NOT EXISTS merchant_id TEXT;
ALTER TABLE orders            ADD COLUMN IF NOT EXISTS service_charge INT NOT NULL DEFAULT 0;
ALTER TABLE orders            ADD COLUMN IF NOT EXISTS promo_discount_amt INT NOT NULL DEFAULT 0;
ALTER TABLE orders            ADD COLUMN IF NOT EXISTS tax_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Relax global uniques/FKs first; they are rebuilt per merchant below.
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_product_id_fkey;
ALTER TABLE orders           DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE customers        DROP CONSTRAINT IF EXISTS customers_phone_key;
ALTER TABLE staff            DROP CONSTRAINT IF EXISTS staff_email_key;
ALTER TABLE orders           DROP CONSTRAINT IF EXISTS orders_order_number_key;
ALTER TABLE promo_codes      DROP CONSTRAINT IF EXISTS promo_codes_code_key;

-- The client generates staff ids like '1719999999999'; a UUID column rejected them.
ALTER TABLE staff ALTER COLUMN id DROP DEFAULT;
ALTER TABLE staff ALTER COLUMN id TYPE TEXT USING id::text;

-- One tenant table at a time: backfill, NOT NULL, FK to merchants, composite PK.
DO $$
DECLARE
  t TEXT;
  pk TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'business_settings','staff','categories','products','product_variants','customers','orders',
    'loyalty_settings','loyalty_tiers','tax_rules','discount_settings','promo_codes',
    'payment_methods','refund_settings'
  ] LOOP
    EXECUTE format('UPDATE %I SET merchant_id = %L WHERE merchant_id IS NULL', t, 'm_default');
    EXECUTE format('ALTER TABLE %I ALTER COLUMN merchant_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(merchant_id)', 'idx_' || t || '_merchant_id', t);

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = t || '_merchant_fk'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE',
        t, t || '_merchant_fk'
      );
    END IF;

    SELECT conname INTO pk FROM pg_constraint
    WHERE conrelid = t::regclass AND contype = 'p';
    IF pk IS NOT NULL AND pk <> t || '_tenant_pkey' THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', t, pk);
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I PRIMARY KEY (merchant_id, id)', t, t || '_tenant_pkey');
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_merchant_phone     ON customers(merchant_id, phone);
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_merchant_email         ON staff(merchant_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_merchant_order_number ON orders(merchant_id, order_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_codes_merchant_code    ON promo_codes(merchant_id, code);

DO $$ BEGIN
  ALTER TABLE product_variants ADD CONSTRAINT product_variants_product_fk
    FOREIGN KEY (merchant_id, product_id) REFERENCES products(merchant_id, id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 4. Hashed PINs, kept out of every API-readable table ──────────────────

DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_customer_fk
    FOREIGN KEY (merchant_id, customer_id) REFERENCES customers(merchant_id, id) ON DELETE SET NULL (customer_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Credentials live in their own table with RLS on and no policies: the REST API
-- cannot read or write it at all. Only the SECURITY DEFINER functions below can.
CREATE TABLE IF NOT EXISTS staff_credentials (
  merchant_id  TEXT NOT NULL,
  staff_id     TEXT NOT NULL,
  pin_hash     TEXT NOT NULL,
  failed_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, staff_id),
  FOREIGN KEY (merchant_id, staff_id) REFERENCES staff(merchant_id, id) ON DELETE CASCADE
);
ALTER TABLE staff_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON staff_credentials FROM anon, authenticated;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'pin') THEN
    INSERT INTO staff_credentials (merchant_id, staff_id, pin_hash)
    SELECT merchant_id, id, extensions.crypt(pin, extensions.gen_salt('bf')) FROM staff WHERE pin IS NOT NULL
    ON CONFLICT DO NOTHING;
    ALTER TABLE staff DROP COLUMN pin;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'merchants' AND column_name = 'owner_pin') THEN
    ALTER TABLE merchants DROP COLUMN owner_pin;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'platform_super_admins' AND column_name = 'pin') THEN
    ALTER TABLE platform_super_admins DROP COLUMN pin;
  END IF;
END $$;

-- Owners/managers set a staff PIN. The PIN never leaves the database in any form.
CREATE OR REPLACE FUNCTION public.set_staff_pin(p_merchant TEXT, p_staff_id TEXT, p_pin TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_merchant_manager(p_merchant) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_pin !~ '^[0-9]{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4 to 6 digits' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM staff WHERE merchant_id = p_merchant AND id = p_staff_id) THEN
    RAISE EXCEPTION 'staff not found' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO staff_credentials (merchant_id, staff_id, pin_hash)
  VALUES (p_merchant, p_staff_id, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  ON CONFLICT (merchant_id, staff_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash, failed_count = 0, locked_until = NULL, updated_at = now();
END $$;

-- Cashier switch / manager override on a signed-in terminal.
-- 5 wrong tries lock that staff member for 5 minutes.
CREATE OR REPLACE FUNCTION public.verify_staff_pin(p_merchant TEXT, p_staff_id TEXT, p_pin TEXT)
RETURNS TABLE (staff_id TEXT, staff_name TEXT, staff_email TEXT, staff_role user_role)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_cred staff_credentials%ROWTYPE;
BEGIN
  IF NOT public.is_merchant_member(p_merchant) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cred FROM staff_credentials c
  WHERE c.merchant_id = p_merchant AND c.staff_id = p_staff_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN; -- no PIN set: same response as a wrong PIN
  END IF;
  IF v_cred.locked_until IS NOT NULL AND v_cred.locked_until > now() THEN
    RAISE EXCEPTION 'locked' USING ERRCODE = 'P0001';
  END IF;

  IF v_cred.pin_hash = extensions.crypt(p_pin, v_cred.pin_hash) THEN
    UPDATE staff_credentials c SET failed_count = 0, locked_until = NULL
    WHERE c.merchant_id = p_merchant AND c.staff_id = p_staff_id;
    RETURN QUERY
      SELECT s.id, s.name, s.email, s.role FROM staff s
      WHERE s.merchant_id = p_merchant AND s.id = p_staff_id AND s.is_active;
    RETURN;
  END IF;

  UPDATE staff_credentials c
  SET failed_count = CASE WHEN v_cred.locked_until IS NOT NULL THEN 1 ELSE v_cred.failed_count + 1 END,
      locked_until = CASE WHEN (CASE WHEN v_cred.locked_until IS NOT NULL THEN 1 ELSE v_cred.failed_count + 1 END) >= 5
                          THEN now() + interval '5 minutes' ELSE NULL END
  WHERE c.merchant_id = p_merchant AND c.staff_id = p_staff_id;
  -- empty result = wrong PIN
END $$;

-- Manager override (refunds, voids, big discounts): any owner/manager PIN of this merchant.
-- Guessing is limited per merchant: 5 wrong tries lock overrides for 5 minutes.
CREATE TABLE IF NOT EXISTS merchant_pin_lockouts (
  merchant_id  TEXT PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
  failed_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ
);
ALTER TABLE merchant_pin_lockouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON merchant_pin_lockouts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_manager_pin(p_merchant TEXT, p_pin TEXT)
RETURNS TABLE (staff_id TEXT, staff_name TEXT, staff_role user_role)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_lock merchant_pin_lockouts%ROWTYPE;
  v_staff_id TEXT;
BEGIN
  IF NOT public.is_merchant_member(p_merchant) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  INSERT INTO merchant_pin_lockouts (merchant_id) VALUES (p_merchant) ON CONFLICT DO NOTHING;
  SELECT * INTO v_lock FROM merchant_pin_lockouts l WHERE l.merchant_id = p_merchant FOR UPDATE;
  IF v_lock.locked_until IS NOT NULL AND v_lock.locked_until > now() THEN
    RAISE EXCEPTION 'locked' USING ERRCODE = 'P0001';
  END IF;

  SELECT s.id INTO v_staff_id
  FROM staff s JOIN staff_credentials c ON c.merchant_id = s.merchant_id AND c.staff_id = s.id
  WHERE s.merchant_id = p_merchant AND s.is_active AND s.role IN ('owner', 'manager')
    AND c.pin_hash = extensions.crypt(p_pin, c.pin_hash)
  LIMIT 1;

  IF v_staff_id IS NOT NULL THEN
    UPDATE merchant_pin_lockouts l SET failed_count = 0, locked_until = NULL WHERE l.merchant_id = p_merchant;
    RETURN QUERY SELECT s.id, s.name, s.role FROM staff s WHERE s.merchant_id = p_merchant AND s.id = v_staff_id;
    RETURN;
  END IF;

  UPDATE merchant_pin_lockouts l
  SET failed_count = CASE WHEN v_lock.locked_until IS NOT NULL THEN 1 ELSE v_lock.failed_count + 1 END,
      locked_until = CASE WHEN (CASE WHEN v_lock.locked_until IS NOT NULL THEN 1 ELSE v_lock.failed_count + 1 END) >= 5
                          THEN now() + interval '5 minutes' ELSE NULL END
  WHERE l.merchant_id = p_merchant;
END $$;

REVOKE ALL ON FUNCTION public.verify_manager_pin(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_manager_pin(TEXT, TEXT) TO authenticated;

-- Self-service signup: the signed-in user becomes owner of a new trial merchant.
CREATE OR REPLACE FUNCTION public.create_merchant(p_merchant_id TEXT, p_name TEXT, p_type business_type, p_owner_name TEXT)
RETURNS merchants LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := auth.jwt() ->> 'email';
  v_row merchants;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'sign in first' USING ERRCODE = '42501';
  END IF;
  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;
  IF EXISTS (SELECT 1 FROM merchant_members WHERE user_id = v_uid AND role = 'owner') THEN
    RAISE EXCEPTION 'this account already owns a business' USING ERRCODE = '23505';
  END IF;
  IF length(trim(coalesce(p_name, ''))) = 0 THEN
    RAISE EXCEPTION 'business name is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO merchants (id, name, email, type, owner_name, subscription_plan, subscription_status)
  VALUES (p_merchant_id, trim(p_name), v_email, p_type, nullif(trim(p_owner_name), ''), 'trial', 'trial')
  RETURNING * INTO v_row;

  INSERT INTO merchant_members (merchant_id, user_id, role) VALUES (p_merchant_id, v_uid, 'owner');
  INSERT INTO staff (id, merchant_id, name, email, role)
  VALUES (v_uid::text, p_merchant_id, coalesce(nullif(trim(p_owner_name), ''), 'Owner'), v_email, 'owner');
  RETURN v_row;
END $$;

REVOKE ALL ON FUNCTION public.set_staff_pin(TEXT, TEXT, TEXT), public.verify_staff_pin(TEXT, TEXT, TEXT),
  public.create_merchant(TEXT, TEXT, business_type, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_staff_pin(TEXT, TEXT, TEXT), public.verify_staff_pin(TEXT, TEXT, TEXT),
  public.create_merchant(TEXT, TEXT, business_type, TEXT) TO authenticated;

-- ─── 5. Replace every open policy with tenant policies ─────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND (policyname ILIKE 'Public %')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Operational data: any member reads and records sales; only owner/manager deletes.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['orders','customers','products','product_variants'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_select ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_insert ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_update ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_delete ON %I', t);
    EXECUTE format('CREATE POLICY tenant_select ON %I FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id))', t);
    EXECUTE format('CREATE POLICY tenant_insert ON %I FOR INSERT TO authenticated WITH CHECK (public.is_merchant_member(merchant_id))', t);
    EXECUTE format('CREATE POLICY tenant_update ON %I FOR UPDATE TO authenticated USING (public.is_merchant_member(merchant_id)) WITH CHECK (public.is_merchant_member(merchant_id))', t);
    EXECUTE format('CREATE POLICY tenant_delete ON %I FOR DELETE TO authenticated USING (public.is_merchant_manager(merchant_id))', t);
  END LOOP;
END $$;

-- Configuration: members read; owner/manager write.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['business_settings','staff','categories','loyalty_settings','loyalty_tiers','tax_rules',
                           'discount_settings','promo_codes','payment_methods','refund_settings'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_select ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_write ON %I', t);
    EXECUTE format('CREATE POLICY tenant_select ON %I FOR SELECT TO authenticated USING (public.is_merchant_member(merchant_id))', t);
    EXECUTE format('CREATE POLICY tenant_write ON %I FOR ALL TO authenticated USING (public.is_merchant_manager(merchant_id)) WITH CHECK (public.is_merchant_manager(merchant_id))', t);
  END LOOP;
END $$;

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS merchants_select ON merchants;
DROP POLICY IF EXISTS merchants_admin_write ON merchants;
DROP POLICY IF EXISTS merchants_owner_update ON merchants;
CREATE POLICY merchants_select ON merchants FOR SELECT TO authenticated USING (public.is_merchant_member(id));
CREATE POLICY merchants_admin_write ON merchants FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

ALTER TABLE merchant_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS members_select ON merchant_members;
DROP POLICY IF EXISTS members_manage ON merchant_members;
CREATE POLICY members_select ON merchant_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_merchant_manager(merchant_id));
CREATE POLICY members_manage ON merchant_members FOR ALL TO authenticated
  USING (public.is_platform_admin() OR (public.is_merchant_manager(merchant_id) AND role <> 'owner'))
  WITH CHECK (public.is_platform_admin() OR (public.is_merchant_manager(merchant_id) AND role <> 'owner'));

ALTER TABLE platform_super_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admins_self ON platform_super_admins;
CREATE POLICY admins_self ON platform_super_admins FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Nothing is reachable without signing in.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

COMMIT;
