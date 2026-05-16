import { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const ROLE_LABELS = { superadmin: 'Super admin', moderator: 'Moderator', finance: 'Finance', support: 'Support', admin: 'Admin' };
const AV_COLORS = ['', 'av-b', 'av-c', 'av-d', 'av-e', 'av-f', 'av-g'];

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/admins/team').catch(() => []),
      apiFetch('/api/admins/activity?limit=10').catch(() => []),
    ]).then(([team, log]) => {
      setAdmins(Array.isArray(team) ? team : team?.admins || []);
      setActivity(Array.isArray(log) ? log : log?.activity || []);
    }).finally(() => setLoading(false));
  }, []);

  async function invite() {
    if (!inviteEmail) return;
    setInviting(true);
    await apiFetch('/api/admins/invite', { method: 'POST', body: { email: inviteEmail } }).catch(() => null);
    setInviting(false);
    setInviteEmail('');
    setShowInvite(false);
  }

  const initials = name => name ? name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'AD';

  return (
    <>
      <div className="adm-page-head">
        <div className="left">
          <h1>Admin accounts</h1>
          <p>{admins.length} admin{admins.length !== 1 ? 's' : ''} · role-based permissions</p>
        </div>
        <div className="right">
          <button className="abtn primary" onClick={() => setShowInvite(v => !v)}>
            <i className="fa-solid fa-user-plus"></i> Invite admin
          </button>
        </div>
      </div>

      {showInvite && (
        <div className="adm-card" style={{ marginBottom: 16 }}>
          <div className="adm-card-body">
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="adm-field"
                style={{ flex: 1, height: 38, border: '1px solid #e3e5eb', borderRadius: 9, padding: '0 12px', fontSize: '1.3rem', fontFamily: 'inherit', outline: 'none' }}
                placeholder="admin@unilag.edu.ng"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && invite()}
              />
              <button className="abtn primary" disabled={inviting || !inviteEmail} onClick={invite}>
                {inviting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Send invite'}
              </button>
              <button className="abtn ghost" onClick={() => setShowInvite(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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
                      <td><span className="role-pill admin">{ROLE_LABELS[a.adminRole] || a.adminRole || 'Admin'}</span></td>
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
            {activity.length > 0 ? activity.map((a, i) => (
              <div key={i} className="act-row">
                <span className="when">{a.timeLabel || new Date(a.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                <span>
                  <strong>{a.adminName}</strong> {a.action}{' '}
                  <span style={{ color: 'var(--accent)' }}>{a.target}</span>
                </span>
              </div>
            )) : (
              [
                ['11:42', 'Olamide', 'approved seller', 'Bolaji Tech Hub'],
                ['11:14', 'Kemi',    'resolved dispute', 'D-1021 → refund'],
                ['10:48', 'Tunde',   'batch-approved payouts', '₦612K · 6 sellers'],
                ['09:30', 'Ifeoma',  'banned user', 'Wale Iroko (spam)'],
                ['08:22', 'Olamide', 'edited site config', 'Platform fee 3.5% → 3.2%'],
              ].map((a, i) => (
                <div key={i} className="act-row">
                  <span className="when">{a[0]}</span>
                  <span><strong>{a[1]}</strong> {a[2]} <span style={{ color: 'var(--accent)' }}>{a[3]}</span></span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
