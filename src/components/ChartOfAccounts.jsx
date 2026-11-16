import { useState, useEffect } from 'react';
import { accounts, changeTrail } from '../api.js';

const SECTIONS = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

const TYPE_COLORS = {
  Asset: 'badge-info', Liability: 'badge-warning',
  Equity: 'badge-success', Revenue: 'badge-success', Expense: 'badge-danger',
};

export default function ChartOfAccounts() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState({ Asset: true, Liability: true, Equity: true, Revenue: true, Expense: true });
  const [expandedParents, setExpandedParents] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [trailModal, setTrailModal] = useState(null);

  useEffect(() => { fetchAccounts(); }, []);

  function fetchAccounts() {
    setLoading(true);
    accounts.list().then(data => {
      const accs = data.accounts || [];
      setList(accs);
      // Auto-expand all parents that have children
      const parentsWithChildren = {};
      accs.forEach(a => { if (a.account_level === 'Parent') parentsWithChildren[a.account_code] = true; });
      setExpandedParents(parentsWithChildren);
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }

  function emptyForm() {
    return { account_code: '', account_name: '', account_type: 'Expense', sub_type: '', parent_account_code: '', account_level: 'Parent', description: '', tax_treatment_notes: '' };
  }

  // Group by section
  const bySection = {};
  SECTIONS.forEach(s => bySection[s] = []);
  list.forEach(a => { if (bySection[a.account_type]) bySection[a.account_type].push(a); });

  // Split into parents and children
  const parentsInSection = (section) => bySection[section].filter(a => a.account_level === 'Parent' || !a.account_level);
  const childrenOf = (parentCode) => list.filter(a => a.parent_account_code === parentCode);

  const parentCount = list.filter(a => a.account_level === 'Parent' || !a.account_level).length;
  const childCount = list.filter(a => a.account_level === 'Child').length;

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await accounts.create(form);
      setShowForm(false); setForm(emptyForm());
      fetchAccounts();
    } catch (err) { setError(err.message); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await accounts.update(editAccount.account_code, form);
      setEditAccount(null); setForm(emptyForm());
      fetchAccounts();
    } catch (err) { setError(err.message); }
  };

  const startEdit = (acc) => {
    setEditAccount(acc);
    setForm({
      account_code: acc.account_code, account_name: acc.account_name,
      account_type: acc.account_type, sub_type: acc.sub_type || '',
      parent_account_code: acc.parent_account_code || '',
      account_level: acc.account_level || 'Parent',
      description: acc.description || '', tax_treatment_notes: acc.tax_treatment_notes || '',
    });
    setShowForm(false);
  };

  const toggleSection = (s) => setExpandedSections(prev => ({ ...prev, [s]: !prev[s] }));
  const toggleParent = (code) => setExpandedParents(prev => ({ ...prev, [code]: !prev[code] }));

  if (loading) return <div className="loading">Loading chart of accounts…</div>;

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header flex-between">
        <div>
          <h1>Chart of Accounts</h1>
          <p className="muted">
            {parentCount} Parents | {childCount} Children | {list.length} Total Accounts
          </p>
        </div>
        <button className="btn" onClick={() => { setShowForm(!showForm); setEditAccount(null); setForm(emptyForm()); }}>
          {showForm ? 'Cancel' : '+ New Account'}
        </button>
      </div>

      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error}</div>}

      {/* ── Create / Edit Form ── */}
      {(showForm || editAccount) && (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>
            {editAccount ? `Edit Account: ${editAccount.account_code}` : 'New Account'}
          </h3>
          <form onSubmit={editAccount ? handleEdit : handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div className="form-group">
                <label>Account Code *</label>
                <input value={form.account_code} onChange={e => setForm({...form, account_code: e.target.value})}
                  disabled={!!editAccount} required placeholder="e.g., 5701" />
              </div>
              <div className="form-group">
                <label>Account Title *</label>
                <input value={form.account_name} onChange={e => setForm({...form, account_name: e.target.value})}
                  required placeholder="e.g., Fuel, Oil & Lubricants" />
              </div>
              <div className="form-group">
                <label>Section / Category *</label>
                <select value={form.account_type} onChange={e => setForm({...form, account_type: e.target.value})}>
                  {SECTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sub-Type</label>
                <input value={form.sub_type} onChange={e => setForm({...form, sub_type: e.target.value})}
                  placeholder="e.g., Operating Expense" />
              </div>
              <div className="form-group">
                <label>Account Level</label>
                <select value={form.account_level} onChange={e => setForm({...form, account_level: e.target.value})}>
                  <option>Parent</option>
                  <option>Child</option>
                </select>
              </div>
              <div className="form-group">
                <label>Parent Account</label>
                <select value={form.parent_account_code} onChange={e => setForm({...form, parent_account_code: e.target.value})}>
                  <option value="">— None (Top-Level) —</option>
                  {parentsInSection(form.account_type).map(p => (
                    <option key={p.account_code} value={p.account_code}>{p.account_code} — {p.account_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label>Description & Transaction Instructions</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                rows={2} placeholder="Describe the account and what transactions route here…" />
            </div>
            <div className="form-group">
              <label>Tax & Accounting Treatment Notes</label>
              <textarea value={form.tax_treatment_notes} onChange={e => setForm({...form, tax_treatment_notes: e.target.value})}
                rows={2} placeholder="BIR treatment, deductibility, VAT, withholding notes…" />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="submit" className="btn">{editAccount ? 'Save Changes' : 'Create Account'}</button>
              {editAccount && <button type="button" className="btn btn-sm" onClick={() => { setEditAccount(null); setForm(emptyForm()); }}>Cancel Edit</button>}
            </div>
          </form>
        </div>
      )}

      {/* ── Master COA Display ── */}
      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              <th style={{ width: '90px' }}>Code</th>
              <th style={{ width: '200px' }}>Account Title</th>
              <th style={{ width: '60px' }}>Level</th>
              <th>Description & Transaction Instructions</th>
              <th style={{ width: '250px' }}>Tax & Accounting Treatment Notes</th>
              <th style={{ width: '80px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map(section => {
              const parents = parentsInSection(section);
              if (parents.length === 0) return null;
              return (
                <>
                  {/* ── Section Header Row ── */}
                  <tr key={`section-${section}`} style={{ background: 'var(--bg-hover)', cursor: 'pointer' }}
                    onClick={() => toggleSection(section)}>
                    <td colSpan={6} style={{ padding: '10px 16px', fontWeight: 700, fontSize: '14px' }}>
                      <span style={{ marginRight: '8px' }}>{expandedSections[section] ? '▼' : '▶'}</span>
                      {section.toUpperCase()} ({parents.length} Parents)
                    </td>
                  </tr>
                  {expandedSections[section] && parents.map(parent => {
                    const children = childrenOf(parent.account_code);
                    return (
                      <>
                        {/* ── Parent Row ── */}
                        <tr key={parent.account_code} style={{ borderBottom: children.length ? 'none' : '' }}>
                          <td style={{ fontWeight: 700 }}>{parent.account_code}</td>
                          <td style={{ fontWeight: 600 }}>
                            {children.length > 0 && (
                              <span style={{ cursor: 'pointer', marginRight: '4px' }}
                                onClick={() => toggleParent(parent.account_code)}>
                                {expandedParents[parent.account_code] ? '▼' : '▶'}
                              </span>
                            )}
                            {parent.account_name}
                          </td>
                          <td><span className={`badge ${TYPE_COLORS[parent.account_type]}`}>Parent</span></td>
                          <td className="muted" style={{ fontSize: '13px' }}>{parent.description || '—'}</td>
                          <td className="muted" style={{ fontSize: '13px' }}>{parent.tax_treatment_notes || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="btn btn-sm" title="Edit" onClick={() => startEdit(parent)}>✏️</button>
                              <button className="btn btn-sm" title="Change Trail"
                                onClick={() => setTrailModal({ entity_type: 'chart_of_accounts', entity_id: parent.account_code, title: `${parent.account_code} — ${parent.account_name}` })}>📋</button>
                            </div>
                          </td>
                        </tr>
                        {/* ── Child Rows ── */}
                        {expandedParents[parent.account_code] && children.map(child => (
                          <tr key={child.account_code} style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                            <td style={{ paddingLeft: '32px', color: 'var(--text-muted)' }}>↳ {child.account_code}</td>
                            <td style={{ paddingLeft: '8px' }}>{child.account_name}</td>
                            <td><span className={`badge ${TYPE_COLORS[child.account_type]}`} style={{ opacity: 0.8 }}>Child</span></td>
                            <td className="muted" style={{ fontSize: '13px' }}>{child.description || '—'}</td>
                            <td className="muted" style={{ fontSize: '13px' }}>{child.tax_treatment_notes || '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn btn-sm" title="Edit" onClick={() => startEdit(child)}>✏️</button>
                                <button className="btn btn-sm" title="Change Trail"
                                  onClick={() => setTrailModal({ entity_type: 'chart_of_accounts', entity_id: child.account_code, title: `${child.account_code} — ${child.account_name}` })}>📋</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Summary Footer ── */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
        {SECTIONS.map(s => (
          <div key={s} className="card" style={{ flex: 1, textAlign: 'center', padding: '12px' }}>
            <div className="muted" style={{ fontSize: '12px' }}>{s}</div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{bySection[s].length}</div>
          </div>
        ))}
        <div className="card" style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'var(--bg)' }}>
          <div className="muted" style={{ fontSize: '12px' }}>Total</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>{list.length}</div>
        </div>
      </div>

      {/* ── Change Trail Modal ── */}
      {trailModal && <ChangeTrailModal entity={trailModal} onClose={() => setTrailModal(null)} />}
    </div>
  );
}

// ── Change Trail Modal (inline) ──
function ChangeTrailModal({ entity, onClose }) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    changeTrail.list(entity.entity_type, entity.entity_id)
      .then(data => setChanges(data.changes || []))
      .catch(() => setChanges([]))
      .finally(() => setLoading(false));
  }, [entity]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div className="card" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <h3>📋 Change Trail — {entity.title}</h3>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>
        {loading ? <p className="muted">Loading…</p> : changes.length === 0 ? (
          <p className="muted">No changes recorded for this account.</p>
        ) : (
          <div>
            {changes.map((c, i) => (
              <div key={c.id || i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className={`badge ${c.action === 'CREATE' ? 'badge-success' : c.action === 'DELETE' ? 'badge-danger' : 'badge-warning'}`}>
                    {c.action}
                  </span>
                  <span className="muted" style={{ fontSize: '12px' }}>{c.changed_at} by {c.changed_by}</span>
                </div>
                {c.field_name !== '__record_deleted__' && (
                  <div style={{ fontSize: '14px' }}>
                    <strong>{c.field_name}</strong>: <span style={{ color: 'var(--danger)' }}>{c.old_value}</span>
                    {' → '}
                    <span style={{ color: 'var(--success)' }}>{c.new_value}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
