// ── AP Invoice by ID: GET (detail), PUT (edit), DELETE ──
// Route: /api/payables/:id

import { audit } from '../_audit.js';
import { recordChanges } from '../_changeTrail.js';
import { computeAPtaxBreakdown, toCentavos } from '../_tax.js';

export async function onRequestGet({ env, params }) {
  const invoice = await env.DB.prepare('SELECT * FROM ap_invoices WHERE id = ?').bind(params.id).first();
  if (!invoice) return json({ error: 'Invoice not found' }, 404);
  return json(invoice);
}

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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
