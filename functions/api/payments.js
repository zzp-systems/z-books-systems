// functions/api/payments.js — z-books-systems (ARAP)
import { audit } from './_audit.js'; // FIXED: Changed from ../ to ./

const AR_ACCOUNT = '1100';      
const CASH_ACCOUNTS = { Cash: '1000', 'Bank Transfer': '1010', Check: '1010', GCash: '1020' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost({ request, env, data }) {
  try {
    const body = await request.json();
    const { invoice_id, amount, payment_date, payment_method, reference } = body;

    if (!invoice_id || !amount) {
      return json({ error: 'Invoice ID and Amount are required' }, 400);
    }

    const invoice = await env.DB.prepare('SELECT * FROM ar_invoices WHERE id = ?').bind(invoice_id).first();
    if (!invoice) return json({ error: 'Invoice not found' }, 404);
    if (invoice.balance <= 0) return json({ error: 'Invoice already paid' }, 400);

    const payAmount = Number(amount);
    if (payAmount > invoice.balance) return json({ error: 'Payment exceeds balance' }, 400);

    const payId = crypto.randomUUID();
    const cashAccount = CASH_ACCOUNTS[payment_method] || '1000';
    const user = data?.user || { username: 'system' };

    // 1. Create GL journal entry for the payment
    const jeId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO journal_entries (id, entry_date, description, reference, source_module, status) VALUES (?,?,?,?,?,?)'
    ).bind(jeId, payment_date || new Date().toISOString().slice(0, 10), `AR Payment — ${invoice.invoice_number}`, `PAY-${invoice.invoice_number}`, 'AR', 'Posted').run();

    // Debit Cash
    await env.DB.prepare('INSERT INTO journal_lines (entry_id, account_code, debit, credit) VALUES (?,?,?,?)')
      .bind(jeId, cashAccount, payAmount, 0).run();
    // Credit Accounts Receivable
    await env.DB.prepare('INSERT INTO journal_lines (entry_id, account_code, debit, credit) VALUES (?,?,?,?)')
      .bind(jeId, AR_ACCOUNT, 0, payAmount).run();

    // 2. Insert into ar_payments
    await env.DB.prepare(
      'INSERT INTO ar_payments (id, ar_invoice_id, payment_date, amount, payment_method, reference, journal_entry_id) VALUES (?,?,?,?,?,?,?)'
    ).bind(payId, invoice_id, payment_date || new Date().toISOString().slice(0, 10), payAmount, payment_method || 'Cash', reference || null, jeId).run();

    // 3. Update the invoice balance & status
    const newBalance = invoice.balance - payAmount;
    const newPaid = (invoice.amount_paid || 0) + payAmount;
    const newStatus = newBalance <= 0.01 ? 'Paid' : 'Partial';

    await env.DB.prepare(
      "UPDATE ar_invoices SET amount_paid = ?, balance = ?, status = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(newPaid, newBalance, newStatus, invoice_id).run();

    await audit(env, user, 'PAYMENT', 'ar_invoices', invoice_id, `Recorded payment ₱${payAmount} for ${invoice.invoice_number}`);

    return json({ success: true, payment_id: payId, new_balance: newBalance, status: newStatus }, 201);
  } catch (err) {
    console.error('Payment Error:', err);
    return json({ error: 'Backend error: ' + err.message }, 500);
  }
}