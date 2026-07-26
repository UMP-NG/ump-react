import { useState, useEffect, useCallback } from 'react';
import Thumb from '../components/Thumb';
import { apiFetch } from '../../utils/api';
import { CreateProductModal } from './Products';

export default function UmpStore() {
  const [seller, setSeller]     = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [drawer, setDrawer]     = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchStore = useCallback(() => {
    setLoading(true);
    apiFetch('/api/admins/ump-store')
      .then(d => { setSeller(d?.seller || null); setProducts(d?.products || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStore(); }, [fetchStore]);

  async function updateProductPatch(id, patch) {
    await apiFetch(`/api/admins/products/${id}`, { method: 'PUT', body: patch }).catch(() => null);
    setDrawer(null);
    fetchStore();
  }

  async function deleteProduct(id) {
    if (!window.confirm('Remove this product from the UMP Store?')) return;
    await apiFetch(`/api/admins/products/${id}`, { method: 'DELETE' }).catch(() => null);
    setDrawer(null);
    fetchStore();
  }

  const presetSeller = seller ? { id: seller.user, name: seller.storeName || 'UMP Store' } : null;

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>
            <i className="fa-solid fa-shield-halved" style={{ color: '#3b82f6', marginRight: 8 }}></i>
            UMP Store
          </h1>
          <p>The official UMP-run store — verified products and merch. Any admin can manage its listings.</p>
        </div>
        <div className="right">
          <button className="abtn ghost" onClick={fetchStore} disabled={loading} title="Refresh">
            <i className={`fa-solid fa-rotate-right${loading ? ' fa-spin' : ''}`}></i> Refresh
          </button>
          <button className="abtn" onClick={() => setShowCreate(true)} disabled={!seller}>
            <i className="fa-solid fa-plus"></i> Add Product
          </button>
        </div>
      </div>

      {seller && (
        <div className="adm-card" style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="fa-solid fa-shield-halved" style={{ color: '#fff', fontSize: '1.6rem' }}></i>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{seller.storeName}</div>
            <div className="muted" style={{ fontSize: '1.2rem', marginTop: 2 }}>{seller.bio}</div>
          </div>
          <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', textAlign: 'right' }}>
            <div><strong>{products.length}</strong> product{products.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      )}

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="6">
                  <div className="adm-empty"><i className="fa-solid fa-box"></i><p>No products listed yet</p></div>
                </td></tr>
              ) : products.map(p => {
                const status = p.isRemoved ? 'removed' : p.isFlagged ? 'flagged' : 'active';
                return (
                  <tr key={p._id} onClick={() => setDrawer(p)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="adm-row-user">
                        <Thumb src={p.images?.[0]?.url} kind="product" label="P" />
                        <div className="name" style={{ fontSize: '1.3rem' }}>{p.name}</div>
                      </div>
                    </td>
                    <td className="muted">{p.category?.name || '—'}</td>
                    <td className="amount"><span className="naira"></span>{(p.price || 0).toLocaleString()}</td>
                    <td className="amount">{p.stock ?? 0}</td>
                    <td><span className={`pill dot ${status === 'active' ? 'green' : status === 'flagged' ? 'amber' : 'red'}`}>{status}</span></td>
                    <td className="muted">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {drawer && (
        <div className="adm-drawer-shell" onClick={() => setDrawer(null)}>
          <div className="adm-drawer" onClick={e => e.stopPropagation()}>
            <div className="adm-drawer-head">
              <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{drawer.name}</div>
              <button className="icon-btn" onClick={() => setDrawer(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="adm-drawer-body">
              <div className="kpi-strip">
                <div className="kpi">
                  <div className="l">Price</div>
                  <div className="v"><span className="naira"></span>{(drawer.price || 0).toLocaleString()}</div>
                </div>
                <div className="kpi">
                  <div className="l">Stock</div>
                  <div className="v">{drawer.stock ?? 0}</div>
                </div>
              </div>
              {drawer.desc && (
                <>
                  <div className="adm-section-h">Description</div>
                  <p style={{ fontSize: '1.3rem', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{drawer.desc}</p>
                </>
              )}
            </div>
            <div className="adm-drawer-foot">
              {!drawer.isFlagged && (
                <button className="abtn ghost" style={{ flex: 1 }} onClick={() => updateProductPatch(drawer._id, { isFlagged: true })}>
                  <i className="fa-solid fa-flag"></i> Flag
                </button>
              )}
              {drawer.isFlagged && (
                <button className="abtn success" style={{ flex: 1 }} onClick={() => updateProductPatch(drawer._id, { isFlagged: false })}>
                  <i className="fa-solid fa-rotate-left"></i> Unflag
                </button>
              )}
              <button className="abtn danger" style={{ flex: 1 }} onClick={() => deleteProduct(drawer._id)}>
                <i className="fa-solid fa-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && presetSeller && (
        <CreateProductModal
          title="Add Product to UMP Store"
          presetSeller={presetSeller}
          onClose={() => setShowCreate(false)}
          onSave={() => { setShowCreate(false); fetchStore(); }}
        />
      )}
    </>
  );
}
