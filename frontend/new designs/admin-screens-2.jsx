/* global React, PageHead, LineChart, BarChart, PieChart, StarRow, Thumb */
const { useState: useStateA2 } = React;

// ─── 5. ORDERS ────────────────────────────────────────
function OrdersScreen() {
  return (
    <>
      <PageHead title="Orders" sub="29,481 total · ₦182M lifetime GMV"
        actions={<>
          <button className="abtn ghost"><i className="fa-regular fa-calendar"></i> Apr 10 – May 9</button>
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button>
        </>} />

      <div className="adm-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Mini label="Pending" value="142" icon="fa-clock" color="#eab308" />
        <Mini label="Shipped" value="68" icon="fa-truck" color="#3b82f6" />
        <Mini label="Completed" value="412" icon="fa-circle-check" color="#22c55e" />
        <Mini label="Cancelled / Refunded" value="14" icon="fa-rotate-left" color="#ef4444" />
      </div>

      <div className="adm-filterbar">
        <div className="adm-tabs">
          <button className="tab active">All <span className="count">636</span></button>
          <button className="tab">Pending <span className="count">142</span></button>
          <button className="tab">Shipped <span className="count">68</span></button>
          <button className="tab">Completed <span className="count">412</span></button>
          <button className="tab">Disputed <span className="count">14</span></button>
        </div>
        <div style={{ flex: 1 }}></div>
        <span className="adm-chip"><i className="fa-solid fa-store"></i> Seller: All <i className="fa-solid fa-chevron-down"></i></span>
        <span className="adm-chip"><i className="fa-solid fa-naira-sign"></i> Total: Any <i className="fa-solid fa-chevron-down"></i></span>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead><tr>
              <th>Order</th><th>Buyer</th><th>Seller</th><th>Items</th><th>Total</th>
              <th>Payment</th><th>Status</th><th>Placed</th><th></th>
            </tr></thead>
            <tbody>
              {ORDERS.map(o => (
                <tr key={o.ref}>
                  <td className="mono">{o.ref}</td>
                  <td><div className="adm-row-user"><div className={'avatar ' + o.bav}>{o.buyer[0]}</div><div className="name" style={{ fontSize: '1.25rem' }}>{o.buyer}</div></div></td>
                  <td className="muted">{o.seller}</td>
                  <td className="amount">{o.items}</td>
                  <td className="amount"><span className="naira"></span>{o.total}</td>
                  <td><span className={'pill ' + o.payColor}>{o.payment}</span></td>
                  <td><span className={'pill dot ' + o.color}>{o.status}</span></td>
                  <td className="muted">{o.placed}</td>
                  <td><button className="icon-action"><i className="fa-solid fa-eye"></i></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
function Mini({ label, value, icon, color }) {
  return (
    <div className="adm-stat" style={{ padding: '14px 16px' }}>
      <div className="lbl">
        <span className="ico" style={{ background: color + '22', color }}><i className={'fa-solid ' + icon}></i></span>
        {label}
      </div>
      <div className="v" style={{ fontSize: '2.4rem', marginTop: 6 }}>{value}</div>
    </div>
  );
}
const ORDERS = [
  { ref: 'UMP-29481', buyer: 'Tunde A.', bav: 'b', seller: 'Bolaji Tech Hub', items: 2, total: '24,500', payment: 'Paystack', payColor: 'blue', status: 'Confirmed', color: 'blue', placed: 'May 9, 11:42' },
  { ref: 'UMP-29480', buyer: 'Aisha M.', bav: 'g', seller: 'Aisha Wears', items: 1, total: '8,200', payment: 'Wallet', payColor: 'purple', status: 'Shipped', color: 'amber', placed: 'May 9, 10:18' },
  { ref: 'UMP-29479', buyer: 'Chinedu O.', bav: 'c', seller: 'Bolaji Tech Hub', items: 3, total: '156,000', payment: 'Paystack', payColor: 'blue', status: 'Completed', color: 'green', placed: 'May 9, 09:51' },
  { ref: 'UMP-29478', buyer: 'Funmi B.', bav: 'e', seller: 'Lekan Books', items: 2, total: '3,800', payment: 'Cash', payColor: 'gray', status: 'Pending', color: 'gray', placed: 'May 9, 09:22' },
  { ref: 'UMP-29477', buyer: 'David O.', bav: 'd', seller: 'Mama Nkechi K.', items: 4, total: '47,200', payment: 'Paystack', payColor: 'blue', status: 'Confirmed', color: 'blue', placed: 'May 8, 18:04' },
  { ref: 'UMP-29476', buyer: 'Ngozi E.', bav: 'f', seller: 'Glow by Tola', items: 1, total: '12,400', payment: 'Paystack', payColor: 'blue', status: 'Disputed', color: 'red', placed: 'May 8, 15:30' },
  { ref: 'UMP-29475', buyer: 'Bola K.', bav: 'b', seller: 'Akin Fitness', items: 2, total: '14,600', payment: 'Wallet', payColor: 'purple', status: 'Completed', color: 'green', placed: 'May 8, 13:12' },
];

// ─── 6. PAYOUTS ───────────────────────────────────────
function PayoutsScreen() {
  return (
    <>
      <PageHead title="Payouts" sub="Manage seller withdrawal requests"
        actions={<><button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button><button className="abtn primary"><i className="fa-solid fa-bolt"></i> Batch approve (8)</button></>} />

      <div className="adm-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Mini label="Pending" value="₦1.84M" icon="fa-hourglass" color="#eab308" />
        <Mini label="Approved today" value="₦612K" icon="fa-check" color="#22c55e" />
        <Mini label="Paid this month" value="₦4.92M" icon="fa-money-bill-transfer" color="#3b82f6" />
        <Mini label="Wallet float" value="₦8.71M" icon="fa-wallet" color="#8b5cf6" />
      </div>

      <div className="adm-filterbar">
        <div className="adm-tabs">
          <button className="tab active">Pending <span className="count">8</span></button>
          <button className="tab">Processing <span className="count">3</span></button>
          <button className="tab">Paid <span className="count">142</span></button>
          <button className="tab">Failed <span className="count">2</span></button>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead><tr>
              <th style={{ width: 32 }}><span className="checkbox checked"></span></th>
              <th>Seller</th><th>Bank account</th><th>Available</th><th>Requested</th><th>Net (after 3.2%)</th><th>Requested at</th><th>Risk</th><th></th>
            </tr></thead>
            <tbody>
              {PAYOUTS.map((p, i) => (
                <tr key={p.seller}>
                  <td><span className={'checkbox' + (i < 8 ? ' checked' : '')}></span></td>
                  <td><div className="adm-row-user"><Thumb kind={p.kind}>{p.seller.slice(0,2)}</Thumb><div><div className="name">{p.seller}</div><div className="email">{p.owner}</div></div></div></td>
                  <td><div style={{ fontSize: '1.25rem' }}>{p.bank}</div><div className="mono muted" style={{ fontSize: '1.1rem' }}>{p.acct}</div></td>
                  <td className="amount"><span className="naira"></span>{p.avail}</td>
                  <td className="amount"><span className="naira"></span>{p.req}</td>
                  <td className="amount"><span className="naira"></span>{p.net}</td>
                  <td className="muted">{p.when}</td>
                  <td><span className={'pill ' + p.riskColor}>{p.risk}</span></td>
                  <td><button className="abtn primary sm">Approve</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
const PAYOUTS = [
  { seller: 'Bolaji Tech Hub', owner: 'Bolaji Adeyemi', kind: 'electronics', bank: 'GTBank', acct: '0234 ••• 5621', avail: '420,000', req: '300,000', net: '290,400', when: 'May 9, 09:12', risk: 'Low', riskColor: 'green' },
  { seller: 'Aisha Wears', owner: 'Aisha Mohammed', kind: 'clothing', bank: 'Access Bank', acct: '0987 ••• 1142', avail: '610,000', req: '500,000', net: '484,000', when: 'May 9, 08:40', risk: 'Low', riskColor: 'green' },
  { seller: 'Mama Nkechi Kitchen', owner: 'Nkechi Okoro', kind: 'food', bank: 'Opay', acct: '8112 ••• 0091', avail: '184,000', req: '150,000', net: '145,200', when: 'May 9, 07:18', risk: 'Low', riskColor: 'green' },
  { seller: 'Akin Fitness', owner: 'Akin Olatunji', kind: 'fitness', bank: 'UBA', acct: '2104 ••• 8842', avail: '92,000', req: '80,000', net: '77,440', when: 'May 8, 22:04', risk: 'Medium', riskColor: 'amber' },
  { seller: 'Lekan Books', owner: 'Lekan Otun', kind: 'books', bank: 'Zenith Bank', acct: '1098 ••• 4421', avail: '85,000', req: '60,000', net: '58,080', when: 'May 8, 19:30', risk: 'Low', riskColor: 'green' },
  { seller: 'Glow by Tola', owner: 'Tola Adigun', kind: 'beauty', bank: 'Kuda', acct: '3001 ••• 7720', avail: '230,000', req: '200,000', net: '193,600', when: 'May 8, 16:11', risk: 'High', riskColor: 'red' },
];

// ─── 7. DISPUTES ──────────────────────────────────────
function DisputesScreen() {
  return (
    <>
      <PageHead title="Disputes" sub="3 open disputes need admin resolution"
        actions={<><button className="abtn ghost"><i className="fa-solid fa-book"></i> Resolution playbook</button></>} />

      <div className="adm-2col-asym">
        <div className="adm-card">
          <div className="adm-card-head"><h3>Open disputes</h3></div>
          <div className="adm-scroll-x">
            <table className="adm-table">
              <thead><tr><th>Case</th><th>Order</th><th>Reason</th><th>Filed by</th><th>Opened</th><th>SLA</th></tr></thead>
              <tbody>
                <tr style={{ background: '#fff7ed' }}>
                  <td className="mono">D-1024</td>
                  <td className="mono">UMP-29476</td>
                  <td>Item not as described</td>
                  <td><div className="adm-row-user"><div className="avatar f" style={{ width: 26, height: 26, fontSize: '1rem' }}>NE</div><span style={{ fontSize: '1.25rem' }}>Ngozi Eze</span></div></td>
                  <td className="muted">May 8</td>
                  <td><span className="pill red">4h left</span></td>
                </tr>
                <tr>
                  <td className="mono">D-1023</td>
                  <td className="mono">UMP-29452</td>
                  <td>Did not receive</td>
                  <td><div className="adm-row-user"><div className="avatar c" style={{ width: 26, height: 26, fontSize: '1rem' }}>CO</div><span style={{ fontSize: '1.25rem' }}>Chinedu Okeke</span></div></td>
                  <td className="muted">May 7</td>
                  <td><span className="pill amber">1d left</span></td>
                </tr>
                <tr>
                  <td className="mono">D-1022</td>
                  <td className="mono">UMP-29381</td>
                  <td>Wrong item delivered</td>
                  <td><div className="adm-row-user"><div className="avatar e" style={{ width: 26, height: 26, fontSize: '1rem' }}>FB</div><span style={{ fontSize: '1.25rem' }}>Funmi Bello</span></div></td>
                  <td className="muted">May 6</td>
                  <td><span className="pill amber">2d left</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <div>
              <h3>Case D-1024 · UMP-29476</h3>
              <div className="muted" style={{ fontSize: '1.2rem', marginTop: 2 }}>Vitamin C serum 30ml · ₦12,400</div>
            </div>
            <span className="pill red">Open · 4h SLA</span>
          </div>
          <div className="adm-card-body" style={{ maxHeight: 540, overflowY: 'auto' }}>
            <div className="adm-section-h" style={{ marginTop: 0 }}>Conversation</div>
            <div className="dispute-msg buyer">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="who">Ngozi Eze · Buyer</span>
                <span className="when">May 8, 15:42</span>
              </div>
              <p>The bottle I received is half-empty and the seal was broken. This is clearly used or tampered with. I want a full refund.</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden' }}><div className="img-ph ph-beauty" style={{ height: '100%' }}>EVID</div></div>
                <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden' }}><div className="img-ph ph-beauty" style={{ height: '100%' }}>EVID</div></div>
              </div>
            </div>
            <div className="dispute-msg seller">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="who">Tola Adigun · Glow by Tola</span>
                <span className="when">May 8, 17:20</span>
              </div>
              <p>The product was sealed when shipped — we have a video of the packing process. Happy to share. Maybe damaged in transit by the rider?</p>
            </div>
            <div className="dispute-msg admin">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="who">Admin · Olamide</span>
                <span className="when">May 8, 21:10</span>
              </div>
              <p>Requested rider footage from logistics. Will hold the seller's payout for UMP-29476 until resolution.</p>
            </div>

            <div className="adm-section-h">Resolve</div>
            <div className="adm-form-grid">
              <div className="adm-field full">
                <label className="lbl">Outcome</label>
                <select><option>Refund buyer in full</option><option>Refund 50%</option><option>Seller credit</option><option>Reject claim</option></select>
              </div>
              <div className="adm-field full">
                <label className="lbl">Internal note</label>
                <textarea placeholder="Why this outcome…"></textarea>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="abtn ghost" style={{ flex: 1 }}>Save draft</button>
              <button className="abtn primary" style={{ flex: 1.4 }}><i className="fa-solid fa-gavel"></i> Resolve & notify both parties</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── 8. ANALYTICS ─────────────────────────────────────
function AnalyticsScreen() {
  return (
    <>
      <PageHead title="Analytics" sub="GMV, fees, category & cohort performance"
        actions={<><button className="abtn ghost"><i className="fa-regular fa-calendar"></i> Last 90 days</button><button className="abtn ghost"><i className="fa-solid fa-download"></i> Export</button></>} />

      <div className="adm-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Mini label="GMV (90d)" value="₦142.8M" icon="fa-naira-sign" color="#f97316" />
        <Mini label="Platform fees" value="₦4.57M" icon="fa-percent" color="#22c55e" />
        <Mini label="Avg order value" value="₦18,420" icon="fa-cart-shopping" color="#3b82f6" />
        <Mini label="Repeat buyer rate" value="48.2%" icon="fa-rotate" color="#8b5cf6" />
      </div>

      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-head">
          <div><h3>GMV & Fees</h3><div className="muted" style={{ fontSize: '1.2rem' }}>Daily · last 30 days</div></div>
          <div className="chart-legend"><span className="l">GMV</span><span className="l b">Platform fees</span></div>
        </div>
        <div className="adm-card-body">
          <div className="chart-area" style={{ height: 260 }}>
            <LineChart data={[820,940,1020,1180,1100,1240,1320,1280,1410,1490,1450,1580,1670,1620,1740,1830,1780,1900,1980,1950,2080,2210,2330,2280,2420,2540,2480,2580,2700,2840]} height={260} />
          </div>
        </div>
      </div>

      <div className="adm-2col">
        <div className="adm-card">
          <div className="adm-card-head"><h3>Category mix (GMV)</h3></div>
          <div className="adm-card-body" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <PieChart data={[
              { v: 38, c: '#f97316' },
              { v: 22, c: '#3b82f6' },
              { v: 18, c: '#22c55e' },
              { v: 12, c: '#8b5cf6' },
              { v: 6, c: '#ec4899' },
              { v: 4, c: '#94a3b8' },
            ]} size={180} />
            <div className="pie-legend" style={{ flex: 1 }}>
              <div className="row"><span className="lbl" style={{ '--c': '#f97316' }}>Electronics</span><span className="v">38% · ₦54.3M</span></div>
              <div className="row"><span className="lbl" style={{ '--c': '#3b82f6' }}>Books</span><span className="v">22% · ₦31.4M</span></div>
              <div className="row"><span className="lbl" style={{ '--c': '#22c55e' }}>Food</span><span className="v">18% · ₦25.7M</span></div>
              <div className="row"><span className="lbl" style={{ '--c': '#8b5cf6' }}>Fashion</span><span className="v">12% · ₦17.1M</span></div>
              <div className="row"><span className="lbl" style={{ '--c': '#ec4899' }}>Beauty</span><span className="v">6% · ₦8.6M</span></div>
              <div className="row"><span className="lbl" style={{ '--c': '#94a3b8' }}>Other</span><span className="v">4% · ₦5.7M</span></div>
            </div>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head"><h3>Top sellers (90d)</h3></div>
          <div className="adm-scroll-x">
            <table className="adm-table">
              <thead><tr><th>#</th><th>Store</th><th>Orders</th><th>GMV</th></tr></thead>
              <tbody>
                {[
                  ['Bolaji Tech Hub', 412, '8.42M'],
                  ['Aisha Wears', 386, '6.12M'],
                  ['Mama Nkechi Kitchen', 824, '4.84M'],
                  ['Lekan Books', 1024, '3.20M'],
                  ['Akin Fitness', 211, '2.18M'],
                ].map((r, i) => (
                  <tr key={r[0]}><td className="mono">{String(i+1).padStart(2,'0')}</td><td>{r[0]}</td><td className="amount">{r[1]}</td><td className="amount"><span className="naira"></span>{r[2]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── 9. BROADCAST ─────────────────────────────────────
function BroadcastScreen() {
  return (
    <>
      <PageHead title="Notifications" sub="Send announcements to users — push, email, in-app" />

      <div className="adm-2col-asym">
        <div className="adm-card">
          <div className="adm-card-head"><h3>Compose broadcast</h3></div>
          <div className="adm-card-body">
            <div className="adm-section-h" style={{ marginTop: 0 }}>Audience</div>
            <div className="compose-target-row">
              <div className="compose-target active"><i className="fa-solid fa-users"></i> All users <span className="muted">14,283</span></div>
              <div className="compose-target"><i className="fa-solid fa-cart-shopping"></i> Buyers only</div>
              <div className="compose-target"><i className="fa-solid fa-store"></i> Sellers only</div>
              <div className="compose-target"><i className="fa-solid fa-briefcase"></i> Providers</div>
              <div className="compose-target"><i className="fa-solid fa-filter"></i> Custom segment…</div>
            </div>

            <div className="adm-section-h">Delivery channels</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px solid #e3e5eb', borderRadius: 10 }}>
                <span className="adm-toggle on"></span>
                <i className="fa-solid fa-bell"></i>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>In-app</div><div className="muted" style={{ fontSize: '1.15rem' }}>Bell drawer + activity badge</div></div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px solid #e3e5eb', borderRadius: 10 }}>
                <span className="adm-toggle on"></span>
                <i className="fa-solid fa-mobile-screen"></i>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>Push notification</div><div className="muted" style={{ fontSize: '1.15rem' }}>FCM · iOS + Android</div></div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, border: '1px solid #e3e5eb', borderRadius: 10 }}>
                <span className="adm-toggle"></span>
                <i className="fa-regular fa-envelope"></i>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>Email</div><div className="muted" style={{ fontSize: '1.15rem' }}>Postmark · transactional template</div></div>
              </label>
            </div>

            <div className="adm-section-h">Message</div>
            <div className="adm-form-grid">
              <div className="adm-field full">
                <label className="lbl">Title</label>
                <input value="🔥 Founders' Week — 15% off all electronics" readOnly />
              </div>
              <div className="adm-field full">
                <label className="lbl">Body</label>
                <textarea defaultValue="Tap to claim your code. Valid May 13–17. UNILAG students only. T&C apply."></textarea>
              </div>
              <div className="adm-field">
                <label className="lbl">CTA label</label>
                <input value="Browse deals" readOnly />
              </div>
              <div className="adm-field">
                <label className="lbl">CTA link</label>
                <input value="/market?promo=founders" readOnly />
              </div>
              <div className="adm-field">
                <label className="lbl">Send at</label>
                <input value="May 11, 2026 · 09:00 WAT" readOnly />
              </div>
              <div className="adm-field">
                <label className="lbl">Expires</label>
                <input value="May 17, 2026 · 23:59" readOnly />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button className="abtn ghost"><i className="fa-solid fa-paper-plane"></i> Send test to me</button>
              <div style={{ flex: 1 }}></div>
              <button className="abtn ghost">Save draft</button>
              <button className="abtn primary"><i className="fa-regular fa-clock"></i> Schedule broadcast</button>
            </div>
          </div>
        </div>

        <div>
          <div className="adm-card" style={{ marginBottom: 16 }}>
            <div className="adm-card-head"><h3>Preview</h3></div>
            <div className="adm-card-body" style={{ background: '#0f172a', borderRadius: 0 }}>
              <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 12, padding: 14, color: '#fff', backdropFilter: 'blur(20px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', opacity: .7 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--accent)' }}></div>
                  UMP · now
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.4rem', marginTop: 6 }}>🔥 Founders' Week — 15% off all electronics</div>
                <div style={{ fontSize: '1.25rem', marginTop: 4, opacity: .85 }}>Tap to claim your code. Valid May 13–17. UNILAG students only.</div>
              </div>
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-card-head"><h3>Recent broadcasts</h3></div>
            <div className="adm-scroll-x">
              <table className="adm-table">
                <thead><tr><th>Title</th><th>Sent</th><th>Reach</th><th>Open</th></tr></thead>
                <tbody>
                  <tr><td>Maintenance window · May 4</td><td className="muted">May 3</td><td className="amount">14,114</td><td className="amount">68%</td></tr>
                  <tr><td>New: Hostel listings live</td><td className="muted">Apr 28</td><td className="amount">12,840</td><td className="amount">74%</td></tr>
                  <tr><td>Refer a friend — earn ₦500</td><td className="muted">Apr 15</td><td className="amount">11,902</td><td className="amount">58%</td></tr>
                  <tr><td>Founders' Week teaser</td><td className="muted">Apr 02</td><td className="amount">10,488</td><td className="amount">62%</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── 10. CONFIG ───────────────────────────────────────
function ConfigScreen() {
  return (
    <>
      <PageHead title="Site configuration" sub="Platform-wide settings · last edit by Olamide · 2 days ago"
        actions={<><button className="abtn ghost">Discard</button><button className="abtn primary"><i className="fa-solid fa-check"></i> Save changes</button></>} />

      <div className="adm-2col">
        <div className="adm-card">
          <div className="adm-card-head"><h3>Fees & commission</h3></div>
          <div className="adm-card-body">
            <div className="adm-form-grid">
              <div className="adm-field"><label className="lbl">Platform fee (%)</label><input value="3.2" /></div>
              <div className="adm-field"><label className="lbl">Service fee (%)</label><input value="5.0" /></div>
              <div className="adm-field"><label className="lbl">Min payout (₦)</label><input value="2,000" /></div>
              <div className="adm-field"><label className="lbl">Payout cadence</label><select><option>Daily</option><option>Weekly</option></select></div>
            </div>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head"><h3>Hero carousel</h3><button className="abtn ghost sm"><i className="fa-solid fa-plus"></i> Add slide</button></div>
          <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['ph-electronics', 'Back-to-school deals', '/market?cat=electronics'],
              ['ph-hostel-2', 'Hostel hub now live', '/hostels'],
              ['ph-food', 'Eat — ₦500 off first order', '/food'],
            ].map((s, i) => (
              <div key={i} className="hero-slide-row">
                <div className="hero-drag"><i className="fa-solid fa-grip-vertical"></i></div>
                <div className="hero-thumb"><div className={'img-ph ' + s[0]} style={{ height: '100%' }}>{i+1}</div></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{s[1]}</div>
                  <div className="mono muted" style={{ fontSize: '1.15rem' }}>{s[2]}</div>
                </div>
                <span className="adm-toggle on"></span>
                <button className="icon-action"><i className="fa-solid fa-ellipsis-vertical"></i></button>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head"><h3>Featured sellers</h3></div>
          <div className="adm-card-body">
            <div style={{ marginBottom: 12 }}>
              <span className="fchip"><span className="av">BT</span> Bolaji Tech Hub <i className="fa-solid fa-xmark"></i></span>
              <span className="fchip"><span className="av" style={{ background: 'linear-gradient(135deg,#ec4899,#be185d)' }}>AW</span> Aisha Wears <i className="fa-solid fa-xmark"></i></span>
              <span className="fchip"><span className="av" style={{ background: 'linear-gradient(135deg,#22c55e,#15803d)' }}>MN</span> Mama Nkechi <i className="fa-solid fa-xmark"></i></span>
              <span className="fchip"><span className="av" style={{ background: 'linear-gradient(135deg,#3b82f6,#1e40af)' }}>LB</span> Lekan Books <i className="fa-solid fa-xmark"></i></span>
            </div>
            <div className="adm-search" style={{ maxWidth: '100%' }}>
              <i className="fa-solid fa-magnifying-glass"></i>
              <input placeholder="Search to add seller…" />
            </div>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head"><h3>Feature flags</h3></div>
          <div className="adm-card-body">
            {[
              ['Hostel listings', 'Off-campus rental hub', true],
              ['Service marketplace', 'Peer-to-peer freelance gigs', true],
              ['Wallet top-up via card', 'Paystack integration', true],
              ['Auto-translate listings', 'Yoruba / Igbo / Hausa', false],
              ['AI listing assistant', 'Suggest title & price', false],
              ['Maintenance mode', 'Block all non-admin traffic', false],
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: i < 5 ? '1px solid #f0f2f5' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{f[0]}</div>
                  <div className="muted" style={{ fontSize: '1.2rem' }}>{f[1]}</div>
                </div>
                <span className={'adm-toggle' + (f[2] ? ' on' : '')}></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── 11. ADMIN ACCOUNTS ───────────────────────────────
function AdminsScreen() {
  return (
    <>
      <PageHead title="Admin accounts" sub="14 admins · role-based permissions"
        actions={<><button className="abtn primary"><i className="fa-solid fa-user-plus"></i> Invite admin</button></>} />

      <div className="adm-2col-asym">
        <div className="adm-card">
          <div className="adm-card-head"><h3>Team</h3></div>
          <div className="adm-scroll-x">
            <table className="adm-table">
              <thead><tr><th>Admin</th><th>Role</th><th>2FA</th><th>Last active</th><th></th></tr></thead>
              <tbody>
                {[
                  ['Olamide Aluko', 'olamide@unilag.edu.ng', 'a', 'Super admin', 'admin', true, 'Now'],
                  ['Kemi Bankole', 'kemi.b@unilag.edu.ng', 'g', 'Moderator', 'admin', true, '12m ago'],
                  ['Tunde Salami', 'tunde.s@unilag.edu.ng', 'b', 'Finance', 'admin', true, '1h ago'],
                  ['Ifeoma Nwosu', 'ifeoma.n@unilag.edu.ng', 'c', 'Support', 'admin', false, '3h ago'],
                  ['Bayo Akin', 'bayo.a@unilag.edu.ng', 'd', 'Moderator', 'admin', true, '1d ago'],
                  ['Halima Yusuf', 'halima.y@unilag.edu.ng', 'e', 'Support', 'admin', true, '2d ago'],
                ].map(r => (
                  <tr key={r[1]}>
                    <td><div className="adm-row-user"><div className={'avatar ' + r[2]}>{r[0].split(' ').map(n=>n[0]).join('')}</div><div><div className="name">{r[0]}</div><div className="email">{r[1]}</div></div></div></td>
                    <td><span className={'role-pill ' + r[4]}>{r[3]}</span></td>
                    <td>{r[5] ? <span className="pill green dot">On</span> : <span className="pill amber dot">Off</span>}</td>
                    <td className="muted">{r[6]}</td>
                    <td><button className="icon-action"><i className="fa-solid fa-ellipsis-vertical"></i></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-head"><h3>Recent activity</h3></div>
          <div className="adm-card-body" style={{ maxHeight: 540, overflowY: 'auto' }}>
            {[
              ['11:42', 'Olamide', 'approved seller', 'Bolaji Tech Hub'],
              ['11:14', 'Kemi', 'resolved dispute', 'D-1021 → refund'],
              ['10:48', 'Tunde', 'batch-approved payouts', '₦612K · 6 sellers'],
              ['09:30', 'Ifeoma', 'banned user', 'Wale Iroko (spam)'],
              ['08:22', 'Olamide', 'edited site config', 'Platform fee 3.5% → 3.2%'],
              ['Yesterday', 'Bayo', 'flagged product', 'iPhone 13 Pro · counterfeit'],
              ['Yesterday', 'Halima', 'sent broadcast', 'Maintenance window May 4'],
            ].map((a, i) => (
              <div key={i} className="act-row">
                <span className="when">{a[0]}</span>
                <span><strong>{a[1]}</strong> {a[2]} <span style={{ color: 'var(--accent)' }}>{a[3]}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { OrdersScreen, PayoutsScreen, DisputesScreen, AnalyticsScreen, BroadcastScreen, ConfigScreen, AdminsScreen });
