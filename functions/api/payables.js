// ── AP Invoices + Payments (with BIR VAT/EWT GL entries) ──
// GET    /api/payables              → list AP invoices
// POST   /api/payables              → create AP invoice (auto GL: Debit COGS + Input VAT, Credit AP + EWT Payable)
// POST   /api/payables/:id/payment  → record payment (auto GL: Debit AP, Credit Cash)

import { audit } from './_audit.js';
import { recordChanges } from './_changeTrail.js';
import {
  ACCOUNTS, CASH_ACCOUNTS, computeAPtaxBreakdown,
  createJournalEntry, toCentavos,
} from './_tax.js';

export async function onRequestGet({ env }) {
  const result = await env.DB.prepare('SELECT * FROM ap_invoices ORDER BY created_at DESC').all();
  return json({ invoices: result.results });
}

export async function onRequestPost({ request, env, data, params }) {
  // ── Record Payment ──
  if (params.id && new URL(request.url).pathname.endsWith('/payment')) {
    return recordPayment(env, data, params.id, await request.json());
  }

  // ── Create Invoice ──
  const body = await request.json();
  const id = crypto.randomUUID();
  const invNum = await generateInvoiceNumber(env, 'AP');

  // ── Convert to centavos ──
  const amountCentavos = body.amount_centavos || toCentavos(body.amount || 0);
  const isVatSupplier = body.is_vat_supplier !== undefined ? (body.is_vat_supplier ? 1 : 0) : 1;

  // ── Compute AP tax breakdown ──
  const tax = computeAPtaxBreakdown({
    amount_centavos: amountCentavos,
    is_vat_supplier: isVatSupplier,
    vatable_purchase_centavos: body.vatable_purchase_centavos || 0,
    input_vat_centavos: body.input_vat_centavos || 0,
    ewt_atc_code: body.ewt_atc_code || null,
  });

  // ── GL Entry: AP Invoice ──
  let glLines;
  if (tax.is_vat_supplier) {
    // VAT Supplier:
    // Debit 5000 COGS: vatable purchase (net of VAT)
    // Debit 1160 Input VAT: 12% input VAT
    // Credit 2000 AP: net payable (after EWT)
    // Credit 2110 EWT Payable: EWT withheld
    glLines = [
      { account_code: ACCOUNTS.COGS, debit_centavos: tax.vatable_purchase_centavos, credit_centavos: 0 },
      { account_code: ACCOUNTS.INPUT_VAT, debit_centavos: tax.input_vat_centavos, credit_centavos: 0 },
      { account_code: ACCOUNTS.AP, debit_centavos: 0, credit_centavos: tax.ap_amount_centavos },
    ];
    if (tax.ewt_withheld_centavos > 0) {
      glLines.push({ account_code: ACCOUNTS.EWT_PAYABLE, debit_centavos: 0, credit_centavos: tax.ewt_withheld_centavos });
    }
  } else {
    // Non-VAT Supplier:
    // Debit 5000 COGS: full amount (no Input VAT)
    // Credit 2000 AP: full amount
    glLines = [
      { account_code: ACCOUNTS.COGS, debit_centavos: tax.non_vat_purchase_centavos, credit_centavos: 0 },
      { account_code: ACCOUNTS.AP, debit_centavos: 0, credit_centavos: tax.ap_amount_centavos },
    ];
  }

  const jeId = await createJournalEntry(env, {
    entry_date: body.invoice_date,
    description: `AP Invoice ${invNum} — ${body.supplier_name}`,
    reference: invNum,
    source_module: 'AP',
  }, glLines);

  // ── Create AP invoice with tax columns ──
  await env.DB.prepare(
    `INSERT INTO ap_invoices (
      id, invoice_number, supplier_id, supplier_name, supplier_tin, is_vat_supplier,
      wms_receiving_id, invoice_date, due_date,
      amount, amount_centavos, balance, balance_centavos,
      vatable_purchase_centavos, non_vat_purchase_centavos, input_vat_centavos,
      ewt_atc_code, ewt_withheld_centavos, status, journal_entry_id
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, invNum, body.supplier_id || null, body.supplier_name, body.supplier_tin || null, tax.is_vat_supplier,
    body.wms_receiving_id || null, body.invoice_date, body.due_date,
    tax.ap_amount_centavos / 100, tax.ap_amount_centavos,
    tax.ap_amount_centavos / 100, tax.ap_amount_centavos,
    tax.vatable_purchase_centavos, tax.non_vat_purchase_centavos, tax.input_vat_centavos,
    tax.ewt_atc_code, tax.ewt_withheld_centavos, 'Open', jeId
  ).run();

  await audit(env, data.user, 'CREATE', 'ap_invoices', id,
    `Created AP invoice ${invNum} for ${body.supplier_name} — VAT: ${tax.is_vat_supplier ? 'Yes' : 'No'}, EWT: ${(tax.ewt_withheld_centavos/100).toFixed(2)}`);

  await recordChanges(env, data.user, 'CREATE', 'ap_invoices', id, null, {
    supplier_name: body.supplier_name, supplier_tin: body.supplier_tin,
    is_vat_supplier: tax.is_vat_supplier, invoice_date: body.invoice_date, due_date: body.due_date,
    vatable_purchase_centavos: tax.vatable_purchase_centavos,
    non_vat_purchase_centavos: tax.non_vat_purchase_centavos,
    input_vat_centavos: tax.input_vat_centavos,
    ewt_atc_code: tax.ewt_atc_code, ewt_withheld_centavos: tax.ewt_withheld_centavos,
    status: 'Open',
  });

  const invoice = await env.DB.prepare('SELECT * FROM ap_invoices WHERE id = ?').bind(id).first();
  return json(invoice, 201);
}

// ── Edit AP Invoice (PUT) ──
export async function onRequestPut({ request, env, data, params }) {
  const id = params.id;
  const body = await request.json();
  const old = await env.DB.prepare('SELECT * FROM ap_invoices WHERE id = ?').bind(id).first();
  if (!old) return json({ error: 'Invoice not found' }, 404);

  const updates = {};
  const fields = ['supplier_name', 'supplier_tin', 'is_vat_supplier', 'invoice_date', 'due_date',
    'ewt_atc_code', 'status'];
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  // If purchase amounts are being edited, recompute tax
  if (body.vatable_purchase_centavos !== undefined || body.input_vat_centavos !== undefined ||
      body.non_vat_purchase_centavos !== undefined || body.ewt_withheld_centavos !== undefined) {
    const isVat = body.is_vat_supplier !== undefined ? (body.is_vat_supplier ? 1 : 0) : old.is_vat_supplier;
    const tax = computeAPtaxBreakdown({
      amount_centavos: (body.vatable_purchase_centavos ?? old.vatable_purchase_centavos) +
                       (body.input_vat_centavos ?? old.input_vat_centavos) +
                       (body.non_vat_purchase_centavos ?? old.non_vat_purchase_centavos),
      is_vat_supplier: isVat,
      vatable_purchase_centavos: body.vatable_purchase_centavos ?? old.vatable_purchase_centavos,
      input_vat_centavos: body.input_vat_centavos ?? old.input_vat_centavos,
      ewt_atc_code: body.ewt_atc_code ?? old.ewt_atc_code,
    });
    updates.vatable_purchase_centavos = tax.vatable_purchase_centavos;
    updates.non_vat_purchase_centavos = tax.non_vat_purchase_centavos;
    updates.input_vat_centavos = tax.input_vat_centavos;
    updates.ewt_atc_code = tax.ewt_atc_code;
    updates.ewt_withheld_centavos = tax.ewt_withheld_centavos;
    updates.amount_centavos = tax.ap_amount_centavos;
    if ((old.amount_paid_centavos || 0) === 0) {
      updates.balance_centavos = tax.ap_amount_centavos;
      updates.balance = tax.ap_amount_centavos / 100;
      updates.amount = tax.ap_amount_centavos / 100;
    }
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`);
  const setValues = Object.values(updates);
  setClauses.push("updated_at = datetime('now')");

  await env.DB.prepare(
    `UPDATE ap_invoices SET ${setClauses.join(', ')} WHERE id = ?`
  ).bind(...setValues, id).run();

  await audit(env, data.user, 'UPDATE', 'ap_invoices', id, `Edited AP invoice ${old.invoice_number}`);
  await recordChanges(env, data.user, 'UPDATE', 'ap_invoices', id, old, updates);

  const updated = await env.DB.prepare('SELECT * FROM ap_invoices WHERE id = ?').bind(id).first();
  return json(updated);
}

