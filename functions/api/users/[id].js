// ── ARAP User by ID: PUT (update), DELETE (deactivate) ──
// Route: /api/users/:id

import { hashPassword } from '../_jwt.js';
import { audit } from '../_audit.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function requireAdmin(data) {
  return data?.user?.role === 'admin';
}

export async function onRequestPut({ request, env, data, params }) {
  if (!requireAdmin(data)) return json({ error: 'Admin access required' }, 403);

  const body = await request.json();
  const id = params.id;

  const old = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!old) return json({ error: 'User not found' }, 404);

  let passwordHash = old.password_hash;
  if (body.password) {
    passwordHash = await hashPassword(body.password);
  }

  await env.DB.prepare(
    'UPDATE users SET name = ?, email = ?, role_category = ?, password_hash = ?, is_active = ? WHERE id = ?'
  ).bind(
    body.name ?? old.name,
    body.email ?? old.email,
    body.role ?? old.role_category,
    passwordHash,
    body.is_active ?? old.is_active,
    id
  ).run();

  await audit(env, data.user, 'UPDATE', 'users', id, `Updated user: ${old.username}`);

  return json({ success: true });
}

export async function onRequestDelete({ env, data, params }) {
  if (!requireAdmin(data)) return json({ error: 'Admin access required' }, 403);

  const id = params.id;
  if (id === data.user.userId) return json({ error: 'Cannot deactivate yourself' }, 400);

  await env.DB.prepare('UPDATE users SET is_active = 0 WHERE id = ?').bind(id).run();
  await audit(env, data.user, 'DEACTIVATE', 'users', id, 'Deactivated user');

  return json({ success: true });
}
