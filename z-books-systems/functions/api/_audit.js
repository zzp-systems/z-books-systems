// ── Audit Log Helper ──
export async function audit(env, user, action, table, recordId, details) {
  await env.DB.prepare(
    'INSERT INTO audit_log (actor, role, action, table_name, record_id, details) VALUES (?,?,?,?,?,?)'
  ).bind(user?.username || 'system', user?.role || null, action, table, recordId, details).run();
}
