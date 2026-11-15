// ── z-books ARAP Pages Functions Middleware ──
// CORS + JWT auth for all /api/* routes
// Public routes (no auth): /api/auth/login
// Sync routes use X-Sync-Key (handled inside sync.js, bypassed here)

import { verifyJWT, getTokenFromRequest } from './api/_jwt.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Sync-Key',
};

const PUBLIC_ROUTES = ['/api/auth/login'];
const SYNC_ROUTES = ['/api/sync/crm-deal', '/api/sync/wms-po', '/api/sync/wms-delivery', '/api/sync/status'];

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  // Public routes — no auth
  if (PUBLIC_ROUTES.includes(path)) {
    const res = await next();
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  }

  // Sync routes — auth via X-Sync-Key (handled in sync.js)
  if (SYNC_ROUTES.some(r => path.startsWith(r))) {
    const res = await next();
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  }

  // All other /api/* routes require valid JWT
  if (path.startsWith('/api/')) {
    const token = getTokenFromRequest(request);
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }
    context.data = { user: payload };
  }

  const res = await next();
  res.headers.set('Access-Control-Allow-Origin', '*');
  return res;
}
