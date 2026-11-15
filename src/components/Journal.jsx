import { useState, useEffect } from 'react';
import { journal } from '../api.js';

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    entry_date: '', description: '',
    lines: [{ account_code: '', debit: '', credit: '' }, { account_code: '', debit: '', credit: '' }],
  });

  const fmt = (n) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

  const load = () => {
    journal.list().then(data => setEntries(data.entries || [])).catch(err => setError(err.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const updateLine = (i, field, val) => {
    const lines = [...form.lines];
    lines[i] = { ...lines[i], [field]: val };
    setForm({ ...form, lines });
  };

  const addLine = () => setForm({ ...form, lines: [...form.lines, { account_code: '', debit: '', credit: '' }] });

  const handleCreate = async (e) => {
    e.preventDefault();
    const lines = form.lines
      .map(l => ({ account_code: l.account_code, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0 }))
      .filter(l => l.account_code && (l.debit > 0 || l.credit > 0));
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) { setError('Debits and credits must balance'); return; }
    try {
      await journal.create({ entry_date: form.entry_date, description: form.description, lines });
      setShowForm(false); setForm({ entry_date: '', description: '', lines: [{ account_code: '', debit: '', credit: '' }, { account_code: '', debit: '', credit: '' }] }); load();
    } catch (err) { setError(err.message); }
  };

  const handlePost = async (id) => {
    try { await journal.post(id); load(); } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="loading">Loading journal…</div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Journal Entries</h1><p>General Ledger — manual and auto-generated entries</p></div>
        <button className="btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ New Entry'}</button>
      </div>

      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}

      {showForm && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>New Journal Entry</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group"><label>Description</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="form-group"><label>Entry Date *</label><input type="date" value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})} required /></div>
            </div>
            <table>
              <thead><tr><th>Account Code</th><th>Debit</th><th>Credit</th></tr></thead>
              <tbody>
                {form.lines.map((line, i) => (
                  <tr key={i}>
                    <td><input value={line.account_code} onChange={e => updateLine(i, 'account_code', e.target.value)} placeholder="e.g., 1000" /></td>
                    <td><input type="number" step="0.01" value={line.debit} onChange={e => updateLine(i, 'debit', e.target.value)} /></td>
                    <td><input type="number" step="0.01" value={line.credit} onChange={e => updateLine(i, 'credit', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn btn-sm" style={{ marginTop: '8px' }} onClick={addLine}>+ Add Line</button>
            <div style={{ marginTop: '16px' }}><button type="submit" className="btn">Create Entry (Draft)</button></div>
          </form>
        </div>
      )}

      <div className="card">
        {entries.length ? (
          entries.map(entry => (
            <div key={entry.id} style={{ marginBottom: '16px', padding: '12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
              <div className="flex-between" style={{ marginBottom: '8px' }}>
                <strong>{entry.reference || 'Manual'} — {entry.description || 'No description'}</strong>
                <div>
                  <span className="muted">{entry.entry_date}</span>
                  <span className={`badge ${entry.status === 'Posted' ? 'badge-success' : 'badge-warning'}`} style={{ marginLeft: '8px' }}>{entry.status}</span>
                  {entry.status === 'Draft' && <button className="btn btn-sm" style={{ marginLeft: '8px' }} onClick={() => handlePost(entry.id)}>Post</button>}
                </div>
              </div>
              <table>
                <thead><tr><th>Account</th><th>Debit</th><th>Credit</th></tr></thead>
                <tbody>
                  {entry.lines?.map(l => (
                    <tr key={l.id}>
                      <td>{l.account_code}</td>
                      <td className="text-right">{l.debit_centavos ? fmt(l.debit_centavos / 100) : ''}</td>
                      <td className="text-right">{l.credit_centavos ? fmt(l.credit_centavos / 100) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        ) : <div className="empty-state">No journal entries. AR/AP transactions auto-generate entries. Create a manual entry above.</div>}
      </div>
    </div>
  );
}