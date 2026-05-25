import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import '../admin.css';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('adm-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleToggle() {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem('adm-collapsed', next ? '1' : '0');
      return next;
    });
  }

  return (
    <div className="admin">
      {mobileOpen && <div className="adm-mob-backdrop" onClick={() => setMobileOpen(false)} />}
      <AdminSidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="adm-main">
        <AdminTopbar onMenuOpen={() => setMobileOpen(true)} />
        <div className="adm-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
