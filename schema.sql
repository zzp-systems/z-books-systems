-- =====================================================================
-- Z-BOOKS DATABASE SCHEMA (Cloudflare D1 SQLite / Distributed Relational)
-- Entity: Small-Medium Food Manufacturing & Multi-Outlet Retail Operations
-- Standard: Philippine Financial Reporting Standards (PFRS for SMEs) / BIR Compliance
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- 1. CHART OF ACCOUNTS (Aligned with Philippine RCA & SME Standards)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    account_code TEXT PRIMARY KEY,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'OPEX')),
    normal_balance TEXT NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    category TEXT NOT NULL, -- e.g., 'Current Assets', 'Manufacturing Direct Cost', 'Taxes Payable'
    is_active INTEGER NOT NULL DEFAULT 1,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_coa_active ON chart_of_accounts(is_active);

-- ---------------------------------------------------------------------
-- 2. COST CENTERS & STATIONS (Plant & Multi-Outlet Bakeshop Operations)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cost_centers (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    manager TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------------
-- 3. DOUBLE-ENTRY GENERAL JOURNAL HEADERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    entry_number TEXT UNIQUE NOT NULL, -- Format: JE-YYYYMM-XXXX
    entry_date TEXT NOT NULL,          -- ISO8601: YYYY-MM-DD
    reference_doc TEXT,                -- PO, Invoice #, Official Receipt #, Check #
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'POSTED', 'VOID')) DEFAULT 'DRAFT',
    cost_center_code TEXT REFERENCES cost_centers(code),
    payee_vendor TEXT,
    total_amount REAL NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    is_reversing INTEGER NOT NULL DEFAULT 0,
    reversed_entry_id TEXT REFERENCES journal_entries(id),
    created_by TEXT NOT NULL DEFAULT 'System Admin / CPA',
    posted_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_je_number ON journal_entries(entry_number);

-- ---------------------------------------------------------------------
-- 4. DOUBLE-ENTRY JOURNAL LINES (Atomic Debits & Credits)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_code TEXT NOT NULL REFERENCES chart_of_accounts(account_code),
    debit_amount REAL NOT NULL DEFAULT 0.00 CHECK (debit_amount >= 0),
    credit_amount REAL NOT NULL DEFAULT 0.00 CHECK (credit_amount >= 0),
    memo TEXT,
    line_order INTEGER NOT NULL DEFAULT 0,
    CHECK (debit_amount > 0 OR credit_amount > 0),
    CHECK (NOT (debit_amount > 0 AND credit_amount > 0))
);

CREATE INDEX IF NOT EXISTS idx_jel_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_code);

-- ---------------------------------------------------------------------
-- 5. EMPLOYEES (Plant Workers, Bakers, Drivers, Staff)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    employee_id_number TEXT UNIQUE NOT NULL, -- e.g., JJB-2024-001
    full_name TEXT NOT NULL,
    station_role TEXT NOT NULL,              -- Baker, Slicer, Wrapper, QA, Admin, Driver
    cost_center_code TEXT REFERENCES cost_centers(code),
    employment_status TEXT NOT NULL CHECK (employment_status IN ('REGULAR', 'PROBATIONARY', 'CONTRACTUAL')),
    daily_rate REAL NOT NULL CHECK (daily_rate > 0),
    monthly_basic_rate REAL NOT NULL CHECK (monthly_basic_rate > 0),
    tin TEXT,                                -- Format: 000-000-000-0000
    sss_number TEXT,
    philhealth_number TEXT,
    pagibig_number TEXT,
    bank_account_number TEXT,
    hire_date TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_emp_id_num ON employees(employee_id_number);
CREATE INDEX IF NOT EXISTS idx_emp_role ON employees(station_role);

