// ── GET /api/auth/me ──
// Route: functions/api/auth/me.js  →  GET /api/auth/me
// Relies on _middleware.js having verified the JWT and attached context.data.user
export async function onRequestGet({ data }) {
  return new Response(
    JSON.stringify({ user: data?.user || null }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}