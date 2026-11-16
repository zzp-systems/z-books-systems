// ──────────────────────────────────────────────────────────
// JJB ARAP — Shared Philippine Tax Computation Helper
// Centralizes VAT (12%), EWT, and CWT calculations in centavos.
// All monetary values are INTEGER centavos (₱1.00 = 100).
// ──────────────────────────────────────────────────────────

// ── BIR Tax Rates ──
export const VAT_RATE = 0.12;       // 12% Output VAT on VATable sales
export const CWT_RATE_GOODS = 0.01; // 1% Creditable Withholding Tax (deducted by Top Withholding Agents on goods)
export const EWT_RATE_GOODS = 0.01; // 1% Expanded Withholding Tax on goods (WC158)
export const EWT_RATE_SERVICES = 0.02; // 2% EWT on services (WC160)

// ── GL Account Codes (Master COA — 77 accounts) ──
export const ACCOUNTS = {
  // Cash
  CASH_ON_HAND:    '1000',
  CASH_IN_BANK:    '1010',
  CASH_GCASH:      '1020',
  // Receivables
  AR:              '1100',
  EMPLOYEE_ADVANCES: '1101',  // Child of 1100
  STAFF_ASSISTANCE_RECV: '1102', // Child of 1100
  CWT:             '1150',  // Creditable Withholding Tax (BIR 2307)
  INPUT_VAT:       '1160',  // Input VAT — Goods & Services
  SUPPLIES_INV:    '1170',  // Supplies Inventory (Office / Janitorial)
  ALLOWANCE_DOUBTFUL: '1180', // Allowance for Doubtful Accounts
  // Inventory
  INVENTORY_RAW:   '1200',
  RAW_MATERIAL_INPUTS: '1201', // Child of 1200
  INVENTORY_FG:    '1210',
  TRADING_PURCHASES: '1211',   // Child of 1210
  // Fixed Assets
  EQUIPMENT:       '1500',
  FURNITURE:       '1501',  // Child of 1500
  TOOLS_MACHINERY: '1502',  // Child of 1500
  OFFICE_EQUIP:    '1503',  // Child of 1500
  ACCUM_DEP:       '1510',  // Accumulated Depreciation
  // Liabilities
  AP:              '2000',
  OUTPUT_VAT:      '2100',  // Output VAT Payable (12% collected)
  EWT_PAYABLE:     '2110',  // Expanded Withholding Tax Payable (1601-EQ)
  WTAX_COMPENSATION: '2200', // Withholding Tax Payable - Compensation
  SALARIES_PAYABLE: '2300',
  // Equity
  OWNERS_CAPITAL:  '3000',
  RETAINED_EARNINGS: '3100',
  // Revenue
  SALES_REVENUE:   '4000',  // Legacy control account
  SALES_DISCOUNTS: '4001',  // Child of 4000 (contra-revenue)
  SALES_VATABLE:   '4010',  // Sales Revenue — VATable
  SALES_VAT_EXEMPT:'4020',  // Sales Revenue — VAT-Exempt
  OTHER_INCOME:    '4100',
  // Expenses — COGS & Production
  COGS:            '5000',
  RAW_MATERIALS_EXP: '5100',
  WORKSHOP_CONSUMABLES: '5101', // Child of 5100
  DIRECT_LABOR:    '5200',
  // Expenses — Utilities
  UTILITIES_EXP:   '5300',
  ELECTRICITY_WATER: '5301',  // Child of 5300
  TELECOM_INTERNET: '5302',   // Child of 5300
  // Expenses — Rent
  RENT_EXPENSE:    '5400',
  RENT_OFFICE:     '5401',  // Child of 5400
  // Expenses — Marketing
  MARKETING_EXP:   '5500',
  ADVERTISING:     '5501',  // Child of 5500
  SAMPLES_GIVEAWAYS: '5502', // Child of 5500
  EVENTS_MEALS:    '5503',  // Child of 5500
  // Expenses — Salaries
  SALARIES_EXP:    '5600',
  SALARIES_WAGES:  '5601',  // Child of 5600
  DRIVER_ALLOWANCE: '5602', // Child of 5600
  HELPER_ALLOWANCE: '5603', // Child of 5600
  EMPLOYEE_MEALS:  '5604',  // Child of 5600
  EMPLOYEE_MEDICAL: '5605', // Child of 5600
  EMPLOYEE_DENTAL: '5606', // Child of 5600
  TEAM_EVENTS:     '5607',  // Child of 5600
  // Expenses — Transportation
  TRANSPORT_DISTRIBUTION: '5700',
  FUEL_OIL:        '5701',  // Child of 5700
  FREIGHT_OUT:     '5702',  // Child of 5700
  TRAVEL:          '5703',  // Child of 5700
  // Expenses — Depreciation & Repairs
  DEPRECIATION_AMORT: '5800',
  DEPRECIATION:    '5801',  // Child of 5800
  REPAIRS_MAINT:   '5810',
  // Expenses — Taxes & Licenses
  TAXES_LICENSES:  '5820',
  // Expenses — Other
  OTHER_EXPENSES:  '5900',
  VEHICLE_REPAIRS: '5901',  // Child of 5900
  POSTAGE:         '5902',  // Child of 5900
  BUILDING_REPAIRS: '5903', // Child of 5900
  JANITORIAL:      '5904',  // Child of 5900
  TOOLS_CONSUMABLES: '5905', // Child of 5900
  OFFICE_SUPPLIES: '5906',  // Child of 5900
  PRINTING:         '5907', // Child of 5900
  BANK_CHARGES:    '5908',  // Child of 5900
  LICENSES_PERMITS: '5909', // Child of 5900
  FINES_PENALTIES:  '5910', // Child of 5900
  MISC_EXPENSE:    '5911',  // Child of 5900
  RELIGIOUS_WORSHIP: '5990', // Child of 5900
  EVANGELISM_CSR:  '5991',  // Child of 5900
};

