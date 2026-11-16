# z-books-systems — BIR Tax Compliance Upgrade (v2)

## Overview

This upgrade adds full Philippine BIR tax compliance to the Jang-Jang Bakeshop ERP (z-books-systems ARAP module), including:

- **VAT splitting** — 12% Output VAT on sales, 12% Input VAT on purchases
- **Withholding Tax** — 1% CWT (Creditable Withholding Tax) deducted by Top Withholding Agents, 1%/2% EWT (Expanded Withholding Tax) on supplier payments
- **Integer centavos** — All monetary values stored and transmitted as integer centavos to eliminate floating-point rounding errors
- **VAT-Exempt vs VATable** — Separate revenue accounts for VATable (4010) and VAT-Exempt (4020) sales
- **Non-VAT supplier support** — Farmers and wet-market suppliers with no Input VAT or EWT
- **BIR 2307 cross-reference** — `bir_2307_ref` and `official_si_number` columns for manual invoice cross-referencing

## Entity Profile

- **Business:** Jang-Jang Bakeshop
- **TIN:** 434-271-509-00000
- **Tax Classification:** VAT-Registered
- **Top Withholding Agent Customers:** Gaisano Grand, Rose Pharmacy, Bupharco (1% CWT on goods)

---

## Deployment Steps

### Step 1: Run ARAP D1 Migrations + Seeds

```bash
# 1a. Tax compliance migration (adds VAT/EWT/CWT centavos columns)
npx wrangler d1 execute jjb-arap-db --remote --file=migration-v2-tax-compliance.sql

# 1b. COA hierarchy migration (adds parent_account_code column)
npx wrangler d1 execute jjb-arap-db --remote --file=migration-v3-coa-hierarchy.sql

# 1c. Change trail migration (adds change_trail table)
npx wrangler d1 execute jjb-arap-db --remote --file=migration-v4-change-trail.sql

# 1d. Master COA migration (adds description, tax_treatment_notes, account_level columns)
npx wrangler d1 execute jjb-arap-db --remote --file=migration-v5-coa-master.sql

# 1e. Entities table migration (customer/supplier lookup for ARAP)
npx wrangler d1 execute jjb-arap-db --remote --file=migration-v6-entities.sql

# 1f. Seed 6 new tax accounts
npx wrangler d1 execute jjb-arap-db --remote --file=seed-v2-tax-accounts.sql

# 1g. Seed Master COA — 77 accounts (35 parents + 42 children) with full descriptions
npx wrangler d1 execute jjb-arap-db --remote --file=seed-v3-master-coa.sql

# 1h. Seed 59 customer entities (for ARAP lookup dropdowns)
npx wrangler d1 execute jjb-arap-db --remote --file=seed-v4-entities.sql
```

### Step 2: Run CRM D1 Migrations + Seeds

```bash
# From the jjb-crm-app project directory:
npx wrangler d1 execute jjb-crm-db --remote --file=patch-migration-v2-tax.sql
npx wrangler d1 execute jjb-crm-db --remote --file=patch-migration-v3-change-trail.sql
npx wrangler d1 execute jjb-crm-db --remote --file=seed-v2-customers.sql
```

### Step 3: Run WMS D1 Migrations + Seeds

```bash
# From the jjb-wms-sync project directory:
npx wrangler d1 execute jjb-wms-db --remote --file=migration-v2-tax.sql
npx wrangler d1 execute jjb-wms-db --remote --file=migration-v3-change-trail.sql
npx wrangler d1 execute jjb-wms-db --remote --file=seed-v2-products.sql
```

### Step 4: Deploy Updated Code

Deploy each Pages project with its updated functions:

```bash
# z-books-systems (ARAP) — push to GitHub main branch (auto-deploys via Pages)
# jjb-crm-app (CRM) — push to GitHub main branch
# jjb-wms-app (WMS) — copy updated files and push
```

---

## Master Chart of Accounts — 77 Accounts (35 Parents + 42 Children)

The COA is organized into 5 sections with parent-child hierarchy. Each account includes a Description (transaction routing instructions) and Tax & Accounting Treatment Notes. The full structure is seeded via `seed-v3-master-coa.sql`.

### Summary by Section
| Section   | Parents | Children | Total |
|-----------|--------|----------|-------|
| Asset     | 12     | 7        | 19    |
| Liability | 5      | 0        | 5     |
| Equity    | 2      | 3        | 5     |
| Revenue   | 4      | 1        | 5     |
| Expense   | 12     | 31       | 43    |
| **Total** | **35** | **42**   | **77** |

