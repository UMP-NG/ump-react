import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Thumb from '../components/Thumb';
import StarRow from '../components/StarRow';
import { LineChart } from '../components/charts';
import { apiFetch } from '../../utils/api';

const TABS = [
  { label: 'All',       filter: '' },
  { label: 'Pending',   filter: 'pending' },
  { label: 'Verified',  filter: 'verified' },
  { label: 'Suspended', filter: 'suspended' },
];
const STATUS_COLOR = { verified: 'green', pending: 'amber', suspended: 'red' };

export default function Sellers() {
  const navigate = useNavigate();
  const [tab, setTab]       = useState(0);
  const [sellers, setSellers] = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null);
  const [search, setSearch] = useState('');

  const fetchSellers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (TABS[tab].filter) params.set('status', TABS[tab].filter);
    if (search) params.set('q', search);
    apiFetch(`/api/admins/sellers?${params}`)
      .then(d => { setSellers(d?.sellers || d || []); setTotal(d?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, page, search]);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  async function approveSeller(sellerId) {
    await apiFetch(`/api/admins/sellers/${sellerId}/approve`, { method: 'POST' }).catch(() => null);
    setDrawer(null);
    fetchSellers();
  }

  async function rejectSeller(sellerId) {
    await apiFetch(`/api/admins/sellers/${sellerId}/reject`, { method: 'POST' }).catch(() => null);
    setDrawer(null);
    fetchSellers();
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Sellers</h1>
          <p>{total.toLocaleString()} store{total !== 1 ? 's' : ''} on UMP</p>
        </div>
        <div className="right">
          <button className="abtn ghost" onClick={fetchSellers} disabled={loading} title="Refresh">
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
          <input placeholder="Search stores…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Store</th><th>Owner</th><th>Category</th>
                <th>Products</th><th>Revenue (30d)</th><th>Rating</th>
                <th>Status</th><th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : sellers.length === 0 ? (
                <tr><td colSpan="8">
                  <div className="adm-empty"><i className="fa-solid fa-store"></i><p>No sellers found</p></div>
                </td></tr>
              ) : sellers.map(s => {
                const status = s.verificationStatus || 'pending';
                return (
                  <tr key={s._id} onClick={() => setDrawer(s)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="adm-row-user">
                        <Thumb
                          src={s.logo}
                          kind="seller"
                          label={(s.storeName || '??').slice(0, 2).toUpperCase()}
                        />
                        <div>
                          <div className="name">
                            {s.storeName}
                            {status === 'verified' && (
                              <span className="verified-tick"><i className="fa-solid fa-check"></i></span>
                            )}
                          </div>
                          {s.location && <div className="email">{s.location}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="muted">{s.ownerName || '—'}</td>
                    <td className="muted" style={{ fontSize: '1.2rem' }}>{s.category || '—'}</td>
                    <td className="amount">{s.productCount ?? 0}</td>
                    <td className="amount">
                      <span className="naira"></span>{(s.revenue30d || 0).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <StarRow value={s.averageRating || 0} />
                        <span className="muted" style={{ fontSize: '1.15rem' }}>
                          {(s.averageRating || 0).toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td><span className={`pill dot ${STATUS_COLOR[status] || 'gray'}`}>{status}</span></td>
                    <td className="muted">
                      {s.createdAt
                        ? new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
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
        <SellerDrawer
          seller={drawer}
          onClose={() => setDrawer(null)}
          onApprove={() => approveSeller(drawer._id)}
          onReject={() => rejectSeller(drawer._id)}
          onMessage={() => {
            const id = drawer.userId || drawer._id;
            navigate(`/messages?with=${id}&name=${encodeURIComponent(drawer.ownerName || drawer.storeName)}`);
          }}
        />
      )}
    </>
  );
}

function SellerDrawer({ seller, onClose, onApprove, onReject, onMessage }) {
  const status   = seller.verificationStatus || 'pending';
  const initials = (seller.storeName || 'ST').slice(0, 2).toUpperCase();

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="adm-drawer-shell" onClick={onClose}>
      <div className="adm-drawer" onClick={e => e.stopPropagation()}>

        {/* Banner */}
        {seller.banner && (
          <div style={{
            height: 90, background: `url(${seller.banner}) center/cover`,
            flexShrink: 0, position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, transparent 40%, rgba(15,23,42,.5))',
            }} />
          </div>
        )}

        <div className="adm-drawer-head" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Thumb
              src={seller.logo}
              kind="seller"
              label={initials}
              className={seller.banner ? 'adm-thumb-raised' : ''}
            />
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>
                {seller.storeName || '—'}
                {status === 'verified' && (
                  <i className="fa-solid fa-circle-check" style={{ color: '#f59e0b', fontSize: '1.2rem', marginLeft: 6 }}></i>
                )}
              </div>
              <div className="muted" style={{ fontSize: '1.2rem', marginTop: 2 }}>
                {status === 'pending' ? 'Awaiting verification' : `Status: ${status}`}
              </div>
              {seller.location && (
                <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', marginTop: 2 }}>
                  <i className="fa-solid fa-location-dot" style={{ marginRight: 4 }}></i>{seller.location}
                </div>
              )}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="adm-drawer-body">
          {/* KPI strip */}
          <div className="kpi-strip">
            <div className="kpi">
              <div className="l">Products</div>
              <div className="v">{seller.productCount ?? 0}</div>
            </div>
            <div className="kpi">
              <div className="l">Revenue 30d</div>
              <div className="v">
                <span className="naira"></span>{(seller.revenue30d || 0).toLocaleString()}
              </div>
            </div>
            <div className="kpi">
              <div className="l">Rating</div>
              <div className="v">{(seller.averageRating || 0).toFixed(1)} ★</div>
            </div>
          </div>

          {/* Lifetime stats */}
          {(seller.totalRevenue > 0 || seller.totalOrders > 0) && (
            <div className="kpi-strip" style={{ marginTop: 8 }}>
              <div className="kpi">
                <div className="l">Total revenue</div>
                <div className="v">
                  <span className="naira"></span>{(seller.totalRevenue || 0).toLocaleString()}
                </div>
              </div>
              <div className="kpi">
                <div className="l">Total orders</div>
                <div className="v">{seller.totalOrders ?? 0}</div>
              </div>
              <div className="kpi">
                <div className="l">Category</div>
                <div className="v" style={{ fontSize: '1.3rem', textTransform: 'capitalize' }}>
                  {seller.category || '—'}
                </div>
              </div>
            </div>
          )}

          {/* Owner details */}
          <div className="adm-section-h">Owner details</div>
          <div className="adm-kv">
            <span className="k">Name</span>
            <span className="v">{seller.ownerName || '—'}</span>
            <span className="k">Email</span>
            <span className="v">{seller.email || '—'}</span>
            {seller.phone && <><span className="k">Phone</span><span className="v">{seller.phone}</span></>}
            {seller.category && <><span className="k">Category</span><span className="v">{seller.category}</span></>}
          </div>

          {/* Store description */}
          {seller.description && (
            <>
              <div className="adm-section-h">About the store</div>
              <p style={{ fontSize: '1.3rem', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
                {seller.description}
              </p>
            </>
          )}

          {seller.story && (
            <>
              <div className="adm-section-h">Story</div>
              <p style={{ fontSize: '1.3rem', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
                {seller.story}
              </p>
            </>
          )}

          {/* Bank details */}
          {seller.bankDetails?.accountNumber && (
            <>
              <div className="adm-section-h">Bank details</div>
              <div className="adm-kv">
                <span className="k">Bank</span>
                <span className="v">{seller.bankDetails.bankName || '—'}</span>
                <span className="k">Account</span>
                <span className="v">{seller.bankDetails.accountName || '—'}</span>
                <span className="k">Number</span>
                <span className="v">{seller.bankDetails.accountNumber}</span>
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
              <button className="abtn danger" style={{ flex: 1 }} onClick={onReject}>
                <i className="fa-solid fa-xmark"></i> Reject
              </button>
              <button className="abtn primary" style={{ flex: 1.4 }} onClick={onApprove}>
                <i className="fa-solid fa-circle-check"></i> Approve
              </button>
            </>
          )}
          {status === 'verified' && (
            <button className="abtn danger" style={{ flex: 1 }} onClick={onReject}>
              <i className="fa-solid fa-ban"></i> Suspend
            </button>
          )}
          {status === 'suspended' && (
            <button className="abtn success" style={{ flex: 1 }} onClick={onApprove}>
              <i className="fa-solid fa-circle-check"></i> Reinstate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
