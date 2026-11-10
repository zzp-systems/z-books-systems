/**
 * Z-Books Relational Store & Accounting Database Engine
 * Entity: Jang-Jang Bakeshop (Philippine SME Food Manufacturing & Multi-Outlet Retail)
 * Standard: PFRS for SMEs / Accrual Basis / PRISMER Double-Entry Engine
 */

import {
  Account,
  CostCenter,
  Employee,
  JournalEntry,
  JournalEntryLine,
  PayrollRun,
  TrialBalanceRow,
  BirForm2550QData,
  BirForm1701QData,
  BirForm1601CData,
  GeneralLedgerRecord
} from '../types/accounting';

const STORAGE_KEY = 'zbooks_sme_state_v1';

// ---------------------------------------------------------------------
// 1. INITIAL SEED DATA
// ---------------------------------------------------------------------

export const INITIAL_COST_CENTERS: CostCenter[] = [
  { code: 'IND-PLANT', name: 'Indangan Production Plant', location: 'Indangan, Buhangin, Davao City', manager: 'Master Baker R. Santos' },
  { code: 'SAS-BRANCH', name: 'Sasa Retail Outlet & Oven', location: 'Sasa Wharf Road, Davao City', manager: 'Store Lead M. Villanueva' },
  { code: 'LOG-DELIV', name: 'Logistics & Van Delivery', location: 'Davao City Metro Route', manager: 'Fleet Head C. Alcantara' },
  { code: 'ADM-HQ', name: 'Executive & Administrative Office', location: 'Davao Corporate Office', manager: 'General Manager J. Tan' }
];

