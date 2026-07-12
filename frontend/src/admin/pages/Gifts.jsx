import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';

const naira = n => `₦${Number(n || 0).toLocaleString()}`;

export default function Gifts() {
  const [gifts, setGifts]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchGifts = useCallback(() => {
    setLoading(true);
    setError('');
    apiFetch(`/api/wallet/admin/gifts?page=${page}&limit=20`)
      .then(d => { setGifts(d?.gifts || []); setTotal(d?.total || 0); })
      .catch(err => setError(err?.message || 'Failed to load gift history'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchGifts(); }, [fetchGifts]);

  const initials = name => name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U';

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Gifts</h1>
          <p>Every non-withdrawable gift credit issued to a user, across all admins</p>
        </div>
        <div className="right">
          <button className="abtn ghost" onClick={fetchGifts} disabled={loading} title="Refresh">
            <i className={`fa-solid fa-rotate-right${loading ? ' fa-spin' : ''}`}></i> Refresh
          </button>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Issued by</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="6">
                    <div className="adm-empty" style={{ color: '#dc2626' }}>
                      <i className="fa-solid fa-circle-exclamation"></i>
                      <p>{error}</p>
                      <button className="abtn ghost sm" style={{ marginTop: 8 }} onClick={fetchGifts}>
                        <i className="fa-solid fa-rotate-right" /> Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : gifts.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="adm-empty">
                      <i className="fa-solid fa-gift"></i>
                      <p>No gifts issued yet</p>
                    </div>
                  </td>
                </tr>
              ) : gifts.map((g, i) => (
                <tr key={g.reference || i}>
                  <td>
                    <div className="adm-row-user">
                      <div className="adm-av av-a">{initials(g.recipient?.name)}</div>
                      <div>
                        <div className="name">{g.recipient?.name || '—'}</div>
                        <div className="email">{g.recipient?.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="amount">{naira(g.amount)}</td>
                  <td className="muted">{g.description || '—'}</td>
                  <td className="muted">{g.issuedBy?.name || '—'}</td>
                  <td>
                    <span className={`pill dot ${g.status === 'completed' ? 'green' : g.status === 'pending' ? 'amber' : 'red'}`}>
                      {g.status || '—'}
                    </span>
                  </td>
                  <td className="muted">
                    {g.createdAt
                      ? new Date(g.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
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
              <button className="icon-action" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              {page > 1 && <button className="abtn sm ghost" onClick={() => setPage(page - 1)}>{page - 1}</button>}
              <button className="abtn sm dark">{page}</button>
              {page * 20 < total && <button className="abtn sm ghost" onClick={() => setPage(page + 1)}>{page + 1}</button>}
              <button className="icon-action" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
