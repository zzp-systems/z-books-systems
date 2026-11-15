-- ──────────────────────────────────────────────────────────
-- JJB ARAP — Tax Compliance Migration v2 (BIR VAT / EWT / CWT)
-- Jang-Jang Bakeshop ERP — Accounting / ARAP Module
-- VAT-Registered TIN: 434-271-509-00000
--
-- Run AFTER your existing migration.sql:
--   npx wrangler d1 execute jjb-arap-db --remote --file=migration-v2-tax-compliance.sql
--
-- Then run the new seed:
--   npx wrangler d1 execute jjb-arap-db --remote --file=seed-v2-tax-accounts.sql
-- ──────────────────────────────────────────────────────────

-- ============================================================
-- A. Chart of Accounts — New Philippine Tax Accounts
--    (seed-v2-tax-accounts.sql inserts the actual rows)
--    No schema change needed — chart_of_accounts already exists.
-- ============================================================

-- ============================================================
-- B. journal_lines — Add centavos columns for integer precision
-- ============================================================
ALTER TABLE journal_lines ADD COLUMN debit_centavos INTEGER DEFAULT 0;
ALTER TABLE journal_lines ADD COLUMN credit_centavos INTEGER DEFAULT 0;

-- ============================================================
-- C. ar_invoices — BIR EOPT invoice breakdown (all centavos)
-- ============================================================
ALTER TABLE ar_invoices ADD COLUMN vatable_sales_centavos INTEGER DEFAULT 0;
ALTER TABLE ar_invoices ADD COLUMN vat_exempt_sales_centavos INTEGER DEFAULT 0;
ALTER TABLE ar_invoices ADD COLUMN zero_rated_sales_centavos INTEGER DEFAULT 0;
ALTER TABLE ar_invoices ADD COLUMN output_vat_centavos INTEGER DEFAULT 0;
ALTER TABLE ar_invoices ADD COLUMN cwt_withheld_centavos INTEGER DEFAULT 0;
ALTER TABLE ar_invoices ADD COLUMN bir_2307_ref TEXT;
ALTER TABLE ar_invoices ADD COLUMN official_si_number TEXT;
ALTER TABLE ar_invoices ADD COLUMN customer_tin TEXT;
ALTER TABLE ar_invoices ADD COLUMN is_top_withholding_agent INTEGER DEFAULT 0;
ALTER TABLE ar_invoices ADD COLUMN amount_centavos INTEGER DEFAULT 0;
ALTER TABLE ar_invoices ADD COLUMN amount_paid_centavos INTEGER DEFAULT 0;
ALTER TABLE ar_invoices ADD COLUMN balance_centavos INTEGER DEFAULT 0;

-- ============================================================
-- D. ar_payments — CWT tracking on collection
-- ============================================================
ALTER TABLE ar_payments ADD COLUMN amount_centavos INTEGER DEFAULT 0;
ALTER TABLE ar_payments ADD COLUMN cwt_withheld_centavos INTEGER DEFAULT 0;
ALTER TABLE ar_payments ADD COLUMN bir_2307_ref TEXT;

-- ============================================================
-- E. ap_invoices — VAT / Non-VAT supplier distinction
-- ============================================================
ALTER TABLE ap_invoices ADD COLUMN supplier_tin TEXT;
ALTER TABLE ap_invoices ADD COLUMN is_vat_supplier INTEGER DEFAULT 1;
ALTER TABLE ap_invoices ADD COLUMN vatable_purchase_centavos INTEGER DEFAULT 0;
ALTER TABLE ap_invoices ADD COLUMN non_vat_purchase_centavos INTEGER DEFAULT 0;
ALTER TABLE ap_invoices ADD COLUMN input_vat_centavos INTEGER DEFAULT 0;
ALTER TABLE ap_invoices ADD COLUMN ewt_atc_code TEXT;
ALTER TABLE ap_invoices ADD COLUMN ewt_withheld_centavos INTEGER DEFAULT 0;
ALTER TABLE ap_invoices ADD COLUMN amount_centavos INTEGER DEFAULT 0;
ALTER TABLE ap_invoices ADD COLUMN amount_paid_centavos INTEGER DEFAULT 0;
ALTER TABLE ap_invoices ADD COLUMN balance_centavos INTEGER DEFAULT 0;

-- ============================================================
-- F. ap_payments — EWT tracking on disbursement
-- ============================================================
ALTER TABLE ap_payments ADD COLUMN amount_centavos INTEGER DEFAULT 0;
ALTER TABLE ap_payments ADD COLUMN ewt_withheld_centavos INTEGER DEFAULT 0;

-- ============================================================
-- G. Indexes for tax reporting queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ar_vatable ON ar_invoices(vatable_sales_centavos);
CREATE INDEX IF NOT EXISTS idx_ar_cwt ON ar_invoices(cwt_withheld_centavos);
CREATE INDEX IF NOT EXISTS idx_ar_official_si ON ar_invoices(official_si_number);
CREATE INDEX IF NOT EXISTS idx_ap_vat_supplier ON ap_invoices(is_vat_supplier);
CREATE INDEX IF NOT EXISTS idx_ap_ewt ON ap_invoices(ewt_withheld_centavos);
CREATE INDEX IF NOT EXISTS idx_jl_debit_cents ON journal_lines(debit_centavos);
CREATE INDEX IF NOT EXISTS idx_jl_credit_cents ON journal_lines(credit_centavos);
