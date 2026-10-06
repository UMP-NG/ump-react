import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../utils/api';
import { subscribeToPush } from '../../utils/push';

const AUDIENCES = [
  { id: 'all',      icon: 'fa-users',         label: 'All users' },
  { id: 'buyers',   icon: 'fa-cart-shopping',  label: 'Buyers only' },
  { id: 'sellers',  icon: 'fa-store',          label: 'Sellers only' },
  { id: 'providers', icon: 'fa-briefcase',     label: 'Providers' },
];

const EMAIL_STATUS_STYLES = {
  sent:    { bg: 'rgba(34,197,94,.12)',  color: '#16a34a', label: 'Sent' },
  partial: { bg: 'rgba(234,179,8,.14)',  color: '#a16207', label: 'Partial' },
  failed:  { bg: 'rgba(239,68,68,.12)',  color: '#ef4444', label: 'Failed' },
  pending: { bg: 'rgba(148,163,184,.15)', color: '#64748b', label: 'Sending…' },
  sending: { bg: 'rgba(148,163,184,.15)', color: '#64748b', label: 'Sending…' },
};

// Actual email delivery happens in the background, separately from the rest
// of the broadcast — this surfaces the true outcome (sent/partial/failed/
// still sending) instead of leaving the admin to infer it from "reach" alone.
function emailStatusBadge(b) {
  if (!b.channels?.email) return <span className="muted">—</span>;
  const s = EMAIL_STATUS_STYLES[b.emailStatus] || EMAIL_STATUS_STYLES.pending;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 999, fontSize: '1.1rem', fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

export default function Broadcast() {
  const [audience, setAudience] = useState('all');
  const [channels, setChannels] = useState({ inapp: true, push: true, email: false });
  const [form, setForm] = useState({ title: '', body: '', ctaLabel: '', ctaLink: '', sendAt: '', expires: '', emailSubject: '', emailBody: '' });
  const [customizeEmail, setCustomizeEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [recent, setRecent] = useState([]);
  // Guards against an older in-flight fetch resolving after a newer one and
  // clobbering it with stale data — sendBroadcast can trigger two refreshes
  // in quick succession (immediate + a delayed one to catch email delivery
  // finishing), and network timing gives no guarantee they resolve in order.
  const recentReqId = useRef(0);

  function refreshRecent() {
    const id = ++recentReqId.current;
    apiFetch('/api/admins/broadcasts?limit=5')
      .then(d => { if (id === recentReqId.current) setRecent(d?.broadcasts || []); })
      .catch(() => {});
  }

  useEffect(() => {
    refreshRecent();
  }, []);

  async function sendBroadcast() {
    if (!form.title || !form.body) return;
    setSending(true);
    setSendError('');
    setSendSuccess('');
    try {
      // Only send the separate email copy when the admin actually turned on
      // "Write separate email copy" — otherwise leftover text from a draft
      // that was since toggled off would silently override the title/body
      // fallback the UI is telling the admin will be used instead.
      const { emailSubject, emailBody, ...restForm } = form;
      const body = {
        audience, channels, ...restForm,
        ...(customizeEmail ? { emailSubject, emailBody } : {}),
      };
      const res = await apiFetch('/api/admins/broadcasts', { method: 'POST', body });
      const b = res?.broadcast;
      const isScheduled = b?.status === 'scheduled';
      if (isScheduled) {
        // Nothing has been dispatched yet — the server only stores the
        // record and returns early for a future sendAt, so there's no reach
        // or email delivery to report (or to refresh for) at this point.
        setSendSuccess(`Broadcast scheduled for ${b?.sendAt ? new Date(b.sendAt).toLocaleString() : 'later'}.`);
      } else {
        // Email delivery happens in the background after this response, so
        // never claim it's "sent" here — that's only known once emailStatus
        // resolves, which the Recent broadcasts table below reflects.
        const emailNote = channels.email ? ' Email delivery is in progress — check the table below for its status.' : '';
        setSendSuccess(`Broadcast sent — reached ${b?.reach ?? 0} user(s).${emailNote}`);
      }
      setForm({ title: '', body: '', ctaLabel: '', ctaLink: '', sendAt: '', expires: '', emailSubject: '', emailBody: '' });
      setCustomizeEmail(false);
      refreshRecent();
      // A second refresh shortly after — long enough for a small/medium
      // audience's chunked send to finish — so the admin sees the real
      // emailStatus without needing to reload the page. Only meaningful once
      // delivery has actually started, which a scheduled broadcast hasn't.
      if (channels.email && !isScheduled) setTimeout(refreshRecent, 6000);
    } catch (err) {
      setSendError(err?.message || 'Failed to send broadcast. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function sendTestToMe() {
    setTesting(true);
    setSendError('');
    setSendSuccess('');
    // 1. Wipe any stale localhost subscriptions for this account
    await apiFetch('/api/push/cleanup-localhost', { method: 'DELETE' }).catch(() => {});
    // 2. Re-subscribe this device so a fresh production subscription exists
    await subscribeToPush().catch(() => {});
    try {
      const res = await apiFetch('/api/push/test', { method: 'POST' });
      setSendSuccess(`Test push sent to ${res.devices} device(s). Check your OS notifications.`);
    } catch (err) {
      setSendError(err?.message || 'Test failed. Make sure you have granted notification permission in this browser.');
    } finally {
      setTesting(false);
    }
  }

  async function deleteBroadcast(id) {
    if (!window.confirm('Delete this broadcast?')) return;
    await apiFetch(`/api/admins/broadcasts/${id}`, { method: 'DELETE' }).catch(() => null);
    setRecent(prev => prev.filter(b => b._id !== id));
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
                { key: 'push',  icon: 'fa-mobile-screen',  title: 'Push notification', sub: 'Web Push · all browsers (requires permission)' },
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

            <div className="adm-section-h" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              Notification &amp; push
              <span className="muted" style={{ fontWeight: 400, fontSize: '1.1rem' }}>— shown in the bell drawer and push notifications</span>
            </div>
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

            {channels.email && (
              <>
                <div className="adm-section-h" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    Email
                    <span className="muted" style={{ fontWeight: 400, fontSize: '1.1rem' }}>— rendered with a dedicated email template</span>
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 400, fontSize: '1.2rem' }}>
                    <span className={`adm-toggle${customizeEmail ? ' on' : ''}`} onClick={() => setCustomizeEmail(c => !c)}></span>
                    Write separate email copy
                  </label>
                </div>
                {customizeEmail ? (
                  <div className="adm-form-grid">
                    <div className="adm-field full">
                      <label className="lbl">Email subject</label>
                      <input value={form.emailSubject} onChange={e => setForm(f => ({ ...f, emailSubject: e.target.value }))} placeholder={form.title || 'Email subject line…'} />
                    </div>
                    <div className="adm-field full">
                      <label className="lbl">Email body</label>
                      <textarea
                        value={form.emailBody}
                        onChange={e => setForm(f => ({ ...f, emailBody: e.target.value }))}
                        placeholder={form.body || 'Write the email in full sentences — each new line becomes its own paragraph.'}
                        style={{ minHeight: 120 }}
                      ></textarea>
                    </div>
                  </div>
                ) : (
                  <p className="muted" style={{ fontSize: '1.2rem', margin: '0 0 4px' }}>
                    The email will reuse the title and body above, formatted with the clean template shown in the preview. Turn on "Write separate email copy" to customize it — notification text is short and punchy, but an email usually reads better in full sentences.
                  </p>
                )}
              </>
            )}

            {sendError && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.1)', color: '#ef4444', fontSize: '1.25rem', border: '1px solid rgba(239,68,68,.3)' }}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />{sendError}
              </div>
            )}
            {sendSuccess && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,.1)', color: '#16a34a', fontSize: '1.25rem', border: '1px solid rgba(34,197,94,.3)' }}>
                <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />{sendSuccess}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button className="abtn ghost" disabled={testing} onClick={sendTestToMe}>
                {testing ? <i className="fa-solid fa-circle-notch fa-spin" /> : <><i className="fa-solid fa-paper-plane"></i> Send test to me</>}
              </button>
              <div style={{ flex: 1 }}></div>
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

          {channels.email && (
            <div className="adm-card" style={{ marginBottom: 16 }}>
              <div className="adm-card-head"><h3>Email preview</h3></div>
              <div className="adm-card-body" style={{ background: '#f4f6f8', padding: 20 }}>
                <div style={{ maxWidth: 400, margin: '0 auto', background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e6e9ee', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                  <div style={{ padding: '16px 22px', background: '#0f172a' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                      <span style={{ color: '#1a5cff' }}>U</span>MP
                    </span>
                  </div>
                  <div style={{ padding: '22px 22px 6px' }}>
                    <h2 style={{ margin: '0 0 14px', color: '#16213e', fontSize: '1.7rem', lineHeight: 1.35 }}>
                      {(customizeEmail && form.emailSubject) || form.title || 'Email subject line'}
                    </h2>
                    {((customizeEmail && form.emailBody) || form.body || 'Email body preview…')
                      .split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
                      .map((line, i) => (
                        <p key={i} style={{ margin: '0 0 12px', color: '#4b5668', fontSize: '1.3rem', lineHeight: 1.65 }}>{line}</p>
                      ))}
                    {form.ctaLink && (
                      <div style={{ textAlign: 'center', margin: '20px 0 8px' }}>
                        <span style={{ display: 'inline-block', background: '#1a5cff', color: '#fff', padding: '10px 24px', borderRadius: 8, fontSize: '1.25rem', fontWeight: 700 }}>
                          {form.ctaLabel || 'View'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '14px 22px', textAlign: 'center', fontSize: '1rem', color: '#99a1ad', borderTop: '1px solid #eef0f4' }}>
                    © {new Date().getFullYear()} UMP. All rights reserved.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="adm-card">
            <div className="adm-card-head"><h3>Recent broadcasts</h3></div>
            <div className="adm-scroll-x">
              <table className="adm-table">
                <thead><tr><th>Title</th><th>Sent</th><th>Reach</th><th>Email</th><th>Opens</th><th></th></tr></thead>
                <tbody>
                  {recent.length > 0 ? recent.map(b => (
                    <tr key={b._id}>
                      <td>{b.title}</td>
                      <td className="muted">{b.sentAt ? new Date(b.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                      <td className="amount">{(b.reach || 0).toLocaleString()}</td>
                      <td>{emailStatusBadge(b)}</td>
                      <td className="amount">{b.opens > 0 ? b.opens : '—'}</td>
                      <td>
                        <button
                          onClick={() => deleteBroadcast(b._id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px 6px', borderRadius: 6 }}
                          title="Delete broadcast"
                        >
                          <i className="fas fa-trash-can" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>No broadcasts sent yet</td></tr>
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
