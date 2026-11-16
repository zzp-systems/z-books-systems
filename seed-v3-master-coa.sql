-- ──────────────────────────────────────────────────────────
-- JJB ARAP — Master Chart of Accounts Seed v3 (77 Accounts)
-- 35 Parents | 42 Children | 77 Total
--
-- Run AFTER migration-v5-coa-master.sql:
--   npx wrangler d1 execute jjb-arap-db --remote --file=seed-v3-master-coa.sql
--
-- This REPLACES all previous COA seeds (v1, v2-tax, v2-opex, v3-hierarchy).
-- Old OPEX-xxx accounts are deleted; legacy codes are referenced in descriptions.
-- ──────────────────────────────────────────────────────────

-- ── Clear old OPEX accounts (replaced by numbered child accounts) ──
DELETE FROM chart_of_accounts WHERE account_code LIKE 'OPEX-%';

-- ============================================================
-- ASSET (19 accounts: 12 parents + 7 children)
-- ============================================================

INSERT OR REPLACE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code, account_level, description, tax_treatment_notes) VALUES
('1000', 'Cash on Hand', 'Asset', 'Current Asset', NULL, 'Parent',
 'Petty cash funds and undeposited cash on hand for day-to-day operational disbursements.',
 'Reconcile with physical petty cash count sheets; subject to periodic surprise cash counts.'),
('1010', 'Cash in Bank', 'Asset', 'Current Asset', NULL, 'Parent',
 'Operating bank accounts and depository clearing accounts for customer collections and disbursements.',
 'Reconcile monthly against official bank statements; bank service charges routed to 5908.'),
('1020', 'Cash - GCash', 'Asset', 'Current Asset', NULL, 'Parent',
 'Digital merchant wallet and electronic payment channel used for collections and minor outlays.',
 'Reconcile digital wallet ledger monthly; transaction fees tracked separately under 5908.'),
('1100', 'Accounts Receivable', 'Asset', 'Current Asset', NULL, 'Parent',
 'Control account for trade receivables, customer credit sales, and employee/affiliate advances.',
 'Substantiated by sales invoices and delivery receipts; aging monitored for bad-debt evaluation under 1180.'),
('1101', 'Advances to Employees (Receivable)', 'Asset', 'Current Asset', '1100', 'Child',
 'Cash advances granted to employees for travel, procurement, or operational expenses pending liquidation. (Legacy OPEX-104)',
 'Cash advance pending liquidation is a receivable, NOT an expense. No tax deduction upon disbursement; deduction occurs only upon liquidation against valid official receipts. Payroll-offset allowed per policy.'),
('1102', 'Staff / Affiliate Assistance Receivable', 'Asset', 'Current Asset', '1100', 'Child',
 'Temporary loans or financial aid provided to personnel or business affiliates with repayment terms. (Legacy OPEX-409)',
 'Balance-sheet asset requiring formal promissory agreements; non-deductible as expense. Any owner drawing component must route to 3003 Owner''s Capital.'),
('1150', 'Creditable Withholding Tax (CWT / BIR 2307)', 'Asset', 'Current Asset', NULL, 'Parent',
 'Creditable expanded withholding taxes deducted at source by withholding agents on sales collections. (Legacy OPEX-503 portion)',
 'Asset creditable against quarterly/annual income tax (BIR Form 1702/1701); strictly supported by original BIR Form 2307 certificates from customers.'),
('1160', 'Input VAT - Goods & Services', 'Asset', 'Current Asset', NULL, 'Parent',
 '12% Value-added tax paid on legitimate purchases of goods, capital equipment, materials, and contracted services.',
 'Creditable against Output VAT on monthly/quarterly VAT returns (BIR Form 2550Q); requires valid BIR VAT sales invoices with company TIN.'),
('1170', 'Supplies Inventory (Office / Janitorial)', 'Asset', 'Current Asset', NULL, 'Parent',
 'Control account for on-hand unused stocks of administrative paper, toner, and janitorial cleaning supplies. (Proposed Gap)',
 'Unused stock at period-end must be inventoried rather than expensed; expensed to 5904/5906 as consumed; input VAT creditable upon purchase.'),
