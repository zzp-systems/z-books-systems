// ── POST /api/auth/login ──
// Route: functions/api/auth/login.js  →  POST /api/auth/login
import { signJWT, verifyPassword } from '../_jwt.js';

export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return json({ error: 'Username and password are required' }, 400);
    }

    const user = await env.DB.prepare(
      'SELECT id, username, name, email, role_category, password_hash FROM users WHERE username = ? AND is_active = 1'
    ).bind(username).first();

    if (!user) return json({ error: 'Invalid credentials' }, 401);

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return json({ error: 'Invalid credentials' }, 401);

    const token = await signJWT(
      {
        userId: user.id,
        username: user.username,
        role: user.role_category,
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      },
      env.JWT_SECRET
    );

    return json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role_category,
      },
    });
  } catch (err) {
    console.error('[auth/login] error:', err);
    return json({ error: 'Login failed', detail: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}