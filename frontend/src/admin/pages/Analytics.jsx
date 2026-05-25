import { useState, useEffect } from 'react';
import { MiniStat } from '../components/StatCard';
import { LineChart, PieChart } from '../components/charts';
import { apiFetch } from '../../utils/api';

const PIE_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899', '#94a3b8'];

// Generate ISO date strings for the last N days (oldest first, today last)
function buildDateLabels(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

const GMV_LABELS = buildDateLabels(30);

export default function Analytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    apiFetch('/api/admins/analytics')
      .then(d => setData(d))
      .catch(err => setError(err?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const gmvSeries  = data?.gmvDaily || [];
  const feeSeries  = gmvSeries.map(v => Math.round(v * 0.032));
  const categoryMix = data?.categoryMix || [];
  const topSellers  = data?.topSellers  || [];

  const hasGmv = gmvSeries.some(v => v > 0);

  if (loading) return (
    <>
      <div className="adm-page-head">
        <div className="left"><h1>Analytics</h1><p>GMV, fees, category &amp; cohort performance</p></div>
      </div>
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-3)' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }} />
        <p style={{ marginTop: 12, fontSize: '1.4rem' }}>Loading analytics…</p>
      </div>
    </>
  );

  if (error) return (
    <>
      <div className="adm-page-head">
        <div className="left"><h1>Analytics</h1></div>
      </div>
      <div style={{ padding: '48px 0', textAlign: 'center', color: '#dc2626' }}>
        <i className="fas fa-circle-exclamation" style={{ fontSize: '2rem' }} />
        <p style={{ marginTop: 12, fontSize: '1.4rem' }}>{error}</p>
        <button className="abtn ghost" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>
          <i className="fas fa-rotate-right" /> Retry
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Analytics</h1>
          <p>GMV, fees, category &amp; cohort performance</p>
        </div>
        <div className="right">
          <button className="abtn ghost"><i className="fa-regular fa-calendar" /> Last 90 days</button>
          <button className="abtn ghost"><i className="fa-solid fa-download" /> Export</button>
        </div>
      </div>

      {/* KPI row */}
      <div className="adm-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <MiniStat label="GMV (90d)"         value={data?.gmv90d    || '₦0'} icon="fa-naira-sign"    color="#f97316" />
        <MiniStat label="Platform fees"     value={data?.fees90d   || '₦0'} icon="fa-percent"       color="#22c55e" />
        <MiniStat label="Avg order value"   value={data?.avgOrder  || '₦0'} icon="fa-cart-shopping" color="#3b82f6" />
        <MiniStat label="Repeat buyer rate" value={data?.repeatRate || '0%'} icon="fa-rotate"        color="#8b5cf6" />
      </div>

      {/* GMV + Fees line chart */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-head">
          <div>
            <h3>GMV &amp; Platform Fees</h3>
            <div className="muted" style={{ fontSize: '1.2rem' }}>Daily · last 30 days</div>
          </div>
          <div className="chart-legend" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '1.2rem', color: 'var(--ink-2)' }}>
              <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="var(--accent)" strokeWidth="2.5" /></svg>
              GMV
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '1.2rem', color: 'var(--ink-2)' }}>
              <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="#22c55e" strokeWidth="2" strokeDasharray="6 3" /></svg>
              Platform fees
            </span>
          </div>
        </div>
        <div className="adm-card-body">
          <div className="chart-area" style={{ height: 260 }}>
            {hasGmv ? (
              <LineChart
                data={gmvSeries}
                data2={feeSeries}
                color="var(--accent)"
                color2="#22c55e"
                height={260}
                labels={GMV_LABELS}
              />
            ) : (
              <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: 10 }}>
                <i className="fas fa-chart-line" style={{ fontSize: '2.4rem' }} />
                <p style={{ margin: 0, fontSize: '1.3rem' }}>No completed orders in the last 30 days</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category mix + Top sellers */}
      <div className="adm-2col">
        <div className="adm-card">
          <div className="adm-card-head"><h3>Category mix (GMV · 90d)</h3></div>
          {categoryMix.length === 0 ? (
            <div className="adm-empty">
              <i className="fa-solid fa-chart-pie" />
              <p>No category data yet</p>
            </div>
          ) : (
            <div className="adm-card-body" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <PieChart
                data={categoryMix.map((c, i) => ({ v: c.v || c.pct || 1, c: PIE_COLORS[i % PIE_COLORS.length] }))}
                size={180}
              />
              <div className="pie-legend" style={{ flex: 1 }}>
                {categoryMix.map((c, i) => (
                  <div className="row" key={c.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '1.3rem', color: 'var(--ink-2)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0, display: 'inline-block' }} />
                      {c.label}
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink)' }}>
                      {c.pct}%
                      <span style={{ fontWeight: 400, color: 'var(--ink-3)', marginLeft: 4 }}>· ₦{c.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="adm-card">
          <div className="adm-card-head"><h3>Top sellers (90d)</h3></div>
          <div className="adm-scroll-x">
            <table className="adm-table">
              <thead>
                <tr><th>#</th><th>Store</th><th>Orders</th><th>GMV</th></tr>
              </thead>
              <tbody>
                {topSellers.length === 0 ? (
                  <tr><td colSpan="4">
                    <div className="adm-empty"><i className="fa-solid fa-store" /><p>No seller data yet</p></div>
                  </td></tr>
                ) : topSellers.map((r, i) => (
                  <tr key={i}>
                    <td className="mono">{String(i + 1).padStart(2, '0')}</td>
                    <td style={{ fontWeight: 600 }}>{r[0]}</td>
                    <td className="amount">{(r[1] || 0).toLocaleString()}</td>
                    <td className="amount">₦{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
