import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Ph from "../components/Ph";
import { getImageUrl, naira } from "../components/ProductCard";
import { apiFetch } from "../utils/api";
import { useToast } from "../context/ToastContext";
import Skel from "../components/Skel";

export default function Cart() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [step, setStep] = useState(1);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState({ name: "", phone: "", address: "", landmark: "", notes: "" });
  const [placing, setPlacing] = useState(false);
  const [stepError, setStepError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [provider, setProvider] = useState("flutterwave");
  const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState("pickup"); // "pickup" | "delivery"
  const [bbxFee, setBbxFee] = useState(0);
  const [bbxDropoffArea, setBbxDropoffArea] = useState("");
  const [pickupAddresses, setPickupAddresses] = useState({}); // { userId: { storeName, address } }
  const bbxRef = useRef(null);

  useEffect(() => {
    apiFetch("/api/cart")
      .then((d) => setItems(d.items || d || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // Reset the "Pay" button spinner when returning via browser back/forward cache
  useEffect(() => {
    function handlePageShow(e) {
      if (e.persisted) setPlacing(false);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // Load BlackBox widget script once when delivery method is selected
  useEffect(() => {
    if (deliveryMethod !== "delivery") return;
    if (!document.getElementById("bbx-script")) {
      const s = document.createElement("script");
      s.id = "bbx-script";
      s.src = "https://app.blackboxng.com/blackbox-delivery.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, [deliveryMethod]);

  // Listen for BlackBox rate selection
  useEffect(() => {
    const el = bbxRef.current;
    if (!el) return;
    const handler = (e) => {
      setBbxFee(Number(e.detail?.fee) || 0);
      setBbxDropoffArea(e.detail?.dropoff_area || "");
    };
    el.addEventListener("bbx:rate", handler);
    return () => el.removeEventListener("bbx:rate", handler);
  }, [deliveryMethod]);

  // Fetch seller pickup addresses when pickup is selected
  useEffect(() => {
    if (deliveryMethod !== "pickup" || items.length === 0) return;
    const sellerIds = [...new Set(items.map((it) => {
      const s = it.product?.seller;
      return typeof s === "object" ? s?._id : s;
    }).filter(Boolean))];
    if (sellerIds.length === 0) return;
    Promise.all(sellerIds.map((sid) =>
      apiFetch(`/api/sellers/${sid}`).then((d) => {
        const s = d.seller || d;
        return { userId: sid, storeName: s.storeName || s.name || "Seller", address: s.address || "" };
      }).catch(() => ({ userId: sid, storeName: "Seller", address: "" }))
    )).then((results) => {
      const map = {};
      results.forEach(({ userId, storeName, address }) => { map[userId] = { storeName, address }; });
      setPickupAddresses(map);
    });
  }, [deliveryMethod, items]);

  const sub = items.reduce((s, i) => s + (i.product?.price || i.price || 0) * (i.quantity || i.qty || 1), 0);
  const orderTotal = sub; // delivery is paid in cash to the rider — not part of in-app payment

  function getProductId(it) {
    return typeof it.product === "object" ? it.product?._id : it.product;
  }

  async function removeItem(itemId, productId) {
    setItems((prev) => prev.filter((i) => (i._id || i.id) !== itemId));
    try { await apiFetch(`/api/cart/remove/${productId}`, { method: "DELETE" }); } catch { /* ignore */ }
  }

  async function updateQty(itemId, productId, qty) {
    if (qty < 1) { removeItem(itemId, productId); return; }
    setItems((prev) => prev.map((i) => (i._id || i.id) === itemId ? { ...i, quantity: qty, qty } : i));
    try { await apiFetch("/api/cart/update", { method: "PUT", body: { productId, quantity: qty } }); } catch { /* ignore */ }
  }

  function validateDelivery() {
    if (!delivery.name.trim()) return "Please enter your full name";
    if (!delivery.phone.trim()) return "Please enter your phone number";
    if (!delivery.address.trim()) return "Please enter your delivery address";
    return null;
  }

  function goToPayment() {
    const err = validateDelivery();
    if (err) { setStepError(err); return; }
    setStepError("");
    setShowDeliveryConfirm(true);
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
            name: delivery.name,
            phone: delivery.phone,
            address: delivery.address,
            landmark: delivery.landmark,
          },
          notes: delivery.notes,
          deliveryMethod,
          blackboxFee: deliveryMethod === "delivery" ? bbxFee : 0,
          dropoffArea: bbxDropoffArea || "",
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
      await Promise.allSettled(orderIds.map((id) => apiFetch(`/api/orders/${id}`, { method: "DELETE" })));
      if (err?.status === 401) navigate("/login");
      else alert(err?.message || "Failed to place order. Try again.");
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
                            <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: 6, color: "var(--accent)" }}>{naira(p.price)}</div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                            <button className="icon-btn" style={{ color: "var(--ink-3)", width: 28, height: 28 }} onClick={() => removeItem(itemId, productId)}>
                              <i className="far fa-trash-can" />
                            </button>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: 4, background: "var(--surface)", borderRadius: "var(--r-pill)" }}>
                              <button className="icon-btn" style={{ width: 24, height: 24, background: "#fff", fontSize: "1rem" }} onClick={() => updateQty(itemId, productId, qty - 1)}><i className="fas fa-minus" /></button>
                              <span style={{ width: 18, textAlign: "center", fontWeight: 700, fontSize: "1.2rem" }}>{qty}</span>
                              <button className="icon-btn" style={{ width: 24, height: 24, background: "#fff", fontSize: "1rem" }} onClick={() => updateQty(itemId, productId, qty + 1)}><i className="fas fa-plus" /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Promo code */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input
                      className="input"
                      placeholder="Promo / coupon code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn btn-ghost"
                      onClick={() => showToast("Promo codes coming soon!", "info")}
                    >Apply</button>
                  </div>

                  {/* Total — hidden on desktop (sidebar shows it) */}
                  <div className="mob-only" style={{ padding: 16, background: "var(--navy-800)", color: "#fff", borderRadius: "var(--r-lg)", marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.3rem", marginBottom: 6 }}>
                      <span style={{ opacity: 0.75 }}>Subtotal</span><span>{naira(sub)}</span>
                    </div>
                    {deliveryMethod === "delivery" && bbxFee > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.3rem", marginBottom: 6 }}>
                        <span style={{ opacity: 0.75 }}>Delivery (pay to rider)</span>
                        <span style={{ color: "#f59e0b" }}>{naira(bbxFee)}</span>
                      </div>
                    )}
                    <div style={{ height: 1, background: "rgba(255,255,255,.15)", margin: "8px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.4rem", fontWeight: 700 }}>
                      <span>Total</span>
                      <span style={{ color: "var(--accent)", fontSize: "2rem", fontWeight: 800 }}>{naira(orderTotal)}</span>
                    </div>
                  </div>

                  <button className="btn btn-primary btn-block btn-lg" style={{ borderRadius: "var(--r-pill)", marginBottom: 24 }} onClick={() => setStep(2)}>
                    Proceed to delivery <i className="fas fa-arrow-right" />
                  </button>
                </>
              )}
            </>
          )}

          {/* Step 2: Delivery */}
          {step === 2 && (
            <div style={{ paddingBottom: 24 }}>
              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div className="label">Full name *</div>
                <input className="input" value={delivery.name} onChange={(e) => setDelivery({ ...delivery, name: e.target.value })} placeholder="Aisha Ogundimu" />
                <div style={{ height: 12 }} />
                <div className="label">Phone number *</div>
                <input className="input" value={delivery.phone} onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })} placeholder="+234 813 555 7724" />
                <div style={{ height: 12 }} />
                <div className="label">Delivery address *</div>
                <textarea className="textarea" value={delivery.address} onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} placeholder="Moremi Hall, Block C, Room 214, UNILAG" />
                <div style={{ height: 12 }} />
                <div className="label">Landmark (optional)</div>
                <input className="input" value={delivery.landmark} onChange={(e) => setDelivery({ ...delivery, landmark: e.target.value })} placeholder="Near 1004 quarters" />
                <div style={{ height: 12 }} />
                <div className="label">Delivery note (optional)</div>
                <textarea className="textarea" value={delivery.notes} onChange={(e) => setDelivery({ ...delivery, notes: e.target.value })} placeholder="Leave at the gate, call on arrival, etc." />
              </div>

              {/* Delivery method */}
              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: "1.4rem", marginBottom: 12 }}>How do you want to receive this?</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { value: "pickup", icon: "fa-person-walking", label: "Self Pickup", sub: "Collect from the seller directly" },
                    { value: "delivery", icon: "fa-motorcycle", label: "Doorstep Delivery", sub: "BlackBox dispatch rider" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setDeliveryMethod(opt.value); if (opt.value === "pickup") setBbxFee(0); }}
                      style={{
                        flex: 1, padding: "12px 10px", border: `2px solid ${deliveryMethod === opt.value ? "var(--accent)" : "var(--line)"}`,
                        borderRadius: "var(--r-md)", background: deliveryMethod === opt.value ? "rgba(249,115,22,.05)" : "var(--paper)",
                        cursor: "pointer", textAlign: "center", transition: "border-color .15s",
                      }}
                    >
                      <i className={`fas ${opt.icon}`} style={{ fontSize: "1.6rem", color: deliveryMethod === opt.value ? "var(--accent)" : "var(--ink-3)", marginBottom: 6, display: "block" }} />
                      <div style={{ fontWeight: 700, fontSize: "1.25rem" }}>{opt.label}</div>
                      <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>

                {/* Pickup address cards */}
                {deliveryMethod === "pickup" && Object.keys(pickupAddresses).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {Object.entries(pickupAddresses).map(([uid, info]) => (
                      <div key={uid} style={{ marginBottom: 8, padding: "10px 14px", background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.25)", borderRadius: "var(--r-md)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <i className="fas fa-location-dot" style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>{info.storeName}</div>
                          {info.address
                            ? <div style={{ fontSize: "1.2rem", color: "var(--ink-2)", marginTop: 2 }}>{info.address}</div>
                            : <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", fontStyle: "italic", marginTop: 2 }}>Address not set — contact seller to arrange pickup</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Delivery notice */}
                {deliveryMethod === "delivery" && (
                  <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(245,158,11,.09)", border: "1px solid rgba(245,158,11,.35)", borderRadius: "var(--r-md)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <i className="fas fa-motorcycle" style={{ color: "#d97706", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: "1.2rem", color: "#92400e", lineHeight: 1.55 }}>
                      The delivery fee is <strong>paid directly to the dispatch rider via transfer</strong> — it is <strong>not</strong> included in your UMP payment.
                    </div>
                  </div>
                )}

                {/* BlackBox rate widget */}
                {deliveryMethod === "delivery" && (
                  <div style={{ marginTop: 14 }}>
                    <div
                      ref={bbxRef}
                      id="blackbox-delivery"
                      data-pickup-area="Yaba"
                      data-theme="light"
                      data-show-express="true"
                    />
                    {bbxFee > 0 && (
                      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(34,197,94,.07)", border: "1px solid rgba(34,197,94,.25)", borderRadius: "var(--r-md)", fontSize: "1.3rem" }}>
                        <span style={{ color: "var(--ink-2)" }}><i className="fas fa-motorcycle" style={{ marginRight: 6 }} />Delivery fee</span>
                        <strong style={{ color: "#16a34a" }}>{naira(bbxFee)}</strong>
                      </div>
                    )}
                    {bbxFee === 0 && (
                      <p style={{ margin: "10px 0 0", fontSize: "1.2rem", color: "var(--ink-3)", textAlign: "center" }}>
                        <i className="fas fa-circle-info" style={{ marginRight: 5 }} />Select your area above to see the delivery rate
                      </p>
                    )}
                  </div>
                )}
              </div>

              {stepError && (
                <div style={{ marginBottom: 14, padding: "10px 14px", background: "#fef2f2", color: "#dc2626", borderRadius: "var(--r-md)", fontSize: "1.3rem", display: "flex", alignItems: "center", gap: 8 }}>
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
              <MobileOrderSummary items={items} sub={sub} deliveryFeeTotal={0} orderTotal={orderTotal} />

              {/* Delivery recap */}
              <div className="card" style={{ padding: "12px 16px", marginBottom: 12, fontSize: "1.2rem", color: "var(--ink-2)" }}>
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: "1.3rem" }}>Delivering to</div>
                <div>{delivery.name} · {delivery.phone}</div>
                <div style={{ color: "var(--ink-3)", marginTop: 2 }}>{delivery.address}{delivery.landmark ? ` · ${delivery.landmark}` : ""}</div>
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
                      background: provider === "flutterwave" ? "rgba(249,115,22,.04)" : "var(--paper)",
                      display: "flex", alignItems: "center", gap: 12,
                      transition: "border-color .15s, background .15s",
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f4f3ff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="fas fa-bolt" style={{ color: "#f5a623", fontSize: "1.4rem" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "1.3rem" }}>Pay with Flutterwave</div>
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
                        <span style={{ fontSize: "1rem", fontWeight: 600, padding: "2px 7px", borderRadius: "var(--r-pill)", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
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
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, flexShrink: 0 }}>{naira((p.price || 0) * qty)}</div>
                  </div>
                );
              })}
              <div style={{ height: 1, background: "var(--line)", margin: "10px 0" }} />
              {deliveryMethod === "delivery" && bbxFee > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.3rem", marginBottom: 4 }}>
                  <span style={{ color: "var(--ink-3)" }}>Delivery (pay to rider)</span>
                  <span style={{ color: "#f59e0b" }}>{naira(bbxFee)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "1.4rem", fontWeight: 700 }}>Total</span>
                <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)" }}>{naira(orderTotal)}</span>
              </div>
              {delivery.address && (
                <>
                  <div style={{ height: 1, background: "var(--line)", margin: "10px 0" }} />
                  <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", fontWeight: 600, marginBottom: 4 }}>DELIVERING TO</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>{delivery.name}</div>
                  <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 2 }}>{delivery.address}</div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>{/* /cart-grid */}

      <Footer />

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
                { icon: "user", label: "Name", value: delivery.name },
                { icon: "phone", label: "Phone", value: delivery.phone },
                { icon: "location-dot", label: "Address", value: delivery.address },
                delivery.landmark && { icon: "signs-post", label: "Landmark", value: delivery.landmark },
                delivery.notes && { icon: "note-sticky", label: "Note", value: delivery.notes },
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

function MobileOrderSummary({ items, sub, deliveryFeeTotal, orderTotal }) {
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
        <div style={{ background: "var(--card, #fff)", border: "1px solid var(--line)", borderTop: "none", borderRadius: "0 0 var(--r-lg) var(--r-lg)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
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
