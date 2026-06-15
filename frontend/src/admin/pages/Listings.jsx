import { useState, useEffect, useCallback } from 'react';
import Thumb from '../components/Thumb';
import { apiFetch } from '../../utils/api';

const TABS = [
  { label: 'All',         filter: '' },
  { label: 'Apartments',  filter: 'apartment' },
  { label: 'Hostels',     filter: 'hostel' },
  { label: 'Unavailable', filter: 'unavailable' },
];

export default function Listings() {
  const [tab, setTab]           = useState(0);
  const [listings, setListings] = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [drawer, setDrawer]     = useState(null);
  const [search, setSearch]     = useState('');

  const fetchListings = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (TABS[tab].filter) params.set('type', TABS[tab].filter);
    if (search) params.set('q', search);
    apiFetch(`/api/admins/listings?${params}`)
      .then(d => { setListings(d?.listings || d || []); setTotal(d?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, page, search]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  async function toggleAvailability(id, current) {
    await apiFetch(`/api/admins/listings/${id}`, { method: 'PUT', body: { available: !current } }).catch(() => null);
    setDrawer(d => d ? { ...d, available: !current } : null);
    fetchListings();
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Listings</h1>
          <p>{total.toLocaleString()} hostel & apartment listing{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="adm-filterbar">
        <div className="adm-tabs">
          {TABS.map((t, i) => (
            <button key={t.label} className={`tab${tab === i ? ' active' : ''}`}
              onClick={() => { setTab(i); setPage(1); }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }}></div>
        <div className="adm-search" style={{ maxWidth: 280 }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input placeholder="Search listingsâ€¦" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Listing</th><th>Type</th><th>Location</th>
                <th>Price</th><th>Beds/Baths</th><th>Status</th><th>Owner</th><th>Added</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : listings.length === 0 ? (
                <tr><td colSpan="9">
                  <div className="adm-empty"><i className="fa-solid fa-bed"></i><p>No listings found</p></div>
                </td></tr>
              ) : listings.map(l => (
                <tr key={l._id} onClick={() => setDrawer(l)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="adm-row-user">
                      <Thumb src={l.image} kind="listing" label={l.type === 'Hostel' ? 'HS' : 'AP'} />
                      <div className="name" style={{ fontSize: '1.3rem' }}>{l.name}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`pill dot ${l.type === 'Hostel' ? 'amber' : 'blue'}`}>{l.type}</span>
                  </td>
                  <td className="muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.location}
                  </td>
                  <td className="amount">
                    <span className="naira"></span>{(l.price || 0).toLocaleString()}
                    <span className="muted" style={{ fontSize: '1.1rem' }}> /{l.rate?.replace('per ', '') || 'yr'}</span>
                  </td>
                  <td className="muted">{l.beds}bd Â· {l.baths}ba</td>
                  <td>
                    <span className={`pill dot ${l.available ? 'green' : 'red'}`}>
                      {l.available ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="muted">{l.ownerName}</td>
                  <td className="muted">
                    {l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'â€”'}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="icon-action" onClick={() => setDrawer(l)}>
                      <i className="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="adm-pagination">
            <span>Showing {((page - 1) * 20) + 1}â€“{Math.min(page * 20, total)} of {total.toLocaleString()}</span>
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
        <ListingDrawer
          listing={drawer}
          onClose={() => setDrawer(null)}
          onToggle={() => toggleAvailability(drawer._id, drawer.available)}
        />
      )}
    </>
  );
}

function ListingDrawer({ listing, onClose, onToggle }) {
  return (
    <div className="adm-drawer-shell" onClick={onClose}>
      <div className="adm-drawer" onClick={e => e.stopPropagation()}>

        {listing.image && (
          <div style={{ height: 160, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
            <img src={listing.image} alt={listing.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(15,23,42,.4))' }} />
            <span style={{ position: 'absolute', bottom: 10, left: 14 }}>
              <span className={`pill dot ${listing.type === 'Hostel' ? 'amber' : 'blue'}`}>{listing.type}</span>
            </span>
          </div>
        )}

        <div className="adm-drawer-head" style={{ alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>{listing.name}</div>
            <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', marginTop: 2 }}>
              <i className="fa-solid fa-location-dot" style={{ marginRight: 4 }}></i>{listing.location}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="adm-drawer-body">
          <div className="kpi-strip">
            <div className="kpi">
              <div className="l">Price</div>
              <div className="v"><span className="naira"></span>{(listing.price || 0).toLocaleString()}<span style={{ fontSize: '1rem', color: 'var(--ink-3)' }}> /{listing.rate?.replace('per ', '') || 'yr'}</span></div>
            </div>
            <div className="kpi">
              <div className="l">Beds Â· Baths</div>
              <div className="v">{listing.beds} Â· {listing.baths}</div>
            </div>
            <div className="kpi">
              <div className="l">Reviews</div>
              <div className="v">{listing.reviewCount ?? 0}</div>
            </div>
          </div>

          <div className="adm-section-h">Details</div>
          <div className="adm-kv">
            <span className="k">Owner</span><span className="v">{listing.ownerName}</span>
            <span className="k">Email</span><span className="v">{listing.ownerEmail || 'â€”'}</span>
            <span className="k">Furnished</span><span className="v">{listing.furnished ? 'Yes' : 'No'}</span>
            {listing.distance && <><span className="k">Distance</span><span className="v">{listing.distance}</span></>}
            <span className="k">Status</span>
            <span className="v">
              <span className={`pill dot ${listing.available ? 'green' : 'red'}`}>
                {listing.available ? 'Available' : 'Unavailable'}
              </span>
            </span>
          </div>

          {listing.amenities?.length > 0 && (
            <>
              <div className="adm-section-h">Amenities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {listing.amenities.map((a, i) => (
                  <span key={i} style={{ padding: '3px 10px', background: 'var(--surface)', borderRadius: 6, fontSize: '1.2rem' }}>{a}</span>
                ))}
              </div>
            </>
          )}

          {listing.description && (
            <>
              <div className="adm-section-h">Description</div>
              <p style={{ fontSize: '1.3rem', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{listing.description}</p>
            </>
          )}
        </div>

        <div className="adm-drawer-foot">
          <button
            className={listing.available ? 'abtn danger' : 'abtn success'}
            style={{ flex: 1 }}
            onClick={onToggle}
          >
            <i className={`fa-solid ${listing.available ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            {listing.available ? ' Mark Unavailable' : ' Mark Available'}
          </button>
        </div>
      </div>
    </div>
  );
}

