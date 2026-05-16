import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

export default function AdminGuard() {
  const { user } = useUser();

  if (user === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f6f8' }}>
        <div style={{ textAlign: 'center', color: 'var(--ink-3)' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2.4rem', color: 'var(--accent)' }}></i>
        </div>
      </div>
    );
  }

  const isAdmin = Array.isArray(user?.roles) ? user.roles.includes('admin') : user?.role === 'admin';
  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
