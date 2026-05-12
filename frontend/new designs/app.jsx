/* global React */
const { useState: useS_app } = React;

// ---------- App routing wrapper ----------
function PhoneFlowApp({ initial = 'home', heroVariant, cardVariant, navStyle = 'frosted' }) {
  const [route, setRoute] = useS_app({ page: initial, params: {} });
  const [cartStep, setCartStep] = useS_app(1);
  const [showProfile, setShowProfile] = useS_app(false);
  const [showQuick, setShowQuick] = useS_app(null);

  const nav = (page, param) => {
    setRoute({ page, params: { id: param } });
    if (page === 'cart') setCartStep(1);
  };

  const screen = (() => {
    switch (route.page) {
      case 'home': return <HomeMobile heroVariant={heroVariant} onNav={nav} />;
      case 'market': return <MarketMobile cardVariant={cardVariant} onNav={nav} />;
      case 'product': return <ProductDetail id={route.params.id || 1} onNav={nav} />;
      case 'cart': return <CartMobile step={cartStep} onNav={nav} onStep={setCartStep} />;
      case 'login': return <LoginMobile onNav={nav} />;
      case 'otp': return <OtpMobile onNav={nav} />;
      case 'forgot': return <ForgotMobile onNav={nav} />;
      case 'reset': return <ResetMobile onNav={nav} />;
      case 'messages': return <MessagesMobile onNav={nav} />;
      case 'services': return <ServicesMobile onNav={nav} />;
      case 'hostel': return <HostelMobile onNav={nav} />;
      case 'store': return <StoreMobile onNav={nav} />;
      case 'partner': return <PartnerMobile onNav={nav} />;
      case 'payment-success': return <PaymentSuccessMobile onNav={nav} />;
      case 'checkout-success': return <CheckoutSuccessMobile onNav={nav} />;
      case 'profile': setShowProfile(true); setRoute({ page: 'home' }); return null;
      default: return <HomeMobile heroVariant={heroVariant} onNav={nav} />;
    }
  })();

  // override navStyle on Navbar
  React.useEffect(() => {
    const navs = document.querySelectorAll('.nav');
    navs.forEach(n => {
      n.classList.remove('frosted', 'dark');
      if (navStyle === 'frosted') n.classList.add('frosted');
      if (navStyle === 'dark') n.classList.add('dark');
    });
  });

  return (
    <div className="phone-screen">
      {screen}
      {showProfile && <ProfilePopup onClose={() => setShowProfile(false)} onNav={(p) => { setShowProfile(false); nav(p); }} />}
    </div>
  );
}

function ProfilePopup({ onClose, onNav }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.4)', zIndex: 70 }} />
      <div style={{ position: 'absolute', top: 70, right: 12, width: 280, background: '#fff', borderRadius: 'var(--r-xl)', boxShadow: 'var(--shadow-deep)', overflow: 'hidden', zIndex: 80, animation: 'fadeUp .25s' }}>
        <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg, var(--navy-800), #1e1b4b)', color: '#fff' }}>
          <div className="avatar" style={{ width: 44, height: 44 }}>AO</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.4rem' }}>Aisha Ogundimu</div>
            <div style={{ fontSize: '1.1rem', opacity: .7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>aisha@unilag.edu.ng</div>
          </div>
        </div>
        <div style={{ padding: 8 }}>
          {[
            { i: 'box-archive', l: 'My orders' },
            { i: 'store', l: 'Become a seller', accent: true, click: () => onNav?.('partner') },
            { i: 'hand-holding-heart', l: 'Become a service provider', click: () => onNav?.('partner') },
            { i: 'gear', l: 'Settings' },
            { i: 'circle-question', l: 'Help & support' },
          ].map(it => (
            <button key={it.l} onClick={it.click} style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.4rem', borderRadius: 'var(--r-md)', color: it.accent ? 'var(--accent)' : 'var(--ink-1)', fontWeight: it.accent ? 600 : 500, textAlign: 'left' }}>
              <Icon n={it.i} style={{ width: 20 }} /> {it.l}
            </button>
          ))}
          <div style={{ height: 1, background: 'var(--line)', margin: '6px 0' }} />
          <button style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.4rem', borderRadius: 'var(--r-md)', color: 'var(--danger)', fontWeight: 600 }}>
            <Icon n="right-from-bracket" style={{ width: 20 }} /> Logout
          </button>
        </div>
      </div>
    </>
  );
}

// ---------- Phone wrapper ----------
function Phone({ children, dark = false, theme = 'light' }) {
  return (
    <div className={`phone ${dark ? 'on-dark-bg' : ''}`} data-theme={theme}>
      <StatusBar dark={dark} />
      {children}
      <div className="home-indicator" />
    </div>
  );
}

// ---------- Section header ----------
function SectionHeader({ eyebrow, title, sub }) {
  return (
    <div style={{ padding: '40px 32px 16px', maxWidth: 1100 }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.18em', marginBottom: 8 }}>{eyebrow}</div>
      <h2 style={{ fontSize: '4.4rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.05 }}>{title}</h2>
      {sub && <p style={{ fontSize: '1.5rem', color: 'var(--ink-2)', maxWidth: 640, margin: 0, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

// ---------- Component callout (navbar/footer specs) ----------
function NavbarSpec({ frosted, dark }) {
  return (
    <div style={{ background: dark ? 'var(--navy-800)' : 'var(--paper)', padding: 24, borderRadius: 'var(--r-xl)', border: '1px solid var(--line)' }}>
      <Navbar frosted={frosted} dark={dark} authed />
      <div style={{ marginTop: 16, fontSize: '1.2rem', color: dark ? 'rgba(255,255,255,.6)' : 'var(--ink-3)', fontFamily: 'monospace' }}>
        {frosted ? 'frosted' : 'solid'} · {dark ? 'dark' : 'light'} · authed
      </div>
    </div>
  );
}

// expose
Object.assign(window, { PhoneFlowApp, Phone, SectionHeader, NavbarSpec });
