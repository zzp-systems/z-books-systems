import { useState, useEffect } from 'react';
import { dashboard } from '../api.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboard.stats().then(setStats).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard…</div>;
  if (error) return <div className="loading">Error: {error}</div>;

  const fmt = (c) => '₱' + ((c || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const cards = [
    { label: 'Total Receivables', value: fmt(stats?.total_receivables_centavos), sub: `${stats?.open_ar_count || 0} open invoices` },
    { label: 'Total Payables', value: fmt(stats?.total_payables_centavos), sub: `${stats?.open_ap_count || 0} open invoices` },
    { label: 'Overdue AR', value: fmt(stats?.overdue_ar_centavos), sub: `${stats?.overdue_ar_count || 0} overdue`, danger: true },
    { label: 'Overdue AP', value: fmt(stats?.overdue_ap_centavos), sub: `${stats?.overdue_ap_count || 0} overdue`, danger: true },
    { label: 'Cash Collected (30d)', value: fmt(stats?.ar_collected_30d_centavos), sub: 'customer payments' },
    { label: 'Cash Paid (30d)', value: fmt(stats?.ap_paid_30d_centavos), sub: 'supplier payments' },
  ];

  const taxCards = [
    { label: 'Output VAT Collectible', value: fmt(stats?.output_vat_collectible_centavos), sub: 'BIR 2550Q — 12% on sales', badge: 'badge-info' },
    { label: 'Input VAT Claimable', value: fmt(stats?.input_vat_claimable_centavos), sub: 'BIR 2550Q — 12% on purchases', badge: 'badge-info' },
    { label: 'CWT (2307) Held', value: fmt(stats?.cwt_total_centavos), sub: 'Creditable Withholding Tax from buyers', badge: 'badge-warning' },
    { label: 'EWT Payable', value: fmt(stats?.ewt_total_centavos), sub: 'BIR 1601-EQ — withheld from suppliers', badge: 'badge-warning' },
  ];

  return (
    <div>
      <div className="page-header"><h1>Dashboard</h1><p>Accounting overview — AR, AP, and General Ledger (BIR tax-compliant)</p></div>
      <div className="stat-grid">
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-value" style={c.danger ? { color: 'var(--danger)', fontSize: '24px' } : { fontSize: '24px' }}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-sub muted">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="page-header" style={{ marginTop: '24px' }}><h2 style={{ fontSize: '18px' }}>BIR Tax Position</h2></div>
      <div className="stat-grid">
        {taxCards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-value" style={{ fontSize: '24px' }}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-sub muted">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '12px' }}>Recent AR Invoices</h3>
        {stats?.recent_ar?.length ? (
          <table>
            <thead><tr><th>Invoice #</th><th>Customer</th><th>VATable</th><th>VAT</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>
              {stats.recent_ar.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{inv.customer_name}</td>
                  <td className="text-right">{fmt(inv.vatable_sales_centavos)}</td>
                  <td className="text-right">{fmt(inv.output_vat_centavos)}</td>
                  <td className="text-right">{fmt(inv.amount_centavos)}</td>
                  <td className="text-right">{fmt(inv.balance_centavos)}</td>
                  <td><span className={`badge ${inv.status === 'Paid' ? 'badge-success' : inv.status === 'Overdue' ? 'badge-danger' : inv.status === 'Delivered' ? 'badge-info' : 'badge-warning'}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty-state">No AR invoices yet. Sync from CRM or create manually.</div>}
      </div>
      <div className="card">
        <h3 style={{ marginBottom: '12px' }}>Recent AP Invoices</h3>
        {stats?.recent_ap?.length ? (
          <table>
            <thead><tr><th>Invoice #</th><th>Supplier</th><th>VAT?</th><th>Purchase</th><th>Input VAT</th><th>EWT</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>
              {stats.recent_ap.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{inv.supplier_name}</td>
                  <td>{inv.is_vat_supplier ? '✓' : '✗'}</td>
                  <td className="text-right">{fmt(inv.vatable_purchase_centavos || inv.non_vat_purchase_centavos)}</td>
                  <td className="text-right">{fmt(inv.input_vat_centavos)}</td>
                  <td className="text-right">{fmt(inv.ewt_withheld_centavos)}</td>
                  <td className="text-right">{fmt(inv.amount_centavos)}</td>
                  <td className="text-right">{fmt(inv.balance_centavos)}</td>
                  <td><span className={`badge ${inv.status === 'Paid' ? 'badge-success' : inv.status === 'Overdue' ? 'badge-danger' : 'badge-warning'}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty-state">No AP invoices yet. Sync from WMS or create manually.</div>}
      </div>
    </div>
  );
}