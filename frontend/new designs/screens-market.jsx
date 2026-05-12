/* global React */

// ---------- MARKETPLACE (mobile) ----------
function MarketMobile({ cardVariant = 'always', onNav }) {
  const [cat, setCat] = React.useState('All');
  const cats = ['All', 'Electronics', 'Books', 'Fashion', 'Food', 'Beauty', 'Other'];
  return (
    <div className="phone-scroll">
      <Navbar onNav={onNav} onProfileClick={() => onNav?.('profile')} />

      <div style={{ padding: '12px 16px 0' }}>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0 4px' }}>Marketplace</h1>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '1.3rem' }}>2,184 items from 312 verified UNILAG sellers</p>
      </div>

      {/* search + filter */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8 }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <Icon n="magnifying-glass" className="search-icon" />
          <input className="input" placeholder="Search marketplace…" />
        </div>
        <button className="icon-btn" style={{ background: 'var(--navy-800)', color: '#fff', width: 48, height: 48, borderRadius: 'var(--r-md)' }}>
          <Icon n="sliders" />
        </button>
      </div>

      {/* category chips */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {cats.map(c => (
            <span key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</span>
          ))}
        </div>
      </div>

      {/* sort row */}
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '1.2rem', color: 'var(--ink-3)', fontWeight: 600 }}>Showing 312 results</span>
        <span style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--ink-1)' }}>
          Sort: Newest <Icon n="chevron-down" style={{ fontSize: '1.1rem', marginLeft: 4 }} />
        </span>
      </div>

      {/* product grid */}
      <div style={{ padding: '14px 16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {PRODUCTS.map(p => (
          <ProductCard key={p.id} p={p} variant={cardVariant} onClick={() => onNav?.('product', p.id)} />
        ))}
      </div>

      <Footer />
      <div style={{ height: 80 }} />
      <BottomNav active="market" onNav={onNav} />
    </div>
  );
}

function ProductCard({ p, variant = 'always', onClick }) {
  const cls = `product-card${variant === 'hover' ? ' hover-reveal' : ''}`;
  return (
    <div className={cls} onClick={onClick}>
      <div className="product-thumb">
        {p.tag && <span className="product-tag">{p.tag}</span>}
        <button className="product-fav" onClick={(e) => e.stopPropagation()}><IconR n="heart" /></button>
        <Ph kind={p.kind} label={p.cat} />
      </div>
      <div className="product-meta">
        <div className="product-name">{p.name}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 }}>
          <div className="product-price">{naira(p.price)}</div>
          {p.rating && <div className="rating" style={{ fontSize: '1.1rem' }}><Icon n="star" className="star" /> {p.rating}</div>}
        </div>
      </div>
      {variant === 'always' ? (
        <div className="product-actions">
          <button className="icon-btn" onClick={(e) => e.stopPropagation()}><IconR n="eye" /></button>
          <button className="icon-btn primary" onClick={(e) => e.stopPropagation()}><Icon n="bag-shopping" /> Add</button>
        </div>
      ) : (
        <div className="product-actions">
          <button className="icon-btn" onClick={(e) => e.stopPropagation()}><IconR n="eye" /></button>
          <button className="icon-btn primary" onClick={(e) => e.stopPropagation()}><Icon n="bag-shopping" /> Add to cart</button>
        </div>
      )}
    </div>
  );
}

const PRODUCTS = [
  { id: 1, name: 'iPhone 12 — 128GB', price: 285000, kind: 'electronics', cat: 'Electronics', tag: 'HOT', rating: 4.8 },
  { id: 2, name: 'Calculus 8th ed.', price: 4500, kind: 'books', cat: 'Books', tag: '', rating: 4.6 },
  { id: 3, name: 'Air Force 1 — UK 9', price: 32000, kind: 'clothing', cat: 'Fashion', tag: '-30%', rating: 4.9 },
  { id: 4, name: 'HP Pavilion x360', price: 285000, kind: 'electronics', cat: 'Electronics', tag: '', rating: 4.7 },
  { id: 5, name: 'Zaron lipgloss', price: 8500, kind: 'beauty', cat: 'Beauty', tag: 'NEW', rating: 4.5 },
  { id: 6, name: 'Casio fx-991ES', price: 6500, kind: 'electronics', cat: 'Electronics', tag: '', rating: 5.0 },
  { id: 7, name: 'Adidas backpack', price: 12500, kind: 'accessories', cat: 'Fashion', tag: '', rating: 4.4 },
  { id: 8, name: 'Senior Eze jollof bowl', price: 1500, kind: 'food', cat: 'Food', tag: 'HOT', rating: 4.9 },
  { id: 9, name: 'Engineering Maths', price: 3500, kind: 'books', cat: 'Books', tag: '', rating: 4.3 },
  { id: 10, name: 'Wireless earbuds', price: 18500, kind: 'electronics', cat: 'Electronics', tag: '', rating: 4.6 },
];

window.MarketMobile = MarketMobile;
window.ProductCard = ProductCard;
window.PRODUCTS = PRODUCTS;
