import { useState, useEffect, useRef } from 'react';
import Thumb from '../components/Thumb';
import { apiFetch } from '../../utils/api';

export default function Categories() {
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [drawer, setDrawer]               = useState(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [newName, setNewName]             = useState('');
  const [newDesc, setNewDesc]             = useState('');
  const [creating, setCreating]           = useState(false);
  const [createError, setCreateError]     = useState('');
  const fetchRef = useRef(0);

  function fetchCategories() {
    const id = ++fetchRef.current;
    setLoading(true);
    apiFetch('/api/admins/categories')
      .then(d => {
        if (fetchRef.current !== id) return;
        setAllCategories(d?.categories || d || []);
      })
      .catch(() => {})
      .finally(() => { if (fetchRef.current === id) setLoading(false); });
  }

  useEffect(() => { fetchCategories(); }, []);

  // client-side search — no re-fetch on keystroke
  const displayed = search
    ? allCategories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : allCategories;

  async function createCategory(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await apiFetch('/api/admins/categories', { method: 'POST', body: { name: newName.trim(), description: newDesc.trim() } });
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      fetchCategories();
    } catch (err) {
      setCreateError(err?.message || 'Failed to create category');
    } finally {
      setCreating(false);
    }
  }

  async function deleteCategory(id) {
    if (!confirm('Delete this category? Products in it will become uncategorised.')) return;
    await apiFetch(`/api/admins/categories/${id}`, { method: 'DELETE' }).catch(() => null);
    setDrawer(null);
    fetchCategories();
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Categories</h1>
          <p>
            {search
              ? `${displayed.length} of ${allCategories.length} categor${allCategories.length !== 1 ? 'ies' : 'y'}`
              : `${allCategories.length} categor${allCategories.length !== 1 ? 'ies' : 'y'}`}
          </p>
        </div>
        <div className="right">
          <button className="abtn primary" onClick={() => setShowCreate(v => !v)}>
            <i className="fa-solid fa-plus"></i> New category
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="adm-card" style={{ marginBottom: 16 }}>
          <div className="adm-card-body">
            <form onSubmit={createCategory} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  className="adm-field"
                  style={{ flex: 1, height: 38, border: `1px solid ${createError ? '#ef4444' : '#e3e5eb'}`, borderRadius: 9, padding: '0 12px', fontSize: '1.3rem', fontFamily: 'inherit', outline: 'none' }}
                  placeholder="Category name (e.g. Electronics)"
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setCreateError(''); }}
                  autoFocus
                />
                <button className="abtn primary" type="submit" disabled={creating || !newName.trim()}>
                  {creating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Create'}
                </button>
                <button className="abtn ghost" type="button" onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); setCreateError(''); }}>Cancel</button>
              </div>
              <input
                className="adm-field"
                style={{ height: 38, border: '1px solid #e3e5eb', borderRadius: 9, padding: '0 12px', fontSize: '1.3rem', fontFamily: 'inherit', outline: 'none' }}
                placeholder="Description (optional)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
              {createError && <div style={{ color: '#ef4444', fontSize: '1.2rem' }}>{createError}</div>}
            </form>
          </div>
        </div>
      )}

      <div className="adm-filterbar">
        <div style={{ flex: 1 }}></div>
        <div className="adm-search" style={{ maxWidth: 280 }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input placeholder="Search categories…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Category</th><th>Slug</th><th>Subcategories</th><th>Products</th><th>Created</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan="6">
                  <div className="adm-empty">
                    <i className="fa-solid fa-folder-tree"></i>
                    <p>{search ? 'No categories match your search' : 'No categories found'}</p>
                  </div>
                </td></tr>
              ) : displayed.map(c => (
                <tr key={c._id} onClick={() => setDrawer(c)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="adm-row-user">
                      <Thumb src={c.image} kind="product" label={c.name?.[0]?.toUpperCase() || 'C'} />
                      <div className="name" style={{ fontSize: '1.3rem' }}>{c.name}</div>
                    </div>
                  </td>
                  <td className="muted" style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}>{c.slug}</td>
                  <td>
                    {c.subcategoryCount > 0
                      ? <span className="pill blue dot">{c.subcategoryCount} sub{c.subcategoryCount !== 1 ? 's' : ''}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td className="muted">{(c.productCount || 0).toLocaleString()}</td>
                  <td className="muted">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="icon-action" onClick={() => setDrawer(c)}>
                      <i className="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {drawer && (
        <CategoryDrawer
          category={drawer}
          onClose={() => setDrawer(null)}
          onDelete={() => deleteCategory(drawer._id)}
        />
      )}
    </>
  );
}

function CategoryDrawer({ category, onClose, onDelete }) {
  return (
    <div className="adm-drawer-shell" onClick={onClose}>
      <div className="adm-drawer" onClick={e => e.stopPropagation()}>

        {category.image && (
          <div style={{ height: 140, flexShrink: 0, overflow: 'hidden' }}>
            <img src={category.image} alt={category.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div className="adm-drawer-head">
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>{category.name}</div>
            <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', marginTop: 2, fontFamily: 'monospace' }}>/{category.slug}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="adm-drawer-body">
          <div className="kpi-strip">
            <div className="kpi">
              <div className="l">Products</div>
              <div className="v">{(category.productCount || 0).toLocaleString()}</div>
            </div>
            <div className="kpi">
              <div className="l">Subcategories</div>
              <div className="v">{category.subcategoryCount ?? (category.subcategories?.length ?? 0)}</div>
            </div>
          </div>

          {category.description && (
            <>
              <div className="adm-section-h">Description</div>
              <p style={{ fontSize: '1.3rem', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{category.description}</p>
            </>
          )}

          {category.subcategories?.length > 0 && (
            <>
              <div className="adm-section-h">Subcategories ({category.subcategories.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {category.subcategories.map((s, i) => (
                  <span key={s._id || i} style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: 20, fontSize: '1.2rem', color: 'var(--ink-2)' }}>
                    {s.name || s}
                    {s.slug && <span style={{ color: 'var(--ink-4)', marginLeft: 4, fontFamily: 'monospace', fontSize: '1.05rem' }}>·{s.slug}</span>}
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="adm-section-h">Details</div>
          <div className="adm-kv">
            <span className="k">Slug</span>
            <span className="v" style={{ fontFamily: 'monospace' }}>{category.slug}</span>
            <span className="k">Created</span>
            <span className="v">{category.createdAt ? new Date(category.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
          </div>
        </div>

        <div className="adm-drawer-foot">
          <button className="abtn danger" style={{ flex: 1 }} onClick={onDelete}>
            <i className="fa-solid fa-trash"></i> Delete category
          </button>
        </div>
      </div>
    </div>
  );
}
