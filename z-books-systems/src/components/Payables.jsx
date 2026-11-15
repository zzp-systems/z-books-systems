import { useState, useEffect } from 'react';
import { payables } from '../api.js';

export default function Payables() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPay, setShowPay] = useState(null);
  const [form, setForm] = useState({ supplier_name: '', invoice_date: '', due_date: '', amount: '' });
  const [pay, setPay] = useState({ payment_date: '', amount: '', payment_method: 'Cash', reference: '' });

  const fmt = (n) => '₱' + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

  const load = () => {
    payables.list().then(data => setList(data.invoices || [])).catch(err => setError(err.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await payables.create({ ...form, amount: parseFloat(form.amount) || 0 });
      setShowForm(false); setForm({ supplier_name: '', invoice_date: '', due_date: '', amount: '' }); load();
    } catch (err) { setError(err.message); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await payables.recordPayment(showPay, { ...pay, amount: parseFloat(pay.amount) || 0 });
      setShowPay(null); setPay({ payment_date: '', amount: '', payment_method: 'Cash', reference: '' }); load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="loading">Loading payables…</div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Accounts Payable</h1><p>Supplier invoices and payments</p></div>
        <button className="btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ New Invoice'}</button>
      </div>

      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}

      {showForm && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>New AP Invoice</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group"><label>Supplier Name *</label><input value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} required /></div>
              <div className="form-group"><label>Amount (₱) *</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required /></div>
              <div className="form-group"><label>Invoice Date *</label><input type="date" value={form.invoice_date} onChange={e => setForm({...form, invoice_date: e.target.value})} required /></div>
              <div className="form-group"><label>Due Date *</label><input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required /></div>
            </div>
            <button type="submit" className="btn" style={{ marginTop: '16px' }}>Create Invoice</button>
          </form>
        </div>
      )}

      <div className="card">
        {list.length ? (
          <table>
            <thead><tr><th>Invoice #</th><th>Supplier</th><th>Date</th><th>Due</th><th>Amount</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{inv.supplier_name}</td>
                  <td>{inv.invoice_date}</td>
                  <td>{inv.due_date}</td>
                  <td className="text-right">{fmt(inv.amount)}</td>
                  <td className="text-right">{fmt(inv.balance)}</td>
                  <td><span className={`badge ${inv.status === 'Paid' ? 'badge-success' : inv.status === 'Overdue' ? 'badge-danger' : 'badge-warning'}`}>{inv.status}</span></td>
                  <td>{inv.balance > 0 && <button className="btn btn-sm" onClick={() => setShowPay(inv.id)}>Record Payment</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty-state">No AP invoices. Create one or sync from WMS purchase orders.</div>}
      </div>

      {showPay && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Record Payment</h3>
          <form onSubmit={handlePayment}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group"><label>Payment Date *</label><input type="date" value={pay.payment_date} onChange={e => setPay({...pay, payment_date: e.target.value})} required /></div>
              <div className="form-group"><label>Amount (₱) *</label><input type="number" step="0.01" value={pay.amount} onChange={e => setPay({...pay, amount: e.target.value})} required /></div>
              <div className="form-group"><label>Payment Method</label><select value={pay.payment_method} onChange={e => setPay({...pay, payment_method: e.target.value})}><option>Cash</option><option>Bank Transfer</option><option>Check</option></select></div>
              <div className="form-group"><label>Reference</label><input value={pay.reference} onChange={e => setPay({...pay, reference: e.target.value})} /></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="submit" className="btn">Record Payment</button>
              <button type="button" className="btn btn-sm" onClick={() => setShowPay(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
