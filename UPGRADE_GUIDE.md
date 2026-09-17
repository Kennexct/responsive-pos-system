# VPos upgrade guide: security, pricing engine, design refresh

This release changes how data is protected, how totals are calculated, and how the app looks.
Do the steps in order. Steps 1 to 6 happen on a **staging** Supabase project first; step 7 repeats them on production.

---

## What changed

**Security (migration 006 + app)**
- Every table is isolated per merchant by Postgres Row Level Security. Before, every policy was `USING (true)`, so anyone with the anon key could read or change any merchant's data.
- Sign-in uses Supabase Auth. The hardcoded demo buttons (`owner@vpos.app / 9999`, `admin@vpos.app / 0000`) are gone from cloud mode.
- PINs are bcrypt-hashed in `staff_credentials`, a table the API cannot read. PIN checks run in the database with a 5-try, 5-minute lockout (`verify_staff_pin`, `verify_manager_pin`).
- IDs, customer phone numbers, promo codes and invoice numbers are unique **per merchant**.
- "Erase data" clears only the current merchant (it used to wipe every merchant on the device and in Supabase).
- Receipt printing escapes product, customer and store names.
- Migrations 003 and 004 had broken `$` quoting and could not run; fixed to `$$`.

**Money**
- `src/app/lib/pricing.ts` is the single calculation for cart, checkout, receipts and saved orders:
  line discount → member tier → promo → points → service charge → tax per line.
- Taxes add up by default. Tick "Also tax the taxes above it" only if your tax office requires tax-on-tax.
- New service charge setting (Settings → Taxes), with a choice to tax it or not.
- Promos on non-taxable items no longer reduce tax on other items.
- Points are earned on goods paid for, not on tax or service charge.
- Refunds and voids now return stock, take back points earned, return points redeemed and reduce customer spend. Voids previously did none of this.
- Invoice numbers continue from the last saved order instead of restarting at 1242 on every reload.

