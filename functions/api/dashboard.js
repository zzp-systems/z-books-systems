// ── Dashboard KPIs ──
// GET /api/dashboard → AR/AP summary stats (centavos-based)

export async function onRequestGet({ env }) {
  const db = env.DB;

  const queries = [
    db.prepare("SELECT COALESCE(SUM(balance_centavos), 0) as s, COUNT(*) as c FROM ar_invoices WHERE status IN ('Open', 'Partial', 'Overdue', 'Delivered')").first(),
    db.prepare("SELECT COALESCE(SUM(balance_centavos), 0) as s, COUNT(*) as c FROM ap_invoices WHERE status IN ('Open', 'Partial', 'Overdue')").first(),
    db.prepare("SELECT COALESCE(SUM(balance_centavos), 0) as s, COUNT(*) as c FROM ar_invoices WHERE status IN ('Open', 'Partial', 'Overdue', 'Delivered') AND due_date < date('now')").first(),
    db.prepare("SELECT COALESCE(SUM(balance_centavos), 0) as s, COUNT(*) as c FROM ap_invoices WHERE status IN ('Open', 'Partial', 'Overdue') AND due_date < date('now')").first(),
    db.prepare("SELECT COALESCE(SUM(amount_centavos), 0) as s FROM ar_payments WHERE payment_date >= date('now', '-30 days')").first(),
    db.prepare("SELECT COALESCE(SUM(amount_centavos), 0) as s FROM ap_payments WHERE payment_date >= date('now', '-30 days')").first(),
    // Tax summary: Output VAT collectible, Input VAT claimable, CWT, EWT
    db.prepare("SELECT COALESCE(SUM(output_vat_centavos), 0) as s FROM ar_invoices WHERE status != 'Void'").first(),
    db.prepare("SELECT COALESCE(SUM(input_vat_centavos), 0) as s FROM ap_invoices WHERE status != 'Void'").first(),
    db.prepare("SELECT COALESCE(SUM(cwt_withheld_centavos), 0) as s FROM ar_invoices WHERE status != 'Void'").first(),
    db.prepare("SELECT COALESCE(SUM(ewt_withheld_centavos), 0) as s FROM ap_invoices WHERE status != 'Void'").first(),
    db.prepare("SELECT * FROM ar_invoices ORDER BY created_at DESC LIMIT 5").all(),
    db.prepare("SELECT * FROM ap_invoices ORDER BY created_at DESC LIMIT 5").all(),
  ];

  const [ar, ap, arOverdue, apOverdue, arCollected, apPaid, outputVat, inputVat, cwtTotal, ewtTotal, recentAr, recentAp] = await Promise.all(queries);

  return json({
    total_receivables_centavos: ar?.s || 0,
    open_ar_count: ar?.c || 0,
    total_payables_centavos: ap?.s || 0,
    open_ap_count: ap?.c || 0,
    overdue_ar_centavos: arOverdue?.s || 0,
    overdue_ar_count: arOverdue?.c || 0,
    overdue_ap_centavos: apOverdue?.s || 0,
    overdue_ap_count: apOverdue?.c || 0,
    ar_collected_30d_centavos: arCollected?.s || 0,
    ap_paid_30d_centavos: apPaid?.s || 0,
    // Tax KPIs (for BIR 2550Q / 1601-EQ tracking)
    output_vat_collectible_centavos: outputVat?.s || 0,
    input_vat_claimable_centavos: inputVat?.s || 0,
    cwt_total_centavos: cwtTotal?.s || 0,
    ewt_total_centavos: ewtTotal?.s || 0,
    recent_ar: recentAr?.results || [],
    recent_ap: recentAp?.results || [],
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
