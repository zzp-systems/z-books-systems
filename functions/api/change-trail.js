// ── Change Trail API ──
// GET /api/change-trail?entity_type=X&entity_id=Y  → list changes for a record
// GET /api/change-trail?entity_type=X              → list all changes for an entity type
// GET /api/change-trail                             → recent changes across all entities

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const entityType = url.searchParams.get('entity_type');
  const entityId = url.searchParams.get('entity_id');

  let sql = 'SELECT * FROM change_trail';
  const binds = [];
  const conditions = [];

  if (entityType) { conditions.push('entity_type = ?'); binds.push(entityType); }
  if (entityId) { conditions.push('entity_id = ?'); binds.push(entityId); }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += " ORDER BY changed_at DESC LIMIT 100";

  const result = await env.DB.prepare(sql).bind(...binds).all();
  return json({ changes: result.results });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
