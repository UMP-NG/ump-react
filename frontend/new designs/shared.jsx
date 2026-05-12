/* global React */
// shared.jsx — shared primitives, data, and components used across all screens

// ─── Helpers ──────────────────────────────────────────────────────────────────

function naira(n) {
  return '₦' + Number(n).toLocaleString('en-NG');
}

// ─── Icon primitives ──────────────────────────────────────────────────────────

function Icon({ n, className = '', style }) {
  return <i className={`fas fa-${n} ${className}`} style={style} aria-hidden="true" />;
}

function IconR({ n, className = '', style }) {
  return <i className={`far fa-${n} ${className}`} style={style} aria-hidden="true" />;
}

function IconB({ n, className = '', style }) {
  return <i className={`fab fa-${n} ${className}`} style={style} aria-hidden="true" />;
}

// ─── Placeholder image ────────────────────────────────────────────────────────
// Uses the CSS gradient classes from styles.css (.ph-{kind}) so this works
// fully offline — no network requests needed.

const PH_ICONS = {
  electronics:  'laptop',
  books:        'book',
  clothing:     'shirt',
  food:         'utensils',
  accessories:  'gem',
  beauty:       'spa',
  fitness:      'dumbbell',
  tutoring:     'graduation-cap',
  design:       'palette',
  music:        'music',
  'hostel-1':   'bed',
  'hostel-2':   'bed',
  'hostel-3':   'bed',
  campus:       'university',
  'portrait-1': 'user',
  'portrait-2': 'user',
  'portrait-3': 'user',
  'portrait-4': 'user',
  'portrait-5': 'user',
  'portrait-6': 'user',
};

function Ph({ kind = 'campus', label = '', style = {} }) {
  const icon = PH_ICONS[kind] || 'image';
  return (
    <div className={`img-ph ph-${kind}`} style={{ width: '100%', height: '100%', ...style }}>
      <i className={`fas fa-${icon}`} style={{ fontSize: '3rem', position: 'relative', zIndex: 1 }} />
      {label && <span style={{ marginTop: 6, fontSize: '1rem', position: 'relative', zIndex: 1 }}>{label}</span>}
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="logo">
      U<span className="m">M</span>P
    </div>
  );
}

// ─── Status bar ───────────────────────────────────────────────────────────────

function StatusBar({ dark = false }) {
  return (
    <div className={`status-bar${dark ? ' on-dark' : ''}`}>
      <span>9:41</span>
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 120, height: 30, background: 'var(--ink-1)', borderRadius: '0 0 20px 20px', opacity: 0.06 }} />
      <div className="icons">
        <Icon n="signal" style={{ fontSize: '1.2rem' }} />
        <Icon n="wifi" style={{ fontSize: '1.2rem' }} />
        <Icon n="battery-full" style={{ fontSize: '1.2rem' }} />
      </div>
    </div>
  );
}

// ─── Navbar (mobile) ──────────────────────────────────────────────────────────

function Navbar({ frosted = false, dark = false, authed = true, page, onNav, onProfileClick }) {
  const cls = ['nav', frosted ? 'frosted' : '', dark ? 'dark' : ''].filter(Boolean).join(' ');
  return (
    <nav className={cls}>
      <Logo />
      <div className="nav-icons">
        <button className="icon-btn" onClick={() => onNav?.('market')} title="Marketplace">
          <Icon n="magnifying-glass" />
        </button>
        {authed ? (
          <>
            <button className="icon-btn" style={{ position: 'relative' }} onClick={() => onNav?.('cart')}>
              <Icon n="bag-shopping" />
              <span className="badge-dot">3</span>
            </button>
            <button className="icon-btn" style={{ position: 'relative' }} onClick={() => onNav?.('messages')}>
              <Icon n="comment-dots" />
              <span className="badge-dot">2</span>
            </button>
            <div className="avatar" onClick={onProfileClick}>AO</div>
          </>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => onNav?.('login')}>Sign in</button>
        )}
      </div>
    </nav>
  );
}

// ─── Footer (mobile) ─────────────────────────────────────────────────────────

function Footer() {
  return (
    <div style={{ background: 'var(--navy-800)', color: '#fff', padding: '40px 24px 24px', marginTop: 32 }}>
      <Logo />
      <p style={{ fontSize: '1.3rem', color: 'var(--ink-3)', marginTop: 10, marginBottom: 20, lineHeight: 1.6 }}>
        Built for students, by students. Your campus marketplace, services and hostels — all in one place.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {[
          { h: 'Explore', links: ['Home', 'Marketplace', 'Services', 'Hostel Hub', 'Store'] },
          { h: 'Account', links: ['Sign In', 'Create Account', 'My Cart', 'Messages'] },
          { h: 'Support', links: ['Help Centre', 'FAQs', 'Report Issue', 'Privacy Policy'] },
          { h: 'Company', links: ['About UMP', 'Blog', 'Careers', 'Contact'] },
        ].map(col => (
          <div key={col.h}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--accent)', marginBottom: 10 }}>{col.h}</div>
            {col.links.map(l => (
              <div key={l} style={{ fontSize: '1.3rem', color: 'var(--ink-3)', marginBottom: 6, cursor: 'pointer' }}>{l}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {['facebook-f', 'twitter', 'instagram', 'linkedin-in'].map(ic => (
          <div key={ic} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <i className={`fab fa-${ic}`} style={{ fontSize: '1.3rem' }} />
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 16, fontSize: '1.1rem', color: 'var(--ink-3)' }}>
        © {new Date().getFullYear()} UMP — University Marketplace · All rights reserved.
      </div>
    </div>
  );
}

// ─── Bottom navigation ────────────────────────────────────────────────────────

function BottomNav({ active = 'home', onNav }) {
  const items = [
    { id: 'home',     icon: 'house',        label: 'Home' },
    { id: 'market',   icon: 'store',        label: 'Market' },
    { id: 'hostel',   icon: 'bed',          label: 'Hostel' },
    { id: 'services', icon: 'hand-holding-heart', label: 'Services' },
    { id: 'messages', icon: 'comment-dots', label: 'Chats' },
  ];
  return (
    <div style={{
      position: 'sticky', bottom: 0, left: 0, right: 0,
      background: 'rgba(250,250,247,.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--line)',
      display: 'flex',
      zIndex: 60,
      paddingBottom: 8,
    }}>
      {items.map(item => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNav?.(item.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '10px 0 2px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: isActive ? 'var(--accent)' : 'var(--ink-3)',
              fontSize: '1.1rem', fontFamily: 'var(--font-sans)', fontWeight: isActive ? 700 : 500,
              transition: 'color .15s',
            }}
          >
            <Icon n={item.icon} style={{ fontSize: '1.8rem' }} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Expose globals ───────────────────────────────────────────────────────────

Object.assign(window, {
  naira,
  Icon,
  IconR,
  IconB,
  Ph,
  Logo,
  StatusBar,
  Navbar,
  Footer,
  BottomNav,
});
