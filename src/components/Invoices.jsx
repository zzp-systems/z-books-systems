import { useState, useEffect } from 'react';
import { invoices, entities } from '../api.js';
import ChangeTrailModal from './ChangeTrailModal.jsx';

// ── Centavos helpers ──
const toPeso = (c) => (c || 0) / 100;
const fmtPeso = (c) => '₱' + toPeso(c).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toCent = (p) => Math.round((parseFloat(p) || 0) * 100);

const VAT_RATE = 0.12;

export default function Invoices() {
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPay, setShowPay] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [editId, setEditId] = useState(null);
  const [trailEntity, setTrailEntity] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: '', tin: '', territory: '', address: '', contact_number: '', email: '' });

  // ── Form state (all in pesos for UI; converted to centavos on submit) ──
  const [form, setForm] = useState({
    customer_id: '', customer_name: '', customer_tin: '', is_top_withholding_agent: false,
    invoice_date: '', due_date: '',
    vatable_sales: '', vat_exempt_sales: '', zero_rated_sales: '',
    official_si_number: '',
  });
  const [pay, setPay] = useState({ payment_date: '', amount: '', payment_method: 'Cash', reference: '', cwt_withheld: '', bir_2307_ref: '' });

  // ── Computed VAT preview ──
  const vatable = parseFloat(form.vatable_sales) || 0;
  const vatExempt = parseFloat(form.vat_exempt_sales) || 0;
  const zeroRated = parseFloat(form.zero_rated_sales) || 0;
  const outputVat = vatable > 0 ? vatable * VAT_RATE : 0;
  const totalAmount = vatable + outputVat + vatExempt + zeroRated;

  const load = () => {
    invoices.list().then(data => setList(data.invoices || [])).catch(err => setError(err.message));
    entities.list('Customer').then(data => setCustomers(data.entities || [])).catch(() => {});
  };
  useEffect(() => { load(); setLoading(false); }, []);

  // ── Customer lookup: auto-populate TIN + TWA when selected ──
  const handleCustomerSelect = (e) => {
    const id = e.target.value;
    const cust = customers.find(c => c.id === id);
    if (cust) {
      setForm({
        ...form,
        customer_id: cust.id,
        customer_name: cust.name,
        customer_tin: cust.tin || '',
        is_top_withholding_agent: !!cust.is_top_withholding_agent,
      });
    }
  };

  // ── Quick-add new customer (popup) ──
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    try {
      const newCust = await entities.create({ entity_type: 'Customer', ...quickAddForm });
      setCustomers(prev => [...prev, newCust]);
      setForm({
        ...form,
        customer_id: newCust.id,
        customer_name: newCust.name,
        customer_tin: newCust.tin || '',
        is_top_withholding_agent: !!newCust.is_top_withholding_agent,
      });
      setShowQuickAdd(false);
      setQuickAddForm({ name: '', tin: '', territory: '', address: '', contact_number: '', email: '' });
    } catch (err) { setError(err.message); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await invoices.create({
        customer_id: form.customer_id || null,
        customer_name: form.customer_name,
        customer_tin: form.customer_tin || null,
        is_top_withholding_agent: form.is_top_withholding_agent ? 1 : 0,
        invoice_date: form.invoice_date,
        due_date: form.due_date,
        vatable_sales_centavos: toCent(vatable),
        vat_exempt_sales_centavos: toCent(vatExempt),
        zero_rated_sales_centavos: toCent(zeroRated),
        official_si_number: form.official_si_number || null,
        amount_centavos: toCent(totalAmount),
      });
      setShowForm(false); setEditId(null);
      setForm({ customer_id: '', customer_name: '', customer_tin: '', is_top_withholding_agent: false, invoice_date: '', due_date: '', vatable_sales: '', vat_exempt_sales: '', zero_rated_sales: '', official_si_number: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  // ── Edit invoice ──
  const startEdit = (inv) => {
    setEditId(inv.id);
    setShowForm(true);
    setForm({
      customer_id: '', customer_name: inv.customer_name, customer_tin: inv.customer_tin || '',
      is_top_withholding_agent: !!inv.is_top_withholding_agent,
      invoice_date: inv.invoice_date, due_date: inv.due_date,
      vatable_sales: toPeso(inv.vatable_sales_centavos).toFixed(2),
      vat_exempt_sales: toPeso(inv.vat_exempt_sales_centavos).toFixed(2),
      zero_rated_sales: toPeso(inv.zero_rated_sales_centavos).toFixed(2),
      official_si_number: inv.official_si_number || '',
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await invoices.update(editId, {
        customer_name: form.customer_name,
        customer_tin: form.customer_tin || null,
        is_top_withholding_agent: form.is_top_withholding_agent ? 1 : 0,
        invoice_date: form.invoice_date,
        due_date: form.due_date,
        vatable_sales_centavos: toCent(vatable),
        vat_exempt_sales_centavos: toCent(vatExempt),
        zero_rated_sales_centavos: toCent(zeroRated),
        official_si_number: form.official_si_number || null,
      });
      setShowForm(false); setEditId(null);
      setForm({ customer_id: '', customer_name: '', customer_tin: '', is_top_withholding_agent: false, invoice_date: '', due_date: '', vatable_sales: '', vat_exempt_sales: '', zero_rated_sales: '', official_si_number: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    try {
      await invoices.remove(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await invoices.recordPayment(showPay, {
        payment_date: pay.payment_date,
        amount_centavos: toCent(pay.amount),
        payment_method: pay.payment_method,
        reference: pay.reference,
        cwt_withheld_centavos: toCent(pay.cwt_withheld) || 0,
        bir_2307_ref: pay.bir_2307_ref || null,
      });
      setShowPay(null);
      setPay({ payment_date: '', amount: '', payment_method: 'Cash', reference: '', cwt_withheld: '', bir_2307_ref: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="loading">Loading invoices…</div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Accounts Receivable</h1><p>Customer invoices and payments — BIR VAT-compliant</p></div>
        <button className="btn" onClick={() => { setShowForm(!showForm); setEditId(null); }}>{showForm ? 'Cancel' : '+ New Invoice'}</button>
      </div>

      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}

      {showForm && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>{editId ? 'Edit AR Invoice' : 'New AR Invoice — VAT Breakdown'}</h3>
          <form onSubmit={editId ? handleEdit : handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* ── Customer Lookup (Zoho-style) ── */}
              <div className="form-group">
                <label htmlFor="inv-customer">Customer *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select id="inv-customer" name="customer_id" value={form.customer_id} onChange={handleCustomerSelect} style={{ flex: 1 }}>
                    <option value="">— Select Customer —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" className="btn btn-sm" title="Quick-add new customer" onClick={() => setShowQuickAdd(true)}>+ New</button>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="inv-customer-tin">Customer TIN</label>
                <input id="inv-customer-tin" name="customer_tin" value={form.customer_tin} onChange={e => setForm({...form, customer_tin: e.target.value})} placeholder="Auto-populated from lookup" />
              </div>
              <div className="form-group"><label htmlFor="inv-date">Invoice Date *</label><input id="inv-date" name="invoice_date" type="date" value={form.invoice_date} onChange={e => setForm({...form, invoice_date: e.target.value})} required /></div>
              <div className="form-group"><label htmlFor="inv-due">Due Date *</label><input id="inv-due" name="due_date" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required /></div>
              <div className="form-group"><label htmlFor="inv-vatable">VATable Sales (₱)</label><input id="inv-vatable" name="vatable_sales" type="number" step="0.01" value={form.vatable_sales} onChange={e => setForm({...form, vatable_sales: e.target.value})} placeholder="Net of VAT" /></div>
              <div className="form-group"><label htmlFor="inv-vat-exempt">VAT-Exempt Sales (₱)</label><input id="inv-vat-exempt" name="vat_exempt_sales" type="number" step="0.01" value={form.vat_exempt_sales} onChange={e => setForm({...form, vat_exempt_sales: e.target.value})} placeholder="Raw agricultural goods" /></div>
              <div className="form-group"><label htmlFor="inv-zero-rated">Zero-Rated Sales (₱)</label><input id="inv-zero-rated" name="zero_rated_sales" type="number" step="0.01" value={form.zero_rated_sales} onChange={e => setForm({...form, zero_rated_sales: e.target.value})} placeholder="Export sales" /></div>
              <div className="form-group"><label htmlFor="inv-si-number">Official SI Number (BIR manual)</label><input id="inv-si-number" name="official_si_number" value={form.official_si_number} onChange={e => setForm({...form, official_si_number: e.target.value})} placeholder="SI-2026-00123" /></div>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label htmlFor="inv-twa"><input id="inv-twa" name="is_top_withholding_agent" type="checkbox" checked={form.is_top_withholding_agent} onChange={e => setForm({...form, is_top_withholding_agent: e.target.checked})} /> Top Withholding Agent (auto 1% CWT on payment)</label>
            </div>

            {/* ── VAT Summary Preview ── */}
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg)', borderRadius: '6px' }}>
              <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>Invoice Summary (auto-computed)</h4>
              <table style={{ fontSize: '13px' }}>
                <tbody>
                  <tr><td>VATable Sales</td><td className="text-right">{fmtPeso(toCent(vatable))}</td></tr>
                  <tr><td>12% Output VAT</td><td className="text-right">{fmtPeso(toCent(outputVat))}</td></tr>
                  <tr><td>VAT-Exempt Sales</td><td className="text-right">{fmtPeso(toCent(vatExempt))}</td></tr>
                  <tr><td>Zero-Rated Sales</td><td className="text-right">{fmtPeso(toCent(zeroRated))}</td></tr>
                  <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}><td>Total Invoice</td><td className="text-right">{fmtPeso(toCent(totalAmount))}</td></tr>
                </tbody>
              </table>
            </div>

            <button type="submit" className="btn" style={{ marginTop: '16px' }}>{editId ? 'Save Changes' : 'Create Invoice'}</button>
          </form>
        </div>
      )}

      {/* ── Quick-Add Customer Popup ── */}
      {showQuickAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowQuickAdd(false)}>
          <div className="card" style={{ maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px' }}>Quick-Add Customer</h3>
            <form onSubmit={handleQuickAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group"><label htmlFor="qa-name">Customer Name *</label><input id="qa-name" name="name" value={quickAddForm.name} onChange={e => setQuickAddForm({...quickAddForm, name: e.target.value})} required /></div>
                <div className="form-group"><label htmlFor="qa-tin">TIN</label><input id="qa-tin" name="tin" value={quickAddForm.tin} onChange={e => setQuickAddForm({...quickAddForm, tin: e.target.value})} placeholder="000-000-000-00000" /></div>
                <div className="form-group"><label htmlFor="qa-territory">Territory</label>
                  <select id="qa-territory" name="territory" value={quickAddForm.territory} onChange={e => setQuickAddForm({...quickAddForm, territory: e.target.value})}>
                    <option value="">— Select —</option>
                    <option>North Mindanao</option><option>East Mindanao</option><option>Cebu Central</option>
                    <option>Eastern Visayas</option><option>Universal</option><option>Southmin / GenSan</option>
                  </select>
                </div>
                <div className="form-group"><label htmlFor="qa-contact">Contact Number</label><input id="qa-contact" name="contact_number" value={quickAddForm.contact_number} onChange={e => setQuickAddForm({...quickAddForm, contact_number: e.target.value})} /></div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label htmlFor="qa-address">Address</label><input id="qa-address" name="address" value={quickAddForm.address} onChange={e => setQuickAddForm({...quickAddForm, address: e.target.value})} /></div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button type="submit" className="btn">Add Customer</button>
                <button type="button" className="btn btn-sm" onClick={() => setShowQuickAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        {list.length ? (
          <table>
            <thead><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Due</th><th>VATable</th><th>VAT (12%)</th><th>Total</th><th>Balance</th><th>CWT</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map(inv => (
                <tr key={inv.id}>
                  <td><a href="#" onClick={(e) => { e.preventDefault(); setShowDetail(inv); }} style={{ color: 'var(--primary)', fontWeight: 600 }}>{inv.invoice_number}</a></td>
                  <td>{inv.customer_name}</td>
                  <td>{inv.invoice_date}</td>
                  <td>{inv.due_date}</td>
                  <td className="text-right">{fmtPeso(inv.vatable_sales_centavos)}</td>
                  <td className="text-right">{fmtPeso(inv.output_vat_centavos)}</td>
                  <td className="text-right">{fmtPeso(inv.amount_centavos || toCent(inv.amount))}</td>
                  <td className="text-right">{fmtPeso(inv.balance_centavos || toCent(inv.balance))}</td>
                  <td className="text-right">{inv.cwt_withheld_centavos > 0 ? fmtPeso(inv.cwt_withheld_centavos) : '—'}</td>
                  <td><span className={`badge ${inv.status === 'Paid' ? 'badge-success' : inv.status === 'Overdue' ? 'badge-danger' : inv.status === 'Delivered' ? 'badge-info' : 'badge-warning'}`}>{inv.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-sm" title="Edit" onClick={() => startEdit(inv)}>✏️</button>
                      <button className="btn btn-sm" title="Change Trail" onClick={() => setTrailEntity({ entity_type: 'ar_invoices', entity_id: inv.id, title: `${inv.invoice_number} — ${inv.customer_name}` })}>📋</button>
                      <button className="btn btn-sm" title="Delete" onClick={() => handleDelete(inv.id)}>🗑️</button>
                      {(inv.balance_centavos || toCent(inv.balance)) > 0 && <button className="btn btn-sm" onClick={() => setShowPay(inv.id)}>Pay</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty-state">No AR invoices. Create one or sync from CRM deals.</div>}
      </div>

      {/* ── Invoice Detail Modal ── */}
      {showDetail && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <h3>Invoice Detail — {showDetail.invoice_number}</h3>
            <button className="btn btn-sm" onClick={() => setShowDetail(null)}>Close</button>
          </div>
          <table style={{ fontSize: '13px' }}>
            <tbody>
              <tr><td><strong>Customer</strong></td><td>{showDetail.customer_name}</td><td><strong>Customer TIN</strong></td><td>{showDetail.customer_tin || '—'}</td></tr>
              <tr><td><strong>Invoice Date</strong></td><td>{showDetail.invoice_date}</td><td><strong>Due Date</strong></td><td>{showDetail.due_date}</td></tr>
              <tr><td><strong>Official SI #</strong></td><td>{showDetail.official_si_number || '—'}</td><td><strong>TWA</strong></td><td>{showDetail.is_top_withholding_agent ? 'Yes (1% CWT)' : 'No'}</td></tr>
              <tr style={{ borderTop: '2px solid var(--border)' }}><td><strong>VATable Sales</strong></td><td className="text-right">{fmtPeso(showDetail.vatable_sales_centavos)}</td><td><strong>12% Output VAT</strong></td><td className="text-right">{fmtPeso(showDetail.output_vat_centavos)}</td></tr>
              <tr><td><strong>VAT-Exempt Sales</strong></td><td className="text-right">{fmtPeso(showDetail.vat_exempt_sales_centavos)}</td><td><strong>Zero-Rated Sales</strong></td><td className="text-right">{fmtPeso(showDetail.zero_rated_sales_centavos)}</td></tr>
              <tr><td><strong>CWT Withheld</strong></td><td className="text-right">{fmtPeso(showDetail.cwt_withheld_centavos)}</td><td><strong>BIR 2307 Ref</strong></td><td>{showDetail.bir_2307_ref || '—'}</td></tr>
              <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}><td>Total Amount</td><td className="text-right">{fmtPeso(showDetail.amount_centavos || toCent(showDetail.amount))}</td><td>Balance</td><td className="text-right">{fmtPeso(showDetail.balance_centavos || toCent(showDetail.balance))}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {showPay && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Record Payment — with CWT</h3>
          <form onSubmit={handlePayment}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group"><label htmlFor="ar-pay-date">Payment Date *</label><input id="ar-pay-date" name="payment_date" type="date" value={pay.payment_date} onChange={e => setPay({...pay, payment_date: e.target.value})} required /></div>
              <div className="form-group"><label htmlFor="ar-pay-amount">Cash Received (₱) *</label><input id="ar-pay-amount" name="amount" type="number" step="0.01" value={pay.amount} onChange={e => setPay({...pay, amount: e.target.value})} required /></div>
              <div className="form-group"><label htmlFor="ar-pay-cwt">CWT Withheld (₱)</label><input id="ar-pay-cwt" name="cwt_withheld" type="number" step="0.01" value={pay.cwt_withheld} onChange={e => setPay({...pay, cwt_withheld: e.target.value})} placeholder="1% of VATable (auto if TWA)" /></div>
              <div className="form-group"><label htmlFor="ar-pay-2307">BIR 2307 Ref</label><input id="ar-pay-2307" name="bir_2307_ref" value={pay.bir_2307_ref} onChange={e => setPay({...pay, bir_2307_ref: e.target.value})} placeholder="2307 certificate #" /></div>
              <div className="form-group"><label htmlFor="ar-pay-method">Payment Method</label><select id="ar-pay-method" name="payment_method" value={pay.payment_method} onChange={e => setPay({...pay, payment_method: e.target.value})}><option>Cash</option><option>Bank Transfer</option><option>Check</option><option>GCash</option></select></div>
              <div className="form-group"><label htmlFor="ar-pay-ref">Reference</label><input id="ar-pay-ref" name="reference" value={pay.reference} onChange={e => setPay({...pay, reference: e.target.value})} placeholder="Check #, TXN ID" /></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="submit" className="btn">Record Payment</button>
              <button type="button" className="btn btn-sm" onClick={() => setShowPay(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Change Trail Modal ── */}
      {trailEntity && <ChangeTrailModal entity={trailEntity} onClose={() => setTrailEntity(null)} />}
    </div>
  );
}