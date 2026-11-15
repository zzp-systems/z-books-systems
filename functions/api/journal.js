// ── GL Journal Entries ──
// GET  /api/journal              → list entries with lines
// POST /api/journal              → create draft entry with lines
// POST /api/journal/:id/post    → post a draft entry

import { audit } from './_audit.js';

export async function onRequestGet({ env }) {
  const entries = await env.DB.prepare('SELECT * FROM journal_entries ORDER BY entry_date DESC, created_at DESC').all();

  // Fetch all lines for these entries
  const entryIds = entries.results.map(e => e.id);
  let linesByEntry = {};
  if (entryIds.length) {
    const placeholders = entryIds.map(() => '?').join(',');
    const lines = await env.DB.prepare(
      `SELECT * FROM journal_lines WHERE entry_id IN (${placeholders}) ORDER BY id`
    ).bind(...entryIds).all();
    for (const l of lines.results) {
      if (!linesByEntry[l.entry_id]) linesByEntry[l.entry_id] = [];
      linesByEntry[l.entry_id].push(l);
    }
  }

  const result = entries.results.map(e => ({ ...e, lines: linesByEntry[e.id] || [] }));
  return json({ entries: result });
}

export async function onRequestPost({ request, env, data, params }) {
  // ── Post a draft entry ──
  if (params.id && new URL(request.url).pathname.endsWith('/post')) {
    await env.DB.prepare("UPDATE journal_entries SET status = 'Posted' WHERE id = ? AND status = 'Draft'")
      .bind(params.id).run();
    await audit(env, data.user, 'POST', 'journal_entries', params.id, 'Posted journal entry');
    return json({ success: true });
  }

  // ── Create new draft entry ──
  const body = await request.json();
  const id = crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO journal_entries (id, entry_date, description, reference, source_module, status) VALUES (?,?,?,?,?,?)'
  ).bind(id, body.entry_date, body.description || null, body.reference || null, 'Manual', 'Draft').run();

  for (const line of body.lines || []) {
    await env.DB.prepare(
      'INSERT INTO journal_lines (entry_id, account_code, debit, credit, description) VALUES (?,?,?,?,?)'
    ).bind(id, line.account_code, line.debit || 0, line.credit || 0, line.description || null).run();
  }

  await audit(env, data.user, 'CREATE', 'journal_entries', id, `Created manual journal entry`);
  const entry = await env.DB.prepare('SELECT * FROM journal_entries WHERE id = ?').bind(id).first();
  return json(entry, 201);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
