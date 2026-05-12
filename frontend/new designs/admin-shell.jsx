/* global React */
const { useState, useMemo } = React;

// ─────────────────────────────────────────────────────────
// Shared admin primitives
// ─────────────────────────────────────────────────────────

const NAV_GROUPS = [
  { label: 'Overview', items: [
    { id: 'dashboard', icon: 'fa-gauge-high', name: 'Dashboard' },
  ]},
  { label: 'People', items: [
    { id: 'users', icon: 'fa-users', name: 'Users' },
    { id: 'sellers', icon: 'fa-store', name: 'Sellers', badge: 12, badgeKind: 'amber' },
    { id: 'providers', icon: 'fa-briefcase', name: 'Service Providers', badge: 4, badgeKind: 'amber' },
  ]},
  { label: 'Content', items: [
    { id: 'products', icon: 'fa-box', name: 'Products' },
    { id: 'services', icon: 'fa-handshake', name: 'Services' },
    { id: 'listings', icon: 'fa-bed', name: 'Listings (Hostel)' },
    { id: 'categories', icon: 'fa-folder-tree', name: 'Categories' },
  ]},
  { label: 'Transactions', items: [
    { id: 'orders', icon: 'fa-receipt', name: 'Orders' },
    { id: 'bookings', icon: 'fa-calendar-check', name: 'Bookings' },
    { id: 'payouts', icon: 'fa-money-bill-transfer', name: 'Payouts', badge: 8, badgeKind: 'amber' },
  ]},
  { label: 'Moderation', items: [
    { id: 'reviews', icon: 'fa-star', name: 'Reviews' },
    { id: 'disputes', icon: 'fa-scale-balanced', name: 'Disputes', badge: 3, badgeKind: 'red' },
    { id: 'reports', icon: 'fa-flag', name: 'Reported Content', badge: 7, badgeKind: 'red' },
  ]},
  { label: 'Platform', items: [
    { id: 'analytics', icon: 'fa-chart-line', name: 'Analytics' },
    { id: 'broadcast', icon: 'fa-bullhorn', name: 'Notifications' },
    { id: 'config', icon: 'fa-sliders', name: 'Site Configuration' },
    { id: 'admins', icon: 'fa-user-shield', name: 'Admin Accounts' },
  ]},
];

function AdminSide({ active, onNav }) {
  return (
    <aside className="adm-side" data-screen-label="Sidebar">
      <div className="adm-side-head">
        <div className="logo">U<span className="m">M</span>P</div>
        <button className="adm-collapse" title="Collapse"><i className="fa-solid fa-chevrons-left"></i></button>
      </div>
      {NAV_GROUPS.map(g => (
        <div className="adm-side-group" key={g.label}>
          <div className="label">{g.label}</div>
          {g.items.map(it => (
            <div
              key={it.id}
              className={'adm-nav-item' + (active === it.id ? ' active' : '')}
              onClick={() => onNav && onNav(it.id)}
            >
              <i className={'fa-solid ' + it.icon}></i>
              <span>{it.name}</span>
              {it.badge ? <span className={'nav-badge ' + (it.badgeKind || '')}>{it.badge}</span> : null}
            </div>
          ))}
        </div>
      ))}
      <div className="adm-side-foot">
        <div className="avatar" style={{ width: 34, height: 34, fontSize: '1.2rem' }}>OA</div>
        <div style={{ flex: 1 }}>
          <div className="name">Olamide Aluko</div>
          <div className="role">Super admin</div>
        </div>
        <i className="fa-solid fa-ellipsis-vertical" style={{ color: '#6b7891' }}></i>
      </div>
    </aside>
  );
}

function AdminTop({ crumbs = ['Admin', 'Dashboard'] }) {
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
        <input placeholder="Search users, orders, products, anything…" />
        <span className="kbd">⌘K</span>
      </div>
      <div className="adm-top-spacer"></div>
      <button className="icon-btn" style={{ position: 'relative' }} title="Help"><i className="fa-regular fa-circle-question"></i></button>
      <button className="icon-btn" style={{ position: 'relative' }} title="Notifications">
        <i className="fa-regular fa-bell"></i>
        <span className="dot"></span>
      </button>
      <div className="avatar" style={{ width: 34, height: 34, fontSize: '1.2rem' }}>OA</div>
    </header>
  );
}

