// ── AR Invoice by ID: GET (detail), PUT (edit), DELETE ──
// Route: /api/invoices/:id

import { audit } from '../_audit.js';
import { recordChanges } from '../_changeTrail.js';
import { computeARtaxBreakdown, toCentavos } from '../_tax.js';

export async function onRequestGet({ env, params }) {
  const invoice = await env.DB.prepare('SELECT * FROM ar_invoices WHERE id = ?').bind(params.id).first();
  if (!invoice) return json({ error: 'Invoice not found' }, 404);
  return json(invoice);
}

export async function onRequestPut({ request, env, data, params }) {
  const id = params.id;
  const body = await request.json();
  const old = await env.DB.prepare('SELECT * FROM ar_invoices WHERE id = ?').bind(id).first();
  if (!old) return json({ error: 'Invoice not found' }, 404);

  const updates = {};
  const fields = ['customer_name', 'customer_tin', 'is_top_withholding_agent', 'invoice_date', 'due_date',
    'official_si_number', 'bir_2307_ref', 'status'];
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  if (body.vatable_sales_centavos !== undefined || body.vat_exempt_sales_centavos !== undefined ||
      body.zero_rated_sales_centavos !== undefined || body.output_vat_centavos !== undefined) {
    const tax = computeARtaxBreakdown({
      amount_centavos: (body.vatable_sales_centavos ?? old.vatable_sales_centavos) +
                       (body.output_vat_centavos ?? old.output_vat_centavos) +
                       (body.vat_exempt_sales_centavos ?? old.vat_exempt_sales_centavos) +
                       (body.zero_rated_sales_centavos ?? old.zero_rated_sales_centavos),
      vatable_sales_centavos: body.vatable_sales_centavos ?? old.vatable_sales_centavos,
      vat_exempt_sales_centavos: body.vat_exempt_sales_centavos ?? old.vat_exempt_sales_centavos,
      zero_rated_sales_centavos: body.zero_rated_sales_centavos ?? old.zero_rated_sales_centavos,
      output_vat_centavos: body.output_vat_centavos ?? old.output_vat_centavos,
    });
    updates.vatable_sales_centavos = tax.vatable_sales_centavos;
    updates.vat_exempt_sales_centavos = tax.vat_exempt_sales_centavos;
    updates.zero_rated_sales_centavos = tax.zero_rated_sales_centavos;
    updates.output_vat_centavos = tax.output_vat_centavos;
    updates.amount_centavos = tax.total_centavos;
    if ((old.amount_paid_centavos || 0) === 0) {
      updates.balance_centavos = tax.total_centavos;
      updates.balance = tax.total_centavos / 100;
      updates.amount = tax.total_centavos / 100;
    }
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`);
  const setValues = Object.values(updates);
  setClauses.push("updated_at = datetime('now')");

  await env.DB.prepare(
    `UPDATE ar_invoices SET ${setClauses.join(', ')} WHERE id = ?`
  ).bind(...setValues, id).run();

  await audit(env, data.user, 'UPDATE', 'ar_invoices', id, `Edited AR invoice ${old.invoice_number}`);
  await recordChanges(env, data.user, 'UPDATE', 'ar_invoices', id, old, updates);

  const updated = await env.DB.prepare('SELECT * FROM ar_invoices WHERE id = ?').bind(id).first();
  return json(updated);
}

export async function onRequestDelete({ env, data, params }) {
  const id = params.id;
  const old = await env.DB.prepare('SELECT * FROM ar_invoices WHERE id = ?').bind(id).first();
  if (!old) return json({ error: 'Invoice not found' }, 404);

  await env.DB.prepare('DELETE FROM ar_invoices WHERE id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM journal_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE reference = ?)').bind(old.invoice_number).run();
  await env.DB.prepare('DELETE FROM journal_entries WHERE reference = ?').bind(old.invoice_number).run();
  await audit(env, data.user, 'DELETE', 'ar_invoices', id, `Deleted AR invoice ${old.invoice_number}`);
  await recordChanges(env, data.user, 'DELETE', 'ar_invoices', id, old, null);
  return json({ success: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
