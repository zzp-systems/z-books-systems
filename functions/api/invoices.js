// functions/api/invoices.js — z-books-systems (ARAP)
import { audit } from './_audit.js'; // FIXED: Changed from ../ to ./

const AR_ACCOUNT = '1100';      
const REVENUE_ACCOUNT = '4000'; 

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare('SELECT * FROM ar_invoices ORDER BY created_at DESC').all();
    return json({ invoices: result.results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost({ request, env, data }) {
  try {
    const body = await request.json();
    
    const id = crypto.randomUUID();
    const invNum = await generateInvoiceNumber(env, 'AR');
    const amount = body.amount || 0;

    // Create GL journal entry (auto-posted)
    const jeId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO journal_entries (id, entry_date, description, reference, source_module, status) VALUES (?,?,?,?,?,?)'
    ).bind(jeId, body.invoice_date || new Date().toISOString().slice(0, 10), `AR Invoice ${invNum} — ${body.customer_name}`, invNum, 'AR', 'Posted').run();

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
      body.wms_order_id || null, body.invoice_date || new Date().toISOString().slice(0, 10), body.due_date || new Date().toISOString().slice(0, 10), amount, amount, 'Open', jeId).run();

    await audit(env, data?.user || { username: 'sync' }, 'CREATE', 'ar_invoices', id, `Created AR invoice ${invNum} for ${body.customer_name} — ₱${amount}`);
    const invoice = await env.DB.prepare('SELECT * FROM ar_invoices WHERE id = ?').bind(id).first();
    return json(invoice, 201);
  } catch (err) {
    return json({ error: 'ARAP Backend Error: ' + err.message }, 500);
  }
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