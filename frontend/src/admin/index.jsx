import { Route, Routes } from 'react-router-dom';
import AdminGuard from './components/AdminGuard';
import AdminLayout from './layout/AdminLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Sellers from './pages/Sellers';
import Providers from './pages/Providers';
import Products from './pages/Products';
import Services from './pages/Services';
import Orders from './pages/Orders';
import Payouts from './pages/Payouts';
import Disputes from './pages/Disputes';
import Analytics from './pages/Analytics';
import Broadcast from './pages/Broadcast';
import Config from './pages/Config';
import Admins from './pages/Admins';
import Listings from './pages/Listings';
import Categories from './pages/Categories';
import Bookings from './pages/Bookings';
import Reviews from './pages/Reviews';
import Reports from './pages/Reports';
import Verifications from './pages/Verifications';
import Placeholder from './pages/Placeholder';
import Coupons from './pages/Coupons';

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
          <Route path="services"   element={<Services />} />
          <Route path="listings"   element={<Listings />} />
          <Route path="categories" element={<Categories />} />
          <Route path="orders"     element={<Orders />} />
          <Route path="bookings"   element={<Bookings />} />
          <Route path="payouts"    element={<Payouts />} />
          <Route path="reviews"    element={<Reviews />} />
          <Route path="disputes"       element={<Disputes />} />
          <Route path="verifications"  element={<Verifications />} />
          <Route path="reports"    element={<Reports />} />
          <Route path="analytics"  element={<Analytics />} />
          <Route path="broadcast"  element={<Broadcast />} />
          <Route path="config"     element={<Config />} />
          <Route path="admins"     element={<Admins />} />
          <Route path="coupons"    element={<Coupons />} />
        </Route>
      </Route>
    </Routes>
  );
}
