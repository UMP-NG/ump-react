/* global React */

// ---------- LIGHTER FIDELITY SCREENS ----------

// Services
function ServicesMobile({ onNav }) {
  return (
    <div className="phone-scroll">
      <Navbar onNav={onNav} onProfileClick={() => onNav?.('profile')} />
      <div style={{ padding: '12px 16px 0' }}>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0 4px' }}>Services</h1>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '1.3rem' }}>Hire talent right on campus.</p>
      </div>
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8 }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          <Icon n="magnifying-glass" className="search-icon" />
          <input className="input" placeholder="Search by skill, e.g. ‘logo’" />
        </div>
        <button className="icon-btn" style={{ background: 'var(--navy-800)', color: '#fff', width: 48, height: 48, borderRadius: 'var(--r-md)' }}><Icon n="sliders" /></button>
      </div>
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {['All', 'Tutoring', 'Design', 'Fitness', 'Music', 'Photo', 'Coding'].map((c, i) => (
          <span key={c} className={`chip ${i === 0 ? 'active' : ''}`}>{c}</span>
        ))}
      </div>
      <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { title: 'Calculus & Engineering Maths Tutoring', name: 'Chiamaka I.', kind: 'tutoring', rate: 2500, rating: 4.9, reviews: 28, img: 'tutoring' },
          { title: 'Logo & Brand Identity Design', name: 'Adaeze O.', kind: 'design', rate: 5000, rating: 5.0, reviews: 47, img: 'design' },
          { title: 'Personal Training (Akoka Stadium)', name: 'Bayo K.', kind: 'fitness', rate: 3500, rating: 4.7, reviews: 19, img: 'fitness' },
          { title: 'Event Photography & Portraits', name: 'Femi B.', kind: 'photo', rate: 15000, rating: 4.8, reviews: 64, img: 'electronics' },
          { title: 'Piano Lessons (beginner-friendly)', name: 'Ifeoma U.', kind: 'music', rate: 4000, rating: 4.9, reviews: 12, img: 'music' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 14, display: 'flex', gap: 12 }}>
            <div style={{ width: 96, height: 96, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}><Ph kind={s.img} label={s.kind} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.3 }}>{s.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '1.2rem', color: 'var(--ink-3)', marginTop: 4 }}>
                {s.name} <Icon n="circle-check" style={{ color: 'var(--accent)', fontSize: '1rem' }} />
              </div>
              <div className="rating" style={{ marginTop: 4 }}><Icon n="star" className="star" /> {s.rating} <span className="count">({s.reviews})</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{naira(s.rate)}<span style={{ fontSize: '1.1rem', color: 'var(--ink-3)', fontWeight: 500 }}>/hr</span></span>
                <button className="btn btn-sm btn-dark">Book</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Footer />
      <div style={{ height: 80 }} />
      <BottomNav active="services" onNav={onNav} />
    </div>
  );
}