('1180', 'Allowance for Doubtful Accounts', 'Asset', 'Contra-Asset', NULL, 'Parent',
 'Contra-asset account offsetting Accounts Receivable for estimated uncollectible customer balances. (Proposed Gap)',
 'Valuation allowance against receivables. Bad debt expense deduction for BIR tax purposes requires strict compliance with write-off and collection proof rules.'),
('1200', 'Inventory - Raw Materials', 'Asset', 'Current Asset', NULL, 'Parent',
 'Control account for direct raw materials, manufacturing inputs, and production supplies held for processing.',
 'Balance-sheet asset stated at lower of cost or net realizable value; relieved to 5100 Raw Materials Expense upon requisition into production.'),
('1201', 'Raw Material Purchases & Inputs', 'Asset', 'Current Asset', '1200', 'Child',
 'Direct purchases of raw materials, parts, and production supplies prior to fabrication. (Legacy OPEX-408 / 306)',
 'Purchased net of input VAT (1160); strictly an inventory balance sheet asset until issued to factory floor or relieved to 5100 / 5000.'),
('1210', 'Inventory - Finished Goods', 'Asset', 'Current Asset', NULL, 'Parent',
 'Control account for completed manufactured goods and purchased merchandise held for resale to customers.',
 'Inventory cost capitalized; relieved to 5000 COGS upon confirmed sale; promotional samples relieve to 5502.'),
('1211', 'Trading & Finished Merchandise Purchases', 'Asset', 'Current Asset', '1210', 'Child',
 'Inbound purchases of finished goods acquired for direct resale without further conversion. (Legacy OPEX-408)',
 'Debited to inventory at cost net of input VAT; costs released to 5000 Cost of Goods Sold only when goods are sold. Never booked as a period OpEx.'),
('1500', 'Equipment', 'Asset', 'Fixed Asset', NULL, 'Parent',
 'Control account for durable capital assets, operational equipment, vehicles, and furniture with useful lives over 1 year.',
 'Capitalized at acquisition cost plus freight/installation; depreciated over estimated useful life; input VAT claimed per BIR capital asset rules.'),
('1501', 'Furniture & Fixtures', 'Asset', 'Fixed Asset', '1500', 'Child',
 'Desks, workstations, display cabinets, shelving, and office furniture exceeding capitalization threshold. (Legacy OPEX-305)',
 'Capital asset subject to periodic depreciation via 1510; tagged in fixed asset register; cannot be expensed upon purchase.'),
('1502', 'Tools & Machinery', 'Asset', 'Fixed Asset', '1500', 'Child',
 'Durable plant machinery, power tools, and workshop equipment above capitalization threshold. (Legacy OPEX-306)',
 'Capitalized and depreciated over useful life; low-value consumable tools below capitalization threshold route to 5905.'),
('1503', 'Office Equipment', 'Asset', 'Fixed Asset', '1500', 'Child',
 'IT hardware, computers, network servers, printers, and core office appliances. (Legacy OPEX-407)',
 'Capitalized in fixed asset register and depreciated via 1510; minor accessories below capitalization threshold expensed to 5906.'),
('1510', 'Accumulated Depreciation', 'Asset', 'Contra-Asset', NULL, 'Parent',
 'Contra-asset account recording cumulative straight-line depreciation charged on equipment and fixed assets.',
 'Offsets 1500 Equipment on balance sheet; credited against debit to 5801 Depreciation Expense; BIR compliant asset lives.');

-- ============================================================
-- LIABILITY (5 accounts: 5 parents)
-- ============================================================

INSERT OR REPLACE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code, account_level, description, tax_treatment_notes) VALUES
('2000', 'Accounts Payable', 'Liability', 'Current Liability', NULL, 'Parent',
 'Control account for short-term trade obligations owed to suppliers and service providers for credit purchases.',
 'Substantiated by supplier billing invoices, delivery receipts, and vendor statements of account.'),
