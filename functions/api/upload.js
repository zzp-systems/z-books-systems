// ── R2 File Upload + Serve (arap/ prefix) ──
import { audit } from './_audit.js';

export async function onRequestPost({ request, env, data }) {
  const formData = await request.formData();
  const file = formData.get('file');
  const entityType = formData.get('entity_type') || 'general';
  const entityId = formData.get('entity_id') || 'unknown';
  if (!file) return json({ error: 'No file provided' }, 400);

  const key = `arap/${entityType}/${entityId}/${Date.now()}-${file.name}`;
  await env.R2_BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  await audit(env, data.user, 'UPLOAD', entityType, entityId, `Uploaded: ${file.name} → ${key}`);
  return json({ success: true, file_url: `/api/files/${key}`, r2_key: key });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/files/')) {
    const key = url.pathname.replace('/api/files/', '');
    const object = await env.R2_BUCKET.get(key);
    if (!object) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000');
    return new Response(object.body, { headers });
  }
  return json({ error: 'Not found' }, 404);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}