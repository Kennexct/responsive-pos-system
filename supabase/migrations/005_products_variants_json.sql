-- ═══════════════════════════════════════════════════════════════
-- Migration 005: Products Variants JSON Column for Fast Sync
-- ═══════════════════════════════════════════════════════════════

-- Add variants_json column to products table for complete atomic persistence
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants_json JSONB DEFAULT '[]'::jsonb;
