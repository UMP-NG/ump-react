import { useState, useEffect, useCallback } from 'react';
import { MiniStat } from '../components/StatCard';
import { apiFetch } from '../../utils/api';

const TABS = [
  { label: 'All',       filter: '' },
  { label: 'Pending',   filter: 'pending' },
  { label: 'Shipped',   filter: 'shipped' },
  { label: 'Completed', filter: 'completed' },
  { label: 'Disputed',  filter: 'disputed' },
];
const STATUS_COLOR = {
  completed: 'green', confirmed: 'blue', shipped: 'amber',
  pending: 'gray', cancelled: 'red', disputed: 'red', 'pending-verification': 'gray',
};
const PAY_COLOR = { paystack: 'blue', wallet: 'purple', cash: 'gray', transfer: 'amber', flutterwave: 'amber' };

const ALL_STATUSES = ['pending', 'confirmed', 'shipped', 'completed', 'cancelled', 'disputed'];

export default function Orders() {
  const [tab, setTab]           = useState(0);
  const [orders, setOrders]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [drawer, setDrawer]     = useState(null);
  const [search, setSearch]     = useState('');

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

  const displayed = search
    ? orders.filter(o => {
        const ref   = (o.orderRef || o._id || '').toLowerCase();
        const buyer = (o.buyer?.name || '').toLowerCase();
        const store = (o.seller?.storeName || '').toLowerCase();
        return ref.includes(search.toLowerCase()) || buyer.includes(search.toLowerCase()) || store.includes(search.toLowerCase());
      })
    : orders;

  async function updateStatus(orderId, status) {
    try {
      await apiFetch(`/api/admins/orders/${orderId}`, { method: 'PUT', body: { status } });
      setDrawer(d => d?._id === orderId ? { ...d, status } : d);
      fetchOrders();
      return true;
    } catch {
      return false;
    }
  }

  function sanitizeCsvCell(v) {
    const s = String(v ?? '');
    return /^[=+\-@]/.test(s) ? `\t${s}` : s;
  }

  function exportCSV() {
    if (!orders.length) return;
    const header = ['Order Ref', 'Buyer', 'Seller', 'Items', 'Total (₦)', 'Payment', 'Status', 'Placed'];
    const rows = orders.map(o => [
      o.orderRef || ('#' + o._id?.slice(-6).toUpperCase()),
      o.buyer?.name || '—',
      o.seller?.storeName || o.seller?.name || '—',
      o.items?.length ?? 0,
      o.totalAmount || 0,
      o.paymentMethod || 'Paystack',
      o.status || 'pending',
      o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : '—',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${sanitizeCsvCell(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `ump-orders-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Orders</h1>
          <p>{total.toLocaleString()} total orders</p>
        </div>
        <div className="right">
          <button className="abtn ghost" onClick={fetchOrders} disabled={loading} title="Refresh">
            <i className={`fa-solid fa-rotate-right${loading ? ' fa-spin' : ''}`}></i> Refresh
          </button>
          <button className="abtn ghost" onClick={exportCSV} disabled={!orders.length}>
            <i className="fa-solid fa-download"></i> Export
          </button>
        </div>
      </div>

      <div className="adm-stats adm-stats-4">
        <MiniStat label="Pending"              value={summary?.pending ?? '—'}    icon="fa-clock"        color="#eab308" />
        <MiniStat label="Shipped"              value={summary?.shipped ?? '—'}    icon="fa-truck"        color="#3b82f6" />
        <MiniStat label="Completed"            value={summary?.completed ?? '—'}  icon="fa-circle-check" color="#22c55e" />
        <MiniStat label="Cancelled / Refunded" value={summary?.cancelled ?? '—'}  icon="fa-rotate-left"  color="#ef4444" />
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
          <input placeholder="Search ref, buyer, seller…" value={search} onChange={e => setSearch(e.target.value)} />
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
              ) : displayed.length === 0 ? (
                <tr><td colSpan="9">
                  <div className="adm-empty"><i className="fa-solid fa-receipt"></i><p>No orders found</p></div>
                </td></tr>
              ) : displayed.map(o => {
                const status     = o.status || 'pending';
                const payMethod  = (o.paymentMethod || 'paystack').toLowerCase();
                return (
                  <tr key={o._id} onClick={() => setDrawer(o)} style={{ cursor: 'pointer' }}>
                    <td className="mono" style={{ fontSize: '1.2rem' }}>{o.orderRef || ('#' + o._id?.slice(-6).toUpperCase())}</td>
                    <td>
                      <div className="adm-row-user">
                        <div className="adm-av av-b">{(o.buyer?.name || 'B')[0]}</div>
                        <div className="name" style={{ fontSize: '1.25rem' }}>{o.buyer?.name || '—'}</div>
                      </div>
                    </td>
                    <td className="muted">{o.seller?.storeName || o.seller?.name || '—'}</td>
                    <td className="muted">{o.items?.length ?? 0}</td>
                    <td className="amount"><span className="naira"></span>{(o.totalAmount || 0).toLocaleString()}</td>
                    <td><span className={`pill ${PAY_COLOR[payMethod] || 'gray'}`}>{o.paymentMethod || 'Paystack'}</span></td>
                    <td><span className={`pill dot ${STATUS_COLOR[status] || 'gray'}`}>{status}</span></td>
                    <td className="muted">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="icon-action" onClick={() => setDrawer(o)}>
                        <i className="fa-solid fa-eye"></i>
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
        <OrderDrawer
          order={drawer}
          onClose={() => setDrawer(null)}
          onUpdateStatus={updateStatus}
        />
      )}
    </>
  );
}

function OrderDrawer({ order, onClose, onUpdateStatus }) {
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function changeStatus(status) {
    if (status === currentStatus) return;
    setUpdating(true);
    const ok = await onUpdateStatus(order._id, status);
    if (ok) setCurrentStatus(status);
    setUpdating(false);
  }

  const addr = order.shippingAddress;

  return (
    <div className="adm-drawer-shell" onClick={onClose}>
      <div className="adm-drawer" onClick={e => e.stopPropagation()}>

        <div className="adm-drawer-head">
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace' }}>
              {order.orderRef || ('#' + order._id?.slice(-6).toUpperCase())}
            </div>
            <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', marginTop: 2 }}>
              {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="adm-drawer-body">
          <div className="kpi-strip">
            <div className="kpi">
              <div className="l">Total</div>
              <div className="v"><span className="naira"></span>{(order.totalAmount || 0).toLocaleString()}</div>
            </div>
            <div className="kpi">
              <div className="l">Items</div>
              <div className="v">{order.items?.length ?? 0}</div>
            </div>
            <div className="kpi">
              <div className="l">Payment</div>
              <div className="v" style={{ fontSize: '1.2rem' }}>{order.paymentStatus || '—'}</div>
            </div>
          </div>

          {/* Status update */}
          <div className="adm-section-h">Order status</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                className={currentStatus === s ? 'abtn primary sm' : 'abtn ghost sm'}
                disabled={updating}
                onClick={() => changeStatus(s)}
                style={{ textTransform: 'capitalize' }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Parties */}
          <div className="adm-section-h">Buyer</div>
          <div className="adm-kv">
            <span className="k">Name</span><span className="v">{order.buyer?.name || '—'}</span>
            <span className="k">Email</span><span className="v">{order.buyer?.email || '—'}</span>
          </div>

          <div className="adm-section-h">Seller</div>
          <div className="adm-kv">
            <span className="k">Store</span><span className="v">{order.seller?.storeName || order.seller?.name || '—'}</span>
            <span className="k">Email</span><span className="v">{order.seller?.email || '—'}</span>
          </div>

          {/* Items */}
          {order.items?.length > 0 && (
            <>
              <div className="adm-section-h">Items</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    {item.product?.images?.[0]?.url && (
                      <img src={item.product.images[0].url} alt={item.product.name} style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '1.3rem' }}>{item.product?.name || 'Product'}</div>
                      <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)' }}>Qty: {item.quantity}</div>
                    </div>
                    <div className="amount"><span className="naira"></span>{(item.price || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Shipping */}
          {addr?.address && (
            <>
              <div className="adm-section-h">Shipping address</div>
              <div className="adm-kv">
                {addr.name    && <><span className="k">Name</span><span className="v">{addr.name}</span></>}
                {addr.phone   && <><span className="k">Phone</span><span className="v">{addr.phone}</span></>}
                {addr.address && <><span className="k">Address</span><span className="v">{addr.address}</span></>}
                {addr.city    && <><span className="k">City</span><span className="v">{addr.city}, {addr.state}</span></>}
              </div>
            </>
          )}

          {/* Payment details */}
          <div className="adm-section-h">Payment</div>
          <div className="adm-kv">
            <span className="k">Method</span><span className="v">{order.paymentMethod || '—'}</span>
            <span className="k">Status</span><span className="v">{order.paymentStatus || '—'}</span>
            {order.paymentInfo?.reference && <><span className="k">Ref</span><span className="v" style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{order.paymentInfo.reference}</span></>}
          </div>

          {order.notes && (
            <>
              <div className="adm-section-h">Notes</div>
              <p style={{ fontSize: '1.3rem', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{order.notes}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
