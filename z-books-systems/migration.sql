-- ──────────────────────────────────────────────────────────
-- JJB ARAP Database Schema (jjb-arap-db)
-- Jang-Jang Bakeshop ERP — Accounting / ARAP Module
-- Run: npx wrangler d1 execute jjb-arap-db --remote --file=migration.sql
-- ──────────────────────────────────────────────────────────

-- 1. Shared SSO Roles (ARAP-specific permissions)
CREATE TABLE IF NOT EXISTS roles (
    role_key TEXT PRIMARY KEY,
    role_name TEXT NOT NULL,
    can_access_arap INTEGER DEFAULT 1,
    can_post_entries INTEGER DEFAULT 0,
    can_approve_payments INTEGER DEFAULT 0,
    can_delete_data INTEGER DEFAULT 0
);

-- 2. Shared SSO Users (same JWT_SECRET as CRM + WMS)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    role_category TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    is_test_data INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 3. Chart of Accounts (GL master)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    account_code TEXT PRIMARY KEY,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,          -- Asset, Liability, Equity, Revenue, Expense
    sub_type TEXT,                       -- Current Asset, Fixed Asset, Current Liability, etc.
    is_active INTEGER DEFAULT 1,
    is_test_data INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 4. Journal Entries (GL header)
CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    entry_date TEXT NOT NULL,
    description TEXT,
    reference TEXT,                       -- e.g., "AR-INV-0001", "AP-INV-0001", "PAY-0001"
    source_module TEXT,                  -- AR, AP, Manual
    status TEXT DEFAULT 'Draft',         -- Draft, Posted
    is_test_data INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 5. Journal Lines (GL detail — double-entry)
CREATE TABLE IF NOT EXISTS journal_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_code TEXT NOT NULL REFERENCES chart_of_accounts(account_code),
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 6. AR Invoices (Accounts Receivable — from CRM deals)
CREATE TABLE IF NOT EXISTS ar_invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id TEXT,                     -- links to CRM crm_accounts.id
    customer_name TEXT NOT NULL,
    crm_deal_id TEXT,                     -- source CRM deal
    wms_order_id TEXT,                    -- linked WMS order (for delivery tracking)
    invoice_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    amount REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    balance REAL NOT NULL,
    status TEXT DEFAULT 'Open',           -- Open, Partial, Paid, Overdue, Void
    journal_entry_id TEXT REFERENCES journal_entries(id),
    is_test_data INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 7. AR Payments (Customer payments against AR invoices)
CREATE TABLE IF NOT EXISTS ar_payments (
    id TEXT PRIMARY KEY,
    ar_invoice_id TEXT NOT NULL REFERENCES ar_invoices(id),
    payment_date TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT,                  -- Cash, Bank Transfer, Check, GCash
    reference TEXT,                       -- check no., transaction ID
    journal_entry_id TEXT REFERENCES journal_entries(id),
    is_test_data INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 8. AP Invoices (Accounts Payable — from WMS POs / supplier invoices)
CREATE TABLE IF NOT EXISTS ap_invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    supplier_id TEXT,                     -- links to WMS suppliers
    supplier_name TEXT NOT NULL,
    wms_receiving_id TEXT,               -- source WMS receiving report
    invoice_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    amount REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    balance REAL NOT NULL,
    status TEXT DEFAULT 'Open',           -- Open, Partial, Paid, Overdue, Void
    journal_entry_id TEXT REFERENCES journal_entries(id),
    is_test_data INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 9. AP Payments (Supplier payments against AP invoices)
CREATE TABLE IF NOT EXISTS ap_payments (
    id TEXT PRIMARY KEY,
    ap_invoice_id TEXT NOT NULL REFERENCES ap_invoices(id),
    payment_date TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT,                  -- Cash, Bank Transfer, Check
    reference TEXT,
    journal_entry_id TEXT REFERENCES journal_entries(id),
    is_test_data INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 10. Sync Events (Idempotency — for CRM deal → AR, WMS PO → AP sync)
CREATE TABLE IF NOT EXISTS sync_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idempotency_key TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,             -- CRM_DEAL_TO_AR, WMS_PO_TO_AP, WMS_DELIVERY_UPDATE
    payload TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 11. Audit Log (for compliance + audit trail)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    actor TEXT NOT NULL,
    role TEXT,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    details TEXT,
    is_test_data INTEGER DEFAULT 0
);

-- 12. Indexes
CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_source ON journal_entries(source_module);
CREATE INDEX IF NOT EXISTS idx_jl_entry ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_jl_account ON journal_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_ar_customer ON ar_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_status ON ar_invoices(status);
CREATE INDEX IF NOT EXISTS idx_ar_due ON ar_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_arpay_invoice ON ar_payments(ar_invoice_id);
CREATE INDEX IF NOT EXISTS idx_ap_supplier ON ap_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ap_status ON ap_invoices(status);
CREATE INDEX IF NOT EXISTS idx_ap_due ON ap_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_appay_invoice ON ap_payments(ap_invoice_id);
CREATE INDEX IF NOT EXISTS idx_sync_key ON sync_events(idempotency_key);