**Data bugs fixed**
- Saving no longer runs before loading finishes (it used to overwrite stored data with defaults, and could copy one merchant's data onto another when switching).
- New categories are taxable by default (they were silently untaxed).
- Customer marketing consent is an opt-in checkbox (it defaulted to "yes", which UU PDP / PDPA does not allow).
- Birthdays save to `dateOfBirth`; staff added in Settings get the correct merchant.
- A settings crash from a missing `addToast` function is fixed.

**Design**
- New token palette in `src/styles/theme.css`: `ink` neutrals, `brand` (nila indigo), `leaf`, `turmeric`, `chili`. shadcn/ui variables (`--primary`, `--card`…) point at these.
- Blurred background orbs, frosted-glass panels, gradients, coloured glows and all-caps eyebrow labels are removed.
- Sidebar grouped into Sell / Manage; checkout total reads as a receipt stub; sign-in shows a receipt printing out.
- Visible keyboard focus everywhere; `prefers-reduced-motion` respected.

---

## Step 1: Back up production

Supabase Dashboard → Database → Backups, or:

```bash
pg_dump "$PRODUCTION_DB_URL" --no-owner --format=custom --file vpos-before-006.dump
```

Keep this file until step 9 is finished.

## Step 2: Create a staging project

Create a new Supabase project (or a branch). Copy production data into it if you want a realistic test:

```bash
pg_restore --no-owner --dbname "$STAGING_DB_URL" vpos-before-006.dump
```

## Step 3: Run the migrations on staging

In order, in the SQL editor or with the CLI:

```
001_initial_schema.sql
002_multi_tenant_merchants.sql
003_promo_discounts_and_variants.sql
004_subscriptions_and_superadmin.sql
005_products_variants_json.sql
006_tenant_isolation_and_auth.sql
```

If 001–005 already ran on that database, run only 006. It is safe to run twice.

## Step 4: Prove isolation on staging

Run `supabase/tests/006_rls_test.sql` against staging. It creates test merchants inside a transaction and rolls everything back.
The last line must be `ALL RLS CHECKS PASSED`. If any check fails, stop and send me the error.

## Step 5: Create your accounts

1. Authentication → Users → **Add user** for yourself (the owner). Use a real email and a strong password.
2. Link yourself to the existing business and make yourself platform admin (replace the email):

```sql
-- your auth user id
select id from auth.users where email = 'you@yourbusiness.id';

-- owner of the existing merchant
insert into merchant_members (merchant_id, user_id, role)
values ('m_default', '<your-user-id>', 'owner');

-- platform admin (only for you, the operator of VPos)
insert into platform_super_admins (name, email, user_id)
values ('Your Name', 'you@yourbusiness.id', '<your-user-id>');
```

3. Authentication → Providers → Email: keep **Confirm email** on. New owners get a link before their business is created.

## Step 6: Test the app against staging

```bash
cp .env.example .env.local   # then fill in the STAGING values
npm ci
npm run check                # type check + 15 unit tests + production build
npm run dev
```

`.env.local`:

```
VITE_SUPABASE_URL=https://<staging-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<staging anon key>
```

Walk through this list and tick each one:

- [ ] Sign in with your owner account. Reload the page: you stay signed in.
- [ ] Settings → Staff & Roles: add a cashier with a PIN. In the `staff` table there is no PIN column; `staff_credentials` holds a hash.
- [ ] Sell something with a tier customer, a promo and points. The receipt shows each tax separately and the total matches the cart.
- [ ] Refund it with a wrong manager PIN 5 times: the 6th try says to wait 5 minutes.
- [ ] Refund it with the right PIN: stock and the customer's points go back.
- [ ] In a private window, sign up a second business. It sees none of the first business's products, customers or orders.
- [ ] Browser devtools → Network: no request returns another merchant's rows.

## Step 7: Production

1. Repeat step 3 on production (only 006 if 001–005 already ran).
2. Repeat step 4 on production. It rolls back, so it leaves no data behind.
3. Repeat step 5 on production.

## Step 8: Remove known credentials

The demo seed PINs (1234, 5678, 9999) are public in this repository. After 006 they are hashed but still guessable.

- If `m_default` is only demo data: `delete from merchants where id = 'm_default';` (cascades to its rows).
- If it is your real business: have every staff member set a new PIN in Settings → Staff & Roles.

Then rotate keys: Project Settings → API → **Rotate** the anon key, update it in your hosting provider (Vercel → Environment Variables), and redeploy.

## Step 9: Deploy and watch

1. Deploy the app with the production env vars.
2. For the first day, check Supabase → Logs → Postgres for `permission denied` errors. A few from cashiers' devices are expected (the app still tries to sync settings a cashier is not allowed to change); anything on `orders` or `customers` is not, send it to me.
3. Delete `vpos-before-006.dump` once you are confident, or keep it in encrypted storage.

## Rollback

If production breaks after 006, restore the backup from step 1 and redeploy the previous app build. Migration 006 drops plaintext PIN columns, so there is no partial undo.

---

## Known limits and next work

1. **Sync sends whole lists.** Every change upserts the full products/orders/customers arrays. Fine for small shops; replace with per-row writes before a merchant has thousands of orders.
2. **Checkout is not atomic on the server.** Order, stock and points are separate writes from the browser. Move checkout into one Postgres function (`complete_order`) so a dropped connection cannot leave points without an order (spec §4.6).
3. **Cashier devices try to sync settings they can't write.** RLS rejects it safely; skip those keys by role to keep logs clean.
4. **No visual regression screenshots were taken** while redesigning; review each screen at 375, 768, 1024 and 1440 px and in dark mode.
5. Then continue with the spec: tier validity and downgrade rules, points expiry, discount approval thresholds and reason codes, scanner-mode details (spec §4, §8, §10).

## Offline demo mode

With no `VITE_SUPABASE_*` variables the app runs as a local demo: data stays in the browser and the demo accounts work (`owner@vpos.app` / `9999`). A banner on the sign-in screen says so. Never deploy without the Supabase variables.
