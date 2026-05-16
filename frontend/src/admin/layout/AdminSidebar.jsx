import { NavLink, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

const NAV_GROUPS = [
  { label: 'Overview', items: [
    { id: 'dashboard', path: '/admin', icon: 'fa-gauge-high', name: 'Dashboard', end: true },
  ]},
  { label: 'People', items: [
    { id: 'users',     path: '/admin/users',     icon: 'fa-users',    name: 'Users' },
    { id: 'sellers',   path: '/admin/sellers',   icon: 'fa-store',    name: 'Sellers',           badge: null, badgeKind: 'amber' },
    { id: 'providers', path: '/admin/providers', icon: 'fa-briefcase', name: 'Service Providers', badge: null, badgeKind: 'amber' },
  ]},
  { label: 'Content', items: [
    { id: 'products',   path: '/admin/products',   icon: 'fa-box',         name: 'Products' },
    { id: 'services',   path: '/admin/services',   icon: 'fa-handshake',   name: 'Services' },
    { id: 'listings',   path: '/admin/listings',   icon: 'fa-bed',         name: 'Listings (Hostel)' },
    { id: 'categories', path: '/admin/categories', icon: 'fa-folder-tree', name: 'Categories' },
  ]},
  { label: 'Transactions', items: [
    { id: 'orders',   path: '/admin/orders',   icon: 'fa-receipt',             name: 'Orders' },
    { id: 'bookings', path: '/admin/bookings', icon: 'fa-calendar-check',      name: 'Bookings' },
    { id: 'payouts',  path: '/admin/payouts',  icon: 'fa-money-bill-transfer', name: 'Payouts', badge: null, badgeKind: 'amber' },
  ]},
  { label: 'Moderation', items: [
    { id: 'reviews',  path: '/admin/reviews',  icon: 'fa-star',          name: 'Reviews' },
    { id: 'disputes', path: '/admin/disputes', icon: 'fa-scale-balanced', name: 'Disputes', badge: null, badgeKind: 'red' },
    { id: 'reports',  path: '/admin/reports',  icon: 'fa-flag',           name: 'Reported Content', badge: null, badgeKind: 'red' },
  ]},
  { label: 'Platform', items: [
    { id: 'analytics', path: '/admin/analytics', icon: 'fa-chart-line', name: 'Analytics' },
    { id: 'broadcast', path: '/admin/broadcast', icon: 'fa-bullhorn',   name: 'Notifications' },
    { id: 'config',    path: '/admin/config',    icon: 'fa-sliders',    name: 'Site Configuration' },
    { id: 'admins',    path: '/admin/admins',    icon: 'fa-user-shield', name: 'Admin Accounts' },
  ]},
];

export default function AdminSidebar({ collapsed, onToggle }) {
  const { user } = useUser();
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  return (
    <aside className={`adm-side${collapsed ? ' collapsed' : ''}`}>
      <div className="adm-side-head">
        {!collapsed && <div className="logo">U<span className="m">M</span>P</div>}
        <button className="adm-collapse" title="Collapse sidebar" onClick={onToggle}>
          <i className={`fa-solid ${collapsed ? 'fa-chevrons-right' : 'fa-chevrons-left'}`}></i>
        </button>
        {collapsed && (
          <button
            className="adm-collapse"
            title="Expand sidebar"
            onClick={onToggle}
            style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}
          >
            <i className="fa-solid fa-chevrons-right"></i>
          </button>
        )}
      </div>

      {NAV_GROUPS.map(g => (
        <div className="adm-side-group" key={g.label}>
          <div className="label">{g.label}</div>
          {g.items.map(it => (
            <NavLink
              key={it.id}
              to={it.path}
              end={it.end}
              className={({ isActive }) => `adm-nav-item${isActive ? ' active' : ''}`}
            >
              <i className={`fa-solid ${it.icon}`}></i>
              <span>{it.name}</span>
              {it.badge ? (
                <span className={`nav-badge ${it.badgeKind || ''}`}>{it.badge}</span>
              ) : null}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="adm-side-foot">
        <div
          className="adm-av"
          style={{
            width: 34, height: 34, fontSize: '1.2rem',
            background: 'linear-gradient(135deg,#f97316,#ea580c)',
            borderRadius: '50%', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="name">{user?.name || 'Admin'}</div>
          <div className="role">{user?.role || 'admin'}</div>
        </div>
        <i className="fa-solid fa-ellipsis-vertical" style={{ color: '#6b7891' }}></i>
      </div>
    </aside>
  );
}
