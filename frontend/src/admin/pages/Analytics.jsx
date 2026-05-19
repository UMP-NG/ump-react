import { useState, useEffect } from 'react';
import { MiniStat } from '../components/StatCard';
import { LineChart, PieChart } from '../components/charts';
import { apiFetch } from '../../utils/api';

const PIE_COLORS = ['#f97316','#3b82f6','#22c55e','#8b5cf6','#ec4899','#94a3b8'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/admins/analytics')
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const gmvSeries = data?.gmvDaily || [];
  const categoryMix = data?.categoryMix || [];
  const topSellers = data?.topSellers || [];

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Analytics</h1>
          <p>GMV, fees, category &amp; cohort performance</p>
        </div>
        <div className="right">
          <button className="abtn ghost"><i className="fa-regular fa-calendar"></i> Last 90 days</button>
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button>
        </div>
      </div>

      <div className="adm-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <MiniStat label="GMV (90d)"         value={loading ? '—' : (data?.gmv90d || '—')}     icon="fa-naira-sign"    color="#f97316" />
        <MiniStat label="Platform fees"     value={loading ? '—' : (data?.fees90d || '—')}     icon="fa-percent"       color="#22c55e" />
        <MiniStat label="Avg order value"   value={loading ? '—' : (data?.avgOrder || '—')}   icon="fa-cart-shopping" color="#3b82f6" />
        <MiniStat label="Repeat buyer rate" value={loading ? '—' : (data?.repeatRate || '—')}   icon="fa-rotate"        color="#8b5cf6" />
      </div>

      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-head">
          <div>
            <h3>GMV &amp; Fees</h3>
            <div className="muted" style={{ fontSize: '1.2rem' }}>Daily · last 30 days</div>
          </div>
          <div className="chart-legend">
            <span className="l">GMV</span>
            <span className="l b">Platform fees</span>
          </div>
        </div>
        <div className="adm-card-body">
          <div className="chart-area" style={{ height: 260 }}>
            <LineChart data={gmvSeries} height={260} />
          </div>
        </div>
      </div>

      <div className="adm-2col">
        <div className="adm-card">
          <div className="adm-card-head"><h3>Category mix (GMV)</h3></div>
          {categoryMix.length === 0 ? (
            <div className="adm-empty"><i className="fa-solid fa-chart-pie"></i><p>No category data yet</p></div>
          ) : (
            <div className="adm-card-body" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <PieChart
                data={categoryMix.map((c, i) => ({ v: c.v || c.pct, c: PIE_COLORS[i] }))}
                size={180}
              />
              <div className="pie-legend" style={{ flex: 1 }}>
                {categoryMix.map((c, i) => (
                  <div className="row" key={c.label}>
                    <span className="lbl" style={{ '--c': PIE_COLORS[i] }}>{c.label}</span>
                    <span className="v">{c.pct}% · <span className="naira"></span>{c.value}</span>
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
                    <div className="adm-empty"><i className="fa-solid fa-store"></i><p>No seller data yet</p></div>
                  </td></tr>
                ) : topSellers.map((r, i) => (
                  <tr key={r[0]}>
                    <td className="mono">{String(i + 1).padStart(2, '0')}</td>
                    <td>{r[0]}</td>
                    <td className="amount">{(r[1] || 0).toLocaleString()}</td>
                    <td className="amount"><span className="naira"></span>{r[2]}</td>
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