### Key New Accounts (not in previous versions)
| Code  | Account Name                              | Type      | Level  | Parent |
|-------|-------------------------------------------|-----------|--------|--------|
| 1101  | Advances to Employees (Receivable)        | Asset     | Child  | 1100   |
| 1102  | Staff / Affiliate Assistance Receivable   | Asset     | Child  | 1100   |
| 1170  | Supplies Inventory (Office / Janitorial)  | Asset     | Parent | —      |
| 1180  | Allowance for Doubtful Accounts           | Asset     | Parent | —      |
| 1201  | Raw Material Purchases & Inputs            | Asset     | Child  | 1200   |
| 1211  | Trading & Finished Merchandise Purchases   | Asset     | Child  | 1210   |
| 1502  | Tools & Machinery                         | Asset     | Child  | 1500   |
| 1503  | Office Equipment                          | Asset     | Child  | 1500   |
| 1510  | Accumulated Depreciation                   | Asset     | Parent | —      |
| 2200  | Withholding Tax Payable - Compensation     | Liability | Parent | —      |
| 2300  | Salaries Payable                          | Liability | Parent | —      |
| 3001  | Owner Personal Devotions & Worship         | Equity    | Child  | 3000   |
| 3002  | Owner Personal Outreach & Evangelism       | Equity    | Child  | 3000   |
| 3003  | Owner Personal Drawings & Assistance      | Equity    | Child  | 3000   |
| 4001  | Sales Discounts, Returns & Allowances      | Revenue   | Child  | 4000   |
| 5101  | Workshop & Production Consumables         | Expense   | Child  | 5100   |
| 5301  | Electricity, Water & Utilities             | Expense   | Child  | 5300   |
| 5302  | Telecommunication & Internet              | Expense   | Child  | 5300   |
| 5401  | Rent - Office / Depot / Warehouse         | Expense   | Child  | 5400   |
| 5501  | Advertising & Promotions                   | Expense   | Child  | 5500   |
| 5502  | Samples, Gifts & Giveaways                | Expense   | Child  | 5500   |
| 5503  | Events Meals & Refreshments (Marketing)    | Expense   | Child  | 5500   |
| 5601-5607 | Salaries children (7 accounts)        | Expense   | Child  | 5600   |
| 5700  | Transportation & Distribution Expense      | Expense   | Parent | —      |
| 5701-5703 | Transport children (3 accounts)        | Expense   | Child  | 5700   |
| 5800  | Depreciation & Amortization Expense        | Expense   | Parent | —      |
| 5801  | Depreciation Expense                       | Expense   | Child  | 5800   |
| 5810  | Repairs & Maintenance Expense              | Expense   | Parent | —      |
| 5820  | Taxes, Licenses & Dues (Local)             | Expense   | Parent | —      |
| 5901-5911 | Other Expenses children (11 accounts) | Expense   | Child  | 5900   |
| 5990  | Religious & Worship Expense (Employee Welfare) | Expense | Child | 5900 |
| 5991  | Evangelism & Community Outreach (CSR)      | Expense   | Child  | 5900   |

---

## Automated GL Journal Entries

### AR Invoice Created (VAT-registered sale)

Example: ₱11,200 VAT-inclusive sale to Rose Pharmacy (₱10,000 VATable + ₱1,200 VAT)

| Account | Debit | Credit |
|---------|-------|--------|
| 1100 Accounts Receivable | ₱11,200 | |
| 4010 Sales Revenue — VATable | | ₱10,000 |
| 2100 Output VAT Payable (12%) | | ₱1,200 |

### AR Payment Collected (with 1% CWT from Top Withholding Agent)

Example: Rose Pharmacy pays ₱11,100 net of ₱100 CWT (1% of ₱10,000 VATable base)

| Account | Debit | Credit |
|---------|-------|--------|
| 1010 Cash in Bank | ₱11,100 | |
| 1150 Creditable Withholding Tax (2307) | ₱100 | |
| 1100 Accounts Receivable | | ₱11,200 |

### AP Invoice Created — VAT Supplier

Example: ₱5,600 flour purchase (₱5,000 net + ₱600 Input VAT), 1% EWT = ₱50

| Account | Debit | Credit |
|---------|-------|--------|
| 5000 Cost of Goods Sold | ₱5,000 | |
| 1160 Input VAT | ₱600 | |
| 2000 Accounts Payable | | ₱5,550 |
| 2110 EWT Payable (1601-EQ) | | ₱50 |

