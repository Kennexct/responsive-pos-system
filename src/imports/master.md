# Web POS — Master Plan
**For:** SMEs, Retail & F&B businesses
**Stack:** Next.js on Vercel · Supabase (Postgres + Auth) · Multi-tenant, single database
**Status:** Planning / Pre-build
**Last updated:** 2026-07-01

---

## 1. Product Summary

A web-based, responsive POS system serving both **Retail** and **F&B** SMEs from one codebase and one shared database. Each customer ("merchant") is a fully isolated tenant — no merchant can ever see another merchant's data, enforced at the database layer via Supabase Row Level Security (RLS), not just app logic.

**Business Type toggle:** Set once per merchant at onboarding (`Retail` / `F&B` / `Both`). Same data model underneath; toggling this just shows/hides business-specific UI (e.g. table/order-type selector for F&B, variant fields for retail).

---

## 2. Core Feature Set

### POS View (cashier-facing, touch-optimized)
- Product grid with category tabs + search/barcode input
- Cart panel: qty, per-line discount, void item
- Order type selector (Dine-in / Takeaway / Delivery) — **F&B mode only**
- Hold / resume order — important for F&B walk-away orders
- Checkout: payment method selector, change calculator
- Generate PDF invoice / print receipt

### Dashboard
- **Sales overview:** today / week / month, top products, payment method split
- **Inventory:** stock levels, low-stock flags, stock in/out log, categories
- **Reports:** sales report (date range + CSV export), tax collected report
- **Settings:** business profile, currency, tax, payment types, users/roles

### Settings — specifics
| Setting | v1 Scope |
|---|---|
| **Currency** | One base currency per merchant (set once at onboarding). Optional display currency with **manually entered** exchange rate. No live FX API in v1. |
| **Tax** | 1+ named tax rates (e.g. PPN 11%, GST 9%), inclusive/exclusive toggle, default rate assignable per product. |
| **Payment types** | List of methods (Cash, QRIS, Card, Bank Transfer, PayNow, etc.), each with enable/disable toggle. **v1 = manual reference record only** — cashier selects method at checkout, it's logged for reporting. No live gateway processing in v1. |

### Invoice PDF
- Business header/logo, line items, tax breakdown, payment method, sequential invoice number (per outlet, for future multi-branch support)
- Generated on checkout completion; downloadable, optionally emailed

---

## 3. Responsive Design Strategy

**Do not treat this as one layout that shrinks.** Each breakpoint has a different *job*:

| | Desktop | Tablet | Mobile |
|---|---|---|---|
| **POS view** | Product grid + cart side-by-side | Same split, larger touch targets, cart as slide-over | **Not the primary checkout surface** |
| **Dashboard** | Full sidebar, multi-column | Collapsible sidebar, stacked cards | **Owner "check-in" view only:** today's sales, low-stock alerts, recent transactions |

**Rationale:** Real checkout happens on tablet (F&B counter/table-side) or desktop (retail counter) — almost never on a phone. Mobile is scoped as a lightweight owner dashboard, not a full POS, to avoid wasted design/dev effort on a screen size that won't run checkout in practice.

---

## 4. Multi-Tenancy & Data Isolation

**Pattern:** One shared database. Every tenant table carries a `merchant_id`. Isolation enforced by **Postgres Row Level Security (RLS)** — not just app-code filtering — so a bug in API logic cannot leak cross-merchant data.

### Schema (minimum viable)

```
merchants          — id, name, business_type, currency, created_at
users_merchants     — user_id, merchant_id, role (owner/cashier/manager)  [join table]
outlets             — id, merchant_id, name  (put outlet_id on every table now, even for single-outlet v1)
products            — id, merchant_id, outlet_id, name, price, category_id, ...
categories          — id, merchant_id, name
inventory           — id, merchant_id, product_id, stock_qty, movement_log
orders              — id, merchant_id, outlet_id, order_type, status, ...
order_items         — id, order_id, product_id, qty, price, discount
payments             — id, order_id, method, amount, reference, enabled_at_time
tax_rates            — id, merchant_id, name, rate, inclusive (bool)
settings             — id, merchant_id, key, value
```

**Why `users_merchants` as a join table (not `merchant_id` on `users` directly):** allows one login to manage multiple merchants/outlets later at zero extra cost now.

**Why `outlet_id` on every table now:** retrofitting multi-branch support later is a painful migration. Cheap to add at v1 even if only one outlet exists per merchant initially.

### RLS Policy Pattern

Applied to every tenant-scoped table (`products`, `orders`, `order_items`, `inventory`, `payments`, `tax_rates`, `settings`, etc.):

```sql
alter table products enable row level security;

create policy "Users can only access their merchant's products"
on products
for all
using (
  merchant_id in (
    select merchant_id from users_merchants where user_id = auth.uid()
  )
);
```

Split into `for select` / `for insert` / `for update` / `for delete` once role-based rules are needed (e.g. cashiers can insert orders but not delete them; only owners can delete).

### "Active Merchant" Resolution (frontend/API)
1. After login, fetch the user's merchant list from `users_merchants`.
2. One merchant → auto-select.
3. Multiple merchants → merchant switcher UI; store selection in session/cookie.
4. Every query includes `merchant_id` — but RLS is the real safety net even if the frontend sends the wrong value.

### Vercel + Supabase Rules
- Use `@supabase/ssr` server-side client in API routes/Server Components so the authenticated user's JWT is forwarded on every query — **RLS only works if the request carries the user's token.**
- **Never expose the Supabase `service_role` key client-side.** It bypasses RLS entirely. Restrict it to trusted server-only jobs (e.g. cron reports).

### Signup Model — decide before build
| Model | Fit |
|---|---|
| **Self-serve:** signup auto-creates a `merchants` row, user becomes `owner` | Frictionless trials, good for scale |
| **Invite-only:** platform operator manually creates merchant post-sale, then invites owner | More control, better fit while validating early sales |

---

## 5. Build Phases

**Phase 1 — MVP**
Auth/roles → Product & inventory CRUD → POS checkout flow → Settings (currency, tax, payment types) → Invoice PDF → RLS multi-tenancy foundation

**Phase 2**
Reports dashboard, low-stock alerts, CSV export

**Phase 3**
Barcode scanning, discounts/promos, table management/KDS for F&B, real payment gateway integration (Midtrans/Xendit/DOKU/PayNow)

**Phase 4**
Multi-outlet support, offline-mode/PWA

---

## 6. Open Decisions / Flagged Risks

- [ ] **Offline resilience** — not in original feature list, but flagged as high-value: internet drops mid-transaction are common in ID retail/F&B. Even a basic local-queue-then-sync approach is a strong differentiator. Consider pulling into Phase 1 stretch or early Phase 4.
- [ ] **Multi-currency scope** — confirm whether merchants need multiple currencies *live within one transaction/report*, or just a one-time base-currency setup. Default: latter (simpler) unless proven otherwise.
- [ ] **Reports scope creep** — cap v1 at: sales summary, top products, payment method breakdown, tax collected. Anything beyond (forecasting, cohort analysis) is Phase 3+ at earliest.
- [ ] Signup model decision (self-serve vs. invite-only) — see Section 4.

---

## 7. Reference Assets
- POS checkout wireframes — *not yet created*
- Full Supabase migration SQL (tables + RLS policies) — *not yet created*
- Next.js + Supabase auth/merchant-switcher scaffold — *not yet created*

*(Update this section as assets are produced so this doc stays the single source of truth.)*
