-- ═══════════════════════════════════════════════════════════════
-- Migration 004: Merchant Subscriptions & Super Admin Management
-- ═══════════════════════════════════════════════════════════════

-- 1. Create Enums for Subscription Plans and Statuses
DO $ BEGIN
  CREATE TYPE subscription_plan_type AS ENUM ('trial', 'monthly', 'yearly', 'lifetime');
EXCEPTION WHEN duplicate_object THEN null; END $ ;

DO $ BEGIN
  CREATE TYPE subscription_status_type AS ENUM ('trial', 'active', 'suspended', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $ ;

-- 2. Add Subscription and Access Columns to MERCHANTS table
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS subscription_plan subscription_plan_type DEFAULT 'trial';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS subscription_status subscription_status_type DEFAULT 'trial';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT (now() + interval '14 days');
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS owner_pin VARCHAR(10) DEFAULT '9999';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Create Indexes for Quick Lookup
CREATE INDEX IF NOT EXISTS idx_merchants_sub_status ON merchants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_merchants_sub_expires ON merchants(subscription_expires_at);
CREATE INDEX IF NOT EXISTS idx_merchants_is_enabled ON merchants(is_enabled);

-- 4. Set Default Merchant (m_default) as an Active Yearly / Lifetime plan
UPDATE merchants 
SET 
  subscription_plan = 'yearly',
  subscription_status = 'active',
  subscription_starts_at = now(),
  subscription_expires_at = (now() + interval '1 year'),
  is_enabled = true,
  owner_name = 'Budi Santoso'
WHERE id = 'm_default';

-- 5. Create SUPER ADMINS table
CREATE TABLE IF NOT EXISTS platform_super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  pin VARCHAR(10) NOT NULL,
  role TEXT NOT NULL DEFAULT 'superadmin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Enable RLS on Super Admins
ALTER TABLE platform_super_admins ENABLE ROW LEVEL SECURITY;
DO $ BEGIN
  CREATE POLICY "Public read write super admins" ON platform_super_admins FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $ ;

-- Seed default Super Admin account (admin@vpos.app / 0000)
INSERT INTO platform_super_admins (name, email, pin, role)
VALUES ('Platform Super Admin', 'admin@vpos.app', '0000', 'superadmin')
ON CONFLICT (email) DO NOTHING;
