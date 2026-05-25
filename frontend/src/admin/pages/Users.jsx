import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';

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

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
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
  const [tab, setTab]           = useState(0);
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [viewUser, setViewUser] = useState(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 10 });
    if (TABS[tab].filter) params.set('role', TABS[tab].filter);
    if (search) params.set('q', search);
    apiFetch(`/api/admins/users?${params}`)
      .then(d => { setUsers(d?.users || d || []); setTotal(d?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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
                <div className={`adm-av-standalone av-b`}>{initials(viewUser.name)}</div>
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
                {viewUser.phone && <><span className="k">Phone</span><span className="v">{viewUser.phone}</span></>}
                {viewUser.address && <><span className="k">Address</span><span className="v">{viewUser.address}</span></>}
                <span className="k">Auth</span>
                <span className="v">{viewUser.googleAccount ? 'Google OAuth' : 'Email & password'}</span>
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
        <div className="adm-search" style={{ maxWidth: 280 }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            placeholder="Search users…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
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
                        title="View user"
                        onClick={() => setViewUser(u)}
                      >
                        <i className="fa-solid fa-eye"></i>
                      </button>
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
