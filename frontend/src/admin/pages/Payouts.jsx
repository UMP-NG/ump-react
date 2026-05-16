import { useState, useEffect, useCallback } from 'react';
import Thumb from '../components/Thumb';
import { MiniStat } from '../components/StatCard';
import { apiFetch } from '../../utils/api';

const TABS = [
  { label: 'Pending',    filter: 'pending' },
  { label: 'Processing', filter: 'processing' },
  { label: 'Paid',       filter: 'paid' },
  { label: 'Failed',     filter: 'failed' },
];
const RISK_COLOR = { Low: 'green', Medium: 'amber', High: 'red' };

export default function Payouts() {
  const [tab, setTab] = useState(0);
  const [payouts, setPayouts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [processing, setProcessing] = useState(null);

  const fetchPayouts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ status: TABS[tab].filter });
    Promise.all([
      apiFetch(`/api/admins/payouts?${params}`).catch(() => ({})),
      apiFetch('/api/admins/payouts/summary').catch(() => null),
    ]).then(([d, s]) => {
      setPayouts(d?.payouts || d || []);
      setSummary(s);
    }).finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  function toggleSelect(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function approvePayout(payoutId) {
    setProcessing(payoutId);
    await apiFetch(`/api/admins/payouts/${payoutId}/approve`, { method: 'POST' }).catch(() => null);
    setProcessing(null);
    fetchPayouts();
  }

  async function batchApprove() {
    const ids = [...selected];
    if (!ids.length) return;
    await Promise.all(ids.map(id => apiFetch(`/api/admins/payouts/${id}/approve`, { method: 'POST' }).catch(() => null)));
    setSelected(new Set());
    fetchPayouts();
  }

  const pendingCount = payouts.length;

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Payouts</h1>
          <p>Manage seller withdrawal requests</p>
        </div>
        <div className="right">
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button>
          {tab === 0 && pendingCount > 0 && (
            <button className="abtn primary" onClick={batchApprove}>
              <i className="fa-solid fa-bolt"></i> Batch approve ({selected.size || pendingCount})
            </button>
          )}
        </div>
      </div>

      <div className="adm-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <MiniStat label="Pending"         value={summary?.pendingValue ?? '₦—'}    icon="fa-hourglass"          color="#eab308" />
        <MiniStat label="Approved today"  value={summary?.approvedToday ?? '₦—'}   icon="fa-check"              color="#22c55e" />
        <MiniStat label="Paid this month" value={summary?.paidThisMonth ?? '₦—'}   icon="fa-money-bill-transfer" color="#3b82f6" />
        <MiniStat label="Wallet float"    value={summary?.walletFloat ?? '₦—'}     icon="fa-wallet"             color="#8b5cf6" />
      </div>

      <div className="adm-filterbar">
        <div className="adm-tabs">
          {TABS.map((t, i) => (
            <button key={t.label} className={`tab${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>
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
                <th style={{ width: 32 }}>
                  <span
                    className={`adm-checkbox${selected.size === payouts.length && payouts.length > 0 ? ' checked' : ''}`}
                    onClick={() => setSelected(selected.size === payouts.length ? new Set() : new Set(payouts.map(p => p._id)))}
                  ></span>
                </th>
                <th>Seller</th><th>Bank account</th><th>Available</th>
                <th>Requested</th><th>Net (after fee)</th><th>Requested at</th><th>Risk</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : payouts.length === 0 ? (
                <tr><td colSpan="9">
                  <div className="adm-empty"><i className="fa-solid fa-money-bill-transfer"></i><p>No payouts found</p></div>
                </td></tr>
              ) : payouts.map(p => {
                const risk = p.riskLevel || 'Low';
                const fee = 0.032;
                const net = p.requestedAmount ? Math.floor(p.requestedAmount * (1 - fee)) : p.netAmount;
                return (
                  <tr key={p._id}>
                    <td><span className={`adm-checkbox${selected.has(p._id) ? ' checked' : ''}`} onClick={() => toggleSelect(p._id)}></span></td>
                    <td>
                      <div className="adm-row-user">
                        <Thumb kind="electronics" label={(p.seller?.storeName || 'S').slice(0, 2)} />
                        <div>
                          <div className="name">{p.seller?.storeName || '—'}</div>
                          <div className="email">{p.seller?.ownerName || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '1.25rem' }}>{p.bankName || '—'}</div>
                      <div className="mono muted" style={{ fontSize: '1.1rem' }}>{p.accountNumber ? p.accountNumber.replace(/\d(?=\d{4})/g, '•') : '—'}</div>
                    </td>
                    <td className="amount"><span className="naira"></span>{(p.availableBalance || 0).toLocaleString()}</td>
                    <td className="amount"><span className="naira"></span>{(p.requestedAmount || 0).toLocaleString()}</td>
                    <td className="amount"><span className="naira"></span>{(net || 0).toLocaleString()}</td>
                    <td className="muted">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td><span className={`pill ${RISK_COLOR[risk] || 'gray'}`}>{risk}</span></td>
                    <td>
                      {TABS[tab].filter === 'pending' && (
                        <button
                          className="abtn primary sm"
                          disabled={processing === p._id}
                          onClick={() => approvePayout(p._id)}
                        >
                          {processing === p._id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Approve'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