('2100', 'Output VAT Payable', 'Liability', 'Current Liability', NULL, 'Parent',
 '12% Value-added tax collected on sales of goods and taxable services owed to the Bureau of Internal Revenue.',
 'Remitted monthly/quarterly via BIR Form 2550M/2550Q net of allowable input VAT credits from 1160.'),
('2110', 'Expanded Withholding Tax (EWT) Payable', 'Liability', 'Current Liability', NULL, 'Parent',
 'Withholding taxes deducted from payments to landlords (5%), contractors (2%), and professional service providers. (Legacy OPEX-301 / 503)',
 'Remitted via BIR Form 0619-E (monthly) and 1601-EQ (quarterly); issuing BIR Form 2307 to payees is mandatory. Withholding tax is a liability, never an expense.'),
('2200', 'Withholding Tax Payable - Compensation', 'Liability', 'Current Liability', NULL, 'Parent',
 'Income taxes withheld from employee salaries and wages in accordance with BIR graduated tax tables. (Legacy OPEX-503 portion)',
 'Remitted monthly via BIR Form 1601-C; annualized year-end via BIR Form 1604-C / 2316; liability account, never an OpEx expense.'),
('2300', 'Salaries Payable', 'Liability', 'Current Liability', NULL, 'Parent',
 'Accrued gross compensation, wages, and mandatory statutory contributions payable to employees at period end.',
 'Cleared upon disbursement of net pay to employees and statutory remittance of SSS, PhilHealth, and Pag-IBIG contributions.');

-- ============================================================
-- EQUITY (5 accounts: 2 parents + 3 children)
-- ============================================================

INSERT OR REPLACE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code, account_level, description, tax_treatment_notes) VALUES
('3000', 'Owner''s Capital', 'Equity', 'Owners Equity', NULL, 'Parent',
 'Proprietary equity, initial and additional capital contributions, and owner''s net equity drawdowns.',
 'Equity withdrawals and personal expenses are strictly non-deductible for business income tax purposes.'),
('3001', 'Owner Personal Devotions & Worship', 'Equity', 'Owners Equity', '3000', 'Child',
 'Personal devotional and religious expenditures initiated by the business owner. (Legacy OPEX-109 personal portion)',
 'Strictly personal equity drawing against capital; NOT deductible from gross income; no creditable input VAT allowable.'),
('3002', 'Owner Personal Outreach & Evangelism', 'Equity', 'Owners Equity', '3000', 'Child',
 'Personal outreach, religious donations, or external evangelism initiated by the owner. (Legacy OPEX-110 personal portion)',
 'Treated as owner equity withdrawal; non-deductible for tax purposes unless certified as qualified business employee welfare under 5991.'),
('3003', 'Owner Personal Drawings & Assistance', 'Equity', 'Owners Equity', '3000', 'Child',
 'Personal advances and owner cash drawings for non-business financial assistance. (Legacy OPEX-409 owner portion)',
 'Personal drawings reduce owner''s equity balance; zero P&L deduction; non-tax-deductible transaction.'),
('3100', 'Retained Earnings', 'Equity', 'Owners Equity', NULL, 'Parent',
 'Cumulative net operational profits and losses retained in the business from inception, less distributions.',
 'Subject to dividend distribution or branch profit remittance rules upon formal declaration.');

-- ============================================================
-- REVENUE (5 accounts: 4 parents + 1 child)
-- ============================================================

INSERT OR REPLACE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code, account_level, description, tax_treatment_notes) VALUES
('4000', 'Sales Revenue', 'Revenue', 'Operating Revenue', NULL, 'Parent',
 'Primary control account for gross earnings generated from the sale of goods and commercial merchandise.',
 'Subject to 12% Output VAT or percentage tax; requires registered BIR sales invoices.'),
('4001', 'Sales Discounts, Returns & Allowances', 'Revenue', 'Contra-Revenue', '4000', 'Child',
 'Contra-revenue account recording prompt payment cash discounts, customer trade returns, and sales allowances. (Legacy OPEX-505 / proposed)',
 'Deducted directly from gross revenue to establish net taxable sales and Output VAT base pursuant to BIR revenue regulations.'),