-- ---------------------------------------------------------------------
-- 6. PAYROLL RUNS (Semi-Monthly Periods)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_runs (
    id TEXT PRIMARY KEY,
    run_number TEXT UNIQUE NOT NULL,       -- Format: PR-YYYYMM-XX
    period_start TEXT NOT NULL,            -- YYYY-MM-DD
    period_end TEXT NOT NULL,              -- YYYY-MM-DD
    payout_date TEXT NOT NULL,             -- YYYY-MM-DD
    cycle TEXT NOT NULL CHECK (cycle IN ('FIRST_HALF', 'SECOND_HALF', 'MONTHLY')),
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'COMPUTED', 'DISBURSED', 'CANCELLED')) DEFAULT 'DRAFT',
    total_gross REAL NOT NULL DEFAULT 0.00,
    total_ee_deductions REAL NOT NULL DEFAULT 0.00,
    total_er_contributions REAL NOT NULL DEFAULT 0.00,
    total_net REAL NOT NULL DEFAULT 0.00,
    journal_entry_id TEXT REFERENCES journal_entries(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pr_dates ON payroll_runs(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_pr_status ON payroll_runs(status);

-- ---------------------------------------------------------------------
-- 7. PAYROLL ITEMS (Individual Employee Payslip Calculations)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_items (
    id TEXT PRIMARY KEY,
    payroll_run_id TEXT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    
    -- Timekeeping metrics
    days_worked REAL NOT NULL DEFAULT 13.0,
    ot_hours REAL NOT NULL DEFAULT 0.0,
    tardy_minutes REAL NOT NULL DEFAULT 0.0,
    undertime_minutes REAL NOT NULL DEFAULT 0.0,
    awol_days REAL NOT NULL DEFAULT 0.0,
    
    -- Earnings
    basic_pay REAL NOT NULL DEFAULT 0.00,
    overtime_pay REAL NOT NULL DEFAULT 0.00,
    perfect_attendance_bonus REAL NOT NULL DEFAULT 0.00,
    gross_pay REAL NOT NULL DEFAULT 0.00,
    
    -- Attendance Deductions
    tardiness_deduction REAL NOT NULL DEFAULT 0.00,
    undertime_deduction REAL NOT NULL DEFAULT 0.00,
    awol_deduction REAL NOT NULL DEFAULT 0.00,
    
    -- Statutory Deductions (Employee Share)
    sss_ee REAL NOT NULL DEFAULT 0.00,
    sss_mpf_ee REAL NOT NULL DEFAULT 0.00,
    philhealth_ee REAL NOT NULL DEFAULT 0.00,
    pagibig_ee REAL NOT NULL DEFAULT 0.00,
    withholding_tax REAL NOT NULL DEFAULT 0.00,
    
    -- Statutory Contributions (Employer Share)
    sss_er REAL NOT NULL DEFAULT 0.00,
    sss_ec_er REAL NOT NULL DEFAULT 0.00,
    sss_mpf_er REAL NOT NULL DEFAULT 0.00,
    philhealth_er REAL NOT NULL DEFAULT 0.00,
    pagibig_er REAL NOT NULL DEFAULT 0.00,
    
    -- Totals
    total_deductions REAL NOT NULL DEFAULT 0.00,
    net_pay REAL NOT NULL DEFAULT 0.00
);

CREATE INDEX IF NOT EXISTS idx_pi_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_pi_emp ON payroll_items(employee_id);

-- ---------------------------------------------------------------------
-- 8. BIR TAX ARCHIVE & SUBMISSION LOGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tax_filings (
    id TEXT PRIMARY KEY,
    form_type TEXT NOT NULL CHECK (form_type IN ('2550Q', '1701Q', '1702Q', '1601-C', '1701')),
    tax_period TEXT NOT NULL, -- e.g., '2025-Q1', '2025-01'
    entity_tin TEXT NOT NULL,
    gross_amount REAL NOT NULL DEFAULT 0.00,
    exempt_amount REAL NOT NULL DEFAULT 0.00,
    taxable_amount REAL NOT NULL DEFAULT 0.00,
    tax_due REAL NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL CHECK (status IN ('PREVIEW', 'FINALIZED', 'FILED')) DEFAULT 'PREVIEW',
    filing_data_json TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- SEED DATA: OFFICIAL CHART OF ACCOUNTS (Philippine SME Manufacturing & Retail)
-- =====================================================================

INSERT OR IGNORE INTO cost_centers (code, name, location, manager) VALUES
('IND-PLANT', 'Indangan Production Plant', 'Indangan, Buhangin, Davao City', 'Master Baker R. Santos'),
('SAS-BRANCH', 'Sasa Retail Outlet & Oven', 'Sasa Wharf Road, Davao City', 'Store Lead M. Villanueva'),
('LOG-DELIV', 'Logistics & Van Delivery', 'Davao City Metro Route', 'Fleet Head C. Alcantara'),
('ADM-HQ', 'Executive & Administrative Office', 'Davao Corporate Office', 'General Manager J. Tan');

INSERT OR IGNORE INTO chart_of_accounts (account_code, account_name, account_type, normal_balance, category, description) VALUES
-- 10000 - ASSETS
('10101', 'Petty Cash Fund', 'ASSET', 'DEBIT', 'Cash & Cash Equivalents', 'Cash float held by plant cashiers and store supervisors'),
('10102', 'Cash in Bank - BDO Current Account', 'ASSET', 'DEBIT', 'Cash & Cash Equivalents', 'Main operational disbursement and vendor account'),
('10103', 'Cash in Bank - BPI Operating Account', 'ASSET', 'DEBIT', 'Cash & Cash Equivalents', 'Retail store collections and POS settling account'),
('10201', 'Accounts Receivable - Trade', 'ASSET', 'DEBIT', 'Receivables', 'Receivables from b2b wholesale bread distribution clients'),
('10202', 'Allowance for Impairment - Trade AR', 'ASSET', 'CREDIT', 'Receivables', 'Contra-asset provision for doubtful wholesale receivables'),
('10301', 'Direct Raw Materials Inventory', 'ASSET', 'DEBIT', 'Inventories', 'Flour sacks, refined sugar, yeast, shortening, margarine, dairy'),
('10302', 'Packaging Supplies Inventory', 'ASSET', 'DEBIT', 'Inventories', 'Bread plastic wrappers, paper bags, bakery boxes, labels'),
('10303', 'Work-in-Process Inventory (WIP)', 'ASSET', 'DEBIT', 'Inventories', 'Dough in proofing cabinets, partially baked trays'),
('10304', 'Finished Goods Inventory', 'ASSET', 'DEBIT', 'Inventories', 'Pan de sal, loaf bread, ensaymada, spanish bread ready for dispatch'),
('10401', 'Input VAT (12%)', 'ASSET', 'DEBIT', 'Prepayments & Tax Credits', 'Creditable VAT paid on local purchases of raw ingredients & capital goods'),
('10501', 'Bakery Machinery & Rotary Ovens', 'ASSET', 'DEBIT', 'Property, Plant & Equipment', 'Heavy rotary deck ovens, spiral dough mixers, bread slicers'),
('10502', 'Accumulated Depreciation - Machinery', 'ASSET', 'CREDIT', 'Property, Plant & Equipment', 'Accumulated depreciation on plant bakery machinery'),
('10503', 'Delivery Vans & Logistics Vehicles', 'ASSET', 'DEBIT', 'Property, Plant & Equipment', 'Delivery trucks and distribution vans for multi-branch supply'),
('10504', 'Accumulated Depreciation - Vehicles', 'ASSET', 'CREDIT', 'Property, Plant & Equipment', 'Accumulated depreciation on delivery fleet'),

-- 20000 - LIABILITIES
('20101', 'Accounts Payable - Flour & Ingredient Suppliers', 'LIABILITY', 'CREDIT', 'Payables', 'Trade obligations to milling companies and suppliers'),
('20102', 'Accrued Operating Expenses', 'LIABILITY', 'CREDIT', 'Payables', 'Accrued electricity (Davao Light), LPG fuel, and telephone charges'),
('20103', 'Accrued Payroll & Wage Clearing', 'LIABILITY', 'CREDIT', 'Payables', 'Net wages due to plant workers and employees'),
('20201', 'Output VAT (12%)', 'LIABILITY', 'CREDIT', 'Taxes Payable', '12% Value Added Tax collected on taxable bakery retail and wholesale sales'),
('20202', 'Withholding Tax Payable - Compensation (BIR Form 1601-C)', 'LIABILITY', 'CREDIT', 'Taxes Payable', 'TRAIN Law withholding tax withheld from employee salaries'),
('20203', 'Due to SSS (Employee & Employer Premiums)', 'LIABILITY', 'CREDIT', 'Statutory Payables', 'Mandatory SSS and WISP contributions payable to Social Security System'),
('20204', 'Due to PhilHealth (PHIC Premiums)', 'LIABILITY', 'CREDIT', 'Statutory Payables', '5% mandatory PhilHealth premium contribution payable'),
('20205', 'Due to Pag-IBIG (HDMF Premiums)', 'LIABILITY', 'CREDIT', 'Statutory Payables', 'Home Development Mutual Fund contributions payable'),

-- 30000 - OWNER EQUITY
('30101', 'Owner Capital - J. Tan', 'EQUITY', 'CREDIT', 'Owner Equity', 'Contributed initial and ongoing capital by proprietor'),
('30102', 'Owner Drawing - J. Tan', 'EQUITY', 'DEBIT', 'Owner Equity', 'Personal withdrawals by sole proprietor against profits'),
('30201', 'Retained Earnings / Accumulated Profit', 'EQUITY', 'CREDIT', 'Owner Equity', 'Cumulative undistributed net profit from operations'),

-- 40000 - REVENUE
('40101', 'Sales Revenue - Retail Bakery Outlets', 'REVENUE', 'CREDIT', 'Operating Revenue', 'Counter sales of bread, pastries, and cakes across branches'),
('40102', 'Sales Revenue - Wholesale & Institutional', 'REVENUE', 'CREDIT', 'Operating Revenue', 'Supply contracts to supermarkets, hotels, and canteens'),
('40103', 'Sales Discounts & Senior/PWD Deductions', 'REVENUE', 'DEBIT', 'Contra Revenue', 'Statutory 20% Senior Citizen / PWD discounts and promotional vouchers'),

-- 50000 - MANUFACTURING DIRECT COSTS & COGS
('50101', 'Direct Raw Materials Used', 'COGS', 'DEBIT', 'Direct Materials', 'Flour, yeast, eggs, butter, sugar, cocoa consumed in production batches'),
('50102', 'Direct Packaging Consumed', 'COGS', 'DEBIT', 'Direct Materials', 'Packaging film, printed bread bags consumed in finished goods'),
('50201', 'Direct Labor - Bakers & Dough Handlers', 'COGS', 'DEBIT', 'Direct Labor', 'Wages of head bakers, dough kneaders, oven masters at Indangan Plant'),
('50202', 'Direct Labor - Slicers & Packaging Crew', 'COGS', 'DEBIT', 'Direct Labor', 'Wages of bread slicing machine operators and packing personnel'),
('50301', 'Factory Overhead - LPG & Oven Fuel', 'COGS', 'DEBIT', 'Factory Overhead', 'Industrial LPG gas tanks consumed for rotary baking ovens'),
('50302', 'Factory Overhead - Plant Electric Power', 'COGS', 'DEBIT', 'Factory Overhead', 'Industrial electricity for heavy spiral mixers and walk-in chillers'),
('50303', 'Factory Overhead - Plant Sanitation & Water', 'COGS', 'DEBIT', 'Factory Overhead', 'Food safety sanitizers, wash water, pest control, hairnets/aprons'),
('50304', 'Factory Overhead - Machinery Maintenance', 'COGS', 'DEBIT', 'Factory Overhead', 'Lubricants, oven heating element replacements, bearing greasing'),
('50401', 'Cost of Goods Sold - Finished Bread', 'COGS', 'DEBIT', 'Cost of Sales', 'Recognized manufacturing cost of bread sold during the fiscal period'),

-- 60000 - OPERATING EXPENSES (OPEX - Administrative & Selling)
('60101', 'Salaries & Wages - Administrative Staff', 'OPEX', 'DEBIT', 'Administrative Expenses', 'Compensation of general manager, cashier, bookkeeper, QA officer'),
('60102', 'Employer Statutory Share - SSS (Admin & Plant)', 'OPEX', 'DEBIT', 'Employee Benefits', 'Employer 9.5% SSS + WISP + EC share contributions'),
('60103', 'Employer Statutory Share - PhilHealth', 'OPEX', 'DEBIT', 'Employee Benefits', 'Employer 2.5% PhilHealth premium share'),
('60104', 'Employer Statutory Share - Pag-IBIG', 'OPEX', 'DEBIT', 'Employee Benefits', 'Employer Pag-IBIG HDMF ₱200 monthly share'),
('60201', 'Store & Plant Rent Expense', 'OPEX', 'DEBIT', 'Occupancy Costs', 'Monthly lease rentals for retail outlets and plant premises'),
('60202', 'Delivery Fuel & Vehicle Lubricants', 'OPEX', 'DEBIT', 'Logistics Expenses', 'Diesel fuel for delivery vans distributing fresh bread daily'),
('60203', 'Store Utilities (Light & Water)', 'OPEX', 'DEBIT', 'Occupancy Costs', 'Retail bakeshop aircon, showcase chillers, and lights'),
('60301', 'Taxes, Permits & Licenses', 'OPEX', 'DEBIT', 'Tax Expenses', 'Mayor permit, sanitary permits, BIR annual registration fees'),
('60302', 'Depreciation Expense - Plant Machinery', 'OPEX', 'DEBIT', 'Depreciation', 'Straight-line periodic depreciation of ovens and equipment'),
('60303', 'Depreciation Expense - Delivery Vehicles', 'OPEX', 'DEBIT', 'Depreciation', 'Depreciation of delivery distribution vans'),
('60401', 'Office Supplies & Miscellaneous Admin', 'OPEX', 'DEBIT', 'Administrative Expenses', 'POS paper rolls, receipts, accounting stationeries');
