import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';

export default function Feedback() {
  const [feedback, setFeedback] = useState([]);
  const [total, setTotal]       = useState(0);
  const [counts, setCounts]     = useState({});
  const [status, setStatus]     = useState('');
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const fetchFeedback = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page, limit: 20 });
    if (status) params.set('status', status);
    apiFetch(`/api/admins/feedback?${params}`)
      .then(d => { setFeedback(d?.feedback || []); setTotal(d?.total || 0); setCounts(d?.counts || {}); })
      .catch(err => setError(err?.message || 'Failed to load feedback'))
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  async function markReviewed(id) {
    // Re-fetch the current filtered/paginated view instead of patching the
    // item in place — an optimistic in-place update would leave a
    // now-reviewed item sitting in the "New" tab (it no longer matches that
    // filter) and would leave the per-status tab counts stale.
    await apiFetch(`/api/admins/feedback/${id}/review`, { method: 'POST' }).catch(() => {});
    fetchFeedback();
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Demand Feedback</h1>
          <p>What shoppers couldn't find while browsing — use it to guide what to source next</p>
        </div>
        <div className="right">
          <button className="abtn ghost" onClick={fetchFeedback} disabled={loading} title="Refresh">
            <i className={`fa-solid fa-rotate-right${loading ? ' fa-spin' : ''}`}></i> Refresh
          </button>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head" style={{ display: 'flex', gap: 8 }}>
          {['', 'new', 'reviewed'].map(s => (
            <button
              key={s || 'all'}
              className={`abtn sm ${status === s ? 'dark' : 'ghost'}`}
              onClick={() => { setStatus(s); setPage(1); }}
            >
              {s === '' ? `All` : s === 'new' ? `New (${counts.new || 0})` : `Reviewed (${counts.reviewed || 0})`}
            </button>
          ))}
        </div>
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Message</th>
                <th>Reason</th>
                <th>Page</th>
                <th>User</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="7">
                    <div className="adm-empty" style={{ color: '#dc2626' }}>
                      <i className="fa-solid fa-circle-exclamation"></i>
                      <p>{error}</p>
                      <button className="abtn ghost sm" style={{ marginTop: 8 }} onClick={fetchFeedback}>
                        <i className="fa-solid fa-rotate-right" /> Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : feedback.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="adm-empty">
                      <i className="fa-solid fa-comment-dots"></i>
                      <p>No feedback submitted yet</p>
                    </div>
                  </td>
                </tr>
              ) : feedback.map((f) => (
                <tr key={f._id}>
                  <td style={{ maxWidth: 320 }}>{f.message}</td>
                  <td className="muted">{f.reason || '—'}</td>
                  <td className="muted">{f.context || '—'}{f.searchQuery ? ` · "${f.searchQuery}"` : ''}</td>
                  <td className="muted">{f.user?.name || 'Guest'}</td>
                  <td>
                    <span className={`pill dot ${f.status === 'reviewed' ? 'green' : 'amber'}`}>{f.status}</span>
                  </td>
                  <td className="muted">
                    {f.createdAt
                      ? new Date(f.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td>
                    {f.status !== 'reviewed' && (
                      <button className="abtn ghost sm" onClick={() => markReviewed(f._id)}>
                        <i className="fa-solid fa-check" /> Mark reviewed
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 20 && (
          <div className="adm-pagination">
            <span>Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total.toLocaleString()}</span>
            <div className="pages">
              <button className="icon-action" aria-label="Previous page" disabled={loading || page === 1} onClick={() => setPage(p => p - 1)}>
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              {page > 1 && <button className="abtn sm ghost" disabled={loading} onClick={() => setPage(page - 1)}>{page - 1}</button>}
              <button className="abtn sm dark">{page}</button>
              {page * 20 < total && <button className="abtn sm ghost" disabled={loading} onClick={() => setPage(page + 1)}>{page + 1}</button>}
              <button className="icon-action" aria-label="Next page" disabled={loading || page * 20 >= total} onClick={() => setPage(p => p + 1)}>
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
