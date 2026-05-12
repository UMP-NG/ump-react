/* global React */

// ---------- CART (mobile, 3 steps) ----------
function CartMobile({ step = 1, onNav, onStep }) {
  return (
    <div className="phone-scroll">
      <Navbar onNav={onNav} onProfileClick={() => onNav?.('profile')} />

      <div style={{ padding: '12px 16px 0' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0 0' }}>Checkout</h1>
      </div>

      <div className="steps">
        {[
          { n: 1, l: 'Cart' },
          { n: 2, l: 'Delivery' },
          { n: 3, l: 'Payment' },
        ].map(s => (
          <div key={s.n} className={`step ${step === s.n ? 'active' : ''} ${step > s.n ? 'done' : ''}`}>
            <div className="step-bar" />
            <div className="step-label">{step > s.n && <Icon n="check" />} Step {s.n} · {s.l}</div>
          </div>
        ))}
      </div>

      {step === 1 && <CartStep1 onNext={() => onStep?.(2)} />}
      {step === 2 && <CartStep2 onNext={() => onStep?.(3)} onBack={() => onStep?.(1)} />}
      {step === 3 && <CartStep3 onNav={onNav} onBack={() => onStep?.(2)} />}

      <Footer />
      <div style={{ height: 100 }} />
    </div>
  );
}

const CART_ITEMS = [
  { id: 1, name: 'iPhone 12 — 128GB', price: 285000, qty: 1, kind: 'electronics', cat: 'Tech', seller: 'Tunde A.' },
  { id: 3, name: 'Air Force 1 — UK 9', price: 32000, qty: 1, kind: 'clothing', cat: 'Fashion', seller: 'Adaeze O.' },
  { id: 8, name: 'Senior Eze jollof', price: 1500, qty: 2, kind: 'food', cat: 'Food', seller: 'Sr Eze' },
];

function summary() {
  const sub = CART_ITEMS.reduce((s, i) => s + i.price * i.qty, 0);
  return { sub, ship: 1500, total: sub + 1500 };
}

function CartStep1({ onNext }) {
  const { sub, ship, total } = summary();
  return (
    <>
      <div style={{ padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {CART_ITEMS.map(it => (
          <div key={it.id} className="card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
              <Ph kind={it.kind} label={it.cat} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 600, lineHeight: 1.3 }}>{it.name}</div>
              <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)', marginTop: 2 }}>by {it.seller}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: 6, color: 'var(--accent)' }}>{naira(it.price)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <button className="icon-btn" style={{ color: 'var(--ink-3)', width: 28, height: 28 }}><IconR n="trash-can" /></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 4, background: 'var(--surface)', borderRadius: 'var(--r-pill)' }}>
                <button className="icon-btn" style={{ width: 24, height: 24, background: '#fff', fontSize: '1rem' }}><Icon n="minus" /></button>
                <span style={{ width: 18, textAlign: 'center', fontWeight: 700, fontSize: '1.2rem' }}>{it.qty}</span>
                <button className="icon-btn" style={{ width: 24, height: 24, background: '#fff', fontSize: '1rem' }}><Icon n="plus" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ margin: '16px 16px 0', padding: 16, background: 'var(--navy-800)', color: '#fff', borderRadius: 'var(--r-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '1.3rem', opacity: .8 }}><span>Subtotal</span><span>{naira(sub)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '1.3rem', opacity: .8 }}><span>Delivery (Akoka)</span><span>{naira(ship)}</span></div>
        <div style={{ height: 1, background: 'rgba(255,255,255,.1)', margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.4rem' }}>Total</span>
          <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--accent)' }}>{naira(total)}</span>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <button className="btn btn-primary btn-block btn-lg" onClick={onNext}>
          Proceed to delivery <Icon n="arrow-right" />
        </button>
      </div>
    </>
  );
}

function CartStep2({ onNext, onBack }) {
  return (
    <div style={{ padding: '8px 16px 0' }}>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="label">Full name</div>
        <input className="input" defaultValue="Aisha Ogundimu" />
        <div style={{ height: 12 }} />
        <div className="label">Phone number</div>
        <input className="input" defaultValue="+234 813 555 7724" />
        <div style={{ height: 12 }} />
        <div className="label">Delivery address</div>
        <textarea className="textarea" defaultValue="Moremi Hall, Block C, Room 214, UNILAG Akoka" />
        <div style={{ height: 12 }} />
        <div className="label">Landmark (optional)</div>
        <input className="input" placeholder="Near 1004 quarters" />
        <div style={{ height: 12 }} />
        <div className="label">Preferred delivery time</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Now', 'Today', 'Tomorrow'].map((t, i) => (
            <span key={t} className={`chip ${i === 1 ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" onClick={onBack}><Icon n="arrow-left" /></button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={onNext}>
          Continue to payment <Icon n="arrow-right" />
        </button>
      </div>
    </div>
  );
}

function CartStep3({ onNav, onBack }) {
  const { sub, ship, total } = summary();
  return (
    <div style={{ padding: '8px 16px 0' }}>
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1.5rem', fontWeight: 700 }}>Order summary</h3>
        {CART_ITEMS.map(i => (
          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '1.3rem' }}>
            <span style={{ color: 'var(--ink-2)' }}>{i.name} × {i.qty}</span>
            <span>{naira(i.price * i.qty)}</span>
          </div>
        ))}
        <div style={{ height: 1, background: 'var(--line)', margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem' }}><span>Subtotal</span><span>{naira(sub)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem' }}><span>Delivery</span><span>{naira(ship)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>Total</span>
          <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent)' }}>{naira(total)}</span>
        </div>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: 700 }}>Payment method</h3>
        {[
          { i: 'credit-card', t: 'Pay with Paystack', s: 'Cards, transfer, USSD', sel: true },
          { i: 'wallet', t: 'UMP wallet', s: 'Balance: ₦4,200', sel: false },
          { i: 'truck', t: 'Pay on delivery', s: 'Cash / transfer to seller', sel: false },
        ].map(m => (
          <div key={m.t} style={{ padding: 12, border: m.sel ? '2px solid var(--accent)' : '1px solid var(--line)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, background: m.sel ? 'rgba(249,115,22,.04)' : 'transparent' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', color: 'var(--ink-1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
              <Icon n={m.i} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>{m.t}</div>
              <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)' }}>{m.s}</div>
            </div>
            <span style={{ width: 22, height: 22, borderRadius: '50%', border: m.sel ? '6px solid var(--accent)' : '2px solid var(--ink-4)' }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" onClick={onBack}><Icon n="arrow-left" /></button>
        <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => onNav?.('payment-success')}>
          <Icon n="lock" /> Pay {naira(total)}
        </button>
      </div>
      <p style={{ textAlign: 'center', fontSize: '1.1rem', color: 'var(--ink-3)', margin: '12px 0 0' }}>
        <Icon n="shield-halved" /> Your payment is secured by Paystack
      </p>
    </div>
  );
}

window.CartMobile = CartMobile;
