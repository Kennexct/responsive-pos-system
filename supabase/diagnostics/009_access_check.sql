-- ═══════════════════════════════════════════════════════════════════════════
-- Why can't I see my merchant data after migration 006?
--
-- Nothing is deleted by 006. It only stops showing rows to accounts that are not
-- listed as members of that merchant. If a screen went empty, one of these is true:
--   A. Your Supabase Auth user has no row in merchant_members.
--   B. You signed up again in the new app, so you are the owner of a NEW empty
--      merchant while your data sits under the old merchant id (often 'm_default').
--   C. You are signed out, or the app is running without VITE_SUPABASE_* set
--      (offline demo mode reads only this browser).
--
-- Run this whole file in the Supabase SQL editor. The editor runs as the owner and
-- bypasses RLS, so it shows the truth regardless of who can see what in the app.
-- It is READ ONLY. The fixes are at the bottom, commented out.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Where the data actually is. The merchant with the rows is the one you want access to.
SELECT m.id,
       m.name,
       (SELECT count(*) FROM orders    o WHERE o.merchant_id = m.id) AS orders,
       (SELECT count(*) FROM products  p WHERE p.merchant_id = m.id) AS products,
       (SELECT count(*) FROM customers c WHERE c.merchant_id = m.id) AS customers,
       (SELECT count(*) FROM staff     s WHERE s.merchant_id = m.id) AS staff,
       (SELECT count(*) FROM merchant_members mm WHERE mm.merchant_id = m.id) AS members
FROM merchants m
ORDER BY orders DESC, products DESC;

-- 1b. Rows whose merchant no longer exists would have blocked 006, but check anyway.
SELECT 'orphan merchant_id' AS problem, merchant_id, count(*)
FROM orders WHERE merchant_id NOT IN (SELECT id FROM merchants)
GROUP BY merchant_id;

-- 2. Who can sign in, and what they are a member of. An empty role column means
--    that account sees nothing: this is cause A.
SELECT u.id AS user_id,
       u.email,
       mm.merchant_id,
       mm.role,
       (SELECT count(*) FROM platform_super_admins a WHERE a.user_id = u.id) AS is_platform_admin
FROM auth.users u
LEFT JOIN merchant_members mm ON mm.user_id = u.id
ORDER BY u.email;

-- 3. Members pointing at an empty merchant while another merchant holds the data:
--    this is cause B.
SELECT mm.user_id, u.email, mm.merchant_id, mm.role,
       (SELECT count(*) FROM orders o WHERE o.merchant_id = mm.merchant_id) AS orders_in_that_merchant
FROM merchant_members mm
JOIN auth.users u ON u.id = mm.user_id
ORDER BY orders_in_that_merchant;

-- ───────────────────────────────────────────────────────────────────────────
-- FIX A — your account is simply not a member yet (most common).
-- Replace the email and the merchant id from query 1, then run.
-- ───────────────────────────────────────────────────────────────────────────
-- INSERT INTO merchant_members (merchant_id, user_id, role)
-- SELECT 'm_default', u.id, 'owner' FROM auth.users u WHERE u.email = 'you@yourbusiness.id'
-- ON CONFLICT (merchant_id, user_id) DO UPDATE SET role = 'owner';
--
-- The app also expects a staff row for the signed-in email, for the cashier name on receipts:
-- INSERT INTO staff (id, merchant_id, name, email, role)
-- SELECT u.id::text, 'm_default', 'Your Name', u.email, 'owner'
-- FROM auth.users u WHERE u.email = 'you@yourbusiness.id'
-- ON CONFLICT (merchant_id, id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────────────
-- FIX B — signing up in the new app created a second, empty merchant.
-- Keep the merchant that holds the data and drop the empty one.
-- Check query 1 first: only run this when the new merchant really has 0 orders,
-- 0 products and 0 customers.
-- ───────────────────────────────────────────────────────────────────────────
-- BEGIN;
--   -- point your membership at the merchant with the data
--   UPDATE merchant_members SET merchant_id = 'm_default'
--   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'you@yourbusiness.id');
--
--   -- remove the empty merchant created by the signup (cascades to its empty rows)
--   DELETE FROM merchants WHERE id = 'm_new_empty_id_from_query_1';
-- COMMIT;

-- ───────────────────────────────────────────────────────────────────────────
-- FIX C — the data belongs to a merchant you want to merge into another one.
-- Only do this when both merchants are really the same business. Take a backup first.
-- Duplicate ids between the two merchants will stop the move with a unique-key error;
-- in that case rename the clashing ids in 'm_move' first, or ask me for a merge script.
-- ───────────────────────────────────────────────────────────────────────────
-- BEGIN;
--   UPDATE orders     SET merchant_id = 'm_keep' WHERE merchant_id = 'm_move';
--   UPDATE products   SET merchant_id = 'm_keep' WHERE merchant_id = 'm_move';
--   UPDATE customers  SET merchant_id = 'm_keep' WHERE merchant_id = 'm_move';
--   UPDATE categories SET merchant_id = 'm_keep' WHERE merchant_id = 'm_move';
--   DELETE FROM merchants WHERE id = 'm_move';
-- COMMIT;

-- ───────────────────────────────────────────────────────────────────────────
-- After any fix: sign out of the app and sign in again. The membership is read
-- once at sign-in, so an open session keeps the old, empty view.
-- ───────────────────────────────────────────────────────────────────────────
