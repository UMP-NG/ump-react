import { useState, useEffect } from 'react';
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
  const [submitting, setSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState('');

  useEffect(() => {
    apiFetch('/api/admins/disputes?status=open')
      .then(d => {
        const list = d?.disputes || d || [];
        setDisputes(list);
        if (list.length) setActive(list[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
          <button className="abtn ghost"><i className="fa-solid fa-book"></i> Resolution playbook</button>
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
    </>
  );
}
