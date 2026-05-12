/* global React */
const { useState: useS_home } = React;

// ---------- HOME (mobile) ----------
function HomeMobile({ heroVariant = 'image', onNav }) {
  return (
    <div className="phone-scroll">
      <Navbar frosted page="home" onNav={onNav} onProfileClick={() => onNav?.('profile')} />

      {/* Hero */}
      {heroVariant === 'image' ? (
        <div style={{ position: 'relative', margin: '12px 16px 0', borderRadius: 'var(--r-2xl)', overflow: 'hidden', height: 380 }}>
          <Ph kind="campus" label="campus lifestyle" style={{ position: 'absolute', inset: 0 }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, rgba(15,23,42,.4) 0%, rgba(15,23,42,.85) 70%)'
          }} />
          <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 24, color: '#fff' }}>
            <span className="chip accent" style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
              <Icon n="bolt" /> UNILAG · 2,400+ active
            </span>
            <h1 style={{ fontSize: '3.4rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.05 }}>
              Shop smart.<br/>Live better.<br/><span style={{ color: 'var(--accent)' }}>Study harder.</span>
            </h1>
            <p style={{ fontSize: '1.4rem', opacity: .85, marginTop: 14, marginBottom: 18, maxWidth: 280 }}>
              Your campus, your marketplace. Built by students for students.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => onNav?.('market')}>
                Explore market <Icon n="arrow-right" />
              </button>
              <button className="btn" style={{ background: 'rgba(255,255,255,.14)', color: '#fff', backdropFilter: 'blur(10px)' }} onClick={() => onNav?.('services')}>
                Offer a service
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hero-grad" style={{ margin: '12px 16px 0', borderRadius: 'var(--r-2xl)', padding: 24, color: '#fff' }}>
          <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', marginBottom: 14 }}>
            <Icon n="bolt" /> UNILAG · 2,400+ students
          </span>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 }}>
            Shop smart. Live better. <span style={{ color: 'var(--accent)' }}>Study harder.</span>
          </h1>
          <p style={{ fontSize: '1.4rem', opacity: .8, marginTop: 12, marginBottom: 16 }}>
            Your campus, your marketplace.
          </p>
          {/* Split graphic */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            <div style={{ aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden' }}><Ph kind="electronics" label="electronics" /></div>
            <div style={{ aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden' }}><Ph kind="clothing" label="fashion" /></div>
            <div style={{ aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden' }}><Ph kind="books" label="books" /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-block" onClick={() => onNav?.('market')}>
              Explore market <Icon n="arrow-right" />
            </button>
          </div>
        </div>
      )}

      {/* Quick search */}
      <div style={{ padding: '20px 16px 0' }}>
        <div className="search-wrap">
          <Icon n="magnifying-glass" className="search-icon" />
          <input className="input" placeholder="Try ‘calculus textbook’ or ‘iPhone 12’" />
        </div>
      </div>

      {/* Categories */}
      <div className="section-title"><h2>Browse by category</h2></div>
      <div className="cat-row">
        {[
          { i: 'laptop', l: 'Tech' },
          { i: 'shirt', l: 'Fashion' },
          { i: 'book', l: 'Books' },
          { i: 'utensils', l: 'Food' },
          { i: 'bed', l: 'Hostel' },
          { i: 'graduation-cap', l: 'Tutors' },
          { i: 'palette', l: 'Design' },
        ].map((c, i) => (
          <div key={c.l} className={`cat-pill ${i === 0 ? 'active' : ''}`}>
            <div className="ico"><Icon n={c.i} /></div>
            <span>{c.l}</span>
          </div>
        ))}
      </div>

      {/* Advert slider */}
      <div style={{ margin: '24px 16px 0' }}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
          {[
            { bg: 'linear-gradient(135deg,#ea580c,#7c2d12)', t: 'Free delivery in Akoka', s: 'Orders over ₦15,000' },
            { bg: 'linear-gradient(135deg,#1e40af,#312e81)', t: 'Become a verified seller', s: 'Get the orange tick' },
          ].map((s, i) => (
            <div key={i} style={{ minWidth: '85%', borderRadius: 'var(--r-xl)', padding: 22, color: '#fff', background: s.bg, position: 'relative', overflow: 'hidden' }}>
              <span className="chip" style={{ background: 'rgba(255,255,255,.18)', color: '#fff', marginBottom: 10 }}>SPONSORED</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{s.t}</h3>
              <p style={{ margin: 0, opacity: .85, fontSize: '1.3rem' }}>{s.s}</p>
              <button className="btn btn-sm" style={{ background: '#fff', color: '#0f172a', marginTop: 12 }}>Learn more <Icon n="arrow-right" /></button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          <span style={{ width: 20, height: 4, borderRadius: 4, background: 'var(--accent)' }} />
          <span style={{ width: 6, height: 4, borderRadius: 4, background: 'var(--line-strong)' }} />
        </div>
      </div>

      {/* Trending */}
      <div className="section-title">
        <h2>Trending now <Icon n="fire" style={{ color: 'var(--accent)' }} /></h2>
        <span className="more">See all</span>
      </div>
      <div className="h-scroll">
        {TRENDING.map(p => (
          <div key={p.id} className="product-card" style={{ minWidth: 160 }} onClick={() => onNav?.('product', p.id)}>
            <div className="product-thumb">
              <span className="product-tag">{p.tag}</span>
              <button className="product-fav"><IconR n="heart" /></button>
              <Ph kind={p.kind} label={p.cat} />
            </div>
            <div className="product-meta">
              <div className="product-name">{p.name}</div>
              <div className="product-price">{naira(p.price)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* What we do */}
      <div className="section-title"><h2>What we do</h2></div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { i: 'store', t: 'Campus marketplace', s: 'Buy and sell anything from textbooks to laptops with verified UNILAG students.', c: 'var(--accent)' },
          { i: 'users', t: 'Community first', s: 'Real students, real reviews. Every seller verified by UNILAG email.', c: '#2563eb' },
          { i: 'bolt', t: 'Fast & reliable', s: 'Same-day delivery on Akoka, Yaba and Bariga. Pay only when you trust.', c: '#16a34a' },
        ].map(f => (
          <div key={f.t} className="card" style={{ padding: 20, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${f.c}1a`, color: f.c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>
              <Icon n={f.i} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 700 }}>{f.t}</h3>
              <p style={{ margin: 0, fontSize: '1.3rem', color: 'var(--ink-2)' }}>{f.s}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Featured creators */}
      <div className="section-title">
        <h2>Top creators on campus</h2>
        <span className="more">See all</span>
      </div>
      <div className="h-scroll">
        {CREATORS.map(c => (
          <div key={c.name} className="card" style={{ minWidth: 180, padding: 16, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', margin: '4px auto 10px', border: '2px solid var(--accent)' }}>
              <Ph kind={c.kind} label={c.name.split(' ')[0]} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.4rem' }}>{c.name}</div>
            <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)', marginTop: 2 }}>{c.role}</div>
            <div className="rating" style={{ justifyContent: 'center', marginTop: 6 }}>
              <Icon n="star" className="star" /> {c.rating} <span className="count">({c.reviews})</span>
            </div>
            <button className="btn btn-sm btn-ghost" style={{ marginTop: 10, width: '100%' }}>Visit store</button>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ margin: '32px 16px', padding: 28, borderRadius: 'var(--r-2xl)', background: 'linear-gradient(135deg, var(--navy-800), #1e1b4b)', color: '#fff', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Sell what you’ve got</h2>
        <p style={{ margin: '0 0 18px', opacity: .8 }}>Turn your skills, books or old phone into cash. Free for students.</p>
        <button className="btn btn-primary" onClick={() => onNav?.('partner')}>Become a seller <Icon n="arrow-right" /></button>
      </div>

      <Footer />
      <div style={{ height: 80 }} />
      <BottomNav active="home" onNav={onNav} />
    </div>
  );
}

const TRENDING = [
  { id: 1, name: 'iPhone 12 — 128GB', price: 285000, kind: 'electronics', cat: 'Phones', tag: 'HOT' },
  { id: 2, name: 'Calculus by Stewart 8th ed.', price: 4500, kind: 'books', cat: 'Books', tag: 'NEW' },
  { id: 3, name: 'Nike Air Force 1 — UK 9', price: 32000, kind: 'clothing', cat: 'Sneakers', tag: '-30%' },
  { id: 4, name: 'HP Pavilion x360 — i5', price: 285000, kind: 'electronics', cat: 'Laptops', tag: 'VERIFIED' },
  { id: 5, name: 'Zaron lipgloss bundle', price: 8500, kind: 'beauty', cat: 'Beauty', tag: '' },
  { id: 6, name: 'Casio fx‑991ES', price: 6500, kind: 'electronics', cat: 'Calculators', tag: '' },
];

const CREATORS = [
  { name: 'Adaeze O.', role: 'Graphic Designer', rating: 4.9, reviews: 47, kind: 'portrait-1' },
  { name: 'Tunde A.', role: 'Verified Seller', rating: 4.8, reviews: 132, kind: 'portrait-3' },
  { name: 'Chiamaka I.', role: 'Math Tutor', rating: 5.0, reviews: 28, kind: 'portrait-2' },
  { name: 'Femi B.', role: 'Photographer', rating: 4.7, reviews: 64, kind: 'portrait-4' },
];

window.HomeMobile = HomeMobile;
window.TRENDING = TRENDING;
window.CREATORS = CREATORS;
