// ── ARAP Sync Endpoints (CRM ↔ ARAP ↔ WMS) ──
// Auth: X-Sync-Key header (shared SYNC_API_KEY)
//
// GET  /api/sync/status         → sync state
// POST /api/sync/crm-deal       → CRM pushes won deal → create AR invoice + GL (VAT/EWT)
// POST /api/sync/wms-po         → WMS pushes purchase order → create AP invoice + GL (VAT/EWT)
// POST /api/sync/wms-delivery   → WMS pushes delivery status → update AR invoice

import { audit } from './_audit.js';
import {
  ACCOUNTS, CASH_ACCOUNTS, computeARtaxBreakdown, computeCWT,
  computeAPtaxBreakdown, createJournalEntry, toCentavos,
} from './_tax.js';

function verifySyncKey(request, env) {
  return request.headers.get('X-Sync-Key') === env.SYNC_API_KEY;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet({ request, env }) {
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
}

export async function onRequestPost({ request, env }) {
  if (!verifySyncKey(request, env)) return json({ error: 'Invalid X-Sync-Key' }, 403);

  const url = new URL(request.url);
  const path = url.pathname;
  const body = await request.json();

  // ── CRM Deal → AR Invoice (with VAT split) ──
  if (path === '/api/sync/crm-deal') {
    const { idempotency_key, deal } = body;

    const existing = await env.DB.prepare('SELECT payload FROM sync_events WHERE idempotency_key = ?').bind(idempotency_key).first();
    if (existing) {
      const payload = JSON.parse(existing.payload);
      return json({ success: true, invoice_id: payload.invoice_id, invoice_number: payload.invoice_number, action: 'idempotent' });
    }

    const id = crypto.randomUUID();
    const invNum = await genInvNum(env, 'AR');
    const dueDate = deal.due_date || deal.invoice_date || new Date().toISOString().slice(0, 10);

    // ── Convert to centavos (CRM sends pesos in deal.amount) ──
    const amountCentavos = toCentavos(deal.amount || 0);

    // ── Compute VAT breakdown ──
    // CRM can optionally send vatable/vat_exempt split; otherwise treat as VAT-inclusive
    const tax = computeARtaxBreakdown({
      amount_centavos: amountCentavos,
      vatable_sales_centavos: deal.vatable_sales_centavos || 0,
      vat_exempt_sales_centavos: deal.vat_exempt_sales_centavos || 0,
      zero_rated_sales_centavos: deal.zero_rated_sales_centavos || 0,
      output_vat_centavos: deal.output_vat_centavos || 0,
    });

    // ── GL Entry: AR Invoice (VAT-registered sale) ──
    // Debit 1100 AR: total (VAT-inclusive)
    // Credit 4010 Sales Revenue (VATable): vatable base
    // Credit 2100 Output VAT Payable: 12% output VAT
    // Credit 4020 Sales Revenue (VAT-Exempt): if any VAT-exempt portion
    const glLines = [
      { account_code: ACCOUNTS.AR, debit_centavos: tax.total_centavos, credit_centavos: 0 },
      { account_code: ACCOUNTS.SALES_VATABLE, debit_centavos: 0, credit_centavos: tax.vatable_sales_centavos },
      { account_code: ACCOUNTS.OUTPUT_VAT, debit_centavos: 0, credit_centavos: tax.output_vat_centavos },
    ];
    if (tax.vat_exempt_sales_centavos > 0) {
      glLines.push({ account_code: ACCOUNTS.SALES_VAT_EXEMPT, debit_centavos: 0, credit_centavos: tax.vat_exempt_sales_centavos });
    }
    if (tax.zero_rated_sales_centavos > 0) {
      glLines.push({ account_code: ACCOUNTS.SALES_VATABLE, debit_centavos: 0, credit_centavos: tax.zero_rated_sales_centavos, description: 'Zero-rated sales' });
    }

    const jeId = await createJournalEntry(env, {
      entry_date: deal.invoice_date || dueDate,
      description: `AR Invoice ${invNum} — ${deal.account_name}`,
      reference: invNum,
      source_module: 'AR',
    }, glLines);

    // ── Create AR invoice with tax columns ──
    await env.DB.prepare(
      `INSERT INTO ar_invoices (
        id, invoice_number, customer_id, customer_name, customer_tin,
        is_top_withholding_agent, crm_deal_id, wms_order_id,
        invoice_date, due_date, amount, amount_centavos, balance, balance_centavos,
        vatable_sales_centavos, vat_exempt_sales_centavos, zero_rated_sales_centavos,
        output_vat_centavos, official_si_number, status, journal_entry_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      id, invNum, deal.account_id || null, deal.account_name || deal.deal_name,
      deal.customer_tin || null, deal.is_top_withholding_agent || 0,
      deal.crm_deal_id || null, deal.wms_order_id || null,
      deal.invoice_date || dueDate, dueDate,
      tax.total_centavos / 100, tax.total_centavos,   // legacy REAL + new centavos
      tax.total_centavos / 100, tax.total_centavos,   // legacy balance + centavos balance
      tax.vatable_sales_centavos, tax.vat_exempt_sales_centavos, tax.zero_rated_sales_centavos,
      tax.output_vat_centavos, deal.official_si_number || null,
      'Open', jeId
    ).run();

    await env.DB.prepare('INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)')
      .bind(idempotency_key, 'CRM_DEAL_TO_AR', JSON.stringify({ invoice_id: id, invoice_number: invNum })).run();

    await audit(env, { username: 'sync' }, 'SYNC', 'ar_invoices', id,
      `AR invoice ${invNum} from CRM deal ${deal.crm_deal_id} — VATable: ${(tax.vatable_sales_centavos/100).toFixed(2)}, Output VAT: ${(tax.output_vat_centavos/100).toFixed(2)}`);
    return json({ success: true, invoice_id: id, invoice_number: invNum });
  }

  // ── WMS PO → AP Invoice (with VAT/EWT split) ──
  if (path === '/api/sync/wms-po') {
    const { idempotency_key, po } = body;

    const existing = await env.DB.prepare('SELECT payload FROM sync_events WHERE idempotency_key = ?').bind(idempotency_key).first();
    if (existing) {
      const payload = JSON.parse(existing.payload);
      return json({ success: true, invoice_id: payload.invoice_id, invoice_number: payload.invoice_number, action: 'idempotent' });
    }

    const id = crypto.randomUUID();
    const invNum = await genInvNum(env, 'AP');
    const dueDate = po.due_date || po.invoice_date || new Date().toISOString().slice(0, 10);

    // ── Convert to centavos ──
    const amountCentavos = toCentavos(po.amount || po.total_amount || 0);
    const isVatSupplier = po.is_vat_supplier !== undefined ? po.is_vat_supplier : 1;

    // ── Compute AP tax breakdown ──
    const tax = computeAPtaxBreakdown({
      amount_centavos: amountCentavos,
      is_vat_supplier: isVatSupplier,
      vatable_purchase_centavos: po.vatable_purchase_centavos || 0,
      input_vat_centavos: po.input_vat_centavos || 0,
      ewt_atc_code: po.ewt_atc_code || null,
    });

    // ── GL Entry: AP Invoice ──
    let glLines;
    if (tax.is_vat_supplier) {
      // VAT Supplier:
      // Debit 5000 COGS: vatable purchase (net of VAT)
      // Debit 1160 Input VAT: 12% input VAT
      // Credit 2000 AP: net payable (after EWT)
      // Credit 2110 EWT Payable: EWT withheld
      glLines = [
        { account_code: ACCOUNTS.COGS, debit_centavos: tax.vatable_purchase_centavos, credit_centavos: 0 },
        { account_code: ACCOUNTS.INPUT_VAT, debit_centavos: tax.input_vat_centavos, credit_centavos: 0 },
        { account_code: ACCOUNTS.AP, debit_centavos: 0, credit_centavos: tax.ap_amount_centavos },
      ];
      if (tax.ewt_withheld_centavos > 0) {
        glLines.push({ account_code: ACCOUNTS.EWT_PAYABLE, debit_centavos: 0, credit_centavos: tax.ewt_withheld_centavos });
      }
    } else {
      // Non-VAT Supplier:
      // Debit 5000 COGS: full amount (no Input VAT)
      // Credit 2000 AP: full amount
      glLines = [
        { account_code: ACCOUNTS.COGS, debit_centavos: tax.non_vat_purchase_centavos, credit_centavos: 0 },
        { account_code: ACCOUNTS.AP, debit_centavos: 0, credit_centavos: tax.ap_amount_centavos },
      ];
    }

    const jeId = await createJournalEntry(env, {
      entry_date: po.invoice_date || dueDate,
      description: `AP Invoice ${invNum} — ${po.supplier_name}`,
      reference: invNum,
      source_module: 'AP',
    }, glLines);

    // ── Create AP invoice with tax columns ──
    await env.DB.prepare(
      `INSERT INTO ap_invoices (
        id, invoice_number, supplier_id, supplier_name, supplier_tin, is_vat_supplier,
        wms_receiving_id, invoice_date, due_date,
        amount, amount_centavos, balance, balance_centavos,
        vatable_purchase_centavos, non_vat_purchase_centavos, input_vat_centavos,
        ewt_atc_code, ewt_withheld_centavos, status, journal_entry_id
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      id, invNum, po.supplier_id || null, po.supplier_name, po.supplier_tin || null, tax.is_vat_supplier,
      po.wms_receiving_id || null, po.invoice_date || dueDate, dueDate,
      tax.ap_amount_centavos / 100, tax.ap_amount_centavos,
      tax.ap_amount_centavos / 100, tax.ap_amount_centavos,
      tax.vatable_purchase_centavos, tax.non_vat_purchase_centavos, tax.input_vat_centavos,
      tax.ewt_atc_code, tax.ewt_withheld_centavos, 'Open', jeId
    ).run();

    await env.DB.prepare('INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)')
      .bind(idempotency_key, 'WMS_PO_TO_AP', JSON.stringify({ invoice_id: id, invoice_number: invNum })).run();

    await audit(env, { username: 'sync' }, 'SYNC', 'ap_invoices', id,
      `AP invoice ${invNum} from WMS PO ${po.wms_receiving_id} — VAT: ${tax.is_vat_supplier ? 'Yes' : 'No'}, EWT: ${(tax.ewt_withheld_centavos/100).toFixed(2)}`);
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

    if (invoice) {
      if (invoice.status === 'Open') {
        await env.DB.prepare(
          "UPDATE ar_invoices SET status = 'Delivered', updated_at = datetime('now') WHERE id = ?"
        ).bind(invoice.id).run();
        await audit(env, { username: 'sync' }, 'STATUS_UPDATE', 'ar_invoices', invoice.id,
          `AR invoice ${invoice.invoice_number} marked Delivered (WMS order ${wms_order_id}, status: ${status})`);
      }
    }

    await env.DB.prepare('INSERT INTO sync_events (idempotency_key, event_type, payload) VALUES (?,?,?)')
      .bind(idempotency_key, 'WMS_DELIVERY_UPDATE', JSON.stringify({ wms_order_id, status, invoice_id: invoice?.id })).run();

    return json({ success: true, invoice_found: !!invoice, invoice_id: invoice?.id || null });
  }

  return json({ error: 'Not found' }, 404);
}

async function genInvNum(env, prefix) {
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, '');
  const table = prefix === 'AR' ? 'ar_invoices' : 'ap_invoices';
  const count = await env.DB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE invoice_number LIKE ?`).bind(`${prefix}-${ymd}-%`).first();
  return `${prefix}-${ymd}-${String((count?.c || 0) + 1).padStart(4, '0')}`;
}
