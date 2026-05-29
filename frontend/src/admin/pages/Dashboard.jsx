import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { LineChart } from '../components/charts';
import { apiFetch } from '../../utils/api';

const PERIOD_OPTIONS = [
  { label: 'Last 1 day',   days: 1,    short: '1d'  },
  { label: 'Last 7 days',  days: 7,    short: '7d'  },
  { label: 'Last 30 days', days: 30,   short: '30d' },
  { label: 'Last 1 year',  days: 365,  short: '1y'  },
  { label: 'Last 5 years', days: 1825, short: '5y'  },
];

const METRIC_COLORS = {
  orders:  'var(--accent)',
  revenue: '#6366f1',
  users:   '#22c55e',
};

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [metric, setMetric]             = useState('orders');
  const [period, setPeriod]             = useState(30);
  const [periodOpen, setPeriodOpen]     = useState(false);
  const periodRef                       = useRef(null);
  const [stats, setStats]               = useState(null);
  const [chartSeries, setChartSeries]   = useState({ orders: [], revenue: [], users: [] });
  const [chartLabels, setChartLabels]   = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingVerif, setPendingVerif] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const chartInitRef                    = useRef(false);

  const periodOpt   = PERIOD_OPTIONS.find(p => p.days === period) ?? PERIOD_OPTIONS[2];
  const periodLabel = periodOpt.label;
  const periodShort = periodOpt.short;

  const refreshAll = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true); else setLoading(true);
    Promise.all([
      apiFetch(`/api/admins/stats?days=${period}`).catch(() => null),
      apiFetch(`/api/admins/activity-chart?days=${period}`).catch(() => null),
      apiFetch('/api/admins/recent-orders?limit=6').catch(() => []),
      apiFetch('/api/admins/pending-verifications?limit=4').catch(() => []),
    ]).then(([s, chart, orders, verif]) => {
      if (s) setStats(s);
      if (chart) {
        setChartSeries({ orders: chart.orders || [], revenue: chart.revenue || [], users: chart.users || [] });
        setChartLabels(chart.labels || []);
      }
      setRecentOrders(Array.isArray(orders) ? orders : (orders?.orders || []));
      setPendingVerif(Array.isArray(verif) ? verif : (verif?.results || []));
      chartInitRef.current = true;
    }).finally(() => { setLoading(false); setRefreshing(false); });
  }, [period]);

  // Initial load
  useEffect(() => { refreshAll(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Period change — re-fetch everything with the new period
  useEffect(() => {
    if (!chartInitRef.current) return;
    refreshAll(true);
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close period dropdown on outside click
  useEffect(() => {
    if (!periodOpen) return;
    function close(e) { if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [periodOpen]);

  function exportOrders() {
    if (!recentOrders.length) return;
    const header = ['Ref', 'Buyer', 'Email', 'Amount (₦)', 'Status', 'Date'];
    const rows = recentOrders.map(o => [
      o.orderRef || `UMP-${String(o._id).slice(-6).toUpperCase()}`,
      o.buyer?.name  || '—',
      o.buyer?.email || '—',
      o.totalAmount  ?? 0,
      o.status,
      o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : '—',
    ]);
    downloadCSV([header, ...rows], `ump-orders-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function downloadChart() {
    const series = chartSeries[metric] || [];
    if (!series.length) return;
    const metricLabel = { orders: 'Orders', revenue: 'Revenue (₦)', users: 'New Users' }[metric];
    const rows = series.map((v, i) => [chartLabels[i] ?? i + 1, v]);
    downloadCSV([['Date', metricLabel], ...rows], `ump-${metric}-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const statusColor = s =>
    ({ completed: 'green', confirmed: 'blue', shipped: 'amber', pending: 'gray', cancelled: 'red', disputed: 'red' }[s?.toLowerCase()] ?? 'gray');

  // KPI shows '—' while initial loading, dims slightly while refreshing
  const val = (v) => (loading ? '—' : (v ?? '—'));

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Dashboard</h1>
          <p>
            Real-time overview of UMP marketplace activity
            {refreshing && <span style={{ marginLeft: 8, fontSize: '1.1rem', color: 'var(--ink-3)' }}>
              <i className="fa-solid fa-circle-notch fa-spin"></i> Updating…
            </span>}
          </p>
        </div>
        <div className="right">
          <button className="abtn ghost" onClick={() => refreshAll(true)} disabled={refreshing || loading} title="Refresh all data">
            <i className={`fa-solid fa-rotate-right${refreshing ? ' fa-spin' : ''}`}></i> Refresh
          </button>
          {/* Period picker */}
          <div style={{ position: 'relative' }} ref={periodRef}>
            <button className="abtn ghost" onClick={() => setPeriodOpen(o => !o)}>
              <i className="fa-regular fa-calendar"></i> {periodLabel}
              <i className="fa-solid fa-chevron-down" style={{ fontSize: '1rem', marginLeft: 4 }}></i>
            </button>
            {periodOpen && (
              <div className="adm-period-drop">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.days}
                    className={`adm-period-opt${period === opt.days ? ' active' : ''}`}
                    onClick={() => { setPeriod(opt.days); setPeriodOpen(false); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="abtn ghost" onClick={exportOrders} title="Export recent orders as CSV">
            <i className="fa-solid fa-download"></i> Export
          </button>
        </div>
      </div>

      <div className="adm-stats" style={{ opacity: refreshing ? 0.7 : 1, transition: 'opacity 0.2s' }}>
        <StatCard
          label={`New users (${periodShort})`}
          value={val(stats?.newUsers?.toLocaleString())}
          delta={stats?.totalUsers ? `${stats.totalUsers.toLocaleString()} total` : '—'}
          icon="fa-users"
        />
        <StatCard
          label={`New sellers (${periodShort})`}
          value={val(stats?.newSellers?.toLocaleString())}
          delta={stats?.totalSellers ? `${stats.totalSellers.toLocaleString()} total` : '—'}
          icon="fa-store"
          badge={stats?.pendingSellers ? <span className="pill-warn">{stats.pendingSellers} pending</span> : null}
        />
        <StatCard
          label={`Order value (${periodShort})`}
          value={val(stats?.periodOrdersValue)}
          delta={stats?.periodOrderCount != null ? `${stats.periodOrderCount} orders` : '—'}
          icon="fa-receipt"
        />
        <StatCard
          label={`Platform revenue (${periodShort})`}
          value={val(stats?.platformRevenue)}
          delta={stats?.activeOrdersValue ? `${stats.activeOrdersValue} in flight` : '—'}
          icon="fa-naira-sign"
        />
        <StatCard
          label="Pending payouts"
          value={val(stats?.pendingPayoutsValue)}
          delta={stats?.pendingPayoutsCount ? `${stats.pendingPayoutsCount} requests` : '—'}
          icon="fa-money-bill-transfer"
          badge={stats?.pendingPayoutsCount > 0 ? <span className="pill-warn">action</span> : null}
        />
        <StatCard
          label="Flagged content"
          value={val(stats?.flaggedCount)}
          delta={stats ? `${stats.disputes ?? 0} disputes · ${stats.reports ?? 0} reports` : '—'}
          icon="fa-flag"
          badge={stats?.flaggedCount > 0 ? <span className="pill-red">review</span> : null}
          down
        />
      </div>

      {/* Activity over time */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-head">
          <div>
            <h3>Activity over time</h3>
            <div className="muted" style={{ fontSize: '1.2rem', marginTop: 2 }}>{periodLabel}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="chart-toggle">
              {[['orders', 'Orders'], ['revenue', 'Revenue'], ['users', 'Users']].map(([k, lbl]) => (
                <button key={k} className={metric === k ? 'active' : ''} onClick={() => setMetric(k)}>
                  {lbl}
                </button>
              ))}
            </div>
            <button className="abtn ghost sm" onClick={downloadChart} title="Download chart data as CSV">
              <i className="fa-solid fa-download"></i>
            </button>
          </div>
        </div>
        <div className="adm-card-body">
          <div className="chart-area">
            {refreshing
              ? <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.3rem' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }}></i> Updating…
                </div>
              : <LineChart data={chartSeries[metric] || []} labels={chartLabels} color={METRIC_COLORS[metric]} />
            }
          </div>
        </div>
      </div>

      <div className="adm-2col">
        {/* Recent orders */}
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
                  <tr key={o._id}>
                    <td className="mono">{o.orderRef || `UMP-${String(o._id).slice(-6).toUpperCase()}`}</td>
                    <td>
                      <div className="adm-row-user">
                        <div className="adm-av av-b">{(o.buyer?.name || 'U')[0].toUpperCase()}</div>
                        <div className="name" style={{ fontSize: '1.25rem' }}>{o.buyer?.name || '—'}</div>
                      </div>
                    </td>
                    <td className="amount"><span className="naira"></span>{(o.totalAmount || 0).toLocaleString()}</td>
                    <td><span className={`pill dot ${statusColor(o.status)}`}>{o.status}</span></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4}>
                      <div className="adm-empty" style={{ padding: '28px 16px' }}>
                        <i className="fa-solid fa-receipt"></i>
                        <p>No orders yet</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending verifications */}
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
                        <div className="adm-av av-b">{(p.name || p.storeName || 'S')[0].toUpperCase()}</div>
                        <div>
                          <div className="name" style={{ fontSize: '1.25rem' }}>{p.name || p.storeName || '—'}</div>
                          <div className="email">{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`role-pill ${p.type || 'seller'}`}>{p.type || 'Seller'}</span></td>
                    <td className="muted" style={{ fontSize: '1.2rem' }}>
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : '—'}
                    </td>
                    <td>
                      <button className="abtn success sm" onClick={() => navigate('/admin/sellers')} title="Review">
                        <i className="fa-solid fa-check"></i>
                      </button>
                      <button className="abtn ghost sm" style={{ marginLeft: 4 }} onClick={() => navigate('/admin/sellers')} title="View">
                        <i className="fa-solid fa-eye"></i>
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4}>
                      <div className="adm-empty" style={{ padding: '28px 16px' }}>
                        <i className="fa-solid fa-circle-check"></i>
                        <p>No pending verifications</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