export const INITIAL_ACCOUNTS: Account[] = [
  // 10000 - ASSETS
  { account_code: '10101', account_name: 'Petty Cash Fund', account_type: 'ASSET', normal_balance: 'DEBIT', category: 'Cash & Cash Equivalents', is_active: true, description: 'Cash float held by plant cashiers and store supervisors' },
  { account_code: '10102', account_name: 'Cash in Bank - BDO Current Account', account_type: 'ASSET', normal_balance: 'DEBIT', category: 'Cash & Cash Equivalents', is_active: true, description: 'Main operational disbursement and vendor account' },
  { account_code: '10103', account_name: 'Cash in Bank - BPI Operating Account', account_type: 'ASSET', normal_balance: 'DEBIT', category: 'Cash & Cash Equivalents', is_active: true, description: 'Retail store collections and POS settling account' },
  { account_code: '10201', account_name: 'Accounts Receivable - Trade', account_type: 'ASSET', normal_balance: 'DEBIT', category: 'Receivables', is_active: true, description: 'Receivables from b2b wholesale bread distribution clients' },
  { account_code: '10202', account_name: 'Allowance for Impairment - Trade AR', account_type: 'ASSET', normal_balance: 'CREDIT', category: 'Receivables', is_active: true, description: 'Contra-asset provision for doubtful wholesale receivables' },
  { account_code: '10301', account_name: 'Direct Raw Materials Inventory', account_type: 'ASSET', normal_balance: 'DEBIT', category: 'Inventories', is_active: true, description: 'Flour sacks, refined sugar, yeast, shortening, margarine, dairy' },
  { account_code: '10302', account_name: 'Packaging Supplies Inventory', account_type: 'ASSET', normal_balance: 'DEBIT', category: 'Inventories', is_active: true, description: 'Bread plastic wrappers, paper bags, bakery boxes, labels' },
  { account_code: '10303', account_name: 'Work-in-Process Inventory (WIP)', account_type: 'ASSET', normal_balance: 'DEBIT', category: 'Inventories', is_active: true, description: 'Dough in proofing cabinets, partially baked trays' },
  { account_code: '10304', account_name: 'Finished Goods Inventory', account_type: 'ASSET', normal_balance: 'DEBIT', category: 'Inventories', is_active: true, description: 'Pan de sal, loaf bread, ensaymada, spanish bread ready for dispatch' },
  { account_code: '10401', account_name: 'Input VAT (12%)', account_type: 'ASSET', normal_balance: 'DEBIT', category: 'Prepayments & Tax Credits', is_active: true, description: 'Creditable VAT paid on local purchases of raw ingredients & capital goods' },
  { account_code: '10501', account_name: 'Bakery Machinery & Rotary Ovens', account_type: 'ASSET', normal_balance: 'DEBIT', category: 'Property, Plant & Equipment', is_active: true, description: 'Heavy rotary deck ovens, spiral dough mixers, bread slicers' },
  { account_code: '10502', account_name: 'Accumulated Depreciation - Machinery', account_type: 'ASSET', normal_balance: 'CREDIT', category: 'Property, Plant & Equipment', is_active: true, description: 'Accumulated depreciation on plant bakery machinery' },
  { account_code: '10503', account_name: 'Delivery Vans & Logistics Vehicles', account_type: 'ASSET', normal_balance: 'DEBIT', category: 'Property, Plant & Equipment', is_active: true, description: 'Delivery trucks and distribution vans for multi-branch supply' },
  { account_code: '10504', account_name: 'Accumulated Depreciation - Vehicles', account_type: 'ASSET', normal_balance: 'CREDIT', category: 'Property, Plant & Equipment', is_active: true, description: 'Accumulated depreciation on delivery fleet' },

  // 20000 - LIABILITIES
  { account_code: '20101', account_name: 'Accounts Payable - Flour & Ingredient Suppliers', account_type: 'LIABILITY', normal_balance: 'CREDIT', category: 'Payables', is_active: true, description: 'Trade obligations to milling companies and ingredient suppliers' },
  { account_code: '20102', account_name: 'Accrued Operating Expenses', account_type: 'LIABILITY', normal_balance: 'CREDIT', category: 'Payables', is_active: true, description: 'Accrued electricity (Davao Light), LPG fuel, and phone expenses' },
  { account_code: '20103', account_name: 'Accrued Payroll & Wage Clearing', account_type: 'LIABILITY', normal_balance: 'CREDIT', category: 'Payables', is_active: true, description: 'Net wages due to plant workers and employees' },
  { account_code: '20201', account_name: 'Output VAT (12%)', account_type: 'LIABILITY', normal_balance: 'CREDIT', category: 'Taxes Payable', is_active: true, description: '12% Value Added Tax collected on taxable bakery retail and wholesale sales' },
  { account_code: '20202', account_name: 'Withholding Tax Payable - Compensation (BIR Form 1601-C)', account_type: 'LIABILITY', normal_balance: 'CREDIT', category: 'Taxes Payable', is_active: true, description: 'TRAIN Law withholding tax withheld from employee salaries' },
  { account_code: '20203', account_name: 'Due to SSS (Employee & Employer Premiums)', account_type: 'LIABILITY', normal_balance: 'CREDIT', category: 'Statutory Payables', is_active: true, description: 'Mandatory SSS and WISP contributions payable to Social Security System' },
  { account_code: '20204', account_name: 'Due to PhilHealth (PHIC Premiums)', account_type: 'LIABILITY', normal_balance: 'CREDIT', category: 'Statutory Payables', is_active: true, description: '5% mandatory PhilHealth premium contribution payable' },
  { account_code: '20205', account_name: 'Due to Pag-IBIG (HDMF Premiums)', account_type: 'LIABILITY', normal_balance: 'CREDIT', category: 'Statutory Payables', is_active: true, description: 'Home Development Mutual Fund contributions payable' },

  // 30000 - OWNER EQUITY
  { account_code: '30101', account_name: 'Owner Capital - J. Tan', account_type: 'EQUITY', normal_balance: 'CREDIT', category: 'Owner Equity', is_active: true, description: 'Contributed initial and ongoing capital by proprietor' },
  { account_code: '30102', account_name: 'Owner Drawing - J. Tan', account_type: 'EQUITY', normal_balance: 'DEBIT', category: 'Owner Equity', is_active: true, description: 'Personal withdrawals by sole proprietor against profits' },
  { account_code: '30201', account_name: 'Retained Earnings / Accumulated Profit', account_type: 'EQUITY', normal_balance: 'CREDIT', category: 'Owner Equity', is_active: true, description: 'Cumulative undistributed net profit from operations' },

  // 40000 - REVENUE
  { account_code: '40101', account_name: 'Sales Revenue - Retail Bakery Outlets', account_type: 'REVENUE', normal_balance: 'CREDIT', category: 'Operating Revenue', is_active: true, description: 'Counter sales of bread, pastries, and cakes across branches' },
  { account_code: '40102', account_name: 'Sales Revenue - Wholesale & Institutional', account_type: 'REVENUE', normal_balance: 'CREDIT', category: 'Operating Revenue', is_active: true, description: 'Supply contracts to supermarkets, hotels, and canteens' },
  { account_code: '40103', account_name: 'Sales Discounts & Senior/PWD Deductions', account_type: 'REVENUE', normal_balance: 'DEBIT', category: 'Contra Revenue', is_active: true, description: 'Statutory 20% Senior Citizen / PWD discounts and promotional vouchers' },

  // 50000 - MANUFACTURING DIRECT COSTS & COGS
  { account_code: '50101', account_name: 'Direct Raw Materials Used', account_type: 'COGS', normal_balance: 'DEBIT', category: 'Direct Materials', is_active: true, description: 'Flour, yeast, eggs, butter, sugar, cocoa consumed in production batches' },
  { account_code: '50102', account_name: 'Direct Packaging Consumed', account_type: 'COGS', normal_balance: 'DEBIT', category: 'Direct Materials', is_active: true, description: 'Packaging film, printed bread bags consumed in finished goods' },
  { account_code: '50201', account_name: 'Direct Labor - Bakers & Dough Handlers', account_type: 'COGS', normal_balance: 'DEBIT', category: 'Direct Labor', is_active: true, description: 'Wages of head bakers, dough kneaders, oven masters at Indangan Plant' },
  { account_code: '50202', account_name: 'Direct Labor - Slicers & Packaging Crew', account_type: 'COGS', normal_balance: 'DEBIT', category: 'Direct Labor', is_active: true, description: 'Wages of bread slicing machine operators and packing personnel' },
  { account_code: '50301', account_name: 'Factory Overhead - LPG & Oven Fuel', account_type: 'COGS', normal_balance: 'DEBIT', category: 'Factory Overhead', is_active: true, description: 'Industrial LPG gas tanks consumed for rotary baking ovens' },
  { account_code: '50302', account_name: 'Factory Overhead - Plant Electric Power', account_type: 'COGS', normal_balance: 'DEBIT', category: 'Factory Overhead', is_active: true, description: 'Industrial electricity for heavy spiral mixers and walk-in chillers' },
  { account_code: '50303', account_name: 'Factory Overhead - Plant Sanitation & Water', account_type: 'COGS', normal_balance: 'DEBIT', category: 'Factory Overhead', is_active: true, description: 'Food safety sanitizers, wash water, pest control, hairnets/aprons' },
  { account_code: '50304', account_name: 'Factory Overhead - Machinery Maintenance', account_type: 'COGS', normal_balance: 'DEBIT', category: 'Factory Overhead', is_active: true, description: 'Lubricants, oven heating element replacements, bearing greasing' },
  { account_code: '50401', account_name: 'Cost of Goods Sold - Finished Bread', account_type: 'COGS', normal_balance: 'DEBIT', category: 'Cost of Sales', is_active: true, description: 'Recognized manufacturing cost of bread sold during the fiscal period' },

  // 60000 - OPERATING EXPENSES (OPEX)
  { account_code: '60101', account_name: 'Salaries & Wages - Administrative Staff', account_type: 'OPEX', normal_balance: 'DEBIT', category: 'Administrative Expenses', is_active: true, description: 'Compensation of general manager, cashier, bookkeeper, QA officer' },
  { account_code: '60102', account_name: 'Employer Statutory Share - SSS (Admin & Plant)', account_type: 'OPEX', normal_balance: 'DEBIT', category: 'Employee Benefits', is_active: true, description: 'Employer 9.5% SSS + WISP + EC share contributions' },
  { account_code: '60103', account_name: 'Employer Statutory Share - PhilHealth', account_type: 'OPEX', normal_balance: 'DEBIT', category: 'Employee Benefits', is_active: true, description: 'Employer 2.5% PhilHealth premium share' },
  { account_code: '60104', account_name: 'Employer Statutory Share - Pag-IBIG', account_type: 'OPEX', normal_balance: 'DEBIT', category: 'Employee Benefits', is_active: true, description: 'Employer Pag-IBIG HDMF ₱200 monthly share' },
  { account_code: '60201', account_name: 'Store & Plant Rent Expense', account_type: 'OPEX', normal_balance: 'DEBIT', category: 'Occupancy Costs', is_active: true, description: 'Monthly lease rentals for retail outlets and plant premises' },
  { account_code: '60202', account_name: 'Delivery Fuel & Vehicle Lubricants', account_type: 'OPEX', normal_balance: 'DEBIT', category: 'Logistics Expenses', is_active: true, description: 'Diesel fuel for delivery vans distributing fresh bread daily' },
  { account_code: '60203', account_name: 'Store Utilities (Light & Water)', account_type: 'OPEX', normal_balance: 'DEBIT', category: 'Occupancy Costs', is_active: true, description: 'Retail bakeshop aircon, showcase chillers, and lights' },
  { account_code: '60301', account_name: 'Taxes, Permits & Licenses', account_type: 'OPEX', normal_balance: 'DEBIT', category: 'Tax Expenses', is_active: true, description: 'Mayor permit, sanitary permits, BIR annual registration fees' },
  { account_code: '60302', account_name: 'Depreciation Expense - Plant Machinery', account_type: 'OPEX', normal_balance: 'DEBIT', category: 'Depreciation', is_active: true, description: 'Straight-line periodic depreciation of ovens and equipment' },
  { account_code: '60303', account_name: 'Depreciation Expense - Delivery Vehicles', account_type: 'OPEX', normal_balance: 'DEBIT', category: 'Depreciation', is_active: true, description: 'Depreciation of delivery distribution vans' },
  { account_code: '60401', account_name: 'Office Supplies & Miscellaneous Admin', account_type: 'OPEX', normal_balance: 'DEBIT', category: 'Administrative Expenses', is_active: true, description: 'POS paper rolls, receipts, accounting stationeries' }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-001',
    employee_id_number: 'JJB-2023-001',
    full_name: 'Reynaldo Santos',
    station_role: 'Baker',
    cost_center_code: 'IND-PLANT',
    employment_status: 'REGULAR',
    daily_rate: 680.00,
    monthly_basic_rate: 17680.00,
    tin: '241-893-112-0000',
    sss_number: '09-1827364-1',
    philhealth_number: '12-983746123-0',
    pagibig_number: '1210-9834-5512',
    bank_account_number: 'BDO-0089283719',
    hire_date: '2023-02-15',
    is_active: true
  },
  {
    id: 'emp-002',
    employee_id_number: 'JJB-2023-002',
    full_name: 'Arnel Bautista',
    station_role: 'Oven Master',
    cost_center_code: 'IND-PLANT',
    employment_status: 'REGULAR',
    daily_rate: 640.00,
    monthly_basic_rate: 16640.00,
    tin: '312-901-445-0000',
    sss_number: '09-4458921-3',
    philhealth_number: '12-449102938-1',
    pagibig_number: '1210-4490-1123',
    bank_account_number: 'BDO-0089283720',
    hire_date: '2023-03-01',
    is_active: true
  },
  {
    id: 'emp-003',
    employee_id_number: 'JJB-2023-003',
    full_name: 'Eduardo Magno',
    station_role: 'Slicer',
    cost_center_code: 'IND-PLANT',
    employment_status: 'REGULAR',
    daily_rate: 610.00,
    monthly_basic_rate: 15860.00,
    tin: '198-442-887-0000',
    sss_number: '09-9948271-5',
    philhealth_number: '12-883920194-2',
    pagibig_number: '1210-3349-8812',
    bank_account_number: 'BDO-0089283721',
    hire_date: '2023-05-10',
    is_active: true
  },
  {
    id: 'emp-004',
    employee_id_number: 'JJB-2023-004',
    full_name: 'Maricel Dizon',
    station_role: 'Wrapper',
    cost_center_code: 'IND-PLANT',
    employment_status: 'PROBATIONARY',
    daily_rate: 610.00,
    monthly_basic_rate: 15860.00,
    tin: '402-119-762-0000',
    sss_number: '09-3329104-8',
    philhealth_number: '12-772910394-8',
    pagibig_number: '1210-8839-2041',
    bank_account_number: 'BDO-0089283722',
    hire_date: '2024-01-15',
    is_active: true
  },
  {
    id: 'emp-005',
    employee_id_number: 'JJB-2023-005',
    full_name: 'Carlos Alcantara',
    station_role: 'Delivery Driver',
    cost_center_code: 'LOG-DELIV',
    employment_status: 'REGULAR',
    daily_rate: 650.00,
    monthly_basic_rate: 16900.00,
    tin: '189-332-901-0000',
    sss_number: '09-7729381-0',
    philhealth_number: '12-119283746-5',
    pagibig_number: '1210-5591-0029',
    bank_account_number: 'BDO-0089283723',
    hire_date: '2023-04-01',
    is_active: true
  },
  {
    id: 'emp-006',
    employee_id_number: 'JJB-2023-006',
    full_name: 'Rowena Lopez',
    station_role: 'QA Inspector',
    cost_center_code: 'IND-PLANT',
    employment_status: 'REGULAR',
    daily_rate: 700.00,
    monthly_basic_rate: 18200.00,
    tin: '551-902-334-0000',
    sss_number: '09-8819203-4',
    philhealth_number: '12-661928374-9',
    pagibig_number: '1210-1129-4482',
    bank_account_number: 'BDO-0089283724',
    hire_date: '2023-06-01',
    is_active: true
  },
  {
    id: 'emp-007',
    employee_id_number: 'JJB-2023-007',
    full_name: 'Michelle Villanueva',
    station_role: 'Store Supervisor',
    cost_center_code: 'SAS-BRANCH',
    employment_status: 'REGULAR',
    daily_rate: 850.00,
    monthly_basic_rate: 22100.00,
    tin: '672-881-902-0000',
    sss_number: '09-1129384-6',
    philhealth_number: '12-339182746-1',
    pagibig_number: '1210-9928-3312',
    bank_account_number: 'BDO-0089283725',
    hire_date: '2023-01-10',
    is_active: true
  },
  {
    id: 'emp-008',
    employee_id_number: 'JJB-2023-008',
    full_name: 'Patricia Morales',
    station_role: 'Accountant',
    cost_center_code: 'ADM-HQ',
    employment_status: 'REGULAR',
    daily_rate: 1150.00,
    monthly_basic_rate: 29900.00,
    tin: '781-445-992-0000',
    sss_number: '09-4491823-9',
    philhealth_number: '12-559182736-4',
    pagibig_number: '1210-7719-2234',
    bank_account_number: 'BDO-0089283726',
    hire_date: '2023-01-05',
    is_active: true
  }
];

