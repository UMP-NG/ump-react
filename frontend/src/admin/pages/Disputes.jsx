import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';

const SLA_COLOR = sla => {
  if (!sla) return 'gray';
  const h = parseFloat(sla);
  if (h <= 4) return 'red';
  if (h <= 24) return 'amber';
  return 'green';
};

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState('Refund buyer in full');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [showPlaybook, setShowPlaybook] = useState(false);

  const fetchDisputes = useCallback(() => {
    setLoading(true);
    apiFetch('/api/admins/disputes?status=open')
      .then(d => {
        const list = d?.disputes || d || [];
        setDisputes(list);
        if (list.length) setActive(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  async function resolve() {
    if (!active) return;
    setSubmitting(true);
    setResolveError('');
    try {
      await apiFetch(`/api/admins/disputes/${active._id}/resolve`, {
        method: 'POST',
        body: { outcome, note },
      });
      const updated = disputes.filter(d => d._id !== active._id);
      setDisputes(updated);
      setActive(updated[0] || null);
      setNote('');
      setOutcome('Refund buyer in full');
    } catch (err) {
      setResolveError(err?.message || 'Failed to resolve dispute. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Disputes</h1>
          <p>{disputes.length} open dispute{disputes.length !== 1 ? 's' : ''} need admin resolution</p>
        </div>
        <div className="right">
          <button className="abtn ghost" onClick={fetchDisputes} disabled={loading} title="Refresh">
            <i className={`fa-solid fa-rotate-right${loading ? ' fa-spin' : ''}`}></i> Refresh
          </button>
          <button className="abtn ghost" onClick={() => setShowPlaybook(true)}><i className="fa-solid fa-book"></i> Resolution playbook</button>
        </div>
      </div>

      <div className="adm-2col-asym">
        <div className="adm-card">
          <div className="adm-card-head"><h3>Open disputes</h3></div>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            </div>
          ) : disputes.length === 0 ? (
            <div className="adm-empty"><i className="fa-solid fa-scale-balanced"></i><p>No open disputes</p></div>
          ) : (
            <div className="adm-scroll-x">
              <table className="adm-table">
                <thead>
                  <tr><th>Case</th><th>Order</th><th>Reason</th><th>Filed by</th><th>Opened</th><th>SLA</th></tr>
                </thead>
                <tbody>
                  {disputes.map(d => (
                    <tr
                      key={d._id}
                      style={{ cursor: 'pointer', background: active?._id === d._id ? '#fff7ed' : undefined }}
                      onClick={() => setActive(d)}
                    >
                      <td className="mono">{d.caseRef || `D-${d._id ? d._id.slice(-4) : '???'}`}</td>
                      <td className="mono">{d.order?.orderRef || d.orderId?.toString().slice(-6)}</td>
                      <td>{d.reason}</td>
                      <td>
                        <div className="adm-row-user">
                          <div className="adm-av av-f" style={{ width: 26, height: 26, fontSize: '1rem' }}>
                            {(d.filedBy?.name || 'U')[0]}
                          </div>
                          <span style={{ fontSize: '1.25rem' }}>{d.filedBy?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="muted">{d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                      <td><span className={`pill ${SLA_COLOR(d.slaHours)}`}>{d.slaLabel || `${d.slaHours ?? '?'}h left`}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="adm-card">
          {active ? (
            <>
              <div className="adm-card-head">
                <div>
                  <h3>Case {active.caseRef || `D-${active._id?.slice(-4)}`}</h3>
                  <div className="muted" style={{ fontSize: '1.2rem', marginTop: 2 }}>
                    {active.productName} · <span className="naira"></span>{(active.amount || 0).toLocaleString()}
                  </div>
                </div>
                <span className={`pill ${SLA_COLOR(active.slaHours)}`}>
                  Open · {active.slaLabel || `${active.slaHours ?? '?'}h SLA`}
                </span>
              </div>

              <div className="adm-card-body" style={{ maxHeight: 540, overflowY: 'auto' }}>
                <div className="adm-section-h" style={{ marginTop: 0 }}>Conversation</div>
                {(active.messages || []).map((m, i) => (
                  <div key={i} className={`dispute-msg ${m.role}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="who">{m.authorName} · {m.roleLabel}</span>
                      <span className="when">{m.time || ''}</span>
                    </div>
                    <p>{m.text}</p>
                  </div>
                ))}
                {(!active.messages?.length) && (
                  <div className="muted" style={{ fontSize: '1.3rem', padding: '8px 0' }}>No messages yet.</div>
                )}

                <div className="adm-section-h">Resolve</div>
                <div className="adm-form-grid">
                  <div className="adm-field full">
                    <label className="lbl">Outcome</label>
                    <select value={outcome} onChange={e => setOutcome(e.target.value)}>
                      <option>Refund buyer in full</option>
                      <option>Refund 50%</option>
                      <option>Seller credit</option>
                      <option>Reject claim</option>
                    </select>
                  </div>
                  <div className="adm-field full">
                    <label className="lbl">Internal note</label>
                    <textarea
                      placeholder="Why this outcome…"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                {resolveError && (
                  <div style={{ color: '#ef4444', fontSize: '1.2rem', marginTop: 8, padding: '8px 12px', background: '#fef2f2', borderRadius: 8 }}>
                    <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }}></i>{resolveError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="abtn ghost" style={{ flex: 1 }}>Save draft</button>
                  <button
                    className="abtn primary"
                    style={{ flex: 1.4 }}
                    disabled={submitting}
                    onClick={resolve}
                  >
                    {submitting
                      ? <i className="fa-solid fa-circle-notch fa-spin"></i>
                      : <><i className="fa-solid fa-gavel"></i> Resolve &amp; notify both parties</>
                    }
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="adm-empty" style={{ padding: 60 }}>
              <i className="fa-solid fa-scale-balanced"></i>
              <p>Select a dispute to review</p>
            </div>
          )}
        </div>
      </div>

      {showPlaybook && <PlaybookModal onClose={() => setShowPlaybook(false)} />}
    </>
  );
}

const PLAYBOOK = [
  {
    outcome: 'Refund buyer in full',
    icon: 'fa-rotate-left',
    color: '#ef4444',
    bg: '#fef2f2',
    border: 'rgba(239,68,68,.2)',
    when: [
      'Item was never received and tracking confirms non-delivery',
      'Item is significantly not as described (wrong product, major defect)',
      'Seller has not responded within 48 hours of the dispute being opened',
    ],
    steps: [
      'Verify the buyer\'s claim with any chat history or photos provided',
      'Check order tracking / delivery confirmation',
      'Contact seller via DM to get their side before deciding',
      'Select "Refund buyer in full" and add your internal note',
    ],
    result: 'Order status → Cancelled. Escrow funds returned to buyer.',
  },
  {
    outcome: 'Refund 50%',
    icon: 'fa-scale-balanced',
    color: '#f59e0b',
    bg: '#fffbeb',
    border: 'rgba(245,158,11,.2)',
    when: [
      'Item received but partially as described (minor defects, missing accessories)',
      'Both parties share some responsibility for the issue',
      'Buyer contributed to the problem (late collection, incorrect address)',
    ],
    steps: [
      'Review evidence from both buyer and seller',
      'Determine fair split based on fault percentage',
      'Document your reasoning clearly in the internal note',
      'Select "Refund 50%" — both parties get notified',
    ],
    result: 'Order status → Cancelled. Half of escrow returned to buyer; half released to seller.',
  },
  {
    outcome: 'Seller credit',
    icon: 'fa-store',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: 'rgba(59,130,246,.2)',
    when: [
      'Delivery was successful but buyer has a minor complaint',
      'Issue is cosmetic or does not substantially affect function',
      'Buyer\'s claim appears exaggerated or in bad faith',
    ],
    steps: [
      'Confirm delivery was completed (delivery code used or tracking delivered)',
      'Review buyer complaint — is it substantive or trivial?',
      'If seller fulfilled their obligation, choose this outcome',
      'Add a note explaining why the seller was credited',
    ],
    result: 'Order status → Completed. Full escrow released to seller.',
  },
  {
    outcome: 'Reject claim',
    icon: 'fa-ban',
    color: '#6b7280',
    bg: '#f9fafb',
    border: 'rgba(107,114,128,.2)',
    when: [
      'Dispute was filed after the 7-day dispute window',
      'Claim is clearly fraudulent or made in bad faith',
      'Buyer already confirmed delivery and is now disputing without new evidence',
    ],
    steps: [
      'Verify the timeline — when was the dispute filed vs. delivery date?',
      'Check if buyer previously confirmed receipt',
      'Look for patterns — has this buyer raised multiple disputes?',
      'Select "Reject claim" and document the reason thoroughly',
    ],
    result: 'Order status → Completed. Escrow released to seller. Buyer notified of rejection.',
  },
];

function PlaybookModal({ onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--paper)', borderRadius: 16, width: '100%', maxWidth: 720, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <i className="fa-solid fa-book" style={{ color: 'var(--accent)', fontSize: '1.5rem' }}></i>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Dispute Resolution Playbook</h2>
            </div>
            <p style={{ margin: 0, fontSize: '1.2rem', color: 'var(--ink-3)' }}>
              Use this guide to choose the right outcome for each dispute. Always document your reasoning in the internal note.
            </p>
          </div>
          <button className="icon-btn" style={{ flexShrink: 0, marginLeft: 12 }} onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* General principles */}
        <div style={{ padding: '16px 24px', background: 'rgba(59,130,246,.04)', borderBottom: '1px solid var(--line)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { icon: 'fa-clock', label: '48h SLA', desc: 'Resolve all open disputes within 48 hours of opening' },
            { icon: 'fa-comments', label: 'Hear both sides', desc: 'Message seller and buyer before deciding' },
            { icon: 'fa-file-lines', label: 'Document always', desc: 'Every resolution must have an internal note' },
          ].map(p => (
            <div key={p.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: '1 1 180px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fa-solid ${p.icon}`} style={{ color: '#3b82f6', fontSize: '1rem' }}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--ink-1)' }}>{p.label}</div>
                <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)', lineHeight: 1.4 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Outcomes */}
        <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PLAYBOOK.map(p => (
            <div key={p.outcome} style={{ border: `1px solid ${p.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {/* Outcome header */}
              <div style={{ padding: '12px 16px', background: p.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fa-solid ${p.icon}`} style={{ color: '#fff', fontSize: '1rem' }}></i>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.4rem', color: p.color }}>{p.outcome}</div>
              </div>

              <div style={{ padding: '14px 16px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {/* When to use */}
                <div style={{ flex: '1 1 220px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>When to use</div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {p.when.map((w, i) => (
                      <li key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: '1.2rem', color: 'var(--ink-2)', lineHeight: 1.4 }}>
                        <i className="fa-solid fa-check" style={{ color: p.color, fontSize: '0.9rem', marginTop: 3, flexShrink: 0 }}></i>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Steps */}
                <div style={{ flex: '1 1 220px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Steps</div>
                  <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5, counterReset: 'step' }}>
                    {p.steps.map((s, i) => (
                      <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '1.2rem', color: 'var(--ink-2)', lineHeight: 1.4 }}>
                        <span style={{ minWidth: 20, height: 20, borderRadius: '50%', background: 'var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: 'var(--ink-3)', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Result */}
              <div style={{ padding: '8px 16px 12px', borderTop: `1px solid ${p.border}`, background: p.bg }}>
                <span style={{ fontSize: '1.15rem', color: p.color, fontWeight: 600 }}>
                  <i className="fa-solid fa-arrow-right" style={{ marginRight: 6 }}></i>{p.result}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
