// src/components/Invoices.jsx — z-books-systems (ARAP)
import { useState, useEffect } from 'react';

export default function Invoices() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPay, setShowPay] = useState(null); 
  const [form, setForm] = useState({ customer_name: '', invoice_date: '', due_date: '', amount: '' });
  const [pay, setPay] = useState({ payment_date: '', amount: '', payment_method: 'Cash', reference: '' });

  const fmt = (n) => '₱' + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

  const getHeaders = () => {
    // Fallback checks for common token keys used across the apps
    const token = localStorage.getItem('token') || localStorage.getItem('z_books_token') || localStorage.getItem('jjb_arap_token');
    
    if (!token || token === 'null' || token === 'undefined') {
      throw new Error('No authentication token found. Please log out and log back in.');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoices', { headers: getHeaders() });
      
      if (res.status === 401) {
        throw new Error('Session expired or Unauthorized. Please log out and log in again.');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load invoices');
      
      setList(data.invoices || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) || 0 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invoice');
      
      setShowForm(false); 
      setForm({ customer_name: '', invoice_date: '', due_date: '', amount: '' }); 
      load();
    } catch (err) { setError(err.message); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ 
          invoice_id: showPay.id, 
          ...pay, 
          amount: parseFloat(pay.amount) || 0 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      setShowPay(null); 
      setPay({ payment_date: '', amount: '', payment_method: 'Cash', reference: '' }); 
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="loading">Loading invoices…</div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Accounts Receivable</h1><p>Customer invoices and payments</p></div>
        <button className="btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ New Invoice'}</button>
      </div>

      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}

      {showForm && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>New AR Invoice</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="customer_name">Customer Name *</label>
                <input id="customer_name" name="customer_name" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label htmlFor="amount">Amount (₱) *</label>
                <input id="amount" name="amount" type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
              </div>
              <div className="form-group">
                <label htmlFor="invoice_date">Invoice Date *</label>
                <input id="invoice_date" name="invoice_date" type="date" value={form.invoice_date} onChange={e => setForm({...form, invoice_date: e.target.value})} required />
              </div>
              <div className="form-group">
                <label htmlFor="due_date">Due Date *</label>
                <input id="due_date" name="due_date" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required />
              </div>
            </div>
            <button type="submit" className="btn" style={{ marginTop: '16px' }}>Create Invoice</button>
          </form>
        </div>
      )}

      <div className="card">
        {list.length ? (
          <table>
            <thead><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Due</th><th>Amount</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{inv.customer_name}</td>
                  <td>{inv.invoice_date}</td>
                  <td>{inv.due_date}</td>
                  <td className="text-right">{fmt(inv.amount)}</td>
                  <td className="text-right">{fmt(inv.balance)}</td>
                  <td><span className={`badge ${inv.status === 'Paid' ? 'badge-success' : inv.status === 'Overdue' ? 'badge-danger' : inv.status === 'Delivered' ? 'badge-info' : 'badge-warning'}`}>{inv.status}</span></td>
                  <td>
                    {inv.balance > 0 && (
                      <button className="btn btn-sm" onClick={() => {
                        setShowPay(inv);
                        setPay({ ...pay, payment_date: new Date().toISOString().slice(0, 10), amount: inv.balance });
                      }}>Record Payment</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty-state">No AR invoices. Create one or sync from CRM deals.</div>}
      </div>

      {showPay && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Record Payment for <span className="text-primary">{showPay.invoice_number}</span></h3>
          <form onSubmit={handlePayment}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="payment_date">Payment Date *</label>
                <input id="payment_date" name="payment_date" type="date" value={pay.payment_date} onChange={e => setPay({...pay, payment_date: e.target.value})} required />
              </div>
              <div className="form-group">
                <label htmlFor="pay_amount">Amount (₱) *</label>
                <input id="pay_amount" name="pay_amount" type="number" step="0.01" value={pay.amount} onChange={e => setPay({...pay, amount: e.target.value})} required />
              </div>
              <div className="form-group">
                <label htmlFor="payment_method">Payment Method</label>
                <select id="payment_method" name="payment_method" value={pay.payment_method} onChange={e => setPay({...pay, payment_method: e.target.value})}>
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Check</option>
                  <option>GCash</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="reference">Reference</label>
                <input id="reference" name="reference" value={pay.reference} onChange={e => setPay({...pay, reference: e.target.value})} placeholder="Check #, TXN ID" />
              </div>
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