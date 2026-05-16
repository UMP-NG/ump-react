import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';

const TABS = [
  { label: 'All',       filter: '' },
  { label: 'Pending',   filter: 'pending' },
  { label: 'Verified',  filter: 'verified' },
  { label: 'Suspended', filter: 'suspended' },
];
const STATUS_COLOR = { verified: 'green', pending: 'amber', suspended: 'red' };

export default function Providers() {
  const [tab, setTab] = useState(1);
  const [providers, setProviders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (TABS[tab].filter) params.set('status', TABS[tab].filter);
    apiFetch(`/api/admins/providers?${params}`)
      .then(d => { setProviders(d?.providers || d || []); setTotal(d?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { fetch(); }, [fetch]);

  const initials = name => (name || '??').slice(0, 2).toUpperCase();

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Service Providers</h1>
          <p>{total.toLocaleString()} service providers on UMP</p>
        </div>
        <div className="right">
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button>
        </div>
      </div>

      <div className="adm-filterbar">
        <div className="adm-tabs">
          {TABS.map((t, i) => (
            <button key={t.label} className={`tab${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr><th>Provider</th><th>Category</th><th>Bookings</th><th>Rating</th><th>Status</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : providers.length === 0 ? (
                <tr><td colSpan="7">
                  <div className="adm-empty"><i className="fa-solid fa-briefcase"></i><p>No providers found</p></div>
                </td></tr>
              ) : providers.map(p => {
                const status = p.verificationStatus || 'pending';
                return (
                  <tr key={p._id}>
                    <td>
                      <div className="adm-row-user">
                        <div className="adm-av av-c">{initials(p.businessName)}</div>
                        <div>
                          <div className="name">{p.businessName}</div>
                          <div className="email">{p.userId?.email || p.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="muted">{p.category || '—'}</td>
                    <td className="amount">{p.bookingCount ?? 0}</td>
                    <td className="amount">{(p.averageRating || 0).toFixed(1)} ★</td>
                    <td><span className={`pill dot ${STATUS_COLOR[status] || 'gray'}`}>{status}</span></td>
                    <td className="muted">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td><button className="icon-action"><i className="fa-solid fa-ellipsis-vertical"></i></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
