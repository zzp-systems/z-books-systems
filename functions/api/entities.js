// ── Entities API (Customer/Supplier lookup) ──
// GET    /api/entities?type=Customer    → list customers
// GET    /api/entities?type=Supplier    → list suppliers
// POST   /api/entities                  → quick-add new entity
// PUT    /api/entities/:id              → edit entity
// DELETE /api/entities/:id              → delete entity

import { audit } from './_audit.js';
import { recordChanges } from './_changeTrail.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const q = url.searchParams.get('q');

  let sql = 'SELECT * FROM entities WHERE is_active = 1';
  const binds = [];
  if (type) { sql += ' AND entity_type = ?'; binds.push(type); }
  if (q) { sql += ' AND name LIKE ?'; binds.push('%' + q + '%'); }
  sql += ' ORDER BY name';

  const result = await env.DB.prepare(sql).bind(...binds).all();
  return json({ entities: result.results });
}

export async function onRequestPost({ request, env, data }) {
  const body = await request.json();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO entities (id, entity_type, name, tin, is_top_withholding_agent, is_vat_registered, territory, address, contact_number, email, is_active) VALUES (?,?,?,?,?,?,?,?,?,?,1)'
  ).bind(
    id, body.entity_type || 'Customer', body.name, body.tin || null,
    body.is_top_withholding_agent || 0, body.is_vat_registered !== undefined ? (body.is_vat_registered ? 1 : 0) : 1,
    body.territory || null, body.address || null, body.contact_number || null, body.email || null
  ).run();

  await audit(env, data.user, 'CREATE', 'entities', id, `Created entity: ${body.name}`);
  await recordChanges(env, data.user, 'CREATE', 'entities', id, null, body);

  const entity = await env.DB.prepare('SELECT * FROM entities WHERE id = ?').bind(id).first();
  return json(entity, 201);
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

  await env.DB.prepare(`UPDATE entities SET ${setClauses.join(', ')} WHERE id = ?`).bind(...Object.values(updates), id).run();
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
