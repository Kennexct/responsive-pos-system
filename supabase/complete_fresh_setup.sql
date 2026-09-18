-- ═══════════════════════════════════════════════════════════════════════════
-- VPOS COMPLETE MASTER DATABASE SCHEMA (FOR NEW / FRESH SUPABASE DATABASE)
-- ═══════════════════════════════════════════════════════════════════════════
-- Run this single script in your Supabase SQL Editor on any fresh project.
-- It creates all tables, enums, relations, functions, and RLS security policies.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. EXTENSIONS ───────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ─── 2. ENUMS ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE business_type AS ENUM ('retail', 'fnb');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_type AS ENUM ('dine-in', 'takeaway', 'delivery');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'qris', 'card', 'bank-transfer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('completed', 'held', 'cancelled', 'refunded', 'voided');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'manager', 'cashier');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE promo_type AS ENUM ('nominal', 'percent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan_type AS ENUM ('trial', 'monthly', 'yearly', 'lifetime');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status_type AS ENUM ('trial', 'active', 'suspended', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 3. TENANTS / MERCHANTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchants (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  email                   TEXT UNIQUE NOT NULL,
  phone                   TEXT,
  address                 TEXT,
  type                    business_type NOT NULL DEFAULT 'fnb',
  subscription_plan       subscription_plan_type NOT NULL DEFAULT 'trial',
  subscription_status     subscription_status_type NOT NULL DEFAULT 'trial',
  subscription_starts_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  subscription_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  is_enabled              BOOLEAN NOT NULL DEFAULT true,
  owner_name              TEXT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchants_sub_status ON merchants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_merchants_sub_expires ON merchants(subscription_expires_at);
CREATE INDEX IF NOT EXISTS idx_merchants_is_enabled ON merchants(is_enabled);

-- ─── 4. AUTH MEMBERSHIP & PLATFORM ADMINS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_members (
  merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'cashier',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_merchant_members_user ON merchant_members(user_id);

CREATE TABLE IF NOT EXISTS platform_super_admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  user_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'superadmin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper security functions
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

-- ─── 5. STORE SETTINGS & STAFF ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_settings (
  merchant_id   TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL DEFAULT 'Warung Kopi Santai',
  phone         TEXT DEFAULT '+62 812 3456 7890',
  email         TEXT DEFAULT 'hello@warkop.id',
  address       TEXT DEFAULT 'Jl. Sudirman No. 123, Jakarta',
  type          business_type NOT NULL DEFAULT 'fnb',
  dark_mode     BOOLEAN NOT NULL DEFAULT false,
  terminal_view TEXT NOT NULL DEFAULT 'grid',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT business_settings_tenant_pkey PRIMARY KEY (merchant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_business_settings_merchant_id ON business_settings(merchant_id);

CREATE TABLE IF NOT EXISTS staff (
  merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id          TEXT NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'cashier',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT staff_tenant_pkey PRIMARY KEY (merchant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_staff_merchant_id ON staff(merchant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_merchant_email ON staff(merchant_id, email);

-- Hashed credentials table (API cannot read this table directly)
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

CREATE TABLE IF NOT EXISTS merchant_pin_lockouts (
  merchant_id  TEXT PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
  failed_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ
);
ALTER TABLE merchant_pin_lockouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON merchant_pin_lockouts FROM anon, authenticated;

-- ─── 6. CATEGORIES & PRODUCTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  merchant_id     TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id              TEXT NOT NULL,
  name            TEXT NOT NULL,
  is_taxable      BOOLEAN NOT NULL DEFAULT true,
  is_discountable BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT categories_tenant_pkey PRIMARY KEY (merchant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_categories_merchant_id ON categories(merchant_id);

CREATE TABLE IF NOT EXISTS products (
  merchant_id         TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id                  TEXT NOT NULL,
  name                TEXT NOT NULL,
  price               INT NOT NULL DEFAULT 0,
  cost_price          INT NOT NULL DEFAULT 0,
  category            TEXT NOT NULL,
  stock               INT NOT NULL DEFAULT 0,
  emoji               TEXT DEFAULT '☕',
  image_url           TEXT,
  low_stock_threshold INT NOT NULL DEFAULT 10,
  sku                 TEXT,
  barcode             TEXT,
  track_inventory     BOOLEAN NOT NULL DEFAULT false,
  allow_discount      BOOLEAN NOT NULL DEFAULT false,
  variants_json       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_tenant_pkey PRIMARY KEY (merchant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON products(merchant_id);

CREATE TABLE IF NOT EXISTS product_variants (
  merchant_id    TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id             TEXT NOT NULL,
  product_id     TEXT NOT NULL,
  name           TEXT NOT NULL,
  price_modifier INT NOT NULL DEFAULT 0,
  sku            TEXT,
  barcode        TEXT,
  CONSTRAINT product_variants_tenant_pkey PRIMARY KEY (merchant_id, id),
  CONSTRAINT product_variants_product_fk FOREIGN KEY (merchant_id, product_id) REFERENCES products(merchant_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_variants_merchant_id ON product_variants(merchant_id);

-- ─── 7. CUSTOMERS & LOYALTY ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id          TEXT NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  points      INT NOT NULL DEFAULT 0,
  tier        TEXT NOT NULL DEFAULT 'bronze',
  total_spent INT NOT NULL DEFAULT 0,
  visit_count INT NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customers_tenant_pkey PRIMARY KEY (merchant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_customers_merchant_id ON customers(merchant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_merchant_phone ON customers(merchant_id, phone);

CREATE TABLE IF NOT EXISTS loyalty_settings (
  merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id          TEXT NOT NULL,
  earn_rate   INT NOT NULL DEFAULT 1000,
  redeem_rate INT NOT NULL DEFAULT 1,
  is_enabled  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_settings_tenant_pkey PRIMARY KEY (merchant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_loyalty_settings_merchant_id ON loyalty_settings(merchant_id);

CREATE TABLE IF NOT EXISTS loyalty_tiers (
  merchant_id      TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id               TEXT NOT NULL,
  name             TEXT NOT NULL,
  min_spend        INT NOT NULL DEFAULT 0,
  discount_percent INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_tiers_tenant_pkey PRIMARY KEY (merchant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_merchant_id ON loyalty_tiers(merchant_id);

-- ─── 8. TAXES, DISCOUNTS, PAYMENTS & REFUNDS ────────────────────────────────
CREATE TABLE IF NOT EXISTS tax_rules (
  merchant_id             TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id                      TEXT NOT NULL,
  name                    TEXT NOT NULL,
  rate                    INT NOT NULL DEFAULT 10,
  is_inclusive            BOOLEAN NOT NULL DEFAULT false,
  is_compound             BOOLEAN NOT NULL DEFAULT false,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  apply_to_service_charge BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tax_rules_tenant_pkey PRIMARY KEY (merchant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_tax_rules_merchant_id ON tax_rules(merchant_id);

CREATE TABLE IF NOT EXISTS discount_settings (
  merchant_id          TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id                   TEXT NOT NULL,
  name                 TEXT NOT NULL,
  type                 promo_type NOT NULL DEFAULT 'percent',
  value                INT NOT NULL DEFAULT 10,
  max_amount           INT,
  requires_manager_pin BOOLEAN NOT NULL DEFAULT false,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT discount_settings_tenant_pkey PRIMARY KEY (merchant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_discount_settings_merchant_id ON discount_settings(merchant_id);

CREATE TABLE IF NOT EXISTS promo_codes (
  merchant_id  TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id           TEXT NOT NULL,
  code         TEXT NOT NULL,
  type         promo_type NOT NULL DEFAULT 'percent',
  value        INT NOT NULL DEFAULT 10,
  min_order    INT NOT NULL DEFAULT 0,
  max_discount INT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  expires_at   TIMESTAMPTZ,
  usage_limit  INT,
  used_count   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT promo_codes_tenant_pkey PRIMARY KEY (merchant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_promo_codes_merchant_id ON promo_codes(merchant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_codes_merchant_code ON promo_codes(merchant_id, code);

CREATE TABLE IF NOT EXISTS payment_methods (
  merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id          TEXT NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'cash',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_methods_tenant_pkey PRIMARY KEY (merchant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_merchant_id ON payment_methods(merchant_id);

CREATE TABLE IF NOT EXISTS refund_settings (
  merchant_id          TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id                   TEXT NOT NULL,
  requires_manager_pin BOOLEAN NOT NULL DEFAULT true,
  allow_split_refund   BOOLEAN NOT NULL DEFAULT true,
  max_refund_days      INT NOT NULL DEFAULT 7,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT refund_settings_tenant_pkey PRIMARY KEY (merchant_id, id)
);
CREATE INDEX IF NOT EXISTS idx_refund_settings_merchant_id ON refund_settings(merchant_id);

-- ─── 9. ORDERS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  merchant_id              TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  id                       TEXT NOT NULL,
  order_number             TEXT NOT NULL,
  item_count               INT NOT NULL DEFAULT 1,
  subtotal_before_discount INT NOT NULL DEFAULT 0,
  discount_total           INT NOT NULL DEFAULT 0,
  promo_code               TEXT,
  promo_discount_amt       INT NOT NULL DEFAULT 0,
  subtotal                 INT NOT NULL DEFAULT 0,
  service_charge           INT NOT NULL DEFAULT 0,
  tax                      INT NOT NULL DEFAULT 0,
  tax_breakdown            JSONB NOT NULL DEFAULT '[]'::jsonb,
  total                    INT NOT NULL DEFAULT 0,
  total_cost               INT NOT NULL DEFAULT 0,
  payment_method           TEXT NOT NULL DEFAULT 'cash',
  split_payment_method     TEXT,
  split_amount             INT,
  order_type               TEXT NOT NULL DEFAULT 'dine-in',
  status                   TEXT NOT NULL DEFAULT 'completed',
  customer_id              TEXT,
  cashier                  TEXT NOT NULL DEFAULT 'Cashier',
  refund_reason            TEXT,
  items_json               JSONB NOT NULL DEFAULT '[]'::jsonb,
  points_earned            INT NOT NULL DEFAULT 0,
  points_redeemed          INT NOT NULL DEFAULT 0,
  points_discount_amt      INT NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_tenant_pkey PRIMARY KEY (merchant_id, id),
  CONSTRAINT orders_customer_fk FOREIGN KEY (merchant_id, customer_id) REFERENCES customers(merchant_id, id) ON DELETE SET NULL (customer_id)
);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_merchant_order_number ON orders(merchant_id, order_number);

-- ─── 10. DEFAULT SEED MERCHANT ──────────────────────────────────────────────
INSERT INTO merchants (
  id, name, email, phone, address, type, subscription_plan, subscription_status, subscription_starts_at, subscription_expires_at, is_enabled, owner_name
) VALUES (
  'm_default',
  'Warung Kopi Santai',
  'owner@vpos.app',
  '+62 812 3456 7890',
  'Jl. Sudirman No. 123, Jakarta',
  'fnb',
  'yearly',
  'active',
  now(),
  (now() + interval '1 year'),
  true,
  'Budi Santoso'
) ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    subscription_plan = 'yearly',
    subscription_status = 'active',
    is_enabled = true;

-- ─── 11. STORED FUNCTIONS ───────────────────────────────────────────────────

-- Set Staff PIN (hashed with bcrypt)
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

-- Verify Staff PIN with 5-fail lockout
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
    RETURN;
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
END $$;

-- Verify Manager PIN (for overrides, refunds, voids)
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

-- Self-Service Merchant Registration
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
  public.verify_manager_pin(TEXT, TEXT), public.create_merchant(TEXT, TEXT, business_type, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_staff_pin(TEXT, TEXT, TEXT), public.verify_staff_pin(TEXT, TEXT, TEXT),
  public.verify_manager_pin(TEXT, TEXT), public.create_merchant(TEXT, TEXT, business_type, TEXT) TO authenticated;

-- ─── 12. ROW LEVEL SECURITY (RLS) POLICIES ──────────────────────────────────

-- Operational Data
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

-- Configuration Data
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

-- Merchants table policy
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS merchants_select ON merchants;
DROP POLICY IF EXISTS merchants_admin_write ON merchants;
CREATE POLICY merchants_select ON merchants FOR SELECT TO authenticated USING (public.is_merchant_member(id));
CREATE POLICY merchants_admin_write ON merchants FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- Members table policy
ALTER TABLE merchant_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS members_select ON merchant_members;
DROP POLICY IF EXISTS members_manage ON merchant_members;
CREATE POLICY members_select ON merchant_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_merchant_manager(merchant_id));
CREATE POLICY members_manage ON merchant_members FOR ALL TO authenticated
  USING (public.is_platform_admin() OR (public.is_merchant_manager(merchant_id) AND role <> 'owner'))
  WITH CHECK (public.is_platform_admin() OR (public.is_merchant_manager(merchant_id) AND role <> 'owner'));

-- Platform Super Admins policy
ALTER TABLE platform_super_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admins_self ON platform_super_admins;
CREATE POLICY admins_self ON platform_super_admins FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Lock down anon access (only signed in accounts can read/write)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

COMMIT;
