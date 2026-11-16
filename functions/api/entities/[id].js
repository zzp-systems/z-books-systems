// ── Entity by ID: PUT (edit), DELETE (deactivate) ──
// Route: /api/entities/:id

import { audit } from '../_audit.js';
import { recordChanges } from '../_changeTrail.js';

export async function onRequestGet({ env, params }) {
  const entity = await env.DB.prepare('SELECT * FROM entities WHERE id = ?').bind(params.id).first();
  if (!entity) return json({ error: 'Entity not found' }, 404);
  return json(entity);
}

export async function onRequestPut({ request, env, data, params }) {
  const id = params.id;
  const body = await request.json();
  const old = await env.DB.prepare('SELECT * FROM entities WHERE id = ?').bind(id).first();
  if (!old) return json({ error: 'Entity not found' }, 404);

  const updates = {};
  for (const f of ['name', 'tin', 'is_top_withholding_agent', 'is_vat_registered', 'territory', 'address', 'contact_number', 'email']) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`);
  if (setClauses.length === 0) return json(old);

  await env.DB.prepare(
    `UPDATE entities SET ${setClauses.join(', ')} WHERE id = ?`
  ).bind(...Object.values(updates), id).run();

  await audit(env, data.user, 'UPDATE', 'entities', id, `Updated entity: ${old.name}`);
  await recordChanges(env, data.user, 'UPDATE', 'entities', id, old, updates);

  const updated = await env.DB.prepare('SELECT * FROM entities WHERE id = ?').bind(id).first();
  return json(updated);
}

export async function onRequestDelete({ env, data, params }) {
  const id = params.id;
  const old = await env.DB.prepare('SELECT * FROM entities WHERE id = ?').bind(id).first();
  if (!old) return json({ error: 'Entity not found' }, 404);

  await env.DB.prepare('UPDATE entities SET is_active = 0 WHERE id = ?').bind(id).run();
  await audit(env, data.user, 'DELETE', 'entities', id, `Deactivated entity: ${old.name}`);
  await recordChanges(env, data.user, 'DELETE', 'entities', id, old, null);
  return json({ success: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
