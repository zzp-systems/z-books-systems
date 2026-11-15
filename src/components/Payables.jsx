import { useState, useEffect } from 'react';
import { payables } from '../api.js';

// ── Centavos helpers ──
const toPeso = (c) => (c || 0) / 100;
const fmtPeso = (c) => '₱' + toPeso(c).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toCent = (p) => Math.round((parseFloat(p) || 0) * 100);

const VAT_RATE = 0.12;

export default function Payables() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPay, setShowPay] = useState(null);
  const [showDetail, setShowDetail] = useState(null);

  const [form, setForm] = useState({
    supplier_name: '', supplier_tin: '', is_vat_supplier: true,
    invoice_date: '', due_date: '',
    vatable_purchase: '', ewt_atc_code: 'WC158',
  });
  const [pay, setPay] = useState({ payment_date: '', amount: '', payment_method: 'Cash', reference: '' });

  // ── Computed VAT/EWT preview ──
  const vatablePurchase = parseFloat(form.vatable_purchase) || 0;
  const inputVat = form.is_vat_supplier && vatablePurchase > 0 ? vatablePurchase * VAT_RATE : 0;
  const totalGross = vatablePurchase + inputVat;
  const ewtRate = form.ewt_atc_code === 'WC160' ? 0.02 : 0.01;
  const ewtWithheld = form.is_vat_supplier && vatablePurchase > 0 ? vatablePurchase * ewtRate : 0;
  const apAmount = totalGross - ewtWithheld;

  const load = () => {
    payables.list().then(data => setList(data.invoices || [])).catch(err => setError(err.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await payables.create({
        supplier_name: form.supplier_name,
        supplier_tin: form.supplier_tin || null,
        is_vat_supplier: form.is_vat_supplier ? 1 : 0,
        invoice_date: form.invoice_date,
        due_date: form.due_date,
        vatable_purchase_centavos: form.is_vat_supplier ? toCent(vatablePurchase) : 0,
        ewt_atc_code: form.is_vat_supplier ? form.ewt_atc_code : null,
        // amount_centavos = gross (vatable + input VAT) for VAT suppliers, or full amount for Non-VAT
        amount_centavos: form.is_vat_supplier ? toCent(totalGross) : toCent(vatablePurchase),
      });
      setShowForm(false);
      setForm({ supplier_name: '', supplier_tin: '', is_vat_supplier: true, invoice_date: '', due_date: '', vatable_purchase: '', ewt_atc_code: 'WC158' });
      load();
    } catch (err) { setError(err.message); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await payables.recordPayment(showPay, {
        payment_date: pay.payment_date,
        amount_centavos: toCent(pay.amount),
        payment_method: pay.payment_method,
        reference: pay.reference,
      });
      setShowPay(null);
      setPay({ payment_date: '', amount: '', payment_method: 'Cash', reference: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="loading">Loading payables…</div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Accounts Payable</h1><p>Supplier invoices and payments — BIR VAT/EWT-compliant</p></div>
        <button className="btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ New Invoice'}</button>
      </div>

      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}

      {showForm && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>New AP Invoice — VAT / EWT Breakdown</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group"><label>Supplier Name *</label><input value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} required /></div>
              <div className="form-group"><label>Supplier TIN</label><input value={form.supplier_tin} onChange={e => setForm({...form, supplier_tin: e.target.value})} placeholder="000-000-000-00000" /></div>
              <div className="form-group"><label>Invoice Date *</label><input type="date" value={form.invoice_date} onChange={e => setForm({...form, invoice_date: e.target.value})} required /></div>
              <div className="form-group"><label>Due Date *</label><input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required /></div>
              <div className="form-group">
                <label>VAT Status</label>
                <select value={form.is_vat_supplier ? 'vat' : 'non-vat'} onChange={e => setForm({...form, is_vat_supplier: e.target.value === 'vat'})}>
                  <option value="vat">VAT-Registered Supplier (12% Input VAT)</option>
                  <option value="non-vat">Non-VAT Supplier (Farmers / Wet-Market)</option>
                </select>
              </div>
              <div className="form-group">
                <label>EWT ATC Code</label>
                <select value={form.ewt_atc_code} onChange={e => setForm({...form, ewt_atc_code: e.target.value})} disabled={!form.is_vat_supplier}>
                  <option value="WC158">WC158 — 1% Goods</option>
                  <option value="WC160">WC160 — 2% Services</option>
                </select>
              </div>
              <div className="form-group">
                <label>{form.is_vat_supplier ? 'VATable Purchase (₱, net of VAT) *' : 'Purchase Amount (₱) *'}</label>
                <input type="number" step="0.01" value={form.vatable_purchase} onChange={e => setForm({...form, vatable_purchase: e.target.value})} required />
              </div>
            </div>

            {/* ── VAT/EWT Summary Preview ── */}
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg)', borderRadius: '6px' }}>
              <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>Invoice Summary (auto-computed)</h4>
              <table style={{ fontSize: '13px' }}>
                <tbody>
                  <tr><td>{form.is_vat_supplier ? 'VATable Purchase' : 'Non-VAT Purchase'}</td><td className="text-right">{fmtPeso(toCent(vatablePurchase))}</td></tr>
                  {form.is_vat_supplier && <>
                    <tr><td>12% Input VAT</td><td className="text-right">{fmtPeso(toCent(inputVat))}</td></tr>
                    <tr><td>Gross Amount</td><td className="text-right">{fmtPeso(toCent(totalGross))}</td></tr>
                    <tr><td>Less: EWT ({form.ewt_atc_code})</td><td className="text-right">({fmtPeso(toCent(ewtWithheld))})</td></tr>
                  </>}
                  <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}><td>AP Amount (Net)</td><td className="text-right">{fmtPeso(toCent(apAmount))}</td></tr>
                </tbody>
              </table>
            </div>

            <button type="submit" className="btn" style={{ marginTop: '16px' }}>Create Invoice</button>
          </form>
        </div>
      )}

      <div className="card">
        {list.length ? (
          <table>
            <thead><tr><th>Invoice #</th><th>Supplier</th><th>VAT?</th><th>Date</th><th>Due</th><th>Purchase</th><th>Input VAT</th><th>EWT</th><th>AP Amount</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map(inv => (
                <tr key={inv.id}>
                  <td><a href="#" onClick={(e) => { e.preventDefault(); setShowDetail(inv); }} style={{ color: 'var(--primary)', fontWeight: 600 }}>{inv.invoice_number}</a></td>
                  <td>{inv.supplier_name}</td>
                  <td>{inv.is_vat_supplier ? '✓' : '✗'}</td>
                  <td>{inv.invoice_date}</td>
                  <td>{inv.due_date}</td>
                  <td className="text-right">{fmtPeso(inv.vatable_purchase_centavos || inv.non_vat_purchase_centavos)}</td>
                  <td className="text-right">{inv.input_vat_centavos > 0 ? fmtPeso(inv.input_vat_centavos) : '—'}</td>
                  <td className="text-right">{inv.ewt_withheld_centavos > 0 ? fmtPeso(inv.ewt_withheld_centavos) : '—'}</td>
                  <td className="text-right">{fmtPeso(inv.amount_centavos || toCent(inv.amount))}</td>
                  <td className="text-right">{fmtPeso(inv.balance_centavos || toCent(inv.balance))}</td>
                  <td><span className={`badge ${inv.status === 'Paid' ? 'badge-success' : inv.status === 'Overdue' ? 'badge-danger' : 'badge-warning'}`}>{inv.status}</span></td>
                  <td>{(inv.balance_centavos || toCent(inv.balance)) > 0 && <button className="btn btn-sm" onClick={() => setShowPay(inv.id)}>Record Payment</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty-state">No AP invoices. Create one or sync from WMS purchase orders.</div>}
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
              <tr><td><strong>Supplier</strong></td><td>{showDetail.supplier_name}</td><td><strong>Supplier TIN</strong></td><td>{showDetail.supplier_tin || '—'}</td></tr>
              <tr><td><strong>VAT Supplier</strong></td><td>{showDetail.is_vat_supplier ? 'Yes' : 'No'}</td><td><strong>EWT ATC</strong></td><td>{showDetail.ewt_atc_code || '—'}</td></tr>
              <tr style={{ borderTop: '2px solid var(--border)' }}><td><strong>VATable Purchase</strong></td><td className="text-right">{fmtPeso(showDetail.vatable_purchase_centavos)}</td><td><strong>Non-VAT Purchase</strong></td><td className="text-right">{fmtPeso(showDetail.non_vat_purchase_centavos)}</td></tr>
              <tr><td><strong>Input VAT (12%)</strong></td><td className="text-right">{fmtPeso(showDetail.input_vat_centavos)}</td><td><strong>EWT Withheld</strong></td><td className="text-right">{fmtPeso(showDetail.ewt_withheld_centavos)}</td></tr>
              <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}><td>AP Amount</td><td className="text-right">{fmtPeso(showDetail.amount_centavos || toCent(showDetail.amount))}</td><td>Balance</td><td className="text-right">{fmtPeso(showDetail.balance_centavos || toCent(showDetail.balance))}</td></tr>
            </tbody>
          </table>
        </div>
      )}

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
