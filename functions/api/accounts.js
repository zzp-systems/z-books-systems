// ── Chart of Accounts (Master 77-account hierarchy) ──
// GET    /api/chart-of-accounts       → list all accounts (ordered by code)
// POST   /api/chart-of-accounts       → create new account
// PUT    /api/chart-of-accounts/:id   → edit account
// DELETE /api/chart-of-accounts/:id   → delete account

import { audit } from './_audit.js';
import { recordChanges } from './_changeTrail.js';

export async function onRequestGet({ env }) {
  const result = await env.DB.prepare(
    `SELECT account_code, account_name, account_type, sub_type,
            parent_account_code, account_level, description, tax_treatment_notes
     FROM chart_of_accounts ORDER BY account_code`
  ).all();
  return json({ accounts: result.results });
}

export async function onRequestPost({ request, env, data }) {
  const body = await request.json();
  await env.DB.prepare(
    `INSERT INTO chart_of_accounts
       (account_code, account_name, account_type, sub_type, parent_account_code, account_level, description, tax_treatment_notes)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(
    body.account_code, body.account_name, body.account_type,
    body.sub_type || null, body.parent_account_code || null,
    body.account_level || 'Parent', body.description || null, body.tax_treatment_notes || null
  ).run();

  await audit(env, data.user, 'CREATE', 'chart_of_accounts', body.account_code, `Created account: ${body.account_name}`);
  await recordChanges(env, data.user, 'CREATE', 'chart_of_accounts', body.account_code, null, body);

  const account = await env.DB.prepare('SELECT * FROM chart_of_accounts WHERE account_code = ?').bind(body.account_code).first();
  return json(account, 201);
}

// ── Edit Account (PUT) ──
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
