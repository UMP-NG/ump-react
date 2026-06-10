import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';

const EMPTY_FORM = { code: '', discountType: 'percent', discountValue: '', minOrderAmount: '', maxUses: '', expiresAt: '', active: true };

function CouponModal({ coupon, onClose, onSave }) {
  const isEdit = !!coupon?._id;
  const [form, setForm] = useState(coupon ? {
    code: coupon.code || '',
    discountType: coupon.discountType || 'percent',
    discountValue: coupon.discountValue ?? '',
    minOrderAmount: coupon.minOrderAmount ?? '',
    maxUses: coupon.maxUses ?? '',
    expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : '',
    active: coupon.active !== false,
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function handleSave() {
    if (!form.code.trim()) { setError('Coupon code is required'); return; }
    if (!form.discountValue || Number(form.discountValue) <= 0) { setError('Discount value must be > 0'); return; }
    if (form.discountType === 'percent' && Number(form.discountValue) > 100) { setError('Percent discount cannot exceed 100%'); return; }
    setError('');
    setSaving(true);
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderAmount: form.minOrderAmount !== '' ? Number(form.minOrderAmount) : 0,
        maxUses: form.maxUses !== '' ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
        active: form.active,
      };
      const url = isEdit ? `/api/coupons/${coupon._id}` : '/api/coupons';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, body });
      onSave(res.coupon);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  }

  const iSty = { width: '100%', padding: '8px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-1)', fontSize: '1.3rem', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' };
  const lSty = { fontSize: '1.15rem', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 4, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div className="adm-card" style={{ maxWidth: 500, width: '100%', padding: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.8rem' }}>{isEdit ? 'Edit Coupon' : 'New Coupon'}</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.8rem', color: 'var(--ink-3)' }}><i className="fas fa-xmark" /></button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Coupon Code</label>
            <input style={{ ...iSty, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }} value={form.code} onChange={set('code')} placeholder="e.g. SAVE20" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lSty}>Discount Type</label>
              <select style={iSty} value={form.discountType} onChange={set('discountType')}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed (₦)</option>
              </select>
            </div>
            <div>
              <label style={lSty}>{form.discountType === 'percent' ? 'Discount %' : 'Discount ₦'}</label>
              <input style={iSty} type="number" min="0" max={form.discountType === 'percent' ? 100 : undefined} value={form.discountValue} onChange={set('discountValue')} placeholder={form.discountType === 'percent' ? 'e.g. 15' : 'e.g. 500'} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lSty}>Min Order (₦)</label>
              <input style={iSty} type="number" min="0" value={form.minOrderAmount} onChange={set('minOrderAmount')} placeholder="0 = no minimum" />
            </div>
            <div>
              <label style={lSty}>Max Uses</label>
              <input style={iSty} type="number" min="1" value={form.maxUses} onChange={set('maxUses')} placeholder="blank = unlimited" />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Expires At</label>
            <input style={iSty} type="datetime-local" value={form.expiresAt} onChange={set('expiresAt')} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '1.3rem', marginBottom: 4 }}>
            <input type="checkbox" checked={form.active} onChange={set('active')} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            Active (coupon can be used)
          </label>
          {error && <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(239,68,68,.08)', borderRadius: 'var(--r-md)', color: '#dc2626', fontSize: '1.25rem' }}>{error}</div>}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <i className="fas fa-spinner fa-spin" /> : isEdit ? 'Save Changes' : 'Create Coupon'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false); // false=closed, true=new, coupon obj=edit
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/api/coupons')
      .then((d) => setCoupons(d.coupons || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSave(coupon) {
    setCoupons((prev) => {
      const exists = prev.find((c) => c._id === coupon._id);
      return exists ? prev.map((c) => c._id === coupon._id ? coupon : c) : [coupon, ...prev];
    });
  }

  async function handleDelete(id) {
    if (!confirm('Delete this coupon permanently?')) return;
    setDeleting(id);
    try {
      await apiFetch(`/api/coupons/${id}`, { method: 'DELETE' });
      setCoupons((prev) => prev.filter((c) => c._id !== id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  }

  async function handleToggle(coupon) {
    setToggling(coupon._id);
    try {
      const res = await apiFetch(`/api/coupons/${coupon._id}`, { method: 'PUT', body: { active: !coupon.active } });
      setCoupons((prev) => prev.map((c) => c._id === coupon._id ? res.coupon : c));
    } catch { /* ignore */ }
    finally { setToggling(null); }
  }

  const active = coupons.filter((c) => c.active).length;

  return (
    <>
      {modal !== false && (
        <CouponModal coupon={modal === true ? null : modal} onClose={() => setModal(false)} onSave={handleSave} />
      )}

      <div className="adm-page-head">
        <div className="left">
          <h1>Coupons</h1>
          <p>{coupons.length} total · {active} active</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
          <i className="fas fa-plus" /> New Coupon
        </button>
      </div>

      <div className="adm-card">
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }} />
          </div>
        ) : coupons.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: '1.4rem' }}>
            No coupons yet. Create your first one.
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min Order</th>
                  <th>Uses</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th style={{ width: 110 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  const exhausted = c.maxUses && c.usedCount >= c.maxUses;
                  return (
                    <tr key={c._id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.3rem', letterSpacing: '0.05em', background: 'var(--surface)', padding: '3px 8px', borderRadius: 6 }}>
                          {c.code}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {c.discountType === 'percent' ? `${c.discountValue}%` : `₦${Number(c.discountValue).toLocaleString()}`}
                      </td>
                      <td>{c.minOrderAmount ? `₦${Number(c.minOrderAmount).toLocaleString()}` : '—'}</td>
                      <td>
                        {c.usedCount || 0}{c.maxUses ? ` / ${c.maxUses}` : ''}
                        {exhausted && <span style={{ marginLeft: 6, fontSize: '1rem', color: '#dc2626', fontWeight: 700 }}>EXHAUSTED</span>}
                      </td>
                      <td style={{ fontSize: '1.2rem', color: expired ? '#dc2626' : 'var(--ink-2)' }}>
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '∞'}
                        {expired && <span style={{ marginLeft: 4, fontWeight: 700 }}>(Expired)</span>}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggle(c)}
                          disabled={!!toggling}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, fontSize: '1.2rem', fontWeight: 700, color: c.active ? '#16a34a' : 'var(--ink-4)' }}
                        >
                          {toggling === c._id ? <i className="fas fa-spinner fa-spin" /> : c.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="adm-icon-btn" title="Edit" onClick={() => setModal(c)}>
                            <i className="fas fa-pen" />
                          </button>
                          <button className="adm-icon-btn danger" title="Delete" onClick={() => handleDelete(c._id)} disabled={deleting === c._id}>
                            {deleting === c._id ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-trash" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