function AdminShell({ active, crumbs, children }) {
  return (
    <div className="admin">
      <AdminSide active={active} />
      <div className="adm-main">
        <AdminTop crumbs={crumbs} />
        <div className="adm-body">{children}</div>
      </div>
    </div>
  );
}

function PageHead({ title, sub, actions }) {
  return (
    <div className="adm-page-head">
      <div className="left">
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      <div className="right">{actions}</div>
    </div>
  );
}

// Tiny line/area chart helper
function LineChart({ data, color = 'var(--accent)', height = 240, fill = true }) {
  const w = 800, h = height - 30;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => [i * stepX, h - ((v - min) / range) * (h - 20) - 10]);
  const path = points.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const areaPath = path + ` L ${w},${h} L 0,${h} Z`;
  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h + 26}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="cgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((p, i) => (
        <line key={i} x1="0" x2={w} y1={h * p} y2={h * p} stroke="#eef0f4" strokeWidth="1" />
      ))}
      {fill ? <path d={areaPath} fill="url(#cgrad)" /> : null}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => i % 5 === 0 || i === points.length - 1 ? (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke={color} strokeWidth="2" />
      ) : null)}
      {[0, 6, 12, 18, 24, 29].map(i => (
        <text key={i} x={i * stepX} y={h + 18} fontSize="11" fill="#94a3b8" textAnchor="middle">
          {`Apr ${10 + i}`}
        </text>
      ))}
    </svg>
  );
}

function BarChart({ data, labels, height = 240 }) {
  const w = 800, h = height - 30;
  const max = Math.max(...data);
  const bw = w / data.length;
  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h + 26}`} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75, 1].map((p, i) => (
        <line key={i} x1="0" x2={w} y1={h * p} y2={h * p} stroke="#eef0f4" />
      ))}
      {data.map((v, i) => {
        const bh = (v / max) * (h - 16);
        return (
          <g key={i}>
            <rect x={i * bw + 6} y={h - bh} width={bw - 12} height={bh} fill="var(--accent)" rx="4" opacity={0.85} />
            <text x={i * bw + bw / 2} y={h + 18} fontSize="10" fill="#94a3b8" textAnchor="middle">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function PieChart({ data, size = 200 }) {
  const total = data.reduce((a, b) => a + b.v, 0);
  const r = size / 2 - 6;
  const cx = size / 2, cy = size / 2;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((s, i) => {
        const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
        acc += s.v;
        const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        const large = end - start > Math.PI ? 1 : 0;
        return (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
            fill={s.c}
            stroke="#fff"
            strokeWidth="2"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#fff" />
    </svg>
  );
}

function StarRow({ value, max = 5 }) {
  return (
    <span className="stars">
      {Array.from({ length: max }).map((_, i) => (
        <i key={i} className={'fa-solid fa-star' + (i < Math.round(value) ? '' : ' empty')} style={i >= Math.round(value) ? { color: '#e3e5eb' } : null}></i>
      ))}
    </span>
  );
}

function Spark({ data }) {
  const max = Math.max(...data);
  return (
    <span className="spark">
      {data.map((v, i) => <span key={i} style={{ height: ((v / max) * 22) + 'px' }} />)}
    </span>
  );
}

// Image placeholder for product/listing thumbs
function Thumb({ kind = 'electronics', children, className = '' }) {
  return (
    <div className={'adm-thumb ' + className}>
      <div className={'img-ph ph-' + kind}>{children || ''}</div>
    </div>
  );
}

Object.assign(window, {
  AdminShell, AdminSide, AdminTop, PageHead,
  LineChart, BarChart, PieChart, StarRow, Spark, Thumb,
});
