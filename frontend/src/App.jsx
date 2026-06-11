import { lazy, Suspense, Component, useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import FloatingChat from "./components/FloatingChat";
import PrivateRoute from "./components/PrivateRoute";
import InstallPrompt from "./components/InstallPrompt";
import LimitedAccountBanner from "./components/LimitedAccountBanner";
import NotificationBanner from "./components/NotificationBanner";
import AdminRoutes from "./admin/index";
import { AppConfigProvider, useAppConfig } from "./context/AppConfigContext";
import { useUser } from "./context/UserContext";
import { apiFetch } from "./utils/api";

// All page components are lazy-loaded so each route only downloads its own
// JS chunk. This cuts the initial bundle by ~70% for users on slow networks.
const Home             = lazy(() => import("./pages/Home"));
const Market           = lazy(() => import("./pages/Market"));
const Hustle           = lazy(() => import("./pages/Hustle"));
const Search           = lazy(() => import("./pages/Search"));
const ProductDetail    = lazy(() => import("./pages/ProductDetail"));
const Category         = lazy(() => import("./pages/Category"));
const Cart             = lazy(() => import("./pages/Cart"));
const CheckoutSuccess  = lazy(() => import("./pages/CheckoutSuccess"));
const PaymentSuccess   = lazy(() => import("./pages/PaymentSuccess"));
const Login            = lazy(() => import("./pages/Login"));
const Auth             = lazy(() => import("./pages/Auth"));
const ForgotPassword   = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword    = lazy(() => import("./pages/ResetPassword"));
const Messages         = lazy(() => import("./pages/Messages"));
const Services         = lazy(() => import("./pages/Services"));
const ServiceDetail    = lazy(() => import("./pages/ServiceDetail"));
const Providers        = lazy(() => import("./pages/Providers"));
const ProviderDetail   = lazy(() => import("./pages/ProviderDetail"));
const Hostel           = lazy(() => import("./pages/Hostel"));
const HostelDetail     = lazy(() => import("./pages/HostelDetail"));
const Store            = lazy(() => import("./pages/Store"));
const StoreDetail      = lazy(() => import("./pages/StoreDetail"));
const Provider         = lazy(() => import("./pages/Provider"));
const SubscribePage    = lazy(() => import("./pages/SubscribePage"));
const Orders           = lazy(() => import("./pages/Orders"));
const Wishlist         = lazy(() => import("./pages/Wishlist"));
const Settings         = lazy(() => import("./pages/Settings"));
const HelpSupport      = lazy(() => import("./pages/HelpSupport"));
const Notifications    = lazy(() => import("./pages/Notifications"));
const SellerDashboard  = lazy(() => import("./pages/SellerDashboard"));
const ProviderAnalytics = lazy(() => import("./pages/ProviderAnalytics"));
const NotFound         = lazy(() => import("./pages/NotFound"));
const Terms            = lazy(() => import("./pages/Terms"));
const Privacy          = lazy(() => import("./pages/Privacy"));
const PayForCart       = lazy(() => import("./pages/PayForCart"));
const PayForCartSuccess = lazy(() => import("./pages/PayForCart").then(m => ({ default: m.PayForCartSuccess })));
const Bookings         = lazy(() => import("./pages/Bookings"));

// Catches chunk-load errors (e.g. network failure while lazy-loading a route)
// and shows a simple reload prompt instead of a blank screen.
class ChunkErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return (
        <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "40px 24px", textAlign: "center" }}>
          <i className="fas fa-wifi" style={{ fontSize: "3rem", color: "var(--ink-3)" }} />
          <p style={{ fontSize: "1.5rem", color: "var(--ink-2)", margin: 0 }}>Something didn't load. Check your connection and try again.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Minimal fallback shown while a route chunk is downloading
function PageLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <i className="fas fa-circle-notch fa-spin" style={{ fontSize: "2rem", color: "var(--accent)" }} />
    </div>
  );
}

// Shows once per session whenever a seller hasn't configured any delivery method yet
function SellerDeliverySetupGate() {
  const { user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("deliverySetupDismissed") === "1"
  );

  const isSeller  = user?.roles?.includes("seller");
  const isAuthPage = ["/login", "/auth", "/forgot-password", "/reset-password"].some(p => location.pathname.startsWith(p));
  const isAdmin    = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!isSeller || dismissed || isAuthPage || isAdmin) return;
    apiFetch("/api/sellers/me")
      .then((d) => {
        const dlv = d?.seller?.delivery;
        const configured = dlv && (dlv.pickup?.enabled || dlv.selfDelivery?.enabled || dlv.shipbubble?.enabled);
        if (!configured) setShow(true);
      })
      .catch(() => {});
  }, [isSeller]); // eslint-disable-line react-hooks/exhaustive-deps

  function dismiss() {
    sessionStorage.setItem("deliverySetupDismissed", "1");
    setDismissed(true);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card" style={{ maxWidth: 420, width: "100%", padding: 28, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(249,115,22,.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <i className="fas fa-truck" style={{ fontSize: "2.4rem", color: "var(--accent)" }} />
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: "1.9rem", fontWeight: 900 }}>Set up your delivery options</h2>
        <p style={{ margin: "0 0 20px", fontSize: "1.3rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
          Buyers <strong>can't check out</strong> from your store until you configure at least one delivery method — pickup, self-delivery, or courier.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              dismiss();
              navigate("/seller-dashboard?setup=delivery");
            }}
          >
            <i className="fas fa-gear" style={{ marginRight: 8 }} />Set up delivery now
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}
            onClick={dismiss}
          >
            Remind me next time
          </button>
        </div>
      </div>
    </div>
  );
}

