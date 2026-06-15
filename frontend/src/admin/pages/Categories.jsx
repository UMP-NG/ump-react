import { useState, useEffect, useRef } from 'react';
import Thumb from '../components/Thumb';
import { apiFetch } from '../../utils/api';

// â”€â”€ tiny image-upload hook (reused by create + edit forms) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [url,       setUrl]       = useState('');
  const [publicId,  setPublicId]  = useState('');
  const [error,     setError]     = useState('');

  async function pick(file) {
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) { setError('Image must be JPEG, PNG or WebP'); return; }
    setError(''); setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await apiFetch('/api/upload', { method: 'POST', body: fd });
      setUrl(data.url);
      setPublicId(data.publicId || '');
    } catch (e) {
      setError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function reset(initialUrl = '', initialPid = '') {
    setUrl(initialUrl); setPublicId(initialPid); setError('');
  }

  return { url, publicId, uploading, error, pick, reset };
}

// â”€â”€ main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Categories() {
  const [allCategories, setAllCategories] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [drawer,        setDrawer]        = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [newName,       setNewName]       = useState('');
  const [newDesc,       setNewDesc]       = useState('');
  const [creating,      setCreating]      = useState(false);
  const [createError,   setCreateError]   = useState('');
  const createImg = useImageUpload();
  const fetchRef  = useRef(0);

  function fetchCategories() {
    const id = ++fetchRef.current;
    setLoading(true);
    apiFetch('/api/admins/categories')
      .then(d => { if (fetchRef.current !== id) return; setAllCategories(d?.categories || d || []); })
      .catch(() => {})
      .finally(() => { if (fetchRef.current === id) setLoading(false); });
  }

  useEffect(() => { fetchCategories(); }, []);

  const displayed = search
    ? allCategories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : allCategories;

  async function createCategory(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true); setCreateError('');
    try {
      await apiFetch('/api/admins/categories', {
        method: 'POST',
        body: { name: newName.trim(), description: newDesc.trim(), imageUrl: createImg.url, imagePublicId: createImg.publicId },
      });
      setNewName(''); setNewDesc(''); createImg.reset();
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

  function openDrawer(cat) { setDrawer(cat); }
  function handleSaved(updated) {
    setAllCategories(prev => prev.map(c => c._id === updated._id ? { ...c, ...updated } : c));
    setDrawer(prev => prev && prev._id === updated._id ? { ...prev, ...updated } : prev);
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
          <button className="abtn primary" onClick={() => { setShowCreate(v => !v); createImg.reset(); }}>
            <i className="fa-solid fa-plus" /> New category
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="adm-card" style={{ marginBottom: 16 }}>
          <div className="adm-card-body">
            <form onSubmit={createCategory} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Image pick */}
              <ImagePicker label="Category image (optional)" upload={createImg} />

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
                  {creating ? <i className="fa-solid fa-circle-notch fa-spin" /> : 'Create'}
                </button>
                <button className="abtn ghost" type="button" onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); setCreateError(''); createImg.reset(); }}>Cancel</button>
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
        <div style={{ flex: 1 }} />
        <div className="adm-search" style={{ maxWidth: 280 }}>
          <i className="fa-solid fa-magnifying-glass" />
          <input placeholder="Search categoriesâ€¦" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Category</th><th>Slug</th><th>Subcategories</th><th>Products</th><th>Created</th><th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" />
                </td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan="6">
                  <div className="adm-empty">
                    <i className="fa-solid fa-folder-tree" />
                    <p>{search ? 'No categories match your search' : 'No categories found'}</p>
                  </div>
                </td></tr>
              ) : displayed.map(c => (
                <tr key={c._id} onClick={() => openDrawer(c)} style={{ cursor: 'pointer' }}>
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
                      : <span className="muted">â€”</span>}
                  </td>
                  <td className="muted">{(c.productCount || 0).toLocaleString()}</td>
                  <td className="muted">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'â€”'}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="icon-action" onClick={() => openDrawer(c)}>
                      <i className="fa-solid fa-ellipsis-vertical" />
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
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

// â”€â”€ reusable image-picker row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ImagePicker({ label, upload }) {
  const ref = useRef();
  return (
    <div>
      {label && <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>{label}</div>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {upload.url ? (
          <img src={upload.url} alt="preview" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--line)' }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: 10, background: 'var(--surface)', border: '1.5px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="fa-solid fa-image" style={{ color: 'var(--ink-4)', fontSize: '1.6rem' }} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            type="button"
            className="abtn ghost"
            style={{ fontSize: '1.2rem' }}
            disabled={upload.uploading}
            onClick={() => ref.current?.click()}
          >
            {upload.uploading
              ? <><i className="fa-solid fa-circle-notch fa-spin" /> Uploadingâ€¦</>
              : <><i className="fa-solid fa-upload" /> {upload.url ? 'Change image' : 'Upload image'}</>}
          </button>
          {upload.url && (
            <button type="button" className="abtn ghost" style={{ fontSize: '1.2rem', color: '#ef4444' }} onClick={() => upload.reset()}>
              <i className="fa-solid fa-trash" /> Remove
            </button>
          )}
          {upload.error && <div style={{ color: '#ef4444', fontSize: '1.15rem' }}>{upload.error}</div>}
        </div>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => upload.pick(e.target.files[0])} />
      </div>
    </div>
  );
}