('4010', 'Sales Revenue - VATable', 'Revenue', 'Operating Revenue', NULL, 'Parent',
 'Gross sales of goods and merchandise subject to standard 12% Value-added tax.',
 'Invoiced with BIR VAT sales invoices; reported under Taxable Sales in monthly/quarterly VAT return 2550Q.'),
('4020', 'Sales Revenue - VAT-Exempt', 'Revenue', 'Operating Revenue', NULL, 'Parent',
 'Gross sales from exempt products, non-VAT outlets, or agricultural food items.',
 'Invoiced as VAT-exempt; reported in VAT returns; subject to input VAT allocation rules.'),
('4100', 'Other Income', 'Revenue', 'Non-Operating Revenue', NULL, 'Parent',
 'Incidental non-operating revenue, including bank interest income, asset disposal gains, and scrap sales.',
 'Bank interest subjected to final withholding tax (20%); asset gains taxed under ordinary or capital gains rules.');

-- ============================================================
-- EXPENSE (43 accounts: 18 parents + 25 children)
-- ============================================================

INSERT OR REPLACE INTO chart_of_accounts (account_code, account_name, account_type, sub_type, parent_account_code, account_level, description, tax_treatment_notes) VALUES
-- ── COGS & Production ──
('5000', 'Cost of Goods Sold', 'Expense', 'COGS', NULL, 'Parent',
 'Direct inventory cost of products and merchandise sold to customers during the reporting period. (Linked to OPEX-408/502)',
 'Fully deductible direct cost against gross sales; calculated via Beginning Inventory + Purchases - Ending Inventory.'),
('5100', 'Raw Materials Expense', 'Expense', 'Production Cost', NULL, 'Parent',
 'Direct cost of raw ingredients, component materials, and fabrication supplies consumed in manufacturing.',
 'Deductible production cost transferred from 1200 Inventory; requires material issue requisitions.'),
('5101', 'Workshop & Production Consumables', 'Expense', 'Production Cost', '5100', 'Child',
 'Fast-moving production materials, workshop supplies, and fabrication items consumed in processing. (Legacy OPEX-306 direct portion)',
 'Directly deductible as factory production overhead/materials; substantiated by vendor sales invoices.'),
('5200', 'Direct Labor', 'Expense', 'Production Cost', NULL, 'Parent',
 'Wages, overtime, and allowances directly incurred for production workers, machine operators, and factory helpers. (Split from OPEX-101/103/105)',
 'Subject to withholding tax on compensation; included in inventory conversion cost; supported by factory payroll time cards.'),

-- ── Utilities ──
('5300', 'Utilities Expense', 'Expense', 'Operating Expense', NULL, 'Parent',
 'Control account for electricity, water, telecommunications, and digital infrastructure services.',
 'Supported by utility billing invoices; input VAT fully creditable against output VAT.'),
('5301', 'Electricity, Water & Utilities', 'Expense', 'Operating Expense', '5300', 'Child',
 'Electric power and water utility charges for corporate offices, warehouses, and operating depots. (Legacy OPEX-302)',
 'Deductible operating expense; input VAT creditable based on official utility invoices with company TIN.'),
('5302', 'Telecommunication & Internet', 'Expense', 'Operating Expense', '5300', 'Child',
 'Landlines, corporate postpaid cellular subscriptions, and high-speed broadband data connections. (Legacy OPEX-403)',
 'Input VAT creditable; personal portions of postpaid mobile lines should be segregated or subjected to FBT.'),

-- ── Rent ──
('5400', 'Rent Expense', 'Expense', 'Operating Expense', NULL, 'Parent',
 'Control account for operating lease rentals of commercial offices, warehouses, storage stalls, and depots.',
 'Requires formal notarized lease contracts and official BIR rent receipts; subject to 5% expanded withholding tax to 2110.'),
('5401', 'Rent - Office / Depot / Warehouse', 'Expense', 'Operating Expense', '5400', 'Child',
 'Periodic lease rentals for head office, storage depots, regional branches, and warehouse spaces. (Legacy OPEX-301)',
 'Fully deductible provided 5% EWT is withheld and remitted (BIR Form 1601-EQ / 2307); lessor TIN and BIR receipts mandatory.'),

