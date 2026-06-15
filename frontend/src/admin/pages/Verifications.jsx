import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';

const STATUS_STYLE = {
  pending:  { bg: 'rgba(234,179,8,.15)',   color: '#ca8a04', label: 'Pending' },
  approved: { bg: 'rgba(34,197,94,.15)',   color: '#16a34a', label: 'Approved' },
  rejected: { bg: 'rgba(239,68,68,.15)',   color: '#dc2626', label: 'Rejected' },
  conflict: { bg: 'rgba(249,115,22,.15)',  color: '#ea580c', label: 'Conflict' },
};

function Avatar({ avatar, name, size = 36 }) {
  const url = typeof avatar === 'string' ? avatar : avatar?.url;
  const initial = (name || 'U')[0].toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink-3)' }}>
      {url ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
    </div>
  );
}

export default function Verifications() {
  const [requests, setRequests] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('pending');
  const [selected, setSelected] = useState(null);
  const [note, setNote]         = useState('');
  const [acting, setActing]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/api/admins/identity-verifications?status=${filter}&limit=50`)
      .then((d) => { setRequests(d.requests || []); setTotal(d.total || 0); })
      .catch(() => showToast('Failed to load requests', 'error'))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function approve(id) {
    setActing(true);
    try {
      await apiFetch(`/api/admins/identity-verifications/${id}/approve`, { method: 'POST', body: { note } });
      showToast('Request approved — user account unlocked');
      setSelected(null);
      setNote('');
      load();
    } catch (err) {
      showToast(err?.message || 'Failed to approve', 'error');
    } finally {
      setActing(false);
    }
  }

  async function reject(id) {
    if (!note.trim()) { showToast('Please add a rejection reason for the user', 'error'); return; }
    setActing(true);
    try {
      await apiFetch(`/api/admins/identity-verifications/${id}/reject`, { method: 'POST', body: { note } });
      showToast('Request rejected');
      setSelected(null);
      setNote('');
      load();
    } catch (err) {
      showToast(err?.message || 'Failed to reject', 'error');
    } finally {
      setActing(false);
    }
  }

  function selectRequest(id) {
    setSelected(id);
    setNote('');
    if (isMobile) window.scrollTo({ top: 0, behavior: 'instant' });
  }

  const sel = selected ? requests.find((r) => r._id === selected) : null;

  // On mobile: show detail view when something is selected, otherwise show list
  const showList   = !isMobile || !sel;
  const showDetail = !isMobile || !!sel;

  return (
    <div className="verif-layout">

      {/* ── Left: list ──────────────────────────────────────── */}
      {showList && (
        <div className="verif-list-panel">
          <div style={{ padding: isMobile ? '0 0 12px' : '20px 20px 12px', flexShrink: 0 }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 4px' }}>Identity Verifications</h2>
            <p style={{ fontSize: '1.2rem', color: 'var(--ink-3)', margin: '0 0 14px' }}>{total} total request{total !== 1 ? 's' : ''}</p>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 'var(--r-pill)', padding: 4, overflowX: 'auto' }}>
              {['pending', 'conflict', 'approved', 'rejected', 'all'].map((s) => (
                <button key={s} type="button"
                  onClick={() => { setFilter(s); setSelected(null); }}
                  style={{ flex: '1 0 auto', padding: '7px 10px', borderRadius: 'var(--r-pill)', fontSize: '1.1rem', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', background: filter === s ? 'var(--white)' : 'transparent', color: filter === s ? 'var(--ink-1)' : 'var(--ink-3)', boxShadow: filter === s ? '0 1px 6px rgba(0,0,0,.08)' : 'none', textTransform: 'capitalize', transition: 'all .15s', whiteSpace: 'nowrap' }}
                >{s}</button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', padding: '0 0 20px' }}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 68, borderRadius: 10, background: 'var(--surface)', marginBottom: 8, animation: 'pulse 1.4s ease-in-out infinite' }} />
              ))
            ) : requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: '1.3rem' }}>
                <i className="fa-solid fa-inbox" style={{ fontSize: '2.8rem', marginBottom: 10, display: 'block' }} />
                No {filter !== 'all' ? filter : ''} requests
              </div>
            ) : requests.map((r) => {
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
              const isActive = selected === r._id;
              return (
                <button key={r._id} type="button"
                  onClick={() => selectRequest(r._id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 10, border: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`, background: isActive ? 'rgba(249,115,22,.05)' : 'var(--white)', cursor: 'pointer', textAlign: 'left', marginBottom: 6, transition: 'border-color .12s' }}
                >
                  <Avatar avatar={r.user?.avatar} name={r.user?.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.user?.name || 'Unknown'}</div>
                    <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.matricNumber} · {r.institution}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                    {r.disputeReason && <div style={{ fontSize: '1rem', color: '#f97316', marginTop: 2, textAlign: 'right' }}><i className="fas fa-flag" /> Disputed</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Right: detail ───────────────────────────────────── */}
      {showDetail && (
        <div className="verif-detail-panel">
          {!sel ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, color: 'var(--ink-4)' }}>
              <i className="fa-solid fa-id-card" style={{ fontSize: '4rem' }} />
              <p style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0 }}>Select a request to review</p>
            </div>
          ) : (
            <>
              {/* Mobile back button */}
              {isMobile && (
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: '1.3rem', fontFamily: 'var(--font-sans)', padding: '0 0 16px', marginBottom: 4 }}
                >
                  <i className="fas fa-arrow-left" /> Back to list
                </button>
              )}

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
                <Avatar avatar={sel.user?.avatar} name={sel.user?.name} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel.user?.name}</div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel.user?.email}</div>
                </div>
                <span style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: '1.2rem', background: (STATUS_STYLE[sel.status] || STATUS_STYLE.pending).bg, color: (STATUS_STYLE[sel.status] || STATUS_STYLE.pending).color }}>
                  {(STATUS_STYLE[sel.status] || STATUS_STYLE.pending).label}
                </span>
              </div>

              {/* Identity fields */}
              <div className="verif-fields-grid">
                {[
                  { label: 'Institution',  value: sel.institution },
                  { label: 'Matric No.',   value: sel.matricNumber },
                  { label: 'First Name',   value: sel.firstName },
                  { label: 'Middle Name',  value: sel.middleName || '—' },
                  { label: 'Last Name',    value: sel.lastName },
                  { label: 'Department',   value: sel.department },
                  { label: 'Faculty',      value: sel.faculty },
                  { label: 'Submitted',    value: new Date(sel.createdAt).toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--r-md)' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--ink-1)' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Conflict notice */}
              {sel.conflictWith && (
                <div style={{ padding: '12px 14px', background: 'rgba(249,115,22,.1)', border: '1px solid rgba(249,115,22,.3)', borderRadius: 'var(--r-md)', marginBottom: 16, display: 'flex', gap: 10 }}>
                  <i className="fas fa-triangle-exclamation" style={{ color: '#f97316', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--ink-1)' }}>Conflicts with an existing verified account</div>
                    <div style={{ fontSize: '1.2rem', color: 'var(--ink-2)', marginTop: 3 }}>
                      {sel.conflictWith.name} ({sel.conflictWith.email}) already holds a verified verification for this matric number.
                    </div>
                  </div>
                </div>
              )}

              {/* Dispute text */}
              {sel.disputeReason && (
                <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 'var(--r-md)', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#ef4444', marginBottom: 4 }}><i className="fas fa-flag" style={{ marginRight: 6 }} />Dispute statement</div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--ink-2)', lineHeight: 1.5 }}>{sel.disputeReason}</div>
                </div>
              )}

              {/* Uploaded document */}
              {sel.documentUrl && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Uploaded Document</div>
                  <img src={sel.documentUrl} alt="School document"
                    style={{ width: '100%', maxHeight: 420, objectFit: 'contain', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer' }}
                    onClick={() => window.open(sel.documentUrl, '_blank', 'noopener')} />
                  <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)', marginTop: 6 }}>Tap image to open full size</div>
                </div>
              )}

              {/* Admin note + action buttons */}
              {(sel.status === 'pending' || sel.status === 'conflict') && (
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
                  <div className="label" style={{ marginBottom: 8 }}>Admin note (required for rejection, optional for approval)</div>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Add a note for the user…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ width: '100%', resize: 'none', marginBottom: 14 }}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-block" disabled={acting}
                      style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 'var(--r-pill)', fontWeight: 700, fontSize: '1.3rem', cursor: acting ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', height: 44 }}
                      onClick={() => reject(sel._id)}>
                      {acting ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-xmark" /> Reject</>}
                    </button>
                    <button className="btn btn-primary btn-block" disabled={acting}
                      style={{ flex: 1, borderRadius: 'var(--r-pill)', fontWeight: 700, fontSize: '1.3rem', height: 44 }}
                      onClick={() => approve(sel._id)}>
                      {acting ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> Approve</>}
                    </button>
                  </div>
                </div>
              )}

              {sel.adminNote && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--r-md)', fontSize: '1.2rem', color: 'var(--ink-2)' }}>
                  <strong>Admin note:</strong> {sel.adminNote}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#ef4444' : '#22c55e', color: '#fff', padding: '10px 20px', borderRadius: 'var(--r-pill)', fontSize: '1.3rem', fontWeight: 600, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
