// ── User Management (admin only) ──
// GET    /api/users           → list all users
// POST   /api/users           → create user (auto-hashes password with PBKDF2)
// PUT    /api/users/:id       → update user (optionally re-hash password)
// DELETE /api/users/:id       → deactivate user (set is_active = 0)

import { hashPassword, verifyPassword } from './_jwt.js';
import { audit } from './_audit.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// ── Admin-only guard ──
function requireAdmin(data) {
  return data?.user?.role === 'admin';
}

// ── GET /api/users — list all users (without password hashes) ──
export async function onRequestGet({ env, data }) {
  if (!requireAdmin(data)) return json({ error: 'Admin access required' }, 403);

  const result = await env.DB.prepare(
    'SELECT id, username, name, email, role_category, is_active, created_at FROM users ORDER BY created_at'
  ).all();

  return json({ users: result.results });
}

// ── POST /api/users — create a new user ──
export async function onRequestPost({ request, env, data }) {
  if (!requireAdmin(data)) return json({ error: 'Admin access required' }, 403);

  const body = await request.json();

  // Validate
  if (!body.username || !body.password || !body.name) {
    return json({ error: 'username, password, and name are required' }, 400);
  }

  // Check for existing username
  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(body.username).first();
  if (existing) return json({ error: 'Username already exists' }, 409);

  // Hash password with PBKDF2
  const hash = await hashPassword(body.password);
  const id = body.id || crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO users (id, username, name, email, role_category, password_hash, is_active) VALUES (?,?,?,?,?,?,1)'
  ).bind(id, body.username, body.name, body.email || null, body.role || 'viewer', hash).run();

  await audit(env, data.user, 'CREATE', 'users', id, `Created user: ${body.username} (${body.role || 'viewer'})`);

  return json({
    success: true,
    user: { id, username: body.username, name: body.name, email: body.email, role_category: body.role || 'viewer' }
  }, 201);
}

// ── PUT /api/users/:id — update user ──
export async function onRequestPut({ request, env, data, params }) {
  if (!requireAdmin(data)) return json({ error: 'Admin access required' }, 403);

  const body = await request.json();
  const id = params.id;

  const old = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!old) return json({ error: 'User not found' }, 404);

  // If password is provided, re-hash it
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

// ── DELETE /api/users/:id — deactivate (soft delete) ──
export async function onRequestDelete({ env, data, params }) {
  if (!requireAdmin(data)) return json({ error: 'Admin access required' }, 403);

  const id = params.id;

  // Prevent self-deactivation
  if (id === data.user.userId) return json({ error: 'Cannot deactivate yourself' }, 400);

  await env.DB.prepare('UPDATE users SET is_active = 0 WHERE id = ?').bind(id).run();
  await audit(env, data.user, 'DEACTIVATE', 'users', id, 'Deactivated user');

  return json({ success: true });
}
