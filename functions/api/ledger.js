/**
 * Z-Books Double-Entry Ledger Engine
 * Cloudflare Pages Function: /functions/api/ledger.js
 * Standard: PFRS for SMEs / Double-Entry Balancing Engine
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const accountCode = url.searchParams.get('account') || '';
  const startDate = url.searchParams.get('startDate') || '';
  const endDate = url.searchParams.get('endDate') || '';
  const id = url.searchParams.get('id') || '';

  // If Cloudflare D1 binding is present, use env.DB
  if (env && env.DB) {
    try {
      if (id) {
        const entry = await env.DB.prepare('SELECT * FROM journal_entries WHERE id = ?').bind(id).first();
        if (!entry) return new Response(JSON.stringify({ error: 'Entry not found' }), { status: 404 });
        const lines = await env.DB.prepare('SELECT * FROM journal_entry_lines WHERE journal_entry_id = ? ORDER BY line_order ASC').bind(id).all();
        return new Response(JSON.stringify({ ...entry, lines: lines.results }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      let query = `
        SELECT je.*, 
          (SELECT COUNT(*) FROM journal_entry_lines WHERE journal_entry_id = je.id) as line_count
        FROM journal_entries je
        WHERE 1=1
      `;
      const params = [];
      if (status) {
        query += ` AND je.status = ?`;
        params.push(status);
      }
      if (startDate) {
        query += ` AND je.entry_date >= ?`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND je.entry_date <= ?`;
        params.push(endDate);
      }
      query += ` ORDER BY je.entry_date DESC, je.created_at DESC`;

      const stmt = env.DB.prepare(query).bind(...params);
      const { results } = await stmt.all();

      return new Response(JSON.stringify({ entries: results }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  // Fallback response for direct function invocation
  return new Response(JSON.stringify({
    message: "Z-Books Double-Entry Ledger API Ready",
    status: "healthy",
    engine: "PRISMER Double-Entry Balancing Engine v2.4",
    timestamp: new Date().toISOString()
  }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const payload = await request.json();
    const { action } = payload;

    // 1. REVERSE POSTED ENTRY
    if (action === 'reverse') {
      const { originalEntryId, reason } = payload;
      if (!originalEntryId) {
        return new Response(JSON.stringify({ error: 'originalEntryId is required' }), { status: 400 });
      }

      if (env && env.DB) {
        const original = await env.DB.prepare('SELECT * FROM journal_entries WHERE id = ?').bind(originalEntryId).first();
        if (!original) {
          return new Response(JSON.stringify({ error: 'Original entry not found' }), { status: 404 });
        }
        if (original.status !== 'POSTED') {
          return new Response(JSON.stringify({ error: 'Only POSTED entries can be reversed' }), { status: 400 });
        }

        const lines = await env.DB.prepare('SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?').bind(originalEntryId).all();
        const newId = crypto.randomUUID();
        const dateStr = new Date().toISOString().slice(0, 10);
        const yyyymm = dateStr.replace(/-/g, '').slice(0, 6);
        const seq = Math.floor(1000 + Math.random() * 9000);
        const entryNumber = `JE-${yyyymm}-${seq}-REV`;

        // Swap debits and credits
        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO journal_entries (id, entry_number, entry_date, reference_doc, description, status, cost_center_code, payee_vendor, total_amount, is_reversing, reversed_entry_id, created_by, posted_at)
            VALUES (?, ?, ?, ?, ?, 'POSTED', ?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP)
          `).bind(
            newId,
            entryNumber,
            dateStr,
            `REV: ${original.entry_number}`,
            `REVERSAL: ${original.description} (${reason || 'Correction of error'})`,
            original.cost_center_code,
            original.payee_vendor,
            original.total_amount,
            original.id,
            'CPA System Reversal'
          ),
          ...lines.results.map((l, idx) => 
            env.DB.prepare(`
              INSERT INTO journal_entry_lines (id, journal_entry_id, account_code, debit_amount, credit_amount, memo, line_order)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
              crypto.randomUUID(),
              newId,
              l.account_code,
              l.credit_amount, // Swapped: old credit becomes new debit
              l.debit_amount,  // Swapped: old debit becomes new credit
              `Reversing line ${idx + 1}: ${l.memo || ''}`,
              idx + 1
            )
          )
        ]);

        return new Response(JSON.stringify({
          success: true,
          message: `Successfully created and posted reversing entry ${entryNumber}`,
          reversingEntryId: newId,
          entryNumber
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true, message: "Reversing entry processed (demo)" }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 2. CREATE / POST JOURNAL ENTRY
    const {
      entry_date,
      reference_doc,
      description,
      status = 'DRAFT',
      cost_center_code,
      payee_vendor,
      lines = [],
      created_by = 'Accountant / CPA'
    } = payload;

    if (!entry_date || !description || !Array.isArray(lines) || lines.length < 2) {
      return new Response(JSON.stringify({
        error: "Validation failed: entry_date, description, and at least 2 debit/credit lines are required."
      }), { status: 400 });
    }

    // Calculate sum of debits and credits
    let sumDebit = 0;
    let sumCredit = 0;

    for (const line of lines) {
      const d = parseFloat(line.debit_amount) || 0;
      const c = parseFloat(line.credit_amount) || 0;
      if (d < 0 || c < 0) {
        return new Response(JSON.stringify({ error: "Negative debits or credits are prohibited." }), { status: 400 });
      }
      if (d > 0 && c > 0) {
        return new Response(JSON.stringify({ error: "A single line cannot have both a debit and credit amount." }), { status: 400 });
      }
      sumDebit += d;
      sumCredit += c;
    }

    // Double-Entry PRISMER Rule: Round to 2 decimals to prevent floating point errors
    const roundedDebit = Math.round(sumDebit * 100) / 100;
    const roundedCredit = Math.round(sumCredit * 100) / 100;
    const discrepancy = Math.abs(roundedDebit - roundedCredit);

    // If status is POSTED or user requests posting, strict equality is enforced
    if (status === 'POSTED' && discrepancy > 0.001) {
      return new Response(JSON.stringify({
        error: "422 Unprocessable Entity: Double-entry imbalance detected.",
        discrepancy: discrepancy.toFixed(2),
        total_debits: roundedDebit.toFixed(2),
        total_credits: roundedCredit.toFixed(2),
        message: `Total Debits (₱${roundedDebit.toLocaleString()}) must exactly equal Total Credits (₱${roundedCredit.toLocaleString()}). Imbalance: ₱${discrepancy.toFixed(2)}`
      }), {
        status: 422,
        headers: { "Content-Type": "application/json" }
      });
    }

    const id = crypto.randomUUID();
    const yyyymm = entry_date.replace(/-/g, '').slice(0, 6);
    const seq = Math.floor(1000 + Math.random() * 9000);
    const entryNumber = `JE-${yyyymm}-${seq}`;

    if (env && env.DB) {
      const inserts = [
        env.DB.prepare(`
          INSERT INTO journal_entries (id, entry_number, entry_date, reference_doc, description, status, cost_center_code, payee_vendor, total_amount, created_by, posted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          entryNumber,
          entry_date,
          reference_doc || null,
          description,
          status,
          cost_center_code || null,
          payee_vendor || null,
          roundedDebit,
          created_by,
          status === 'POSTED' ? new Date().toISOString() : null
        ),
        ...lines.map((l, idx) => 
          env.DB.prepare(`
            INSERT INTO journal_entry_lines (id, journal_entry_id, account_code, debit_amount, credit_amount, memo, line_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            id,
            l.account_code,
            parseFloat(l.debit_amount) || 0,
            parseFloat(l.credit_amount) || 0,
            l.memo || null,
            idx + 1
          )
        )
      ];

      await env.DB.batch(inserts);
    }

    return new Response(JSON.stringify({
      success: true,
      id,
      entry_number: entryNumber,
      status,
      total_amount: roundedDebit,
      discrepancy: 0.00,
      message: status === 'POSTED' ? "Journal entry posted to General Ledger." : "Journal entry saved as DRAFT."
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