// Hostel Hub
function HostelMobile({ onNav }) {
  return (
    <div className="phone-scroll">
      <Navbar onNav={onNav} onProfileClick={() => onNav?.('profile')} />
      <div style={{ padding: '12px 16px 0' }}>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0 4px' }}>Your room, your rules.</h1>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '1.3rem' }}>Off-campus stays around UNILAG.</p>
      </div>
      <div style={{ padding: '16px 16px 0' }}>
        <div className="search-wrap">
          <Icon n="location-dot" className="search-icon" />
          <input className="input" placeholder="Akoka, Yaba, Bariga, Sabo…" />
        </div>
      </div>
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {['All', 'Self-contain', 'Shared', 'Mini flat', 'Single', 'Wifi'].map((c, i) => (
          <span key={c} className={`chip ${i === 0 ? 'active' : ''}`}>{c}</span>
        ))}
      </div>
      <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[
          { title: 'Cosy self-contain · Akoka', loc: 'Iwaya Road, 8 min walk to gate', price: 280000, type: 'Self-contain', kind: 'hostel-1', a: ['wifi','bolt','droplet'] },
          { title: 'Bright shared room · Yaba', loc: 'Sabo, near Tejuosho', price: 150000, type: 'Shared', kind: 'hostel-2', a: ['wifi','bolt'] },
          { title: 'Mini flat for 2 · Bariga', loc: 'Off Bajulaiye, fenced compound', price: 400000, type: 'Mini flat', kind: 'hostel-3', a: ['wifi','bolt','droplet','car'] },
        ].map((h, i) => (
          <div key={i} className="card" style={{ overflow: 'hidden' }}>
            <div style={{ height: 180, position: 'relative' }}>
              <Ph kind={h.kind} label="hostel" />
              <span className="product-tag" style={{ background: 'rgba(15,23,42,.85)' }}>{h.type}</span>
              <button className="product-fav"><IconR n="heart" /></button>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{h.title}</h3>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)' }}>{naira(h.price)}</span>
              </div>
              <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', marginTop: 4 }}><Icon n="location-dot" /> {h.loc}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {h.a.map(ic => (
                  <span key={ic} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2)' }}><Icon n={ic} /></span>
                ))}
                <span style={{ fontSize: '1.1rem', color: 'var(--ink-3)', alignSelf: 'center' }}>per session</span>
                <button className="btn btn-sm btn-dark" style={{ marginLeft: 'auto' }}>View</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ margin: '0 16px 24px', padding: 20, borderRadius: 'var(--r-xl)', background: 'var(--surface)', textAlign: 'center', border: '2px dashed var(--line-strong)' }}>
        <Icon n="plus" style={{ fontSize: '2.4rem', color: 'var(--accent)' }} />
        <h3 style={{ margin: '8px 0 4px', fontSize: '1.5rem' }}>Got a room to let?</h3>
        <p style={{ margin: '0 0 12px', fontSize: '1.2rem', color: 'var(--ink-2)' }}>Post a listing in 2 minutes. Free for verified students.</p>
        <button className="btn btn-primary btn-sm">Post a listing</button>
      </div>
      <Footer />
      <div style={{ height: 80 }} />
      <BottomNav active="hostel" onNav={onNav} />
    </div>
  );
}