// ── Cash account mapping by payment method ──
export const CASH_ACCOUNTS = {
  'Cash':          ACCOUNTS.CASH_ON_HAND,
  'Bank Transfer': ACCOUNTS.CASH_IN_BANK,
  'Check':         ACCOUNTS.CASH_IN_BANK,
  'GCash':         ACCOUNTS.CASH_GCASH,
};

// ── EWT ATC codes ──
export const EWT_ATC = {
  WC158: { code: 'WC158', rate: EWT_RATE_GOODS,    desc: '1% Goods' },
  WC160: { code: 'WC160', rate: EWT_RATE_SERVICES, desc: '2% Services' },
};

// ── Rounding helper (round half up) ──
export function roundCentavos(n) {
  return Math.round(n);
}

// ── Convert pesos (float) to centavos (integer) ──
export function toCentavos(pesos) {
  if (!pesos || isNaN(pesos)) return 0;
  return Math.round(pesos * 100);
}

// ── Convert centavos (integer) to pesos (float) ──
export function toPesos(centavos) {
  if (!centavos || isNaN(centavos)) return 0;
  return centavos / 100;
}

// ──────────────────────────────────────────────────────────
// AR Tax Computations
// ──────────────────────────────────────────────────────────

/**
 * Compute AR invoice tax breakdown from a VAT-inclusive total.
 * If the seller provides an explicit vatable/vat-exempt split, use that.
 * Otherwise, treat the entire amount as VATable (12% VAT-inclusive).
 *
 * @param {object} input - { amount_centavos, vatable_sales_centavos?, vat_exempt_sales_centavos?, zero_rated_sales_centavos? }
 * @returns {object} { vatable_sales_centavos, vat_exempt_sales_centavos, zero_rated_sales_centavos, output_vat_centavos, total_centavos }
 */
export function computeARtaxBreakdown(input = {}) {
  const vatExempt = input.vat_exempt_sales_centavos || 0;
  const zeroRated = input.zero_rated_sales_centavos || 0;

  let vatable, outputVat;

  if (input.vatable_sales_centavos && input.vatable_sales_centavos > 0) {
    // Explicit vatable base provided — compute VAT on top
    vatable = input.vatable_sales_centavos;
    outputVat = roundCentavos(vatable * VAT_RATE);
  } else if (input.output_vat_centavos && input.output_vat_centavos > 0) {
    // Explicit output VAT provided — back-calculate vatable base
    outputVat = input.output_vat_centavos;
    vatable = roundCentavos(outputVat / VAT_RATE);
  } else {
    // Treat the remaining amount (after exempt + zero-rated) as VAT-inclusive
    const remaining = (input.amount_centavos || 0) - vatExempt - zeroRated;
    vatable = roundCentavos(remaining / (1 + VAT_RATE));
    outputVat = (input.amount_centavos || 0) - vatExempt - zeroRated - vatable;
  }

  const total = vatable + outputVat + vatExempt + zeroRated;

  return {
    vatable_sales_centavos: vatable,
    vat_exempt_sales_centavos: vatExempt,
    zero_rated_sales_centavos: zeroRated,
    output_vat_centavos: outputVat,
    total_centavos: total,
  };
}

/**
 * Compute CWT (Creditable Withholding Tax) for AR payment collection.
 * 1% of the VATable sales base, deducted by Top Withholding Agents.
 *
 * @param {number} vatableSalesCentavos - The VATable base from the invoice
 * @returns {number} CWT amount in centavos
 */