function MaintenanceGate({ children }) {
  const { flags } = useAppConfig();
  const { user } = useUser();
  const location = useLocation();

  const isAdmin = location.pathname.startsWith("/admin");
  const isAdminUser = user?.roles?.includes("admin");

  if (flags?.maintenanceMode && !(isAdmin || isAdminUser)) {
    return (
      <div className="maintenance-gate">
        <i className="fa-solid fa-wrench maintenance-gate-icon" />
        <h1>We'll be right back</h1>
        <p>UMP is down for a quick maintenance. Check back in a few minutes.</p>
      </div>
    );
  }

  return children;
}

export default function App() {
  useEffect(() => {
    function handleImgError(e) {
      const img = e.target;
      if (img.tagName !== "IMG") return;
      if (img.dataset.fallbackApplied) return; // prevent infinite loop if placeholder itself 404s
      img.dataset.fallbackApplied = "1";
      img.src = "/images/placeholder.png";
    }
    // Capture phase so we catch error events before they reach any component-level onError handler
    document.addEventListener("error", handleImgError, true);
    return () => document.removeEventListener("error", handleImgError, true);
  }, []);

  return (
    <AppConfigProvider>
    <MaintenanceGate>
    <NotificationBanner />
    <LimitedAccountBanner />
    <SellerDeliverySetupGate />
    <FloatingChat />
    <InstallPrompt />
    <ChunkErrorBoundary>
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Core */}
      <Route path="/"           element={<Home />} />
      <Route path="/market"     element={<Market />} />
      <Route path="/hustle"     element={<Hustle />} />
      <Route path="/search"     element={<Search />} />
      <Route path="/products/:id"   element={<ProductDetail />} />
      <Route path="/category/:slug" element={<Category />} />

      {/* Cart & checkout */}
      <Route path="/cart"              element={<PrivateRoute><Cart /></PrivateRoute>} />
      <Route path="/checkout-success"  element={<CheckoutSuccess />} />
      <Route path="/payment-success"   element={<PaymentSuccess />} />

      {/* Cart payment links (public — payer doesn't need an account) */}
      <Route path="/pay/:token/success" element={<PayForCartSuccess />} />
      <Route path="/pay/:token"         element={<PayForCart />} />

      {/* Auth */}
      <Route path="/login"           element={<Login />} />
      <Route path="/auth"            element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Communication */}
      <Route path="/messages"            element={<PrivateRoute><Messages /></PrivateRoute>} />
      <Route path="/messages/:threadId"  element={<PrivateRoute><Messages /></PrivateRoute>} />

      {/* Services & Providers */}
      <Route path="/services"     element={<Services />} />
      <Route path="/services/:id" element={<ServiceDetail />} />
      <Route path="/providers"    element={<Providers />} />
      <Route path="/providers/:id" element={<ProviderDetail />} />

      {/* Hostel */}
      <Route path="/hostel"     element={<Hostel />} />
      <Route path="/hostel/:id" element={<HostelDetail />} />

      {/* Sellers / Store */}
      <Route path="/store"      element={<Store />} />
      <Route path="/store/:id"  element={<StoreDetail />} />
      <Route path="/partner"    element={<PrivateRoute><Provider /></PrivateRoute>} />
      <Route path="/subscribe"  element={<PrivateRoute><SubscribePage /></PrivateRoute>} />

      {/* User account */}
      <Route path="/orders"        element={<PrivateRoute><Orders /></PrivateRoute>} />
      <Route path="/bookings"      element={<PrivateRoute><Bookings /></PrivateRoute>} />
      <Route path="/wishlist"      element={<PrivateRoute><Wishlist /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/settings"      element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/help"          element={<HelpSupport />} />
      <Route path="/seller-dashboard"    element={<PrivateRoute><SellerDashboard /></PrivateRoute>} />
      <Route path="/provider-analytics"  element={<PrivateRoute><ProviderAnalytics /></PrivateRoute>} />

      {/* Admin panel — not lazy-loaded so admins don't wait on navigation */}
      <Route path="/admin/*" element={<AdminRoutes />} />

      {/* Legal */}
      <Route path="/terms"   element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
    </ChunkErrorBoundary>
    </MaintenanceGate>
    </AppConfigProvider>
  );
}
