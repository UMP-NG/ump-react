import { useState, useEffect, useCallback } from 'react';
import Thumb from '../components/Thumb';
import { MiniStat } from '../components/StatCard';
import { apiFetch } from '../../utils/api';
import { useAppConfig } from '../../context/AppConfigContext';

const TABS = [
  { label: 'Pending',    filter: 'pending' },
  { label: 'Processing', filter: 'processing' },
  { label: 'Completed',  filter: 'completed' },   // model uses 'completed' not 'paid'
  { label: 'Failed',     filter: 'failed' },
];
const RISK_COLOR   = { Low: 'green', Medium: 'amber', High: 'red' };
const STATUS_COLOR = { pending: 'amber', processing: 'blue', completed: 'green', failed: 'red' };

export default function Payouts() {
  const { fees } = useAppConfig();
  const platformFeePct = parseFloat(fees?.platformFee ?? 3.2) / 100;

  const [tab, setTab]                 = useState(0);
  const [payouts, setPayouts]         = useState([]);
  const [summary, setSummary]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(new Set());
  const [processing, setProcessing]   = useState(null);
  const [markingPaid, setMarkingPaid] = useState(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [drawer, setDrawer]           = useState(null);
  const [actionError, setActionError] = useState('');

  const fetchPayouts = useCallback(() => {
    setLoading(true);
    setActionError('');
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
    setActionError('');
    try {
      await apiFetch(`/api/admins/payouts/${payoutId}/approve`, { method: 'POST' });
    } catch (err) {
      setActionError(err?.message || 'Failed to approve payout — please try again.');
    } finally {
      setProcessing(null);
      fetchPayouts();
    }
  }

  async function markAsPaid(payoutId) {
    setMarkingPaid(payoutId);
    setActionError('');
    try {
      await apiFetch(`/api/admins/payouts/${payoutId}/mark-paid`, { method: 'POST' });
    } catch (err) {
      setActionError(err?.message || 'Failed to mark payout as paid — please try again.');
    } finally {
      setMarkingPaid(null);
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

  const isPendingTab    = TABS[tab].filter === 'pending';
  const isProcessingTab = TABS[tab].filter === 'processing';
  const pageCount = payouts.length;
  const allSelected  = payouts.length > 0 && selected.size === payouts.length;

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Payouts</h1>
          <p>Manage seller withdrawal requests</p>
        </div>
        <div className="right">
          <button className="abtn ghost" onClick={fetchPayouts} disabled={loading} title="Refresh">
            <i className={`fa-solid fa-rotate-right${loading ? ' fa-spin' : ''}`}></i> Refresh
          </button>
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button>
          {isPendingTab && pageCount > 0 && (
            <button className="abtn primary" disabled={batchProcessing} onClick={batchApprove}>
              {batchProcessing
                ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Processing…</>
                : <><i className="fa-solid fa-bolt"></i> {selected.size > 0 ? `Approve selected (${selected.size})` : `Approve all (${pageCount})`}</>
              }
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div style={{ margin: '0 0 12px', padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.1)', color: '#ef4444', fontSize: '1.25rem', border: '1px solid rgba(239,68,68,.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-circle-exclamation" />
          {actionError}
        </div>
      )}

      <div className="adm-stats adm-stats-4">
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
                <th>Requested</th><th>Net (after {fees?.platformFee ?? 3.2}%)</th><th>Status</th><th>Requested at</th><th>Risk</th><th></th>
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
                const net  = p.netAmount ?? (p.requestedAmount ? Math.floor(p.requestedAmount * (1 - platformFeePct)) : 0);
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
                      <div className="mono muted" style={{ fontSize: '1.1rem' }}>{p.accountNumber || '—'}</div>
                      {p.accountName && <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)' }}>{p.accountName}</div>}
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
                      ) : isProcessingTab ? (
                        <button
                          className="abtn success sm"
                          disabled={markingPaid === p._id}
                          onClick={() => markAsPaid(p._id)}
                        >
                          {markingPaid === p._id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Mark as Paid'}
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

      {drawer && <PayoutDrawer payout={drawer} onClose={() => setDrawer(null)} onApprove={isPendingTab ? approvePayout : null} onMarkPaid={isProcessingTab ? markAsPaid : null} processing={processing} markingPaid={markingPaid} />}
    </>
  );
}

function PayoutDrawer({ payout, onClose, onApprove, onMarkPaid, processing, markingPaid }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

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
            <span className="k">Account name</span><span className="v">{payout.accountName || '—'}</span>
            <span className="k">Account no.</span>
            <span className="v mono" style={{ userSelect: 'all', letterSpacing: '0.05em' }}>{payout.accountNumber || '—'}</span>
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
              onClick={async () => { await onApprove(payout._id); onClose(); }}
            >
              {processing === payout._id
                ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Approving…</>
                : <><i className="fa-solid fa-check"></i> Approve payout</>}
            </button>
          </div>
        )}
        {onMarkPaid && payout.status === 'processing' && (
          <div className="adm-drawer-foot" style={{ flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '1.2rem', color: 'var(--ink-2)', padding: '8px 10px', background: 'rgba(59,130,246,.08)', borderRadius: 8, border: '1px solid rgba(59,130,246,.2)' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Manual bank transfer checklist</div>
              <div>Amount: <strong>₦{(payout.netAmount || payout.requestedAmount || 0).toLocaleString()}</strong></div>
              <div>Bank: <strong>{payout.bankName || '—'}</strong></div>
              <div>Account name: <strong>{payout.accountName || '—'}</strong></div>
              <div>Account number: <strong style={{ letterSpacing: '0.08em', userSelect: 'all' }}>{payout.accountNumber || '—'}</strong></div>
              <div style={{ marginTop: 6, color: 'var(--ink-3)' }}>Once the transfer is sent, click "Mark as Paid" to notify the seller and close this request.</div>
            </div>
            <button
              className="abtn success"
              style={{ flex: 1 }}
              disabled={markingPaid === payout._id}
              onClick={async () => { await onMarkPaid(payout._id); onClose(); }}
            >
              {markingPaid === payout._id
                ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Marking…</>
                : <><i className="fa-solid fa-money-bill-transfer"></i> Mark as Paid</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
