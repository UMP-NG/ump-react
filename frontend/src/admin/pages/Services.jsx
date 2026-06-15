import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Thumb from '../components/Thumb';
import { apiFetch } from '../../utils/api';

const TABS = [
  { label: 'All',       filter: '' },
  { label: 'Pending',   filter: 'pending' },
  { label: 'Verified',  filter: 'verified' },
  { label: 'Suspended', filter: 'suspended' },
];
const STATUS_COLOR = { verified: 'green', pending: 'amber', suspended: 'red' };

export default function Services() {
  const navigate = useNavigate();
  const [tab, setTab]           = useState(0);
  const [services, setServices] = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [drawer, setDrawer]     = useState(null);
  const [search, setSearch]     = useState('');

  const fetchServices = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page, limit: 20 });
    if (TABS[tab].filter) params.set('status', TABS[tab].filter);
    if (search) params.set('q', search);
    apiFetch(`/api/admins/services?${params}`)
      .then(d => { setServices(d?.services || d || []); setTotal(d?.total || 0); })
      .catch(err => setError(err?.message || 'Failed to load services'))
      .finally(() => setLoading(false));
  }, [tab, page, search]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  async function approveService(providerId) {
    await apiFetch(`/api/admins/providers/${providerId}/approve`, { method: 'POST' }).catch(() => null);
    setDrawer(null);
    fetchServices();
  }

  async function suspendProvider(providerId) {
    await apiFetch(`/api/admins/users/${providerId}/ban`, { method: 'POST' }).catch(() => null);
    setDrawer(null);
    fetchServices();
  }

  async function reinstateProvider(providerId) {
    await apiFetch(`/api/admins/users/${providerId}/unban`, { method: 'POST' }).catch(() => null);
    setDrawer(null);
    fetchServices();
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Services</h1>
          <p>{total.toLocaleString()} service{total !== 1 ? 's' : ''} on UMP</p>
        </div>
        <div className="right">
          <button className="abtn ghost" onClick={fetchServices} disabled={loading} title="Refresh">
            <i className={`fa-solid fa-rotate-right${loading ? ' fa-spin' : ''}`}></i> Refresh
          </button>
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
          <input placeholder="Search servicesâ€¦" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Service</th><th>Provider</th><th>Category</th>
                <th>Rate</th><th>Rating</th><th>Status</th><th>Created</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : error ? (
                <tr><td colSpan="8">
                  <div className="adm-empty" style={{ color: '#dc2626' }}>
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <p>{error}</p>
                    <button className="abtn ghost sm" style={{ marginTop: 8 }} onClick={fetchServices}>
                      <i className="fa-solid fa-rotate-right" /> Retry
                    </button>
                  </div>
                </td></tr>
              ) : services.length === 0 ? (
                <tr><td colSpan="8">
                  <div className="adm-empty"><i className="fa-solid fa-handshake"></i><p>No services found</p></div>
                </td></tr>
              ) : services.map(s => {
                const status = s.verificationStatus || 'pending';
                return (
                  <tr key={s._id} onClick={() => setDrawer(s)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="adm-row-user">
                        <Thumb src={s.image} kind="service" label={(s.name || 'SV').slice(0, 2).toUpperCase()} />
                        <div>
                          <div className="name">
                            {s.name}
                            {status === 'verified' && (
                              <span className="verified-tick"><i className="fa-solid fa-check"></i></span>
                            )}
                          </div>
                          {s.title && <div className="email">{s.title}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="name" style={{ fontSize: '1.25rem' }}>{s.provider?.name || 'â€”'}</div>
                      <div className="email">{s.provider?.email || ''}</div>
                    </td>
                    <td className="muted">{s.category || 'â€”'}</td>
                    <td className="amount">
                      {s.rate ? <><span className="naira"></span>{s.rate.toLocaleString()}</> : 'â€”'}
                    </td>
                    <td>
                      <span className="muted" style={{ fontSize: '1.15rem' }}>
                        {(s.rating || 0).toFixed(1)} â˜…
                      </span>
                    </td>
                    <td><span className={`pill dot ${STATUS_COLOR[status] || 'gray'}`}>{status}</span></td>
                    <td className="muted">
                      {s.createdAt
                        ? new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'â€”'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="icon-action" onClick={() => setDrawer(s)}>
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
            <span>Showing {((page - 1) * 20) + 1}â€“{Math.min(page * 20, total)} of {total.toLocaleString()}</span>
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
        <ServiceDrawer
          service={drawer}
          onClose={() => setDrawer(null)}
          onApprove={() => approveService(drawer.provider?._id)}
          onSuspend={() => suspendProvider(drawer.provider?._id)}
          onReinstate={() => reinstateProvider(drawer.provider?._id)}
          onMessage={() => {
            const pid = drawer.provider?._id;
            if (!pid) return;
            navigate(`/messages?with=${encodeURIComponent(pid)}&name=${encodeURIComponent(drawer.provider?.name || drawer.name)}`);
          }}
        />
      )}
    </>
  );
}

function ServiceDrawer({ service, onClose, onApprove, onSuspend, onReinstate, onMessage }) {
  const status = service.verificationStatus || 'pending';

  return (
    <div className="adm-drawer-shell" onClick={onClose}>
      <div className="adm-drawer" onClick={e => e.stopPropagation()}>

        {service.image && (
          <div style={{ height: 120, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
            <img src={service.image} alt={service.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, transparent 50%, rgba(15,23,42,.4))',
            }} />
          </div>
        )}

        <div className="adm-drawer-head" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {!service.image && (
              <Thumb src={null} kind="service" label={(service.name || 'SV').slice(0, 2).toUpperCase()} />
            )}
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>
                {service.name}
                {status === 'verified' && (
                  <i className="fa-solid fa-circle-check" style={{ color: '#f59e0b', fontSize: '1.2rem', marginLeft: 6 }}></i>
                )}
              </div>
              <div className="muted" style={{ fontSize: '1.2rem', marginTop: 2 }}>
                {status === 'pending' ? 'Awaiting verification' : `Status: ${status}`}
              </div>
              {service.category && (
                <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', marginTop: 2 }}>
                  <i className="fa-solid fa-tag" style={{ marginRight: 4 }}></i>{service.category}
                </div>
              )}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="adm-drawer-body">
          <div className="kpi-strip">
            <div className="kpi">
              <div className="l">Rate</div>
              <div className="v">
                {service.rate ? <><span className="naira"></span>{service.rate.toLocaleString()}</> : 'â€”'}
              </div>
            </div>
            <div className="kpi">
              <div className="l">Rating</div>
              <div className="v">{(service.rating || 0).toFixed(1)} â˜…</div>
            </div>
            <div className="kpi">
              <div className="l">Reviews</div>
              <div className="v">{service.reviewsCount ?? 0}</div>
            </div>
          </div>

          <div className="adm-section-h">Provider</div>
          <div className="adm-kv">
            <span className="k">Name</span>
            <span className="v">{service.provider?.name || 'â€”'}</span>
            <span className="k">Email</span>
            <span className="v">{service.provider?.email || 'â€”'}</span>
            {service.category && <><span className="k">Category</span><span className="v">{service.category}</span></>}
          </div>

          {service.description && (
            <>
              <div className="adm-section-h">About this service</div>
              <p style={{ fontSize: '1.3rem', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
                {service.description}
              </p>
            </>
          )}

          {service.certifications?.length > 0 && (
            <>
              <div className="adm-section-h">Certifications</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {service.certifications.map((c, i) => (
                  <span key={i} style={{ padding: '3px 10px', background: 'var(--surface)', borderRadius: 6, fontSize: '1.2rem' }}>{c}</span>
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

