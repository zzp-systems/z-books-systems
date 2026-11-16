// ── AP Invoice Payment: POST /api/payables/:id/payment ──
// Records a payment against an AP invoice.
// Auto-creates GL entry: Debit AP, Credit Cash.

import { audit } from '../../_audit.js';
import { recordChanges } from '../../_changeTrail.js';
import {
  ACCOUNTS, CASH_ACCOUNTS, createJournalEntry, toCentavos,
} from '../../_tax.js';

export async function onRequestPost({ request, env, data, params }) {
  const invoiceId = params.id;
  const body = await request.json();

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

  await audit(env, data.user, 'PAYMENT', 'ap_invoices', invoiceId,
    `Recorded payment ₱${(payAmountCentavos/100).toFixed(2)} for ${invoice.invoice_number}`);

  await recordChanges(env, data.user, 'PAYMENT', 'ap_invoices', invoiceId,
    { balance_centavos: balanceCentavos, status: invoice.status },
    { balance_centavos: newBalance, status: newStatus });

  return json({ success: true, new_balance_centavos: newBalance, status: newStatus });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
