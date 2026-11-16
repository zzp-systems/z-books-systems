// ──────────────────────────────────────────────────────────
// JJB ARAP — Change Trail Helper
// Records field-level diffs for every CREATE/UPDATE/DELETE
// ──────────────────────────────────────────────────────────

// ── Field label maps (human-readable names for change trail display) ──
const FIELD_LABELS = {
  ar_invoices: {
    customer_name: 'Customer Name', customer_tin: 'Customer TIN',
    is_top_withholding_agent: 'Top Withholding Agent',
    invoice_date: 'Invoice Date', due_date: 'Due Date',
    vatable_sales_centavos: 'VATable Sales', vat_exempt_sales_centavos: 'VAT-Exempt Sales',
    zero_rated_sales_centavos: 'Zero-Rated Sales', output_vat_centavos: 'Output VAT (12%)',
    cwt_withheld_centavos: 'CWT Withheld', official_si_number: 'Official SI Number',
    bir_2307_ref: 'BIR 2307 Ref', status: 'Status',
  },
  ap_invoices: {
    supplier_name: 'Supplier Name', supplier_tin: 'Supplier TIN',
    is_vat_supplier: 'VAT Supplier', invoice_date: 'Invoice Date', due_date: 'Due Date',
    vatable_purchase_centavos: 'VATable Purchase', non_vat_purchase_centavos: 'Non-VAT Purchase',
    input_vat_centavos: 'Input VAT (12%)', ewt_atc_code: 'EWT ATC Code',
    ewt_withheld_centavos: 'EWT Withheld', status: 'Status',
  },
  chart_of_accounts: {
    account_code: 'Account Code', account_name: 'Account Name',
    account_type: 'Account Type', sub_type: 'Sub-Type', parent_account_code: 'Parent Account',
  },
  journal_entries: {
    entry_date: 'Entry Date', description: 'Description',
    reference: 'Reference', status: 'Status',
  },
};

// ── Centavos fields (display as pesos) ──
const CENTAVOS_FIELDS = new Set([
  'vatable_sales_centavos', 'vat_exempt_sales_centavos', 'zero_rated_sales_centavos',
  'output_vat_centavos', 'cwt_withheld_centavos', 'amount_centavos', 'balance_centavos',
  'vatable_purchase_centavos', 'non_vat_purchase_centavos', 'input_vat_centavos',
  'ewt_withheld_centavos', 'unit_cost_centavos', 'total_cost_centavos',
  'debit_centavos', 'credit_centavos',
]);

// ── Boolean fields (display as Yes/No) ──
const BOOL_FIELDS = new Set([
  'is_top_withholding_agent', 'is_vat_supplier', 'is_vat_exempt', 'is_primary',
  'is_active',
]);

export function formatValue(field, value) {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (CENTAVOS_FIELDS.has(field)) {
    return '₱' + (Number(value) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (BOOL_FIELDS.has(field)) return Number(value) === 1 || value === true ? 'Yes' : 'No';
  return String(value);
}

/**
 * Record field-level changes in the change_trail table.
 * @param {object} env - Cloudflare env with DB binding
 * @param {object} user - { username, role }
 * @param {string} action - 'CREATE' | 'UPDATE' | 'DELETE'
 * @param {string} entityType - table name (e.g., 'ar_invoices')
 * @param {string} entityId - record ID
 * @param {object|null} oldRecord - previous record (null for CREATE)
 * @param {object|null} newRecord - new record (null for DELETE)
 * @returns {array} changes recorded
 */
export async function recordChanges(env, user, action, entityType, entityId, oldRecord, newRecord) {
  const labels = FIELD_LABELS[entityType] || {};
  const changes = [];

  if (action === 'CREATE' && newRecord) {
    for (const [field, value] of Object.entries(newRecord)) {
      if (labels[field] && value !== null && value !== undefined && value !== '') {
        changes.push({ field: labels[field], old_value: null, new_value: formatValue(field, value) });
      }
    }
  } else if (action === 'UPDATE' && oldRecord && newRecord) {
    for (const field of Object.keys(newRecord)) {
      if (!labels[field]) continue;
      const oldVal = oldRecord[field];
      const newVal = newRecord[field];
      if (String(oldVal ?? '') !== String(newVal ?? '') && newVal !== undefined) {
        changes.push({
          field: labels[field],
          old_value: formatValue(field, oldVal),
          new_value: formatValue(field, newVal),
        });
      }
    }
  } else if (action === 'DELETE' && oldRecord) {
    changes.push({ field: '__record_deleted__', old_value: 'Record deleted', new_value: null });
  }

  for (const c of changes) {
    await env.DB.prepare(
      `INSERT INTO change_trail (id, entity_type, entity_id, action, field_name, old_value, new_value, changed_by, changed_at)
       VALUES (?,?,?,?,?,?,?,datetime('now'))`
    ).bind(crypto.randomUUID(), entityType, entityId, action, c.field, c.old_value, c.new_value, user?.username || 'system').run();
  }

  return changes;
}
