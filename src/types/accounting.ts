/**
 * Z-Books TypeScript Definitions
 * Philippine SME Manufacturing & Retail Accounting, Payroll & BIR Tax Engine
 */

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COGS' | 'OPEX';
export type NormalBalance = 'DEBIT' | 'CREDIT';
export type EntryStatus = 'DRAFT' | 'POSTED' | 'VOID';
export type CostCenterCode = 'IND-PLANT' | 'SAS-BRANCH' | 'LOG-DELIV' | 'ADM-HQ';

export interface Account {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  category: string;
  description?: string;
  is_active: boolean;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id?: string;
  account_code: string;
  account_name?: string;
  debit_amount: number;
  credit_amount: number;
  memo: string;
  line_order: number;
}

export interface JournalEntry {
  id: string;
  entry_number: string; // Format: JE-YYYYMM-XXXX
  entry_date: string;    // YYYY-MM-DD
  reference_doc: string; // Invoice, PO, OR, Check #
  description: string;
  status: EntryStatus;
  cost_center_code: CostCenterCode;
  payee_vendor?: string;
  total_amount: number;
  is_reversing?: boolean;
  reversed_entry_id?: string;
  created_by: string;
  posted_at?: string;
  created_at: string;
  lines: JournalEntryLine[];
}

export interface CostCenter {
  code: CostCenterCode;
  name: string;
  location: string;
  manager: string;
}

export interface Employee {
  id: string;
  employee_id_number: string;
  full_name: string;
  station_role: 'Baker' | 'Slicer' | 'Wrapper' | 'Oven Master' | 'QA Inspector' | 'Delivery Driver' | 'Store Supervisor' | 'Accountant' | 'Cashier';
  cost_center_code: CostCenterCode;
  employment_status: 'REGULAR' | 'PROBATIONARY' | 'CONTRACTUAL';
  daily_rate: number;
  monthly_basic_rate: number;
  tin: string;
  sss_number: string;
  philhealth_number: string;
  pagibig_number: string;
  bank_account_number: string;
  hire_date: string;
  is_active: boolean;
}

export interface TimekeepingRecord {
  employee_id: string;
  days_worked: number;
  ot_hours: number;
  tardy_minutes: number;
  undertime_minutes: number;
  awol_days: number;
}

export interface PayrollComputedItem {
  employee_id: string;
  employee_name: string;
  employee_id_number: string;
  station_role: string;
  cost_center_code: CostCenterCode;
  daily_rate: number;
  monthly_basic_rate: number;
  days_worked: number;
  ot_hours: number;
  tardy_minutes: number;
  undertime_minutes: number;
  awol_days: number;
  
  // Earnings
  basic_pay: number;
  overtime_pay: number;
  perfect_attendance_bonus: number;
  gross_pay: number;

  // Deductions
  tardiness_deduction: number;
  undertime_deduction: number;
  awol_deduction: number;
  total_attendance_deduction: number;

  // Statutory EE
  sss_ee: number;
  philhealth_ee: number;
  pagibig_ee: number;
  withholding_tax: number;
  total_statutory_ee: number;

  // Statutory ER
  sss_er: number;
  philhealth_er: number;
  pagibig_er: number;
  total_statutory_er: number;

  total_deductions: number;
  net_pay: number;
}

export interface PayrollRun {
  id: string;
  run_number: string; // Format: PR-YYYYMM-XX
  period_start: string;
  period_end: string;
  payout_date: string;
  cycle: 'FIRST_HALF' | 'SECOND_HALF' | 'MONTHLY';
  status: 'DRAFT' | 'COMPUTED' | 'DISBURSED' | 'CANCELLED';
  total_gross: number;
  total_ee_deductions: number;
  total_er_contributions: number;
  total_net: number;
  journal_entry_id?: string;
  items: PayrollComputedItem[];
  created_at: string;
}

export interface GeneralLedgerRecord {
  date: string;
  entry_number: string;
  reference_doc: string;
  description: string;
  cost_center_code: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  category: string;
  normal_balance: NormalBalance;
  total_debit: number;
  total_credit: number;
  debit_balance: number;
  credit_balance: number;
}

export interface BirForm2550QData {
  entity_name: string;
  tin: string;
  period: string;
  vatable_sales_retail: number;
  vatable_sales_wholesale: number;
  total_vatable_sales: number;
  output_vat_12: number;
  raw_materials_purchases: number;
  input_vat_raw_materials: number;
  capital_goods_purchases: number;
  input_vat_capital_goods: number;
  services_purchases: number;
  input_vat_services: number;
  total_input_vat: number;
  net_vat_payable: number;
  excess_input_tax: number;
}

export interface BirForm1701QData {
  entity_name: string;
  tin: string;
  period: string;
  gross_sales: number;
  cost_of_sales: number;
  gross_income: number;
  deduction_method: 'OSD' | 'ITEMIZED';
  osd_deduction: number; // 40% of Gross Sales / Gross Income
  itemized_deduction: number;
  net_taxable_income: number;
  tax_rate_percentage: number;
  tax_due: number;
}

export interface BirForm1601CData {
  entity_name: string;
  tin: string;
  month: string;
  total_compensation_paid: number;
  statutory_minimum_wage_exempt: number;
  employee_statutory_contributions: number;
  total_non_taxable_compensation: number;
  total_taxable_compensation: number;
  tax_required_to_be_withheld: number;
}
