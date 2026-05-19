import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { LineChart } from '../components/charts';
import { apiFetch } from '../../utils/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [metric, setMetric] = useState('orders');
  const [stats, setStats] = useState(null);
  const [chartSeries, setChartSeries] = useState({ orders: [], revenue: [], users: [] });
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingVerif, setPendingVerif] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/admins/stats').catch(() => null),
      apiFetch('/api/admins/activity-chart').catch(() => null),
      apiFetch('/api/admins/recent-orders?limit=6').catch(() => []),
      apiFetch('/api/admins/pending-verifications?limit=4').catch(() => []),
    ]).then(([s, chart, orders, verif]) => {
      setStats(s);
      if (chart) setChartSeries({ orders: chart.orders || [], revenue: chart.revenue || [], users: chart.users || [] });
      setRecentOrders(Array.isArray(orders) ? orders : orders?.orders || []);
      setPendingVerif(Array.isArray(verif) ? verif : verif?.results || []);
    }).finally(() => setLoading(false));
  }, []);

  const statusColor = s => ({ completed: 'green', confirmed: 'blue', shipped: 'amber', pending: 'gray', cancelled: 'red', disputed: 'red' }[s?.toLowerCase()] || 'gray');

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Dashboard</h1>
          <p>Real-time overview of UMP marketplace activity</p>
        </div>
        <div className="right">
          <button className="abtn ghost"><i className="fa-regular fa-calendar"></i> Last 30 days</button>
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button>
        </div>
      </div>

      <div className="adm-stats">
        <StatCard
          label="Total users"
          value={loading ? '—' : (stats?.totalUsers?.toLocaleString() ?? '—')}
          delta={stats?.newUsersToday ? `+${stats.newUsersToday} today` : '—'}
          icon="fa-users"
        />
        <StatCard
          label="Total sellers"
          value={loading ? '—' : (stats?.totalSellers?.toLocaleString() ?? '—')}
          delta={stats?.newSellersToday ? `+${stats.newSellersToday} today` : '—'}
          icon="fa-store"
          badge={stats?.pendingSellers ? <span className="pill-warn">{stats.pendingSellers} pending</span> : null}
        />
        <StatCard
          label="Active orders"
          value={loading ? '—' : (stats?.activeOrdersValue ?? '—')}
          delta={stats?.activeOrdersDelta ?? '—'}
          icon="fa-receipt"
        />
        <StatCard
          label="Platform revenue (30d)"
          value={loading ? '—' : (stats?.platformRevenue30d ?? '—')}
          delta={stats?.revenueDelta ?? '—'}
          icon="fa-naira-sign"
        />
        <StatCard
          label="Pending payouts"
          value={loading ? '—' : (stats?.pendingPayoutsValue ?? '—')}
          delta={stats?.pendingPayoutsCount ? `${stats.pendingPayoutsCount} requests` : '—'}
          icon="fa-money-bill-transfer"
          badge={stats?.pendingPayoutsCount > 0 ? <span className="pill-warn">action</span> : null}
        />
        <StatCard
          label="Flagged content"
          value={loading ? '—' : (stats?.flaggedCount ?? '—')}
          delta={stats ? `${stats.disputes ?? 0} disputes · ${stats.reports ?? 0} reports` : '—'}
          icon="fa-flag"
          badge={stats?.flaggedCount > 0 ? <span className="pill-red">review</span> : null}
          down
        />
      </div>

      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-head">
          <div>
            <h3>Activity over time</h3>
            <div className="muted" style={{ fontSize: '1.2rem', marginTop: 2 }}>Past 30 days</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="chart-toggle">
              {[['orders','Orders'],['revenue','Revenue'],['users','New users']].map(([k, lbl]) => (
                <button key={k} className={metric === k ? 'active' : ''} onClick={() => setMetric(k)}>
                  {lbl}
                </button>
              ))}
            </div>
            <button className="abtn ghost sm"><i className="fa-solid fa-download"></i></button>
          </div>
        </div>
        <div className="adm-card-body">
          <div className="chart-area">
            <LineChart data={chartSeries[metric] || []} />
          </div>
        </div>
      </div>

      <div className="adm-2col">
        <div className="adm-card">
          <div className="adm-card-head">
            <h3>Recent orders</h3>
            <button className="abtn ghost sm" onClick={() => navigate('/admin/orders')}>
              View all <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
          <div className="adm-scroll-x">
            <table className="adm-table">
              <thead>
                <tr><th>Ref</th><th>Buyer</th><th>Total</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentOrders.length > 0 ? recentOrders.map(o => (
                  <tr key={o._id || o.ref}>
                    <td className="mono">{o.orderRef || o.ref || '—'}</td>
                    <td>
                      <div className="adm-row-user">
                        <div className="adm-av av-b">{(o.buyer?.name || o.buyer || 'U')[0]}</div>
                        <div className="name" style={{ fontSize: '1.25rem' }}>{o.buyer?.name || o.buyer || '—'}</div>
                      </div>
                    </td>
                    <td className="amount"><span className="naira"></span>{(o.totalAmount || o.total || 0).toLocaleString()}</td>
                    <td><span className={`pill dot ${statusColor(o.status)}`}>{o.status}</span></td>
                  </tr>
                )) : (
                  FALLBACK_ORDERS.map(o => (
                    <tr key={o.ref}>
                      <td className="mono">{o.ref}</td>
                      <td>
                        <div className="adm-row-user">
                          <div className={`adm-av av-${o.av}`}>{o.buyer[0]}</div>
                          <div className="name" style={{ fontSize: '1.25rem' }}>{o.buyer}</div>
                        </div>
                      </td>
                      <td className="amount"><span className="naira"></span>{o.total}</td>
                      <td><span className={`pill dot ${o.color}`}>{o.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <h3>Pending verifications</h3>
            <button className="abtn ghost sm" onClick={() => navigate('/admin/sellers')}>
              View all <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
          <div className="adm-scroll-x">
            <table className="adm-table">
              <thead>
                <tr><th>Applicant</th><th>Type</th><th>Submitted</th><th></th></tr>
              </thead>
              <tbody>
                {pendingVerif.length > 0 ? pendingVerif.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div className="adm-row-user">
                        <div className="adm-av av-b">{(p.name || p.storeName || 'S')[0]}</div>
                        <div>
                          <div className="name" style={{ fontSize: '1.25rem' }}>{p.name || p.storeName}</div>
                          <div className="email">{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`role-pill ${p.type || 'seller'}`}>{p.type || 'Seller'}</span></td>
                    <td className="muted" style={{ fontSize: '1.2rem' }}>{p.submittedAgo || p.createdAt?.split('T')[0]}</td>
                    <td>
                      <button className="abtn success sm"><i className="fa-solid fa-check"></i></button>
                      <button className="abtn ghost sm" style={{ marginLeft: 4 }}><i className="fa-solid fa-eye"></i></button>
                    </td>
                  </tr>
                )) : (
                  FALLBACK_VERIF.map(p => (
                    <tr key={p.name}>
                      <td>
                        <div className="adm-row-user">
                          <div className={`adm-av av-${p.av}`}>{p.name[0]}</div>
                          <div>
                            <div className="name" style={{ fontSize: '1.25rem' }}>{p.name}</div>
                            <div className="email">{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`role-pill ${p.kind}`}>{p.kind === 'seller' ? 'Seller' : 'Provider'}</span></td>
                      <td className="muted" style={{ fontSize: '1.2rem' }}>{p.when}</td>
                      <td>
                        <button className="abtn success sm"><i className="fa-solid fa-check"></i></button>
                        <button className="abtn ghost sm" style={{ marginLeft: 4 }}><i className="fa-solid fa-eye"></i></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

const FALLBACK_ORDERS = [
  { ref: 'UMP-29481', buyer: 'Tunde Adekunle', av: 'b', total: '24,500', status: 'Confirmed', color: 'blue' },
  { ref: 'UMP-29480', buyer: 'Aisha Mohammed', av: 'g', total: '8,200',  status: 'Shipped',   color: 'amber' },
  { ref: 'UMP-29479', buyer: 'Chinedu Okeke',  av: 'c', total: '156,000', status: 'Completed', color: 'green' },
  { ref: 'UMP-29478', buyer: 'Funmi Bello',    av: 'e', total: '3,800',  status: 'Pending',   color: 'gray' },
  { ref: 'UMP-29477', buyer: 'David Ogun',     av: 'd', total: '47,200', status: 'Confirmed', color: 'blue' },
  { ref: 'UMP-29476', buyer: 'Ngozi Eze',      av: 'f', total: '12,400', status: 'Cancelled', color: 'red' },
];

const FALLBACK_VERIF = [
  { name: 'Bolaji Tech Hub', email: 'bolajitech@unilag.edu.ng', av: 'b', kind: 'seller',    when: '2h ago' },
  { name: 'Sade Adesina',    email: 'sade.a@unilag.edu.ng',     av: 'g', kind: 'provider',  when: '4h ago' },
  { name: 'Lekan Books',     email: 'lekanbooks@unilag.edu.ng', av: 'e', kind: 'seller',    when: '6h ago' },
  { name: 'Tope Designs',    email: 'tope.d@unilag.edu.ng',     av: 'c', kind: 'provider',  when: '1d ago' },
];
