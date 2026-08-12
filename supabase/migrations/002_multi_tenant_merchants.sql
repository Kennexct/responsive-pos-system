-- ═══════════════════════════════════════════════════════════════
-- VPos Supabase Schema Migration: Multi-Tenant Merchants
-- ═══════════════════════════════════════════════════════════════

-- 1. Create MERCHANTS Table
CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  type business_type DEFAULT 'fnb',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add merchant_id to existing operational tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchant_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS merchant_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS merchant_id TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS merchant_id TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS merchant_id TEXT;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS merchant_id TEXT;

-- 3. Create Indexes for fast querying per merchant
CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_customers_merchant ON customers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_categories_merchant ON categories(merchant_id);
CREATE INDEX IF NOT EXISTS idx_staff_merchant ON staff(merchant_id);

-- 4. Enable Row Level Security (RLS) on Merchants
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read write merchants" ON merchants FOR ALL USING (true);

-- 5. Seed default merchant for existing store
INSERT INTO merchants (id, name, email, phone, address, type)
VALUES ('m_default', 'Warung Kopi Santai', 'owner@vpos.app', '+62 812 3456 7890', 'Jl. Sudirman No. 123, Jakarta', 'fnb')
ON CONFLICT DO NOTHING;

-- Backfill legacy records to default merchant if merchant_id is null
UPDATE products SET merchant_id = 'm_default' WHERE merchant_id IS NULL;
UPDATE orders SET merchant_id = 'm_default' WHERE merchant_id IS NULL;
UPDATE customers SET merchant_id = 'm_default' WHERE merchant_id IS NULL;
UPDATE categories SET merchant_id = 'm_default' WHERE merchant_id IS NULL;
UPDATE staff SET merchant_id = 'm_default' WHERE merchant_id IS NULL;
UPDATE business_settings SET merchant_id = 'm_default' WHERE merchant_id IS NULL;
