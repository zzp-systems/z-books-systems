# z-books-systems — Jang-Jang Bakeshop ARAP

Accounting / Accounts Receivable / Accounts Payable module for Jang-Jang Bakeshop's zero-cost ERP.
Built on Cloudflare Pages + Pages Functions + D1 + R2 (free tier).

## Architecture

```
z-books-systems/ (this repo)
├── React SPA frontend (Vite) → dist/
├── Pages Functions API → functions/api/
├── D1: jjb-arap-db (11 tables + GL)
└── R2: jjb-erp-assets (shared, /arap/ prefix)
```

**ERP Sync Flow:**
```
CRM Deal (won) ──POST /api/sync/crm-deal──→ AR Invoice + GL Entry (Debit AR, Credit Revenue)
WMS PO/Receiving ──POST /api/sync/wms-po──→ AP Invoice + GL Entry (Debit COGS, Credit AP)
WMS Delivery ──POST /api/sync/wms-delivery──→ AR Invoice status update
```

**Shared SSO**: Same `JWT_SECRET` as CRM + WMS — one login works across all 3 apps.

## Quick Start

```bash
# 1. Create the D1 database (I couldn't create this via API — run this yourself)
npx wrangler d1 create jjb-arap-db
# → Copy the database_id from the output into wrangler.toml

# 2. Install dependencies
npm install

# 3. Run the schema migration
npx wrangler d1 execute jjb-arap-db --remote --file=migration.sql

# 4. Seed chart of accounts + roles + admin user
npx wrangler d1 execute jjb-arap-db --remote --file=seed.sql

# 5. Update wrangler.toml with the real database_id from step 1

# 6. Set secrets (shared with CRM + WMS for SSO)
npx wrangler pages secret put JWT_SECRET
npx wrangler pages secret put SYNC_API_KEY
npx wrangler pages secret put CRM_API_URL     # https://jjb-crm-app.pages.dev
npx wrangler pages secret put WMS_API_URL     # https://jjb-wms-app.pages.dev

# 7. Generate admin password hash
node scripts/generate-password-hash.mjs yourpassword
# → Run the output UPDATE SQL against D1

# 8. Local dev
npm run dev

# 9. Deploy
npm run deploy
```

## Project Structure

```
z-books-systems/
├── index.html
├── package.json
├── vite.config.js
├── wrangler.toml                # D1 + R2 bindings
├── migration.sql                # 11 tables + 13 indexes
├── seed.sql                     # Chart of accounts + roles + admin
├── .gitignore
├── public/
│   └── _redirects               # SPA routing
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── api.js
│   ├── styles.css
│   └── components/
│       ├── Layout.jsx           # Sidebar nav
│       ├── Login.jsx            # Shared SSO login
│       ├── Dashboard.jsx        # AR/AP KPIs + aging
│       ├── Invoices.jsx         # AR invoices + payments
│       ├── Payables.jsx         # AP invoices + payments
│       ├── Journal.jsx          # GL journal entries
│       └── ChartOfAccounts.jsx  # GL account master
├── functions/
│   ├── _middleware.js           # CORS + JWT auth (sync routes bypassed)
│   └── api/
│       ├── _jwt.js              # HS256 JWT + PBKDF2 (shared with CRM/WMS)
│       ├── _audit.js            # Audit log helper
│       ├── auth.js              # POST /api/auth/login, GET /api/auth/me
│       ├── dashboard.js         # GET /api/dashboard
│       ├── invoices.js          # AR CRUD + payments + auto GL
│       ├── payables.js          # AP CRUD + payments + auto GL
│       ├── journal.js           # GL entries + post
│       ├── accounts.js          # Chart of accounts CRUD
│       ├── sync.js              # CRM→AR, WMS→AP sync (X-Sync-Key auth)
│       └── upload.js            # R2 file upload (arap/ prefix)
└── scripts/
    └── generate-password-hash.mjs
```

## Auto GL Entries

Every AR/AP transaction automatically creates a posted journal entry:

| Transaction | Debit | Credit |
|---|---|---|
| AR Invoice created | 1100 Accounts Receivable | 4000 Sales Revenue |
| AR Payment received | 1000/1010/1020 Cash | 1100 Accounts Receivable |
| AP Invoice created | 5000 Cost of Goods Sold | 2000 Accounts Payable |
| AP Payment made | 2000 Accounts Payable | 1000/1010 Cash |

## Sync API Contract

### CRM → ARAP (CRM calls ARAP)

| CRM Action | ARAP Endpoint | Payload |
|---|---|---|
| Won deal → AR invoice | `POST /api/sync/crm-deal` | `{ idempotency_key, deal: { account_name, account_id, amount, crm_deal_id, wms_order_id, invoice_date, due_date } }` |

### WMS → ARAP (WMS calls ARAP)

| WMS Action | ARAP Endpoint | Payload |
|---|---|---|
| PO/Receiving → AP invoice | `POST /api/sync/wms-po` | `{ idempotency_key, po: { supplier_name, supplier_id, wms_receiving_id, amount, invoice_date, due_date } }` |
| Delivery status → AR update | `POST /api/sync/wms-delivery` | `{ idempotency_key, wms_order_id, status, crm_deal_id }` |

All sync calls use `X-Sync-Key` header with shared `SYNC_API_KEY`.

## D1 Tables

| Table | Purpose |
|---|---|
| `roles` | ARAP roles (admin, accountant, cashier, viewer) |
| `users` | Shared SSO users (same JWT_SECRET) |
| `chart_of_accounts` | GL account master (23 bakery accounts seeded) |
| `journal_entries` | GL journal entry headers |
| `journal_lines` | GL double-entry lines (debit/credit) |
| `ar_invoices` | Accounts Receivable invoices (from CRM or manual) |
| `ar_payments` | Customer payments against AR invoices |
| `ap_invoices` | Accounts Payable invoices (from WMS or manual) |
| `ap_payments` | Supplier payments against AP invoices |
| `sync_events` | Idempotency log for CRM/WMS sync |
| `audit_log` | Audit trail for every financial transaction |

## Default Chart of Accounts

| Code | Account | Type |
|---|---|---|
| 1000 | Cash on Hand | Asset |
| 1010 | Cash in Bank | Asset |
| 1020 | Cash - GCash | Asset |
| 1100 | Accounts Receivable | Asset |
| 1200 | Inventory - Raw Materials | Asset |
| 1210 | Inventory - Finished Goods | Asset |
| 1500 | Equipment | Asset |
| 2000 | Accounts Payable | Liability |
| 2100 | VAT Payable | Liability |
| 3000 | Owner's Capital | Equity |
| 4000 | Sales Revenue | Revenue |
| 5000 | Cost of Goods Sold | Expense |
| 5100-5900 | Operating Expenses | Expense |
