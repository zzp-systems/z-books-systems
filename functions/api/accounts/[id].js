// ── Chart of Accounts by ID: PUT (edit), DELETE ──
// Route: /api/accounts/:id (id = account_code)

import { audit } from '../_audit.js';
import { recordChanges } from '../_changeTrail.js';

export async function onRequestGet({ env, params }) {
  const account = await env.DB.prepare('SELECT * FROM chart_of_accounts WHERE account_code = ?').bind(params.id).first();
  if (!account) return json({ error: 'Account not found' }, 404);
  return json(account);
}

export async function onRequestPut({ request, env, data, params }) {
  const id = params.id;
  const body = await request.json();
  const old = await env.DB.prepare('SELECT * FROM chart_of_accounts WHERE account_code = ?').bind(id).first();
  if (!old) return json({ error: 'Account not found' }, 404);

  const updates = {};
  for (const f of ['account_name', 'account_type', 'sub_type', 'parent_account_code', 'account_level', 'description', 'tax_treatment_notes']) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`);
  const setValues = Object.values(updates);
  if (setClauses.length === 0) return json(old);

  await env.DB.prepare(
    `UPDATE chart_of_accounts SET ${setClauses.join(', ')} WHERE account_code = ?`
  ).bind(...setValues, id).run();

  await audit(env, data.user, 'UPDATE', 'chart_of_accounts', id, `Edited account: ${old.account_name}`);
  await recordChanges(env, data.user, 'UPDATE', 'chart_of_accounts', id, old, updates);

  const updated = await env.DB.prepare('SELECT * FROM chart_of_accounts WHERE account_code = ?').bind(id).first();
  return json(updated);
}

export async function onRequestDelete({ env, data, params }) {
  const id = params.id;
  const old = await env.DB.prepare('SELECT * FROM chart_of_accounts WHERE account_code = ?').bind(id).first();
  if (!old) return json({ error: 'Account not found' }, 404);

  await env.DB.prepare('DELETE FROM chart_of_accounts WHERE account_code = ?').bind(id).run();
  await audit(env, data.user, 'DELETE', 'chart_of_accounts', id, `Deleted account: ${old.account_name}`);
  await recordChanges(env, data.user, 'DELETE', 'chart_of_accounts', id, old, null);
  return json({ success: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