// â”€â”€ drawer with inline edit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CategoryDrawer({ category, onClose, onDelete, onSaved }) {
  const [editing,  setEditing]  = useState(false);
  const [name,     setName]     = useState(category.name);
  const [desc,     setDesc]     = useState(category.description || '');
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState('');
  const editImg = useImageUpload();

  // sync when drawer opens for a different category
  useEffect(() => {
    setEditing(false); setName(category.name); setDesc(category.description || ''); setSaveErr('');
    editImg.reset(category.image || '', '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category._id]);

  async function save(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setSaveErr('');
    try {
      const updated = await apiFetch(`/api/admins/categories/${category._id}`, {
        method: 'PUT',
        body: { name: name.trim(), description: desc.trim(), imageUrl: editImg.url, imagePublicId: editImg.publicId },
      });
      onSaved({ ...category, name: updated.name, slug: updated.slug, description: updated.description, image: updated.images?.[0]?.url || null });
      setEditing(false);
    } catch (err) {
      setSaveErr(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const previewImage = editing ? editImg.url : category.image;

  return (
    <div className="adm-drawer-shell" onClick={onClose}>
      <div className="adm-drawer" onClick={e => e.stopPropagation()}>

        {previewImage && (
          <div style={{ height: 140, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
            <img src={previewImage} alt={category.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div className="adm-drawer-head">
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>{category.name}</div>
            <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', marginTop: 2, fontFamily: 'monospace' }}>/{category.slug}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>

        <div className="adm-drawer-body">

          {/* â”€â”€ Edit form â”€â”€ */}
          {editing ? (
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ImagePicker label="Category image" upload={editImg} />
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>Name</div>
                <input
                  className="adm-field"
                  style={{ width: '100%', height: 38, border: '1.5px solid var(--line)', borderRadius: 9, padding: '0 12px', fontSize: '1.3rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>Description</div>
                <textarea
                  className="adm-field"
                  style={{ width: '100%', minHeight: 72, border: '1.5px solid var(--line)', borderRadius: 9, padding: '8px 12px', fontSize: '1.3rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Short description (optional)"
                />
              </div>
              {saveErr && <div style={{ color: '#ef4444', fontSize: '1.2rem' }}>{saveErr}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="abtn primary" type="submit" disabled={saving || !name.trim()} style={{ flex: 1 }}>
                  {saving ? <i className="fa-solid fa-circle-notch fa-spin" /> : <><i className="fa-solid fa-check" /> Save changes</>}
                </button>
                <button className="abtn ghost" type="button" onClick={() => { setEditing(false); setName(category.name); setDesc(category.description || ''); editImg.reset(category.image || '', ''); }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="kpi-strip">
                <div className="kpi"><div className="l">Products</div><div className="v">{(category.productCount || 0).toLocaleString()}</div></div>
                <div className="kpi"><div className="l">Subcategories</div><div className="v">{category.subcategoryCount ?? (category.subcategories?.length ?? 0)}</div></div>
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
                      <span key={s._id || i} style={{ padding: '4px 12px', background: 'var(--surface)', borderRadius: 20, fontSize: '1.2rem', color: 'var(--ink-2)' }}>
                        {s.name || s}
                        {s.slug && <span style={{ color: 'var(--ink-4)', marginLeft: 4, fontFamily: 'monospace', fontSize: '1.05rem' }}>Â·{s.slug}</span>}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <div className="adm-section-h">Details</div>
              <div className="adm-kv">
                <span className="k">Slug</span><span className="v" style={{ fontFamily: 'monospace' }}>{category.slug}</span>
                <span className="k">Created</span><span className="v">{category.createdAt ? new Date(category.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'â€”'}</span>
              </div>
            </>
          )}
        </div>

        {!editing && (
          <div className="adm-drawer-foot">
            <button className="abtn ghost" style={{ flex: 1 }} onClick={() => setEditing(true)}>
              <i className="fa-solid fa-pen" /> Edit
            </button>
            <button className="abtn danger" style={{ flex: 1 }} onClick={onDelete}>
              <i className="fa-solid fa-trash" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

