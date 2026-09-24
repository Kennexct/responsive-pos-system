# VPos update package

Only the files that changed. Copy the contents of this folder over your repository root, keeping the folder structure, then run `npm install`.

Verified: applied to a clean checkout of your `main` (commit 5e8e136) and then `npm run check` passed — TypeScript 0 errors, 39 tests, production build.

```bash
cd responsive-pos-system
git checkout -b vpos-update
cp -r /path/to/vpos-update/. .
npm install
npm run check
```

Nothing is deleted by this package, and nothing outside the files below is touched. `package-lock.json` is not included; `npm install` regenerates it from the updated `package.json`.

---

## New files

| File | What it is |
| --- | --- |
| `src/app/lib/pricing.ts` | The totals engine: line discount → tier → promo → points → service charge → tax per line |
| `src/app/lib/cartPricing.ts` | Turns the cart, customer tier and promo into engine input |
| `src/app/lib/lineItems.ts` | Unit price, option selection rules and cart-line merging |
| `src/app/lib/orders.ts` | Undoes a customer's spend, visits and points on refund or void |
| `src/app/lib/auth.ts` | Supabase Auth sign-in, session, staff and manager PIN checks |
| `src/app/lib/escapeHtml.ts` | Escapes merchant text before it goes into printed receipts |
| `src/app/components/ItemBuilderModal.tsx` | The till sheet: variant, options, note, quantity, live line total |
| `src/app/components/RegisterView.tsx` | Open shift, takings by method, cash in/out, closed-shift history, X and Z reports |
| `src/app/components/RegisterModals.tsx` | Open register, cash movement, and close register with a denomination count |
| `src/app/lib/register.ts` | Expected cash, variance, per-method takings, stale-shift detection |
| `src/app/lib/receiptNumber.ts` | Receipt number format, reset cycles, next number from stored orders |
| `src/app/lib/loyalty.ts` | Redemption rules: on/off, minimum, step, share of bill, balance |
| `src/app/lib/__tests__/pricing.test.ts` | 12 tests: tax stacking, inclusive tax, promo caps, rounding |
| `src/app/lib/__tests__/lineItems.test.ts` | 9 tests: zero and negative option prices, maxSelect, required groups |
| `src/app/lib/__tests__/orders.test.ts` | 3 tests: refund reversal never goes negative |
| `src/app/lib/__tests__/register.test.ts` | 9 tests: expected cash, voids excluded, denominations, numbering resets |
| `src/app/lib/__tests__/loyalty.test.ts` | 6 tests: caps, steps, minimums and refusal messages |
| `tsconfig.json` | Type checking, which the project had no config for |
| `UPGRADE_GUIDE.md` | Step-by-step rollout, checks and rollback |

## New SQL

| File | What it is |
| --- | --- |
| `supabase/migrations/006_tenant_isolation_and_auth.sql` | RLS per merchant, hashed PINs, per-merchant keys, auth functions |
| `supabase/migrations/007_product_option_groups.sql` | `products.option_groups_json` |
| `supabase/migrations/008_register_sessions_and_settings.sql` | Register shifts, cash movements, `orders.session_id`, redemption rules, receipt format |
| `supabase/tests/008_register_test.sql` | Proves one open shift per merchant and no cross-merchant leakage |
| `supabase/diagnostics/006_preflight.sql` | Read-only check to run before 006, with the fix for each problem |
| `supabase/tests/006_rls_test.sql` | Proves one merchant cannot read or write another's data |

## Changed files

| File | Change |
| --- | --- |
| `src/app/App.tsx` | Session restore, sign-out, scoped data erase, invoice numbering, refund and void reversal, service charge state |
| `src/app/components/POSView.tsx` | Totals from the engine, item builder, options in cart lines, scan flow |
| `src/app/components/CheckoutModal.tsx` | Totals from the engine, points cap, service charge and per-tax lines, escaped receipt |
| `src/app/components/InventoryView.tsx` | Rebuilt product form: separate Variants and Options sections, money fields that accept 0 and negatives |
| `src/app/components/SettingsView.tsx` | New Points & Loyalty and Register & Receipts tabs, service charge, compound tax, cloud-safe staff PINs |
| `src/app/components/AuthView.tsx` | Rewritten: Supabase Auth, no hardcoded credentials, receipt-led layout |
| `src/app/components/Sidebar.tsx` | Rewritten: grouped navigation, collapse, accessible labels |
| `src/app/components/DailySalesView.tsx` | Manager PIN through the database, receipt shows options, notes and each tax |
| `src/app/components/CustomersView.tsx` | Consent is opt-in, birthday saved to the right field, points sorting fixed |
| `src/app/components/PlatformAdminView.tsx` | Stops showing owners' PINs |
| `src/app/components/mockData.tsx` | Option groups, selected options, service charge, tax `compound`, order fields |
| `src/app/services/supabaseSync.ts` | Per-merchant upserts, no PINs sent, errors surfaced, option groups, scoped purge |
| `src/app/hooks/usePersistentState.ts` | Rewritten: no save-before-load, no cross-merchant writes |
| `src/styles/theme.css` | New token palette: ink, brand, leaf, turmeric, chili, plus shadcn variables |
| `src/styles/globals.css` | Focus rings, scoped transitions, reduced motion, receipt edge |
| `src/app/components/{Dashboard,GuidedSetupModal,MobileOwnerView,OnboardingWalkthroughModal,ReportsView,VPosLogo,ConfirmationModal,figma/ImageWithFallback}.tsx`, `src/app/contexts/ToastContext.tsx` | Palette tokens; gradients, glass and all-caps labels removed |
| `src/app/main.tsx` (`src/main.tsx`) | Import path fix |
| `package.json` | `test`, `typecheck`, `check` scripts; vitest and TypeScript as dev dependencies |
| `.env.example` | Supabase variables, and what happens without them |
| `supabase/migrations/003_…`, `004_…` | Fixed `$` quoting so they can actually run |

---

## Order of work

1. Copy the files, `npm install`, `npm run check`.
2. Run `supabase/diagnostics/006_preflight.sql` on a staging database and fix every FAIL.
3. Run migration `006`, then `007`, then `008`.
4. Run `supabase/tests/006_rls_test.sql` and `supabase/tests/008_register_test.sql` — both must print their PASSED line.
5. Follow `UPGRADE_GUIDE.md` from step 5 for accounts, key rotation and the deploy checklist.
