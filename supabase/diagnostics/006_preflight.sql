-- ═══════════════════════════════════════════════════════════════════════════
-- Preflight for migration 006. READ-ONLY: it creates nothing permanent and changes no data.
-- Paste the whole file into the Supabase SQL editor and run it.
-- Every row should say OK before you run 006_tenant_isolation_and_auth.sql.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION pg_temp.vpos_preflight()
RETURNS TABLE (step INT, check_name TEXT, status TEXT, detail TEXT, fix TEXT)
LANGUAGE plpgsql AS $$
DECLARE
  t TEXT;
  n BIGINT;
  has_col BOOLEAN;
  has_orphans BOOLEAN;
  tenant_tables TEXT[] := ARRAY['business_settings','staff','categories','products','product_variants','customers','orders',
                                'loyalty_settings','loyalty_tiers','tax_rules','discount_settings','promo_codes','payment_methods','refund_settings'];
BEGIN
  -- 1. Is 006 already applied?
  step := 1; check_name := 'migration 006 applied';
  IF to_regclass('public.merchant_members') IS NOT NULL THEN
    status := 'OK'; detail := 'merchant_members exists'; fix := 'Continue with UPGRADE_GUIDE step 5.';
    RETURN NEXT; RETURN;  -- nothing else to check
  END IF;
  status := 'TODO'; detail := 'merchant_members does not exist, so 006 has not run or it failed and rolled back.';
  fix := 'Fix every FAIL below, then run 006_tenant_isolation_and_auth.sql and read its result.';
  RETURN NEXT;

  -- 2. Earlier migrations present
  step := 2;
  FOREACH t IN ARRAY ARRAY['merchants','staff','categories','products','product_variants','customers','orders','tax_rules','promo_codes','payment_methods','loyalty_settings','loyalty_tiers','discount_settings','refund_settings','business_settings'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      check_name := 'table ' || t; status := 'FAIL'; detail := 'missing';
      fix := CASE WHEN t = 'merchants' THEN 'Run 002_multi_tenant_merchants.sql' ELSE 'Run 001_initial_schema.sql' END;
      RETURN NEXT;
    END IF;
  END LOOP;

  check_name := 'migration 003 (promo_codes.merchant_id)';
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promo_codes' AND column_name='merchant_id') INTO has_col;
  status := CASE WHEN has_col THEN 'OK' ELSE 'FAIL' END;
  detail := CASE WHEN has_col THEN 'present' ELSE 'missing. The original 003 had broken $ quoting and never ran.' END;
  fix := CASE WHEN has_col THEN NULL ELSE 'Run the fixed 003_promo_discounts_and_variants.sql from the upgraded repo.' END;
  RETURN NEXT;

  check_name := 'migration 004 (platform_super_admins, subscription columns)';
  has_col := to_regclass('public.platform_super_admins') IS NOT NULL
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='merchants' AND column_name='subscription_status');
  status := CASE WHEN has_col THEN 'OK' ELSE 'FAIL' END;
  detail := CASE WHEN has_col THEN 'present' ELSE 'missing. The original 004 had broken $ quoting and never ran.' END;
  fix := CASE WHEN has_col THEN NULL ELSE 'Run the fixed 004_subscriptions_and_superadmin.sql from the upgraded repo.' END;
  RETURN NEXT;

  check_name := 'migration 005 (products.variants_json)';
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='variants_json') INTO has_col;
  status := CASE WHEN has_col THEN 'OK' ELSE 'FAIL' END;
  detail := CASE WHEN has_col THEN 'present' ELSE 'missing' END;
  fix := CASE WHEN has_col THEN NULL ELSE 'Run 005_products_variants_json.sql' END;
  RETURN NEXT;

  check_name := 'pgcrypto available';
  has_col := EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pgcrypto');
  status := CASE WHEN has_col THEN 'OK' ELSE 'FAIL' END;
  detail := CASE WHEN has_col THEN 'available' ELSE 'not available on this database' END;
  fix := CASE WHEN has_col THEN NULL ELSE 'Enable pgcrypto under Database → Extensions.' END;
  RETURN NEXT;

  IF to_regclass('public.merchants') IS NULL THEN RETURN; END IF;

  -- 3. Rows that 006 would attach to a merchant that doesn't exist (the FK would fail)
  step := 3;
  has_orphans := false;
  FOREACH t IN ARRAY tenant_tables LOOP
    CONTINUE WHEN to_regclass('public.' || t) IS NULL;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='merchant_id') INTO has_col;
    IF has_col THEN
      EXECUTE format('SELECT count(*) FROM %I x WHERE NOT EXISTS (SELECT 1 FROM merchants m WHERE m.id = coalesce(x.merchant_id, %L))', t, 'm_default') INTO n;
    ELSE
      EXECUTE format('SELECT CASE WHEN EXISTS (SELECT 1 FROM merchants WHERE id = %L) THEN 0 ELSE count(*) END FROM %I', 'm_default', t) INTO n;
    END IF;
    IF n > 0 THEN
      check_name := t || ': rows without a merchant'; status := 'FAIL';
      detail := n || ' row(s) point at a merchant id that is not in the merchants table';
      has_orphans := true;
      fix := format('List them: SELECT DISTINCT coalesce(merchant_id, ''m_default'') AS missing_merchant FROM %I EXCEPT SELECT id FROM merchants;  Then run the "recover missing merchants" block at the bottom of this file, or delete those rows.', t);
      RETURN NEXT;
    END IF;
  END LOOP;
  IF NOT has_orphans THEN
    check_name := 'rows without a merchant'; status := 'OK'; detail := 'every row belongs to an existing merchant'; fix := NULL;
    RETURN NEXT;
  END IF;

  -- 4. Duplicates that the new per-merchant unique keys would reject
  step := 4;
  FOR t, check_name IN VALUES
    ('customers', 'phone'), ('staff', 'email'), ('orders', 'order_number'), ('promo_codes', 'code')
  LOOP
    CONTINUE WHEN to_regclass('public.' || t) IS NULL;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='merchant_id') INTO has_col;
    EXECUTE format(
      'SELECT count(*) FROM (SELECT %s, %I FROM %I GROUP BY 1, 2 HAVING count(*) > 1) d',
      CASE WHEN has_col THEN 'coalesce(merchant_id, ''m_default'')' ELSE '''m_default''' END, check_name, t
    ) INTO n;
    status := CASE WHEN n = 0 THEN 'OK' ELSE 'FAIL' END;
    detail := CASE WHEN n = 0 THEN 'no duplicates' ELSE n || ' duplicated value(s) inside the same merchant' END;
    fix := CASE WHEN n = 0 THEN NULL ELSE format('List them: SELECT merchant_id, %1$I, count(*) FROM %2$I GROUP BY 1, 2 HAVING count(*) > 1;  Merge or rename before running 006.', check_name, t) END;
    check_name := t || '.' || check_name || ' unique per merchant';
    RETURN NEXT;
  END LOOP;
END $$;

SELECT * FROM pg_temp.vpos_preflight() ORDER BY step, status DESC, check_name;

-- ─── Recover missing merchants (OPTIONAL, WRITES DATA) ─────────────────────
-- Businesses that signed up in the app before this upgrade sometimes have orders or products
-- but no row in `merchants` (the old app's merchant save failed silently). This creates a
-- placeholder merchant for each missing id so their data is kept. Rename them afterwards in
-- the Merchants screen. Remove the two dashes in front of each line below to run it.
--
-- INSERT INTO merchants (id, name, email)
-- SELECT DISTINCT x.merchant_id, 'Recovered business ' || x.merchant_id, x.merchant_id || '@recovered.invalid'
-- FROM (
--   SELECT merchant_id FROM orders UNION SELECT merchant_id FROM products UNION SELECT merchant_id FROM customers
--   UNION SELECT merchant_id FROM categories UNION SELECT merchant_id FROM staff
-- ) x
-- WHERE x.merchant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM merchants m WHERE m.id = x.merchant_id);
