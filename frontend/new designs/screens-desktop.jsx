/* global React */

// ---------- DESKTOP versions for data-heavy pages ----------

function DesktopShell({ children, page, onNav, navStyle = 'frosted' }) {
  const cls = `desk-nav ${navStyle === 'frosted' ? 'frosted' : navStyle === 'dark' ? 'dark' : ''}`;
  return (
    <div style={{ width: '100%', minHeight: '100%', background: 'var(--paper)' }}>
      <div className={cls}>
        <Logo />
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {[
            { id: 'home', l: 'Home' },
            { id: 'market', l: 'Marketplace' },
            { id: 'services', l: 'Services' },
            { id: 'hostel', l: 'Hostel Hub' },
            { id: 'store', l: 'Store' },
          ].map(l => (
            <a key={l.id} onClick={() => onNav?.(l.id)} style={{ fontSize: '1.4rem', fontWeight: 600, color: page === l.id ? 'var(--accent)' : 'var(--ink-1)', cursor: 'pointer', position: 'relative' }}>
              {l.l}
              {page === l.id && <span style={{ position: 'absolute', bottom: -6, left: 0, right: 0, height: 3, background: 'var(--accent)', borderRadius: 3 }} />}
            </a>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="search-wrap" style={{ width: 240 }}>
            <Icon n="magnifying-glass" className="search-icon" />
            <input className="input" placeholder="Search…" style={{ padding: '10px 14px 10px 40px' }} />
          </div>
          <button className="icon-btn" onClick={() => onNav?.('cart')}><Icon n="bag-shopping" /><span className="badge-dot">3</span></button>
          <button className="icon-btn" onClick={() => onNav?.('messages')}><Icon n="comment-dots" /><span className="badge-dot">2</span></button>
          <div className="avatar ring">AO</div>
        </div>
      </div>
      <div>{children}</div>
      <DesktopFooter />
    </div>
  );
}

function DesktopFooter() {
  return (
    <div style={{ background: 'var(--navy-800)', color: '#fff', padding: '60px 60px 30px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 60, marginBottom: 40 }}>
        <div>
          <Logo />
          <p style={{ marginTop: 12, fontSize: '1.4rem', color: 'var(--ink-3)', maxWidth: 320, lineHeight: 1.6 }}>
            Built for students, by students. Your campus marketplace, services and hostels — all in one place.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {['instagram','x-twitter','tiktok','facebook-f'].map(s => (
              <button key={s} className="icon-btn" style={{ background: 'rgba(255,255,255,.06)', color: '#fff' }}><IconB n={s} /></button>
            ))}
          </div>
        </div>
        {[
          { h: 'Explore', l: ['Marketplace', 'Services', 'Hostel Hub', 'Store'] },
          { h: 'Account', l: ['Sign In', 'My Cart', 'Messages', 'Become a Partner'] },
          { h: 'Support', l: ['Help Center', 'FAQs', 'Report Issue'] },
          { h: 'Legal', l: ['Privacy', 'Terms', 'Cookies'] },
        ].map(c => (
          <div key={c.h}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.12em', margin: '0 0 16px' }}>{c.h}</h4>
            {c.l.map(a => <a key={a} style={{ display: 'block', color: '#fff', fontSize: '1.4rem', padding: '6px 0', opacity: .85, cursor: 'pointer' }}>{a}</a>)}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', color: 'var(--ink-3)' }}>
        <span>© 2025 UMP — University Marketplace</span>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Built for students, by students.</span>
      </div>
    </div>
  );
}

// ---------- HOME (desktop) ----------
function HomeDesktop({ onNav }) {
  return (
    <DesktopShell page="home" onNav={onNav}>
      {/* Hero */}
      <div style={{ position: 'relative', margin: '20px 40px 0', borderRadius: 32, overflow: 'hidden', height: 540 }}>
        <Ph kind="campus" label="campus lifestyle" style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, rgba(15,23,42,.92) 0%, rgba(15,23,42,.6) 50%, rgba(15,23,42,.2) 100%)' }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 60, color: '#fff', maxWidth: 720 }}>
          <span className="chip accent" style={{ alignSelf: 'flex-start', marginBottom: 16 }}><Icon n="bolt" /> UNILAG · 2,400+ active students</span>
          <h1 style={{ fontSize: '6.4rem', fontWeight: 800, letterSpacing: '-0.04em', margin: 0, lineHeight: .95 }}>
            Shop smart.<br/>Live better.<br/><span style={{ color: 'var(--accent)' }}>Study harder.</span>
          </h1>
          <p style={{ fontSize: '1.8rem', opacity: .85, marginTop: 24, marginBottom: 32, maxWidth: 520, lineHeight: 1.4 }}>
            The campus marketplace built by students, for students. Buy, sell, hire, rent — all in one place.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary btn-lg" onClick={() => onNav?.('market')}>Explore marketplace <Icon n="arrow-right" /></button>
            <button className="btn btn-lg" style={{ background: 'rgba(255,255,255,.14)', color: '#fff', backdropFilter: 'blur(10px)' }} onClick={() => onNav?.('services')}>Offer a service</button>
          </div>
          <div style={{ display: 'flex', gap: 32, marginTop: 48 }}>
            {[['2.4K','Students'],['312','Sellers'],['8.2K','Listings'],['4.8★','Avg rating']].map(s => (
              <div key={s[1]}>
                <div style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--accent)' }}>{s[0]}</div>
                <div style={{ fontSize: '1.2rem', opacity: .7 }}>{s[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trending */}
      <div style={{ padding: '60px 40px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
          <h2 style={{ fontSize: '3.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Trending now <Icon n="fire" style={{ color: 'var(--accent)' }} /></h2>
          <a style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1.4rem' }}>See all →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
          {(window.PRODUCTS || []).slice(0, 6).map(p => (
            <div key={p.id} className="product-card" onClick={() => onNav?.('product', p.id)}>
              <div className="product-thumb">{p.tag && <span className="product-tag">{p.tag}</span>}<button className="product-fav"><IconR n="heart" /></button><Ph kind={p.kind} label={p.cat} /></div>
              <div className="product-meta">
                <div className="product-name">{p.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div className="product-price">{naira(p.price)}</div>
                  <div className="rating" style={{ fontSize: '1.1rem' }}><Icon n="star" className="star" /> {p.rating}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What we do */}
      <div style={{ padding: '80px 40px 0' }}>
        <h2 style={{ fontSize: '3.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 40px', textAlign: 'center' }}>What we do</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { i: 'store', t: 'Campus marketplace', s: 'Buy and sell anything — textbooks, phones, sneakers — with verified UNILAG students.', c: 'var(--accent)' },
            { i: 'users', t: 'Community first', s: 'Real students, real reviews. Every seller verified by UNILAG email — no scammers.', c: '#2563eb' },
            { i: 'bolt', t: 'Fast & reliable', s: 'Same-day delivery on Akoka, Yaba and Bariga. Pay only when you trust the seller.', c: '#16a34a' },
          ].map(f => (
            <div key={f.t} className="card" style={{ padding: 32 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: `${f.c}1a`, color: f.c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', marginBottom: 16 }}><Icon n={f.i} /></div>
              <h3 style={{ margin: '0 0 8px', fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.01em' }}>{f.t}</h3>
              <p style={{ margin: 0, fontSize: '1.4rem', color: 'var(--ink-2)', lineHeight: 1.5 }}>{f.s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Big CTA */}
      <div style={{ margin: '80px 40px 60px', padding: 60, borderRadius: 32, background: 'linear-gradient(135deg, var(--navy-800), #1e1b4b)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
        <div>
          <h2 style={{ fontSize: '4.8rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px' }}>Sell what you've got.</h2>
          <p style={{ margin: 0, opacity: .8, fontSize: '1.6rem', maxWidth: 540 }}>Turn your skills, your old phone, even your jollof recipe into cash. Free for students.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => onNav?.('partner')}>Become a seller <Icon n="arrow-right" /></button>
      </div>
    </DesktopShell>
  );
}

// ---------- MARKET (desktop) ----------
function MarketDesktop({ onNav }) {
  return (
    <DesktopShell page="market" onNav={onNav}>
      <div style={{ padding: '32px 40px 0' }}>
        <h1 style={{ fontSize: '4.8rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px' }}>Marketplace</h1>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '1.5rem' }}>2,184 items from 312 verified UNILAG sellers</p>
      </div>
      <div style={{ padding: '32px 40px 0', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }}>
        {/* Filters sidebar */}
        <aside>
          <div className="card" style={{ padding: 20, position: 'sticky', top: 100 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.3rem', textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--ink-3)' }}>Category</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['All', 'Electronics', 'Books', 'Fashion', 'Food', 'Beauty', 'Accessories'].map((c, i) => (
                <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 6, fontSize: '1.4rem', cursor: 'pointer' }}>
                  <input type="radio" name="cat" defaultChecked={i === 0} /> {c}
                  <span style={{ marginLeft: 'auto', color: 'var(--ink-3)', fontSize: '1.2rem' }}>{[2184, 412, 304, 198, 156, 78, 124][i]}</span>
                </label>
              ))}
            </div>
            <div style={{ height: 1, background: 'var(--line)', margin: '20px 0' }} />
            <h3 style={{ margin: '0 0 12px', fontSize: '1.3rem', textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--ink-3)' }}>Price (₦)</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="input" placeholder="Min" defaultValue="0" />
              <input className="input" placeholder="Max" defaultValue="500,000" />
            </div>
            <div style={{ position: 'relative', height: 4, background: 'var(--line)', borderRadius: 4, marginBottom: 20 }}>
              <div style={{ position: 'absolute', left: '5%', right: '40%', height: '100%', background: 'var(--accent)', borderRadius: 4 }} />
              <span style={{ position: 'absolute', left: '5%', top: -7, width: 18, height: 18, background: '#fff', border: '3px solid var(--accent)', borderRadius: '50%', transform: 'translateX(-50%)' }} />
              <span style={{ position: 'absolute', left: '60%', top: -7, width: 18, height: 18, background: '#fff', border: '3px solid var(--accent)', borderRadius: '50%', transform: 'translateX(-50%)' }} />
            </div>
            <div style={{ height: 1, background: 'var(--line)', margin: '20px 0' }} />
            <h3 style={{ margin: '0 0 12px', fontSize: '1.3rem', textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--ink-3)' }}>Condition</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['New', 'Like new', 'Good', 'Fair'].map(c => (
                <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.4rem' }}>
                  <input type="checkbox" defaultChecked={c === 'Like new' || c === 'Good'} /> {c}
                </label>
              ))}
            </div>
            <div style={{ height: 1, background: 'var(--line)', margin: '20px 0' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.4rem', fontWeight: 600 }}>
              <input type="checkbox" defaultChecked /> Verified sellers only <Icon n="circle-check" style={{ color: 'var(--accent)' }} />
            </label>
          </div>
        </aside>

        {/* grid */}
        <main>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '1.4rem', color: 'var(--ink-2)' }}>Showing <strong style={{ color: 'var(--ink-1)' }}>312</strong> results</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm">Newest <Icon n="chevron-down" /></button>
              <button className="btn btn-ghost btn-sm" style={{ background: 'var(--white)' }}><Icon n="grip" /></button>
              <button className="btn btn-ghost btn-sm" style={{ background: 'var(--surface)' }}><Icon n="list" /></button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {(window.PRODUCTS || []).map(p => (
              <div key={p.id} className="product-card" onClick={() => onNav?.('product', p.id)}>
                <div className="product-thumb">{p.tag && <span className="product-tag">{p.tag}</span>}<button className="product-fav"><IconR n="heart" /></button><Ph kind={p.kind} label={p.cat} /></div>
                <div className="product-meta">
                  <div className="product-name">{p.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div className="product-price">{naira(p.price)}</div>
                    <div className="rating" style={{ fontSize: '1.1rem' }}><Icon n="star" className="star" /> {p.rating}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </DesktopShell>
  );
}

// ---------- MESSAGES (desktop) ----------
function MessagesDesktop({ onNav }) {
  const CONVOS = [
    { id: 1, name: 'Tunde A.', last: 'Yes the iPhone is still available 🙌', time: '2m', unread: 2, online: true, kind: 'portrait-3' },
    { id: 2, name: 'Adaeze O.', last: 'Sent the design files', time: '1h', unread: 0, online: true, kind: 'portrait-1' },
    { id: 3, name: 'Chiamaka I.', last: 'See you at 4pm in Mass Comm', time: '3h', unread: 0, online: false, kind: 'portrait-2' },
    { id: 4, name: 'Femi B.', last: 'Photoshoot rate ₦15k flat', time: '1d', unread: 0, online: false, kind: 'portrait-4' },
    { id: 5, name: 'Sr Eze (Food)', last: 'Jollof ready 🍚', time: 'Yesterday', unread: 1, online: true, kind: 'portrait-5' },
  ];
  return (
    <DesktopShell page="messages" onNav={onNav}>
      <div style={{ padding: '32px 40px 60px', height: 'calc(100vh - 80px)', minHeight: 720 }}>
        <h1 style={{ fontSize: '3.6rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 20px' }}>Messages</h1>
        <div className="card" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', height: 640, padding: 0, overflow: 'hidden' }}>
          <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--line)' }}>
              <div className="search-wrap"><Icon n="magnifying-glass" className="search-icon" /><input className="input" placeholder="Search…" /></div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {CONVOS.map((c, i) => (
                <div key={c.id} style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', background: i === 0 ? 'rgba(249,115,22,.06)' : 'transparent', borderLeft: i === 0 ? '3px solid var(--accent)' : '3px solid transparent' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden' }}><Ph kind={c.kind} label={c.name[0]} /></div>
                    {c.online && <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: 'var(--online)', border: '2px solid #fff' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '1.4rem' }}>{c.name}</strong>
                      <span style={{ fontSize: '1.1rem', color: c.unread ? 'var(--accent)' : 'var(--ink-3)', fontWeight: c.unread ? 700 : 400 }}>{c.time}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: '1.3rem', color: c.unread ? 'var(--ink-1)' : 'var(--ink-3)', fontWeight: c.unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last}</span>
                      {c.unread > 0 && <span style={{ background: 'var(--accent)', color: '#fff', minWidth: 18, height: 18, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}>{c.unread}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden' }}><Ph kind="portrait-3" label="T" /></div>
                <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: 'var(--online)', border: '2px solid #fff' }} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '1.5rem' }}>Tunde A. <Icon n="circle-check" style={{ color: 'var(--accent)', fontSize: '1.2rem' }} /></strong>
                <div style={{ fontSize: '1.2rem', color: 'var(--online)' }}>Online · Active now</div>
              </div>
              <button className="icon-btn"><Icon n="phone" /></button>
              <button className="icon-btn"><Icon n="video" /></button>
              <button className="icon-btn"><Icon n="circle-info" /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface)' }}>
              <div style={{ alignSelf: 'center', fontSize: '1.1rem', color: 'var(--ink-3)', fontWeight: 600, padding: '4px 12px', background: '#fff', borderRadius: 'var(--r-pill)' }}>Today</div>
              <div style={{ alignSelf: 'flex-end', maxWidth: 320, background: '#fff', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ height: 140 }}><Ph kind="electronics" label="iPhone 12" /></div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 600 }}>iPhone 12 — 128GB</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>{naira(285000)}</div>
                </div>
              </div>
              {[
                { side: 'me', t: 'Hey Tunde, is the iPhone 12 still available?' },
                { side: 'them', t: "Yes! Still here. 92% battery health, original charger and box." },
                { side: 'me', t: "Great, can we meet at MBA hall today around 4?" },
                { side: 'them', t: "Sounds good 🤝" },
                { side: 'them', t: "Yes the iPhone is still available 🙌" },
              ].map((m, i) => (
                <div key={i} style={{ alignSelf: m.side === 'me' ? 'flex-end' : 'flex-start', maxWidth: '60%' }}>
                  <div style={{
                    background: m.side === 'me' ? 'var(--accent)' : '#fff',
                    color: m.side === 'me' ? '#fff' : 'var(--ink-1)',
                    padding: '12px 16px', borderRadius: m.side === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    fontSize: '1.4rem', lineHeight: 1.4
                  }}>{m.t}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 16, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="icon-btn"><Icon n="paperclip" /></button>
              <button className="icon-btn"><Icon n="image" /></button>
              <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 'var(--r-pill)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '1.4rem', fontFamily: 'var(--font-sans)' }} placeholder="Type a message…" defaultValue="Sounds good 🤝" />
                <button className="icon-btn" style={{ width: 30, height: 30 }}><Icon n="face-smile" /></button>
              </div>
              <button className="btn btn-primary"><Icon n="paper-plane" /> Send</button>
            </div>
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}

// ---------- CART (desktop) ----------
function CartDesktop({ onNav }) {
  const items = [
    { id: 1, name: 'iPhone 12 — 128GB', price: 285000, qty: 1, kind: 'electronics', cat: 'Tech', seller: 'Tunde A.' },
    { id: 3, name: 'Air Force 1 — UK 9', price: 32000, qty: 1, kind: 'clothing', cat: 'Fashion', seller: 'Adaeze O.' },
    { id: 8, name: 'Senior Eze jollof', price: 1500, qty: 2, kind: 'food', cat: 'Food', seller: 'Sr Eze' },
  ];
  const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
  return (
    <DesktopShell page="cart" onNav={onNav}>
      <div style={{ padding: '32px 40px 60px' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px' }}>Your cart</h1>
        <p style={{ margin: '0 0 32px', color: 'var(--ink-2)', fontSize: '1.5rem' }}>3 items from 3 sellers</p>

        <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 32 }}>
          {['Cart', 'Delivery', 'Payment'].map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: '50%', background: i === 0 ? 'var(--accent)' : 'var(--surface)', color: i === 0 ? '#fff' : 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{i + 1}</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 600, color: i === 0 ? 'var(--ink-1)' : 'var(--ink-3)' }}>{s}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, maxWidth: 100, height: 2, background: 'var(--line)' }} />}
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(it => (
              <div key={it.id} className="card" style={{ padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 96, height: 96, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}><Ph kind={it.kind} label={it.cat} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{it.name}</div>
                  <div style={{ fontSize: '1.3rem', color: 'var(--ink-3)', marginTop: 2 }}>by {it.seller}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)', marginTop: 6 }}>{naira(it.price)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 4, background: 'var(--surface)', borderRadius: 'var(--r-pill)' }}>
                  <button className="icon-btn" style={{ width: 32, height: 32, background: '#fff' }}><Icon n="minus" /></button>
                  <span style={{ width: 24, textAlign: 'center', fontWeight: 700 }}>{it.qty}</span>
                  <button className="icon-btn" style={{ width: 32, height: 32, background: '#fff' }}><Icon n="plus" /></button>
                </div>
                <button className="icon-btn" style={{ color: 'var(--ink-3)' }}><IconR n="trash-can" /></button>
              </div>
            ))}
          </div>
          <aside>
            <div style={{ background: 'var(--navy-800)', color: '#fff', borderRadius: 'var(--r-xl)', padding: 28, position: 'sticky', top: 100 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.8rem', fontWeight: 700 }}>Order summary</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '1.4rem', opacity: .85 }}><span>Subtotal</span><span>{naira(sub)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '1.4rem', opacity: .85 }}><span>Delivery (Akoka)</span><span>{naira(1500)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '1.4rem', opacity: .85 }}><span>UMP Protection</span><span>Free</span></div>
              <div style={{ height: 1, background: 'rgba(255,255,255,.1)', margin: '14px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: '1.5rem' }}>Total</span>
                <span style={{ fontSize: '3.2rem', fontWeight: 800, color: 'var(--accent)' }}>{naira(sub + 1500)}</span>
              </div>
              <button className="btn btn-primary btn-lg btn-block">Continue to delivery <Icon n="arrow-right" /></button>
              <p style={{ textAlign: 'center', marginTop: 14, fontSize: '1.2rem', opacity: .6 }}><Icon n="shield-halved" /> Secured by Paystack</p>
            </div>
          </aside>
        </div>
      </div>
    </DesktopShell>
  );
}

// desktop nav styles
const styleEl = document.createElement('style');
styleEl.textContent = `
.desk-nav {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 40px;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}
.desk-nav.frosted {
  background: rgba(250,250,247,.78);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
}
.desk-nav.dark {
  background: var(--navy-800);
  color: #fff;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.desk-nav.dark a { color: #fff !important; }
.desk-nav.dark .icon-btn { color: #fff; }
.desk-nav.dark .input { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.1); color: #fff; }
.desk-nav.dark .input::placeholder { color: rgba(255,255,255,.5); }
`;
document.head.appendChild(styleEl);

window.HomeDesktop = HomeDesktop;
window.MarketDesktop = MarketDesktop;
window.MessagesDesktop = MessagesDesktop;
window.CartDesktop = CartDesktop;