-- ── Marketing ──
('5500', 'Marketing Expense', 'Expense', 'Operating Expense', NULL, 'Parent',
 'Control account for marketing campaigns, advertisements, promotional events, brand development, and product sampling.',
 'Deductible business expense subject to statutory ceilings on advertising/promotions where applicable; input VAT creditable.'),
('5501', 'Advertising & Promotions', 'Expense', 'Operating Expense', '5500', 'Child',
 'Commercial advertising, digital social media ads, marketing print collaterals, and brand campaigns. (Legacy OPEX-501)',
 'Deductible operating expense supported by media contracts and vendor invoices; input VAT creditable.'),
('5502', 'Samples, Gifts & Giveaways', 'Expense', 'Operating Expense', '5500', 'Child',
 'Finished goods and complimentary merchandise distributed to clients and prospects for brand awareness. (Legacy OPEX-502)',
 'Relieves 1210 Inventory; must comply with BIR deemed sale rules for free goods; maintain detailed sample issuance log with recipients.'),
('5503', 'Events Meals & Refreshments (Marketing)', 'Expense', 'Operating Expense', '5500', 'Child',
 'Catering, meals, and refreshments provided during customer seminars, product launches, and sales roadshows. (Legacy OPEX-106 marketing split)',
 'Valid marketing promotion deduction; input VAT creditable from VAT caterers/restaurants; distinct from internal staff meals.'),

-- ── Salaries & Personnel ──
('5600', 'Salaries Expense', 'Expense', 'Operating Expense', NULL, 'Parent',
 'Control account for executive, administrative, sales, and operational employee compensation, allowances, and staff benefits.',
 'Deductible with payroll registers; subject to compensation withholding tax (2200/2300); employer statutory contributions tracked.'),
('5601', 'Salaries & Wages', 'Expense', 'Operating Expense', '5600', 'Child',
 'Basic regular compensation, hourly wages, and overtime pay for non-production personnel. (Legacy OPEX-101)',
 'Subject to compensation withholding; substantiated by certified payroll sheets; factory wages split to 5200 Direct Labor.'),
('5602', 'Driver Allowance', 'Expense', 'Operating Expense', '5600', 'Child',
 'Fixed compensation allowances and trip allowances provided to company logistics drivers. (Legacy OPEX-102)',
 'Compensation income subject to withholding tax on wages; managerial driver benefits reviewed for Fringe Benefits Tax (FBT).'),
('5603', 'Helper Allowance', 'Expense', 'Operating Expense', '5600', 'Child',
 'General assistance and welfare allowances paid to office and facility support helpers. (Legacy OPEX-103)',
 'Withholding tax applies; helper labor devoted directly to production or packing moves to 5200 Direct Labor.'),
('5604', 'Employee Meals & Food Allowance', 'Expense', 'Operating Expense', '5600', 'Child',
 'Subsidized pantry supplies, overtime meals, and regular staff meal allowances. (Legacy OPEX-105)',
 'Deductible employee benefit; FBT applies to managerial staff benefits exceeding de minimis thresholds; keep receipts.'),
('5605', 'Employee Medical Benefits', 'Expense', 'Operating Expense', '5600', 'Child',
 'Employee health coverage, routine medical expense reimbursements, and first-aid provisions. (Legacy OPEX-107)',
 'Non-taxable de minimis benefits within statutory limits; excess subject to FBT or compensation tax; maintain claim slips.'),
('5606', 'Employee Dental Benefits', 'Expense', 'Operating Expense', '5600', 'Child',
 'Staff dental check-ups, cleanings, and emergency oral healthcare assistance. (Legacy OPEX-108)',
 'De minimis employee welfare; deductible business expense supported by dental practitioner receipts and beneficiary records.'),
('5607', 'Internal Team Events & Welfare', 'Expense', 'Operating Expense', '5600', 'Child',
 'Internal company gatherings, team-building sessions, staff year-end meals, and employee welfare refreshments. (Legacy OPEX-106 welfare split)',
 'Deductible employee welfare; FBT applies to managerial employee segments; input VAT creditable on VAT vendor catering.'),

