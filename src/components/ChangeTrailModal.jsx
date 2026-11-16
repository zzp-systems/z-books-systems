import { useState, useEffect } from 'react';
import { changeTrail } from '../api.js';

// ── Shared Change Trail Modal ──
// Shows field-level diffs for any entity across all three apps.
// Props: entity = { entity_type, entity_id, title }
export default function ChangeTrailModal({ entity, onClose }) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entity) return;
    changeTrail.list(entity.entity_type, entity.entity_id)
      .then(data => setChanges(data.changes || []))
      .catch(() => setChanges([]))
      .finally(() => setLoading(false));
  }, [entity]);

  if (!entity) return null;

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
          <p className="muted">No changes recorded for this record.</p>
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
                {c.field_name !== '__record_deleted__' ? (
                  <div style={{ fontSize: '14px' }}>
                    <strong>{c.field_name}</strong>: <span style={{ color: 'var(--danger)' }}>{c.old_value}</span>
                    {' → '}
                    <span style={{ color: 'var(--success)' }}>{c.new_value}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', color: 'var(--danger)' }}>Record deleted</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}