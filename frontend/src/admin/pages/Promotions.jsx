import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';

const STATUS_STYLE = {
  active:    { bg: 'rgba(34,197,94,.12)',  color: '#16a34a', label: 'Active' },
  expired:   { bg: 'rgba(148,163,184,.15)', color: '#64748b', label: 'Expired' },
  depleted:  { bg: 'rgba(234,179,8,.14)',  color: '#a16207', label: 'Sold out' },
  cancelled: { bg: 'rgba(239,68,68,.12)',  color: '#ef4444', label: 'Cancelled' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.active;
  return <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 999, fontSize: '1.1rem', fontWeight: 700 }}>{s.label}</span>;
}

function NewPromotionModal({ onClose, onCreated }) {
  const [storeQuery, setStoreQuery] = useState('');
  const [storeResults, setStoreResults] = useState([]);
  const [storeSearching, setStoreSearching] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null); // { userId, storeName }

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());

  const [discountPercent, setDiscountPercent] = useState('');
  const [maxUnits, setMaxUnits] = useState('');
  const [durationDays, setDurationDays] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function searchStores(q) {
    setStoreQuery(q);
    setSelectedStore(null);
    if (!q.trim()) { setStoreResults([]); return; }
    setStoreSearching(true);
    try {
      const d = await apiFetch(`/api/admins/sellers?q=${encodeURIComponent(q)}&limit=8`);
      setStoreResults(d.sellers || d || []);
    } catch { /* ignore */ }
    finally { setStoreSearching(false); }
  }

  function pickStore(s) {
    setSelectedStore({ userId: s.user?._id, storeName: s.storeName || s.user?.name || 'Store' });
    setStoreResults([]);
    setStoreQuery(s.storeName || s.user?.name || '');
    setSelectedProductIds(new Set());
  }

  useEffect(() => {
    if (!selectedStore?.userId) { setProducts([]); return; }
    setProductsLoading(true);
    apiFetch(`/api/admins/products?seller=${selectedStore.userId}&status=active&limit=200`)
      // Variant products can't be promoted — their real price comes from each
      // variant's own price, not this top-level price, so the backend rejects
      // them outright. Filter them out here instead of letting the admin pick
      // one and then hit a confusing "ineligible" error on submit.
      .then((d) => setProducts((d.products || []).filter((p) => !p.variants?.length)))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, [selectedStore?.userId]);

  function toggleProduct(id) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (!selectedStore?.userId) { setError('Pick a store first'); return; }
    if (!selectedProductIds.size) { setError('Select at least one product'); return; }
    const pct = Number(discountPercent);
    if (!pct || pct < 1 || pct > 95) { setError('Discount must be between 1 and 95%'); return; }
    const units = Number(maxUnits);
    if (!Number.isInteger(units) || units < 1) { setError('Max units must be a positive whole number'); return; }
    const days = Number(durationDays);
    if (!days || days < 1) { setError('Duration must be at least 1 day'); return; }

    setError('');
    setSaving(true);
    try {
      const res = await apiFetch('/api/promotions', {
        method: 'POST',
        body: {
          seller: selectedStore.userId,
          productIds: [...selectedProductIds],
          discountPercent: pct,
          maxUnits: units,
          durationDays: days,
        },
      });
      onCreated(res.promotion);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create promotion');
    } finally {
      setSaving(false);
    }
  }

  const iSty = { width: '100%', padding: '8px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-1)', fontSize: '1.3rem', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' };
  const lSty = { fontSize: '1.15rem', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 4, display: 'block' };

  const examplePrice = products.find((p) => selectedProductIds.has(p._id))?.price;
  const exampleDiscounted = examplePrice && discountPercent
    ? Math.round(examplePrice * (1 - Number(discountPercent) / 100))
    : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div className="adm-card" style={{ maxWidth: 560, width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--card-bg, var(--paper))', zIndex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '1.8rem' }}>New Store Promotion</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.8rem', color: 'var(--ink-3)' }}><i className="fas fa-xmark" /></button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Store picker */}
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label style={lSty}>Store</label>
            <input
              style={iSty}
              value={storeQuery}
              onChange={(e) => searchStores(e.target.value)}
              placeholder="Search store name…"
            />
            {storeSearching && <i className="fas fa-spinner fa-spin" style={{ position: 'absolute', right: 10, top: 36, color: '#94a3b8' }} />}
            {storeResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, zIndex: 50, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,.15)' }}>
                {storeResults.map((s) => (
                  <div
                    key={s._id}
                    onClick={() => pickStore(s)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>{s.storeName || s.user?.name}</div>
                    <div className="muted" style={{ fontSize: '1.1rem' }}>{s.user?.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product picker */}
          {selectedStore?.userId && (
            <div style={{ marginBottom: 14 }}>
              <label style={lSty}>Products <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>({selectedProductIds.size} selected)</span></label>
              {productsLoading ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)' }}><i className="fas fa-spinner fa-spin" /></div>
              ) : products.length === 0 ? (
                <div className="muted" style={{ fontSize: '1.2rem' }}>This store has no active products.</div>
              ) : (
                <div style={{ border: '1px solid var(--line)', borderRadius: 8, maxHeight: 220, overflowY: 'auto' }}>
                  {products.map((p) => {
                    const checked = selectedProductIds.has(p._id);
                    return (
                      <label
                        key={p._id}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--line)', background: checked ? 'rgba(249,115,22,.06)' : 'transparent' }}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleProduct(p._id)} />
                        {p.images?.[0]?.url && <img src={p.images[0].url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>₦{Number(p.price).toLocaleString()}</div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lSty}>Discount (%)</label>
              <input style={iSty} type="number" min="1" max="95" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="e.g. 20" />
            </div>
            <div>
              <label style={lSty}>Max units for this promo</label>
              <input style={iSty} type="number" min="1" value={maxUnits} onChange={(e) => setMaxUnits(e.target.value)} placeholder="e.g. 100" />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Duration (days)</label>
            <input style={iSty} type="number" min="1" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} placeholder="e.g. 7" />
          </div>

          {exampleDiscounted != null && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(34,197,94,.08)', borderRadius: 8, fontSize: '1.2rem', color: '#16a34a' }}>
              Example: ₦{Number(examplePrice).toLocaleString()} → <strong>₦{exampleDiscounted.toLocaleString()}</strong>
            </div>
          )}

          <p className="muted" style={{ fontSize: '1.15rem', lineHeight: 1.5, margin: 0 }}>
            The discount applies immediately and reverts automatically — either once {maxUnits || 'the unit limit'} total units sell, or after {durationDays || 'the duration'} day(s), whichever comes first. You'll be notified when it ends.
          </p>

          {error && <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,.08)', borderRadius: 'var(--r-md)', color: '#dc2626', fontSize: '1.25rem' }}>{error}</div>}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: 'var(--card-bg, var(--paper))' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? <i className="fas fa-spinner fa-spin" /> : 'Create Promotion'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/api/promotions')
      .then((d) => setPromotions(d.promotions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleCreated(promotion) {
    setPromotions((prev) => [promotion, ...prev]);
  }

  async function handleCancel(id) {
    if (!confirm('End this promotion now? Prices will revert immediately.')) return;
    setCancelling(id);
    try {
      const res = await apiFetch(`/api/promotions/${id}`, { method: 'DELETE' });
      setPromotions((prev) => prev.map((p) => p._id === id ? res.promotion : p));
    } catch { /* ignore */ }
    finally { setCancelling(null); }
  }

  const activeCount = promotions.filter((p) => p.status === 'active').length;

  return (
    <>
      {showNew && <NewPromotionModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}

      <div className="adm-page-head">
        <div className="left">
          <h1>Store Promotions</h1>
          <p>{promotions.length} total · {activeCount} active</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
          <i className="fas fa-plus" /> New Promotion
        </button>
      </div>

      <div className="adm-card">
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }} />
          </div>
        ) : promotions.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: '1.4rem' }}>
            No promotions yet. Create your first one.
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Products</th>
                  <th>Discount</th>
                  <th>Units sold</th>
                  <th>Ends</th>
                  <th>Status</th>
                  <th style={{ width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 600 }}>{p.seller?.storeName || p.seller?.name || '—'}</td>
                    <td>{p.products?.length || 0}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{p.discountPercent}%</td>
                    <td>
                      {p.unitsSold || 0} / {p.maxUnits}
                      {p.status === 'depleted' && <span style={{ marginLeft: 6, fontSize: '1rem', color: '#a16207', fontWeight: 700 }}>SOLD OUT</span>}
                    </td>
                    <td style={{ fontSize: '1.2rem', color: 'var(--ink-2)' }}>{p.endsAt ? new Date(p.endsAt).toLocaleDateString() : '—'}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      {p.status === 'active' && (
                        <button className="adm-icon-btn danger" title="End promotion" onClick={() => handleCancel(p._id)} disabled={cancelling === p._id}>
                          {cancelling === p._id ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-stop" />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
