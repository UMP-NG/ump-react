import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';

const TABS = [
  { label: 'All',       filter: '' },
  { label: 'Buyers',    filter: 'buyer' },
  { label: 'Sellers',   filter: 'seller' },
  { label: 'Providers', filter: 'provider' },
  { label: 'Admin',     filter: 'admin' },
];
const COLORS = { Active: 'green', Suspended: 'amber', Banned: 'red', Pending: 'gray' };

export default function Users() {
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const initials = name => name ? name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'U';
  const AV_COLORS = ['', 'av-b', 'av-c', 'av-d', 'av-e', 'av-f', 'av-g'];
  const avColor = idx => AV_COLORS[idx % AV_COLORS.length];

  async function toggleBan(userId, currentStatus) {
    const action = currentStatus === 'Banned' ? 'unban' : 'ban';
    await apiFetch(`/api/admins/users/${userId}/${action}`, { method: 'POST' }).catch(() => null);
    fetchUsers();
  }

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Users</h1>
          <p>{total.toLocaleString()} registered accounts across all roles</p>
        </div>
        <div className="right">
          <button className="abtn ghost"><i className="fa-solid fa-download"></i> Export CSV</button>
          <button className="abtn primary"><i className="fa-solid fa-user-plus"></i> Invite admin</button>
        </div>
      </div>

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
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="6">
                  <div className="adm-empty"><i className="fa-solid fa-users"></i><p>No users found</p></div>
                </td></tr>
              ) : users.map((u, i) => {
                const status = u.isBlocked ? 'Banned' : u.isSuspended ? 'Suspended' : u.emailVerified === false ? 'Pending' : 'Active';
                const roles = Array.isArray(u.roles) ? u.roles : [u.role].filter(Boolean);
                return (
                  <tr key={u._id}>
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
                        {roles.map(r => <span key={r} className={`role-pill ${r}`}>{r}</span>)}
                      </div>
                    </td>
                    <td className="muted">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="amount">{u.orderCount ?? 0}</td>
                    <td><span className={`pill dot ${COLORS[status] || 'gray'}`}>{status}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="icon-action" title="View user"><i className="fa-solid fa-eye"></i></button>
                      <button className="icon-action" title={status === 'Banned' ? 'Unban' : 'Ban'} onClick={() => toggleBan(u._id, status)}>
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
