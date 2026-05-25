import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';

const TABS = [
  { label: 'All',       filter: '' },
  { label: 'Pending',   filter: 'pending' },
  { label: 'Verified',  filter: 'verified' },
  { label: 'Suspended', filter: 'suspended' },
];
const STATUS_COLOR = { verified: 'green', pending: 'amber', suspended: 'red' };

export default function Providers() {
  const navigate = useNavigate();
  const [tab, setTab]             = useState(0);
  const [providers, setProviders] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [drawer, setDrawer]       = useState(null);
  const [search, setSearch]       = useState('');

  const fetchProviders = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (TABS[tab].filter) params.set('status', TABS[tab].filter);
    if (search) params.set('q', search);
    apiFetch(`/api/admins/providers?${params}`)
      .then(d => { setProviders(d?.providers || d || []); setTotal(d?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, page, search]);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  async function approveProvider(userId) {
    await apiFetch(`/api/admins/providers/${userId}/approve`, { method: 'POST' }).catch(() => null);
    setDrawer(null);
    fetchProviders();
  }

  async function suspendProvider(userId) {
    await apiFetch(`/api/admins/users/${userId}/ban`, { method: 'POST' }).catch(() => null);
    setDrawer(null);
    fetchProviders();
  }

  async function reinstateProvider(userId) {
    await apiFetch(`/api/admins/users/${userId}/unban`, { method: 'POST' }).catch(() => null);
    setDrawer(null);
    fetchProviders();
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Service Providers</h1>
          <p>{total.toLocaleString()} service provider{total !== 1 ? 's' : ''} on UMP</p>
        </div>
        <div className="right">
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button>
        </div>
      </div>

      <div className="adm-filterbar">
        <div className="adm-tabs">
          {TABS.map((t, i) => (
            <button key={t.label} className={`tab${tab === i ? ' active' : ''}`}
              onClick={() => { setTab(i); setPage(1); }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }}></div>
        <div className="adm-search" style={{ maxWidth: 280 }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input placeholder="Search providers…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Provider</th><th>Category</th><th>Rate</th>
                <th>Bookings</th><th>Rating</th><th>Status</th><th>Joined</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : providers.length === 0 ? (
                <tr><td colSpan="8">
                  <div className="adm-empty"><i className="fa-solid fa-briefcase"></i><p>No providers found</p></div>
                </td></tr>
              ) : providers.map(p => {
                const status = p.verificationStatus || 'pending';
                return (
                  <tr key={p._id} onClick={() => setDrawer(p)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="adm-row-user">
                        <div className="adm-av av-c">
                          {(p.businessName || '??').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="name">
                            {p.businessName}
                            {status === 'verified' && (
                              <span className="verified-tick"><i className="fa-solid fa-check"></i></span>
                            )}
                          </div>
                          <div className="email">{p.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="muted">{p.category || '—'}</td>
                    <td className="amount">
                      {p.rate ? <><span className="naira"></span>{p.rate.toLocaleString()}</> : '—'}
                    </td>
                    <td className="amount">{p.bookingCount ?? 0}</td>
                    <td>
                      <span className="muted" style={{ fontSize: '1.15rem' }}>
                        {(p.averageRating || 0).toFixed(1)} ★
                      </span>
                    </td>
                    <td><span className={`pill dot ${STATUS_COLOR[status] || 'gray'}`}>{status}</span></td>
                    <td className="muted">
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="icon-action" onClick={() => setDrawer(p)}>
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                      </button>
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
        <ProviderDrawer
          provider={drawer}
          onClose={() => setDrawer(null)}
          onApprove={() => approveProvider(drawer._id)}
          onSuspend={() => suspendProvider(drawer._id)}
          onReinstate={() => reinstateProvider(drawer._id)}
          onMessage={() => navigate(`/messages?with=${drawer._id}&name=${encodeURIComponent(drawer.businessName || drawer.email)}`)}
        />
      )}
    </>
  );
}

function ProviderDrawer({ provider, onClose, onApprove, onSuspend, onReinstate, onMessage }) {
  const status = provider.verificationStatus || 'pending';

  return (
    <div className="adm-drawer-shell" onClick={onClose}>
      <div className="adm-drawer" onClick={e => e.stopPropagation()}>

        <div className="adm-drawer-head" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="adm-av-standalone av-c" style={{ fontSize: '1.6rem', fontWeight: 700 }}>
              {(provider.businessName || '??').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>
                {provider.businessName}
                {status === 'verified' && (
                  <i className="fa-solid fa-circle-check" style={{ color: '#f59e0b', fontSize: '1.2rem', marginLeft: 6 }}></i>
                )}
              </div>
              <div className="muted" style={{ fontSize: '1.2rem', marginTop: 2 }}>
                {status === 'pending' ? 'Awaiting verification' : `Status: ${status}`}
              </div>
              {provider.category && (
                <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', marginTop: 2 }}>
                  <i className="fa-solid fa-briefcase" style={{ marginRight: 4 }}></i>{provider.category}
                </div>
              )}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="adm-drawer-body">
          <div className="kpi-strip">
            <div className="kpi">
              <div className="l">Bookings</div>
              <div className="v">{provider.bookingCount ?? 0}</div>
            </div>
            <div className="kpi">
              <div className="l">Rate</div>
              <div className="v">
                {provider.rate
                  ? <><span className="naira"></span>{provider.rate.toLocaleString()}</>
                  : '—'}
              </div>
            </div>
            <div className="kpi">
              <div className="l">Rating</div>
              <div className="v">{(provider.averageRating || 0).toFixed(1)} ★</div>
            </div>
          </div>

          <div className="adm-section-h">Contact details</div>
          <div className="adm-kv">
            <span className="k">Name</span>
            <span className="v">{provider.businessName || '—'}</span>
            <span className="k">Email</span>
            <span className="v">{provider.email || '—'}</span>
            {provider.phone && <><span className="k">Phone</span><span className="v">{provider.phone}</span></>}
            {provider.category && <><span className="k">Category</span><span className="v">{provider.category}</span></>}
          </div>

          {provider.description && (
            <>
              <div className="adm-section-h">About</div>
              <p style={{ fontSize: '1.3rem', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
                {provider.description}
              </p>
            </>
          )}

          {provider.certifications?.length > 0 && (
            <>
              <div className="adm-section-h">Certifications</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {provider.certifications.map((c, i) => (
                  <span key={i} style={{ padding: '3px 10px', background: '#f1f5f9', borderRadius: 6, fontSize: '1.2rem' }}>{c}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="adm-drawer-foot">
          <button className="abtn ghost" style={{ flex: 1 }} onClick={onMessage}>
            <i className="fa-solid fa-message"></i> Message
          </button>
          {status === 'pending' && (
            <>
              <button className="abtn danger" style={{ flex: 1 }} onClick={onSuspend}>
                <i className="fa-solid fa-xmark"></i> Reject
              </button>
              <button className="abtn primary" style={{ flex: 1.4 }} onClick={onApprove}>
                <i className="fa-solid fa-circle-check"></i> Approve
              </button>
            </>
          )}
          {status === 'verified' && (
            <button className="abtn danger" style={{ flex: 1 }} onClick={onSuspend}>
              <i className="fa-solid fa-ban"></i> Suspend
            </button>
          )}
          {status === 'suspended' && (
            <button className="abtn success" style={{ flex: 1 }} onClick={onReinstate}>
              <i className="fa-solid fa-circle-check"></i> Reinstate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
