import { Route, Routes } from 'react-router-dom';
import AdminGuard from './components/AdminGuard';
import AdminLayout from './layout/AdminLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Sellers from './pages/Sellers';
import Providers from './pages/Providers';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Payouts from './pages/Payouts';
import Disputes from './pages/Disputes';
import Analytics from './pages/Analytics';
import Broadcast from './pages/Broadcast';
import Config from './pages/Config';
import Admins from './pages/Admins';
import Placeholder from './pages/Placeholder';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminGuard />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users"      element={<Users />} />
          <Route path="sellers"    element={<Sellers />} />
          <Route path="providers"  element={<Providers />} />
          <Route path="products"   element={<Products />} />
          <Route path="services"   element={<Placeholder title="Services"          icon="fa-handshake" />} />
          <Route path="listings"   element={<Placeholder title="Listings (Hostel)" icon="fa-bed" />} />
          <Route path="categories" element={<Placeholder title="Categories"        icon="fa-folder-tree" />} />
          <Route path="orders"     element={<Orders />} />
          <Route path="bookings"   element={<Placeholder title="Bookings"          icon="fa-calendar-check" />} />
          <Route path="payouts"    element={<Payouts />} />
          <Route path="reviews"    element={<Placeholder title="Reviews"           icon="fa-star" />} />
          <Route path="disputes"   element={<Disputes />} />
          <Route path="reports"    element={<Placeholder title="Reported Content"  icon="fa-flag" />} />
          <Route path="analytics"  element={<Analytics />} />
          <Route path="broadcast"  element={<Broadcast />} />
          <Route path="config"     element={<Config />} />
          <Route path="admins"     element={<Admins />} />
        </Route>
      </Route>
    </Routes>
  );
}
