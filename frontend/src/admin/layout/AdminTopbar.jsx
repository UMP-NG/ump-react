import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const ROUTE_LABELS = {
  '/admin':            ['Admin', 'Dashboard'],
  '/admin/users':      ['Admin', 'Users'],
  '/admin/sellers':    ['Admin', 'Sellers'],
  '/admin/providers':  ['Admin', 'Service Providers'],
  '/admin/products':   ['Admin', 'Products'],
  '/admin/services':   ['Admin', 'Services'],
  '/admin/listings':   ['Admin', 'Listings'],
  '/admin/categories': ['Admin', 'Categories'],
  '/admin/orders':     ['Admin', 'Orders'],
  '/admin/bookings':   ['Admin', 'Bookings'],
  '/admin/payouts':    ['Admin', 'Payouts'],
  '/admin/reviews':    ['Admin', 'Reviews'],
  '/admin/disputes':   ['Admin', 'Disputes'],
  '/admin/reports':    ['Admin', 'Reports'],
  '/admin/analytics':  ['Admin', 'Analytics'],
  '/admin/broadcast':  ['Admin', 'Notifications'],
  '/admin/config':     ['Admin', 'Site Configuration'],
  '/admin/admins':     ['Admin', 'Admin Accounts'],
};

export default function AdminTopbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const crumbs = ROUTE_LABELS[pathname] || ['Admin', pathname.split('/').pop()];

  function handleSearch(e) {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/admin/users?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <header className="adm-top">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 ? ' / ' : ''}
            {i === crumbs.length - 1 ? <strong>{c}</strong> : c}
          </span>
        ))}
      </div>

      <div className="adm-search">
        <i className="fa-solid fa-magnifying-glass"></i>
        <input
          placeholder="Search users, orders, products…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleSearch}
        />
        <span className="kbd">⌘K</span>
      </div>

      <div className="adm-top-spacer"></div>

      <button className="icon-btn" title="Help">
        <i className="fa-regular fa-circle-question"></i>
      </button>
      <button className="icon-btn" title="Notifications" style={{ position: 'relative' }}>
        <i className="fa-regular fa-bell"></i>
        <span className="dot"></span>
      </button>
      <div
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg,#f97316,#ea580c)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0,
        }}
      >
        AD
      </div>
    </header>
  );
}
