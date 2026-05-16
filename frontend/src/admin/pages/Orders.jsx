import { useState, useEffect, useCallback } from 'react';
import { MiniStat } from '../components/StatCard';
import { apiFetch } from '../../utils/api';

const TABS = [
  { label: 'All',      filter: '' },
  { label: 'Pending',  filter: 'pending' },
  { label: 'Shipped',  filter: 'shipped' },
  { label: 'Completed', filter: 'completed' },
  { label: 'Disputed', filter: 'disputed' },
];
const STATUS_COLOR = { completed: 'green', confirmed: 'blue', shipped: 'amber', pending: 'gray', cancelled: 'red', disputed: 'red' };
const PAY_COLOR    = { paystack: 'blue', wallet: 'purple', cash: 'gray', transfer: 'amber' };

export default function Orders() {
  const [tab, setTab] = useState(0);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (TABS[tab].filter) params.set('status', TABS[tab].filter);
    Promise.all([
      apiFetch(`/api/admins/orders?${params}`).catch(() => ({})),
      apiFetch('/api/admins/orders/summary').catch(() => null),
    ]).then(([d, s]) => {
      setOrders(d?.orders || []);
      setTotal(d?.total || 0);
      setSummary(s);
    }).finally(() => setLoading(false));
  }, [tab, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Orders</h1>
          <p>{total.toLocaleString()} total orders</p>
        </div>
        <div className="right">
          <button className="abtn ghost"><i className="fa-regular fa-calendar"></i> Last 30 days</button>
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button>
        </div>
      </div>

      <div className="adm-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <MiniStat label="Pending"             value={summary?.pending ?? '—'}    icon="fa-clock"        color="#eab308" />
        <MiniStat label="Shipped"             value={summary?.shipped ?? '—'}    icon="fa-truck"        color="#3b82f6" />
        <MiniStat label="Completed"           value={summary?.completed ?? '—'}  icon="fa-circle-check" color="#22c55e" />
        <MiniStat label="Cancelled / Refunded" value={summary?.cancelled ?? '—'} icon="fa-rotate-left"  color="#ef4444" />
      </div>

      <div className="adm-filterbar">
        <div className="adm-tabs">
          {TABS.map((t, i) => (
            <button key={t.label} className={`tab${tab === i ? ' active' : ''}`} onClick={() => { setTab(i); setPage(1); }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Order</th><th>Buyer</th><th>Seller</th><th>Items</th>
                <th>Total</th><th>Payment</th><th>Status</th><th>Placed</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="9">
                  <div className="adm-empty"><i className="fa-solid fa-receipt"></i><p>No orders found</p></div>
                </td></tr>
              ) : orders.map(o => {
                const status = o.status || 'pending';
                const payMethod = (o.paymentMethod || 'paystack').toLowerCase();
                return (
                  <tr key={o._id}>
                    <td className="mono">{o.orderRef || o._id?.slice(-6)}</td>
                    <td>
                      <div className="adm-row-user">
                        <div className="adm-av av-b">{(o.buyer?.name || 'B')[0]}</div>
                        <div className="name" style={{ fontSize: '1.25rem' }}>{o.buyer?.name || '—'}</div>
                      </div>
                    </td>
                    <td className="muted">{o.seller?.storeName || o.sellerName || '—'}</td>
                    <td className="amount">{o.items?.length ?? 1}</td>
                    <td className="amount"><span className="naira"></span>{(o.totalAmount || 0).toLocaleString()}</td>
                    <td><span className={`pill ${PAY_COLOR[payMethod] || 'gray'}`}>{o.paymentMethod || 'Paystack'}</span></td>
                    <td><span className={`pill dot ${STATUS_COLOR[status] || 'gray'}`}>{status}</span></td>
                    <td className="muted">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td>
                      <button className="icon-action"><i className="fa-solid fa-eye"></i></button>
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
              <button className="abtn sm dark">{page}</button>
              {page * 20 < total && <button className="abtn sm ghost" onClick={() => setPage(p => p + 1)}>{page + 1}</button>}
              <button className="icon-action" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
