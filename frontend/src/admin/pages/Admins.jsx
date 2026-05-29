import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const ROLE_LABELS = { superadmin: 'Super admin', moderator: 'Moderator', finance: 'Finance', support: 'Support', admin: 'Admin' };
const AV_COLORS = ['', 'av-b', 'av-c', 'av-d', 'av-e', 'av-f', 'av-g'];

const SUPPORT_ROLE_LABELS = {
  technical:      'Technical Support',
  administrative: 'Administrative',
};

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Support role management
  const [supportAdmins, setSupportAdmins] = useState([]);
  const [supportLoading, setSupportLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/admins/team').catch(() => []),
      apiFetch('/api/admins/activity?limit=10').catch(() => []),
    ]).then(([team, log]) => {
      setAdmins(Array.isArray(team) ? team : team?.admins || []);
      setActivity(Array.isArray(log) ? log : log?.activity || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    apiFetch('/api/admins/support/admins')
      .then(d => setSupportAdmins(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setSupportLoading(false));
  }, []);

  async function setSupportRole(userId, role) {
    setUpdatingRole(userId);
    try {
      await apiFetch(`/api/admins/support/admins/${userId}/role`, { method: 'PUT', body: { supportRole: role } });
      setSupportAdmins(prev => prev.map(a => a._id === userId ? { ...a, supportRole: role || null } : a));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingRole(null);
    }
  }

  const initials = name => name ? name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'AD';

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Admin accounts</h1>
          <p>{admins.length} admin{admins.length !== 1 ? 's' : ''} · role-based permissions</p>
        </div>
      </div>

      {/* ── Support contact roles ── */}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-head">
          <h3>Support contact roles</h3>
          <p style={{ fontSize: '1.2rem', color: 'var(--ink-3)', margin: 0 }}>
            Assign each admin a support role so users know who to contact. Admins without a role won't appear in the user-facing contact picker.
          </p>
        </div>
        <div className="adm-card-body">
          {supportLoading ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)' }}>
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            </div>
          ) : supportAdmins.length === 0 ? (
            <div className="adm-empty"><i className="fa-solid fa-user-shield"></i><p>No admin accounts found in user records</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {supportAdmins.map((a, i) => (
                <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < supportAdmins.length - 1 ? '1px solid var(--line)' : 'none', flexWrap: 'wrap' }}>
                  <div className={`adm-av ${AV_COLORS[i % AV_COLORS.length]}`} style={{ width: 38, height: 38, fontSize: '1.3rem', flexShrink: 0 }}>
                    {a.name ? a.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'AD'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '1.3rem', color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name || '—'}</div>
                    <div style={{ fontSize: '1.1rem', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {a.supportRole && (
                      <span className={`pill dot ${a.supportRole === 'technical' ? 'blue' : 'amber'}`} style={{ whiteSpace: 'nowrap' }}>
                        {SUPPORT_ROLE_LABELS[a.supportRole]}
                      </span>
                    )}
                    <select
                      style={{ height: 34, border: '1px solid #e3e5eb', borderRadius: 8, padding: '0 10px', fontSize: '1.2rem', fontFamily: 'inherit', cursor: 'pointer', background: 'var(--paper)', color: 'var(--ink-1)', outline: 'none', maxWidth: 180 }}
                      value={a.supportRole || ''}
                      disabled={updatingRole === a._id}
                      onChange={e => setSupportRole(a._id, e.target.value)}
                    >
                      <option value="">No role</option>
                      <option value="technical">Technical Support</option>
                      <option value="administrative">Administrative</option>
                    </select>
                    {updatingRole === a._id && <i className="fa-solid fa-circle-notch fa-spin" style={{ color: 'var(--ink-3)', fontSize: '1.2rem', flexShrink: 0 }}></i>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="adm-2col-asym">
        <div className="adm-card">
          <div className="adm-card-head"><h3>Team</h3></div>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            </div>
          ) : admins.length === 0 ? (
            <div className="adm-empty"><i className="fa-solid fa-user-shield"></i><p>No admins found</p></div>
          ) : (
            <div className="adm-scroll-x">
              <table className="adm-table">
                <thead>
                  <tr><th>Admin</th><th>Role</th><th>2FA</th><th>Last active</th><th></th></tr>
                </thead>
                <tbody>
                  {admins.map((a, i) => (
                    <tr key={a._id || a.email}>
                      <td>
                        <div className="adm-row-user">
                          <div className={`adm-av ${AV_COLORS[i % AV_COLORS.length]}`}>{initials(a.name)}</div>
                          <div>
                            <div className="name">{a.name}</div>
                            <div className="email">{a.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="role-pill role-admin">{ROLE_LABELS[a.adminRole] || a.adminRole || 'Admin'}</span></td>
                      <td>{a.twoFAEnabled ? <span className="pill green dot">On</span> : <span className="pill amber dot">Off</span>}</td>
                      <td className="muted">{a.lastActiveLabel || (a.lastActive ? new Date(a.lastActive).toLocaleDateString() : '—')}</td>
                      <td><button className="icon-action"><i className="fa-solid fa-ellipsis-vertical"></i></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="adm-card">
          <div className="adm-card-head"><h3>Recent activity</h3></div>
          <div className="adm-card-body" style={{ maxHeight: 540, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}><i className="fa-solid fa-circle-notch fa-spin"></i></div>
            ) : activity.length > 0 ? activity.map((a, i) => (
              <div key={i} className="act-row">
                <span className="when">{a.timeLabel || new Date(a.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                <span>
                  <strong>{a.adminName}</strong> {a.action}{' '}
                  <span style={{ color: 'var(--accent)' }}>{a.target}</span>
                </span>
              </div>
            )) : (
              <div className="adm-empty"><i className="fa-solid fa-clock-rotate-left"></i><p>No admin activity recorded yet</p></div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
