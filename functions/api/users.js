// ── WMS User Management (Self-contained, no external imports) ──

const enc = new TextEncoder();
const dec = new TextDecoder();

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '=';
  const bin = atob(str); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return arr;
}

async function verifyJWT(token, secret) {
  if (!token) return null;
  const parts = token.split('.'); if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sig = base64urlDecode(sigB64);
  const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data));
  if (!valid) return null;
  try {
    const payload = JSON.parse(dec.decode(base64urlDecode(payloadB64)));
    if (payload.exp && Date.now() > payload.exp * 1000) return null;
    return payload;
  } catch { return null; }
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `${[...salt].map(b => b.toString(16).padStart(2,'0')).join('')}:${[...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,'0')).join('')}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// ── Auth Guard ──
async function checkAdmin(request, env) {
  const auth = request.headers.get('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = await verifyJWT(token, env.JWT_SECRET);
  
  if (!payload) return { authorized: false, error: 'Unauthorized (invalid token)' };
  if (payload.role !== 'admin' && payload.role !== 'Administrator') return { authorized: false, error: 'Admin access required' };
  
  return { authorized: true, user: payload };
}

// ── GET /api/users ──
export async function onRequestGet({ request, env }) {
  const auth = await checkAdmin(request, env);
  if (!auth.authorized) return json({ error: auth.error }, 401);

  const result = await env.DB.prepare(
    'SELECT id, username, name, email, role_category, is_active, created_at FROM users ORDER BY created_at'
  ).all();

  return json({ users: result.results });
}

// ── POST /api/users ──
export async function onRequestPost({ request, env }) {
  const auth = await checkAdmin(request, env);
  if (!auth.authorized) return json({ error: auth.error }, 401);

  const body = await request.json();

  if (!body.username || !body.password || !body.name) {
    return json({ error: 'username, password, and name are required' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(body.username).first();
  if (existing) return json({ error: 'Username already exists' }, 409);

  const hash = await hashPassword(body.password);
  const id = body.id || crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO users (id, username, name, email, role_category, password_hash, is_active) VALUES (?,?,?,?,?,?,1)'
  ).bind(id, body.username, body.name, body.email || null, body.role || 'staff', hash).run();

  return json({
    success: true,
    user: { id, username: body.username, name: body.name, email: body.email, role_category: body.role || 'staff' }
  }, 201);
}

// ── DELETE /api/users/:id ──
export async function onRequestDelete({ request, env, params }) {
  const auth = await checkAdmin(request, env);
  if (!auth.authorized) return json({ error: auth.error }, 401);

  const id = params.id;
  if (id === auth.user.userId) return json({ error: 'Cannot deactivate yourself' }, 400);

  await env.DB.prepare('UPDATE users SET is_active = 0 WHERE id = ?').bind(id).run();

  return json({ success: true });
}