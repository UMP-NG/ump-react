import { useState, useEffect, useCallback } from 'react';
import Thumb from '../components/Thumb';
import { apiFetch } from '../../utils/api';

const STATUS_COLOR = { active: 'green', flagged: 'amber', removed: 'red', draft: 'gray' };
const FILTERS = ['All', 'Active', 'Flagged', 'Removed'];
const KIND_MAP = { Electronics: 'electronics', Books: 'books', Clothing: 'clothing', Food: 'food', Beauty: 'beauty', Fitness: 'fitness', Accessories: 'accessories' };

export default function Products() {
  const [filter, setFilter] = useState(0);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);

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
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function bulkAction(action) {
    const ids = [...selected];
    if (!ids.length) return;
    await apiFetch(`/api/admins/products/bulk`, { method: 'POST', body: { action, ids } }).catch(() => null);
    setSelected(new Set());
    fetchProducts();
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Products</h1>
          <p>{total.toLocaleString()} listings</p>
        </div>
        <div className="right">
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button>
        </div>
      </div>

      <div className="adm-filterbar">
        {FILTERS.map((f, i) => (
          <span
            key={f}
            className={`adm-chip${filter === i ? ' active' : ''}`}
            onClick={() => { setFilter(i); setPage(1); }}
          >
            {f}
          </span>
        ))}
        <div style={{ flex: 1 }}></div>
        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', color: 'var(--ink-2)' }}>
            <span><b>{selected.size}</b> selected</span>
            <button className="abtn sm ghost" onClick={() => bulkAction('flag')}><i className="fa-solid fa-flag"></i> Flag</button>
            <button className="abtn sm ghost" onClick={() => bulkAction('feature')}><i className="fa-solid fa-star"></i> Feature</button>
            <button className="abtn sm danger" onClick={() => bulkAction('remove')}><i className="fa-solid fa-trash"></i> Remove</button>
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
                const kind = KIND_MAP[p.category] || 'default';
                return (
                  <tr key={p._id}>
                    <td>
                      <span
                        className={`adm-checkbox${selected.has(p._id) ? ' checked' : ''}`}
                        onClick={() => toggleSelect(p._id)}
                      ></span>
                    </td>
                    <td>
                      <div className="adm-row-user">
                        <Thumb kind={kind} label="P" />
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
                    <td style={{ textAlign: 'right' }}>
                      <button className="icon-action"><i className="fa-solid fa-ellipsis-vertical"></i></button>
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
              <button className="abtn sm dark">{page}</button>
              {page * 20 < total && (
                <button className="abtn sm ghost" onClick={() => setPage(p => p + 1)}>{page + 1}</button>
              )}
              <button className="icon-action" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
