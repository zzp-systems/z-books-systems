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

  const fmt = (n) => '₱' + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const cards = [
    { label: 'Total Receivables', value: fmt(stats?.total_receivables), sub: `${stats?.open_ar_count || 0} open invoices` },
    { label: 'Total Payables', value: fmt(stats?.total_payables), sub: `${stats?.open_ap_count || 0} open invoices` },
    { label: 'Overdue AR', value: fmt(stats?.overdue_ar), sub: `${stats?.overdue_ar_count || 0} overdue`, danger: true },
    { label: 'Overdue AP', value: fmt(stats?.overdue_ap), sub: `${stats?.overdue_ap_count || 0} overdue`, danger: true },
    { label: 'Cash Collected (30d)', value: fmt(stats?.ar_collected_30d), sub: 'customer payments' },
    { label: 'Cash Paid (30d)', value: fmt(stats?.ap_paid_30d), sub: 'supplier payments' },
  ];

  return (
    <div>
      <div className="page-header"><h1>Dashboard</h1><p>Accounting overview — AR, AP, and General Ledger</p></div>
      <div className="stat-grid">
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-value" style={c.danger ? { color: 'var(--danger)', fontSize: '24px' } : { fontSize: '24px' }}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
            <div className="stat-sub muted">{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ marginBottom: '12px' }}>Recent AR Invoices</h3>
        {stats?.recent_ar?.length ? (
          <table>
            <thead><tr><th>Invoice #</th><th>Customer</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>
              {stats.recent_ar.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{inv.customer_name}</td>
                  <td className="text-right">{fmt(inv.amount)}</td>
                  <td className="text-right">{fmt(inv.balance)}</td>
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
            <thead><tr><th>Invoice #</th><th>Supplier</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>
              {stats.recent_ap.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{inv.supplier_name}</td>
                  <td className="text-right">{fmt(inv.amount)}</td>
                  <td className="text-right">{fmt(inv.balance)}</td>
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
