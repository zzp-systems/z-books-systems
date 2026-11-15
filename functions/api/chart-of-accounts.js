// ── Chart of Accounts ──
// GET  /api/chart-of-accounts → list all accounts
// POST /api/chart-of-accounts → create new account

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare('SELECT * FROM chart_of_accounts ORDER BY account_code').all();
    return json({ accounts: result.results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost({ request, env, data }) {
  try {
    const body = await request.json();
    await env.DB.prepare(
      'INSERT INTO chart_of_accounts (account_code, account_name, account_type, sub_type) VALUES (?,?,?,?)'
    ).bind(body.account_code, body.account_name, body.account_type, body.sub_type || null).run();
    
    const account = await env.DB.prepare(
      'SELECT * FROM chart_of_accounts WHERE account_code = ?'
    ).bind(body.account_code).first();
    
    return json(account, 201);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}