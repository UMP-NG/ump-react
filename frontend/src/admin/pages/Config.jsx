import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../../utils/api';
import { useAppConfig } from '../../context/AppConfigContext';

const DEFAULT_SUBS = {
  seller:   { monthly: { price: 3000, label: 'Monthly' }, annual: { price: 25000, label: 'Annual', badge: 'Save 31%' } },
  provider: { monthly: { price: 3000, label: 'Monthly' }, annual: { price: 25000, label: 'Annual', badge: 'Save 31%' } },
};

const AD_PLAN_DEFS = [
  { key: '3days',  days: 3,  defaultLabel: 'Starter',  defaultPrice: 1500 },
  { key: '7days',  days: 7,  defaultLabel: 'Standard', defaultPrice: 3000 },
  { key: '14days', days: 14, defaultLabel: 'Premium',  defaultPrice: 5500 },
];

const DEFAULT_AD_PLANS = Object.fromEntries(
  AD_PLAN_DEFS.map(p => [p.key, { price: p.defaultPrice, label: p.defaultLabel }])
);

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
  const [fees, setFees] = useState({
    serviceChargeEnabled: true,
    serviceFee: '5.0',
    serviceChargeMin: '100',
    serviceChargeMax: '2000',
    platformFeeEnabled: false,
    platformFee: '5.0',
    minPayout: '2000',
    payoutCadence: 'Daily',
  });
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [slides, setSlides] = useState([]);
  const [logo, setLogo] = useState({ url: '', publicId: '' });
  const [subs, setSubs] = useState(DEFAULT_SUBS);
  const [adPlans, setAdPlans] = useState(DEFAULT_AD_PLANS);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef();
  const slideInputRefs = useRef([]);
  const [slideUploading, setSlideUploading] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Events / holiday sections
  const [events, setEventsState] = useState([]);
  const [newEvent, setNewEvent] = useState({ title: '', emoji: '🎉' });
  const [eventSaving, setEventSaving] = useState(false);
  const [productQuery, setProductQuery] = useState({});   // eventId → search string
  const [productResults, setProductResults] = useState({}); // eventId → [{_id, name, images}]
  const [productSearching, setProductSearching] = useState({});

  const loadEvents = useCallback(() => {
    apiFetch('/api/admins/events').then(d => setEventsState(d?.events || [])).catch(() => {});
  }, []);

  useEffect(() => {
    apiFetch('/api/admins/config').then(d => {
      if (d?.fees) setFees(f => ({ ...f, ...d.fees }));
      if (d?.flags) setFlags(prev => prev.map(f => ({ ...f, on: d.flags[f.key] ?? f.on })));
      if (d?.slides) setSlides(d.slides);
      else setSlides([]);
      if (d?.logo?.url) setLogo(d.logo);
      if (d?.subscriptions) setSubs(s => {
        const deepMerge = (def, srv) => ({
          monthly: { ...def.monthly, ...(srv?.monthly || {}) },
          annual:  { ...def.annual,  ...(srv?.annual  || {}) },
        });
        return {
          seller:   deepMerge(s.seller,   d.subscriptions.seller),
          provider: deepMerge(s.provider, d.subscriptions.provider),
        };
      });
      if (d?.adPlans) setAdPlans(prev => {
        const merged = { ...prev };
        for (const key of Object.keys(DEFAULT_AD_PLANS)) {
          if (d.adPlans[key]) merged[key] = { ...prev[key], ...d.adPlans[key] };
        }
        return merged;
      });
    }).catch(() => {});
    loadEvents();
  }, [loadEvents]);

  async function save() {
    const serviceFee       = parseFloat(fees.serviceFee);
    const serviceChargeMin = parseInt(fees.serviceChargeMin, 10);
    const serviceChargeMax = parseInt(fees.serviceChargeMax, 10);
    const platformFee      = parseFloat(fees.platformFee);
    const minPayout        = parseInt(fees.minPayout, 10);
    if (isNaN(serviceFee) || serviceFee < 0 || serviceFee > 100) {
      setSaveError('Service charge rate must be between 0 and 100.');
      return;
    }
    if (isNaN(serviceChargeMin) || serviceChargeMin < 0) {
      setSaveError('Service charge minimum must be a positive number.');
      return;
    }
    if (isNaN(serviceChargeMax) || serviceChargeMax < serviceChargeMin) {
      setSaveError('Service charge maximum must be greater than the minimum.');
      return;
    }
    if (isNaN(platformFee) || platformFee < 0 || platformFee > 100) {
      setSaveError('Platform fee must be a number between 0 and 100.');
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
        body: {
          fees: {
            ...fees,
            serviceFee, serviceChargeMin, serviceChargeMax,
            platformFee, minPayout,
          },
          flags: flagsObj, slides, logo, subscriptions: subs, adPlans,
        },
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

  async function createEvent() {
    if (!newEvent.title.trim()) return;
    setEventSaving(true);
    try {
      await apiFetch('/api/admins/events', { method: 'POST', body: { title: newEvent.title.trim(), emoji: newEvent.emoji || '🎉', productIds: [], active: true } });
      setNewEvent({ title: '', emoji: '🎉' });
      loadEvents();
      refreshConfig();
    } catch {} finally { setEventSaving(false); }
  }

  async function deleteEventById(eventId) {
    if (!confirm('Delete this event section?')) return;
    await apiFetch(`/api/admins/events/${eventId}`, { method: 'DELETE' });
    loadEvents(); refreshConfig();
  }

  async function toggleEventActive(ev) {
    await apiFetch(`/api/admins/events/${ev._id}`, { method: 'PUT', body: { title: ev.title, emoji: ev.emoji, productIds: (ev.productIds || []).map(id => id.toString ? id.toString() : id), active: !ev.active } });
    loadEvents(); refreshConfig();
  }

  async function removeProductFromEvent(ev, productId) {
    const ids = (ev.productIds || []).map(id => id.toString ? id.toString() : id).filter(id => id !== productId.toString());
    await apiFetch(`/api/admins/events/${ev._id}`, { method: 'PUT', body: { title: ev.title, emoji: ev.emoji, productIds: ids, active: ev.active } });
    loadEvents(); refreshConfig();
  }

  async function searchProducts(eventId, q) {
    if (!q.trim()) { setProductResults(prev => ({ ...prev, [eventId]: [] })); return; }
    setProductSearching(prev => ({ ...prev, [eventId]: true }));
    try {
      const d = await apiFetch(`/api/products?q=${encodeURIComponent(q)}&limit=6`);
      setProductResults(prev => ({ ...prev, [eventId]: d.products || d || [] }));
    } catch {} finally { setProductSearching(prev => ({ ...prev, [eventId]: false })); }
  }

  async function addProductToEvent(ev, product) {
    const currentIds = (ev.productIds || []).map(id => id.toString ? id.toString() : id);
    if (currentIds.includes(product._id)) return;
    const ids = [...currentIds, product._id];
    await apiFetch(`/api/admins/events/${ev._id}`, { method: 'PUT', body: { title: ev.title, emoji: ev.emoji, productIds: ids, active: ev.active } });
    setProductQuery(prev => ({ ...prev, [ev._id]: '' }));
    setProductResults(prev => ({ ...prev, [ev._id]: [] }));
    loadEvents(); refreshConfig();
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
          <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Buyer service charge */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>Buyer service charge</div>
                  <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)' }}>Added to buyer's total at checkout. Seller receives their full listing price.</div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={!!fees.serviceChargeEnabled}
                    onChange={e => setFees(f => ({ ...f, serviceChargeEnabled: e.target.checked }))}
                  />
                  <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{fees.serviceChargeEnabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
              <div className="adm-form-grid">
                <div className="adm-field">
                  <label className="lbl">Rate (%)</label>
                  <input type="number" step="0.1" min="0" max="100" value={fees.serviceFee} onChange={e => setFees(f => ({ ...f, serviceFee: e.target.value }))} disabled={!fees.serviceChargeEnabled} />
                </div>
                <div className="adm-field">
                  <label className="lbl">Minimum (₦)</label>
                  <input type="number" min="0" value={fees.serviceChargeMin} onChange={e => setFees(f => ({ ...f, serviceChargeMin: e.target.value }))} disabled={!fees.serviceChargeEnabled} />
                </div>
                <div className="adm-field">
                  <label className="lbl">Maximum (₦)</label>
                  <input type="number" min="0" value={fees.serviceChargeMax} onChange={e => setFees(f => ({ ...f, serviceChargeMax: e.target.value }))} disabled={!fees.serviceChargeEnabled} />
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--line)' }} />

            {/* Seller platform fee */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>Seller platform fee</div>
                  <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)' }}>Deducted from seller payout on delivery. Currently <strong>off</strong> — enable only when ready.</div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={!!fees.platformFeeEnabled}
                    onChange={e => setFees(f => ({ ...f, platformFeeEnabled: e.target.checked }))}
                  />
                  <span style={{ fontSize: '1.2rem', fontWeight: 600, color: fees.platformFeeEnabled ? '#dc2626' : 'var(--ink-3)' }}>
                    {fees.platformFeeEnabled ? 'ENABLED' : 'Disabled'}
                  </span>
                </label>
              </div>
              <div className="adm-form-grid">
                <div className="adm-field">
                  <label className="lbl">Rate (%)</label>
                  <input type="number" step="0.1" min="0" max="100" value={fees.platformFee} onChange={e => setFees(f => ({ ...f, platformFee: e.target.value }))} disabled={!fees.platformFeeEnabled} />
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--line)' }} />

            {/* Payout settings */}
            <div className="adm-form-grid">
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

        {/* ── Subscription plans ── */}
        <div className="adm-card" style={{ gridColumn: '1 / -1' }}>
          <div className="adm-card-head"><h3>Subscription plans</h3></div>
          <div className="adm-card-body">
            {[
              { key: 'seller',   label: 'Seller / Store' },
              { key: 'provider', label: 'Service Provider' },
            ].map(({ key, label }) => (
              <div key={key} style={{ marginBottom: 24 }}>
                <div className="adm-section-h" style={{ marginTop: 0 }}>{label}</div>
                <div className="adm-form-grid">
                  <div className="adm-field">
                    <label className="lbl">Monthly price (₦)</label>
                    <input
                      type="number" min="0"
                      value={subs[key].monthly.price}
                      onChange={e => setSubs(s => ({ ...s, [key]: { ...s[key], monthly: { ...s[key].monthly, price: Number(e.target.value) } } }))}
                    />
                  </div>
                  <div className="adm-field">
                    <label className="lbl">Monthly label</label>
                    <input
                      value={subs[key].monthly.label}
                      onChange={e => setSubs(s => ({ ...s, [key]: { ...s[key], monthly: { ...s[key].monthly, label: e.target.value } } }))}
                    />
                  </div>
                  <div className="adm-field">
                    <label className="lbl">Annual price (₦)</label>
                    <input
                      type="number" min="0"
                      value={subs[key].annual.price}
                      onChange={e => setSubs(s => ({ ...s, [key]: { ...s[key], annual: { ...s[key].annual, price: Number(e.target.value) } } }))}
                    />
                  </div>
                  <div className="adm-field">
                    <label className="lbl">Annual label</label>
                    <input
                      value={subs[key].annual.label}
                      onChange={e => setSubs(s => ({ ...s, [key]: { ...s[key], annual: { ...s[key].annual, label: e.target.value } } }))}
                    />
                  </div>
                  <div className="adm-field">
                    <label className="lbl">Annual badge text (e.g. "Save 31%")</label>
                    <input
                      value={subs[key].annual.badge}
                      onChange={e => setSubs(s => ({ ...s, [key]: { ...s[key], annual: { ...s[key].annual, badge: e.target.value } } }))}
                      placeholder="Leave blank to hide"
                    />
                  </div>
                  <div className="adm-field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                    <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', lineHeight: 1.5 }}>
                      Monthly: <strong>₦{subs[key].monthly.price.toLocaleString()}/mo</strong>
                      <br />
                      Annual: <strong>₦{subs[key].annual.price.toLocaleString()}/yr</strong>
                      {subs[key].annual.price > 0 && subs[key].monthly.price > 0 && (
                        <> · saves {Math.round((1 - subs[key].annual.price / (subs[key].monthly.price * 12)) * 100)}%</>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Ad campaign plans ── */}
        <div className="adm-card" style={{ gridColumn: '1 / -1' }}>
          <div className="adm-card-head"><h3>Ad campaign plans</h3></div>
          <div className="adm-card-body">
            <div className="adm-form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {AD_PLAN_DEFS.map(({ key, days }) => (
                <div key={key} style={{ border: '1px solid var(--adm-line)', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 12 }}>
                    {adPlans[key]?.label || key}
                    <span style={{ fontWeight: 400, color: 'var(--ink-3)', marginLeft: 6, fontSize: '1.1rem' }}>· {days} days</span>
                  </div>
                  <div className="adm-field" style={{ marginBottom: 10 }}>
                    <label className="lbl">Label</label>
                    <input
                      value={adPlans[key]?.label ?? ''}
                      onChange={e => setAdPlans(prev => ({ ...prev, [key]: { ...prev[key], label: e.target.value } }))}
                    />
                  </div>
                  <div className="adm-field">
                    <label className="lbl">Price (₦)</label>
                    <input
                      type="number" min="0"
                      value={adPlans[key]?.price ?? 0}
                      onChange={e => setAdPlans(prev => ({ ...prev, [key]: { ...prev[key], price: Number(e.target.value) } }))}
                    />
                  </div>
                  <div style={{ marginTop: 8, fontSize: '1.2rem', color: 'var(--ink-3)' }}>
                    ₦{Number(adPlans[key]?.price || 0).toLocaleString()} / {days} days
                  </div>
                </div>
              ))}
            </div>
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

      {/* ── Events / Holiday sections ────────────────────────────────────── */}
      <div className="adm-card" style={{ marginTop: 24 }}>
        <div className="adm-card-head">
          <h3>Event sections</h3>
          <span className="muted" style={{ fontSize: '1.2rem' }}>Curated product collections shown on the home page (e.g. Valentine's Gifts, Back to School). Hidden when empty.</span>
        </div>
        <div className="adm-card-body">
          {/* Create new event */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <input
              className="adm-input"
              placeholder="Event emoji (e.g. 💝)"
              value={newEvent.emoji}
              onChange={e => setNewEvent(n => ({ ...n, emoji: e.target.value }))}
              style={{ width: 80, flexShrink: 0 }}
            />
            <input
              className="adm-input"
              placeholder="Section title (e.g. Valentine's Gifts)"
              value={newEvent.title}
              onChange={e => setNewEvent(n => ({ ...n, title: e.target.value }))}
              style={{ flex: 1, minWidth: 180 }}
            />
            <button className="abtn primary" onClick={createEvent} disabled={eventSaving || !newEvent.title.trim()}>
              {eventSaving ? <i className="fa-solid fa-spinner fa-spin" /> : '+ Add section'}
            </button>
          </div>

          {events.length === 0 && (
            <div className="muted" style={{ fontSize: '1.2rem' }}>No event sections yet. Add one above.</div>
          )}

          {events.map(ev => (
            <div key={ev._id} style={{ border: '1px solid var(--adm-line)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: '1.4rem' }}>{ev.emoji} {ev.title}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '1.1rem', color: ev.active ? '#16a34a' : '#94a3b8' }}>{ev.active ? 'Visible' : 'Hidden'}</span>
                  <span className={`adm-toggle${ev.active ? ' on' : ''}`} onClick={() => toggleEventActive(ev)} />
                  <button className="abtn ghost sm" onClick={() => deleteEventById(ev._id)} style={{ color: '#ef4444' }}>
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </div>

              {/* Current products */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {(ev.productIds || []).length === 0 && (
                  <span className="muted" style={{ fontSize: '1.2rem' }}>No products yet — search below to add some.</span>
                )}
                {(ev.productIds || []).map(pid => {
                  const pidStr = pid.toString ? pid.toString() : pid;
                  return (
                    <span key={pidStr} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--adm-surface)', borderRadius: 6, padding: '3px 8px', fontSize: '1.2rem' }}>
                      <span className="mono" style={{ fontSize: '1rem', color: '#94a3b8' }}>{pidStr.slice(-6)}</span>
                      <button onClick={() => removeProductFromEvent(ev, pidStr)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 2px', fontSize: '1.1rem' }}>×</button>
                    </span>
                  );
                })}
              </div>

              {/* Product search */}
              <div style={{ position: 'relative' }}>
                <input
                  className="adm-input"
                  placeholder="Search products to add…"
                  value={productQuery[ev._id] || ''}
                  onChange={e => {
                    const q = e.target.value;
                    setProductQuery(prev => ({ ...prev, [ev._id]: q }));
                    searchProducts(ev._id, q);
                  }}
                  style={{ width: '100%' }}
                />
                {productSearching[ev._id] && <i className="fa-solid fa-spinner fa-spin" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />}
                {(productResults[ev._id] || []).length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--adm-bg)', border: '1px solid var(--adm-line)', borderRadius: 8, zIndex: 50, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,.15)' }}>
                    {productResults[ev._id].map(p => (
                      <div
                        key={p._id}
                        onClick={() => addProductToEvent(ev, p)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--adm-line)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--adm-surface)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {p.images?.[0]?.url && (
                          <img src={p.images[0].url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          <div className="muted" style={{ fontSize: '1.1rem' }}>₦{Number(p.price).toLocaleString()}</div>
                        </div>
                        <i className="fa-solid fa-plus" style={{ color: '#f97316', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
