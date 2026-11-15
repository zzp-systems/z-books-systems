import { useState, useEffect } from 'react';
import { accounts } from '../api.js';

export default function ChartOfAccounts() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ account_code: '', account_name: '', account_type: 'Asset', sub_type: '' });

  const load = () => {
    accounts.list().then(data => setList(data.accounts || [])).catch(err => setError(err.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await accounts.create(form);
      setShowForm(false); setForm({ account_code: '', account_name: '', account_type: 'Asset', sub_type: '' }); load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="loading">Loading chart of accounts…</div>;

  const grouped = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(type => ({
    type, items: list.filter(a => a.account_type === type),
  }));

  return (
    <div>
      <div className="page-header flex-between">
        <div><h1>Chart of Accounts</h1><p>General Ledger account master</p></div>
        <button className="btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ New Account'}</button>
      </div>

      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}

      {showForm && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>New Account</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group"><label>Account Code *</label><input value={form.account_code} onChange={e => setForm({...form, account_code: e.target.value})} placeholder="e.g., 1300" required /></div>
              <div className="form-group"><label>Account Name *</label><input value={form.account_name} onChange={e => setForm({...form, account_name: e.target.value})} required /></div>
              <div className="form-group"><label>Account Type *</label><select value={form.account_type} onChange={e => setForm({...form, account_type: e.target.value})}><option>Asset</option><option>Liability</option><option>Equity</option><option>Revenue</option><option>Expense</option></select></div>
              <div className="form-group"><label>Sub-Type</label><input value={form.sub_type} onChange={e => setForm({...form, sub_type: e.target.value})} placeholder="e.g., Current Asset" /></div>
            </div>
            <button type="submit" className="btn" style={{ marginTop: '16px' }}>Create Account</button>
          </form>
        </div>
      )}

      {grouped.map(group => (
        <div key={group.type} className="card">
          <h3 style={{ marginBottom: '12px' }}>{group.type}</h3>
          {group.items.length ? (
            <table>
              <thead><tr><th>Code</th><th>Account Name</th><th>Sub-Type</th></tr></thead>
              <tbody>
                {group.items.map(a => (
                  <tr key={a.account_code}><td><strong>{a.account_code}</strong></td><td>{a.account_name}</td><td className="muted">{a.sub_type || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <div className="muted">No accounts in this category.</div>}
        </div>
      ))}
    </div>
  );
}
