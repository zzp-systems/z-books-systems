// ── Post Journal Entry: POST /api/journal/:id/post ──
// Changes a draft journal entry's status to 'Posted'.

import { audit } from '../../_audit.js';

export async function onRequestPost({ env, data, params }) {
  const id = params.id;

  const entry = await env.DB.prepare(
    "SELECT * FROM journal_entries WHERE id = ? AND status = 'Draft'"
  ).bind(id).first();

  if (!entry) {
    return new Response(JSON.stringify({ error: 'Draft entry not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await env.DB.prepare(
    "UPDATE journal_entries SET status = 'Posted' WHERE id = ?"
  ).bind(id).run();

  await audit(env, data.user, 'POST', 'journal_entries', id, 'Posted journal entry');

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