export const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = [
  // 1. Owner's Capital Seed Contribution
  {
    id: 'je-001',
    entry_number: 'JE-202501-1001',
    entry_date: '2025-01-05',
    reference_doc: 'OR-001 / Bank Deposit Slip',
    description: 'Initial capital injection by sole proprietor J. Tan for Jang-Jang Bakeshop expansion',
    status: 'POSTED',
    cost_center_code: 'ADM-HQ',
    payee_vendor: 'Proprietor J. Tan',
    total_amount: 1500000.00,
    created_by: 'CPA Systems Architect',
    posted_at: '2025-01-05T08:30:00Z',
    created_at: '2025-01-05T08:30:00Z',
    lines: [
      { id: 'jel-101', account_code: '10102', debit_amount: 1500000.00, credit_amount: 0, memo: 'Capital fund deposited to BDO Current Account', line_order: 1 },
      { id: 'jel-102', account_code: '30101', debit_amount: 0, credit_amount: 1500000.00, memo: 'Contributed owner equity capital', line_order: 2 }
    ]
  },

  // 2. Acquisition of Heavy Plant Machinery & Deck Ovens (PPE with 12% Input VAT)
  {
    id: 'je-002',
    entry_number: 'JE-202501-1002',
    entry_date: '2025-01-08',
    reference_doc: 'SI-7782 / BakeryTech Davao Corp',
    description: 'Purchase of industrial 3-deck rotary baking ovens, 50kg spiral mixer, and bread slicers',
    status: 'POSTED',
    cost_center_code: 'IND-PLANT',
    payee_vendor: 'BakeryTech Davao Corp (TIN: 221-445-667-0000)',
    total_amount: 448000.00,
    created_by: 'CPA Systems Architect',
    posted_at: '2025-01-08T10:15:00Z',
    created_at: '2025-01-08T10:15:00Z',
    lines: [
      { id: 'jel-201', account_code: '10501', debit_amount: 400000.00, credit_amount: 0, memo: 'Rotary ovens & industrial spiral mixer capital asset', line_order: 1 },
      { id: 'jel-202', account_code: '10401', debit_amount: 48000.00, credit_amount: 0, memo: '12% Input VAT on capital machinery purchase', line_order: 2 },
      { id: 'jel-203', account_code: '10102', debit_amount: 0, credit_amount: 448000.00, memo: 'Paid via BDO Check #0041289', line_order: 3 }
    ]
  },

  // 3. Direct Raw Materials Bulk Purchase: First Class Flour, Sugar, Fats (with 12% Input VAT)
  {
    id: 'je-003',
    entry_number: 'JE-202501-1003',
    entry_date: '2025-01-10',
    reference_doc: 'PO-2025-014 / San Miguel Mills SI-9941',
    description: 'Bulk purchase of 200 bags Hard Wheat Flour, Refined Sugar, Vegetable Shortening, and Dry Yeast',
    status: 'POSTED',
    cost_center_code: 'IND-PLANT',
    payee_vendor: 'San Miguel Mills / Ingredient Distributors Inc',
    total_amount: 280000.00,
    created_by: 'CPA Systems Architect',
    posted_at: '2025-01-10T14:00:00Z',
    created_at: '2025-01-10T14:00:00Z',
    lines: [
      { id: 'jel-301', account_code: '10301', debit_amount: 250000.00, credit_amount: 0, memo: 'Raw materials stock into Indangan plant warehouse', line_order: 1 },
      { id: 'jel-302', account_code: '10401', debit_amount: 30000.00, credit_amount: 0, memo: '12% Input VAT from VAT invoice', line_order: 2 },
      { id: 'jel-303', account_code: '20101', debit_amount: 0, credit_amount: 280000.00, memo: 'Payable on 30-day terms to flour miller', line_order: 3 }
    ]
  },

  // 4. Raw Materials Issued to Production (Baking Batch #01-15)
  {
    id: 'je-004',
    entry_number: 'JE-202501-1004',
    entry_date: '2025-01-15',
    reference_doc: 'MAT-REQ-2025-08',
    description: 'Direct raw materials issued from warehouse to mixing bowl for Indangan Plant bread batches',
    status: 'POSTED',
    cost_center_code: 'IND-PLANT',
    payee_vendor: 'Plant Production Department',
    total_amount: 140000.00,
    created_by: 'CPA Systems Architect',
    posted_at: '2025-01-15T18:00:00Z',
    created_at: '2025-01-15T18:00:00Z',
    lines: [
      { id: 'jel-401', account_code: '50101', debit_amount: 140000.00, credit_amount: 0, memo: 'Direct raw materials consumed in baking', line_order: 1 },
      { id: 'jel-402', account_code: '10301', debit_amount: 0, credit_amount: 140000.00, memo: 'Issuance reduction of raw material stock', line_order: 2 }
    ]
  },

  // 5. Factory Overhead - LPG Fuel & Davao Light Electric Power
  {
    id: 'je-005',
    entry_number: 'JE-202501-1005',
    entry_date: '2025-01-16',
    reference_doc: 'SI-33921 / Phoenix LPG & Davao Light #88912',
    description: 'Payment for oven industrial LPG cylinders and plant 3-phase electricity consumption',
    status: 'POSTED',
    cost_center_code: 'IND-PLANT',
    payee_vendor: 'Phoenix Petroleum & Davao Light Power Co',
    total_amount: 42560.00,
    created_by: 'CPA Systems Architect',
    posted_at: '2025-01-16T11:20:00Z',
    created_at: '2025-01-16T11:20:00Z',
    lines: [
      { id: 'jel-501', account_code: '50301', debit_amount: 18000.00, credit_amount: 0, memo: 'Industrial LPG cylinders for oven baking', line_order: 1 },
      { id: 'jel-502', account_code: '50302', debit_amount: 20000.00, credit_amount: 0, memo: 'Indangan Plant industrial 3-phase power', line_order: 2 },
      { id: 'jel-503', account_code: '10401', debit_amount: 4560.00, credit_amount: 0, memo: '12% Input VAT on utilities', line_order: 3 },
      { id: 'jel-504', account_code: '10102', debit_amount: 0, credit_amount: 42560.00, memo: 'Disbursement from BDO Current Account', line_order: 4 }
    ]
  },

  // 6. Retail Counter Sales (Sasa Branch & Outlets - Output VAT 12%)
  {
    id: 'je-006',
    entry_number: 'JE-202501-1006',
    entry_date: '2025-01-18',
    reference_doc: 'Z-READING-20250118 / BPI POS DEPOSIT',
    description: 'Daily cash collections from Sasa outlet and branch kiosks (Net sales + 12% Output VAT)',
    status: 'POSTED',
    cost_center_code: 'SAS-BRANCH',
    payee_vendor: 'Retail Outlet Customers',
    total_amount: 246400.00,
    created_by: 'CPA Systems Architect',
    posted_at: '2025-01-18T21:00:00Z',
    created_at: '2025-01-18T21:00:00Z',
    lines: [
      { id: 'jel-601', account_code: '10103', debit_amount: 246400.00, credit_amount: 0, memo: 'Collections deposited into BPI Operating Account', line_order: 1 },
      { id: 'jel-602', account_code: '40101', debit_amount: 0, credit_amount: 220000.00, memo: 'Vatable retail counter sales revenue', line_order: 2 },
      { id: 'jel-603', account_code: '20201', debit_amount: 0, credit_amount: 26400.00, memo: '12% Output VAT due to BIR', line_order: 3 }
    ]
  },

  // 7. Wholesale Distribution Sales to Supermarkets & Canteens (Receivable + Output VAT)
  {
    id: 'je-007',
    entry_number: 'JE-202501-1007',
    entry_date: '2025-01-20',
    reference_doc: 'DR-8819 / SI-0045 NCCC Supermarket',
    description: 'Wholesale delivery of sliced loaf bread and ensaymada packages on 15-day credit terms',
    status: 'POSTED',
    cost_center_code: 'LOG-DELIV',
    payee_vendor: 'NCCC Supermarket Group',
    total_amount: 112000.00,
    created_by: 'CPA Systems Architect',
    posted_at: '2025-01-20T16:00:00Z',
    created_at: '2025-01-20T16:00:00Z',
    lines: [
      { id: 'jel-701', account_code: '10201', debit_amount: 112000.00, credit_amount: 0, memo: 'Trade receivable from wholesale customer', line_order: 1 },
      { id: 'jel-702', account_code: '40102', debit_amount: 0, credit_amount: 100000.00, memo: 'Wholesale vatable bread sales', line_order: 2 },
      { id: 'jel-703', account_code: '20201', debit_amount: 0, credit_amount: 12000.00, memo: '12% Output VAT on wholesale invoice', line_order: 3 }
    ]
  },

  // 8. Delivery Van Diesel Fuel & Vehicle Upkeep (Logistics Cost Center)
  {
    id: 'je-008',
    entry_number: 'JE-202501-1008',
    entry_date: '2025-01-22',
    reference_doc: 'OR-88219 / Shell Bajada',
    description: 'Diesel fuel and engine oil replenishment for delivery van logistics fleet',
    status: 'POSTED',
    cost_center_code: 'LOG-DELIV',
    payee_vendor: 'Shell Bajada Service Station',
    total_amount: 14560.00,
    created_by: 'CPA Systems Architect',
    posted_at: '2025-01-22T09:45:00Z',
    created_at: '2025-01-22T09:45:00Z',
    lines: [
      { id: 'jel-801', account_code: '60202', debit_amount: 13000.00, credit_amount: 0, memo: 'Diesel fuel for wholesale delivery vans', line_order: 1 },
      { id: 'jel-802', account_code: '10401', debit_amount: 1560.00, credit_amount: 0, memo: '12% Input VAT on fuel receipts', line_order: 2 },
      { id: 'jel-803', account_code: '10101', debit_amount: 0, credit_amount: 14560.00, memo: 'Reimbursed from Petty Cash Fund', line_order: 3 }
    ]
  }
];

