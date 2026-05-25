import { useState, useEffect, useCallback } from 'react';
import Thumb from '../components/Thumb';
import { apiFetch } from '../../utils/api';

const STATUS_COLOR = { active: 'green', flagged: 'amber', removed: 'red', draft: 'gray' };
const FILTERS = ['All', 'Active', 'Flagged', 'Removed'];

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export default function Products() {
  const [filter, setFilter]   = useState(0);
  const [products, setProducts] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [page, setPage]       = useState(1);
  const [drawer, setDrawer]   = useState(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (filter > 0) params.set('status', FILTERS[filter].toLowerCase());
    apiFetch(`/api/admins/products?${params}`)
      .then(d => { setProducts(d?.products || d || []); setTotal(d?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function toggleSelect(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function bulkAction(action) {
    const ids = [...selected];
    if (!ids.length) return;
    await apiFetch('/api/admins/products/bulk', { method: 'POST', body: { action, ids } }).catch(() => null);
    setSelected(new Set());
    fetchProducts();
  }

  async function updateProduct(id, patch) {
    await apiFetch(`/api/admins/products/${id}`, { method: 'PUT', body: patch }).catch(() => null);
    setDrawer(null);
    fetchProducts();
  }

  function exportCSV() {
    if (!products.length) return;
    const header = ['Name', 'Seller', 'Category', 'Price (₦)', 'Stock', 'Status', 'Created'];
    const rows = products.map(p => [
      p.name,
      p.seller?.storeName || p.sellerName || '—',
      p.category || '—',
      p.price ?? 0,
      p.stock ?? 0,
      p.status || 'active',
      p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '—',
    ]);
    downloadCSV([header, ...rows], `ump-products-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Products</h1>
          <p>{total.toLocaleString()} listing{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="right">
          <button className="abtn ghost" onClick={exportCSV}>
            <i className="fa-solid fa-download"></i> Export
          </button>
        </div>
      </div>

      <div className="adm-filterbar">
        {FILTERS.map((f, i) => (
          <span key={f} className={`adm-chip${filter === i ? ' active' : ''}`}
            onClick={() => { setFilter(i); setPage(1); }}>
            {f}
          </span>
        ))}
        <div style={{ flex: 1 }}></div>
        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', color: 'var(--ink-2)' }}>
            <span><b>{selected.size}</b> selected</span>
            <button className="abtn sm ghost" onClick={() => bulkAction('flag')}>
              <i className="fa-solid fa-flag"></i> Flag
            </button>
            <button className="abtn sm ghost" onClick={() => bulkAction('feature')}>
              <i className="fa-solid fa-star"></i> Feature
            </button>
            <button className="abtn sm danger" onClick={() => bulkAction('remove')}>
              <i className="fa-solid fa-trash"></i> Remove
            </button>
          </div>
        )}
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <span
                    className={`adm-checkbox${selected.size === products.length && products.length > 0 ? ' checked' : ''}`}
                    onClick={() => setSelected(selected.size === products.length ? new Set() : new Set(products.map(p => p._id)))}
                  ></span>
                </th>
                <th>Product</th><th>Seller</th><th>Category</th>
                <th>Price</th><th>Stock</th><th>Views</th>
                <th>Status</th><th>Created</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="10">
                  <div className="adm-empty"><i className="fa-solid fa-box"></i><p>No products found</p></div>
                </td></tr>
              ) : products.map(p => {
                const status = p.status || (p.isFlagged ? 'flagged' : 'active');
                return (
                  <tr key={p._id} onClick={() => setDrawer(p)} style={{ cursor: 'pointer' }}>
                    <td onClick={e => e.stopPropagation()}>
                      <span
                        className={`adm-checkbox${selected.has(p._id) ? ' checked' : ''}`}
                        onClick={() => toggleSelect(p._id)}
                      ></span>
                    </td>
                    <td>
                      <div className="adm-row-user">
                        <Thumb src={p.images?.[0]?.url} kind="product" label="P" />
                        <div className="name" style={{ fontSize: '1.3rem' }}>{p.name}</div>
                      </div>
                    </td>
                    <td className="muted">{p.seller?.storeName || p.sellerName || '—'}</td>
                    <td className="muted">{p.category || '—'}</td>
                    <td className="amount"><span className="naira"></span>{(p.price || 0).toLocaleString()}</td>
                    <td className="amount">{p.stock ?? 0}</td>
                    <td className="amount muted">{(p.views || 0).toLocaleString()}</td>
                    <td><span className={`pill dot ${STATUS_COLOR[status] || 'gray'}`}>{status}</span></td>
                    <td className="muted">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="icon-action" onClick={() => setDrawer(p)}>
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {total > 20 && (
          <div className="adm-pagination">
            <span>Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total.toLocaleString()}</span>
            <div className="pages">
              <button className="icon-action" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              {page > 1 && <button className="abtn sm ghost" onClick={() => setPage(page - 1)}>{page - 1}</button>}
              <button className="abtn sm dark">{page}</button>
              {page * 20 < total && <button className="abtn sm ghost" onClick={() => setPage(page + 1)}>{page + 1}</button>}
              <button className="icon-action" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {drawer && (
        <ProductDrawer
          product={drawer}
          onClose={() => setDrawer(null)}
          onFlag={() => updateProduct(drawer._id, { isFlagged: true })}
          onRemove={() => updateProduct(drawer._id, { isRemoved: true })}
          onRestore={() => updateProduct(drawer._id, { isFlagged: false, isRemoved: false })}
        />
      )}
    </>
  );
}

function ProductDrawer({ product, onClose, onFlag, onRemove, onRestore }) {
  const status = product.status || 'active';

  return (
    <div className="adm-drawer-shell" onClick={onClose}>
      <div className="adm-drawer" onClick={e => e.stopPropagation()}>

        {product.images?.[0]?.url && (
          <div style={{ height: 160, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
            <img
              src={product.images[0].url}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, transparent 50%, rgba(15,23,42,.4))',
            }} />
          </div>
        )}

        <div className="adm-drawer-head" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {!product.images?.[0]?.url && (
              <Thumb src={null} kind="product" label="P" />
            )}
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>{product.name}</div>
              <div className="muted" style={{ fontSize: '1.2rem', marginTop: 2 }}>{product.category || '—'}</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="adm-drawer-body">
          <div className="kpi-strip">
            <div className="kpi">
              <div className="l">Price</div>
              <div className="v"><span className="naira"></span>{(product.price || 0).toLocaleString()}</div>
            </div>
            <div className="kpi">
              <div className="l">Stock</div>
              <div className="v">{product.stock ?? 0}</div>
            </div>
            <div className="kpi">
              <div className="l">Views</div>
              <div className="v">{(product.views || 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="adm-section-h">Details</div>
          <div className="adm-kv">
            <span className="k">Seller</span>
            <span className="v">{product.seller?.storeName || product.sellerName || '—'}</span>
            <span className="k">Category</span>
            <span className="v">{product.category || '—'}</span>
            <span className="k">Condition</span>
            <span className="v">{product.condition || 'New'}</span>
            <span className="k">Status</span>
            <span className="v">
              <span className={`pill dot ${STATUS_COLOR[status] || 'gray'}`}>{status}</span>
            </span>
          </div>

          {product.desc && (
            <>
              <div className="adm-section-h">Description</div>
              <p style={{ fontSize: '1.3rem', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
                {product.desc}
              </p>
            </>
          )}
        </div>

        <div className="adm-drawer-foot">
          {status === 'active' && (
            <button className="abtn ghost" style={{ flex: 1 }} onClick={onFlag}>
              <i className="fa-solid fa-flag"></i> Flag
            </button>
          )}
          {status !== 'removed' && (
            <button className="abtn danger" style={{ flex: 1 }} onClick={onRemove}>
              <i className="fa-solid fa-trash"></i> Remove
            </button>
          )}
          {(status === 'flagged' || status === 'removed') && (
            <button className="abtn success" style={{ flex: 1 }} onClick={onRestore}>
              <i className="fa-solid fa-rotate-left"></i> Restore
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
