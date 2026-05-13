import { Routes, Route } from "react-router-dom";
import FloatingChat from "./components/FloatingChat";
import PrivateRoute from "./components/PrivateRoute";
import InstallPrompt from "./components/InstallPrompt";

import Home from "./pages/Home";
import Market from "./pages/Market";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import PaymentSuccess from "./pages/PaymentSuccess";

import Login from "./pages/Login";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Messages from "./pages/Messages";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import Hostel from "./pages/Hostel";
import HostelDetail from "./pages/HostelDetail";
import Store from "./pages/Store";
import StoreDetail from "./pages/StoreDetail";
import Provider from "./pages/Provider";

import Orders from "./pages/Orders";
import Wishlist from "./pages/Wishlist";
import Settings from "./pages/Settings";
import HelpSupport from "./pages/HelpSupport";
import Notifications from "./pages/Notifications";
import SellerDashboard from "./pages/SellerDashboard";
import ProviderAnalytics from "./pages/ProviderAnalytics";
import Category from "./pages/Category";
import Search from "./pages/Search";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
    <FloatingChat />
    <InstallPrompt />
    <Routes>
      {/* Core */}
      <Route path="/" element={<Home />} />
      <Route path="/market" element={<Market />} />
      <Route path="/search" element={<Search />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/category/:slug" element={<Category />} />

      {/* Cart & checkout */}
      <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
      <Route path="/checkout-success" element={<CheckoutSuccess />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Communication — protected */}
      <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
      <Route path="/messages/:threadId" element={<PrivateRoute><Messages /></PrivateRoute>} />

      {/* Services */}
      <Route path="/services" element={<Services />} />
      <Route path="/services/:id" element={<ServiceDetail />} />

      {/* Hostel */}
      <Route path="/hostel" element={<Hostel />} />
      <Route path="/hostel/:id" element={<HostelDetail />} />

      {/* Sellers / Store */}
      <Route path="/store" element={<Store />} />
      <Route path="/store/:id" element={<StoreDetail />} />
      <Route path="/partner" element={<Provider />} />

      {/* User account — protected */}
      <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
      <Route path="/wishlist" element={<PrivateRoute><Wishlist /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/help" element={<HelpSupport />} />
      <Route path="/seller-dashboard" element={<PrivateRoute><SellerDashboard /></PrivateRoute>} />
      <Route path="/provider-analytics" element={<PrivateRoute><ProviderAnalytics /></PrivateRoute>} />

      {/* 404 catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}
