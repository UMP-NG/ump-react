import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const AUDIENCES = [
  { id: 'all',      icon: 'fa-users',         label: 'All users' },
  { id: 'buyers',   icon: 'fa-cart-shopping',  label: 'Buyers only' },
  { id: 'sellers',  icon: 'fa-store',          label: 'Sellers only' },
  { id: 'providers', icon: 'fa-briefcase',     label: 'Providers' },
];

export default function Broadcast() {
  const [audience, setAudience] = useState('all');
  const [channels, setChannels] = useState({ inapp: true, push: true, email: false });
  const [form, setForm] = useState({ title: '', body: '', ctaLabel: '', ctaLink: '', sendAt: '', expires: '' });
  const [sending, setSending] = useState(false);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    apiFetch('/api/admins/broadcasts?limit=5').then(d => setRecent(d?.broadcasts || [])).catch(() => {});
  }, []);

  async function sendBroadcast() {
    if (!form.title || !form.body) return;
    setSending(true);
    await apiFetch('/api/admins/broadcasts', {
      method: 'POST',
      body: { audience, channels, ...form },
    }).catch(() => null);
    setSending(false);
    setForm({ title: '', body: '', ctaLabel: '', ctaLink: '', sendAt: '', expires: '' });
    apiFetch('/api/admins/broadcasts?limit=5').then(d => setRecent(d?.broadcasts || [])).catch(() => {});
  }

  function toggleChannel(k) {
    setChannels(c => ({ ...c, [k]: !c[k] }));
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Notifications</h1>
          <p>Send announcements to users — push, email, in-app</p>
        </div>
      </div>

      <div className="adm-2col-asym">
        <div className="adm-card">
          <div className="adm-card-head"><h3>Compose broadcast</h3></div>
          <div className="adm-card-body">
            <div className="adm-section-h" style={{ marginTop: 0 }}>Audience</div>
            <div className="compose-target-row">
              {AUDIENCES.map(a => (
                <div
                  key={a.id}
                  className={`compose-target${audience === a.id ? ' active' : ''}`}
                  onClick={() => setAudience(a.id)}
                >
                  <i className={`fa-solid ${a.icon}`}></i> {a.label}
                </div>
              ))}
            </div>

            <div className="adm-section-h">Delivery channels</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'inapp', icon: 'fa-bell',          title: 'In-app',           sub: 'Bell drawer + activity badge' },
                { key: 'push',  icon: 'fa-mobile-screen',  title: 'Push notification', sub: 'FCM · iOS + Android' },
                { key: 'email', icon: 'fa-envelope',       title: 'Email',            sub: 'Transactional template' },
              ].map(ch => (
                <label
                  key={ch.key}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px solid #e3e5eb', borderRadius: 10, cursor: 'pointer' }}
                  onClick={() => toggleChannel(ch.key)}
                >
                  <span className={`adm-toggle${channels[ch.key] ? ' on' : ''}`}></span>
                  <i className={`fa-solid ${ch.icon}`}></i>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{ch.title}</div>
                    <div className="muted" style={{ fontSize: '1.15rem' }}>{ch.sub}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="adm-section-h">Message</div>
            <div className="adm-form-grid">
              <div className="adm-field full">
                <label className="lbl">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notification title…" />
              </div>
              <div className="adm-field full">
                <label className="lbl">Body</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Message body…"></textarea>
              </div>
              <div className="adm-field">
                <label className="lbl">CTA label</label>
                <input value={form.ctaLabel} onChange={e => setForm(f => ({ ...f, ctaLabel: e.target.value }))} placeholder="Browse deals" />
              </div>
              <div className="adm-field">
                <label className="lbl">CTA link</label>
                <input value={form.ctaLink} onChange={e => setForm(f => ({ ...f, ctaLink: e.target.value }))} placeholder="/market" />
              </div>
              <div className="adm-field">
                <label className="lbl">Send at (optional)</label>
                <input type="datetime-local" value={form.sendAt} onChange={e => setForm(f => ({ ...f, sendAt: e.target.value }))} />
              </div>
              <div className="adm-field">
                <label className="lbl">Expires (optional)</label>
                <input type="datetime-local" value={form.expires} onChange={e => setForm(f => ({ ...f, expires: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button className="abtn ghost"><i className="fa-solid fa-paper-plane"></i> Send test to me</button>
              <div style={{ flex: 1 }}></div>
              <button className="abtn ghost">Save draft</button>
              <button className="abtn primary" disabled={sending || !form.title || !form.body} onClick={sendBroadcast}>
                {sending
                  ? <i className="fa-solid fa-circle-notch fa-spin"></i>
                  : <><i className="fa-regular fa-clock"></i> {form.sendAt ? 'Schedule broadcast' : 'Send now'}</>
                }
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="adm-card" style={{ marginBottom: 16 }}>
            <div className="adm-card-head"><h3>Preview</h3></div>
            <div className="adm-card-body" style={{ background: '#0f172a', borderRadius: 0 }}>
              <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 12, padding: 14, color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', opacity: .7 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--accent)' }}></div>
                  UMP · now
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.4rem', marginTop: 6 }}>
                  {form.title || 'Notification title'}
                </div>
                <div style={{ fontSize: '1.25rem', marginTop: 4, opacity: .85 }}>
                  {form.body || 'Notification body preview…'}
                </div>
              </div>
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card-head"><h3>Recent broadcasts</h3></div>
            <div className="adm-scroll-x">
              <table className="adm-table">
                <thead><tr><th>Title</th><th>Sent</th><th>Reach</th><th>Open</th></tr></thead>
                <tbody>
                  {recent.length > 0 ? recent.map(b => (
                    <tr key={b._id}>
                      <td>{b.title}</td>
                      <td className="muted">{b.sentAt ? new Date(b.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                      <td className="amount">{(b.reach || 0).toLocaleString()}</td>
                      <td className="amount">{b.openRate ? `${b.openRate}%` : '—'}</td>
                    </tr>
                  )) : (
                    [
                      ['Maintenance window · May 4', 'May 3', '14,114', '68%'],
                      ['New: Hostel listings live',   'Apr 28', '12,840', '74%'],
                      ['Refer a friend — earn ₦500',  'Apr 15', '11,902', '58%'],
                    ].map(r => (
                      <tr key={r[0]}><td>{r[0]}</td><td className="muted">{r[1]}</td><td className="amount">{r[2]}</td><td className="amount">{r[3]}</td></tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
