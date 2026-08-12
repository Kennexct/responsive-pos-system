-- ═══════════════════════════════════════════════════════════════
-- VPos Supabase Database Schema & Initial Seed
-- ═══════════════════════════════════════════════════════════════

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE business_type AS ENUM ('retail', 'fnb');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_type AS ENUM ('dine-in', 'takeaway', 'delivery');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'qris', 'card', 'bank-transfer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('completed', 'held', 'cancelled', 'refunded', 'voided');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'manager', 'cashier');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE promo_type AS ENUM ('nominal', 'percent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. BUSINESS SETTINGS
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Warung Kopi Santai',
  phone TEXT DEFAULT '+62 812 3456 7890',
  email TEXT DEFAULT 'hello@warkop.id',
  address TEXT DEFAULT 'Jl. Sudirman No. 123, Jakarta',
  type business_type NOT NULL DEFAULT 'fnb',
  dark_mode BOOLEAN DEFAULT false,
  terminal_view TEXT DEFAULT 'grid',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. STAFF / USERS
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'cashier',
  pin VARCHAR(4) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_taxable BOOLEAN DEFAULT true,
  is_discountable BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PRODUCTS & VARIANTS
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INT NOT NULL DEFAULT 0,
  cost_price INT NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  emoji TEXT DEFAULT '☕',
  image_url TEXT,
  low_stock_threshold INT DEFAULT 10,
  sku TEXT,
  barcode TEXT,
  track_inventory BOOLEAN DEFAULT true,
  allow_discount BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_modifier INT NOT NULL DEFAULT 0,
  sku TEXT,
  barcode TEXT
);

-- 7. CUSTOMERS & LOYALTY
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  points_balance INT DEFAULT 0,
  total_spend INT DEFAULT 0,
  total_transactions INT DEFAULT 0,
  average_transaction_value INT DEFAULT 0,
  tier_id TEXT DEFAULT 'bronze',
  date_of_birth DATE,
  marketing_consent BOOLEAN DEFAULT false,
  blacklist_flag BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  last_purchase_date TIMESTAMPTZ,
  favorite_category TEXT,
  registration_date TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  earn_rate_spend INT DEFAULT 10000,
  earn_rate_points INT DEFAULT 1,
  redemption_value INT DEFAULT 100
);

CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  min_spend INT NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  sort_order INT DEFAULT 0
);

-- 8. ORDERS & ORDER ITEMS
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  item_count INT NOT NULL DEFAULT 0,
  subtotal_before_discount INT NOT NULL DEFAULT 0,
  discount_total INT DEFAULT 0,
  promo_code TEXT,
  subtotal INT NOT NULL DEFAULT 0,
  tax INT DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  total_cost INT DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  split_payment_method payment_method,
  split_amount INT,
  order_type order_type NOT NULL DEFAULT 'dine-in',
  status order_status NOT NULL DEFAULT 'completed',
  cashier TEXT NOT NULL DEFAULT 'Cashier',
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  refund_reason TEXT,
  points_earned INT DEFAULT 0,
  points_redeemed INT DEFAULT 0,
  points_discount_amt INT DEFAULT 0,
  items_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TAXES, PROMOS, PAYMENTS & SETTINGS
CREATE TABLE IF NOT EXISTS tax_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_inclusive BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS discount_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  allow_item_discount BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type promo_type NOT NULL DEFAULT 'percent',
  value NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  active_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  min_spend INT,
  categories TEXT[],
  cannot_combine BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id payment_method PRIMARY KEY,
  label TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS refund_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_pin_required BOOLEAN DEFAULT true
);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated access (For POS demo/terminal usage)
CREATE POLICY "Public read business_settings" ON business_settings FOR SELECT USING (true);
CREATE POLICY "Public write business_settings" ON business_settings FOR ALL USING (true);

CREATE POLICY "Public read staff" ON staff FOR SELECT USING (true);
CREATE POLICY "Public write staff" ON staff FOR ALL USING (true);

CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public write categories" ON categories FOR ALL USING (true);

CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public write products" ON products FOR ALL USING (true);

CREATE POLICY "Public read product_variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Public write product_variants" ON product_variants FOR ALL USING (true);

CREATE POLICY "Public read customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Public write customers" ON customers FOR ALL USING (true);

CREATE POLICY "Public read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public write orders" ON orders FOR ALL USING (true);

