-- ──────────────────────────────────────────────────────────
-- JJB ARAP — COA Hierarchy Migration v3
-- Adds parent_account_code to chart_of_accounts for parent-child rollup
--
-- Run BEFORE seed-v2-opex-accounts.sql:
--   npx wrangler d1 execute jjb-arap-db --remote --file=migration-v3-coa-hierarchy.sql
-- ──────────────────────────────────────────────────────────

-- Add parent_account_code column for hierarchical COA
ALTER TABLE chart_of_accounts ADD COLUMN parent_account_code TEXT;

-- Index for fast parent lookups
CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_account_code);

-- ── New Asset Accounts (for reclassified legacy OPEX items) ──
-- These are NOT expense accounts — they are balance sheet items

-- 1170 — Employee Receivables (Current Asset)
-- Replaces OPEX-104 Advances to Employees
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code)
VALUES ('1170', 'Employee Receivables', 'Asset', 'Current Asset', '1100');

-- 1500 — Equipment (Fixed Asset)
-- Replaces OPEX-305 Furniture & Fixtures and OPEX-407 Office Equipment
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code)
VALUES ('1500', 'Equipment & Fixtures', 'Asset', 'Fixed Asset', NULL);

-- 1501 — Furniture & Fixtures (Fixed Asset, child of 1500)
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code)
VALUES ('1501', 'Furniture & Fixtures', 'Asset', 'Fixed Asset', '1500');

-- 1502 — Office Equipment (Fixed Asset, child of 1500)
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code)
VALUES ('1502', 'Office Equipment', 'Asset', 'Fixed Asset', '1500');