-- ── Transportation & Distribution ──
('5700', 'Transportation & Distribution Expense', 'Expense', 'Operating Expense', NULL, 'Parent',
 'Control account for outbound distribution, delivery logistics, freight-out, and operational fleet expenses. (Proposed Gap Parent)',
 'Replaces improper interim booking in 5900; deductible operating logistics cost; input VAT creditable.'),
('5701', 'Fuel, Oil & Lubricants', 'Expense', 'Operating Expense', '5700', 'Child',
 'Gasoline, diesel, motor oils, and lubricants consumed by company delivery and service fleet vehicles. (Legacy OPEX-201)',
 'Input VAT creditable on BIR official invoices; deductibility requires per-vehicle trip logbooks and odometer tracking.'),
('5702', 'Freight-Out / Delivery Expenses', 'Expense', 'Operating Expense', '5700', 'Child',
 'Third-party courier fees, delivery forwarding, and trucking costs to transport sold goods to customers. (Legacy OPEX-202)',
 'Freight-out is distribution OpEx; freight-in on purchases belongs to inventory (1200/1210) or COGS (5000); keep strictly segregated.'),
('5703', 'Travel & Transportation', 'Expense', 'Operating Expense', '5700', 'Child',
 'Staff local travel, bus/jeepney fares, toll fees, and inter-branch travel for operational errands. (Legacy OPEX-204)',
 'Deductibility requires approved travel itineraries and official transport tickets; personal commuting excluded.'),

-- ── Depreciation & Repairs ──
('5800', 'Depreciation & Amortization Expense', 'Expense', 'Operating Expense', NULL, 'Parent',
 'Control account for the non-cash allocation of asset depreciation across equipment, furniture, and facilities. (Proposed Gap Parent)',
 'Deductible non-cash expense; offsets 1510 Accumulated Depreciation; manufacturing depreciation capitalized to COGS.'),
('5801', 'Depreciation Expense', 'Expense', 'Operating Expense', '5800', 'Child',
 'Periodic depreciation charges on administrative, operational, and office equipment. (Legacy OPEX-504)',
 'Non-cash expense crediting 1510 Accumulated Depreciation; no VAT impact; bad-debt provisions moved to 1180.'),
('5810', 'Repairs & Maintenance Expense', 'Expense', 'Operating Expense', NULL, 'Parent',
 'Control account dedicated to recurring servicing, minor repairs, and facility maintenance. (Proposed Gap Parent)',
 'Routine upkeep expensed immediately; major alterations extending asset useful life capitalized to 1500 Equipment.'),

-- ── Taxes & Licenses ──
('5820', 'Taxes, Licenses & Dues (Local)', 'Expense', 'Operating Expense', NULL, 'Parent',
 'Control account for municipal permits, local business taxes, BIR annual registration fees, and documentary stamps. (Proposed Gap Parent)',
 'Deductible local taxes; distinct from income taxes, penalties, or withholding taxes (segregates OPEX-405).'),

-- ── Other Expenses ──
('5900', 'Other Expenses', 'Expense', 'Operating Expense', NULL, 'Parent',
 'Control account for general administrative, office operating, compliance, and residual sundry operating expenses.',
 'Deductible administrative expenses supported by valid BIR receipts; non-deductible penalties kept in separate child.'),
('5901', 'Vehicle Repairs & Maintenance', 'Expense', 'Operating Expense', '5900', 'Child',
 'Minor recurring repair work, tire changes, tune-ups, and servicing on fleet vehicles. (Legacy OPEX-203)',
 'Input VAT creditable on official repair shop invoices; major structural rebuilds capitalized to 1500 Equipment.'),
('5902', 'Postage & Courier', 'Expense', 'Operating Expense', '5900', 'Child',
 'Document postage, registered mail, and express dispatch for administrative correspondence. (Legacy OPEX-205)',
 'Input VAT creditable on courier receipts; customer promotional mailings routed to 5501.'),