-- 11. INITIAL SEED DATA
INSERT INTO business_settings (id, name, phone, email, address, type) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Warung Kopi Santai', '+62 812 3456 7890', 'hello@warkop.id', 'Jl. Sudirman No. 123, Jakarta', 'fnb')
ON CONFLICT DO NOTHING;

INSERT INTO staff (id, name, email, role, pin) VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Budi Santoso', 'budi@warkop.id', 'owner', '9999'),
  ('00000000-0000-0000-0000-000000000003', 'Ani Wijaya', 'ani@warkop.id', 'cashier', '1234'),
  ('00000000-0000-0000-0000-000000000004', 'Citra Dewi', 'citra@warkop.id', 'cashier', '5678')
ON CONFLICT DO NOTHING;

INSERT INTO categories (id, name, is_taxable, is_discountable) VALUES 
  ('cat-all', 'All', true, true),
  ('cat-coffee', 'Coffee', true, true),
  ('cat-tea', 'Tea', true, true),
  ('cat-food', 'Food', true, true),
  ('cat-snacks', 'Snacks', true, true),
  ('cat-dessert', 'Dessert', true, true),
  ('cat-juice', 'Juice', true, true),
  ('cat-others', 'Others', true, false)
ON CONFLICT DO NOTHING;

INSERT INTO products (id, name, price, cost_price, category, stock, emoji, low_stock_threshold, track_inventory, allow_discount, sku) VALUES
  ('1', 'Americano', 28000, 8000, 'Coffee', 50, '☕', 10, true, true, 'COF-AME-01'),
  ('2', 'Caffe Latte', 34000, 10000, 'Coffee', 40, '🥛', 10, true, true, 'COF-LAT-01'),
  ('3', 'Cappuccino', 34000, 10000, 'Coffee', 35, '☕', 10, true, true, 'COF-CAP-01'),
  ('4', 'Matcha Latte', 36000, 12000, 'Tea', 25, '🍵', 8, true, true, 'TEA-MAT-01'),
  ('5', 'Earl Grey Tea', 26000, 5000, 'Tea', 60, '🫖', 15, true, true, 'TEA-EGL-01'),
  ('6', 'Nasi Goreng Special', 45000, 18000, 'Food', 20, '🍳', 5, true, true, 'FOD-NAS-01'),
  ('7', 'Croissant Butter', 24000, 7000, 'Snacks', 4, '🥐', 5, true, true, 'SNK-CRO-01'),
  ('8', 'Cheesecake Slice', 38000, 15000, 'Dessert', 12, '🍰', 5, true, true, 'DES-CHK-01'),
  ('9', 'Fresh Orange Juice', 30000, 9000, 'Juice', 30, '🍊', 8, true, true, 'JUC-ORGA-01')
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (id, product_id, name, price_modifier, sku) VALUES
  ('v1', '1', 'Large', 5000, 'COF-AME-01-L')
ON CONFLICT DO NOTHING;

INSERT INTO customers (id, name, phone, email, points_balance, total_spend, registration_date, tier_id, total_transactions, average_transaction_value, last_purchase_date, marketing_consent) VALUES
  ('c1', 'Andi Pratama', '081234567890', 'andi@gmail.com', 1500, 250000, '2023-11-10T10:00:00Z', 'silver', 5, 50000, '2024-05-12T10:00:00Z', true),
  ('c2', 'Rina Wijaya', '081987654321', 'rina@yahoo.com', 0, 45000, '2024-01-15T14:30:00Z', 'bronze', 1, 45000, '2024-01-15T14:30:00Z', false)
ON CONFLICT DO NOTHING;

INSERT INTO payment_methods (id, label, enabled) VALUES
  ('cash', 'Cash', true),
  ('qris', 'QRIS', true),
  ('card', 'Debit / Credit Card', true),
  ('bank-transfer', 'Bank Transfer', true)
ON CONFLICT DO NOTHING;

INSERT INTO tax_rules (id, name, rate, is_inclusive, sort_order) VALUES
  ('tax-pb1', 'PB1 / PPN', 11, false, 2)
ON CONFLICT DO NOTHING;

INSERT INTO promo_codes (id, code, type, value, active) VALUES
  ('1', 'PROMO10', 'percent', 10, true)
ON CONFLICT DO NOTHING;
