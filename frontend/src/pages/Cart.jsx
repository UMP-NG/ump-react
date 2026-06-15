import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar, { useTheme } from "../components/Navbar";
import Footer from "../components/Footer";
import Ph from "../components/Ph";
import { getImageUrl, naira } from "../components/ProductCard";
import { apiFetch } from "../utils/api";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import { useAppConfig } from "../context/AppConfigContext";
import Skel from "../components/Skel";

export default function Cart() {
  const navigate = useNavigate();
  const showToast = useToast();
  const { user } = useUser();
  const { fees } = useAppConfig();
  const [step, setStep] = useState(1);
  const [applyCredit, setApplyCredit] = useState(false);
  const creditBalance = user?.referralCredit || 0;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState({ name: "", phone: "", street: "", building: "", area: "", city: "Lagos", state: "Lagos", landmark: "", notes: "" });
  const [placing, setPlacing] = useState(false);
  const [isDark] = useTheme();
  const [stepError, setStepError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [coupon, setCoupon] = useState(null); // { discount, couponId, discountType, discountValue }
  const [couponLoading, setCouponLoading] = useState(false);
  const [provider, setProvider] = useState("flutterwave");
  const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false);
  // { [sellerId]: { method:"pickup"|"shipbubble", fee:number, serviceCode:string } }
  const [deliverySelections, setDeliverySelections] = useState({});
  // { [sellerId]: { storeName, delivery: { pickup, shipbubble } } }
  const [sellerDeliveryConfigs, setSellerDeliveryConfigs] = useState({});
  // { [sellerId]: { rates:[], loading:bool, error:string } }
  const [shipbubbleRates, setShipbubbleRates] = useState({});
  const shipbubbleDebounce = useRef(null);
  const [cartSbStates, setCartSbStates] = useState([]);
  const [cartSbLocLoading, setCartSbLocLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [payLink, setPayLink] = useState("");
  const [showLinkSheet, setShowLinkSheet] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);

  useEffect(() => {
    apiFetch("/api/cart")
      .then((d) => setItems(d.items || d || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/auth/addresses")
      .then((d) => setSavedAddresses(d.addresses || []))
      .catch(() => {});
  }, [user]);

  // Reset the "Pay" button spinner when returning via browser back/forward cache
  useEffect(() => {
    function handlePageShow(e) {
      if (e.persisted) setPlacing(false);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // Load seller delivery configs when entering Step 2
  useEffect(() => {
    if (step !== 2 || items.length === 0) return;
    const sellerIds = [...new Set(items.map((it) => {
      const s = it.product?.seller;
      return (typeof s === "object" ? s?._id : s)?.toString();
    }).filter(Boolean))];
    if (!sellerIds.length) return;

    Promise.all(sellerIds.map((sid) =>
      apiFetch(`/api/sellers/${sid}`).then((d) => {
        const s = d.seller || d;
        return { sid, storeName: s.storeName || s.name || "Seller", delivery: s.delivery || {}, address: s.address || "", location: s.location || "" };
      }).catch(() => ({ sid, storeName: "Seller", delivery: {}, address: "", location: "" }))
    )).then((results) => {
      const configs = {};
      const defaults = {};
      results.forEach(({ sid, storeName, delivery, address, location }) => {
        configs[sid] = { storeName, delivery, address, location };
        // Default to first enabled method
        const method = delivery?.pickup?.enabled !== false ? "pickup"
          : delivery?.shipbubble?.enabled ? "shipbubble"
          : "pickup";
        defaults[sid] = { method, fee: 0, serviceCode: "" };
      });
      setSellerDeliveryConfigs(configs);
      setDeliverySelections((prev) => ({ ...defaults, ...prev }));
    });
  }, [step, items]);

  // Fetch Shipbubble state list as soon as step 2 is entered — always, so the
  // state/city fields always show dropdowns regardless of the sellers' delivery methods.
  useEffect(() => {
    if (step !== 2 || cartSbStates.length) return;
    setCartSbLocLoading(true);
    apiFetch("/api/delivery/locations")
      .then((d) => setCartSbStates(d.data || []))
      .catch(() => {})
      .finally(() => setCartSbLocLoading(false));
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wipe stale service selections when the buyer changes their delivery city/state
  useEffect(() => {
    setDeliverySelections((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const sid of Object.keys(next)) {
        if (next[sid]?.method === "shipbubble" && (next[sid].fee || next[sid].serviceCode)) {
          next[sid] = { ...next[sid], fee: 0, serviceCode: "" };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setShipbubbleRates({});
  }, [delivery.city, delivery.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced Shipbubble rate fetch — only fetches sellers that need rates
  // (newly switched to Shipbubble, or address changed wiping existing rates)
  useEffect(() => {
    clearTimeout(shipbubbleDebounce.current);
    if (!delivery.city || !delivery.state) return;
    // Only fetch for sellers on shipbubble that don't already have rates loaded
    const needsFetch = Object.entries(deliverySelections)
      .filter(([sid, sel]) => {
        if (sel.method !== "shipbubble") return false;
        const existing = shipbubbleRates[sid];
        return !existing || existing.loading || (!existing.rates?.length && !existing.error);
      })
      .map(([sid]) => sid);
    if (!needsFetch.length) return;

    shipbubbleDebounce.current = setTimeout(() => {
      needsFetch.forEach((sid) => {
        setShipbubbleRates((prev) => ({ ...prev, [sid]: { ...prev[sid], loading: true, error: "" } }));
        apiFetch(
          `/api/delivery/quote?sellerId=${sid}&buyerName=${encodeURIComponent(delivery.name)}&buyerPhone=${encodeURIComponent(delivery.phone)}&buyerStreet=${encodeURIComponent(delivery.street)}&buyerCity=${encodeURIComponent(delivery.city)}&buyerState=${encodeURIComponent(delivery.state)}`
        )
          .then((d) => setShipbubbleRates((prev) => ({ ...prev, [sid]: { rates: d.rates || [], loading: false, error: "" } })))
          .catch((err) => setShipbubbleRates((prev) => ({ ...prev, [sid]: { rates: [], loading: false, error: err?.message || "Failed to load rates" } })));
      });
    }, 900);

    return () => clearTimeout(shipbubbleDebounce.current);
  }, [deliverySelections, delivery.city, delivery.state, delivery.name, delivery.phone, delivery.street]); // eslint-disable-line

  const sub = items.reduce((s, i) => {
    const unitPrice = i.negotiatedPrice || i.product?.price || i.price || 0;
    return s + unitPrice * (i.quantity || i.qty || 1);
  }, 0);
  const totalDeliveryFee = Object.values(deliverySelections).reduce((s, sel) => s + (Number(sel?.fee) || 0), 0);
  const creditToApply = applyCredit ? Math.min(creditBalance, sub) : 0;
  const couponDiscount = coupon?.discount || 0;
  const serviceCharge = fees.serviceChargeEnabled
    ? items.reduce((total, i) => {
        const unitPrice = i.negotiatedPrice || i.product?.price || i.price || 0;
        const itemTotal = unitPrice * (i.quantity || i.qty || 1);
        return total + Math.min(fees.serviceChargeMax, Math.round(itemTotal * (fees.serviceFee / 100)));
      }, 0)
    : 0;
  const orderTotal = Math.max(0, sub + serviceCharge + totalDeliveryFee - creditToApply - couponDiscount);

  async function applyPromoCode() {
    if (!promoCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await apiFetch("/api/coupons/apply", { method: "POST", body: { code: promoCode.trim(), orderAmount: sub } });
      setCoupon(res);
      showToast(`Coupon applied — saving ${naira(res.discount)}!`, "success");
    } catch (err) {
      showToast(err?.message || "Invalid coupon code", "error");
      setCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  }

  function getProductId(it) {
    return typeof it.product === "object" ? it.product?._id : it.product;
  }

  async function removeItem(itemId, productId) {
    setItems((prev) => prev.filter((i) => (i._id || i.id) !== itemId));
    try {
      await apiFetch(`/api/cart/remove/${productId}`, { method: "DELETE" });
    } catch {
      apiFetch("/api/cart").then((d) => setItems(d.items || d || [])).catch(() => {});
    }
  }

  async function updateQty(itemId, productId, qty) {
    if (qty < 1) { removeItem(itemId, productId); return; }
    setItems((prev) => prev.map((i) => (i._id || i.id) === itemId ? { ...i, quantity: qty, qty } : i));
    try { await apiFetch("/api/cart/update", { method: "PUT", body: { productId, quantity: qty } }); } catch { /* ignore */ }
  }

  function fullAddress() {
    return [delivery.building, delivery.street, delivery.area, delivery.city, delivery.state]
      .map((s) => s?.trim()).filter(Boolean).join(", ");
  }

  function validateDelivery() {
    if (!delivery.name.trim())   return "Please enter your full name";
    if (!delivery.phone.trim())  return "Please enter your phone number";
    if (!delivery.street.trim()) return "Please enter your street address";
    if (!delivery.area.trim())   return "Please enter your area or neighbourhood";
    if (!delivery.city.trim())   return "Please enter your city";
    return null;
  }

  function goToPayment() {
    const err = validateDelivery();
    if (err) { setStepError(err); return; }

    // Ensure all seller groups have a delivery selection
    const sellerIds = [...new Set(items.map((it) => {
      const s = it.product?.seller;
      return (typeof s === "object" ? s?._id : s)?.toString();
    }).filter(Boolean))];

    for (const sid of sellerIds) {
      const sel = deliverySelections[sid];
      if (!sel) { setStepError("Please select a delivery method for all stores."); return; }
      if (sel.method === "shipbubble") {
        const rateData = shipbubbleRates[sid];
        if (!sel.serviceCode) {
          if (rateData?.loading) { setStepError("Fetching courier rates — please wait a moment."); return; }
          setStepError(`Please select a courier for ${sellerDeliveryConfigs[sid]?.storeName || "one of the stores"}.`);
          return;
        }
      }
    }

    setStepError("");
    setShowDeliveryConfirm(true);
  }

  async function generatePayLink() {
    setLinkLoading(true);
    try {
      const res = await apiFetch("/api/payments/cart-link", { method: "POST" });
      if (!res.link) throw new Error("Failed to generate link");
      setPayLink(res.link);
      setShowLinkSheet(true);
    } catch (err) {
      showToast(err?.message || "Failed to generate payment link", "error");
    } finally {
      setLinkLoading(false);
    }
  }

  async function placeOrder() {
    setPlacing(true);
    let orderIds = [];
    try {
      const orderRes = await apiFetch("/api/orders/checkout", {
        method: "POST",
        body: {
          paymentMethod: provider,
          shippingAddress: {
            name:     delivery.name,
            phone:    delivery.phone,
            address:  fullAddress(),
            building: delivery.building,
            street:   delivery.street,
            area:     delivery.area,
            city:     delivery.city,
            state:    delivery.state,
            landmark: delivery.landmark,
          },
          notes: delivery.notes,
          deliverySelections,
          creditToUse: creditToApply,
          couponId: coupon?.couponId || null,
          couponDiscount,
        },
      });
      const createdOrders = orderRes.orders || (orderRes.order ? [orderRes.order] : [orderRes]);
      orderIds = createdOrders.map((o) => o._id || o);

      // Track these so PaymentSuccess can cancel them if payment is abandoned
      sessionStorage.setItem("ump_pending_orders", JSON.stringify(orderIds));

      if (provider === "flutterwave") {
        const payRes = await apiFetch("/api/payments/flw/initialize", {
          method: "POST",
          body: { orderIds },
        });
        if (!payRes.payment_link) throw new Error("No payment link returned");
        window.location.href = payRes.payment_link;
      } else {
        const payRes = await apiFetch("/api/payments/initialize", {
          method: "POST",
          body: { orderIds, provider: "Paystack", method: "card" },
        });
        if (!payRes.authorization_url) throw new Error("No payment URL returned from server");
        window.location.href = payRes.authorization_url;
      }
    } catch (err) {
      // Cancel any orders that were created before the payment init failed
      sessionStorage.removeItem("ump_pending_orders");
      if (orderIds.length) {
        await Promise.allSettled(orderIds.map((id) => apiFetch(`/api/orders/${id}`, { method: "DELETE" })));
      }
      if (err?.status === 401) navigate("/login");
      else showToast(err?.message || "Failed to place order. Please try again.", "error");
      setPlacing(false);
    }
  }

  return (
    <div className="page">
      <Navbar />

      <div style={{ padding: "12px 16px 0" }}>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "4px 0 0" }}>Checkout</h1>
      </div>

      {/* Steps */}
      <div className="steps">
        {[{ n: 1, l: "Cart" }, { n: 2, l: "Delivery" }, { n: 3, l: "Payment" }].map((s) => (
          <div key={s.n} className={`step${step === s.n ? " active" : ""}${step > s.n ? " done" : ""}`}>
            <div className="step-bar" />
            <div className="step-label">{step > s.n && <i className="fas fa-check" />} Step {s.n} · {s.l}</div>
          </div>
        ))}
      </div>

      {/* Two-column grid on desktop */}
      <div className="cart-grid">
        <div className="cart-grid-main">

          {/* Step 1: Cart */}
          {step === 1 && (
            <>
              {loading ? (
                <Skel.CartItems />
              ) : items.length === 0 ? (
                <div style={{ padding: "40px 24px", textAlign: "center" }}>
                  <i className="fas fa-bag-shopping" style={{ fontSize: "4rem", color: "var(--ink-4)", marginBottom: 16 }} />
                  <p style={{ fontSize: "1.6rem", color: "var(--ink-2)" }}>Your cart is empty.</p>
                  <button className="btn btn-primary" onClick={() => navigate("/market")}>Browse marketplace</button>
                </div>
              ) : (
                <>
                  {(() => {
                    const sellerIds = new Set(items.map(it => {
                      const s = it.product?.seller;
                      return (typeof s === "object" ? s?._id : s)?.toString() || "";
                    }).filter(Boolean));
                    return sellerIds.size > 1 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.2)", marginBottom: 12, fontSize: "1.25rem", color: "var(--ink-2)" }}>
                        <i className="fas fa-store" style={{ color: "#3b82f6", flexShrink: 0 }} />
                        Items from {sellerIds.size} different stores — a separate order will be placed for each.
                      </div>
                    ) : null;
                  })()}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
                    {items.map((it) => {
                      const p = it.product || it;
                      const itemId = it._id || it.id;
                      const productId = getProductId(it);
                      const qty = it.quantity || it.qty || 1;
                      const img = getImageUrl(p.images?.[0]);
                      return (
                        <div key={itemId} className="card" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
                          <div style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
                            {img ? <img src={img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Ph kind={p.category?.name?.toLowerCase() || "default"} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "1.3rem", fontWeight: 600, lineHeight: 1.3 }}>{p.name}</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: 6, color: "var(--accent)" }}>
                            {it.negotiatedPrice ? (
                              <>
                                {naira(it.negotiatedPrice)}
                                <span style={{ fontSize: "1.1rem", fontWeight: 400, color: "var(--ink-3)", textDecoration: "line-through", marginLeft: 6 }}>{naira(p.price)}</span>
                              </>
                            ) : naira(p.price)}
                          </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                            <button className="icon-btn" style={{ color: "var(--ink-3)", width: 28, height: 28 }} onClick={() => removeItem(itemId, productId)}>
                              <i className="far fa-trash-can" />
                            </button>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: 4, background: "var(--surface)", borderRadius: "var(--r-pill)" }}>
                              <button className="icon-btn" style={{ width: 24, height: 24, background: "var(--white)", fontSize: "1rem" }} onClick={() => updateQty(itemId, productId, qty - 1)}><i className="fas fa-minus" /></button>
                              <span style={{ width: 18, textAlign: "center", fontWeight: 700, fontSize: "1.2rem" }}>{qty}</span>
                              <button className="icon-btn" style={{ width: 24, height: 24, background: "var(--white)", fontSize: "1rem" }} onClick={() => updateQty(itemId, productId, qty + 1)}><i className="fas fa-plus" /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Promo / coupon code */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="input"
                        placeholder="Promo / coupon code"
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value); if (coupon) setCoupon(null); }}
                        style={{ flex: 1 }}
                        onKeyDown={(e) => e.key === "Enter" && applyPromoCode()}
                      />
                      <button className="btn btn-ghost" onClick={applyPromoCode} disabled={couponLoading || !promoCode.trim()}>
                        {couponLoading ? <i className="fas fa-spinner fa-spin" /> : coupon ? "✓ Applied" : "Apply"}
                      </button>
                    </div>
                    {coupon && (
                      <div style={{ marginTop: 6, fontSize: "1.2rem", color: "#22c55e", display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="fas fa-tag" /> Coupon saves you {naira(coupon.discount)}!
                        <button onClick={() => { setCoupon(null); setPromoCode(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-4)", marginLeft: 4, fontSize: "1rem" }}>✕</button>
                      </div>
                    )}
                  </div>

                  {/* Order total — hidden on desktop (sidebar shows it) */}
                  <div className="mob-only" style={{ border: "1px solid var(--line)", borderRadius: "var(--r-lg)", overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ padding: "10px 14px", background: "var(--surface)", borderBottom: "1px solid var(--line)", fontSize: "1.15rem", fontWeight: 600, color: "var(--ink-3)", letterSpacing: ".04em" }}>
                      ORDER SUMMARY · {items.length} item{items.length !== 1 ? "s" : ""}
                    </div>
                    <div style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: "1.3rem", color: "var(--ink-2)" }}>Subtotal</span>
                        <span style={{ fontSize: "1.3rem", fontWeight: 600 }}>{naira(sub)}</span>
                      </div>
                      {totalDeliveryFee > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: "1.3rem", color: "var(--ink-2)" }}>Delivery</span>
                          <span style={{ fontSize: "1.3rem", fontWeight: 600, color: "#f59e0b" }}>{naira(totalDeliveryFee)}</span>
                        </div>
                      )}
                      <div style={{ height: 1, background: "var(--line)", margin: "8px 0" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "1.4rem", fontWeight: 700 }}>Total</span>
                        <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)" }}>{naira(orderTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Referral credit toggle */}
                  {creditBalance > 0 && (
                    <div
                      onClick={() => setApplyCredit((v) => !v)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 12, borderRadius: "var(--r-md)", border: `1.5px solid ${applyCredit ? "var(--accent)" : "var(--line)"}`, background: applyCredit ? "rgba(249,115,22,.06)" : "var(--surface)", cursor: "pointer", userSelect: "none" }}
                    >
                      <i className="fas fa-wallet" style={{ color: applyCredit ? "var(--accent)" : "var(--ink-3)", fontSize: "1.4rem", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "1.3rem", color: applyCredit ? "var(--accent)" : "var(--ink-1)" }}>
                          Use referral credit — {naira(creditBalance)} available
                        </div>
                        <div style={{ fontSize: "1.15rem", color: "var(--ink-3)", marginTop: 1 }}>
                          {applyCredit ? `Saving ${naira(creditToApply)} on this order` : "Tap to apply to this order"}
                        </div>
                      </div>
                      <span style={{ width: 36, height: 20, borderRadius: 10, flexShrink: 0, background: applyCredit ? "var(--accent)" : "var(--line)", position: "relative", transition: "background .2s" }}>
                        <span style={{ position: "absolute", top: 3, left: applyCredit ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                      </span>
                    </div>
                  )}

                  <button className="btn btn-primary btn-block btn-lg" style={{ borderRadius: "var(--r-pill)", marginBottom: 10 }} onClick={() => setStep(2)}>
                    Proceed to delivery <i className="fas fa-arrow-right" />
                  </button>

                  {/* Payment link — let someone else pay for this cart */}
                  <button
                    className="btn btn-ghost btn-block"
                    style={{ borderRadius: "var(--r-pill)", marginBottom: 24, fontSize: "1.25rem", color: "var(--ink-2)" }}
                    onClick={generatePayLink}
                    disabled={linkLoading}
                  >
                    {linkLoading
                      ? <><i className="fas fa-spinner fa-spin" /> Generating…</>
                      : <><i className="fas fa-link" /> Share payment link</>}
                  </button>
                </>
              )}
            </>
          )}

          {/* Step 2: Delivery */}
          {step === 2 && (
            <div style={{ paddingBottom: 24 }}>
              {/* Saved addresses quick-fill */}
              {savedAddresses.length > 0 && (
                <div className="card" style={{ padding: 14, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: "1.3rem", marginBottom: 10 }}><i className="fas fa-bookmark" style={{ marginRight: 6, color: "var(--accent)" }} />Use a saved address</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr._id}
                        type="button"
                        onClick={() => setDelivery((d) => ({ ...d, name: addr.name || d.name, phone: addr.phone || d.phone, street: addr.address || d.street, city: addr.city || d.city, state: addr.state || d.state }))}
                        style={{ textAlign: "left", padding: "10px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
                      >
                        <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>{addr.label || addr.name}</div>
                        <div style={{ fontSize: "1.15rem", color: "var(--ink-3)", marginTop: 2 }}>{[addr.address, addr.city, addr.state].filter(Boolean).join(", ")}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div className="label">Full name *</div>
                <input className="input" value={delivery.name} onChange={(e) => setDelivery({ ...delivery, name: e.target.value })} placeholder="Aisha Ogundimu" />
                <div style={{ height: 12 }} />
                <div className="label">Phone number *</div>
                <input className="input" value={delivery.phone} onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })} placeholder="+234 813 555 7724" />
                <div style={{ height: 12 }} />
                <div className="label">Street address *</div>
                <input className="input" value={delivery.street} onChange={(e) => setDelivery({ ...delivery, street: e.target.value })} placeholder="12 Herbert Macaulay Way" />
                <div style={{ height: 12 }} />
                <div className="label">Building / Floor / Room (optional)</div>
                <input className="input" value={delivery.building} onChange={(e) => setDelivery({ ...delivery, building: e.target.value })} placeholder="Moremi Hall, Block C, Room 214" />
                <div style={{ height: 12 }} />
                <div className="label">Area / Neighbourhood *</div>
                <input className="input" value={delivery.area} onChange={(e) => setDelivery({ ...delivery, area: e.target.value })} placeholder="Akoka, Yaba" />
                <div style={{ height: 12 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div className="label">State {cartSbLocLoading && <i className="fas fa-circle-notch fa-spin" style={{ fontSize: "0.9rem", marginLeft: 4 }} />}</div>
                    <select className="input" value={delivery.state}
                      onChange={(e) => setDelivery({ ...delivery, state: e.target.value, city: "" })}
                      disabled={cartSbLocLoading}>
                      <option value="">{cartSbLocLoading ? "Loading states…" : "Select state"}</option>
                      {cartSbStates.map((s) => <option key={s.code || s.state_code} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="label">City *</div>
                    <input className="input" value={delivery.city}
                      onChange={(e) => setDelivery({ ...delivery, city: e.target.value })}
                      placeholder="e.g. Yaba, Ikeja, Surulere" />
                  </div>
                </div>
                <div style={{ height: 12 }} />
                <div className="label">Landmark (optional)</div>
                <input className="input" value={delivery.landmark} onChange={(e) => setDelivery({ ...delivery, landmark: e.target.value })} placeholder="Near 1004 Estate gate" />
                <div style={{ height: 12 }} />
                <div className="label">Delivery note (optional)</div>
                <textarea className="textarea" value={delivery.notes} onChange={(e) => setDelivery({ ...delivery, notes: e.target.value })} placeholder="Leave at the gate, call on arrival, etc." />
              </div>

              {/* Per-seller delivery method selection */}
              {Object.entries(sellerDeliveryConfigs).map(([sid, cfg]) => {
                const sel = deliverySelections[sid] || { method: "pickup", fee: 0, serviceCode: "" };
                const d   = cfg.delivery || {};
                const opts = [
                  d.pickup?.enabled !== false && { value: "pickup", icon: "fa-person-walking", label: "Pickup", fee: 0, sub: "Collect from seller" },
                  d.shipbubble?.enabled && { value: "shipbubble", icon: "fa-truck", label: "Courier", fee: sel.method === "shipbubble" && sel.fee ? sel.fee : null, sub: "Calculated by courier" },
                ].filter(Boolean);

                if (!opts.length) return null;

                return (
                  <div key={sid} className="card" style={{ padding: 16, marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: "1.3rem", marginBottom: 10 }}>
                      <i className="fas fa-store" style={{ color: "var(--accent)", marginRight: 6 }} />{cfg.storeName}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {opts.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setDeliverySelections((prev) => ({ ...prev, [sid]: { method: opt.value, fee: 0, serviceCode: "" } }));
                            if (opt.value !== "shipbubble") {
                              setShipbubbleRates((prev) => ({ ...prev, [sid]: { rates: [], loading: false, error: "" } }));
                            }
                          }}
                          style={{
                            flex: "1 1 120px", padding: "10px 10px", textAlign: "center", cursor: "pointer",
                            border: `2px solid ${sel.method === opt.value ? "var(--accent)" : "var(--line)"}`,
                            borderRadius: "var(--r-md)", background: sel.method === opt.value ? "rgba(249,115,22,.12)" : "transparent",
                            color: "var(--ink-1)", transition: "border-color .15s",
                          }}
                        >
                          <i className={`fas ${opt.icon}`} style={{ fontSize: "1.4rem", color: sel.method === opt.value ? "var(--accent)" : "var(--ink-3)", marginBottom: 4, display: "block" }} />
                          <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>{opt.label}</div>
                          <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 2 }}>
                            {opt.value === "shipbubble" && sel.method === "shipbubble" && sel.fee
                              ? naira(sel.fee)
                              : opt.fee != null ? (opt.fee === 0 ? "Free" : naira(opt.fee)) : opt.sub}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Pickup instructions */}
                    {sel.method === "pickup" && (
                      <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.25)", borderRadius: "var(--r-md)", fontSize: "1.2rem" }}>
                        <i className="fas fa-location-dot" style={{ color: "var(--accent)", marginRight: 6 }} />
                        {d.pickup?.instructions
                          ? d.pickup.instructions
                          : (() => {
                              const sb = cfg.delivery?.shipbubble?.pickupAddress;
                              const sbAddr = sb ? [sb.street, sb.city, sb.state].filter(Boolean).join(", ") : "";
                              const storeAddr = cfg.address || cfg.location;
                              const addr = sbAddr || storeAddr;
                              return addr
                                ? `Pickup location: ${addr}`
                                : "Contact seller to arrange pickup location.";
                            })()}
                      </div>
                    )}

                    {/* Shipbubble courier selection */}
                    {sel.method === "shipbubble" && (() => {
                      const rateData = shipbubbleRates[sid] || {};
                      if (rateData.loading) return (
                        <div style={{ marginTop: 10, textAlign: "center", color: "var(--ink-3)", fontSize: "1.2rem" }}>
                          <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />Fetching courier rates…
                        </div>
                      );
                      if (rateData.error) {
                        const isAddressError = /city|state|address|location/i.test(rateData.error);
                        return (
                          <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(220,38,38,.1)", border: "1px solid rgba(220,38,38,.3)", borderRadius: "var(--r-md)", fontSize: "1.2rem", color: "#ef4444" }}>
                            <i className="fas fa-circle-exclamation" style={{ marginRight: 6 }} />
                            {rateData.error}
                            {isAddressError && " — check your city & state above and retry"}
                          </div>
                        );
                      }
                      if (!rateData.rates?.length) return (
                        <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.3)", borderRadius: "var(--r-md)", fontSize: "1.2rem", color: "var(--ink-2)" }}>
                          <i className="fas fa-circle-info" style={{ color: "#f59e0b", marginRight: 6 }} />Enter your city &amp; state above to see courier rates
                        </div>
                      );
                      return (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                          {rateData.rates.map((r) => (
                            <button
                              key={r.serviceCode}
                              type="button"
                              onClick={() => setDeliverySelections((prev) => ({ ...prev, [sid]: { method: "shipbubble", fee: r.amount, serviceCode: r.serviceCode } }))}
                              style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer",
                                border: `2px solid ${sel.serviceCode === r.serviceCode ? "var(--accent)" : "var(--line)"}`,
                                borderRadius: "var(--r-md)", background: sel.serviceCode === r.serviceCode ? "rgba(249,115,22,.12)" : "transparent",
                                color: "var(--ink-1)",
                              }}
                            >
                              {r.logoUrl && (
                                <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 6, background: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: 2 }}>
                                  <img src={r.logoUrl} alt={r.courierName} style={{ width: 28, height: 28, objectFit: "contain" }} />
                                </div>
                              )}
                              <div style={{ flex: 1, textAlign: "left" }}>
                                <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--ink-1)" }}>{r.courierName}</div>
                                {r.estimatedDays && <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>{r.estimatedDays}</div>}
                              </div>
                              <div style={{ fontWeight: 800, fontSize: "1.3rem", color: "var(--accent)", flexShrink: 0 }}>{naira(r.amount)}</div>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

              {stepError && (
                <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(220,38,38,.1)", border: "1px solid rgba(220,38,38,.3)", color: "#ef4444", borderRadius: "var(--r-md)", fontSize: "1.3rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="fas fa-circle-exclamation" /> {stepError}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)}><i className="fas fa-arrow-left" /></button>
                <button className="btn btn-primary btn-lg" style={{ flex: 1, borderRadius: "var(--r-pill)" }} onClick={goToPayment}>
                  Continue to payment <i className="fas fa-arrow-right" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div style={{ paddingBottom: 24 }}>
              {/* Order summary — hidden on desktop (sidebar shows it) */}
              <MobileOrderSummary items={items} sub={sub} deliveryFeeTotal={totalDeliveryFee} serviceCharge={serviceCharge} orderTotal={orderTotal} />

              {/* Delivery recap */}
              <div className="card" style={{ padding: "12px 16px", marginBottom: 12, fontSize: "1.2rem", color: "var(--ink-2)" }}>
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: "1.3rem" }}>Delivering to</div>
                <div>{delivery.name} · {delivery.phone}</div>
                <div style={{ color: "var(--ink-3)", marginTop: 2 }}>{fullAddress()}{delivery.landmark ? ` · ${delivery.landmark}` : ""}</div>
              </div>

              {/* Payment provider selection */}
              <div className="card" style={{ padding: 14, marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: "1.4rem", fontWeight: 700 }}>Payment method</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                  {/* Flutterwave — active */}
                  <button
                    type="button"
                    onClick={() => setProvider("flutterwave")}
                    style={{
                      width: "100%", textAlign: "left", cursor: "pointer",
                      padding: 12,
                      border: `2px solid ${provider === "flutterwave" ? "var(--accent)" : "var(--line)"}`,
                      borderRadius: "var(--r-md)",
                      background: provider === "flutterwave" ? "rgba(249,115,22,.12)" : "transparent",
                      color: "var(--ink-1)",
                      display: "flex", alignItems: "center", gap: 12,
                      transition: "border-color .15s, background .15s",
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(99,102,241,.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="fas fa-bolt" style={{ color: "#f5a623", fontSize: "1.4rem" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "1.3rem", color: "var(--ink-1)" }}>Pay with Flutterwave</div>
                      <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>Cards, bank transfer, USSD, mobile money</div>
                    </div>
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      border: `6px solid ${provider === "flutterwave" ? "var(--accent)" : "var(--line)"}`,
                      transition: "border-color .15s",
                    }} />
                  </button>

                  {/* Paystack — disabled, under verification */}
                  <div
                    style={{
                      padding: 12,
                      border: "2px solid var(--line)",
                      borderRadius: "var(--r-md)",
                      display: "flex", alignItems: "center", gap: 12,
                      opacity: 0.55, cursor: "not-allowed",
                      background: "var(--surface)",
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--surface)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="fas fa-credit-card" style={{ fontSize: "1.4rem", color: "var(--ink-3)" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: "1.3rem" }}>Pay with Paystack</span>
                        <span style={{ fontSize: "1rem", fontWeight: 600, padding: "2px 7px", borderRadius: "var(--r-pill)", background: "rgba(245,158,11,.15)", color: "#d97706", border: "1px solid rgba(245,158,11,.3)" }}>
                          Under verification
                        </span>
                      </div>
                      <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>Cards, bank transfer, USSD</div>
                    </div>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--line)", flexShrink: 0 }} />
                  </div>

                </div>
              </div>

              {/* Buyer safety notice */}
              <div style={{ background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.3)", borderRadius: "var(--r-lg)", padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <i className="fas fa-triangle-exclamation" style={{ color: "#f59e0b", fontSize: "1.4rem", flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: "1.3rem", color: "var(--ink-1)" }}>Buyer safety reminder</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
                  <li style={{ fontSize: "1.2rem", color: "var(--ink-2)", lineHeight: 1.55 }}>
                    <strong>Never pay directly to a seller's bank account.</strong> All payments must go through UMP's secure checkout. UMP is not liable for any transactions made outside this platform.
                  </li>
                  <li style={{ fontSize: "1.2rem", color: "var(--ink-2)", lineHeight: 1.55 }}>
                    Collecting orders <strong>outside UNILAG campus</strong> is entirely at the buyer's risk. UMP is not responsible for off-campus pickups or deliveries.
                  </li>
                </ul>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setStep(2)}><i className="fas fa-arrow-left" /></button>
                <button className="btn btn-primary btn-lg" style={{ flex: 1, borderRadius: "var(--r-pill)" }} onClick={placeOrder} disabled={placing}>
                  {placing ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-lock" /> Pay {naira(orderTotal)}</>}
                </button>
              </div>
              <p style={{ textAlign: "center", fontSize: "1.1rem", color: "var(--ink-3)", margin: "12px 0 0" }}>
                <i className="fas fa-shield-halved" /> Secured by {provider === "flutterwave" ? "Flutterwave" : "Paystack"}
              </p>
            </div>
          )}

        </div>{/* /cart-grid-main */}

        {/* Sticky sidebar — desktop only, shown when cart has items */}
        {!loading && items.length > 0 && (
          <aside className="cart-grid-side">
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "1.5rem", fontWeight: 700 }}>Order Summary</h3>
              {items.map((it) => {
                const p = it.product || it;
                const qty = it.quantity || it.qty || 1;
                const img = getImageUrl(p.images?.[0]);
                return (
                  <div key={it._id || it.id} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "var(--surface)" }}>
                      {img
                        ? <img src={img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Ph kind={p.category?.name?.toLowerCase() || "default"} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                      <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>× {qty}</div>
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, flexShrink: 0 }}>{naira((it.negotiatedPrice || p.price || 0) * qty)}</div>
                  </div>
                );
              })}
              <div style={{ height: 1, background: "var(--line)", margin: "10px 0" }} />
              {serviceCharge > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.3rem", marginBottom: 4 }}>
                  <span style={{ color: "var(--ink-3)" }}>Service charge</span>
                  <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>{naira(serviceCharge)}</span>
                </div>
              )}
              {totalDeliveryFee > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.3rem", marginBottom: 4 }}>
                  <span style={{ color: "var(--ink-3)" }}>Delivery</span>
                  <span style={{ color: "#f59e0b" }}>{naira(totalDeliveryFee)}</span>
                </div>
              )}
              {creditToApply > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.3rem", marginBottom: 4 }}>
                  <span style={{ color: "var(--accent)" }}><i className="fas fa-wallet" style={{ marginRight: 5 }} />Credit applied</span>
                  <span style={{ color: "var(--accent)", fontWeight: 700 }}>−{naira(creditToApply)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "1.4rem", fontWeight: 700 }}>Total</span>
                <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)" }}>{naira(orderTotal)}</span>
              </div>
              {delivery.street && (
                <>
                  <div style={{ height: 1, background: "var(--line)", margin: "10px 0" }} />
                  <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", fontWeight: 600, marginBottom: 4 }}>DELIVERING TO</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>{delivery.name}</div>
                  <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 2 }}>{fullAddress()}</div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>{/* /cart-grid */}

      <Footer />

      {/* Payment link sheet */}
      {showLinkSheet && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setShowLinkSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 520, background: "var(--paper)", borderRadius: "var(--r-lg) var(--r-lg) 0 0", padding: "24px 20px 36px", boxShadow: "0 -8px 40px rgba(0,0,0,.18)" }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--line)", margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(249,115,22,.1)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                <i className="fas fa-link" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.5rem" }}>Payment link ready</div>
                <div style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}>Share with someone to pay for your cart</div>
              </div>
            </div>
            <div style={{ background: "var(--surface)", borderRadius: "var(--r-md)", padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ flex: 1, fontSize: "1.2rem", color: "var(--ink-2)", wordBreak: "break-all", lineHeight: 1.5 }}>{payLink}</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary btn-lg"
                style={{ flex: 1, borderRadius: "var(--r-pill)" }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(payLink);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2500);
                  } catch {
                    showToast("Could not copy — long-press the link to copy manually", "error");
                  }
                }}
              >
                {linkCopied ? <><i className="fas fa-check" /> Copied!</> : <><i className="fas fa-copy" /> Copy link</>}
              </button>
              {navigator.share && (
                <button
                  className="btn btn-ghost btn-lg"
                  style={{ flex: 1, borderRadius: "var(--r-pill)" }}
                  onClick={() => navigator.share({ title: "Pay for my UMP cart", url: payLink }).catch(() => {})}
                >
                  <i className="fas fa-share-nodes" /> Share
                </button>
              )}
            </div>
            <p style={{ textAlign: "center", fontSize: "1.15rem", color: "var(--ink-4)", margin: "12px 0 0" }}>
              <i className="fas fa-clock" style={{ marginRight: 5 }} />This link expires in 72 hours
            </p>
          </div>
        </div>
      )}

      {/* Delivery details confirmation sheet */}
      {showDeliveryConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delivery-confirm-title"
          onKeyDown={(e) => e.key === "Escape" && setShowDeliveryConfirm(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,.5)", backdropFilter: "blur(2px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
          onClick={() => setShowDeliveryConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 520,
              background: "var(--paper)",
              borderRadius: "var(--r-lg) var(--r-lg) 0 0",
              padding: "24px 20px 32px",
              boxShadow: "0 -8px 40px rgba(0,0,0,.18)",
            }}
          >
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--line)", margin: "0 auto 20px" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(249,115,22,.1)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                <i className="fas fa-map-location-dot" />
              </div>
              <div>
                <div id="delivery-confirm-title" style={{ fontWeight: 800, fontSize: "1.5rem" }}>Confirm delivery details</div>
                <div style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}>Make sure everything looks right</div>
              </div>
            </div>

            {/* Detail rows */}
            <div style={{ background: "var(--surface)", borderRadius: "var(--r-md)", overflow: "hidden", marginBottom: 18 }}>
              {[
                { icon: "user",         label: "Name",     value: delivery.name },
                { icon: "phone",        label: "Phone",    value: delivery.phone },
                { icon: "road",         label: "Street",   value: delivery.street },
                delivery.building && { icon: "building", label: "Building", value: delivery.building },
                { icon: "location-dot", label: "Area",     value: [delivery.area, delivery.city, delivery.state].filter(Boolean).join(", ") },
                delivery.landmark && { icon: "signs-post", label: "Landmark", value: delivery.landmark },
                delivery.notes && { icon: "note-sticky",   label: "Note",     value: delivery.notes },
              ].filter(Boolean).map((row, i, arr) => (
                <div key={row.label} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 14px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
                }}>
                  <i className={`fas fa-${row.icon}`} style={{ color: "var(--accent)", width: 16, textAlign: "center", marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{row.label}</div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 600, marginTop: 1, wordBreak: "break-word" }}>{row.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-ghost btn-lg"
                style={{ flex: 1, borderRadius: "var(--r-pill)" }}
                onClick={() => setShowDeliveryConfirm(false)}
              >
                <i className="fas fa-pen" /> Edit details
              </button>
              <button
                className="btn btn-primary btn-lg"
                style={{ flex: 1, borderRadius: "var(--r-pill)" }}
                onClick={() => { setShowDeliveryConfirm(false); setStep(3); }}
              >
                <i className="fas fa-check" /> Looks good
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileOrderSummary({ items, sub, deliveryFeeTotal, orderTotal, serviceCharge }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mob-only" style={{ marginBottom: 12 }}>
      {/* Total bar — always visible */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "var(--navy-800)", color: "#fff",
          borderRadius: open ? "var(--r-lg) var(--r-lg) 0 0" : "var(--r-lg)",
          padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex" }}>
            {items.slice(0, 3).map((it, i) => {
              const img = getImageUrl((it.product || it).images?.[0]);
              return img ? (
                <img key={i} src={img} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover", border: "2px solid rgba(255,255,255,.3)", marginLeft: i > 0 ? -8 : 0 }} />
              ) : (
                <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,.15)", border: "2px solid rgba(255,255,255,.3)", marginLeft: i > 0 ? -8 : 0 }} />
              );
            })}
          </div>
          <span style={{ fontSize: "1.3rem", opacity: 0.85 }}>
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
          <i className={`fas fa-chevron-${open ? "up" : "down"}`} style={{ fontSize: "1rem", opacity: 0.6 }} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1rem", opacity: 0.6, lineHeight: 1 }}>Total</div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent)", lineHeight: 1.2 }}>{naira(orderTotal)}</div>
        </div>
      </div>

      {/* Expandable item list */}
      {open && (
        <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderTop: "none", borderRadius: "0 0 var(--r-lg) var(--r-lg)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it) => {
            const p = it.product || it;
            const qty = it.quantity || it.qty || 1;
            const img = getImageUrl(p.images?.[0]);
            return (
              <div key={it._id || it.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "var(--surface)" }}>
                  {img
                    ? <img src={img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Ph kind="default" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>× {qty}</div>
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, flexShrink: 0 }}>{naira((p.price || 0) * qty)}</div>
              </div>
            );
          })}

          <div style={{ height: 1, background: "var(--line)", margin: "2px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", color: "var(--ink-3)" }}>
            <span>Subtotal</span><span>{naira(sub)}</span>
          </div>
          {serviceCharge > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", color: "var(--ink-3)" }}>
              <span>Service charge</span><span>{naira(serviceCharge)}</span>
            </div>
          )}
          {deliveryFeeTotal > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", color: "var(--ink-3)" }}>
              <span>Delivery fee</span><span>{naira(deliveryFeeTotal)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <span style={{ fontSize: "1.4rem", fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)" }}>{naira(orderTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
