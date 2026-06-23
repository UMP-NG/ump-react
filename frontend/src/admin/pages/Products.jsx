import { useState, useEffect, useCallback, useRef } from 'react';
import Thumb from '../components/Thumb';
import { apiFetch } from '../../utils/api';

const STATUS_COLOR = { active: 'green', flagged: 'amber', removed: 'red', draft: 'gray' };
const FILTERS = ['All', 'Active', 'Flagged', 'Removed'];

function sanitizeCsvCell(v) {
  const s = String(v ?? '');
  return /^[=+\-@]/.test(s) ? `\t${s}` : s;
}

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${sanitizeCsvCell(v).replace(/"/g, '""')}"`).join(',')).join('\n');
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
  const [showCreate, setShowCreate] = useState(false);

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
          <button className="abtn ghost" onClick={fetchProducts} disabled={loading} title="Refresh">
            <i className={`fa-solid fa-rotate-right${loading ? ' fa-spin' : ''}`}></i> Refresh
          </button>
          <button className="abtn ghost" onClick={exportCSV}>
            <i className="fa-solid fa-download"></i> Export
          </button>
          <button className="abtn" onClick={() => setShowCreate(true)}>
            <i className="fa-solid fa-plus"></i> List Product
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
                <th>Status</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="9">
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
      {showCreate && (
        <CreateProductModal
          onClose={() => setShowCreate(false)}
          onSave={() => { setShowCreate(false); fetchProducts(); }}
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

function CreateProductModal({ onClose, onSave }) {
  const [sellers, setSellers] = useState([]);
  const [sellerSearch, setSellerSearch] = useState('');
  const [form, setForm] = useState({ sellerId: '', name: '', price: '', stock: '1', desc: '', condition: 'New', category: '' });
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [types, setTypes] = useState([]);
  const [variants, setVariants] = useState([]);
  const [colorInput, setColorInput] = useState({ name: '', code: '#e0e0e0' });
  const [sizeInput, setSizeInput] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [variantInput, setVariantInput] = useState({ label: '', price: '', stock: '' });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [staged, setStaged] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const modalRef = useRef();

  useEffect(() => {
    apiFetch('/api/admins/sellers?limit=100').then(d => setSellers(d?.sellers || [])).catch(() => {});
    apiFetch('/api/categories').then(d => setCategories(d?.categories || d || [])).catch(() => {});
  }, []);

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  function handleImages(e) {
    const files = Array.from(e.target.files).slice(0, 4 - images.length);
    setImages(prev => [...prev, ...files]);
    files.forEach(file => {
      const r = new FileReader();
      r.onload = () => setPreviews(prev => [...prev, r.result]);
      r.readAsDataURL(file);
    });
  }

  const removeImage = (i) => {
    setImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const addColor = () => { if (!colorInput.name.trim()) return; setColors(c => [...c, { ...colorInput }]); setColorInput({ name: '', code: '#e0e0e0' }); };
  const addSize  = () => { const s = sizeInput.trim().toUpperCase(); if (!s) return; setSizes(arr => arr.includes(s) ? arr : [...arr, s]); setSizeInput(''); };
  const addType  = () => { const t = typeInput.trim(); if (!t) return; setTypes(arr => arr.includes(t) ? arr : [...arr, t]); setTypeInput(''); };
  const addVariant = () => {
    if (!variantInput.label.trim() || !variantInput.price || Number(variantInput.price) <= 0) return;
    setVariants(vs => [...vs, { label: variantInput.label.trim(), price: Number(variantInput.price), stock: Math.max(0, Number(variantInput.stock) || 0) }]);
    setVariantInput({ label: '', price: '', stock: '' });
  };
  const removeVariant = (i) => setVariants(vs => vs.filter((_, idx) => idx !== i));

  const filteredSellers = sellers.filter(s =>
    !sellerSearch || (s.storeName || s.name || '').toLowerCase().includes(sellerSearch.toLowerCase())
  );

  function showError(msg) {
    setError(msg);
    // Scroll the modal to the bottom so the error banner is visible above the sticky footer
    setTimeout(() => modalRef.current?.scrollTo({ top: modalRef.current.scrollHeight, behavior: 'smooth' }), 30);
  }

  function validate() {
    if (!form.sellerId) { showError('Please select a seller.'); return false; }
    if (!form.name.trim()) { showError('Product name is required.'); return false; }
    if (variants.length === 0 && (!form.price || Number(form.price) <= 0)) { showError('A valid price is required — or add priced variants below.'); return false; }
    if (!images.length) { showError('At least one product image is required.'); return false; }
    return true;
  }

  function resetFields() {
    // Keep sellerId/sellerSearch and category — usually listing multiple products for the same seller
    setForm(f => ({ ...f, name: '', price: '', stock: '1', desc: '', condition: 'New' }));
    setColors([]); setSizes([]); setTypes([]); setVariants([]);
    setImages([]); setPreviews([]);
    setColorInput({ name: '', code: '#e0e0e0' });
    setSizeInput(''); setTypeInput(''); setVariantInput({ label: '', price: '', stock: '' });
    if (fileRef.current) fileRef.current.value = '';
    setError('');
  }

  function editQueued(i) {
    const item = staged[i];
    setStaged(s => s.filter((_, idx) => idx !== i));
    setForm(f => ({ ...f, name: item.form.name, price: item.form.price, stock: item.form.stock, desc: item.form.desc, condition: item.form.condition, category: item.form.category }));
    setColors(item.colors || []);
    setSizes(item.sizes || []);
    setTypes(item.types || []);
    setVariants(item.variants || []);
    setImages(item.images || []);
    setPreviews(item.previews || []);
    setVariantInput({ label: '', price: '', stock: '' });
    setError('');
    modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleClose() {
    if (staged.length > 0 && !window.confirm(`You have ${staged.length} queued product${staged.length > 1 ? 's' : ''} that haven't been submitted yet. Close anyway? They will be lost.`)) return;
    onClose();
  }

  function queueProduct() {
    setError('');
    if (!validate()) return;
    setStaged(s => [...s, { form: { ...form }, images: [...images], previews: [...previews], colors: [...colors], sizes: [...sizes], types: [...types], variants: [...variants] }]);
    resetFields();
  }

  function buildFormData(item) {
    const fd = new FormData();
    fd.append('sellerId', item.form.sellerId);
    fd.append('name', item.form.name.trim());
    if (item.variants?.length > 0) {
      fd.append('variants', JSON.stringify(item.variants));
    } else {
      fd.append('price', Number(item.form.price));
      fd.append('stock', Number(item.form.stock) || 1);
    }
    if (item.form.desc) fd.append('desc', item.form.desc);
    fd.append('condition', item.form.condition);
    if (item.form.category) fd.append('category', item.form.category);
    fd.append('colors', JSON.stringify(item.colors));
    if (item.sizes.length) fd.append('sizes', JSON.stringify(item.sizes));
    if (item.types.length) fd.append('types', JSON.stringify(item.types));
    item.images.forEach(f => fd.append('images', f));
    return fd;
  }

  async function handleSave() {
    setError('');
    const allToSubmit = [...staged];
    if (form.name.trim() || images.length) {
      if (!validate()) return;
      allToSubmit.push({ form: { ...form }, images: [...images], previews: [...previews], colors: [...colors], sizes: [...sizes], types: [...types], variants: [...variants] });
    }
    if (!allToSubmit.length) { showError('Please fill in at least one product.'); return; }
    setSaving(true);
    const results = await Promise.allSettled(
      allToSubmit.map(item => apiFetch('/api/admins/products', { method: 'POST', body: buildFormData(item) }))
    );
    setSaving(false);
    const failedIdxs = results.reduce((acc, r, i) => r.status === 'rejected' ? [...acc, i] : acc, []);
    const successCount = results.length - failedIdxs.length;
    if (failedIdxs.length === 0) {
      onSave();
    } else if (successCount > 0) {
      setStaged(failedIdxs.map(i => allToSubmit[i]));
      showError(`${successCount} product${successCount > 1 ? 's' : ''} created. ${failedIdxs.length} failed — review the queued items and resubmit.`);
    } else {
      showError(results[0]?.reason?.message || 'Failed to create product(s). Please try again.');
    }
  }

  const iSty = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-1)', fontSize: '1.3rem', fontFamily: 'inherit', boxSizing: 'border-box' };
  const lSty = { fontSize: '1.15rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: 4, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={handleClose}>
      <div ref={modalRef} style={{ background: 'var(--white)', borderRadius: 12, maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--white)', zIndex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '1.8rem' }}>List Product for Seller</div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.6rem', color: 'var(--ink-3)' }}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Queued products */}
          {staged.length > 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>
                <i className="fa-solid fa-layer-group" style={{ marginRight: 6 }}></i>
                Queued ({staged.length}) — click <i className="fa-solid fa-pen-to-square" style={{ fontSize: '0.9em' }}></i> to edit or <i className="fa-solid fa-check" style={{ fontSize: '0.9em' }}></i> Submit All to save
              </div>
              {staged.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < staged.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  {item.previews[0] && <img src={item.previews[0]} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.form.name}</div>
                    <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)' }}>
                      {item.variants?.length > 0 ? `${item.variants.length} variants · from ₦${Math.min(...item.variants.map(v => v.price)).toLocaleString()}` : `₦${Number(item.form.price).toLocaleString()}`}
                    </div>
                  </div>
                  <button onClick={() => editQueued(i)} title="Edit this queued product" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 4, flexShrink: 0 }}>
                    <i className="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button onClick={() => setStaged(s => s.filter((_, idx) => idx !== i))} title="Remove from queue" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4, flexShrink: 0 }}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Seller picker */}
          <div>
            <label style={lSty}>Seller <span style={{ color: '#ef4444' }}>*</span></label>
            <input style={iSty} placeholder="Search seller name or store…" value={sellerSearch} onChange={e => { setSellerSearch(e.target.value); setForm(f => ({ ...f, sellerId: '' })); }} />
            {sellerSearch && !form.sellerId && filteredSellers.length > 0 && (
              <div style={{ border: '1px solid var(--line)', borderRadius: 8, marginTop: 4, background: 'var(--white)', maxHeight: 180, overflowY: 'auto' }}>
                {filteredSellers.slice(0, 8).map(s => (
                  <div key={s._id} onClick={() => { setForm(f => ({ ...f, sellerId: s.userId || s._id })); setSellerSearch(s.storeName || s.name || s._id); }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '1.3rem', borderBottom: '1px solid var(--line)' }}>
                    <strong>{s.storeName || '—'}</strong> <span style={{ color: 'var(--ink-3)', fontSize: '1.1rem' }}>{s.name || ''}</span>
                  </div>
                ))}
              </div>
            )}
            {form.sellerId && <div style={{ marginTop: 4, fontSize: '1.2rem', color: '#16a34a' }}><i className="fa-solid fa-check"></i> Seller selected</div>}
          </div>

          {/* Name & Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lSty}>Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={iSty} value={form.name} onChange={set('name')} placeholder="Product name" />
            </div>
            <div>
              <label style={lSty}>
                Price (₦) {variants.length === 0 ? <span style={{ color: '#ef4444' }}>*</span> : <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(auto)</span>}
              </label>
              <input style={{ ...iSty, opacity: variants.length > 0 ? 0.45 : 1 }} type="number" min="0" value={variants.length > 0 ? Math.min(...variants.map(v => v.price)) : form.price} onChange={set('price')} placeholder="0" readOnly={variants.length > 0} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lSty}>Stock {variants.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(auto)</span> : ''}</label>
              <input style={{ ...iSty, opacity: variants.length > 0 ? 0.45 : 1 }} type="number" min="0" value={variants.length > 0 ? variants.reduce((s, v) => s + (v.stock || 0), 0) : form.stock} onChange={set('stock')} placeholder="1" readOnly={variants.length > 0} />
            </div>
            <div>
              <label style={lSty}>Condition</label>
              <select style={iSty} value={form.condition} onChange={set('condition')}>
                <option value="New">New</option>
                <option value="Used">Used</option>
              </select>
            </div>
          </div>

          <div>
            <label style={lSty}>Category</label>
            <select style={iSty} value={form.category} onChange={set('category')}>
              <option value="">— Select category —</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={lSty}>Description</label>
            <textarea style={{ ...iSty, height: 72, resize: 'vertical' }} value={form.desc} onChange={set('desc')} placeholder="Describe the product…" />
          </div>

          {/* Images */}
          <div>
            <label style={lSty}>Images <span style={{ color: '#ef4444' }}>*</span> <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(max 4)</span></label>
            {images.length < 4 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 14px', borderRadius: 8, border: '1px dashed var(--line)', width: 'fit-content', fontSize: '1.2rem' }}>
                <i className="fa-solid fa-cloud-arrow-up"></i> Add photos
                <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { handleImages(e); if (fileRef.current) fileRef.current.value = ''; }} />
              </label>
            )}
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative', width: 70, height: 70, borderRadius: 8, overflow: 'hidden' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,.65)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Colors */}
          <div>
            <label style={lSty}>Colours <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(optional)</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {colors.map((c, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, border: '1px solid var(--line)', fontSize: '1.2rem' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: c.code, border: '1px solid rgba(0,0,0,.1)', flexShrink: 0 }} />
                  {c.name}
                  <button onClick={() => setColors(arr => arr.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: '1rem', color: 'var(--ink-3)' }}><i className="fa-solid fa-xmark"></i></button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ ...iSty, flex: 1 }} placeholder="Colour name" value={colorInput.name} onChange={e => setColorInput(c => ({ ...c, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addColor()} />
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: colorInput.code, border: '1px solid rgba(0,0,0,.15)', flexShrink: 0 }} />
              <input type="color" value={colorInput.code} onChange={e => setColorInput(c => ({ ...c, code: e.target.value }))} style={{ width: 40, height: 38, border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', padding: 2, flexShrink: 0 }} />
              <button className="abtn sm ghost" onClick={addColor}>Add</button>
            </div>
          </div>

          {/* Sizes */}
          <div>
            <label style={lSty}>Sizes <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(optional)</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {sizes.map((s, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: '1.2rem', fontWeight: 600 }}>
                  {s}<button onClick={() => setSizes(arr => arr.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: '1rem', color: 'var(--ink-3)' }}><i className="fa-solid fa-xmark"></i></button>
                </span>
              ))}
              {!sizes.length && <span style={{ fontSize: '1.2rem', color: 'var(--ink-3)' }}>None added</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...iSty, flex: 1 }} placeholder="e.g. S, M, L, XL, 42" value={sizeInput} onChange={e => setSizeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSize()} />
              <button className="abtn sm ghost" onClick={addSize}>Add</button>
            </div>
          </div>

          {/* Types */}
          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Types / Variants <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(optional)</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {types.map((t, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: '1.2rem' }}>
                  {t}<button onClick={() => setTypes(arr => arr.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: '1rem', color: 'var(--ink-3)' }}><i className="fa-solid fa-xmark"></i></button>
                </span>
              ))}
              {!types.length && <span style={{ fontSize: '1.2rem', color: 'var(--ink-3)' }}>None added</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...iSty, flex: 1 }} placeholder="e.g. Eau de Parfum, 50ml" value={typeInput} onChange={e => setTypeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addType()} />
              <button className="abtn sm ghost" onClick={addType}>Add</button>
            </div>
          </div>

          {/* Priced Variants */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <label style={lSty}>Priced Variants <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}>(optional — e.g. storage sizes, colour tiers with different prices)</span></label>
            <p style={{ margin: '0 0 10px', fontSize: '1.1rem', color: 'var(--ink-3)', lineHeight: 1.5 }}>
              Use this when the same product comes in options that have <strong>different prices</strong> — e.g. Samsung S26 Ultra 256GB ₦1.3M vs 512GB ₦1.45M, or iPhone 17 Black vs Lavender. Each variant gets its own price and stock.
            </p>
            {variants.length > 0 && (
              <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 64px 32px', padding: '6px 10px', background: 'var(--surface)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink-3)', borderBottom: '1px solid var(--line)', gap: 8 }}>
                  <span>Label</span><span>Price (₦)</span><span>Stock</span><span></span>
                </div>
                {variants.map((v, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 64px 32px', padding: '8px 10px', borderBottom: i < variants.length - 1 ? '1px solid var(--line)' : 'none', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.label}</span>
                    <span style={{ fontSize: '1.2rem' }}>₦{Number(v.price).toLocaleString()}</span>
                    <span style={{ fontSize: '1.2rem' }}>{v.stock}</span>
                    <button onClick={() => removeVariant(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}><i className="fa-solid fa-xmark"></i></button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 64px auto', gap: 6, alignItems: 'center' }}>
              <input style={iSty} placeholder="Label (e.g. Black 256GB)" value={variantInput.label} onChange={e => setVariantInput(v => ({ ...v, label: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addVariant()} />
              <input style={iSty} type="number" placeholder="Price" min="0" value={variantInput.price} onChange={e => setVariantInput(v => ({ ...v, price: e.target.value }))} />
              <input style={iSty} type="number" placeholder="Stock" min="0" value={variantInput.stock} onChange={e => setVariantInput(v => ({ ...v, stock: e.target.value }))} />
              <button onClick={addVariant} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '1.3rem', whiteSpace: 'nowrap' }}>
                <i className="fa-solid fa-plus"></i> Add
              </button>
            </div>
            {variants.length > 0 && (
              <p style={{ margin: '6px 0 0', fontSize: '1.05rem', color: 'var(--ink-3)' }}>
                Price will be ₦{Math.min(...variants.map(v => v.price)).toLocaleString()} (min) · Stock will be {variants.reduce((s, v) => s + (v.stock || 0), 0)} (total)
              </p>
            )}
          </div>

        </div>

        {error && (
          <div style={{ margin: '0 20px 12px', padding: '10px 14px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, fontSize: '1.25rem', color: '#dc2626', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginTop: 2, flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, position: 'sticky', bottom: 0, background: 'var(--white)' }}>
          <button className="abtn ghost" onClick={handleClose} disabled={saving}>Cancel</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="abtn ghost" onClick={queueProduct} disabled={saving} title="Save this product and clear the form to add another">
              <i className="fa-solid fa-layer-group"></i> Queue &amp; Add Another
            </button>
            <button className="abtn" onClick={handleSave} disabled={saving}>
              {saving
                ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Saving…</>
                : staged.length
                  ? <><i className="fa-solid fa-check"></i> Submit All ({staged.length + (form.name.trim() || images.length ? 1 : 0)})</>
                  : <><i className="fa-solid fa-plus"></i> Create Product</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
