import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';

const TABS = [
  { label: 'All',      filter: '' },
  { label: 'Products', filter: 'Product' },
  { label: 'Listings', filter: 'Listing' },
  { label: 'Services', filter: 'Service' },
];
const TYPE_COLOR = { Product: 'blue', Listing: 'purple', Service: 'green' };

function Stars({ rating, size = '1.25rem' }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <i key={s} className={`fa${s <= rating ? 's' : 'r'} fa-star`}
          style={{ fontSize: size, color: s <= rating ? '#f59e0b' : 'var(--ink-4)' }} />
      ))}
    </span>
  );
}

export default function Reviews() {
  const [tab, setTab]         = useState(0);
  const [reviews, setReviews] = useState([]);
  const [total, setTotal]     = useState(0);
  const [avgRating, setAvg]   = useState(0);
  const [starMap, setStarMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [drawer, setDrawer]   = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchReviews = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (TABS[tab].filter)  params.set('type', TABS[tab].filter);
    if (search)            params.set('q', search);
    if (ratingFilter)      params.set('rating', ratingFilter);
    apiFetch(`/api/admins/reviews?${params}`)
      .then(d => {
        setReviews(d?.reviews || []);
        setTotal(d?.total || 0);
        setAvg(d?.avgRating || 0);
        setStarMap(d?.starMap || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, page, search, ratingFilter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  async function deleteReview(id) {
    if (!confirm('Delete this review permanently?')) return;
    setDeleting(id);
    await apiFetch(`/api/admins/reviews/${id}`, { method: 'DELETE' }).catch(() => null);
    setDeleting(null);
    if (drawer?._id === id) setDrawer(null);
    fetchReviews();
  }

  const totalReviews = Object.values(starMap).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Reviews</h1>
          <p>{total.toLocaleString()} review{total !== 1 ? 's' : ''} · avg {avgRating || '—'} ★</p>
        </div>
      </div>

      {/* Star distribution */}
      {totalReviews > 0 && (
        <div className="adm-card" style={{ marginBottom: 16 }}>
          <div className="adm-card-body" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '3.2rem', fontWeight: 900, lineHeight: 1, color: 'var(--ink-1)' }}>{avgRating}</div>
              <Stars rating={Math.round(avgRating)} size="1.4rem" />
              <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)', marginTop: 4 }}>{totalReviews.toLocaleString()} reviews</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[5, 4, 3, 2, 1].map(s => {
                const count = starMap[s] || 0;
                const pct   = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.1rem', color: 'var(--ink-3)', width: 16, textAlign: 'right' }}>{s}</span>
                    <i className="fas fa-star" style={{ fontSize: '1rem', color: '#f59e0b' }} />
                    <div style={{ flex: 1, height: 6, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 4, transition: 'width .3s' }} />
                    </div>
                    <span style={{ fontSize: '1.1rem', color: 'var(--ink-3)', width: 36 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="adm-filterbar">
        <div className="adm-tabs">
          {TABS.map((t, i) => (
            <button key={t.label} className={`tab${tab === i ? ' active' : ''}`} onClick={() => { setTab(i); setPage(1); }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }}></div>
        <select
          style={{ height: 36, border: '1px solid #e3e5eb', borderRadius: 8, padding: '0 10px', fontSize: '1.2rem', fontFamily: 'inherit', background: 'var(--paper)', color: 'var(--ink-1)', cursor: 'pointer', outline: 'none' }}
          value={ratingFilter}
          onChange={e => { setRatingFilter(e.target.value); setPage(1); }}
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map(s => <option key={s} value={s}>{s} star{s !== 1 ? 's' : ''}</option>)}
        </select>
        <div className="adm-search" style={{ maxWidth: 260 }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input placeholder="Search review text…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Author</th><th>Subject</th><th>Type</th>
                <th>Rating</th><th>Review</th><th>Date</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : reviews.length === 0 ? (
                <tr><td colSpan="7">
                  <div className="adm-empty"><i className="fa-solid fa-star"></i><p>No reviews found</p></div>
                </td></tr>
              ) : reviews.map(r => (
                <tr key={r._id} onClick={() => setDrawer(r)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="adm-row-user">
                      <div className="adm-av av-d">{(r.author?.name || 'U')[0]}</div>
                      <div>
                        <div className="name" style={{ fontSize: '1.25rem' }}>{r.author?.name || '—'}</div>
                        <div className="email">{r.author?.email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="muted" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subject}</td>
                  <td><span className={`pill dot ${TYPE_COLOR[r.type] || 'gray'}`}>{r.type}</span></td>
                  <td><Stars rating={r.rating} /></td>
                  <td style={{ maxWidth: 220 }}>
                    <span style={{ fontSize: '1.25rem', color: 'var(--ink-2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {r.text}
                    </span>
                  </td>
                  <td className="muted">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="icon-action danger" disabled={deleting === r._id} onClick={() => deleteReview(r._id)}>
                      {deleting === r._id
                        ? <i className="fa-solid fa-circle-notch fa-spin"></i>
                        : <i className="fa-solid fa-trash"></i>}
                    </button>
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

      {drawer && (
        <ReviewDrawer
          review={drawer}
          onClose={() => setDrawer(null)}
          onDelete={() => deleteReview(drawer._id)}
          deleting={deleting === drawer._id}
        />
      )}
    </>
  );
}

function ReviewDrawer({ review, onClose, onDelete, deleting }) {
  return (
    <div className="adm-drawer-shell" onClick={onClose}>
      <div className="adm-drawer" onClick={e => e.stopPropagation()}>

        <div className="adm-drawer-head">
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{review.subject}</div>
            <div style={{ marginTop: 4 }}>
              <span className={`pill dot ${TYPE_COLOR[review.type] || 'gray'}`}>{review.type}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="adm-drawer-body">
          <div className="kpi-strip">
            <div className="kpi">
              <div className="l">Rating</div>
              <div className="v"><Stars rating={review.rating} size="1.6rem" /></div>
            </div>
            <div className="kpi">
              <div className="l">Score</div>
              <div className="v">{review.rating} / 5</div>
            </div>
          </div>

          <div className="adm-section-h">Review</div>
          <p style={{ fontSize: '1.4rem', color: 'var(--ink-1)', lineHeight: 1.6, margin: 0, padding: '12px 14px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)' }}>
            "{review.text}"
          </p>

          <div className="adm-section-h">Author</div>
          <div className="adm-kv">
            <span className="k">Name</span><span className="v">{review.author?.name || '—'}</span>
            <span className="k">Email</span><span className="v">{review.author?.email || '—'}</span>
            <span className="k">Posted</span>
            <span className="v">{review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
          </div>
        </div>

        <div className="adm-drawer-foot">
          <button className="abtn danger" style={{ flex: 1 }} disabled={deleting} onClick={onDelete}>
            {deleting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-trash"></i> Delete review</>}
          </button>
        </div>
      </div>
    </div>
  );
}
