// ── AR Invoices + Payments (with BIR VAT/CWT GL entries) ──
// GET    /api/invoices              → list AR invoices
// POST   /api/invoices              → create AR invoice (auto GL: Debit AR, Credit Revenue + Output VAT)
// POST   /api/invoices/:id/payment  → record payment (auto GL: Debit Cash + CWT, Credit AR)

import { audit } from './_audit.js';
import {
  ACCOUNTS, CASH_ACCOUNTS, computeARtaxBreakdown, computeCWT,
  createJournalEntry, toCentavos,
} from './_tax.js';

export async function onRequestGet({ env }) {
  const result = await env.DB.prepare('SELECT * FROM ar_invoices ORDER BY created_at DESC').all();
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
  const invNum = await generateInvoiceNumber(env, 'AR');

  // ── Convert to centavos ──
  const amountCentavos = body.amount_centavos || toCentavos(body.amount || 0);

  // ── Compute VAT breakdown ──
  const tax = computeARtaxBreakdown({
    amount_centavos: amountCentavos,
    vatable_sales_centavos: body.vatable_sales_centavos || 0,
    vat_exempt_sales_centavos: body.vat_exempt_sales_centavos || 0,
    zero_rated_sales_centavos: body.zero_rated_sales_centavos || 0,
    output_vat_centavos: body.output_vat_centavos || 0,
  });

  // ── GL Entry: AR Invoice (VAT-registered sale) ──
  const glLines = [
    { account_code: ACCOUNTS.AR, debit_centavos: tax.total_centavos, credit_centavos: 0 },
    { account_code: ACCOUNTS.SALES_VATABLE, debit_centavos: 0, credit_centavos: tax.vatable_sales_centavos },
    { account_code: ACCOUNTS.OUTPUT_VAT, debit_centavos: 0, credit_centavos: tax.output_vat_centavos },
  ];
  if (tax.vat_exempt_sales_centavos > 0) {
    glLines.push({ account_code: ACCOUNTS.SALES_VAT_EXEMPT, debit_centavos: 0, credit_centavos: tax.vat_exempt_sales_centavos });
  }
  if (tax.zero_rated_sales_centavos > 0) {
    glLines.push({ account_code: ACCOUNTS.SALES_VATABLE, debit_centavos: 0, credit_centavos: tax.zero_rated_sales_centavos, description: 'Zero-rated sales' });
  }

  const jeId = await createJournalEntry(env, {
    entry_date: body.invoice_date,
    description: `AR Invoice ${invNum} — ${body.customer_name}`,
    reference: invNum,
    source_module: 'AR',
  }, glLines);

  // ── Create AR invoice with tax columns ──
  await env.DB.prepare(
    `INSERT INTO ar_invoices (
      id, invoice_number, customer_id, customer_name, customer_tin,
      is_top_withholding_agent, crm_deal_id, wms_order_id,
      invoice_date, due_date, amount, amount_centavos, balance, balance_centavos,
      vatable_sales_centavos, vat_exempt_sales_centavos, zero_rated_sales_centavos,
      output_vat_centavos, official_si_number, status, journal_entry_id
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, invNum, body.customer_id || null, body.customer_name, body.customer_tin || null,
    body.is_top_withholding_agent || 0, body.crm_deal_id || null, body.wms_order_id || null,
    body.invoice_date, body.due_date,
    tax.total_centavos / 100, tax.total_centavos,
    tax.total_centavos / 100, tax.total_centavos,
    tax.vatable_sales_centavos, tax.vat_exempt_sales_centavos, tax.zero_rated_sales_centavos,
    tax.output_vat_centavos, body.official_si_number || null,
    'Open', jeId
  ).run();

  await audit(env, data.user, 'CREATE', 'ar_invoices', id,
    `Created AR invoice ${invNum} for ${body.customer_name} — VATable: ${(tax.vatable_sales_centavos/100).toFixed(2)}, VAT: ${(tax.output_vat_centavos/100).toFixed(2)}`);
  const invoice = await env.DB.prepare('SELECT * FROM ar_invoices WHERE id = ?').bind(id).first();
  return json(invoice, 201);
}

async function recordPayment(env, user, invoiceId, body) {
  const invoice = await env.DB.prepare('SELECT * FROM ar_invoices WHERE id = ?').bind(invoiceId).first();
  if (!invoice) return json({ error: 'Invoice not found' }, 404);

  const balanceCentavos = invoice.balance_centavos || toCentavos(invoice.balance);
  if (balanceCentavos <= 0) return json({ error: 'Invoice already paid' }, 400);

  // ── Payment amount in centavos ──
  const payAmountCentavos = body.amount_centavos || toCentavos(body.amount || 0);

  // ── CWT computation (if customer is a Top Withholding Agent) ──
  // 1% of VATable sales base, deducted by the buyer upon payment
  let cwtCentavos = body.cwt_withheld_centavos || 0;
  if (invoice.is_top_withholding_agent && cwtCentavos === 0 && !body.cwt_manual) {
    cwtCentavos = computeCWT(invoice.vatable_sales_centavos || 0);
  }

  // Total to apply against AR: cash received + CWT
  const totalApplied = payAmountCentavos + cwtCentavos;
  if (totalApplied > balanceCentavos + 1) return json({ error: 'Payment + CWT exceeds balance' }, 400);

  const payId = crypto.randomUUID();
  const cashAccount = CASH_ACCOUNTS[body.payment_method] || ACCOUNTS.CASH_ON_HAND;

  // ── GL Entry: AR Payment ──
  // Debit 1010 Cash in Bank: cash received (net of CWT)
  // Debit 1150 CWT: withholding tax deducted by buyer (if TWA)
  // Credit 1100 AR: full invoice amount
  const glLines = [
    { account_code: cashAccount, debit_centavos: payAmountCentavos, credit_centavos: 0 },
    { account_code: ACCOUNTS.AR, debit_centavos: 0, credit_centavos: totalApplied },
  ];
  if (cwtCentavos > 0) {
    glLines.push({ account_code: ACCOUNTS.CWT, debit_centavos: cwtCentavos, credit_centavos: 0, description: 'CWT per BIR 2307' });
  }

  const jeId = await createJournalEntry(env, {
    entry_date: body.payment_date,
    description: `AR Payment — ${invoice.invoice_number}`,
    reference: `PAY-${invoice.invoice_number}`,
    source_module: 'AR',
  }, glLines);

  // ── Record payment ──
  await env.DB.prepare(
    `INSERT INTO ar_payments (id, ar_invoice_id, payment_date, amount, amount_centavos, payment_method, reference, cwt_withheld_centavos, bir_2307_ref, journal_entry_id)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(payId, invoiceId, body.payment_date,
    payAmountCentavos / 100, payAmountCentavos,
    body.payment_method || 'Cash', body.reference || null,
    cwtCentavos, body.bir_2307_ref || null, jeId).run();

  // ── Update invoice balance + status ──
  const newBalance = balanceCentavos - totalApplied;
  const newPaidCentavos = (invoice.amount_paid_centavos || 0) + totalApplied;
  const newStatus = newBalance <= 1 ? 'Paid' : 'Partial';
  await env.DB.prepare(
    `UPDATE ar_invoices SET amount_paid = ?, amount_paid_centavos = ?, balance = ?, balance_centavos = ?, cwt_withheld_centavos = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(
    newPaidCentavos / 100, newPaidCentavos,
    newBalance / 100, newBalance,
    (invoice.cwt_withheld_centavos || 0) + cwtCentavos,
    newStatus, invoiceId
  ).run();

  await audit(env, user, 'PAYMENT', 'ar_invoices', invoiceId,
    `Recorded payment ₱${(payAmountCentavos/100).toFixed(2)}${cwtCentavos > 0 ? ` + CWT ₱${(cwtCentavos/100).toFixed(2)}` : ''} for ${invoice.invoice_number}`);
  return json({ success: true, new_balance_centavos: newBalance, cwt_withheld_centavos: cwtCentavos, status: newStatus });
}

async function generateInvoiceNumber(env, prefix) {
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await env.DB.prepare(
    "SELECT COUNT(*) as c FROM ar_invoices WHERE invoice_number LIKE ?"
  ).bind(`${prefix}-${ymd}-%`).first();
  const seq = String((count?.c || 0) + 1).padStart(4, '0');
  return `${prefix}-${ymd}-${seq}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