// Store / sellers directory
function StoreMobile({ onNav }) {
  return (
    <div className="phone-scroll">
      <Navbar onNav={onNav} onProfileClick={() => onNav?.('profile')} />
      <div style={{ padding: '12px 16px 0' }}>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0 4px' }}>Verified sellers</h1>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '1.3rem' }}>312 stores · all UNILAG, all verified.</p>
      </div>
      <div style={{ padding: '16px 16px 0' }}>
        <div className="search-wrap">
          <Icon n="magnifying-glass" className="search-icon" />
          <input className="input" placeholder="Search sellers…" />
        </div>
      </div>
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {['All', '★ 4.5+', 'Verified', 'Tech', 'Fashion', 'Books'].map((c, i) => (
          <span key={c} className={`chip ${i === 0 ? 'active' : ''}`}>{c}</span>
        ))}
      </div>
      <div style={{ padding: '16px 16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { name: 'Tunde Tech', kind: 'portrait-3', cat: 'Electronics', rating: 4.9, sales: 132, banner: 'electronics' },
          { name: 'Adaeze Studio', kind: 'portrait-1', cat: 'Design & Print', rating: 5.0, sales: 47, banner: 'design' },
          { name: 'BookHub by Femi', kind: 'portrait-4', cat: 'Books', rating: 4.6, sales: 84, banner: 'books' },
          { name: 'Sr Eze Kitchen', kind: 'portrait-5', cat: 'Food', rating: 4.9, sales: 320, banner: 'food' },
          { name: 'Akoka Threads', kind: 'portrait-6', cat: 'Fashion', rating: 4.7, sales: 96, banner: 'clothing' },
          { name: 'Beauty by Ada', kind: 'portrait-2', cat: 'Beauty', rating: 4.8, sales: 51, banner: 'beauty' },
        ].map(s => (
          <div key={s.name} className="card">
            <div style={{ height: 70, position: 'relative' }}><Ph kind={s.banner} label="" /></div>
            <div style={{ padding: '0 12px 12px', textAlign: 'center', marginTop: -22 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', margin: '0 auto', border: '3px solid var(--white)' }}><Ph kind={s.kind} label={s.name[0]} /></div>
              <div style={{ marginTop: 6, fontWeight: 700, fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>{s.name} <Icon n="circle-check" style={{ color: 'var(--accent)', fontSize: '1rem' }} /></div>
              <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)' }}>{s.cat}</div>
              <div className="rating" style={{ justifyContent: 'center', marginTop: 4, fontSize: '1.1rem' }}><Icon n="star" className="star" /> {s.rating} <span className="count">· {s.sales} sales</span></div>
              <button className="btn btn-sm btn-ghost" style={{ width: '100%', marginTop: 10 }}>Visit</button>
            </div>
          </div>
        ))}
      </div>
      <Footer />
      <div style={{ height: 80 }} />
      <BottomNav active="home" onNav={onNav} />
    </div>
  );
}

// Partner / become seller
function PartnerMobile({ onNav }) {
  const [tab, setTab] = React.useState('seller');
  return (
    <div className="phone-scroll">
      <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="icon-btn" style={{ background: 'var(--surface)' }} onClick={() => onNav?.('home')}><Icon n="arrow-left" /></button>
        <Logo />
        <span style={{ width: 40 }} />
      </div>
      <div style={{ padding: '20px 20px 0' }}>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Start earning on campus</h1>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '1.4rem' }}>Free to register · paid in 24 hrs after each sale</p>
      </div>
      <div style={{ padding: '20px 20px 0' }}>
        <div className="tabs">
          <button className={`tab ${tab === 'seller' ? 'active' : ''}`} onClick={() => setTab('seller')}>Become a Seller</button>
          <button className={`tab ${tab === 'provider' ? 'active' : ''}`} onClick={() => setTab('provider')}>Service Provider</button>
        </div>
      </div>
      <div style={{ padding: '20px' }}>
        {tab === 'seller' ? <>
          <div className="label">Store name</div><input className="input" placeholder="e.g. Tunde Tech" />
          <div style={{ height: 12 }} /><div className="label">What do you sell?</div>
          <select className="select"><option>Electronics</option><option>Books</option><option>Fashion</option><option>Food</option></select>
          <div style={{ height: 12 }} /><div className="label">Store description</div>
          <textarea className="textarea" placeholder="Tell buyers what makes your store special…" />
          <div style={{ height: 12 }} /><div className="label">Phone number</div>
          <input className="input" placeholder="+234 …" />
          <div style={{ height: 12 }} /><div className="label">Campus area</div>
          <input className="input" placeholder="Akoka / Yaba / Bariga" />
          <div style={{ height: 12 }} /><div className="label">Banner & profile photo</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-block"><Icon n="image" /> Upload banner</button>
            <button className="btn btn-ghost btn-block"><Icon n="user" /> Photo</button>
          </div>
        </> : <>
          <div className="label">Service title</div><input className="input" placeholder="e.g. Math Tutoring" />
          <div style={{ height: 12 }} /><div className="label">Category</div>
          <select className="select"><option>Tutoring</option><option>Design</option><option>Fitness</option><option>Music</option></select>
          <div style={{ height: 12 }} /><div className="label">Rate per hour (₦)</div>
          <input className="input" placeholder="2500" />
          <div style={{ height: 12 }} /><div className="label">Years of experience</div>
          <input className="input" placeholder="3" />
          <div style={{ height: 12 }} /><div className="label">Availability</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Mornings','Afternoons','Evenings','Weekdays','Weekends'].map((d, i) => (
              <span key={d} className={`chip ${i === 1 || i === 4 ? 'active' : ''}`}>{d}</span>
            ))}
          </div>
          <div style={{ height: 12 }} /><div className="label">Description</div>
          <textarea className="textarea" />
        </>}
        <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 20 }}>Submit application <Icon n="arrow-right" /></button>
        <p style={{ textAlign: 'center', marginTop: 14, fontSize: '1.2rem', color: 'var(--ink-3)' }}>Approval in 24 hrs · UNILAG email required</p>
      </div>
    </div>
  );
}

// Forgot password
function ForgotMobile({ onNav }) {
  return (
    <div className="phone-scroll">
      <div style={{ padding: '12px 16px 0' }}>
        <button className="icon-btn" style={{ background: 'var(--surface)' }} onClick={() => onNav?.('login')}><Icon n="arrow-left" /></button>
      </div>
      <div style={{ padding: '40px 24px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(249,115,22,.12)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.6rem', marginBottom: 20 }}>
          <Icon n="key" />
        </div>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Forgot your password?</h1>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '1.4rem' }}>Enter your UNILAG email and we'll send a reset link.</p>
        <div style={{ height: 24 }} />
        <div className="label">Email</div>
        <input className="input" placeholder="aisha@unilag.edu.ng" />
        <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 20 }}>Send reset link</button>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '1.3rem', color: 'var(--ink-3)' }}>Remembered? <a style={{ color: 'var(--accent)', fontWeight: 700 }} onClick={() => onNav?.('login')}>Sign in</a></p>
      </div>
    </div>
  );
}

