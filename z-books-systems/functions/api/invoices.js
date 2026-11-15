// ── AR Invoices + Payments (with auto GL entries) ──
// GET    /api/invoices              → list AR invoices
// POST   /api/invoices              → create AR invoice (auto GL: Debit AR, Credit Revenue)
// POST   /api/invoices/:id/payment  → record payment (auto GL: Debit Cash, Credit AR)

import { audit } from './_audit.js';

const AR_ACCOUNT = '1100';      // Accounts Receivable
const REVENUE_ACCOUNT = '4000'; // Sales Revenue
const CASH_ACCOUNTS = { Cash: '1000', 'Bank Transfer': '1010', Check: '1010', GCash: '1020' };

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
  const amount = body.amount || 0;

  // Create GL journal entry (auto-posted)
  const jeId = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO journal_entries (id, entry_date, description, reference, source_module, status) VALUES (?,?,?,?,?,?)'
  ).bind(jeId, body.invoice_date, `AR Invoice ${invNum} — ${body.customer_name}`, invNum, 'AR', 'Posted').run();

  await env.DB.prepare('INSERT INTO journal_lines (entry_id, account_code, debit, credit) VALUES (?,?,?,?)')
    .bind(jeId, AR_ACCOUNT, amount, 0).run();
  await env.DB.prepare('INSERT INTO journal_lines (entry_id, account_code, debit, credit) VALUES (?,?,?,?)')
    .bind(jeId, REVENUE_ACCOUNT, 0, amount).run();

  // Create AR invoice
  await env.DB.prepare(
    `INSERT INTO ar_invoices (id, invoice_number, customer_id, customer_name, crm_deal_id, wms_order_id,
     invoice_date, due_date, amount, balance, status, journal_entry_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, invNum, body.customer_id || null, body.customer_name, body.crm_deal_id || null,
    body.wms_order_id || null, body.invoice_date, body.due_date, amount, amount, 'Open', jeId).run();

  await audit(env, data.user, 'CREATE', 'ar_invoices', id, `Created AR invoice ${invNum} for ${body.customer_name} — ₱${amount}`);
  const invoice = await env.DB.prepare('SELECT * FROM ar_invoices WHERE id = ?').bind(id).first();
  return json(invoice, 201);
}

async function recordPayment(env, user, invoiceId, body) {
  const invoice = await env.DB.prepare('SELECT * FROM ar_invoices WHERE id = ?').bind(invoiceId).first();
  if (!invoice) return json({ error: 'Invoice not found' }, 404);
  if (invoice.balance <= 0) return json({ error: 'Invoice already paid' }, 400);

  const payAmount = body.amount || 0;
  if (payAmount > invoice.balance) return json({ error: 'Payment exceeds balance' }, 400);

  const payId = crypto.randomUUID();
  const cashAccount = CASH_ACCOUNTS[body.payment_method] || '1000';

  // Create GL entry for payment
  const jeId = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO journal_entries (id, entry_date, description, reference, source_module, status) VALUES (?,?,?,?,?,?)'
  ).bind(jeId, body.payment_date, `AR Payment — ${invoice.invoice_number}`, `PAY-${invoice.invoice_number}`, 'AR', 'Posted').run();

  await env.DB.prepare('INSERT INTO journal_lines (entry_id, account_code, debit, credit) VALUES (?,?,?,?)')
    .bind(jeId, cashAccount, payAmount, 0).run();
  await env.DB.prepare('INSERT INTO journal_lines (entry_id, account_code, debit, credit) VALUES (?,?,?,?)')
    .bind(jeId, AR_ACCOUNT, 0, payAmount).run();

  // Record payment
  await env.DB.prepare(
    'INSERT INTO ar_payments (id, ar_invoice_id, payment_date, amount, payment_method, reference, journal_entry_id) VALUES (?,?,?,?,?,?,?)'
  ).bind(payId, invoiceId, body.payment_date, payAmount, body.payment_method || 'Cash', body.reference || null, jeId).run();

  // Update invoice balance + status
  const newBalance = invoice.balance - payAmount;
  const newPaid = invoice.amount_paid + payAmount;
  const newStatus = newBalance <= 0.01 ? 'Paid' : 'Partial';
  await env.DB.prepare(
    "UPDATE ar_invoices SET amount_paid = ?, balance = ?, status = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(newPaid, newBalance, newStatus, invoiceId).run();

  await audit(env, user, 'PAYMENT', 'ar_invoices', invoiceId, `Recorded payment ₱${payAmount} for ${invoice.invoice_number}`);
  return json({ success: true, new_balance: newBalance, status: newStatus });
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
