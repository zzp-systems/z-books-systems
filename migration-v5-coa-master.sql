-- ──────────────────────────────────────────────────────────
-- JJB ARAP — Master COA Migration v5
-- Adds description, tax_treatment_notes, and account_level columns
-- to chart_of_accounts for the full 77-account hierarchical structure.
--
-- Run BEFORE seed-v3-master-coa.sql:
--   npx wrangler d1 execute jjb-arap-db --remote --file=migration-v5-coa-master.sql
-- ──────────────────────────────────────────────────────────

ALTER TABLE chart_of_accounts ADD COLUMN description TEXT;
ALTER TABLE chart_of_accounts ADD COLUMN tax_treatment_notes TEXT;
ALTER TABLE chart_of_accounts ADD COLUMN account_level TEXT DEFAULT 'Parent';

-- Index for filtering by level
CREATE INDEX IF NOT EXISTS idx_coa_level ON chart_of_accounts(account_level);