export function computeCWT(vatableSalesCentavos) {
  return roundCentavos(vatableSalesCentavos * CWT_RATE_GOODS);
}

// ──────────────────────────────────────────────────────────
// AP Tax Computations
// ──────────────────────────────────────────────────────────

/**
 * Compute AP invoice tax breakdown.
 * For VAT suppliers: split into vatable purchase + 12% input VAT, apply EWT.
 * For Non-VAT suppliers: full amount is non-VAT purchase, no input VAT, no EWT.
 *
 * @param {object} input - { amount_centavos, is_vat_supplier, ewt_atc_code?, vatable_purchase_centavos? }
 * @returns {object} tax breakdown with GL-ready amounts
 */
export function computeAPtaxBreakdown(input = {}) {
  const amount = input.amount_centavos || 0;
  const isVat = input.is_vat_supplier !== 0 && input.is_vat_supplier !== false;

  if (!isVat) {
    // Non-VAT supplier (e.g., farmers, wet-market)
    return {
      is_vat_supplier: 0,
      vatable_purchase_centavos: 0,
      non_vat_purchase_centavos: amount,
      input_vat_centavos: 0,
      ewt_atc_code: null,
      ewt_withheld_centavos: 0,
      ap_amount_centavos: amount,  // Full amount payable
    };
  }

  // VAT supplier — split VAT-inclusive amount
  let vatablePurchase, inputVat;

  if (input.vatable_purchase_centavos && input.vatable_purchase_centavos > 0) {
    vatablePurchase = input.vatable_purchase_centavos;
    inputVat = roundCentavos(vatablePurchase * VAT_RATE);
  } else if (input.input_vat_centavos && input.input_vat_centavos > 0) {
    inputVat = input.input_vat_centavos;
    vatablePurchase = roundCentavos(inputVat / VAT_RATE);
  } else {
    // VAT-inclusive: back-calculate
    vatablePurchase = roundCentavos(amount / (1 + VAT_RATE));
    inputVat = amount - vatablePurchase;
  }

  // EWT — determine rate from ATC code or default to 1% goods
  let ewtRate = 0;
  let ewtAtcCode = input.ewt_atc_code || null;

  if (ewtAtcCode && EWT_ATC[ewtAtcCode]) {
    ewtRate = EWT_ATC[ewtAtcCode].rate;
  } else {
    // Default: 1% EWT on goods (WC158) if no ATC specified
    ewtRate = EWT_RATE_GOODS;
    ewtAtcCode = 'WC158';
  }

  const ewtWithheld = roundCentavos(vatablePurchase * ewtRate);
  const apAmount = amount - ewtWithheld;

  return {
    is_vat_supplier: 1,
    vatable_purchase_centavos: vatablePurchase,
    non_vat_purchase_centavos: 0,
    input_vat_centavos: inputVat,
    ewt_atc_code: ewtAtcCode,
    ewt_withheld_centavos: ewtWithheld,
    ap_amount_centavos: apAmount,
  };
}

// ──────────────────────────────────────────────────────────
// GL Journal Entry Builder
// Creates a balanced journal entry with centavos-based lines.
// ──────────────────────────────────────────────────────────

/**
 * Insert a journal entry + lines into D1.
 * @param {object} env - Cloudflare env with DB binding
 * @param {object} meta - { entry_date, description, reference, source_module }
 * @param {array} lines - [{ account_code, debit_centavos, credit_centavos, description? }]
 * @returns {string} journal entry ID
 */
export async function createJournalEntry(env, meta, lines) {
  const jeId = crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO journal_entries (id, entry_date, description, reference, source_module, status) VALUES (?,?,?,?,?,?)'
  ).bind(
    jeId,
    meta.entry_date,
    meta.description || null,
    meta.reference || null,
    meta.source_module || 'Manual',
    'Posted'
  ).run();

  for (const line of lines) {
    const debitC = line.debit_centavos || 0;
    const creditC = line.credit_centavos || 0;
    // Write centavos to new columns; also write pesos to legacy REAL columns for backward compat
    await env.DB.prepare(
      `INSERT INTO journal_lines (entry_id, account_code, debit, credit, debit_centavos, credit_centavos, description)
       VALUES (?,?,?,?,?,?,?)`
    ).bind(
      jeId,
      line.account_code,
      debitC / 100,       // legacy REAL (pesos)
      creditC / 100,      // legacy REAL (pesos)
      debitC,             // new INTEGER (centavos)
      creditC,            // new INTEGER (centavos)
      line.description || null
    ).run();
  }

  return jeId;
}
