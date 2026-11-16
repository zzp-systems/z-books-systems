-- ──────────────────────────────────────────────────────────
-- JJB ARAP — OPEX Chart of Accounts Seed v2 (Parent-Child Hierarchy)
--
-- Run AFTER migration-v3-coa-hierarchy.sql AND seed-v2-tax-accounts.sql:
--   npx wrangler d1 execute jjb-arap-db --remote --file=seed-v2-opex-accounts.sql
--
-- STRUCTURE:
--   5 parent expense accounts (5300, 5400, 5500, 5600, 5900) already exist
--   from the original seed. The 31 legacy OPEX accounts become CHILD accounts
--   underneath the appropriate parent, using parent_account_code for rollup.
--
--   5 accounts are RECLASSIFIED out of Expense entirely:
--     OPEX-104 → Asset (1170 Employee Receivables)
--     OPEX-305 → Asset (1501 Furniture & Fixtures)
--     OPEX-407 → Asset (1502 Office Equipment)
--     OPEX-408 → Inventory (child of 1200)
--     OPEX-503 → Liability (child of 2110 EWT Payable)
--
-- Journal entries post to the CHILD (leaf) accounts.
-- Financial statements roll up to the PARENT accounts.
-- ──────────────────────────────────────────────────────────

-- ============================================================
-- A. Expense Children — under 5600 Salaries Expense
-- ============================================================
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code) VALUES
  ('OPEX-101', 'Salaries & Wages',              'Expense', 'Personnel & Welfare', '5600'),
  ('OPEX-102', 'Driver Allowance',              'Expense', 'Personnel & Welfare', '5600'),
  ('OPEX-103', 'Helper Allowance',              'Expense', 'Personnel & Welfare', '5600');

-- ============================================================
-- B. Expense Children — under 5300 Utilities Expense
-- ============================================================
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code) VALUES
  ('OPEX-302', 'Utilities Expense',             'Expense', 'Occupancy & Facilities', '5300'),
  ('OPEX-403', 'Telecommunication Expense',     'Expense', 'Administrative & General', '5300');

-- ============================================================
-- C. Expense Child — under 5400 Rent Expense
-- ============================================================
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code) VALUES
  ('OPEX-301', 'Rent Expense',                  'Expense', 'Occupancy & Facilities', '5400');

-- ============================================================
-- D. Expense Children — under 5500 Marketing Expense
-- ============================================================
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code) VALUES
  ('OPEX-501', 'Advertising & Promotions',      'Expense', 'Marketing & Taxes', '5500'),
  ('OPEX-502', 'Samples & Giveaways',            'Expense', 'Marketing & Taxes', '5500');

-- ============================================================
-- E. Expense Children — under 5900 Other Expenses
-- ============================================================
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code) VALUES
  -- Personnel & Welfare
  ('OPEX-105', 'Food Expense',                   'Expense', 'Personnel & Welfare', '5900'),
  ('OPEX-106', 'Events Food & Beverages',       'Expense', 'Personnel & Welfare', '5900'),
  ('OPEX-107', 'Medical Expense',                'Expense', 'Personnel & Welfare', '5900'),
  ('OPEX-108', 'Dental Expense',                 'Expense', 'Personnel & Welfare', '5900'),
  ('OPEX-109', 'Divine Worship Expense',         'Expense', 'Personnel & Welfare', '5900'),
  ('OPEX-110', 'Evangelism Expense',             'Expense', 'Personnel & Welfare', '5900'),
  -- Logistics & Fleet
  ('OPEX-201', 'Fuel, Oil & Lubricants',         'Expense', 'Logistics & Fleet', '5900'),
  ('OPEX-202', 'Delivery Expenses',              'Expense', 'Logistics & Fleet', '5900'),
  ('OPEX-203', 'Repairs & Maintenance - Vehicle', 'Expense', 'Logistics & Fleet', '5900'),
  ('OPEX-204', 'Travel & Transportation Exp.',   'Expense', 'Logistics & Fleet', '5900'),
  ('OPEX-205', 'Postal & Courier Exp.',          'Expense', 'Logistics & Fleet', '5900'),
  -- Occupancy & Facilities
  ('OPEX-303', 'Repairs & Maintenance - Building','Expense','Occupancy & Facilities', '5900'),
  ('OPEX-304', 'Cleaning Materials',             'Expense', 'Occupancy & Facilities', '5900'),
  ('OPEX-306', 'FTMW Supplies',                   'Expense', 'Occupancy & Facilities', '5900'),
  -- Administrative & General
  ('OPEX-401', 'Office Supplies',                'Expense', 'Administrative & General', '5900'),
  ('OPEX-402', 'Printing Exp.',                   'Expense', 'Administrative & General', '5900'),
  ('OPEX-404', 'Bank Fees & Charges',             'Expense', 'Administrative & General', '5900'),
  ('OPEX-405', 'Document Processing Exp.',        'Expense', 'Administrative & General', '5900'),
  ('OPEX-406', 'Fines & Penalties',               'Expense', 'Administrative & General', '5900'),
  ('OPEX-409', 'Financial Assistance',            'Expense', 'Administrative & General', '5900'),
  ('OPEX-410', 'Miscellaneous Exp.',              'Expense', 'Administrative & General', '5900'),
  -- Marketing & Taxes
  ('OPEX-504', 'Non-Cash Exp.',                   'Expense', 'Marketing & Taxes', '5900'),
  ('OPEX-505', 'Exp. from Sales',                 'Expense', 'Marketing & Taxes', '5900');

-- ============================================================
-- F. RECLASSIFIED Accounts — NOT Expense (Asset / Liability / Inventory)
--    These keep their OPEX-xxx code for traceability but have
--    different account_type and parent_account_code.
-- ============================================================

-- OPEX-104 → Asset: Employee Receivables (child of 1170)
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code) VALUES
  ('OPEX-104', 'Advances to Employees',           'Asset', 'Current Asset', '1170');

-- OPEX-305 → Asset: Furniture & Fixtures (child of 1501)
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code) VALUES
  ('OPEX-305', 'Furniture & Fixtures',            'Asset', 'Fixed Asset', '1501');

-- OPEX-407 → Asset: Office Equipment (child of 1502)
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code) VALUES
  ('OPEX-407', 'Office Equipment',                'Asset', 'Fixed Asset', '1502');

-- OPEX-408 → Inventory: Purchases (child of 1200 Inventory - Raw Materials)
-- In a manufacturing/trading context, "Purchases" feeds inventory, not OpEx
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code) VALUES
  ('OPEX-408', 'Purchases',                       'Asset', 'Current Asset', '1200');

-- OPEX-503 → Liability: Withholding Tax (child of 2110 EWT Payable)
-- Withholding tax is a liability payable to BIR, not an expense
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code) VALUES
  ('OPEX-503', 'Withholding Tax Exp.',             'Liability', 'Current Liability', '2110');

-- ── Verify: Total OPEX accounts should be 31, with 26 as Expense children and 5 reclassified ──
-- SELECT
--   COUNT(*) as total_opex,
--   SUM(CASE WHEN account_type = 'Expense' THEN 1 ELSE 0 END) as expense_children,
--   SUM(CASE WHEN account_type != 'Expense' THEN 1 ELSE 0 END) as reclassified
-- FROM chart_of_accounts WHERE account_code LIKE 'OPEX-%';
-- Expected: total_opex=31, expense_children=26, reclassified=5
