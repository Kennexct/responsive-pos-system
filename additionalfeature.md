# POS System Parameter Specification
## CRM Integration, Loyalty/Membership Program & Business Analytics Reporting
**Prepared for:** Nexa POS (SME Retail & F&B — Indonesia / Singapore)
**Document type:** Feature parameter research — software analyst reference
**Version:** 1.0

---

## 1. Purpose & Scope

This document defines the complete parameter set required to evolve a POS system into a POS + CRM + Loyalty/Membership ecosystem, plus the analytics/reporting parameters needed for business owners to get full visibility into their business. It is meant to sit alongside `master.md` as a feature-and-data-model reference for Nexa POS, but the parameters are written generically enough to apply to any SME retail/F&B POS build.

Four parameter blocks are covered:
1. POS Core Parameters (baseline, CRM/Loyalty depend on these)
2. CRM Module Parameters
3. Loyalty/Membership Program Parameters
4. Reporting & Analytics Parameters

---

## 2. POS Core Parameters (Foundation Layer)

These are the base entities CRM and Loyalty will hook into. If these aren't modeled correctly, CRM/Loyalty data will be inaccurate.

### 2.1 Transaction Parameters
| Parameter | Description |
|---|---|
| `transaction_id` | Unique receipt/order ID |
| `outlet_id / branch_id` | Which store location |
| `terminal_id / device_id` | Which POS device/register |
| `cashier_id / staff_id` | Who processed the sale |
| `customer_id` | Link to CRM profile (nullable = guest checkout) |
| `transaction_datetime` | Timestamp, timezone-aware (WIB/WITA/WIT/SGT) |
| `order_type` | Dine-in, takeaway, delivery, online, pre-order |
| `line_items[]` | SKU, qty, unit price, discount, tax, modifiers, notes |
| `subtotal / discount_total / tax_total / service_charge / rounding / grand_total` | Financial breakdown |
| `payment_method[]` | Cash, QRIS, debit, credit, e-wallet (GoPay/OVO/DANA/PayNow), split payment |
| `payment_status` | Paid, partial, refunded, void |
| `promo_code_applied` | Link to promotions engine |
| `points_earned / points_redeemed` | Loyalty transaction hook (see Section 4) |
| `table_number / queue_number` | F&B specific |
| `channel` | In-store, GrabFood/GoFood/ShopeeFood, own app/web |

### 2.2 Product/Inventory Parameters
- `sku_id`, `product_name`, `category`, `sub_category`, `variant/unit_conversion` (links to your UnitFlow base-unit architecture), `cost_price`, `sell_price`, `tax_class`, `stock_on_hand`, `reorder_point`, `supplier_id`, `barcode`, `is_bundle`, `bundle_components[]`, `expiry_date` (F&B/perishables), `modifier_groups[]` (F&B add-ons).

### 2.3 Staff/HR Parameters
- `staff_id`, `role/permission_level`, `outlet_assignment`, `shift_id`, `clock_in/out`, `sales_attributed`, `commission_rate` (relevant for CRM: staff-to-customer relationship tracking, useful in F&B/beauty/retail where repeat customers prefer specific staff).

### 2.4 Outlet/Business Parameters
- `business_id`, `outlet_id`, `outlet_type` (retail/F&B/hybrid), `operating_hours`, `tax_registration` (NPWP/GST), `currency`, `timezone`.

---

## 3. CRM Module Parameters

### 3.1 Customer Profile (Master Data)
| Parameter | Description |
|---|---|
| `customer_id` | Primary key |
| `full_name` | |
| `phone_number` | Primary identifier at POS (most common lookup key in ID/SG) |
| `email` | |
| `date_of_birth` | For birthday campaigns |
| `gender` | Optional, for segmentation |
| `address[]` | Multiple addresses (delivery use case) |
| `registered_outlet_id` | Where they signed up |
| `registration_date` | |
| `registration_channel` | POS counter, app, web, social, referral |
| `customer_type` | Individual, corporate/B2B account |
| `preferred_language` | ID/EN — relevant for your SEA context |
| `preferred_payment_method` | Derived/observed |
| `tags[]` | Free-form CRM tags (VIP, complainer, wholesale, etc.) |
| `consent_marketing` | PDPA (SG) / UU PDP (ID) opt-in flag — **mandatory field, not optional** |
| `consent_data_processing` | Separate from marketing consent |
| `blacklist_flag` | Fraud/chargeback/bad-check flag |

### 3.2 Behavioral & Transactional Parameters (CRM derives from POS)
- `total_transactions`, `total_spend`, `average_transaction_value (ATV)`, `first_purchase_date`, `last_purchase_date`, `purchase_frequency`, `days_since_last_purchase`, `favorite_category`, `favorite_product`, `favorite_outlet`, `preferred_visit_time/day`, `churn_risk_score`, `RFM_segment` (Recency-Frequency-Monetary).

