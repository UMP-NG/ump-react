import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useUser } from '../../context/UserContext';
import { apiFetch } from '../../utils/api';

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
  '/admin/gifts':      ['Admin', 'Gifts'],
  '/admin/reviews':    ['Admin', 'Reviews'],
  '/admin/disputes':   ['Admin', 'Disputes'],
  '/admin/reports':    ['Admin', 'Reports'],
  '/admin/analytics':  ['Admin', 'Analytics'],
  '/admin/broadcast':  ['Admin', 'Notifications'],
  '/admin/config':     ['Admin', 'Site Configuration'],
  '/admin/admins':     ['Admin', 'Admin Accounts'],
};

export default function AdminTopbar({ onMenuOpen }) {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const [query, setQuery]           = useState('');
  const { user }                    = useUser();
  const [isMobile, setIsMobile]     = useState(() => window.matchMedia('(max-width: 768px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = e => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [helpOpen, setHelpOpen]     = useState(false);
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );

  function toggleDark() {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ump-theme', next);
    setIsDark(!isDark);
  }
  const [notifStats, setNotifStats] = useState(null);
  const notifRef = useRef(null);
  const helpRef  = useRef(null);

  const initials  = user?.name ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'AD';
  const avatarUrl = user?.avatar?.url || null;
  const crumbs    = ROUTE_LABELS[pathname] || ['Admin', pathname.split('/').pop()];

  // Fetch notification counts once on mount
  useEffect(() => {
    apiFetch('/api/admins/stats?days=30').then(s => setNotifStats(s)).catch(() => {});
  }, []);

  // Close both panels on outside click
  useEffect(() => {
    function close(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (helpRef.current  && !helpRef.current.contains(e.target))  setHelpOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const hasBadge = notifStats && (
    (notifStats.pendingSellers  || 0) +
    (notifStats.pendingPayoutsCount || 0) +
    (notifStats.disputes        || 0)
  ) > 0;

  function runSearch() {
    if (query.trim()) navigate(`/admin/users?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="adm-top">
      {isMobile && (
        <button className="icon-btn" onClick={onMenuOpen} title="Open menu">
          <i className="fa-solid fa-bars"></i>
        </button>
      )}
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 ? ' / ' : ''}
            {i === crumbs.length - 1 ? <strong>{c}</strong> : c}
          </span>
        ))}
      </div>

      <form className="adm-search" onSubmit={e => { e.preventDefault(); runSearch(); }}>
        <button type="submit" className="adm-search-icon-btn" title="Search" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <i className="fa-solid fa-magnifying-glass"></i>
        </button>
        <input
          placeholder="Search users, orders, products…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <span className="kbd">⌘K</span>
      </form>

      <div className="adm-top-spacer"></div>

      {/* Dark mode toggle */}
      <button
        className="icon-btn"
        onClick={toggleDark}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <i className={isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}></i>
      </button>

      {/* Help */}
      <div ref={helpRef} style={{ position: 'relative' }}>
        <button
          className="icon-btn"
          title="Help"
          onClick={() => { setHelpOpen(o => !o); setNotifOpen(false); }}
        >
          <i className="fa-regular fa-circle-question"></i>
        </button>
        {helpOpen && (
          <div className="adm-notif-drop">
            <div className="adm-notif-head">Help &amp; Quick links</div>
            <button className="adm-notif-item" onClick={() => { navigate('/admin/broadcast'); setHelpOpen(false); }}>
              <i className="fa-solid fa-bullhorn" style={{ color: 'var(--accent)' }}></i>
              <span>Send broadcast notification</span>
            </button>
            <button className="adm-notif-item" onClick={() => { navigate('/admin/config'); setHelpOpen(false); }}>
              <i className="fa-solid fa-sliders" style={{ color: '#22c55e' }}></i>
              <span>Site configuration</span>
            </button>
            <button className="adm-notif-item" onClick={() => { navigate('/admin/admins'); setHelpOpen(false); }}>
              <i className="fa-solid fa-user-shield" style={{ color: '#6366f1' }}></i>
              <span>Manage admin accounts</span>
            </button>
            <a className="adm-notif-item" href="mailto:support@myump.com.ng">
              <i className="fa-regular fa-envelope" style={{ color: '#f59e0b' }}></i>
              <span>Email support</span>
            </a>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button
          className="icon-btn"
          title="Notifications"
          onClick={() => { setNotifOpen(o => !o); setHelpOpen(false); }}
          style={{ position: 'relative' }}
        >
          <i className="fa-regular fa-bell"></i>
          {hasBadge && <span className="dot"></span>}
        </button>
        {notifOpen && (
          <div className="adm-notif-drop">
            <div className="adm-notif-head">Notifications</div>
            {notifStats?.pendingSellers > 0 && (
              <button className="adm-notif-item" onClick={() => { navigate('/admin/sellers'); setNotifOpen(false); }}>
                <i className="fa-solid fa-store" style={{ color: '#f59e0b' }}></i>
                <span>
                  <strong>{notifStats.pendingSellers}</strong> seller{notifStats.pendingSellers > 1 ? 's' : ''} pending verification
                </span>
              </button>
            )}
            {notifStats?.pendingPayoutsCount > 0 && (
              <button className="adm-notif-item" onClick={() => { navigate('/admin/payouts'); setNotifOpen(false); }}>
                <i className="fa-solid fa-money-bill-transfer" style={{ color: '#6366f1' }}></i>
                <span>
                  <strong>{notifStats.pendingPayoutsCount}</strong> payout{notifStats.pendingPayoutsCount > 1 ? 's' : ''} awaiting approval
                </span>
              </button>
            )}
            {notifStats?.disputes > 0 && (
              <button className="adm-notif-item" onClick={() => { navigate('/admin/disputes'); setNotifOpen(false); }}>
                <i className="fa-solid fa-scale-balanced" style={{ color: '#ef4444' }}></i>
                <span>
                  <strong>{notifStats.disputes}</strong> active dispute{notifStats.disputes > 1 ? 's' : ''}
                </span>
              </button>
            )}
            {!hasBadge && (
              <div style={{ padding: '18px', color: '#94a3b8', fontSize: '1.3rem', textAlign: 'center' }}>
                All clear — no pending items
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin avatar */}
      <div
        title={user?.name || 'Admin'}
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg,var(--accent),var(--accent-deep))',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0,
          overflow: 'hidden', padding: 0,
        }}
      >
        {avatarUrl && !avatarBroken
          ? <img src={avatarUrl} alt={initials} onError={() => setAvatarBroken(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : initials}
      </div>
    </header>
  );
}
