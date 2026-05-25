import { useState, useEffect, useCallback } from 'react';
import Thumb from '../components/Thumb';
import { MiniStat } from '../components/StatCard';
import { apiFetch } from '../../utils/api';

const TABS = [
  { label: 'Pending',    filter: 'pending' },
  { label: 'Processing', filter: 'processing' },
  { label: 'Completed',  filter: 'completed' },   // model uses 'completed' not 'paid'
  { label: 'Failed',     filter: 'failed' },
];
const RISK_COLOR   = { Low: 'green', Medium: 'amber', High: 'red' };
const STATUS_COLOR = { pending: 'amber', processing: 'blue', completed: 'green', failed: 'red' };

export default function Payouts() {
  const [tab, setTab]                 = useState(0);
  const [payouts, setPayouts]         = useState([]);
  const [summary, setSummary]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(new Set());
  const [processing, setProcessing]   = useState(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [drawer, setDrawer]           = useState(null);

  const fetchPayouts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ status: TABS[tab].filter });
    Promise.all([
      apiFetch(`/api/admins/payouts?${params}`).catch(() => ({})),
      apiFetch('/api/admins/payouts/summary').catch(() => null),
    ]).then(([d, s]) => {
      setPayouts(d?.payouts || d || []);
      setSummary(s);
      setSelected(new Set()); // clear selection on tab change
    }).finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  function toggleSelect(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function approvePayout(payoutId) {
    setProcessing(payoutId);
    try {
      await apiFetch(`/api/admins/payouts/${payoutId}/approve`, { method: 'POST' });
    } catch {
      // refresh on error to stay consistent
    } finally {
      setProcessing(null);
      fetchPayouts();
    }
  }

  async function batchApprove() {
    const ids = selected.size > 0 ? [...selected] : payouts.map(p => p._id);
    if (!ids.length) return;
    setBatchProcessing(true);
    for (const id of ids) {
      await apiFetch(`/api/admins/payouts/${id}/approve`, { method: 'POST' }).catch(() => null);
    }
    setBatchProcessing(false);
    setSelected(new Set());
    fetchPayouts();
  }

  const isPendingTab = TABS[tab].filter === 'pending';
  const pendingCount = payouts.length;
  const allSelected  = payouts.length > 0 && selected.size === payouts.length;

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Payouts</h1>
          <p>Manage seller withdrawal requests</p>
        </div>
        <div className="right">
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button>
          {isPendingTab && pendingCount > 0 && (
            <button className="abtn primary" disabled={batchProcessing} onClick={batchApprove}>
              {batchProcessing
                ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Processing…</>
                : <><i className="fa-solid fa-bolt"></i> {selected.size > 0 ? `Approve selected (${selected.size})` : `Approve all (${pendingCount})`}</>
              }
            </button>
          )}
        </div>
      </div>

      <div className="adm-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <MiniStat label="Pending value"  value={summary?.pendingValue  ?? '₦—'} icon="fa-hourglass"           color="#eab308" />
        <MiniStat label="Approved today" value={summary?.approvedToday ?? '₦—'} icon="fa-check"               color="#22c55e" />
        <MiniStat label="Paid this month" value={summary?.paidThisMonth ?? '₦—'} icon="fa-money-bill-transfer" color="#3b82f6" />
        <MiniStat label="Wallet float"   value={summary?.walletFloat   ?? '₦—'} icon="fa-wallet"              color="#8b5cf6" />
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
                {isPendingTab && (
                  <th style={{ width: 32 }}>
                    <span
                      className={`adm-checkbox${allSelected ? ' checked' : ''}`}
                      onClick={() => setSelected(allSelected ? new Set() : new Set(payouts.map(p => p._id)))}
                    ></span>
                  </th>
                )}
                <th>Seller</th><th>Bank account</th><th>Available bal.</th>
                <th>Requested</th><th>Net (after 3.2%)</th><th>Status</th><th>Requested at</th><th>Risk</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isPendingTab ? 10 : 9} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : payouts.length === 0 ? (
                <tr><td colSpan={isPendingTab ? 10 : 9}>
                  <div className="adm-empty"><i className="fa-solid fa-money-bill-transfer"></i><p>No {TABS[tab].label.toLowerCase()} payouts</p></div>
                </td></tr>
              ) : payouts.map(p => {
                const risk = p.riskLevel || 'Low';
                const net  = p.netAmount ?? (p.requestedAmount ? Math.floor(p.requestedAmount * 0.968) : 0);
                return (
                  <tr key={p._id} onClick={() => setDrawer(p)} style={{ cursor: 'pointer' }}>
                    {isPendingTab && (
                      <td onClick={e => e.stopPropagation()}>
                        <span className={`adm-checkbox${selected.has(p._id) ? ' checked' : ''}`} onClick={() => toggleSelect(p._id)}></span>
                      </td>
                    )}
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
                      <div className="mono muted" style={{ fontSize: '1.1rem' }}>
                        {p.accountNumber ? p.accountNumber.replace(/\d(?=\d{4})/g, '•') : '—'}
                      </div>
                    </td>
                    <td className="amount"><span className="naira"></span>{(p.availableBalance || 0).toLocaleString()}</td>
                    <td className="amount"><span className="naira"></span>{(p.requestedAmount || 0).toLocaleString()}</td>
                    <td className="amount"><span className="naira"></span>{(net || 0).toLocaleString()}</td>
                    <td><span className={`pill dot ${STATUS_COLOR[p.status] || 'gray'}`}>{p.status}</span></td>
                    <td className="muted">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td><span className={`pill ${RISK_COLOR[risk] || 'gray'}`}>{risk}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      {isPendingTab ? (
                        <button
                          className="abtn primary sm"
                          disabled={processing === p._id}
                          onClick={() => approvePayout(p._id)}
                        >
                          {processing === p._id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Approve'}
                        </button>
                      ) : (
                        <button className="icon-action" onClick={() => setDrawer(p)}>
                          <i className="fa-solid fa-eye"></i>
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

      {drawer && <PayoutDrawer payout={drawer} onClose={() => setDrawer(null)} onApprove={isPendingTab ? approvePayout : null} processing={processing} />}
    </>
  );
}

function PayoutDrawer({ payout, onClose, onApprove, processing }) {
  return (
    <div className="adm-drawer-shell" onClick={onClose}>
      <div className="adm-drawer" onClick={e => e.stopPropagation()}>

        <div className="adm-drawer-head">
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{payout.seller?.storeName || '—'}</div>
            <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', marginTop: 2 }}>{payout.seller?.ownerName || '—'}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="adm-drawer-body">
          <div className="kpi-strip">
            <div className="kpi">
              <div className="l">Requested</div>
              <div className="v"><span className="naira"></span>{(payout.requestedAmount || 0).toLocaleString()}</div>
            </div>
            <div className="kpi">
              <div className="l">Net amount</div>
              <div className="v"><span className="naira"></span>{(payout.netAmount || 0).toLocaleString()}</div>
            </div>
            <div className="kpi">
              <div className="l">Risk</div>
              <div className="v">
                <span className={`pill ${RISK_COLOR[payout.riskLevel || 'Low'] || 'gray'}`}>{payout.riskLevel || 'Low'}</span>
              </div>
            </div>
          </div>

          <div className="adm-section-h">Status</div>
          <div style={{ marginBottom: 8 }}>
            <span className={`pill dot ${STATUS_COLOR[payout.status] || 'gray'}`}>{payout.status}</span>
          </div>

          <div className="adm-section-h">Bank details</div>
          <div className="adm-kv">
            <span className="k">Bank</span><span className="v">{payout.bankName || '—'}</span>
            <span className="k">Account</span>
            <span className="v mono">{payout.accountNumber || '—'}</span>
            <span className="k">Available bal.</span>
            <span className="v"><span className="naira"></span>{(payout.availableBalance || 0).toLocaleString()}</span>
          </div>

          <div className="adm-section-h">Timeline</div>
          <div className="adm-kv">
            <span className="k">Requested</span>
            <span className="v">{payout.createdAt ? new Date(payout.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
          </div>
        </div>

        {onApprove && payout.status === 'pending' && (
          <div className="adm-drawer-foot">
            <button
              className="abtn success"
              style={{ flex: 1 }}
              disabled={processing === payout._id}
              onClick={() => { onApprove(payout._id); onClose(); }}
            >
              {processing === payout._id
                ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Approving…</>
                : <><i className="fa-solid fa-check"></i> Approve payout</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
