/* global React */

// ---------- MESSAGES (mobile) — chat thread view ----------
function MessagesMobile({ onNav }) {
  const [view, setView] = React.useState('thread'); // 'list' | 'thread'
  return (
    <div className="phone-scroll">
      {view === 'list' ? <MsgList onOpen={() => setView('thread')} onNav={onNav} /> : <MsgThread onBack={() => setView('list')} onNav={onNav} />}
    </div>
  );
}

const CONVOS = [
  { id: 1, name: 'Tunde A.', last: 'Yes the iPhone is still available 🙌', time: '2m', unread: 2, online: true, kind: 'portrait-3', tag: 'Seller' },
  { id: 2, name: 'Adaeze O.', last: 'Sent the design files, check it', time: '1h', unread: 0, online: true, kind: 'portrait-1', tag: 'Designer' },
  { id: 3, name: 'Chiamaka I.', last: 'See you at 4pm in Mass Comm', time: '3h', unread: 0, online: false, kind: 'portrait-2', tag: 'Tutor' },
  { id: 4, name: 'Femi B.', last: 'Photoshoot rate is ₦15k flat', time: '1d', unread: 0, online: false, kind: 'portrait-4', tag: 'Photographer' },
  { id: 5, name: 'Sr Eze (Food)', last: 'Jollof ready 🍚 come and pick', time: 'Yesterday', unread: 1, online: true, kind: 'portrait-5', tag: 'Seller' },
  { id: 6, name: 'UMP Support', last: 'Welcome to UMP! Tap to learn…', time: 'Mon', unread: 0, online: true, kind: 'portrait-6', tag: 'Official' },
];

function MsgList({ onOpen, onNav }) {
  return (
    <>
      <Navbar onNav={onNav} onProfileClick={() => onNav?.('profile')} />
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Messages</h1>
        <button className="icon-btn" style={{ background: 'var(--accent)', color: '#fff' }}><Icon n="pen-to-square" /></button>
      </div>
      <div style={{ padding: '12px 16px 0' }}>
        <div className="search-wrap">
          <Icon n="magnifying-glass" className="search-icon" />
          <input className="input" placeholder="Search messages…" />
        </div>
      </div>
      <div style={{ padding: '8px 16px 0', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {['All', 'Buying', 'Selling', 'Services', 'Unread'].map((c, i) => (
          <span key={c} className={`chip ${i === 0 ? 'active' : ''}`}>{c}</span>
        ))}
      </div>
      <div style={{ padding: '16px 0 0' }}>
        {CONVOS.map((c, i) => (
          <button key={c.id} onClick={i === 0 ? onOpen : undefined} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', borderTop: i === 0 ? 'none' : '1px solid var(--line)', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden' }}>
                <Ph kind={c.kind} label={c.name[0]} />
              </div>
              {c.online && <span style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: 'var(--online)', border: '2px solid var(--paper)' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                <strong style={{ fontSize: '1.4rem' }}>{c.name}</strong>
                <span style={{ fontSize: '1.1rem', color: c.unread ? 'var(--accent)' : 'var(--ink-3)', fontWeight: c.unread ? 700 : 500 }}>{c.time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.3rem', color: c.unread ? 'var(--ink-1)' : 'var(--ink-3)', fontWeight: c.unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last}</span>
                {c.unread > 0 && <span style={{ background: 'var(--accent)', color: '#fff', minWidth: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}>{c.unread}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div style={{ height: 80 }} />
      <BottomNav active="messages" onNav={onNav} />
    </>
  );
}

function MsgThread({ onBack, onNav }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* header */}
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
        <button className="icon-btn" onClick={onBack}><Icon n="arrow-left" /></button>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden' }}><Ph kind="portrait-3" label="T" /></div>
          <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: 'var(--online)', border: '2px solid #fff' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ fontSize: '1.4rem' }}>Tunde A.</strong>
            <Icon n="circle-check" style={{ color: 'var(--accent)', fontSize: '1.1rem' }} />
          </div>
          <div style={{ fontSize: '1.1rem', color: 'var(--online)' }}>Online · Active now</div>
        </div>
        <button className="icon-btn"><Icon n="phone" /></button>
        <button className="icon-btn"><Icon n="ellipsis-vertical" /></button>
      </div>

      {/* messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface)' }}>
        <div style={{ alignSelf: 'center', fontSize: '1.1rem', color: 'var(--ink-3)', fontWeight: 600, padding: '4px 12px', background: 'var(--white)', borderRadius: 'var(--r-pill)' }}>Today</div>

        {/* product card link in chat */}
        <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: '#fff', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ height: 120 }}><Ph kind="electronics" label="iPhone 12" /></div>
          <div style={{ padding: 10 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>iPhone 12 — 128GB</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>{naira(285000)}</div>
          </div>
        </div>

        <Bub side="me" t="Hey Tunde, is the iPhone 12 still available?" time="9:32 AM" />
        <Bub side="them" t="Yes! It's still here. 92% battery health, comes with original charger and box." time="9:33 AM" />
        <Bub side="them" t="Where are you on campus?" time="9:33 AM" />
        <Bub side="me" t="I stay at Moremi. Can we meet at MBA hall today around 4?" time="9:35 AM" />

        {/* image message */}
        <div style={{ alignSelf: 'flex-start', maxWidth: '70%' }}>
          <div style={{ borderRadius: 18, overflow: 'hidden', height: 140 }}>
            <Ph kind="electronics" label="photo · battery health" />
          </div>
          <div style={{ fontSize: '1rem', color: 'var(--ink-3)', marginTop: 4 }}>9:36 AM</div>
        </div>

        <Bub side="them" t="That works. Sending battery cert now ☝️" time="9:36 AM" />
        <Bub side="me" t="Perfect, locking it in. See you at 4." time="9:38 AM" read />
        <Bub side="them" t="Yes the iPhone is still available 🙌" time="9:40 AM" />

        <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#fff', borderRadius: 'var(--r-pill)' }}>
          <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-3)', animation: 'pulse 1.4s infinite' }} />
          <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-3)', animation: 'pulse 1.4s infinite .2s' }} />
          <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-3)', animation: 'pulse 1.4s infinite .4s' }} />
        </div>
      </div>

      {/* input */}
      <div style={{ padding: '10px 12px 22px', borderTop: '1px solid var(--line)', background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="icon-btn"><Icon n="plus" /></button>
        <button className="icon-btn"><Icon n="image" /></button>
        <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 'var(--r-pill)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '1.4rem', fontFamily: 'var(--font-sans)' }} placeholder="Message Tunde…" defaultValue="Sounds good 🤝" />
          <button className="icon-btn" style={{ width: 30, height: 30 }}><Icon n="face-smile" /></button>
        </div>
        <button className="icon-btn" style={{ background: 'var(--accent)', color: '#fff' }}><Icon n="paper-plane" /></button>
      </div>
    </div>
  );
}

function Bub({ side, t, time, read }) {
  const me = side === 'me';
  return (
    <div style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
      <div style={{
        background: me ? 'var(--accent)' : '#fff',
        color: me ? '#fff' : 'var(--ink-1)',
        padding: '10px 14px',
        borderRadius: me ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        fontSize: '1.4rem',
        lineHeight: 1.4,
      }}>{t}</div>
      <div style={{ fontSize: '1rem', color: 'var(--ink-3)', marginTop: 4, textAlign: me ? 'right' : 'left' }}>
        {time} {read && me && <Icon n="check-double" style={{ color: 'var(--online)' }} />}
      </div>
    </div>
  );
}

window.MessagesMobile = MessagesMobile;
window.MsgList = MsgList;