### 3.3 Segmentation Parameters
- `segment_id`, `segment_rule_type` (RFM, spend threshold, category affinity, geography, tenure), `segment_criteria[]` (dynamic query builder: e.g. "spend > 1jt in 90 days AND category = coffee"), `is_dynamic` (auto-recalculated) vs `is_static` (manually assigned list), `segment_size`.

### 3.4 Engagement / Communication Parameters
- `campaign_id`, `campaign_channel` (WhatsApp Business API, SMS, email, push notification, in-app), `campaign_trigger_type` (manual blast, birthday, win-back/lapsed, post-purchase, cart abandonment for online channel), `message_template_id`, `send_status/open_rate/click_rate/redemption_rate`, `opt_out_status`.

### 3.5 Customer Service / Feedback Parameters
- `feedback_id`, `nps_score / csat_score`, `complaint_category`, `resolution_status`, `linked_transaction_id`, `review_rating` (Google/internal), `response_time_sla`.

### 3.6 CRM ↔ POS Integration Hooks
- Customer lookup at POS **must** support: phone number search, QR/member card scan, and name search — all under 2 seconds for cashier workflow.
- Every transaction should prompt (not force) customer linking to avoid CRM data gaps.
- Guest-to-member conversion parameter: `guest_to_member_conversion_rate` should be trackable — critical KPI for CRM adoption.

---

## 4. Loyalty / Membership Program Parameters

### 4.1 Membership Tier Structure
| Parameter | Description |
|---|---|
| `tier_id` | e.g. Silver, Gold, Platinum |
| `tier_qualification_type` | Spend-based, points-based, visit-frequency-based, or invite-only |
| `tier_qualification_threshold` | e.g. Rp 5,000,000 spend / 12 months, or S$1,000 |
| `tier_benefits[]` | Discount %, free item, priority queue, exclusive access |
| `tier_validity_period` | Rolling 12-month, calendar year, anniversary-based |
| `tier_downgrade_rule` | Auto-downgrade if threshold not maintained |
| `tier_upgrade_trigger` | Real-time vs. batch/nightly recalculation |

### 4.2 Points Engine Parameters
- `earn_rate` — e.g. 1 point per Rp 10,000 or S$1 spent (configurable per outlet/category).
- `earn_rule_exceptions[]` — categories excluded from earning (e.g. discounted items, service charge, alcohol/regulated goods).
- `bonus_multiplier_events[]` — 2x points weekends, birthday month, new-product launch.
- `points_expiry_rule` — rolling expiry (e.g. 12 months from earn date) vs. fixed annual expiry.
- `points_to_currency_conversion_rate` — redemption value, e.g. 100 points = Rp 10,000.
- `min_redemption_threshold` — minimum points balance to redeem.
- `max_redemption_per_transaction` — cap redemption % of bill (common: max 50% of transaction value in points).
- `points_rounding_rule` — floor/ceiling/nearest.

### 4.3 Membership Card/ID Parameters
- `member_id`, `card_type` (physical, virtual/QR, app-based), `card_status` (active, suspended, expired, lost-reissued), `linked_customer_id`, `enrollment_fee` (if paid membership model), `renewal_date`.

### 4.4 Rewards & Redemption Catalog Parameters
- `reward_id`, `reward_type` (discount voucher, free product, cashback, experiential reward), `reward_cost_in_points`, `reward_stock_limit`, `reward_validity_period`, `reward_eligible_tier[]`, `redemption_channel` (in-store only vs. app).

### 4.5 Referral Program Parameters (common extension of loyalty)
- `referral_code`, `referrer_customer_id`, `referee_customer_id`, `referral_reward_referrer`, `referral_reward_referee`, `referral_conversion_status`.

### 4.6 Loyalty ↔ POS/CRM Integration Hooks
- Point earn/redeem **must** be atomic with the transaction (no separate settlement step that can desync).
- Tier benefits (e.g. automatic 10% discount) must be **applied at cart level in real time**, not manually by cashier.
- Loyalty events (tier upgrade, points expiring soon) should feed directly into CRM campaign triggers — this is the real value of connecting the two, not just running them side by side.

---

## 5. Integration Architecture Summary (How the 3 Modules Connect)

```
POS Transaction ──► writes ──► Customer Transaction History (CRM)
                                        │
                                        ▼
                          RFM / Segment Recalculation Engine
                                        │
                       ┌────────────────┼────────────────┐
                       ▼                ▼                ▼
                Loyalty Points     CRM Campaign      Reporting/
                Engine (earn/      Trigger Engine    Analytics Engine
                redeem/tier)       (WA/SMS/Push)
                       │
                       ▼
              Tier Benefit Applied
              back into next POS
              Transaction (discount,
              free item, priority)
```

