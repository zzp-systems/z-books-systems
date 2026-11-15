// ── ARAP Sync Endpoints (CRM ↔ ARAP ↔ WMS) ──
import { audit } from './_audit.js';

const AR_ACCOUNT = '1100';
const REVENUE_ACCOUNT = '4000';
const AP_ACCOUNT = '2000';
const COGS_ACCOUNT = '5000';

function verifySyncKey(request, env) {
  return request.headers.get('X-Sync-Key') === env.SYNC_API_KEY;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    if (url.pathname === '/api/sync/status') {
      const events = await env.DB.prepare('SELECT * FROM sync_events ORDER BY created_at DESC LIMIT 10').all();
      const arCount = await env.DB.prepare("SELECT COUNT(*) as c FROM ar_invoices WHERE crm_deal_id IS NOT NULL").first();
      const apCount = await env.DB.prepare("SELECT COUNT(*) as c FROM ap_invoices WHERE wms_receiving_id IS NOT NULL").first();
      return json({
        ar_from_crm: arCount?.c || 0,
        ap_from_wms: apCount?.c || 0,
        recent_sync_events: events?.results || [],
      });
    }
    return json({ error: 'Not found' }, 404);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!verifySyncKey(request, env)) return json({ error: 'Invalid X-Sync-Key' }, 403);

  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const body = await request.json();

    // ── CRM Deal → AR Invoice ──
    if (path === '/api/sync/crm-deal') {
      const { idempotency_key, deal } = body;

      const existing = await env.DB.prepare('SELECT payload FROM sync_events WHERE idempotency_key = ?').bind(idempotency_key).first();
      if (existing) {
        const payload = JSON.parse(existing.payload);
        return json({ success: true, invoice_id: payload.invoice_id, invoice_number: payload.invoice_number, action: 'idempotent' });
      }

      const id = crypto.randomUUID();
      const invNum = await genInvNum(env, 'AR');
      
      // Ensure amount is a number (CRM sends pesos, ARAP stores as cents/raw)
      const amount = Number(deal.amount) || 0;
      const dueDate = deal.due_date || deal.invoice_date || new Date().toISOString().slice(0, 10);

      // 1. Auto GL entry
      const jeId = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO journal_entries (id, entry_date, description, reference, source_module, status) VALUES (?,?,?,?,?,?)'
      ).bind(jeId, deal.invoice_date || dueDate, `AR Invoice ${invNum} — ${deal.account_name}`, invNum, 'AR', 'Posted').run();
      
      await env.DB.prepare('INSERT INTO journal_lines (entry_id, account_code, debit, credit) VALUES (?,?,?,?)').bind(jeId, AR_ACCOUNT, amount, 0).run();
      await env.DB.prepare('INSERT INTO journal_lines (entry_id, account_code, debit, credit) VALUES (?,?,?,?)').bind(jeId, REVENUE_ACCOUNT, 0, amount).run();

      // 2. Create AR invoice
      await env.DB.prepare(
        `INSERT INTO ar_invoices (id, invoice_number, customer_id, customer_name, crm_deal_id, wms_order_id,
         invoice_date, due_date, amount, balance, status, journal_entry_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(id, invNum, deal.account_id || null, deal.account_name || deal.deal_name, deal.crm_deal_id || null,
        deal.wms_order_id || null, deal.invoice_date || dueDate, dueDate, amount, amount, 'Open', jeId).run();

      // 3. Log sync event
      await env.DB.prepare('INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)')
        .bind(idempotency_key, 'CRM_DEAL_TO_AR', JSON.stringify({ invoice_id: id, invoice_number: invNum })).run();

      await audit(env, { username: 'sync' }, 'SYNC', 'ar_invoices', id, `AR invoice ${invNum} from CRM deal ${deal.crm_deal_id}`);
      
      return json({ success: true, invoice_id: id, invoice_number: invNum });
    }

    // ── WMS PO → AP Invoice ──
    if (path === '/api/sync/wms-po') {
      const { idempotency_key, po } = body;

      const existing = await env.DB.prepare('SELECT payload FROM sync_events WHERE idempotency_key = ?').bind(idempotency_key).first();
      if (existing) {
        const payload = JSON.parse(existing.payload);
        return json({ success: true, invoice_id: payload.invoice_id, invoice_number: payload.invoice_number, action: 'idempotent' });
      }

      const id = crypto.randomUUID();
      const invNum = await genInvNum(env, 'AP');
      const amount = Number(po.amount) || 0;
      const dueDate = po.due_date || po.invoice_date || new Date().toISOString().slice(0, 10);

      const jeId = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO journal_entries (id, entry_date, description, reference, source_module, status) VALUES (?,?,?,?,?,?)'
      ).bind(jeId, po.invoice_date || dueDate, `AP Invoice ${invNum} — ${po.supplier_name}`, invNum, 'AP', 'Posted').run();
      
      await env.DB.prepare('INSERT INTO journal_lines (entry_id, account_code, debit, credit) VALUES (?,?,?,?)').bind(jeId, COGS_ACCOUNT, amount, 0).run();
      await env.DB.prepare('INSERT INTO journal_lines (entry_id, account_code, debit, credit) VALUES (?,?,?,?)').bind(jeId, AP_ACCOUNT, 0, amount).run();

      await env.DB.prepare(
        `INSERT INTO ap_invoices (id, invoice_number, supplier_id, supplier_name, wms_receiving_id,
         invoice_date, due_date, amount, balance, status, journal_entry_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(id, invNum, po.supplier_id || null, po.supplier_name, po.wms_receiving_id || null,
        po.invoice_date || dueDate, dueDate, amount, amount, 'Open', jeId).run();

      await env.DB.prepare('INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)')
        .bind(idempotency_key, 'WMS_PO_TO_AP', JSON.stringify({ invoice_id: id, invoice_number: invNum })).run();

      await audit(env, { username: 'sync' }, 'SYNC', 'ap_invoices', id, `AP invoice ${invNum} from WMS PO ${po.wms_receiving_id}`);
      
      return json({ success: true, invoice_id: id, invoice_number: invNum });
    }

    // ── WMS Delivery → Update AR Invoice ──
    if (path === '/api/sync/wms-delivery') {
      const { idempotency_key, wms_order_id, status, crm_deal_id } = body;

      const existing = await env.DB.prepare('SELECT payload FROM sync_events WHERE idempotency_key = ?').bind(idempotency_key).first();
      if (existing) return json({ success: true, action: 'idempotent' });

      let invoice = null;
      if (wms_order_id) {
        invoice = await env.DB.prepare('SELECT * FROM ar_invoices WHERE wms_order_id = ?').bind(wms_order_id).first();
      }
      if (!invoice && crm_deal_id) {
        invoice = await env.DB.prepare('SELECT * FROM ar_invoices WHERE crm_deal_id = ?').bind(crm_deal_id).first();
      }

      if (invoice && invoice.status === 'Open') {
        await env.DB.prepare(
          "UPDATE ar_invoices SET status = 'Delivered', updated_at = datetime('now') WHERE id = ?"
        ).bind(invoice.id).run();
        
        await audit(env, { username: 'sync' }, 'STATUS_UPDATE', 'ar_invoices', invoice.id,
          `AR invoice ${invoice.invoice_number} marked Delivered (WMS order ${wms_order_id}, status: ${status})`);
      }

      await env.DB.prepare('INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)')
        .bind(idempotency_key, 'WMS_DELIVERY_UPDATE', JSON.stringify({ wms_order_id, status, invoice_id: invoice?.id })).run();

      return json({ success: true, invoice_found: !!invoice, invoice_id: invoice?.id || null });
    }

    return json({ error: 'Not found' }, 404);
  } catch (err) {
    // Catch ANY database error and return it as JSON so the CRM can display it
    console.error('ARAP Sync Error:', err);
    return json({ error: 'ARAP Backend Error: ' + err.message }, 500);
  }
}

async function genInvNum(env, prefix) {
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, '');
  const table = prefix === 'AR' ? 'ar_invoices' : 'ap_invoices';
  const count = await env.DB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE invoice_number LIKE ?`).bind(`${prefix}-${ymd}-%`).first();
  return `${prefix}-${ymd}-${String((count?.c || 0) + 1).padStart(4, '0')}`;
}