/* global React */

// ---------- PRODUCT DETAIL (mobile) ----------
function ProductDetail({ id = 1, onNav }) {
  const p = (window.PRODUCTS || []).find(x => x.id === id) || (window.PRODUCTS || [])[0];
  const [tab, setTab] = React.useState('details');
  const [qty, setQty] = React.useState(1);
  const [thumb, setThumb] = React.useState(0);
  if (!p) return null;
  return (
    <div className="phone-scroll">
      {/* sticky back */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(250,250,247,.85)', backdropFilter: 'blur(12px)' }}>
        <button className="icon-btn" style={{ background: 'var(--white)', border: '1px solid var(--line)' }} onClick={() => onNav?.('market')}>
          <Icon n="arrow-left" />
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn" style={{ background: 'var(--white)', border: '1px solid var(--line)' }}><Icon n="share-nodes" /></button>
          <button className="icon-btn" style={{ background: 'var(--white)', border: '1px solid var(--line)' }}><IconR n="heart" /></button>
        </div>
      </div>

      {/* gallery */}
      <div style={{ aspectRatio: '1/1', margin: '0 16px', borderRadius: 'var(--r-2xl)', overflow: 'hidden', position: 'relative' }}>
        <Ph kind={p.kind} label={p.cat} />
        <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
          {[0,1,2,3].map(i => (
            <span key={i} style={{ width: i === thumb ? 24 : 6, height: 6, borderRadius: 6, background: i === thumb ? '#fff' : 'rgba(255,255,255,.5)' }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
        {[0,1,2,3].map(i => (
          <button key={i} onClick={() => setThumb(i)} style={{ flex: 1, aspectRatio: '1/1', borderRadius: 12, overflow: 'hidden', border: i === thumb ? '2px solid var(--accent)' : '1px solid var(--line)', padding: 0, background: 'transparent' }}>
            <Ph kind={p.kind} label="" />
          </button>
        ))}
      </div>

      {/* info */}
      <div style={{ padding: '20px 16px 0' }}>
        <span className="chip outline" style={{ marginBottom: 10 }}>{p.cat}</span>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '6px 0 10px', lineHeight: 1.15 }}>{p.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.02em' }}>{naira(p.price)}</span>
          {p.tag === '-30%' && <span style={{ textDecoration: 'line-through', color: 'var(--ink-3)', fontSize: '1.4rem' }}>{naira(p.price * 1.4)}</span>}
        </div>
        <div className="rating" style={{ fontSize: '1.4rem' }}>
          <Icon n="star" className="star" /> {p.rating} <span className="count">· 24 reviews · 132 sold</span>
        </div>
      </div>

      {/* seller */}
      <div style={{ margin: '20px 16px 0', padding: 14, border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden' }}>
          <Ph kind="portrait-3" label="T" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ fontSize: '1.4rem' }}>Tunde A.</strong>
            <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 6, padding: '1px 6px', fontSize: '1rem', fontWeight: 700 }}><Icon n="check" /> VERIFIED</span>
          </div>
          <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)' }}>132 sales · Akoka, UNILAG</div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => onNav?.('messages')}><Icon n="comment" /> Chat</button>
      </div>

      {/* tabs */}
      <div style={{ padding: '20px 16px 0' }}>
        <div className="tabs">
          <button className={`tab ${tab === 'details' ? 'active' : ''}`} onClick={() => setTab('details')}>Details</button>
          <button className={`tab ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>Reviews (24)</button>
          <button className={`tab ${tab === 'shipping' ? 'active' : ''}`} onClick={() => setTab('shipping')}>Delivery</button>
        </div>
      </div>

      {/* tab content */}
      <div style={{ padding: '16px 16px 0' }}>
        {tab === 'details' && (
          <div>
            <p style={{ fontSize: '1.4rem', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
              Used for 8 months, no scratches, comes with original charger and box. Battery health 92%. Selling because I’m upgrading. Available for inspection at Moremi Hall.
            </p>
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Storage', '128GB'],
                ['Color', 'Pacific Blue'],
                ['Battery', '92%'],
                ['Condition', 'Like new'],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: 12, background: 'var(--surface)', borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>{k}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 600, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontSize: '3.6rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em' }}>4.8</div>
                <div className="rating"><Icon n="star" className="star" /><Icon n="star" className="star" /><Icon n="star" className="star" /><Icon n="star" className="star" /><Icon n="star-half-stroke" className="star" /></div>
              </div>
              <div style={{ flex: 1 }}>
                {[5,4,3,2,1].map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '1.1rem' }}>
                    <span style={{ width: 8 }}>{s}</span>
                    <div style={{ flex: 1, height: 4, background: 'var(--line)', borderRadius: 4 }}>
                      <div style={{ width: `${[78,18,3,1,0][5-s]}%`, height: '100%', background: 'var(--accent)', borderRadius: 4 }} />
                    </div>
                    <span style={{ width: 24, textAlign: 'right', color: 'var(--ink-3)' }}>{[19,4,1,0,0][5-s]}</span>
                  </div>
                ))}
              </div>
            </div>
            {[
              { name: 'Chiamaka I.', stars: 5, date: '3 days ago', text: 'Phone is in perfect condition, exactly as described. Tunde even threw in a phone case. Highly recommend.' },
              { name: 'Femi B.', stars: 4, date: '1 week ago', text: 'Great seller. Battery health was as advertised. Met up at MBA hall, smooth transaction.' },
            ].map(r => (
              <div key={r.name} style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: '1.3rem' }}>{r.name}</strong>
                  <span style={{ fontSize: '1.1rem', color: 'var(--ink-3)' }}>{r.date}</span>
                </div>
                <div className="rating" style={{ marginBottom: 6 }}>
                  {Array.from({length: 5}).map((_,i) => <Icon key={i} n="star" className={i < r.stars ? 'star' : ''} style={i >= r.stars ? { color: 'var(--ink-4)' } : {}} />)}
                </div>
                <p style={{ margin: 0, fontSize: '1.3rem', color: 'var(--ink-2)', lineHeight: 1.5 }}>{r.text}</p>
              </div>
            ))}
          </div>
        )}
        {tab === 'shipping' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { i: 'truck-fast', t: 'Same-day delivery', s: 'Akoka, Yaba, Bariga · ₦1,500' },
              { i: 'box', t: 'Pickup', s: 'Meet at Moremi Hall · Free' },
              { i: 'shield-halved', t: 'UMP Protection', s: 'Get a refund if it arrives damaged' },
            ].map(o => (
              <div key={o.t} style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
                  <Icon n={o.i} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.4rem' }}>{o.t}</div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)' }}>{o.s}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* related */}
      <div className="section-title"><h2>You might also like</h2></div>
      <div className="h-scroll">
        {(window.PRODUCTS || []).slice(2, 6).map(rp => (
          <div key={rp.id} className="product-card" style={{ minWidth: 150 }} onClick={() => onNav?.('product', rp.id)}>
            <div className="product-thumb"><Ph kind={rp.kind} label={rp.cat} /></div>
            <div className="product-meta">
              <div className="product-name">{rp.name}</div>
              <div className="product-price">{naira(rp.price)}</div>
            </div>
          </div>
        ))}
      </div>

      <Footer />
      <div style={{ height: 100 }} />

      {/* sticky cart bar */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 'var(--r-pill)', padding: 6, display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-pop)', zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px' }}>
          <button className="icon-btn" style={{ width: 32, height: 32, background: 'var(--surface)', borderRadius: 12 }} onClick={() => setQty(Math.max(1, qty - 1))}><Icon n="minus" /></button>
          <span style={{ width: 32, textAlign: 'center', fontWeight: 700 }}>{qty}</span>
          <button className="icon-btn" style={{ width: 32, height: 32, background: 'var(--surface)', borderRadius: 12 }} onClick={() => setQty(qty + 1)}><Icon n="plus" /></button>
        </div>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onNav?.('cart')}>
          <Icon n="bag-shopping" /> Add — {naira(p.price * qty)}
        </button>
      </div>
    </div>
  );
}

window.ProductDetail = ProductDetail;
