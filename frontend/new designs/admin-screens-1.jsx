/* global React, AdminShell, PageHead, LineChart, Spark, Thumb */
const { useState: useStateA1 } = React;

// ─── 1. DASHBOARD HOME ───────────────────────────────
function DashboardHome() {
  const [metric, setMetric] = useStateA1('orders');
  const series = {
    orders: [120,138,142,160,155,170,182,178,195,210,205,220,234,228,240,255,248,262,270,265,280,295,310,302,320,335,328,340,355,372],
    revenue: [820,940,1020,1180,1100,1240,1320,1280,1410,1490,1450,1580,1670,1620,1740,1830,1780,1900,1980,1950,2080,2210,2330,2280,2420,2540,2480,2580,2700,2840],
    users: [42,55,48,62,71,68,80,75,88,92,95,103,98,110,118,115,124,132,128,140,148,144,156,162,158,170,178,175,188,196],
  };
  return (
    <>
      <PageHead
        title="Dashboard"
        sub="Real-time overview of UMP marketplace activity"
        actions={<>
          <button className="abtn ghost"><i className="fa-regular fa-calendar"></i> Last 30 days</button>
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button>
        </>}
      />

      <div className="adm-stats">
        <Stat label="Total users" value="14,283" delta="+126 today" icon="fa-users" />
        <Stat label="Total sellers" value="942" delta="+8 today" icon="fa-store" badge={<span className="pill-warn">12 pending</span>} />
        <Stat label="Active orders" value="₦4.82M" delta="+12.4% vs last 30d" icon="fa-receipt" />
        <Stat label="Platform revenue (30d)" value="₦612K" delta="3.2% fee · +18.7%" icon="fa-naira-sign" />
        <Stat label="Pending payouts" value="₦1.84M" delta="8 requests" icon="fa-money-bill-transfer" badge={<span className="pill-warn">action</span>} />
        <Stat label="Flagged content" value="10" delta="3 disputes · 7 reports" icon="fa-flag" badge={<span className="pill-red">review</span>} down />
      </div>

      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-head">
          <div>
            <h3>Activity over time</h3>
            <div className="muted" style={{ fontSize: '1.2rem', marginTop: 2 }}>Past 30 days · April 10 – May 9, 2026</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="chart-toggle">
              {['orders','revenue','users'].map(k => (
                <button key={k} className={metric === k ? 'active' : ''} onClick={() => setMetric(k)}>
                  {k === 'orders' ? 'Orders' : k === 'revenue' ? 'Revenue' : 'New users'}
                </button>
              ))}
            </div>
            <button className="abtn ghost sm"><i className="fa-solid fa-download"></i></button>
          </div>
        </div>
        <div className="adm-card-body">
          <div className="chart-area">
            <LineChart data={series[metric]} />
          </div>
        </div>
      </div>

      <div className="adm-2col">
        <div className="adm-card">
          <div className="adm-card-head">
            <h3>Recent orders</h3>
            <button className="abtn ghost sm">View all <i className="fa-solid fa-arrow-right"></i></button>
          </div>
          <div className="adm-scroll-x">
            <table className="adm-table">
              <thead><tr><th>Ref</th><th>Buyer</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {RECENT_ORDERS.map(o => (
                  <tr key={o.ref}>
                    <td className="mono">{o.ref}</td>
                    <td><div className="adm-row-user"><div className={'avatar ' + o.av}>{o.buyer[0]}</div><div className="name" style={{ fontSize: '1.25rem' }}>{o.buyer}</div></div></td>
                    <td className="amount"><span className="naira"></span>{o.total}</td>
                    <td><span className={'pill dot ' + o.color}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <h3>Pending verifications</h3>
            <button className="abtn ghost sm">View all <i className="fa-solid fa-arrow-right"></i></button>
          </div>
          <div className="adm-scroll-x">
            <table className="adm-table">
              <thead><tr><th>Applicant</th><th>Type</th><th>Submitted</th><th></th></tr></thead>
              <tbody>
                {PENDING_VERIF.map(p => (
                  <tr key={p.name}>
                    <td><div className="adm-row-user"><div className={'avatar ' + p.av}>{p.name[0]}</div><div><div className="name" style={{ fontSize: '1.25rem' }}>{p.name}</div><div className="email">{p.email}</div></div></div></td>
                    <td><span className={'role-pill ' + p.kind}>{p.kind === 'seller' ? 'Seller' : 'Provider'}</span></td>
                    <td className="muted" style={{ fontSize: '1.2rem' }}>{p.when}</td>
                    <td>
                      <button className="abtn success sm"><i className="fa-solid fa-check"></i></button>
                      <button className="abtn ghost sm" style={{ marginLeft: 4 }}><i className="fa-solid fa-eye"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, delta, icon, badge, down }) {
  return (
    <div className="adm-stat">
      <div className="lbl"><span className="ico"><i className={'fa-solid ' + icon}></i></span> {label}</div>
      <div className="v">{value}</div>
      <div className={'delta' + (down ? ' down' : '')}>
        <i className={'fa-solid ' + (down ? 'fa-arrow-down' : 'fa-arrow-up')}></i> {delta}
      </div>
      {badge}
    </div>
  );
}

const RECENT_ORDERS = [
  { ref: 'UMP-29481', buyer: 'Tunde Adekunle', av: 'b', total: '24,500', status: 'Confirmed', color: 'blue' },
  { ref: 'UMP-29480', buyer: 'Aisha Mohammed', av: 'g', total: '8,200', status: 'Shipped', color: 'amber' },
  { ref: 'UMP-29479', buyer: 'Chinedu Okeke', av: 'c', total: '156,000', status: 'Completed', color: 'green' },
  { ref: 'UMP-29478', buyer: 'Funmi Bello', av: 'e', total: '3,800', status: 'Pending', color: 'gray' },
  { ref: 'UMP-29477', buyer: 'David Ogun', av: 'd', total: '47,200', status: 'Confirmed', color: 'blue' },
  { ref: 'UMP-29476', buyer: 'Ngozi Eze', av: 'f', total: '12,400', status: 'Cancelled', color: 'red' },
];
const PENDING_VERIF = [
  { name: 'Bolaji Tech Hub', email: 'bolajitech@unilag.edu.ng', av: 'b', kind: 'seller', when: '2h ago' },
  { name: 'Sade Adesina', email: 'sade.a@unilag.edu.ng', av: 'g', kind: 'provider', when: '4h ago' },
  { name: 'Lekan Books', email: 'lekanbooks@unilag.edu.ng', av: 'e', kind: 'seller', when: '6h ago' },
  { name: 'Tope Designs', email: 'tope.d@unilag.edu.ng', av: 'c', kind: 'provider', when: '1d ago' },
];

// ─── 2. USERS ────────────────────────────────────────
function UsersScreen() {
  return (
    <>
      <PageHead
        title="Users"
        sub="14,283 registered accounts across all roles"
        actions={<>
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export CSV</button>
          <button className="abtn primary"><i className="fa-solid fa-user-plus"></i> Invite admin</button>
        </>}
      />
      <div className="adm-filterbar">
        <div className="adm-tabs">
          <button className="tab active">All <span className="count">14,283</span></button>
          <button className="tab">Buyers <span className="count">12,941</span></button>
          <button className="tab">Sellers <span className="count">942</span></button>
          <button className="tab">Providers <span className="count">386</span></button>
          <button className="tab">Admin <span className="count">14</span></button>
        </div>
        <div style={{ flex: 1 }}></div>
        <span className="adm-chip"><i className="fa-solid fa-circle-check"></i> Status: Active <i className="fa-solid fa-xmark"></i></span>
        <span className="adm-chip"><i className="fa-solid fa-calendar"></i> Joined: 90 days <i className="fa-solid fa-xmark"></i></span>
        <span className="adm-chip"><i className="fa-solid fa-plus"></i> Add filter</span>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}><span className="checkbox"></span></th>
                <th>User</th>
                <th>Roles</th>
                <th>Joined</th>
                <th>Orders</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((u, i) => (
                <tr key={u.email}>
                  <td><span className={'checkbox' + (i === 1 ? ' checked' : '')}></span></td>
                  <td>
                    <div className="adm-row-user">
                      <div className={'avatar ' + u.av}>{u.name.split(' ').map(n => n[0]).slice(0,2).join('')}</div>
                      <div>
                        <div className="name">{u.name}</div>
                        <div className="email">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><div className="role-pills">{u.roles.map(r => <span key={r} className={'role-pill ' + r}>{r}</span>)}</div></td>
                  <td className="muted">{u.joined}</td>
                  <td className="amount">{u.orders}</td>
                  <td><span className={'pill dot ' + u.color}>{u.status}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-action"><i className="fa-solid fa-eye"></i></button>
                    <button className="icon-action"><i className="fa-solid fa-ellipsis-vertical"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eef0f4', fontSize: '1.2rem', color: 'var(--ink-3)' }}>
          <span>Showing 1–10 of 14,283</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="icon-action"><i className="fa-solid fa-chevron-left"></i></button>
            <button className="abtn sm dark">1</button>
            <button className="abtn sm ghost">2</button>
            <button className="abtn sm ghost">3</button>
            <span style={{ padding: '0 6px' }}>…</span>
            <button className="abtn sm ghost">1429</button>
            <button className="icon-action"><i className="fa-solid fa-chevron-right"></i></button>
          </div>
        </div>
      </div>
    </>
  );
}

const USERS = [
  { name: 'Tunde Adekunle', email: 'tunde.a@unilag.edu.ng', av: 'b', roles: ['buyer'], joined: 'Mar 12, 2025', orders: 24, status: 'Active', color: 'green' },
  { name: 'Aisha Mohammed', email: 'aisha.m@unilag.edu.ng', av: 'g', roles: ['buyer','seller'], joined: 'Jan 04, 2024', orders: 87, status: 'Active', color: 'green' },
  { name: 'Chinedu Okeke', email: 'chinedu.o@unilag.edu.ng', av: 'c', roles: ['buyer','provider'], joined: 'Sep 22, 2023', orders: 142, status: 'Active', color: 'green' },
  { name: 'Funmi Bello', email: 'funmi.b@unilag.edu.ng', av: 'e', roles: ['buyer'], joined: 'Apr 02, 2026', orders: 3, status: 'Active', color: 'green' },
  { name: 'David Ogun', email: 'david.o@unilag.edu.ng', av: 'd', roles: ['buyer','seller','admin'], joined: 'Jun 18, 2022', orders: 312, status: 'Active', color: 'green' },
  { name: 'Ngozi Eze', email: 'ngozi.e@unilag.edu.ng', av: 'f', roles: ['buyer'], joined: 'Feb 14, 2026', orders: 8, status: 'Suspended', color: 'amber' },
  { name: 'Bolaji Tech Hub', email: 'bolajitech@unilag.edu.ng', av: 'b', roles: ['buyer','seller'], joined: 'May 07, 2026', orders: 1, status: 'Active', color: 'green' },
  { name: 'Sade Adesina', email: 'sade.a@unilag.edu.ng', av: 'g', roles: ['buyer','provider'], joined: 'Nov 30, 2025', orders: 19, status: 'Active', color: 'green' },
  { name: 'Lekan Books', email: 'lekanbooks@unilag.edu.ng', av: 'e', roles: ['buyer','seller'], joined: 'May 06, 2026', orders: 0, status: 'Pending', color: 'gray' },
  { name: 'Wale Iroko', email: 'wale.i@unilag.edu.ng', av: 'd', roles: ['buyer'], joined: 'Aug 11, 2024', orders: 5, status: 'Banned', color: 'red' },
];

// ─── 3. SELLERS (with drawer overlay) ────────────────
function SellersScreen({ withDrawer }) {
  return (
    <>
      <PageHead title="Sellers" sub="942 verified store owners on UMP" actions={<><button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button></>} />
      <div className="adm-filterbar">
        <div className="adm-tabs">
          <button className="tab">All <span className="count">942</span></button>
          <button className="tab active">Pending <span className="count">12</span></button>
          <button className="tab">Verified <span className="count">912</span></button>
          <button className="tab">Suspended <span className="count">18</span></button>
        </div>
        <div style={{ flex: 1 }}></div>
        <div className="adm-search" style={{ maxWidth: 280 }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input placeholder="Search stores…" />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead><tr><th>Store</th><th>Owner</th><th>Products</th><th>Revenue (30d)</th><th>Rating</th><th>Status</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {SELLERS.map((s, i) => (
                <tr key={s.store} style={i === 0 && withDrawer ? { background: '#fff7ed' } : null}>
                  <td>
                    <div className="adm-row-user">
                      <Thumb kind={s.kind}>{s.store.slice(0,2)}</Thumb>
                      <div>
                        <div className="name">{s.store} {s.verified ? <span className="verified-tick"><i className="fa-solid fa-check"></i></span> : null}</div>
                        <div className="email">{s.cat}</div>
                      </div>
                    </div>
                  </td>
                  <td className="muted">{s.owner}</td>
                  <td className="amount">{s.products}</td>
                  <td className="amount"><span className="naira"></span>{s.revenue}</td>
                  <td><StarRow value={s.rating} /> <span className="muted" style={{ marginLeft: 4 }}>{s.rating.toFixed(1)}</span></td>
                  <td><span className={'pill dot ' + s.color}>{s.status}</span></td>
                  <td className="muted">{s.joined}</td>
                  <td><button className="icon-action"><i className="fa-solid fa-ellipsis-vertical"></i></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {withDrawer ? <SellerDrawer /> : null}
    </>
  );
}

const SELLERS = [
  { store: 'Bolaji Tech Hub', owner: 'Bolaji Adeyemi', cat: 'Electronics · Phones', kind: 'electronics', products: 42, revenue: '420K', rating: 4.6, verified: false, status: 'Pending', color: 'amber', joined: 'May 07, 2026' },
  { store: 'Lekan Books', owner: 'Lekan Otun', cat: 'Books · Stationery', kind: 'books', products: 218, revenue: '85K', rating: 4.8, verified: true, status: 'Verified', color: 'green', joined: 'Sep 12, 2024' },
  { store: 'Aisha Wears', owner: 'Aisha Mohammed', cat: 'Fashion · Clothing', kind: 'clothing', products: 96, revenue: '610K', rating: 4.7, verified: true, status: 'Verified', color: 'green', joined: 'Jan 04, 2024' },
  { store: 'Mama Nkechi Kitchen', owner: 'Nkechi Okoro', cat: 'Food · Drinks', kind: 'food', products: 28, revenue: '184K', rating: 4.9, verified: true, status: 'Verified', color: 'green', joined: 'Mar 22, 2025' },
  { store: 'Akin Fitness', owner: 'Akin Olatunji', cat: 'Fitness · Sports', kind: 'fitness', products: 64, revenue: '92K', rating: 4.4, verified: true, status: 'Verified', color: 'green', joined: 'Feb 18, 2025' },
  { store: 'Glow by Tola', owner: 'Tola Adigun', cat: 'Beauty · Skincare', kind: 'beauty', products: 51, revenue: '230K', rating: 4.5, verified: true, status: 'Suspended', color: 'red', joined: 'Oct 09, 2024' },
];

function SellerDrawer() {
  return (
    <div className="adm-drawer-shell">
      <div className="adm-drawer">
        <div className="adm-drawer-head">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Thumb kind="electronics" className="" >BT</Thumb>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>Bolaji Tech Hub</div>
              <div className="muted" style={{ fontSize: '1.2rem' }}>Submitted May 7, 2026 · Awaiting verification</div>
            </div>
          </div>
          <button className="icon-action"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="adm-drawer-body">
          <div className="kpi-strip">
            <div className="kpi"><div className="l">Products</div><div className="v">42</div></div>
            <div className="kpi"><div className="l">Revenue 30d</div><div className="v"><span className="naira"></span>420K</div></div>
            <div className="kpi"><div className="l">Rating</div><div className="v">4.6 ★</div></div>
          </div>

          <div className="adm-section-h">Banner & logo</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, height: 80, borderRadius: 10, overflow: 'hidden' }}><div className="img-ph ph-electronics" style={{ height: '100%' }}>BANNER</div></div>
            <div style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden' }}><div className="img-ph ph-electronics" style={{ height: '100%' }}>LOGO</div></div>
          </div>

          <div className="adm-section-h">Owner details</div>
          <div className="adm-kv">
            <span className="k">Name</span><span className="v">Bolaji Adeyemi</span>
            <span className="k">Email</span><span className="v">bolajitech@unilag.edu.ng</span>
            <span className="k">Phone</span><span className="v">+234 803 422 8910</span>
            <span className="k">Matric No.</span><span className="v">CSC/2021/2483</span>
            <span className="k">CAC reg</span><span className="v">RC-7281944 <i className="fa-solid fa-up-right-from-square muted" style={{ marginLeft: 4, fontSize: '1rem' }}></i></span>
          </div>

          <div className="adm-section-h">Revenue (30 days)</div>
          <div style={{ height: 100 }}><LineChart data={[12,18,22,15,28,32,24,40,38,46,52,48,60,55,68,72,65,78,84,80,92,98,90,105,110,108,118,124,120,130]} height={100} /></div>

          <div className="adm-section-h">Recent products (42)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {['electronics','electronics','accessories','electronics','electronics','accessories'].map((k, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden' }}><div className={'img-ph ph-' + k} style={{ height: '100%' }}>P{i+1}</div></div>
            ))}
          </div>
        </div>
        <div className="adm-drawer-foot">
          <button className="abtn ghost" style={{ flex: 1 }}><i className="fa-solid fa-message"></i> Message</button>
          <button className="abtn danger" style={{ flex: 1 }}><i className="fa-solid fa-xmark"></i> Reject</button>
          <button className="abtn primary" style={{ flex: 1.4 }}><i className="fa-solid fa-circle-check"></i> Approve verification</button>
        </div>
      </div>
    </div>
  );
}

// ─── 4. PRODUCTS ─────────────────────────────────────
function ProductsScreen() {
  return (
    <>
      <PageHead title="Products" sub="3,847 listings across 14 categories"
        actions={<>
          <button className="abtn ghost"><i className="fa-solid fa-file-import"></i> Bulk import</button>
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button>
        </>} />

      <div className="adm-filterbar">
        <span className="adm-chip active">All</span>
        <span className="adm-chip">Active <span className="muted">3,612</span></span>
        <span className="adm-chip">Flagged <span className="muted">42</span></span>
        <span className="adm-chip">Removed <span className="muted">193</span></span>
        <div style={{ width: 1, height: 24, background: '#e3e5eb', margin: '0 4px' }}></div>
        <span className="adm-chip"><i className="fa-solid fa-tag"></i> Category: All <i className="fa-solid fa-chevron-down"></i></span>
        <span className="adm-chip"><i className="fa-solid fa-naira-sign"></i> Price: Any <i className="fa-solid fa-chevron-down"></i></span>
        <span className="adm-chip"><i className="fa-solid fa-circle-half-stroke"></i> Condition: Any <i className="fa-solid fa-chevron-down"></i></span>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', color: 'var(--ink-2)' }}>
          <span><b>3</b> selected</span>
          <button className="abtn sm ghost"><i className="fa-solid fa-flag"></i> Flag</button>
          <button className="abtn sm ghost"><i className="fa-solid fa-star"></i> Feature</button>
          <button className="abtn sm danger"><i className="fa-solid fa-trash"></i> Delete</button>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead><tr>
              <th style={{ width: 32 }}><span className="checkbox checked"></span></th>
              <th>Product</th><th>Seller</th><th>Category</th><th>Price</th><th>Stock</th><th>Views</th><th>Status</th><th>Created</th><th></th>
            </tr></thead>
            <tbody>
              {PRODUCTS.map((p, i) => (
                <tr key={p.name}>
                  <td><span className={'checkbox' + (i < 3 ? ' checked' : '')}></span></td>
                  <td>
                    <div className="adm-row-user">
                      <Thumb kind={p.kind}>P</Thumb>
                      <div className="name" style={{ fontSize: '1.3rem' }}>{p.name}</div>
                    </div>
                  </td>
                  <td className="muted">{p.seller}</td>
                  <td className="muted">{p.cat}</td>
                  <td className="amount"><span className="naira"></span>{p.price}</td>
                  <td className="amount">{p.stock}</td>
                  <td className="amount muted">{p.views}</td>
                  <td><span className={'pill dot ' + p.color}>{p.status}</span></td>
                  <td className="muted">{p.created}</td>
                  <td style={{ textAlign: 'right' }}><button className="icon-action"><i className="fa-solid fa-ellipsis-vertical"></i></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
const PRODUCTS = [
  { name: 'iPhone 13 Pro · 128GB', seller: 'Bolaji Tech Hub', cat: 'Electronics', kind: 'electronics', price: '385,000', stock: 4, views: '2,841', status: 'Flagged', color: 'amber', created: 'Apr 12' },
  { name: 'MacBook Air M2 (used)', seller: 'Bolaji Tech Hub', cat: 'Electronics', kind: 'electronics', price: '720,000', stock: 1, views: '1,920', status: 'Flagged', color: 'amber', created: 'Apr 28' },
  { name: 'Calculus textbook (Stewart 8e)', seller: 'Lekan Books', cat: 'Books', kind: 'books', price: '6,500', stock: 12, views: '684', status: 'Flagged', color: 'amber', created: 'Mar 04' },
  { name: 'UNILAG hoodie · Akoka edition', seller: 'Aisha Wears', cat: 'Clothing', kind: 'clothing', price: '12,000', stock: 38, views: '4,210', status: 'Active', color: 'green', created: 'Feb 18' },
  { name: 'Jollof rice combo (large)', seller: 'Mama Nkechi Kitchen', cat: 'Food', kind: 'food', price: '3,200', stock: 0, views: '12,047', status: 'Active', color: 'green', created: 'Jan 11' },
  { name: 'Resistance bands set', seller: 'Akin Fitness', cat: 'Fitness', kind: 'fitness', price: '8,900', stock: 17, views: '928', status: 'Active', color: 'green', created: 'Mar 30' },
  { name: 'Vitamin C serum 30ml', seller: 'Glow by Tola', cat: 'Beauty', kind: 'beauty', price: '5,500', stock: 24, views: '1,604', status: 'Removed', color: 'red', created: 'Apr 02' },
];

Object.assign(window, { DashboardHome, UsersScreen, SellersScreen, ProductsScreen });
