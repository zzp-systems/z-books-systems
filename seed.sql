-- ──────────────────────────────────────────────────────────
-- JJB ARAP Seed Data
-- Run: npx wrangler d1 execute jjb-arap-db --remote --file=seed.sql
-- ──────────────────────────────────────────────────────────

-- ── Roles ──
INSERT OR IGNORE INTO roles (role_key, role_name, can_access_arap, can_post_entries, can_approve_payments, can_delete_data) VALUES
  ('admin',      'Administrator',     1, 1, 1, 1),
  ('accountant', 'Accountant',        1, 1, 1, 0),
  ('cashier',    'Cashier',           1, 0, 0, 0),
  ('viewer',     'Viewer (Read-Only)', 1, 0, 0, 0);

-- ── Admin User (PLACEHOLDER — generate real hash with scripts/generate-password-hash.mjs) ──
INSERT OR IGNORE INTO users (id, username, name, email, role_category, password_hash, is_active)
VALUES (
  'admin-0001', 'admin', 'System Administrator',
  'admin@jangjang-bakeshop.com', 'admin',
  'PLACEHOLDER_RUN_GENERATE_SCRIPT', 1
);

-- ── Default Chart of Accounts (Bakery) ──
INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, sub_type) VALUES
  -- Assets
  ('1000', 'Cash on Hand',              'Asset',     'Current Asset'),
  ('1010', 'Cash in Bank',               'Asset',     'Current Asset'),
  ('1020', 'Cash - GCash',               'Asset',     'Current Asset'),
  ('1100', 'Accounts Receivable',        'Asset',     'Current Asset'),
  ('1200', 'Inventory - Raw Materials',  'Asset',     'Current Asset'),
  ('1210', 'Inventory - Finished Goods', 'Asset',     'Current Asset'),
  ('1500', 'Equipment',                   'Asset',     'Fixed Asset'),
  ('1510', 'Accumulated Depreciation',    'Asset',     'Fixed Asset'),
  -- Liabilities
  ('2000', 'Accounts Payable',           'Liability', 'Current Liability'),
  ('2100', 'VAT Payable',                'Liability', 'Current Liability'),
  ('2200', 'Withholding Tax Payable',     'Liability', 'Current Liability'),
  ('2300', 'Salaries Payable',            'Liability', 'Current Liability'),
  -- Equity
  ('3000', "Owner's Capital",            'Equity',    'Equity'),
  ('3100', 'Retained Earnings',           'Equity',    'Equity'),
  -- Revenue
  ('4000', 'Sales Revenue',              'Revenue',   'Operating Revenue'),
  ('4100', 'Other Income',               'Revenue',   'Other Income'),
  -- Expenses
  ('5000', 'Cost of Goods Sold',         'Expense',   'COGS'),
  ('5100', 'Raw Materials Expense',      'Expense',   'Direct Cost'),
  ('5200', 'Direct Labor',               'Expense',   'Direct Cost'),
  ('5300', 'Utilities Expense',          'Expense',   'Operating Expense'),
  ('5400', 'Rent Expense',               'Expense',   'Operating Expense'),
  ('5500', 'Marketing Expense',           'Expense',   'Operating Expense'),
  ('5600', 'Salaries Expense',           'Expense',   'Operating Expense'),
  ('5900', 'Other Expenses',             'Expense',   'Operating Expense');
