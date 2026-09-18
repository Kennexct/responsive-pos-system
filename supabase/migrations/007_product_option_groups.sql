-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 007: option groups on products
--
-- Variants and options are different things and are stored separately:
--   variants_json      — separate sellable items: own SKU, barcode, price. Pick one.
--   option_groups_json — how the item is made: size, hot/ice, extra shots.
--                        Each choice carries a price delta that may be 0 or negative.
--                        No SKU, no barcode, no stock of its own.
--
-- Shape of option_groups_json:
--   [{ "id": "grp-1", "name": "Size", "selection": "single", "required": true,
--      "maxSelect": null,
--      "choices": [{ "id": "opt-1", "name": "Large", "priceDelta": 6000, "isDefault": false }] }]
--
-- Safe to run more than once. Requires 006.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE products ADD COLUMN IF NOT EXISTS option_groups_json JSONB NOT NULL DEFAULT '[]'::jsonb;

-- What the cashier actually chose is kept with the order line inside orders.items_json,
-- so a reprinted receipt shows the same options and note as the original.
COMMENT ON COLUMN products.option_groups_json IS
  'Option groups (modifiers). Choices have priceDelta and never carry stock, SKU or barcode.';

COMMIT;
