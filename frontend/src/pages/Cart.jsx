import { useState, useEffect } from "react";
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

  useEffect(() => {
    apiFetch("/api/cart")
      .then((d) => setItems(d.items || d || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const sub = items.reduce((s, i) => s + (i.product?.price || i.price || 0) * (i.quantity || i.qty || 1), 0);
  const deliveryFeeTotal = (() => {
    const seen = new Set();
    return items.reduce((s, i) => {
      const pid = (typeof i.product === "object" ? i.product?._id : i.product)?.toString();
      if (pid && seen.has(pid)) return s;
      if (pid) seen.add(pid);
      return s + (i.product?.deliveryFee || 0);
    }, 0);
  })();
  const orderTotal = sub + deliveryFeeTotal;

  function getProductId(it) {
    return typeof it.product === "object" ? it.product?._id : it.product;
  }

  async function removeItem(itemId, productId) {
    setItems((prev) => prev.filter((i) => (i._id || i.id) !== itemId));
    try { await apiFetch(`/api/cart/remove/${productId}`, { method: "DELETE" }); } catch {}
  }

  async function updateQty(itemId, productId, qty) {
    if (qty < 1) { removeItem(itemId, productId); return; }
    setItems((prev) => prev.map((i) => (i._id || i.id) === itemId ? { ...i, quantity: qty, qty } : i));
    try { await apiFetch("/api/cart/update", { method: "PUT", body: { productId, quantity: qty } }); } catch {}
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
    setStep(3);
  }

  async function placeOrder() {
    setPlacing(true);
    try {
      // Step 1: Create order and clear cart
      const orderRes = await apiFetch("/api/orders/checkout", {
        method: "POST",
        body: {
          paymentMethod: "paystack",
          shippingAddress: {
            name: delivery.name,
            phone: delivery.phone,
            address: delivery.address,
            landmark: delivery.landmark,
          },
          notes: delivery.notes,
        },
      });
      const createdOrder = orderRes.order || orderRes;

      // Step 2: Initialize payment via backend (uses PAYSTACK_SECRET_KEY server-side)
      const payRes = await apiFetch("/api/payments/initialize", {
        method: "POST",
        body: { orderId: createdOrder._id, provider: "Paystack", method: "card" },
      });

      if (!payRes.authorization_url) throw new Error("No payment URL returned from server");

      // Step 3: Redirect to Paystack hosted payment page
      window.location.href = payRes.authorization_url;

    } catch (err) {
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
                    {deliveryFeeTotal > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.3rem", marginBottom: 6 }}>
                        <span style={{ opacity: 0.75 }}>Delivery fee</span><span>{naira(deliveryFeeTotal)}</span>
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
              <div className="mob-only card" style={{ padding: 16, marginBottom: 12, display: "flex", flexDirection: "column" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "1.5rem", fontWeight: 700 }}>Order summary</h3>
                {items.map((i) => {
                  const p = i.product || i;
                  const qty = i.quantity || i.qty || 1;
                  return (
                    <div key={i._id || i.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "1.3rem" }}>
                      <span style={{ color: "var(--ink-2)" }}>{p.name} × {qty}</span>
                      <span>{naira(p.price * qty)}</span>
                    </div>
                  );
                })}
                <div style={{ height: 1, background: "var(--line)", margin: "10px 0" }} />
                {deliveryFeeTotal > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.3rem", marginBottom: 4 }}>
                    <span style={{ color: "var(--ink-3)" }}>Delivery fee</span><span>{naira(deliveryFeeTotal)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>Total</span>
                  <span style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--accent)" }}>{naira(orderTotal)}</span>
                </div>
              </div>

              {/* Delivery recap */}
              <div className="card" style={{ padding: "12px 16px", marginBottom: 12, fontSize: "1.2rem", color: "var(--ink-2)" }}>
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: "1.3rem" }}>Delivering to</div>
                <div>{delivery.name} · {delivery.phone}</div>
                <div style={{ color: "var(--ink-3)", marginTop: 2 }}>{delivery.address}{delivery.landmark ? ` · ${delivery.landmark}` : ""}</div>
              </div>

              {/* Paystack only */}
              <div className="card" style={{ padding: 14, marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: "1.4rem", fontWeight: 700 }}>Payment method</h3>
                <div style={{ padding: 12, border: "2px solid var(--accent)", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", gap: 12, background: "rgba(249,115,22,.04)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--surface)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>
                    <i className="fas fa-credit-card" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "1.3rem" }}>Pay with Paystack</div>
                    <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>Cards, bank transfer, USSD</div>
                  </div>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", border: "6px solid var(--accent)" }} />
                </div>
                <p style={{ margin: "10px 0 0", fontSize: "1.1rem", color: "var(--ink-3)" }}>
                  <i className="fas fa-shield-halved" /> More payment options coming soon
                </p>
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
                <i className="fas fa-shield-halved" /> Secured by Paystack
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
              {deliveryFeeTotal > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.3rem", marginBottom: 4 }}>
                  <span style={{ color: "var(--ink-3)" }}>Delivery fee</span><span>{naira(deliveryFeeTotal)}</span>
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
    </div>
  );
}