('5903', 'Building Repairs & Maintenance (Minor)', 'Expense', 'Operating Expense', '5900', 'Child',
 'Routine repairs on leased premises, electrical fixes, plumbing, and minor carpentry. (Legacy OPEX-303)',
 'Ordinary maintenance is deductible OpEx; leasehold improvements extending space value capitalized to 1500.'),
('5904', 'Janitorial & Cleaning Supplies', 'Expense', 'Operating Expense', '5900', 'Child',
 'Consumable sanitary chemicals, detergents, brooms, sanitizers, and trash liners for office upkeep. (Legacy OPEX-304)',
 'Expensed as consumed; bulk unused stock at period-end inventoried under 1170 Supplies Inventory.'),
('5905', 'Tools & Workshop Consumables', 'Expense', 'Operating Expense', '5900', 'Child',
 'Low-value consumables, saw blades, sandpaper, and hand tools below capitalization threshold. (Legacy OPEX-306 expense portion)',
 'Fully expensed upon acquisition; durable machinery exceeding threshold capitalized to 1502.'),
('5906', 'Office Supplies Expense', 'Expense', 'Operating Expense', '5900', 'Child',
 'Stationery, copy paper, toner cartridges, file folders, and writing supplies used in daily administration. (Legacy OPEX-401)',
 'Deductible with official invoices; input VAT creditable; unused bulk year-end supply shifted to 1170.'),
('5907', 'Printing & Reproduction', 'Expense', 'Operating Expense', '5900', 'Child',
 'Administrative document printing, photocopying, legal binding, and voucher book reproduction. (Legacy OPEX-402)',
 'General administrative cost; customer-facing marketing flyers and brochures route to 5501.'),
('5908', 'Bank Charges & Fees', 'Expense', 'Operating Expense', '5900', 'Child',
 'Monthly bank service fees, wire charges, check clearance, and electronic transfer charges. (Legacy OPEX-404)',
 'Non-VAT financial expense; reconcile monthly with bank statements; no input VAT claim.'),
('5909', 'Licenses, Permits & Document Fees', 'Expense', 'Operating Expense', '5900', 'Child',
 'Mayor''s permit, barangay clearances, notary fees, DTI/SEC fees, and BIR documentary stamps. (Legacy OPEX-405)',
 'Valid tax deduction; distinct from withholding tax payables; official government receipts required.'),
('5910', 'Fines & Penalties', 'Expense', 'Operating Expense', '5900', 'Child',
 'Regulatory surcharges, BIR late filing penalties, and statutory interest. (Legacy OPEX-406)',
 'NON-DEDUCTIBLE for income tax calculation; must be added back on annual tax return BIR Form 1702/1701.'),
('5911', 'Miscellaneous (Sundry) Expenses', 'Expense', 'Operating Expense', '5900', 'Child',
 'Residual small-value incidental operating expenses not classified elsewhere. (Legacy OPEX-410)',
 'Keep itemized vouchers; subject to regular review to reclassify recurring patterns into named parent accounts.'),
('5990', 'Religious & Worship Expense (Employee Welfare)', 'Expense', 'Operating Expense', '5900', 'Child',
 'Business-sponsored staff devotions, chapel gatherings, or company-wide spiritual welfare sessions. (Legacy OPEX-109 business portion)',
 'Deductible ONLY if substantiated as bona fide employee welfare program for staff; owner personal devotions route to 3001.'),
('5991', 'Evangelism & Community Outreach (CSR)', 'Expense', 'Operating Expense', '5900', 'Child',
 'Corporate social responsibility (CSR) programs and community outreach sponsored by the enterprise. (Legacy OPEX-110 business portion)',
 'Deductible only if certified as accredited charitable contributions under BIR rules or staff CSR; otherwise equity 3002.');

-- ── Verify ──
-- SELECT COUNT(*) as total, SUM(CASE WHEN account_level='Parent' THEN 1 ELSE 0 END) as parents, SUM(CASE WHEN account_level='Child' THEN 1 ELSE 0 END) as children FROM chart_of_accounts;
-- Expected: total=77, parents=35, children=42