// Reset password
function ResetMobile({ onNav }) {
  return (
    <div className="phone-scroll">
      <div style={{ padding: '12px 16px 0' }}>
        <button className="icon-btn" style={{ background: 'var(--surface)' }} onClick={() => onNav?.('login')}><Icon n="arrow-left" /></button>
      </div>
      <div style={{ padding: '40px 24px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(34,197,94,.12)', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.6rem', marginBottom: 20 }}>
          <Icon n="lock" />
        </div>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Set a new password</h1>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '1.4rem' }}>Make it strong — at least 8 characters.</p>
        <div style={{ height: 24 }} />
        <div className="label">New password</div>
        <input className="input" type="password" placeholder="••••••••" />
        <div style={{ height: 14 }} />
        <div className="label">Confirm new password</div>
        <input className="input" type="password" placeholder="••••••••" />

        <div style={{ marginTop: 14, padding: 12, background: 'var(--surface)', borderRadius: 'var(--r-md)' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>STRENGTH</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= 3 ? 'var(--success)' : 'var(--line-strong)' }} />)}
          </div>
          <ul style={{ paddingLeft: 16, margin: '10px 0 0', fontSize: '1.1rem', color: 'var(--ink-2)' }}>
            <li><Icon n="check" style={{ color: 'var(--success)' }} /> 8+ characters</li>
            <li><Icon n="check" style={{ color: 'var(--success)' }} /> 1 number</li>
            <li><Icon n="circle" style={{ color: 'var(--ink-4)', fontSize: '.7em' }} /> 1 special character</li>
          </ul>
        </div>

        <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 20 }} onClick={() => onNav?.('login')}>Reset password</button>
      </div>
    </div>
  );
}

// Payment success
function PaymentSuccessMobile({ onNav }) {
  return (
    <div className="phone-scroll" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, padding: '60px 24px 0', textAlign: 'center', background: 'linear-gradient(180deg, rgba(34,197,94,.08), transparent 60%)' }}>
        <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--success)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', margin: '0 auto', boxShadow: '0 20px 40px -12px rgba(34,197,94,.5)' }}>
          <Icon n="check" />
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '24px 0 8px' }}>Payment successful!</h1>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '1.4rem' }}>Your order has been placed. We sent you a receipt.</p>

        <div className="card" style={{ padding: 20, margin: '24px 0', textAlign: 'left' }}>
          <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, marginBottom: 4 }}>Order ref</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '.05em' }}>#UMP-72481</div>
          <div style={{ height: 1, background: 'var(--line)', margin: '14px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', padding: '4px 0' }}><span>Total paid</span><strong>{naira(320000)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', padding: '4px 0' }}><span>Delivery to</span><span>Moremi Hall</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', padding: '4px 0' }}><span>Estimated arrival</span><strong style={{ color: 'var(--accent)' }}>Today, 4–6pm</strong></div>
        </div>

        <button className="btn btn-primary btn-block btn-lg" onClick={() => onNav?.('market')}>Continue shopping</button>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>View my orders</button>
      </div>
    </div>
  );
}

// Checkout success (no payment)
function CheckoutSuccessMobile({ onNav }) {
  return (
    <div className="phone-scroll" style={{ padding: '60px 24px 0', textAlign: 'center' }}>
      <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', margin: '0 auto' }}>
        <Icon n="bag-shopping" />
      </div>
      <h1 style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '24px 0 8px' }}>Order placed!</h1>
      <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '1.4rem' }}>Sit tight — we'll notify you when the seller confirms.</p>
      <div className="card" style={{ padding: 16, margin: '24px 0', textAlign: 'left' }}>
        <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, marginBottom: 4 }}>Order ref</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'monospace' }}>#UMP-72482</div>
      </div>
      <button className="btn btn-primary btn-block btn-lg" onClick={() => onNav?.('home')}>Back to home</button>
    </div>
  );
}

window.ServicesMobile = ServicesMobile;
window.HostelMobile = HostelMobile;
window.StoreMobile = StoreMobile;
window.PartnerMobile = PartnerMobile;
window.ForgotMobile = ForgotMobile;
window.ResetMobile = ResetMobile;
window.PaymentSuccessMobile = PaymentSuccessMobile;
window.CheckoutSuccessMobile = CheckoutSuccessMobile;
