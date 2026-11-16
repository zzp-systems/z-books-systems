// ── AR Invoice Payment: POST /api/invoices/:id/payment ──
// Records a payment against an AR invoice with CWT handling.
// Auto-creates GL entry: Debit Cash + CWT, Credit AR.

import { audit } from '../../_audit.js';
import { recordChanges } from '../../_changeTrail.js';
import {
  ACCOUNTS, CASH_ACCOUNTS, computeCWT, createJournalEntry, toCentavos,
} from '../../_tax.js';

export async function onRequestPost({ request, env, data, params }) {
  const invoiceId = params.id;
  const body = await request.json();

  const invoice = await env.DB.prepare('SELECT * FROM ar_invoices WHERE id = ?').bind(invoiceId).first();
  if (!invoice) return json({ error: 'Invoice not found' }, 404);

  const balanceCentavos = invoice.balance_centavos || toCentavos(invoice.balance);
  if (balanceCentavos <= 0) return json({ error: 'Invoice already paid' }, 400);

  const payAmountCentavos = body.amount_centavos || toCentavos(body.amount || 0);

  // ── CWT computation (if customer is a Top Withholding Agent) ──
  let cwtCentavos = body.cwt_withheld_centavos || 0;
  if (invoice.is_top_withholding_agent && cwtCentavos === 0 && !body.cwt_manual) {
    cwtCentavos = computeCWT(invoice.vatable_sales_centavos || 0);
  }

  const totalApplied = payAmountCentavos + cwtCentavos;
  if (totalApplied > balanceCentavos + 1) return json({ error: 'Payment + CWT exceeds balance' }, 400);

  const payId = crypto.randomUUID();
  const cashAccount = CASH_ACCOUNTS[body.payment_method] || ACCOUNTS.CASH_ON_HAND;

  // ── GL Entry: AR Payment ──
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

  await audit(env, data.user, 'PAYMENT', 'ar_invoices', invoiceId,
    `Recorded payment ₱${(payAmountCentavos/100).toFixed(2)}${cwtCentavos > 0 ? ` + CWT ₱${(cwtCentavos/100).toFixed(2)}` : ''} for ${invoice.invoice_number}`);

  await recordChanges(env, data.user, 'PAYMENT', 'ar_invoices', invoiceId, 
    { balance_centavos: balanceCentavos, status: invoice.status },
    { balance_centavos: newBalance, status: newStatus });

  return json({ success: true, new_balance_centavos: newBalance, cwt_withheld_centavos: cwtCentavos, status: newStatus });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
