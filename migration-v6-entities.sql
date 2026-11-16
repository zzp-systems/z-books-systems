-- ──────────────────────────────────────────────────────────
-- JJB ARAP — Entities Table Migration v6
-- Master customer/supplier registry for lookup dropdowns
--
-- Run:
--   npx wrangler d1 execute jjb-arap-db --remote --file=migration-v6-entities.sql
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,           -- 'Customer' or 'Supplier'
  name TEXT NOT NULL,
  tin TEXT,
  is_top_withholding_agent INTEGER DEFAULT 0,
  is_vat_registered INTEGER DEFAULT 1,
  territory TEXT,
  address TEXT,
  contact_number TEXT,
  email TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_tin ON entities(tin);
