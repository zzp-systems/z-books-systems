// ── Auth: Login + Me ──
import { signJWT, verifyPassword, getTokenFromRequest } from './_jwt.js';

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (url.pathname === '/api/auth/login') {
    const { username, password } = await request.json();
    const user = await env.DB.prepare(
      'SELECT id, username, name, email, role_category, password_hash FROM users WHERE username = ? AND is_active = 1'
    ).bind(username).first();

    if (!user) return json({ error: 'Invalid credentials' }, 401);

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return json({ error: 'Invalid credentials' }, 401);

    const token = await signJWT(
      { userId: user.id, username: user.username, role: user.role_category, exp: Math.floor(Date.now() / 1000) + 86400 * 7 },
      env.JWT_SECRET
    );
    return json({ token, user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role_category } });
  }
  return json({ error: 'Not found' }, 404);
}

export async function onRequestGet({ request, env, data }) {
  const url = new URL(request.url);
  if (url.pathname === '/api/auth/me') return json({ user: data.user });
  return json({ error: 'Not found' }, 404);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