### AP Invoice Created — Non-VAT Supplier

Example: ₱3,000 raw eggs from Non-VAT farmer

| Account | Debit | Credit |
|---------|-------|--------|
| 5000 Cost of Goods Sold | ₱3,000 | |
| 2000 Accounts Payable | | ₱3,000 |

---

## Currency Convention

**All monetary values are stored and transmitted as integer centavos (₱1.00 = 100).**

- **Database:** All `*_centavos` columns are `INTEGER DEFAULT 0`
- **API:** All request/response bodies use centavos (integer)
- **React UI:** Divides by 100 for display, multiplies by 100 for input
- **Legacy REAL columns** (`amount`, `balance`, `debit`, `credit`) are still written to (pesos) for backward compatibility, but new code reads from centavos columns

---

## BIR Compliance Notes

### Computerized Accounting System (CAS) Registration

Until z-books-systems goes through formal BIR CAS registration via ORUS:
- Treat AR/AP invoices in z-books-systems as **internal billing/ledger records**
- Continue issuing **BIR-registered manual Sales Invoices** (stamped with ATP and VAT Reg. TIN: 434-271-509-00000)
- Store the manual Sales Invoice serial number in the `official_si_number` column on `ar_invoices`
- This cross-references cleanly for quarterly BIR Form 2550Q Summary List of Sales (SLS)

### BIR Forms Supported by This Schema

| BIR Form | Purpose | Data Source |
|----------|---------|-------------|
| 2550Q | Quarterly VAT Return | `output_vat_centavos` (AR) vs `input_vat_centavos` (AP) |
| 1601-EQ | Quarterly EWT Return | `ewt_withheld_centavos` + `ewt_atc_code` (AP) |
| 2307 | Certificate of Creditable Tax Withheld | `cwt_withheld_centavos` + `bir_2307_ref` (AR) |
| SLS | Summary List of Sales | `ar_invoices` with `vatable_sales_centavos` + `official_si_number` |

### EWT ATC Codes

| Code  | Rate | Description |
|-------|------|-------------|
| WC158 | 1%   | Goods (flour, packaging, raw materials) |
| WC160 | 2%   | Services (pest control, maintenance, repairs) |

---

## Files Modified

### z-books-systems (ARAP)
| File | Change |
|------|--------|
| `migration-v2-tax-compliance.sql` | NEW — D1 migration adding tax columns |
| `migration-v3-coa-hierarchy.sql` | NEW — D1 migration adding `parent_account_code` + 3 new asset accounts |
| `seed-v2-tax-accounts.sql` | NEW — 6 new COA tax accounts |
| `seed-v2-opex-accounts.sql` | NEW — 31 OPEX accounts as children (26 Expense + 5 reclassified) |
| `functions/api/_tax.js` | NEW — Shared tax computation helper |
| `functions/api/sync.js` | VAT/EWT GL entries on CRM/WMS sync |
| `functions/api/invoices.js` | VAT split + CWT on AR invoices/payments |
| `functions/api/payables.js` | VAT/EWT split on AP invoices |
| `functions/api/dashboard.js` | Centavos + BIR tax KPIs |
| `functions/api/journal.js` | Centavos columns |
| `functions/api/accounts.js` | Parent-child hierarchy support |
| `src/components/Invoices.jsx` | VAT breakdown form + CWT payment |
| `src/components/Payables.jsx` | VAT/EWT breakdown form |
| `src/components/Dashboard.jsx` | Centavos + BIR tax position cards |
| `src/components/Journal.jsx` | Centavos display |
| `src/components/ChartOfAccounts.jsx` | Parent-child hierarchy display |

### jjb-crm-app (CRM)
| File | Change |
|------|--------|
| `patch-migration-v2-tax.sql` | NEW — `tin`, `is_top_withholding_agent` on accounts; `is_vat_exempt` on product cache |
| `functions/api/deals.js` | Pass TIN + TWA flag to ARAP sync |
| `functions/api/sync.js` | Store `is_vat_exempt` in product cache |

### jjb-wms-sync (WMS)
| File | Change |
|------|--------|
| `migration-v2-tax.sql` | NEW — `is_vat_exempt` on materials; `tin` + `is_vat_registered` on suppliers |
| `functions/api/receiving-sync.js` | Pass supplier TIN, VAT status, EWT ATC to ARAP |
| `functions/api/sync/[[catchall]].js` | Include `is_vat_exempt` in product sync response |