Key design principle for Nexa POS: **CRM and Loyalty should not be separate databases that sync nightly.** For real-time discount application (tier benefits) and accurate point balances at checkout, the customer/loyalty state must be queried live from the POS transaction screen (Supabase real-time subscription is a good fit here given your existing stack).

---

## 6. Reporting & Analytics Parameters (Business Owner Insight Layer)

This is the layer business owners actually look at. Organize into six report families:

### 6.1 Sales Performance Reports
- **Parameters:** Gross sales, net sales, sales by outlet, sales by category/SKU, sales by hour/day/week (heatmap), sales by payment method, sales by channel (in-store vs. online delivery), average transaction value (ATV), transaction count, item count per transaction (basket size), discount leakage (% of revenue given away in discounts), void/refund rate, gross margin by product.
- **Comparison dimensions:** period-over-period (WoW, MoM, YoY), outlet-vs-outlet, target vs. actual.

### 6.2 Customer/CRM Analytics Reports
- **Parameters:** New vs. returning customer ratio, customer acquisition rate, customer retention rate, churn rate, customer lifetime value (CLV), RFM segment distribution (how many customers in each segment), guest-to-member conversion rate, average spend per segment, top N customers by spend, cohort retention curves (customers acquired in Month X, % still active in Month X+3/6/12).

### 6.3 Loyalty Program Performance Reports
- **Parameters:** Total points issued vs. redeemed (liability tracking — important, this is a financial liability on the books), redemption rate %, points expiry breakage (unused points that expired — revenue recognition relevant), tier distribution (how many members per tier), tier upgrade/downgrade counts, incremental revenue from loyalty members vs. non-members, cost of loyalty program (rewards given) vs. incremental margin generated, most redeemed rewards.

### 6.4 Product/Inventory Analytics Reports
- **Parameters:** Best/worst sellers (by revenue and by margin — these differ), stock turnover ratio, days of inventory on hand, stockout frequency, dead stock report (no movement in X days), category contribution to revenue, supplier performance (lead time, fulfillment accuracy), wastage/shrinkage report (critical for F&B), bundle/combo performance.

### 6.5 Staff Performance Reports
- **Parameters:** Sales per staff member, transactions per staff member, average transaction value per staff, upsell/attach rate per staff, shift attendance/punctuality, commission payout summary, customer feedback linked to staff (for service-oriented F&B/retail).

### 6.6 Financial/Operational Summary Reports
- **Parameters:** Daily/weekly/monthly P&L snapshot (revenue, COGS, gross margin), cash vs. non-cash reconciliation, tax collected summary (PPN/GST-ready export), service charge collected & distribution, opening/closing cash reconciliation per shift, refund/void audit trail (fraud control), multi-outlet consolidated view vs. per-outlet drill-down.

### 6.7 Dashboard/UX Parameters for the Owner-Facing Report Layer
Since your Nexa POS mobile tier is explicitly the "owner dashboard," these matter as much as the raw metrics:
- `default_landing_metrics[]` — the 4-6 numbers an owner sees first (today's sales, sales vs. yesterday/last week same day, top product, new members today).
- `alert_thresholds[]` — configurable triggers (e.g. notify if daily sales drop >20% vs. average, stock below reorder point, points liability exceeds X).
- `export_format` — PDF, Excel, scheduled email/WhatsApp digest (highly relevant for ID/SG SME owners who want a daily WA recap, not a login).
- `drill_down_depth` — from outlet summary → category → SKU → transaction, without leaving the mobile view.
- `date_range_presets` — today, yesterday, this week, last week, MTD, YTD, custom.
- `role_based_report_access` — owner sees everything, outlet manager sees their outlet only, staff sees none/limited.

---

## 7. Suggested Phasing for Nexa POS

Given the current state (frontend prototype complete, three-tier responsive design done), a realistic build sequence:

| Phase | Scope |
|---|---|
| Phase 1 | POS core parameters solid + basic customer capture (phone/name at checkout, no segmentation yet) |
| Phase 2 | CRM profile + transaction history rollup + simple points earn/redeem (flat rate, no tiers) |
| Phase 3 | Tiering, segmentation engine, campaign triggers (WA/push) |
| Phase 4 | Full reporting suite (Section 6) + owner dashboard alerts |
| Phase 5 | Referral program, predictive churn scoring, advanced RFM automation |

This sequencing avoids building loyalty complexity before the CRM data foundation is trustworthy — a common failure mode in SME POS builds where points/tiers get bolted on before customer data is clean.

---

## 8. Notes for Master.md Integration

Recommend adding this document's Section 5 (integration architecture) and Section 6 (reporting parameter list) directly into `master.md` as the canonical reference, since these are the two sections most likely to be re-litigated across future sessions (real-time vs. batch sync decisions, and which reports are MVP vs. later phase).
