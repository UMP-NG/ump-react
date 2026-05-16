import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const DEFAULT_FLAGS = [
  { key: 'hostelListings',        label: 'Hostel listings',         sub: 'Off-campus rental hub',         on: true },
  { key: 'serviceMarketplace',    label: 'Service marketplace',     sub: 'Peer-to-peer freelance gigs',   on: true },
  { key: 'walletTopup',          label: 'Wallet top-up via card',  sub: 'Paystack integration',          on: true },
  { key: 'autoTranslate',        label: 'Auto-translate listings', sub: 'Yoruba / Igbo / Hausa',         on: false },
  { key: 'aiListingAssistant',   label: 'AI listing assistant',    sub: 'Suggest title & price',         on: false },
  { key: 'maintenanceMode',      label: 'Maintenance mode',        sub: 'Block all non-admin traffic',   on: false },
];

export default function Config() {
  const [fees, setFees] = useState({ platformFee: '3.2', serviceFee: '5.0', minPayout: '2000', payoutCadence: 'Daily' });
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [slides, setSlides] = useState([
    { title: 'Back-to-school deals', url: '/market?cat=electronics', on: true },
    { title: 'Hostel hub now live',  url: '/hostel',                 on: true },
    { title: 'Eat — ₦500 off first order', url: '/food',             on: true },
  ]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch('/api/admins/config').then(d => {
      if (d?.fees) setFees(f => ({ ...f, ...d.fees }));
      if (d?.flags) setFlags(prev => prev.map(f => ({ ...f, on: d.flags[f.key] ?? f.on })));
      if (d?.slides) setSlides(d.slides);
    }).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    const flagsObj = Object.fromEntries(flags.map(f => [f.key, f.on]));
    await apiFetch('/api/admins/config', {
      method: 'PUT',
      body: { fees, flags: flagsObj, slides },
    }).catch(() => null);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function toggleFlag(key) {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, on: !f.on } : f));
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Site configuration</h1>
          <p>Platform-wide settings</p>
        </div>
        <div className="right">
          <button className="abtn ghost" onClick={() => window.location.reload()}>Discard</button>
          <button className="abtn primary" disabled={saving} onClick={save}>
            {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-check"></i> Save changes</>}
            {saved && !saving && ' ✓'}
          </button>
        </div>
      </div>

      <div className="adm-2col">
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
            <button className="abtn ghost sm" onClick={() => setSlides(s => [...s, { title: '', url: '', on: true }])}>
              <i className="fa-solid fa-plus"></i> Add slide
            </button>
          </div>
          <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {slides.map((s, i) => (
              <div key={i} className="hero-slide-row">
                <div className="hero-drag"><i className="fa-solid fa-grip-vertical"></i></div>
                <div className="hero-thumb">
                  <div className="img-ph ph-electronics" style={{ height: '100%' }}>{i + 1}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    style={{ width: '100%', border: 'none', fontWeight: 600, fontSize: '1.3rem', background: 'transparent', fontFamily: 'inherit', color: 'var(--ink-1)', outline: 'none' }}
                    value={s.title}
                    onChange={e => setSlides(prev => prev.map((sl, j) => j === i ? { ...sl, title: e.target.value } : sl))}
                    placeholder="Slide title"
                  />
                  <div className="mono muted" style={{ fontSize: '1.15rem' }}>{s.url || '/link'}</div>
                </div>
                <span
                  className={`adm-toggle${s.on ? ' on' : ''}`}
                  onClick={() => setSlides(prev => prev.map((sl, j) => j === i ? { ...sl, on: !sl.on } : sl))}
                ></span>
                <button className="icon-action" onClick={() => setSlides(prev => prev.filter((_, j) => j !== i))}>
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head"><h3>Feature flags</h3></div>
          <div className="adm-card-body">
            {flags.map((f, i) => (
              <div
                key={f.key}
                style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: i < flags.length - 1 ? '1px solid #f0f2f5' : 'none' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{f.label}</div>
                  <div className="muted" style={{ fontSize: '1.2rem' }}>{f.sub}</div>
                </div>
                <span className={`adm-toggle${f.on ? ' on' : ''}`} onClick={() => toggleFlag(f.key)}></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
