-- RLS regression test for migration 006.
-- Run against a scratch database (never production):  psql -v ON_ERROR_STOP=1 -f supabase/tests/006_rls_test.sql
-- Every check raises an exception on failure; success prints "ALL RLS CHECKS PASSED".
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner-a@test.id'),
  ('22222222-2222-2222-2222-222222222222', 'owner-b@test.id'),
  ('33333333-3333-3333-3333-333333333333', 'cashier-a@test.id');

-- helper: act as a user
CREATE OR REPLACE FUNCTION pg_temp.act_as(p_uid text, p_email text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Same settings PostgREST sets for a real request, so Supabase's own auth.uid()/auth.jwt() work.
  PERFORM set_config('request.jwt.claim.sub', coalesce(p_uid, ''), true);
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '' ELSE json_build_object('sub', p_uid, 'email', p_email, 'role', 'authenticated')::text END, true);
END $$;

-- Owner A signs up
SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111', 'owner-a@test.id');
SET LOCAL ROLE authenticated;
SELECT id FROM public.create_merchant('m_a', 'Kopi A', 'fnb', 'Ayu');
INSERT INTO customers (id, merchant_id, name, phone) VALUES ('c1', 'm_a', 'Andi', '0812');
INSERT INTO categories (id, merchant_id, name) VALUES ('cat-coffee', 'm_a', 'Coffee');
RESET ROLE;

-- Owner B signs up; same customer id, phone and category id must not collide
SELECT pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'owner-b@test.id');
SET LOCAL ROLE authenticated;
SELECT id FROM public.create_merchant('m_b', 'Toko B', 'retail', 'Budi');
INSERT INTO customers (id, merchant_id, name, phone) VALUES ('c1', 'm_b', 'Beni', '0812');
INSERT INTO categories (id, merchant_id, name) VALUES ('cat-coffee', 'm_b', 'Coffee');

DO $$ BEGIN
  IF (SELECT count(*) FROM customers) <> 1 THEN RAISE EXCEPTION 'B can see other tenants customers'; END IF;
  IF EXISTS (SELECT 1 FROM merchants WHERE id = 'm_a') THEN RAISE EXCEPTION 'B can see merchant A'; END IF;
  IF EXISTS (SELECT 1 FROM merchants WHERE id = 'm_default') THEN RAISE EXCEPTION 'B can see demo merchant'; END IF;
END $$;

-- B cannot write into A
DO $$ BEGIN
  BEGIN
    INSERT INTO customers (id, merchant_id, name, phone) VALUES ('x', 'm_a', 'Evil', '0899');
    RAISE EXCEPTION 'B inserted into A';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
UPDATE customers SET name = 'hacked' WHERE merchant_id = 'm_a';
DELETE FROM customers WHERE merchant_id = 'm_a';

-- B cannot read credentials or promote itself
DO $$ BEGIN
  BEGIN
    PERFORM 1 FROM staff_credentials;
    RAISE EXCEPTION 'credentials readable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO platform_super_admins (name, email, user_id) VALUES ('me', 'owner-b@test.id', '22222222-2222-2222-2222-222222222222');
    RAISE EXCEPTION 'self-promoted to platform admin';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE merchants SET subscription_status = 'active' WHERE id = 'm_b';
    IF FOUND THEN RAISE EXCEPTION 'owner changed own subscription'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.create_merchant('m_b2', 'Second', 'retail', 'Budi');
    RAISE EXCEPTION 'owner created second merchant';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
RESET ROLE;

DO $$ BEGIN
  IF (SELECT name FROM customers WHERE merchant_id = 'm_a' AND id = 'c1') <> 'Andi' THEN RAISE EXCEPTION 'A data modified by B'; END IF;
END $$;

