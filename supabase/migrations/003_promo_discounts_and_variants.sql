-- ═══════════════════════════════════════════════════════════════
-- Migration 003: Promo Code Name & Cap, Product Variants & Merchant Scoping
-- ═══════════════════════════════════════════════════════════════

-- 1. Add 'name' and 'max_discount_amount' to promo_codes
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS max_discount_amount INT;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS merchant_id TEXT;

CREATE INDEX IF NOT EXISTS idx_promo_codes_merchant ON promo_codes(merchant_id);

-- 2. Ensure product_variants supports sku, barcode, and merchant_id
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS merchant_id TEXT;

CREATE INDEX IF NOT EXISTS idx_product_variants_merchant ON product_variants(merchant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON product_variants(barcode);

-- 3. Enable RLS and policies for promo_codes if not already added
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public read write promo_codes" ON promo_codes FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Backfill default merchant id for existing promos and variants
UPDATE promo_codes SET merchant_id = 'm_default' WHERE merchant_id IS NULL;
UPDATE product_variants SET merchant_id = 'm_default' WHERE merchant_id IS NULL;
