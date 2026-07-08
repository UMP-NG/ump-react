import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

const naira = n => `₦${Number(n || 0).toLocaleString()}`;

const TABS = [
  { label: 'All',       filter: '' },
  { label: 'Buyers',    filter: 'user' },
  { label: 'Sellers',   filter: 'seller' },
  { label: 'Providers', filter: 'service_provider' },
  { label: 'Admin',     filter: 'admin' },
];

const COLORS = { Active: 'green', Suspended: 'amber', Banned: 'red', Pending: 'gray' };

const ROLE_MAP = {
  user:             { label: 'User',     cls: 'user' },
  buyer:            { label: 'Buyer',    cls: 'buyer' },
  seller:           { label: 'Seller',   cls: 'seller' },
  service_provider: { label: 'Provider', cls: 'provider' },
  admin:            { label: 'Admin',    cls: 'role-admin' },
};

function roleDisplay(r) {
  return ROLE_MAP[r] || { label: r, cls: r.replace(/_/g, '-') };
}

function sanitizeCsvCell(v) {
  const s = String(v ?? '');
  return /^[=+\-@]/.test(s) ? `\t${s}` : s;
}

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${sanitizeCsvCell(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export default function Users() {
  const [searchParams] = useSearchParams();
  const showToast = useToast();

  const [tab, setTab]           = useState(0);
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [viewUser, setViewUser]     = useState(null);

  // Wallet panel (inside the user drawer) — lazily loaded per user
  const [wallet, setWallet]           = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [giftAmount, setGiftAmount]   = useState('');
  const [giftReason, setGiftReason]   = useState('');
  const [gifting, setGifting]         = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page, limit: 10 });
    if (TABS[tab].filter) params.set('role', TABS[tab].filter);
    if (search) params.set('q', search);
    apiFetch(`/api/admins/users?${params}`)
      .then(d => { setUsers(d?.users || d || []); setTotal(d?.total || 0); })
      .catch(err => setError(err?.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [tab, page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Picks up ?q= both on first load and on later navigations from elsewhere
  // (e.g. the topbar search) while this page is already mounted — a plain
  // useState(initialQ) only runs once and misses the latter case.
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearch(q);
    setSearchInput(q);
    setPage(1);
  }, [searchParams]);

  function submitSearch(e) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const loadWallet = useCallback((userId) => {
    setWalletLoading(true);
    apiFetch(`/api/wallet/admin/${userId}`)
      .then(d => setWallet(d))
      .catch(() => setWallet(null))
      .finally(() => setWalletLoading(false));
  }, []);

  useEffect(() => {
    if (!viewUser) { setWallet(null); setGiftAmount(''); setGiftReason(''); return; }
    loadWallet(viewUser._id);
  }, [viewUser, loadWallet]);

  async function sendGift() {
    const amount = Number(giftAmount);
    if (!amount || amount <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    setGifting(true);
    try {
      await apiFetch('/api/wallet/gift', {
        method: 'POST',
        body: { userId: viewUser._id, amount, reason: giftReason.trim() || undefined },
      });
      showToast(`${naira(amount)} gifted to ${viewUser.name || viewUser.email}`, 'success');
      setGiftAmount('');
      setGiftReason('');
      loadWallet(viewUser._id);
    } catch (err) {
      showToast(err?.message || 'Failed to send gift', 'error');
    } finally {
      setGifting(false);
    }
  }

  const initials = name => name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U';
  const AV_COLORS = ['av-a', 'av-b', 'av-c', 'av-d', 'av-e', 'av-f', 'av-g'];
  const avColor   = idx => AV_COLORS[idx % AV_COLORS.length];

  function userStatus(u) {
    if (u.isBlocked || u.status === 'banned')       return 'Banned';
    if (u.isSuspended || u.status === 'inactive')   return 'Suspended';
    if (u.emailVerified === false || !u.isVerified) return 'Pending';
    return 'Active';
  }

  async function toggleBan(userId, status) {
    const isBanned = status === 'Banned';
    const confirmed = window.confirm(
      isBanned
        ? 'Remove ban? This user will regain full platform access.'
        : 'Ban this user? They will be locked out of their account immediately.'
    );
    if (!confirmed) return;
    await apiFetch(`/api/admins/users/${userId}/${isBanned ? 'unban' : 'ban'}`, { method: 'POST' }).catch(() => null);
    fetchUsers();
  }

  function exportCSV() {
    if (!users.length) return;
    const header = ['Name', 'Email', 'Roles', 'Joined', 'Orders', 'Status'];
    const rows = users.map(u => {
      const roles = Array.isArray(u.roles) ? u.roles : [u.role].filter(Boolean);
      return [
        u.name    || '—',
        u.email   || '—',
        roles.join(', '),
        u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : '—',
        u.orderCount ?? 0,
        userStatus(u),
      ];
    });
    downloadCSV([header, ...rows], `ump-users-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <>
      {/* ── View user drawer ─────────────────────────────────── */}
      {viewUser && (
        <div className="adm-drawer-shell" onClick={() => setViewUser(null)}>
          <div className="adm-drawer" onClick={e => e.stopPropagation()}>
            <div className="adm-drawer-head">
              <div>
                <h3 style={{ margin: 0 }}>User details</h3>
                <div style={{ fontSize: '1.2rem', color: 'var(--ink-3)', marginTop: 2 }}>{viewUser.email}</div>
              </div>
              <button className="icon-btn" onClick={() => setViewUser(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="adm-drawer-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div className={`adm-av-standalone ${avColor(users.indexOf(viewUser))}`}>{initials(viewUser.name)}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.6rem', lineHeight: 1.2 }}>{viewUser.name || '—'}</div>
                  <div className="role-pills" style={{ marginTop: 6 }}>
                    {(Array.isArray(viewUser.roles) ? viewUser.roles : [viewUser.role].filter(Boolean)).map(r => {
                      const { label, cls } = roleDisplay(r);
                      return <span key={r} className={`role-pill ${cls}`}>{label}</span>;
                    })}
                  </div>
                </div>
              </div>
              <div className="adm-kv" style={{ gap: '12px 16px', fontSize: '1.3rem' }}>
                <span className="k">Status</span>
                <span className="v">
                  <span className={`pill dot ${COLORS[userStatus(viewUser)] || 'gray'}`}>{userStatus(viewUser)}</span>
                </span>
                <span className="k">Joined</span>
                <span className="v">
                  {viewUser.createdAt
                    ? new Date(viewUser.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'}
                </span>
                <span className="k">Orders</span>
                <span className="v">{viewUser.orderCount ?? 0}</span>
                <span className="k">Email</span>
                <span className="v">{viewUser.email}</span>
                {viewUser.referralCode && <><span className="k">Referral code</span><span className="v" style={{ fontFamily: 'monospace' }}>{viewUser.referralCode}</span></>}
                {viewUser.phone && <><span className="k">Phone</span><span className="v">{viewUser.phone}</span></>}
                {viewUser.address && <><span className="k">Address</span><span className="v">{viewUser.address}</span></>}
                <span className="k">Auth</span>
                <span className="v">{viewUser.googleAccount ? 'Google OAuth' : 'Email & password'}</span>
              </div>

              {/* ── Wallet ── */}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '1.4rem' }}>
                  <i className="fa-solid fa-wallet" style={{ marginRight: 8, color: 'var(--accent)' }}></i>Wallet
                </h4>

                {walletLoading ? (
                  <div style={{ color: 'var(--ink-3)', fontSize: '1.3rem' }}>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Loading wallet…
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                      <div style={{ padding: 12, borderRadius: 8, background: 'rgba(59,130,246,.08)' }}>
                        <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)' }}>Withdrawable</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{naira(wallet?.withdrawableBalance)}</div>
                      </div>
                      <div style={{ padding: 12, borderRadius: 8, background: 'rgba(16,185,129,.08)' }}>
                        <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)' }}>🎁 Gift credits</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{naira(wallet?.giftCredits)}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>Send gift credits</div>
                    <p style={{ margin: '0 0 10px', fontSize: '1.15rem', color: 'var(--ink-3)' }}>
                      Site-only funds — can be used to buy on UMP but never transferred or withdrawn to a bank account.
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input
                        type="number"
                        min="1"
                        placeholder="Amount (₦)"
                        value={giftAmount}
                        onChange={e => setGiftAmount(e.target.value)}
                        style={{ flex: 1, padding: '8px 10px', fontSize: '1.2rem', border: '1px solid #e3e5eb', borderRadius: 8 }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Reason (optional, e.g. referral bonus)"
                      value={giftReason}
                      onChange={e => setGiftReason(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '1.2rem', border: '1px solid #e3e5eb', borderRadius: 8, marginBottom: 10, boxSizing: 'border-box' }}
                    />
                    <button className="abtn sm" style={{ background: '#10b981', color: '#fff', border: 'none' }} disabled={gifting || !giftAmount} onClick={sendGift}>
                      {gifting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="fa-solid fa-gift"></i> Send gift</>}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="adm-drawer-foot">
              {userStatus(viewUser) !== 'Banned' ? (
                <button
                  className="abtn danger sm"
                  onClick={() => { setViewUser(null); toggleBan(viewUser._id, userStatus(viewUser)); }}
                >
                  <i className="fa-solid fa-ban"></i> Ban user
                </button>
              ) : (
                <button
                  className="abtn success sm"
                  onClick={() => { setViewUser(null); toggleBan(viewUser._id, 'Banned'); }}
                >
                  <i className="fa-solid fa-lock-open"></i> Unban
                </button>
              )}
              <button className="abtn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setViewUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="adm-page-head">
        <div className="left">
          <h1>Users</h1>
          <p>{total.toLocaleString()} registered accounts across all roles</p>
        </div>
        <div className="right">
          <button className="abtn ghost" onClick={fetchUsers} disabled={loading} title="Refresh">
            <i className={`fa-solid fa-rotate-right${loading ? ' fa-spin' : ''}`}></i> Refresh
          </button>
          <button className="abtn ghost" onClick={exportCSV} disabled={!users.length}>
            <i className="fa-solid fa-download"></i> Export CSV
          </button>
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────── */}
      <div className="adm-filterbar">
        <div className="adm-tabs">
          {TABS.map((t, i) => (
            <button
              key={t.label}
              className={`tab${tab === i ? ' active' : ''}`}
              onClick={() => { setTab(i); setPage(1); }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }}></div>
        <form className="adm-search" style={{ maxWidth: 280 }} onSubmit={submitSearch}>
          <button type="submit" className="adm-search-icon-btn" title="Search" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
          <input
            placeholder="Search name, email, or referral code…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={searchInput ? { paddingRight: 34 } : undefined}
          />
          {searchInput && (
            <button
              type="button"
              className="adm-search-clear-btn"
              title="Clear"
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-3)' }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </form>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="adm-card">
        <div className="adm-scroll-x">
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Roles</th>
                <th>Joined</th>
                <th>Orders</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="6">
                    <div className="adm-empty" style={{ color: '#dc2626' }}>
                      <i className="fa-solid fa-circle-exclamation"></i>
                      <p>{error}</p>
                      <button className="abtn ghost sm" style={{ marginTop: 8 }} onClick={fetchUsers}>
                        <i className="fa-solid fa-rotate-right" /> Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="adm-empty">
                      <i className="fa-solid fa-users"></i>
                      <p>No users found</p>
                    </div>
                  </td>
                </tr>
              ) : users.map((u, i) => {
                const status = userStatus(u);
                const roles  = Array.isArray(u.roles) ? u.roles : [u.role].filter(Boolean);
                return (
                  <tr key={u._id} style={{ cursor: 'pointer' }} onClick={() => setViewUser(u)}>
                    <td>
                      <div className="adm-row-user">
                        <div className={`adm-av ${avColor(i)}`}>{initials(u.name)}</div>
                        <div>
                          <div className="name">{u.name}</div>
                          <div className="email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="role-pills">
                        {roles.map(r => {
                          const { label, cls } = roleDisplay(r);
                          return <span key={r} className={`role-pill ${cls}`}>{label}</span>;
                        })}
                      </div>
                    </td>
                    <td className="muted">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="amount">{u.orderCount ?? 0}</td>
                    <td><span className={`pill dot ${COLORS[status] || 'gray'}`}>{status}</span></td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button
                        className="icon-action"
                        title={status === 'Banned' ? 'Unban' : 'Ban'}
                        onClick={() => toggleBan(u._id, status)}
                      >
                        <i className={`fa-solid ${status === 'Banned' ? 'fa-lock-open' : 'fa-ban'}`}></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {total > 10 && (
          <div className="adm-pagination">
            <span>Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, total)} of {total.toLocaleString()}</span>
            <div className="pages">
              <button className="icon-action" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              {page > 1 && <button className="abtn sm ghost" onClick={() => setPage(page - 1)}>{page - 1}</button>}
              <button className="abtn sm dark">{page}</button>
              {page * 10 < total && <button className="abtn sm ghost" onClick={() => setPage(page + 1)}>{page + 1}</button>}
              <button className="icon-action" disabled={page * 10 >= total} onClick={() => setPage(p => p + 1)}>
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