-- Owner A adds a cashier, sets a PIN, cashier verifies with lockout
SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111', 'owner-a@test.id');
SET LOCAL ROLE authenticated;
INSERT INTO staff (id, merchant_id, name, email, role) VALUES ('s-cash', 'm_a', 'Citra', 'cashier-a@test.id', 'cashier');
INSERT INTO merchant_members (merchant_id, user_id, role) VALUES ('m_a', '33333333-3333-3333-3333-333333333333', 'cashier');
SELECT public.set_staff_pin('m_a', 's-cash', '4821');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.verify_staff_pin('m_a', 's-cash', '4821')) THEN RAISE EXCEPTION 'correct PIN rejected'; END IF;
  IF EXISTS (SELECT 1 FROM public.verify_staff_pin('m_a', 's-cash', '0000')) THEN RAISE EXCEPTION 'wrong PIN accepted'; END IF;
  BEGIN
    PERFORM public.set_staff_pin('m_a', 's-cash', '12');
    RAISE EXCEPTION 'short PIN accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
DO $$ DECLARE i int; BEGIN
  FOR i IN 1..4 LOOP PERFORM * FROM public.verify_staff_pin('m_a', 's-cash', '9999'); END LOOP;
  BEGIN
    PERFORM * FROM public.verify_staff_pin('m_a', 's-cash', '4821');
    RAISE EXCEPTION 'no lockout after 5 failures';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'locked' THEN RAISE; END IF;
  END;
END $$;
RESET ROLE;

-- Manager override: owner A's PIN approves; guessing locks the merchant
SELECT pg_temp.act_as('11111111-1111-1111-1111-111111111111', 'owner-a@test.id');
SET LOCAL ROLE authenticated;
SELECT public.set_staff_pin('m_a', '11111111-1111-1111-1111-111111111111', '7310');
RESET ROLE;
SELECT pg_temp.act_as('33333333-3333-3333-3333-333333333333', 'cashier-a@test.id');
SET LOCAL ROLE authenticated;
DO $$ DECLARE i int; BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.verify_manager_pin('m_a', '7310')) THEN RAISE EXCEPTION 'owner PIN not accepted for override'; END IF;
  IF EXISTS (SELECT 1 FROM public.verify_manager_pin('m_a', '4821')) THEN RAISE EXCEPTION 'cashier PIN accepted as manager'; END IF;
  FOR i IN 1..4 LOOP PERFORM * FROM public.verify_manager_pin('m_a', '0001'); END LOOP;
  BEGIN
    PERFORM * FROM public.verify_manager_pin('m_a', '7310');
    RAISE EXCEPTION 'no override lockout';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'locked' THEN RAISE; END IF; END;
END $$;
RESET ROLE;

-- Cashier: can sell, cannot change config or delete
SELECT pg_temp.act_as('33333333-3333-3333-3333-333333333333', 'cashier-a@test.id');
SET LOCAL ROLE authenticated;
INSERT INTO orders (id, merchant_id, order_number, total) VALUES ('o1', 'm_a', 'INV-1', 10000);
DO $$ BEGIN
  BEGIN
    INSERT INTO tax_rules (id, merchant_id, name, rate) VALUES ('t0', 'm_a', 'Zero', 0);
    RAISE EXCEPTION 'cashier wrote tax rules';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.set_staff_pin('m_a', 's-cash', '1111');
    RAISE EXCEPTION 'cashier reset a PIN';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO merchant_members (merchant_id, user_id, role) VALUES ('m_a', '33333333-3333-3333-3333-333333333333', 'owner');
    RAISE EXCEPTION 'cashier promoted self';
  EXCEPTION WHEN insufficient_privilege OR unique_violation THEN NULL; END;
END $$;
DELETE FROM orders WHERE id = 'o1';
RESET ROLE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id = 'o1') THEN RAISE EXCEPTION 'cashier deleted an order'; END IF;
END $$;

-- Anonymous: nothing
SELECT pg_temp.act_as(NULL, NULL);
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM 1 FROM customers;
    RAISE EXCEPTION 'anon can read customers';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

SELECT 'ALL RLS CHECKS PASSED' AS result;
ROLLBACK;
