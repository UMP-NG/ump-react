import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../utils/api';
import { useAppConfig } from '../../context/AppConfigContext';

const DEFAULT_FLAGS = [
  { key: 'hostelListings',        label: 'Hostel listings',         sub: 'Off-campus rental hub',         on: true },
  { key: 'serviceMarketplace',    label: 'Service marketplace',     sub: 'Peer-to-peer freelance gigs',   on: true },
  { key: 'walletTopup',          label: 'Wallet top-up via card',  sub: 'Paystack integration',          on: true },
  { key: 'autoTranslate',        label: 'Auto-translate listings', sub: 'Yoruba / Igbo / Hausa',         on: false },
  { key: 'aiListingAssistant',   label: 'AI listing assistant',    sub: 'Suggest title & price',         on: false },
  { key: 'maintenanceMode',      label: 'Maintenance mode',        sub: 'Block all non-admin traffic',   on: false },
];

const DEFAULT_LOGO = '/images/ump-icon.svg';

export default function Config() {
  const { refreshConfig } = useAppConfig();
  const [fees, setFees] = useState({ platformFee: '3.2', serviceFee: '5.0', minPayout: '2000', payoutCadence: 'Daily' });
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [slides, setSlides] = useState([]);
  const [logo, setLogo] = useState({ url: '', publicId: '' });
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef();
  const slideInputRefs = useRef([]);
  const [slideUploading, setSlideUploading] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    apiFetch('/api/admins/config').then(d => {
      if (d?.fees) setFees(f => ({ ...f, ...d.fees }));
      if (d?.flags) setFlags(prev => prev.map(f => ({ ...f, on: d.flags[f.key] ?? f.on })));
      if (d?.slides) setSlides(d.slides);
      else setSlides([]);
      if (d?.logo?.url) setLogo(d.logo);
    }).catch(() => {});
  }, []);

  async function save() {
    const platformFee = parseFloat(fees.platformFee);
    const serviceFee  = parseFloat(fees.serviceFee);
    const minPayout   = parseInt(fees.minPayout, 10);
    if (isNaN(platformFee) || platformFee < 0 || platformFee > 100) {
      setSaveError('Platform fee must be a number between 0 and 100.');
      return;
    }
    if (isNaN(serviceFee) || serviceFee < 0 || serviceFee > 100) {
      setSaveError('Service fee must be a number between 0 and 100.');
      return;
    }
    if (isNaN(minPayout) || minPayout < 0) {
      setSaveError('Minimum payout must be a positive number.');
      return;
    }
    setSaveError('');
    setSaving(true);
    const flagsObj = Object.fromEntries(flags.map(f => [f.key, f.on]));
    try {
      await apiFetch('/api/admins/config', {
        method: 'PUT',
        body: { fees: { ...fees, platformFee, serviceFee, minPayout }, flags: flagsObj, slides, logo },
      });
      refreshConfig();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err?.message || 'Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function toggleFlag(key) {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, on: !f.on } : f));
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      setSaveError('Logo must be a JPEG, PNG, SVG, or WebP image.');
      return;
    }
    setSaveError('');
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await apiFetch('/api/upload', { method: 'POST', body: fd });
      setLogo({ url: data.url, publicId: data.publicId || '' });
    } catch (err) {
      setSaveError(err?.message || 'Logo upload failed');
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSlideImageUpload(e, idx) {
    const file = e.target.files[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      setSaveError(`Slide ${idx + 1}: image must be JPEG, PNG, or WebP.`);
      return;
    }
    setSaveError('');
    setSlideUploading(prev => new Set([...prev, idx]));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await apiFetch('/api/upload', { method: 'POST', body: fd });
      setSlides(prev => prev.map((sl, j) => j === idx ? { ...sl, image: { url: data.url, publicId: data.publicId || '' } } : sl));
    } catch (err) {
      setSaveError(err?.message || 'Slide image upload failed');
    } finally {
      setSlideUploading(prev => { const n = new Set(prev); n.delete(idx); return n; });
    }
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Site configuration</h1>
          <p>Platform-wide settings</p>
        </div>
        <div className="right">
          {saveError && <span style={{ color: '#ef4444', fontSize: '1.2rem', marginRight: 8 }}>{saveError}</span>}
          <button className="abtn ghost" onClick={() => { window.location.reload(); }}>Discard</button>
          <button className="abtn primary" disabled={saving} onClick={save}>
            {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-check"></i> Save changes</>}
            {saved && !saving && ' ✓'}
          </button>
        </div>
      </div>

      <div className="adm-2col">
        {/* Branding */}
        <div className="adm-card">
          <div className="adm-card-head"><h3>Branding</h3></div>
          <div className="adm-card-body">
            <div className="cfg-logo-row">
              <div className="cfg-logo-preview">
                {logoUploading
                  ? <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '1.8rem', color: '#94a3b8' }} />
                  : <img src={logo.url || DEFAULT_LOGO} alt="App logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                }
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>App logo</div>
                <div className="muted" style={{ fontSize: '1.2rem', marginBottom: 8 }}>Shown in navbar, footer and install prompt.</div>
                <button className="abtn ghost sm" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                  <i className="fa-solid fa-upload"></i> {logoUploading ? 'Uploading…' : 'Upload new logo'}
                </button>
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
              </div>
            </div>
            {logo.url && (
              <div className="cfg-logo-url-row">
                <div className="mono muted">{logo.url}</div>
                <button className="abtn ghost sm" onClick={() => setLogo({ url: '', publicId: '' })}>
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head"><h3>Fees &amp; commission</h3></div>
          <div className="adm-card-body">
            <div className="adm-form-grid">
              <div className="adm-field">
                <label className="lbl">Platform fee (%)</label>
                <input type="number" step="0.1" value={fees.platformFee} onChange={e => setFees(f => ({ ...f, platformFee: e.target.value }))} />
              </div>
              <div className="adm-field">
                <label className="lbl">Service fee (%)</label>
                <input type="number" step="0.1" value={fees.serviceFee} onChange={e => setFees(f => ({ ...f, serviceFee: e.target.value }))} />
              </div>
              <div className="adm-field">
                <label className="lbl">Min payout (₦)</label>
                <input type="number" value={fees.minPayout} onChange={e => setFees(f => ({ ...f, minPayout: e.target.value }))} />
              </div>
              <div className="adm-field">
                <label className="lbl">Payout cadence</label>
                <select value={fees.payoutCadence} onChange={e => setFees(f => ({ ...f, payoutCadence: e.target.value }))}>
                  <option>Daily</option>
                  <option>Weekly</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <h3>Hero carousel</h3>
            <button className="abtn ghost sm" onClick={() => setSlides(s => [...s, { title: '', subtitle: '', ctaLabel: '', url: '', image: { url: '', publicId: '' }, on: true }])}>
              <i className="fa-solid fa-plus"></i> Add slide
            </button>
          </div>
          <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {slides.length === 0 && (
              <div className="muted" style={{ textAlign: 'center', padding: '20px 0', fontSize: '1.3rem' }}>No slides yet — click "Add slide" to get started.</div>
            )}
            {slides.map((s, i) => (
              <div key={i} className="cfg-slide-item">
                <div className="cfg-slide-header">
                  <div className="hero-drag"><i className="fa-solid fa-grip-vertical"></i></div>
                  <div
                    className="cfg-slide-thumb"
                    title="Click to upload slide image"
                    onClick={() => !slideUploading.has(i) && slideInputRefs.current[i]?.click()}
                  >
                    {slideUploading.has(i) && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.7)', borderRadius: 6 }}>
                        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '1.4rem', color: '#64748b' }} />
                      </div>
                    )}
                    {s.image?.url
                      ? <img src={s.image.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', background: '#f5f6f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: '#94a3b8', gap: 4 }}>
                          <i className="fa-solid fa-image" /> {i + 1}
                        </div>
                    }
                    <input
                      ref={el => slideInputRefs.current[i] = el}
                      type="file" accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => handleSlideImageUpload(e, i)}
                    />
                  </div>
                  <input
                    className="cfg-slide-title"
                    value={s.title || ''}
                    onChange={e => setSlides(prev => prev.map((sl, j) => j === i ? { ...sl, title: e.target.value } : sl))}
                    placeholder="Slide title"
                  />
                  <span
                    className={`adm-toggle${s.on ? ' on' : ''}`}
                    style={{ flexShrink: 0 }}
                    onClick={() => setSlides(prev => prev.map((sl, j) => j === i ? { ...sl, on: !sl.on } : sl))}
                  />
                  <button
                    className="abtn danger sm"
                    title="Delete slide"
                    onClick={() => { if (window.confirm('Delete this slide?')) setSlides(prev => prev.filter((_, j) => j !== i)); }}
                  >
                    <i className="fa-solid fa-trash" /> Delete
                  </button>
                </div>
                <input
                  className="cfg-slide-input"
                  value={s.subtitle || ''}
                  onChange={e => setSlides(prev => prev.map((sl, j) => j === i ? { ...sl, subtitle: e.target.value } : sl))}
                  placeholder="Subtitle / description (optional)"
                />
                <div className="cfg-slide-url-row">
                  <input
                    className="cfg-slide-input"
                    value={s.url || ''}
                    onChange={e => setSlides(prev => prev.map((sl, j) => j === i ? { ...sl, url: e.target.value } : sl))}
                    placeholder="Link (e.g. /market or https://…)"
                  />
                  <input
                    className="cfg-slide-input"
                    value={s.ctaLabel || ''}
                    onChange={e => setSlides(prev => prev.map((sl, j) => j === i ? { ...sl, ctaLabel: e.target.value } : sl))}
                    placeholder="Button label (e.g. Explore)"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head"><h3>Feature flags</h3></div>
          <div className="adm-card-body">
            {flags.map((f) => (
              <div key={f.key} className="cfg-flag-row">
                <div className="cfg-flag-info">
                  <div style={{ fontWeight: 600 }}>{f.label}</div>
                  <div className="muted" style={{ fontSize: '1.2rem' }}>{f.sub}</div>
                </div>
                <span className={`adm-toggle${f.on ? ' on' : ''}`} onClick={() => toggleFlag(f.key)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