// ── Delete AP Invoice (DELETE) ──
export async function onRequestDelete({ env, data, params }) {
  const id = params.id;
  const old = await env.DB.prepare('SELECT * FROM ap_invoices WHERE id = ?').bind(id).first();
  if (!old) return json({ error: 'Invoice not found' }, 404);

  await env.DB.prepare('DELETE FROM ap_invoices WHERE id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM journal_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE reference = ?)').bind(old.invoice_number).run();
  await env.DB.prepare('DELETE FROM journal_entries WHERE reference = ?').bind(old.invoice_number).run();
  await audit(env, data.user, 'DELETE', 'ap_invoices', id, `Deleted AP invoice ${old.invoice_number}`);
  await recordChanges(env, data.user, 'DELETE', 'ap_invoices', id, old, null);
  return json({ success: true });
}

async function recordPayment(env, user, invoiceId, body) {
  const invoice = await env.DB.prepare('SELECT * FROM ap_invoices WHERE id = ?').bind(invoiceId).first();
  if (!invoice) return json({ error: 'Invoice not found' }, 404);

  const balanceCentavos = invoice.balance_centavos || toCentavos(invoice.balance);
  if (balanceCentavos <= 0) return json({ error: 'Invoice already paid' }, 400);

  const payAmountCentavos = body.amount_centavos || toCentavos(body.amount || 0);
  if (payAmountCentavos > balanceCentavos + 1) return json({ error: 'Payment exceeds balance' }, 400);

  const payId = crypto.randomUUID();
  const cashAccount = CASH_ACCOUNTS[body.payment_method] || ACCOUNTS.CASH_ON_HAND;

  // ── GL Entry: AP Payment ──
  // Debit 2000 AP: payment amount
  // Credit 1010 Cash: payment amount
  const glLines = [
    { account_code: ACCOUNTS.AP, debit_centavos: payAmountCentavos, credit_centavos: 0 },
    { account_code: cashAccount, debit_centavos: 0, credit_centavos: payAmountCentavos },
  ];

  const jeId = await createJournalEntry(env, {
    entry_date: body.payment_date,
    description: `AP Payment — ${invoice.invoice_number}`,
    reference: `PAY-${invoice.invoice_number}`,
    source_module: 'AP',
  }, glLines);

  // ── Record payment ──
  await env.DB.prepare(
    `INSERT INTO ap_payments (id, ap_invoice_id, payment_date, amount, amount_centavos, payment_method, reference, journal_entry_id)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(payId, invoiceId, body.payment_date,
    payAmountCentavos / 100, payAmountCentavos,
    body.payment_method || 'Cash', body.reference || null, jeId).run();

  // ── Update invoice balance + status ──
  const newBalance = balanceCentavos - payAmountCentavos;
  const newPaidCentavos = (invoice.amount_paid_centavos || 0) + payAmountCentavos;
  const newStatus = newBalance <= 1 ? 'Paid' : 'Partial';
  await env.DB.prepare(
    `UPDATE ap_invoices SET amount_paid = ?, amount_paid_centavos = ?, balance = ?, balance_centavos = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(
    newPaidCentavos / 100, newPaidCentavos,
    newBalance / 100, newBalance,
    newStatus, invoiceId
  ).run();

  await audit(env, user, 'PAYMENT', 'ap_invoices', invoiceId,
    `Recorded payment ₱${(payAmountCentavos/100).toFixed(2)} for ${invoice.invoice_number}`);
  return json({ success: true, new_balance_centavos: newBalance, status: newStatus });
}

async function generateInvoiceNumber(env, prefix) {
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await env.DB.prepare(
    "SELECT COUNT(*) as c FROM ap_invoices WHERE invoice_number LIKE ?"
  ).bind(`${prefix}-${ymd}-%`).first();
  const seq = String((count?.c || 0) + 1).padStart(4, '0');
  return `${prefix}-${ymd}-${seq}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
