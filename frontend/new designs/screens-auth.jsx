/* global React */

// ---------- LOGIN (mobile) ----------
function LoginMobile({ onNav }) {
  const [tab, setTab] = React.useState('signin');
  const [show, setShow] = React.useState(false);
  return (
    <div className="phone-scroll">
      <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="icon-btn" style={{ background: 'var(--surface)' }} onClick={() => onNav?.('home')}><Icon n="arrow-left" /></button>
        <Logo />
        <span style={{ width: 40 }} />
      </div>

      <div style={{ padding: '24px 24px 0' }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
          {tab === 'signin' ? 'Welcome back, Akokite' : 'Join the campus'}
        </h1>
        <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: '1.4rem' }}>
          {tab === 'signin' ? 'Sign in with your UNILAG email to continue.' : 'Create your account in under 60 seconds.'}
        </p>
      </div>

      <div style={{ padding: '20px 24px 0' }}>
        <div className="tabs">
          <button className={`tab ${tab === 'signin' ? 'active' : ''}`} onClick={() => setTab('signin')}>Sign In</button>
          <button className={`tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Sign Up</button>
        </div>
      </div>

      <div style={{ padding: '20px 24px 0' }}>
        {tab === 'signup' && <>
          <div className="label">Full name</div>
          <input className="input" placeholder="Aisha Ogundimu" />
          <div style={{ height: 14 }} />
        </>}
        <div className="label">Email</div>
        <div style={{ position: 'relative' }}>
          <input className="input" placeholder="aisha@unilag.edu.ng" defaultValue={tab==='signin'?'aisha@unilag.edu.ng':''} style={{ paddingRight: 100 }} />
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'var(--surface)', color: 'var(--ink-3)', padding: '4px 8px', fontSize: '1.1rem', fontWeight: 600, borderRadius: 8 }}>@unilag</span>
        </div>
        <div style={{ height: 14 }} />
        <div className="label">Password</div>
        <div style={{ position: 'relative' }}>
          <input className="input" type={show ? 'text' : 'password'} defaultValue="••••••••" style={{ paddingRight: 44 }} />
          <button className="icon-btn" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 4, top: 4, color: 'var(--ink-3)' }}>
            <IconR n={show ? 'eye-slash' : 'eye'} />
          </button>
        </div>
        {tab === 'signup' && <>
          <div style={{ height: 14 }} />
          <div className="label">Confirm password</div>
          <input className="input" type="password" placeholder="••••••••" />
        </>}
        {tab === 'signin' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', color: 'var(--ink-2)' }}>
              <input type="checkbox" defaultChecked /> Remember me
            </label>
            <a style={{ fontSize: '1.2rem', color: 'var(--accent)', fontWeight: 600 }} onClick={() => onNav?.('forgot')}>Forgot password?</a>
          </div>
        )}
        <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 20 }} onClick={() => onNav?.(tab === 'signin' ? 'home' : 'otp')}>
          {tab === 'signin' ? 'Sign in' : 'Create account'} <Icon n="arrow-right" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span style={{ color: 'var(--ink-3)', fontSize: '1.1rem', fontWeight: 600 }}>OR CONTINUE WITH</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-light" style={{ flex: 1 }}><IconB n="google" /> Google</button>
          <button className="btn btn-light" style={{ flex: 1 }}><IconB n="apple" /> Apple</button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: '1.2rem', color: 'var(--ink-3)' }}>
          By continuing you agree to our <a style={{ color: 'var(--ink-1)', fontWeight: 600 }}>Terms</a> & <a style={{ color: 'var(--ink-1)', fontWeight: 600 }}>Privacy</a>.
        </p>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

// ---------- OTP ----------
function OtpMobile({ onNav }) {
  const [v, setV] = React.useState(['1','7','2','9','','']);
  return (
    <div className="phone-scroll">
      <div style={{ padding: '12px 16px 0' }}>
        <button className="icon-btn" style={{ background: 'var(--surface)' }} onClick={() => onNav?.('login')}><Icon n="arrow-left" /></button>
      </div>
      <div style={{ padding: '40px 24px 0', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, margin: '0 auto 24px', borderRadius: 24, background: 'rgba(249,115,22,.12)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
          <Icon n="envelope-circle-check" />
        </div>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Verify your email</h1>
        <p style={{ color: 'var(--ink-2)', fontSize: '1.4rem', margin: 0 }}>
          We sent a 6-digit code to<br/>
          <strong style={{ color: 'var(--ink-1)' }}>aisha@unilag.edu.ng</strong>
        </p>
      </div>
      <div style={{ padding: '32px 24px 0', display: 'flex', gap: 8, justifyContent: 'center' }}>
        {v.map((d, i) => (
          <input key={i} value={d} readOnly style={{
            width: 48, height: 56, textAlign: 'center', fontSize: '2.4rem', fontWeight: 800,
            border: d ? '2px solid var(--accent)' : '1px solid var(--line-strong)',
            borderRadius: 'var(--r-md)', background: d ? 'rgba(249,115,22,.04)' : '#fff',
            color: 'var(--ink-1)', outline: 'none',
          }} />
        ))}
      </div>
      <div style={{ padding: '24px 24px 0' }}>
        <button className="btn btn-primary btn-block btn-lg" onClick={() => onNav?.('home')}>Verify <Icon n="arrow-right" /></button>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '1.3rem', color: 'var(--ink-3)' }}>
          Didn't get the code? <a style={{ color: 'var(--accent)', fontWeight: 700 }}>Resend in 0:42</a>
        </p>
      </div>
    </div>
  );
}

window.LoginMobile = LoginMobile;
window.OtpMobile = OtpMobile;
