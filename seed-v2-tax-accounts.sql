-- ──────────────────────────────────────────────────────────
-- JJB ARAP — Tax Account Seed Data v2
-- Adds Philippine BIR tax accounts to the existing 23-account chart.
--
-- Run AFTER migration-v2-tax-compliance.sql:
--   npx wrangler d1 execute jjb-arap-db --remote --file=seed-v2-tax-accounts.sql
-- ──────────────────────────────────────────────────────────

-- ── New Philippine Tax Accounts (6 new accounts → 29 total) ──
-- These use INSERT OR IGNORE so re-running is safe.

-- Assets
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type) VALUES
  ('1150', 'Creditable Withholding Tax (CWT / BIR 2307)', 'Asset', 'Current Asset'),
  ('1160', 'Input VAT — Goods & Services',                 'Asset', 'Current Asset');

-- Liabilities
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type) VALUES
  ('2100', 'Output VAT Payable',                           'Liability', 'Current Liability'),
  ('2110', 'Expanded Withholding Tax (EWT) Payable',       'Liability', 'Current Liability');

-- Revenue (split VATable vs VAT-Exempt)
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type) VALUES
  ('4010', 'Sales Revenue — VATable',                     'Revenue', 'Operating Revenue'),
  ('4020', 'Sales Revenue — VAT-Exempt',                  'Revenue', 'Operating Revenue');

-- ── Note: The old generic accounts remain for backward compatibility: ──
--   2100 was 'VAT Payable'       → now 'Output VAT Payable' (updated above via INSERT OR IGNORE
--                                  since 2100 already exists, the IGNORE skips it)
--   2200 was 'Withholding Tax Payable' → remains as legacy; 2110 is the new EWT Payable
--   4000 was 'Sales Revenue'     → remains as legacy; 4010/4020 are the VAT-split versions
--
-- If 2100 already exists from the original seed, update its name:
UPDATE chart_of_accounts
  SET account_name = 'Output VAT Payable', sub_type = 'Current Liability'
  WHERE account_code = '2100' AND account_name = 'VAT Payable';
