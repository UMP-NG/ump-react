import { useState, useEffect, useCallback } from 'react';
import { MiniStat } from '../components/StatCard';
import { apiFetch } from '../../utils/api';

const TABS = [
  { label: 'All',       filter: '' },
  { label: 'Pending',   filter: 'pending' },
  { label: 'Confirmed', filter: 'confirmed' },
  { label: 'Completed', filter: 'completed' },
  { label: 'Cancelled', filter: 'cancelled' },
];
const STATUS_COLOR = { pending: 'amber', confirmed: 'blue', completed: 'green', cancelled: 'red' };
const TYPE_COLOR   = { Service: 'blue', Listing: 'purple' };

export default function Bookings() {
  const [tab, setTab]         = useState(0);
  const [bookings, setBookings] = useState([]);
  const [total, setTotal]     = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [drawer, setDrawer]   = useState(null);
  const [search, setSearch]   = useState('');

  const fetchBookings = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (TABS[tab].filter) params.set('status', TABS[tab].filter);
    apiFetch(`/api/admins/bookings?${params}`)
      .then(d => {
        setBookings(d?.bookings || []);
        setTotal(d?.total || 0);
        if (d?.summary) setSummary(d.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, page]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const displayed = search
    ? bookings.filter(b => {
        const user  = (b.user?.name || '').toLowerCase();
        const prov  = (b.provider?.name || '').toLowerCase();
        const item  = (b.item?.name || '').toLowerCase();
        const q = search.toLowerCase();
        return user.includes(q) || prov.includes(q) || item.includes(q);
      })
    : bookings;

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Bookings</h1>
          <p>{total.toLocaleString()} total booking{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="adm-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <MiniStat label="Pending"   value={summary?.pending   ?? '—'} icon="fa-hourglass-half" color="#eab308" />
        <MiniStat label="Confirmed" value={summary?.confirmed  ?? '—'} icon="fa-calendar-check" color="#3b82f6" />
        <MiniStat label="Completed" value={summary?.completed  ?? '—'} icon="fa-circle-check"   color="#22c55e" />
        <MiniStat label="Cancelled" value={summary?.cancelled  ?? '—'} icon="fa-ban"             color="#ef4444" />
      </div>

      <div className="adm-filterbar">
        <div className="adm-tabs">
          {TABS.map((t, i) => (
            <button key={t.label} className={`tab${tab === i ? ' active' : ''}`} onClick={() => { setTab(i); setPage(1); }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }}></div>
        <div className="adm-search" style={{ maxWidth: 260 }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input placeholder="Search user, provider, item…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th><th>Item booked</th><th>Type</th>
                <th>Provider</th><th>Date</th><th>Time slot</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan="8">
                  <div className="adm-empty"><i className="fa-solid fa-calendar-xmark"></i><p>No bookings found</p></div>
                </td></tr>
              ) : displayed.map(b => (
                <tr key={b._id} onClick={() => setDrawer(b)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="adm-row-user">
                      <div className="adm-av av-b">{(b.user?.name || 'U')[0]}</div>
                      <div>
                        <div className="name" style={{ fontSize: '1.25rem' }}>{b.user?.name || '—'}</div>
                        <div className="email">{b.user?.email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.item?.name || '—'}
                  </td>
                  <td>
                    <span className={`pill dot ${TYPE_COLOR[b.item?.type] || 'gray'}`}>{b.item?.type || '—'}</span>
                  </td>
                  <td className="muted">{b.provider?.name || '—'}</td>
                  <td className="muted">
                    {b.date ? new Date(b.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="muted">{b.timeSlot || '—'}</td>
                  <td>
                    <span className={`pill dot ${STATUS_COLOR[b.status] || 'gray'}`}>{b.status}</span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="icon-action" onClick={() => setDrawer(b)}>
                      <i className="fa-solid fa-eye"></i>
                    </button>
                  </td>
                </tr>
              ))}
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

      {drawer && <BookingDrawer booking={drawer} onClose={() => setDrawer(null)} />}
    </>
  );
}

function BookingDrawer({ booking, onClose }) {
  return (
    <div className="adm-drawer-shell" onClick={onClose}>
      <div className="adm-drawer" onClick={e => e.stopPropagation()}>

        <div className="adm-drawer-head">
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{booking.item?.name || 'Booking'}</div>
            <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', marginTop: 2 }}>
              <span className={`pill dot ${TYPE_COLOR[booking.item?.type] || 'gray'}`}>{booking.item?.type || '—'}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="adm-drawer-body">
          <div className="kpi-strip">
            <div className="kpi">
              <div className="l">Status</div>
              <div className="v" style={{ fontSize: '1.3rem' }}>
                <span className={`pill dot ${STATUS_COLOR[booking.status] || 'gray'}`}>{booking.status}</span>
              </div>
            </div>
            <div className="kpi">
              <div className="l">Date</div>
              <div className="v" style={{ fontSize: '1.3rem' }}>
                {booking.date ? new Date(booking.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </div>
            </div>
            <div className="kpi">
              <div className="l">Time</div>
              <div className="v" style={{ fontSize: '1.3rem' }}>{booking.timeSlot || '—'}</div>
            </div>
          </div>

          <div className="adm-section-h">Customer</div>
          <div className="adm-kv">
            <span className="k">Name</span><span className="v">{booking.user?.name || '—'}</span>
            <span className="k">Email</span><span className="v">{booking.user?.email || '—'}</span>
          </div>

          <div className="adm-section-h">Provider</div>
          <div className="adm-kv">
            <span className="k">Name</span><span className="v">{booking.provider?.name || '—'}</span>
            <span className="k">Email</span><span className="v">{booking.provider?.email || '—'}</span>
          </div>

          {booking.notes && (
            <>
              <div className="adm-section-h">Notes</div>
              <p style={{ fontSize: '1.3rem', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{booking.notes}</p>
            </>
          )}

          <div className="adm-section-h">Booked on</div>
          <div className="adm-kv">
            <span className="k">Created</span>
            <span className="v">
              {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