// ---------------------------------------------------------------------
// 2. STATE REPOSITORY CLASS
// ---------------------------------------------------------------------

export class ZBooksDatabase {
  private accounts: Account[] = [];
  private costCenters: CostCenter[] = [];
  private employees: Employee[] = [];
  private journalEntries: JournalEntry[] = [];
  private payrollRuns: PayrollRun[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.accounts = parsed.accounts || INITIAL_ACCOUNTS;
        this.costCenters = parsed.costCenters || INITIAL_COST_CENTERS;
        this.employees = parsed.employees || INITIAL_EMPLOYEES;
        this.journalEntries = parsed.journalEntries || INITIAL_JOURNAL_ENTRIES;
        this.payrollRuns = parsed.payrollRuns || [];
        return;
      }
    } catch (e) {
      console.warn("Storage load failed, initializing default seed", e);
    }

    this.resetToDefaults();
  }

  public resetToDefaults() {
    this.accounts = JSON.parse(JSON.stringify(INITIAL_ACCOUNTS));
    this.costCenters = JSON.parse(JSON.stringify(INITIAL_COST_CENTERS));
    this.employees = JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
    this.journalEntries = JSON.parse(JSON.stringify(INITIAL_JOURNAL_ENTRIES));
    this.payrollRuns = [];
    this.save();
  }

  public save() {
    try {
      const state = {
        accounts: this.accounts,
        costCenters: this.costCenters,
        employees: this.employees,
        journalEntries: this.journalEntries,
        payrollRuns: this.payrollRuns
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to persist Z-Books state to localStorage", e);
    }
  }

  // ACCOUNTS
  public getAccounts(): Account[] {
    return this.accounts;
  }

  public getAccount(code: string): Account | undefined {
    return this.accounts.find(a => a.account_code === code);
  }

  public addAccount(acc: Account): Account {
    this.accounts.push(acc);
    this.save();
    return acc;
  }

  // COST CENTERS
  public getCostCenters(): CostCenter[] {
    return this.costCenters;
  }

  // EMPLOYEES
  public getEmployees(): Employee[] {
    return this.employees;
  }

  public addEmployee(emp: Omit<Employee, 'id'>): Employee {
    const newEmp: Employee = {
      ...emp,
      id: `emp-${Date.now()}`
    };
    this.employees.push(newEmp);
    this.save();
    return newEmp;
  }

  // JOURNAL ENTRIES
  public getJournalEntries(): JournalEntry[] {
    return [...this.journalEntries].sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
  }

  public getJournalEntry(id: string): JournalEntry | undefined {
    return this.journalEntries.find(je => je.id === id);
  }

  /**
   * Save / Post Journal Entry with strict PRISMER Double-Entry Balancing
   */
  public saveJournalEntry(entryData: Omit<JournalEntry, 'id' | 'entry_number' | 'created_at' | 'total_amount'> & { id?: string }): { success: boolean; entry: JournalEntry; message: string } {
    // 1. Calculate sum of debits and sum of credits
    let sumDebit = 0;
    let sumCredit = 0;

    for (const l of entryData.lines) {
      const d = parseFloat(l.debit_amount as unknown as string) || 0;
      const c = parseFloat(l.credit_amount as unknown as string) || 0;
      if (d < 0 || c < 0) {
        throw new Error("Negative debits or credits are prohibited.");
      }
      if (d > 0 && c > 0) {
        throw new Error("A single line cannot have both a debit and credit amount.");
      }
      sumDebit += d;
      sumCredit += c;
    }

    const roundedDebit = Math.round(sumDebit * 100) / 100;
    const roundedCredit = Math.round(sumCredit * 100) / 100;
    const discrepancy = Math.round(Math.abs(roundedDebit - roundedCredit) * 100) / 100;

    // Enforce balancing for POSTED entries
    if (entryData.status === 'POSTED' && discrepancy > 0.001) {
      throw new Error(`422 Unprocessable Entity: Double-entry imbalance detected. Total Debits (₱${roundedDebit.toLocaleString()}) does not equal Total Credits (₱${roundedCredit.toLocaleString()}). Discrepancy: ₱${discrepancy.toFixed(2)}`);
    }

    let entry: JournalEntry;

    if (entryData.id) {
      const existing = this.journalEntries.find(j => j.id === entryData.id);
      if (!existing) throw new Error("Entry not found.");
      if (existing.status === 'POSTED') {
        throw new Error("Posted entries are immutable under PFRS for SMEs. To correct a posted entry, use the Reversing Entry feature.");
      }

      entry = {
        ...existing,
        ...entryData,
        total_amount: roundedDebit,
        posted_at: entryData.status === 'POSTED' ? new Date().toISOString() : undefined,
        lines: entryData.lines.map((l, idx) => ({ ...l, id: l.id || crypto.randomUUID(), line_order: idx + 1 }))
      };

      const index = this.journalEntries.findIndex(j => j.id === entryData.id);
      this.journalEntries[index] = entry;
    } else {
      const dateStr = entryData.entry_date || new Date().toISOString().slice(0, 10);
      const yyyymm = dateStr.replace(/-/g, '').slice(0, 6);
      const seq = Math.floor(1000 + Math.random() * 9000);
      const entryNumber = `JE-${yyyymm}-${seq}`;

      entry = {
        ...entryData,
        id: crypto.randomUUID(),
        entry_number: entryNumber,
        total_amount: roundedDebit,
        created_at: new Date().toISOString(),
        posted_at: entryData.status === 'POSTED' ? new Date().toISOString() : undefined,
        lines: entryData.lines.map((l, idx) => ({ ...l, id: l.id || crypto.randomUUID(), line_order: idx + 1 }))
      };

      this.journalEntries.unshift(entry);
    }

    this.save();
    return {
      success: true,
      entry,
      message: entry.status === 'POSTED' ? `Journal Entry ${entry.entry_number} successfully posted to General Ledger.` : `Journal Entry ${entry.entry_number} saved as DRAFT.`
    };
  }

  /**
   * Reverse a POSTED journal entry (Creates a linked reversing adjusting entry with swapped debits & credits)
   */
  public reverseJournalEntry(originalId: string, reason: string): JournalEntry {
    const original = this.journalEntries.find(j => j.id === originalId);
    if (!original) throw new Error("Original journal entry not found.");
    if (original.status !== 'POSTED') throw new Error("Only POSTED entries can be reversed.");

    const dateStr = new Date().toISOString().slice(0, 10);
    const yyyymm = dateStr.replace(/-/g, '').slice(0, 6);
    const seq = Math.floor(1000 + Math.random() * 9000);
    const revNumber = `JE-${yyyymm}-${seq}-REV`;

    const reversingLines: JournalEntryLine[] = original.lines.map((l, idx) => ({
      id: crypto.randomUUID(),
      account_code: l.account_code,
      account_name: l.account_name,
      debit_amount: l.credit_amount, // Swapped
      credit_amount: l.debit_amount, // Swapped
      memo: `Reversal of line ${idx + 1} (${original.entry_number}): ${l.memo || ''}`,
      line_order: idx + 1
    }));

    const reversingEntry: JournalEntry = {
      id: crypto.randomUUID(),
      entry_number: revNumber,
      entry_date: dateStr,
      reference_doc: `REV: ${original.entry_number}`,
      description: `REVERSAL: ${original.description} (${reason || 'Correction of entry'})`,
      status: 'POSTED',
      cost_center_code: original.cost_center_code,
      payee_vendor: original.payee_vendor,
      total_amount: original.total_amount,
      is_reversing: true,
      reversed_entry_id: original.id,
      created_by: 'CPA Reversal Adjuster',
      posted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      lines: reversingLines
    };

    this.journalEntries.unshift(reversingEntry);
    this.save();
    return reversingEntry;
  }

  // PAYROLL RUNS
  public getPayrollRuns(): PayrollRun[] {
    return this.payrollRuns;
  }

  public savePayrollRun(run: PayrollRun): PayrollRun {
    this.payrollRuns.unshift(run);
    this.save();
    return run;
  }

  // ---------------------------------------------------------------------
  // 3. FINANCIAL REPORTING ENGINES
  // ---------------------------------------------------------------------

  /**
   * General Ledger with Running Balance
   */
  public getGeneralLedger(accountCode: string, startDate?: string, endDate?: string): { account: Account; records: GeneralLedgerRecord[]; beginningBalance: number; endingBalance: number } {
    const acc = this.getAccount(accountCode);
    if (!acc) throw new Error("Account code not found.");

    let runningBalance = 0;
    const records: GeneralLedgerRecord[] = [];

    // Filter posted entries chronologically
    const sortedEntries = [...this.journalEntries]
      .filter(j => j.status === 'POSTED')
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());

    for (const je of sortedEntries) {
      if (startDate && je.entry_date < startDate) {
        // Compute beginning balance prior to start date
        for (const line of je.lines) {
          if (line.account_code === accountCode) {
            if (acc.normal_balance === 'DEBIT') {
              runningBalance += (line.debit_amount - line.credit_amount);
            } else {
              runningBalance += (line.credit_amount - line.debit_amount);
            }
          }
        }
        continue;
      }

      if (endDate && je.entry_date > endDate) {
        continue;
      }

      for (const line of je.lines) {
        if (line.account_code === accountCode) {
          if (acc.normal_balance === 'DEBIT') {
            runningBalance += (line.debit_amount - line.credit_amount);
          } else {
            runningBalance += (line.credit_amount - line.debit_amount);
          }

          records.push({
            date: je.entry_date,
            entry_number: je.entry_number,
            reference_doc: je.reference_doc,
            description: line.memo || je.description,
            cost_center_code: je.cost_center_code,
            debit: line.debit_amount,
            credit: line.credit_amount,
            balance: Math.round(runningBalance * 100) / 100
          });
        }
      }
    }

    return {
      account: acc,
      records,
      beginningBalance: 0,
      endingBalance: Math.round(runningBalance * 100) / 100
    };
  }

  /**
   * Trial Balance Aggregation
   */
  public getTrialBalance(startDate?: string, endDate?: string): { rows: TrialBalanceRow[]; totalDebits: number; totalCredits: number; isBalanced: boolean; discrepancy: number } {
    const balances: Record<string, { totalDebit: number; totalCredit: number }> = {};

    for (const acc of this.accounts) {
      balances[acc.account_code] = { totalDebit: 0, totalCredit: 0 };
    }

    for (const je of this.journalEntries) {
      if (je.status !== 'POSTED') continue;
      if (startDate && je.entry_date < startDate) continue;
      if (endDate && je.entry_date > endDate) continue;

      for (const line of je.lines) {
        if (!balances[line.account_code]) {
          balances[line.account_code] = { totalDebit: 0, totalCredit: 0 };
        }
        balances[line.account_code].totalDebit += line.debit_amount;
        balances[line.account_code].totalCredit += line.credit_amount;
      }
    }

    const rows: TrialBalanceRow[] = this.accounts.map(acc => {
      const b = balances[acc.account_code] || { totalDebit: 0, totalCredit: 0 };
      let debitBal = 0;
      let creditBal = 0;

      if (acc.normal_balance === 'DEBIT') {
        const net = b.totalDebit - b.totalCredit;
        if (net >= 0) debitBal = net;
        else creditBal = Math.abs(net);
      } else {
        const net = b.totalCredit - b.totalDebit;
        if (net >= 0) creditBal = net;
        else debitBal = Math.abs(net);
      }

      return {
        account_code: acc.account_code,
        account_name: acc.account_name,
        account_type: acc.account_type,
        category: acc.category,
        normal_balance: acc.normal_balance,
        total_debit: Math.round(b.totalDebit * 100) / 100,
        total_credit: Math.round(b.totalCredit * 100) / 100,
        debit_balance: Math.round(debitBal * 100) / 100,
        credit_balance: Math.round(creditBal * 100) / 100
      };
    }).filter(r => r.total_debit > 0 || r.total_credit > 0);

    const totalDebits = Math.round(rows.reduce((s, r) => s + r.debit_balance, 0) * 100) / 100;
    const totalCredits = Math.round(rows.reduce((s, r) => s + r.credit_balance, 0) * 100) / 100;
    const discrepancy = Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100;

    return {
      rows,
      totalDebits,
      totalCredits,
      isBalanced: discrepancy < 0.05,
      discrepancy
    };
  }

  /**
   * Statement of Comprehensive Income (P&L - Manufacturing COGS/COGM Model)
   */
  public getIncomeStatement(startDate?: string, endDate?: string) {
    const tb = this.getTrialBalance(startDate, endDate);
    
    // Revenue
    const retailSales = tb.rows.find(r => r.account_code === '40101')?.credit_balance || 0;
    const wholesaleSales = tb.rows.find(r => r.account_code === '40102')?.credit_balance || 0;
    const salesDiscounts = tb.rows.find(r => r.account_code === '40103')?.debit_balance || 0;
    const grossSales = retailSales + wholesaleSales;
    const netSales = grossSales - salesDiscounts;

    // Manufacturing Direct Costs
    const rawMaterials = tb.rows.find(r => r.account_code === '50101')?.debit_balance || 0;
    const packagingConsumed = tb.rows.find(r => r.account_code === '50102')?.debit_balance || 0;
    const directLaborBakers = tb.rows.find(r => r.account_code === '50201')?.debit_balance || 0;
    const directLaborSlicers = tb.rows.find(r => r.account_code === '50202')?.debit_balance || 0;
    const lpgFuel = tb.rows.find(r => r.account_code === '50301')?.debit_balance || 0;
    const plantElectricity = tb.rows.find(r => r.account_code === '50302')?.debit_balance || 0;
    const plantSanitation = tb.rows.find(r => r.account_code === '50303')?.debit_balance || 0;
    const machineMaintenance = tb.rows.find(r => r.account_code === '50304')?.debit_balance || 0;

    const directMaterialsTotal = rawMaterials + packagingConsumed;
    const directLaborTotal = directLaborBakers + directLaborSlicers;
    const factoryOverheadTotal = lpgFuel + plantElectricity + plantSanitation + machineMaintenance;
    const cogm = directMaterialsTotal + directLaborTotal + factoryOverheadTotal;
    const cogs = cogm; // Absorbed in period
    const grossProfit = netSales - cogs;

    // Operating Expenses
    const adminSalaries = tb.rows.find(r => r.account_code === '60101')?.debit_balance || 0;
    const sssEr = tb.rows.find(r => r.account_code === '60102')?.debit_balance || 0;
    const phicEr = tb.rows.find(r => r.account_code === '60103')?.debit_balance || 0;
    const hdmfEr = tb.rows.find(r => r.account_code === '60104')?.debit_balance || 0;
    const rent = tb.rows.find(r => r.account_code === '60201')?.debit_balance || 0;
    const deliveryFuel = tb.rows.find(r => r.account_code === '60202')?.debit_balance || 0;
    const storeUtilities = tb.rows.find(r => r.account_code === '60203')?.debit_balance || 0;
    const taxesPermits = tb.rows.find(r => r.account_code === '60301')?.debit_balance || 0;
    const deprMachinery = tb.rows.find(r => r.account_code === '60302')?.debit_balance || 0;
    const deprVehicles = tb.rows.find(r => r.account_code === '60303')?.debit_balance || 0;
    const officeSupplies = tb.rows.find(r => r.account_code === '60401')?.debit_balance || 0;

    const totalOpex = adminSalaries + sssEr + phicEr + hdmfEr + rent + deliveryFuel + storeUtilities + taxesPermits + deprMachinery + deprVehicles + officeSupplies;
    const netOperatingIncome = grossProfit - totalOpex;

    return {
      period: { startDate: startDate || '2025-01-01', endDate: endDate || '2025-12-31' },
      grossSales,
      salesDiscounts,
      netSales,
      directMaterials: {
        rawMaterials,
        packagingConsumed,
        total: directMaterialsTotal
      },
      directLabor: {
        bakers: directLaborBakers,
        slicersPackaging: directLaborSlicers,
        total: directLaborTotal
      },
      factoryOverhead: {
        lpgFuel,
        plantElectricity,
        plantSanitation,
        machineMaintenance,
        total: factoryOverheadTotal
      },
      cogm,
      cogs,
      grossProfit,
      grossMarginPct: netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(2) : "0.00",
      operatingExpenses: {
        adminSalaries,
        statutoryBenefitsER: sssEr + phicEr + hdmfEr,
        rent,
        deliveryFuel,
        storeUtilities,
        taxesPermits,
        depreciation: deprMachinery + deprVehicles,
        officeSupplies,
        total: totalOpex
      },
      netOperatingIncome,
      netProfitMarginPct: netSales > 0 ? ((netOperatingIncome / netSales) * 100).toFixed(2) : "0.00"
    };
  }

  /**
   * Balance Sheet (Assets = Liabilities + Owner Equity Verification)
   */
  public getBalanceSheet(asOfDate?: string) {
    const tb = this.getTrialBalance(undefined, asOfDate);
    const pnl = this.getIncomeStatement(undefined, asOfDate);

    const assetRows = tb.rows.filter(r => r.account_type === 'ASSET');
    const liabilityRows = tb.rows.filter(r => r.account_type === 'LIABILITY');
    const equityRows = tb.rows.filter(r => r.account_type === 'EQUITY');

    // Total Assets (Debit balances less credit contra-assets)
    let totalAssets = 0;
    for (const r of assetRows) {
      if (r.normal_balance === 'DEBIT') {
        totalAssets += (r.debit_balance - r.credit_balance);
      } else {
        totalAssets -= (r.credit_balance - r.debit_balance);
      }
    }

    // Total Liabilities
    let totalLiabilities = 0;
    for (const r of liabilityRows) {
      totalLiabilities += (r.credit_balance - r.debit_balance);
    }

    // Owner Equity + Current Period Net Operating Income
    let totalEquity = 0;
    for (const r of equityRows) {
      if (r.normal_balance === 'CREDIT') {
        totalEquity += (r.credit_balance - r.debit_balance);
      } else {
        totalEquity -= (r.debit_balance - r.credit_balance);
      }
    }
    // Add current period net income to equity
    totalEquity += pnl.netOperatingIncome;

    const totalLiabilitiesAndEquity = Math.round((totalLiabilities + totalEquity) * 100) / 100;
    const roundedAssets = Math.round(totalAssets * 100) / 100;
    const isBalanced = Math.abs(roundedAssets - totalLiabilitiesAndEquity) < 0.10;

    return {
      asOfDate: asOfDate || new Date().toISOString().slice(0, 10),
      assetRows,
      liabilityRows,
      equityRows,
      currentPeriodNetIncome: pnl.netOperatingIncome,
      totalAssets: roundedAssets,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      totalLiabilitiesAndEquity,
      isBalanced,
      imbalance: Math.round(Math.abs(roundedAssets - totalLiabilitiesAndEquity) * 100) / 100
    };
  }

  /**
   * BIR Form 2550Q (Quarterly Value-Added Tax Return)
   */
  public getBir2550Q(period: string = '2025-Q1'): BirForm2550QData {
    const tb = this.getTrialBalance();

    const retailSales = tb.rows.find(r => r.account_code === '40101')?.credit_balance || 0;
    const wholesaleSales = tb.rows.find(r => r.account_code === '40102')?.credit_balance || 0;
    const totalVatableSales = retailSales + wholesaleSales;
    const outputVat = Math.round(totalVatableSales * 0.12 * 100) / 100;

    // Input VAT breakdown from journal entries
    const rawMaterialsStock = tb.rows.find(r => r.account_code === '10301')?.debit_balance || 0;
    const capitalGoods = tb.rows.find(r => r.account_code === '10501')?.debit_balance || 0;
    const totalInputVatClaimed = tb.rows.find(r => r.account_code === '10401')?.debit_balance || 0;

    const inputVatRawMaterials = Math.round(rawMaterialsStock * 0.12 * 100) / 100;
    const inputVatCapital = Math.round(capitalGoods * 0.12 * 100) / 100;
    const inputVatServices = Math.max(0, totalInputVatClaimed - inputVatRawMaterials - inputVatCapital);

    const netVatPayable = Math.max(0, Math.round((outputVat - totalInputVatClaimed) * 100) / 100);
    const excessInputTax = Math.max(0, Math.round((totalInputVatClaimed - outputVat) * 100) / 100);

    return {
      entity_name: 'Jang-Jang Bakeshop (VAT Reg)',
      tin: '000-000-000-0000',
      period,
      vatable_sales_retail: retailSales,
      vatable_sales_wholesale: wholesaleSales,
      total_vatable_sales: totalVatableSales,
      output_vat_12: outputVat,
      raw_materials_purchases: rawMaterialsStock,
      input_vat_raw_materials: inputVatRawMaterials,
      capital_goods_purchases: capitalGoods,
      input_vat_capital_goods: inputVatCapital,
      services_purchases: Math.round(inputVatServices / 0.12 * 100) / 100,
      input_vat_services: inputVatServices,
      total_input_vat: totalInputVatClaimed,
      net_vat_payable: netVatPayable,
      excess_input_tax: excessInputTax
    };
  }

  /**
   * BIR Form 1701Q / 1701 (Quarterly/Annual Income Tax Return)
   * Offers 40% Optional Standard Deduction (OSD) vs Itemized OPEX Comparison
   */
  public getBir1701Q(period: string = '2025-Q1', deductionMethod: 'OSD' | 'ITEMIZED' = 'ITEMIZED'): BirForm1701QData {
    const pnl = this.getIncomeStatement();

    const grossSales = pnl.grossSales;
    const costOfSales = pnl.cogs;
    const grossIncome = Math.max(0, grossSales - costOfSales);

    // OSD under Philippine NIRC: 40% of Gross Revenue/Income for SMEs
    const osdDeduction = Math.round(grossIncome * 0.40 * 100) / 100;
    const itemizedDeduction = pnl.operatingExpenses.total;

    const chosenDeduction = deductionMethod === 'OSD' ? osdDeduction : itemizedDeduction;
    const netTaxableIncome = Math.max(0, Math.round((grossIncome - chosenDeduction) * 100) / 100);

    // Philippine SME corporate/sole proprietor income tax rate bracket (20% baseline)
    const taxDue = Math.round(netTaxableIncome * 0.20 * 100) / 100;

    return {
      entity_name: 'Jang-Jang Bakeshop',
      tin: '000-000-000-0000',
      period,
      gross_sales: grossSales,
      cost_of_sales: costOfSales,
      gross_income: grossIncome,
      deduction_method: deductionMethod,
      osd_deduction: osdDeduction,
      itemized_deduction: itemizedDeduction,
      net_taxable_income: netTaxableIncome,
      tax_rate_percentage: 20,
      tax_due: taxDue
    };
  }

  /**
   * BIR Form 1601-C (Monthly Remittance of Taxes Withheld on Compensation)
   */
  public getBir1601C(month: string = 'January 2025'): BirForm1601CData {
    const tb = this.getTrialBalance();

    const directLabor = tb.rows.find(r => r.account_code === '50201')?.debit_balance || 0;
    const adminSalaries = tb.rows.find(r => r.account_code === '60101')?.debit_balance || 0;
    const totalCompensation = directLabor + adminSalaries;

    const sssEe = (tb.rows.find(r => r.account_code === '20203')?.credit_balance || 0) * (4.5 / 14);
    const phicEe = (tb.rows.find(r => r.account_code === '20204')?.credit_balance || 0) * 0.5;
    const hdmfEe = (tb.rows.find(r => r.account_code === '20205')?.credit_balance || 0) * 0.5;
    const statutoryDeductionsTotal = Math.round((sssEe + phicEe + hdmfEe) * 100) / 100;

    // Minimum wage earners exemption
    const minWageExempt = Math.round(totalCompensation * 0.60 * 100) / 100;
    const totalNonTaxable = minWageExempt + statutoryDeductionsTotal;
    const taxableCompensation = Math.max(0, Math.round((totalCompensation - totalNonTaxable) * 100) / 100);

    const taxWithheld = tb.rows.find(r => r.account_code === '20202')?.credit_balance || 0;

    return {
      entity_name: 'Jang-Jang Bakeshop',
      tin: '000-000-000-0000',
      month,
      total_compensation_paid: totalCompensation,
      statutory_minimum_wage_exempt: minWageExempt,
      employee_statutory_contributions: statutoryDeductionsTotal,
      total_non_taxable_compensation: totalNonTaxable,
      total_taxable_compensation: taxableCompensation,
      tax_required_to_be_withheld: taxWithheld
    };
  }

  /**
   * Cost Center Expense & Manufacturing Breakdown
   */
  public getCostCenterBreakdown() {
    const centers: Record<string, { code: string; name: string; debits: number; entriesCount: number }> = {
      'IND-PLANT': { code: 'IND-PLANT', name: 'Indangan Production Plant', debits: 0, entriesCount: 0 },
      'SAS-BRANCH': { code: 'SAS-BRANCH', name: 'Sasa Retail Outlet & Oven', debits: 0, entriesCount: 0 },
      'LOG-DELIV': { code: 'LOG-DELIV', name: 'Logistics & Van Delivery', debits: 0, entriesCount: 0 },
      'ADM-HQ': { code: 'ADM-HQ', name: 'Executive & Administrative Office', debits: 0, entriesCount: 0 }
    };

    for (const je of this.journalEntries) {
      if (je.status !== 'POSTED') continue;
      const cc = je.cost_center_code;
      if (centers[cc]) {
        centers[cc].debits += je.total_amount;
        centers[cc].entriesCount += 1;
      }
    }

    return Object.values(centers);
  }

  /**
   * Export database state as Cloudflare D1 SQL statements
   */
  public exportD1SqlDump(): string {
    let sql = `-- ========================================================\n`;
    sql += `-- Z-BOOKS D1 DATABASE DUMP (Generated ${new Date().toISOString()})\n`;
    sql += `-- Entity: Jang-Jang Bakeshop (VAT TIN: 000-000-000-0000)\n`;
    sql += `-- ========================================================\n\n`;

    sql += `-- JOURNAL ENTRIES (${this.journalEntries.length})\n`;
    for (const je of this.journalEntries) {
      sql += `INSERT OR REPLACE INTO journal_entries (id, entry_number, entry_date, reference_doc, description, status, cost_center_code, payee_vendor, total_amount, created_by, posted_at) VALUES ('${je.id}', '${je.entry_number}', '${je.entry_date}', '${(je.reference_doc || '').replace(/'/g, "''")}', '${je.description.replace(/'/g, "''")}', '${je.status}', '${je.cost_center_code}', '${(je.payee_vendor || '').replace(/'/g, "''")}', ${je.total_amount}, '${je.created_by}', '${je.posted_at || ''}');\n`;
      for (const line of je.lines) {
        sql += `  INSERT OR REPLACE INTO journal_entry_lines (id, journal_entry_id, account_code, debit_amount, credit_amount, memo, line_order) VALUES ('${line.id}', '${je.id}', '${line.account_code}', ${line.debit_amount}, ${line.credit_amount}, '${(line.memo || '').replace(/'/g, "''")}', ${line.line_order});\n`;
      }
    }

    return sql;
  }
}

export const db = new ZBooksDatabase();
