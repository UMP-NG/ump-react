import { useState, useEffect, useCallback, useRef } from 'react';
import Thumb from '../components/Thumb';
import { apiFetch } from '../../utils/api';
import { CreateProductModal } from './Products';
import ImageCropModal from '../../components/ImageCropModal';

export default function UmpStore() {
  const [seller, setSeller]     = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [drawer, setDrawer]     = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

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
          <button className="abtn ghost" onClick={() => setShowEdit(true)} disabled={!seller}>
            <i className="fa-solid fa-image"></i> Edit Store
          </button>
          <button className="abtn" onClick={() => setShowCreate(true)} disabled={!seller}>
            <i className="fa-solid fa-plus"></i> Add Product
          </button>
        </div>
      </div>

      {seller && (
        <div className="adm-card" style={{ overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ height: 100, position: 'relative', background: seller.banner?.url ? undefined : 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
            {seller.banner?.url && (
              <img src={seller.banner.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, marginTop: -36 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
              border: '3px solid var(--white)', background: 'var(--white)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {seller.logo?.url
                ? <img src={seller.logo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <i className="fa-solid fa-shield-halved" style={{ color: '#3b82f6', fontSize: '1.8rem' }}></i>}
            </div>
            <div style={{ flex: 1, paddingTop: 20 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{seller.storeName}</div>
              <div className="muted" style={{ fontSize: '1.2rem', marginTop: 2 }}>{seller.bio}</div>
            </div>
            <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', textAlign: 'right', paddingTop: 20 }}>
              <div><strong>{products.length}</strong> product{products.length !== 1 ? 's' : ''}</div>
            </div>
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

      {showEdit && seller && (
        <EditStoreModal
          seller={seller}
          onClose={() => setShowEdit(false)}
          onSave={() => { setShowEdit(false); fetchStore(); }}
        />
      )}
    </>
  );
}

function EditStoreModal({ seller, onClose, onSave }) {
  const [storeName, setStoreName] = useState(seller.storeName || '');
  const [bio, setBio] = useState(seller.bio || '');
  const [bannerFile, setBannerFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(seller.banner?.url || null);
  const [logoPreview, setLogoPreview] = useState(seller.logo?.url || null);
  const [cropSrc, setCropSrc] = useState(null);
  const [cropTarget, setCropTarget] = useState(null); // "banner" | "logo"
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const bannerRef = useRef(null);
  const logoRef = useRef(null);

  // Escape closes the modal like any other dismissible dialog — without this,
  // keyboard users have no way to back out short of Tab-ing to the X button.
  // Skipped while the crop overlay is open — ImageCropModal owns Escape then,
  // and it should cancel just the crop, not lose the whole form underneath.
  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape' && !cropSrc) onClose(); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, cropSrc]);

  function openCrop(file, target) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCropSrc(reader.result); setCropTarget(target); };
    reader.readAsDataURL(file);
  }

  // Revoke each preview's object URL whenever it's replaced by a new crop, and
  // on unmount — the cleanup closes over the *previous* render's value, so this
  // single effect covers both cases without every write site needing its own
  // revoke call. Without this, every crop leaks a blob: URL for the page's life.
  useEffect(() => {
    return () => {
      if (bannerPreview?.startsWith('blob:')) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);
  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  function handleCropConfirm(blob) {
    const file = new File([blob], `ump-store-${cropTarget}.jpg`, { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    if (cropTarget === 'banner') { setBannerPreview(url); setBannerFile(file); }
    else { setLogoPreview(url); setLogoFile(file); }
    setCropSrc(null);
    setCropTarget(null);
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      // Always send the current value (even if empty) so clearing a field on
      // purpose actually reaches the server instead of silently no-oping.
      fd.append('storeName', storeName.trim());
      fd.append('bio', bio.trim());
      if (bannerFile) fd.append('banner', bannerFile);
      if (logoFile) fd.append('logo', logoFile);
      await apiFetch('/api/admins/ump-store', { method: 'PUT', body: fd });
      onSave();
    } catch (err) {
      setError(err?.message || 'Failed to save store details');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          aspect={cropTarget === 'banner' ? 3 / 1 : 1}
          title={cropTarget === 'banner' ? 'Crop store banner' : 'Crop store logo'}
          onConfirm={handleCropConfirm}
          onCancel={() => { setCropSrc(null); setCropTarget(null); }}
        />
      )}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
        <div role="dialog" aria-modal="true" aria-label="Edit UMP Store" style={{ background: 'var(--white)', borderRadius: 12, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.8rem' }}>Edit UMP Store</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.6rem', color: 'var(--ink-3)' }}><i className="fa-solid fa-xmark"></i></button>
          </div>

          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { openCrop(e.target.files[0], 'banner'); e.target.value = ''; }} />
            <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { openCrop(e.target.files[0], 'logo'); e.target.value = ''; }} />

            <div>
              <label style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: 4, display: 'block' }}>Banner</label>
              <div
                onClick={() => bannerRef.current?.click()}
                style={{ width: '100%', height: 110, borderRadius: 10, border: bannerPreview ? 'none' : '2px dashed var(--line)', overflow: 'hidden', cursor: 'pointer', position: 'relative', background: bannerPreview ? undefined : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {bannerPreview
                  ? <img src={bannerPreview} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: 'var(--ink-3)', fontSize: '1.2rem' }}><i className="fa-solid fa-cloud-arrow-up"></i> Upload banner</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                onClick={() => logoRef.current?.click()}
                style={{ width: 80, height: 80, borderRadius: 10, flexShrink: 0, border: logoPreview ? 'none' : '2px dashed var(--line)', overflow: 'hidden', cursor: 'pointer', background: logoPreview ? undefined : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {logoPreview
                  ? <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <i className="fa-solid fa-image" style={{ color: 'var(--ink-3)' }}></i>}
              </div>
              <button className="abtn ghost sm" onClick={() => logoRef.current?.click()}>
                <i className="fa-solid fa-upload"></i> {logoPreview ? 'Change logo' : 'Upload logo'}
              </button>
            </div>

            <div>
              <label style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: 4, display: 'block' }}>Store name</label>
              <input
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-1)', fontSize: '1.3rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                value={storeName} onChange={(e) => setStoreName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: 4, display: 'block' }}>Bio</label>
              <textarea
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-1)', fontSize: '1.3rem', fontFamily: 'inherit', height: 64, resize: 'vertical', boxSizing: 'border-box' }}
                value={bio} onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div style={{ margin: '0 20px 12px', padding: '10px 14px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, fontSize: '1.25rem', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="abtn ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="abtn" onClick={handleSave} disabled={saving}>
              {saving ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Saving…</> : <><i className="fa-solid fa-check"></i> Save</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
