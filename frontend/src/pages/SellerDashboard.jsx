import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { naira } from "../components/ProductCard";
import { apiFetch } from "../utils/api";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import FloatingChat from "../components/FloatingChat";
import Skel from "../components/Skel";
import ImageCropModal from "../components/ImageCropModal";
import { cloudVideo } from "../utils/cloudinary";

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV = [
  { id: "Home",       icon: "house",          label: "Dashboard Home" },
  { id: "Orders",     icon: "box-archive",     label: "Orders" },
  { id: "Products",   icon: "boxes-stacked",   label: "Products" },
  { id: "Apartments", icon: "building",        label: "Apartments" },
  { id: "Messages",   icon: "message",         label: "Messages",   action: "navigate" },
  { id: "Promote",    icon: "rectangle-ad",    label: "Promote Products" },
  { id: "Payouts",    icon: "wallet",          label: "Payouts" },
  { id: "Settings",   icon: "gear",            label: "Settings" },
];

const AD_PLAN_DESCS = {
  "3days":  "Great for a quick boost",
  "7days":  "Best value for most sellers",
  "14days": "Maximum visibility for two weeks",
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ tab, setTab, navigate, profile, user, unreadMessages }) {
  const avatarUrl = user?.avatar?.url || (typeof user?.avatar === "string" ? user.avatar : null);
  const initials = (user?.name || "S").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const [avatarBroken, setAvatarBroken] = useState(false);

  return (
    <aside className="seller-sidebar">
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.04em", color: "#fff" }}>
          <span style={{ color: "var(--accent)" }}>U</span>MP
        </div>
        <div style={{ fontSize: "1.1rem", color: "rgba(255,255,255,.4)", marginTop: 2 }}>Seller Portal</div>
      </div>

      <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div className="avatar" style={{ width: 44, height: 44, fontSize: "1.6rem", flexShrink: 0, overflow: "hidden", padding: avatarUrl && !avatarBroken ? 0 : undefined }}>
          {avatarUrl && !avatarBroken ? <img src={avatarUrl} alt={user?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setAvatarBroken(true)} /> : initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "1.4rem", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile?.storeName || user?.name || "Seller"}
          </div>
          <div style={{ fontSize: "1.1rem", color: "rgba(255,255,255,.45)" }}>UMP Seller</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "8px 0" }}>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`seller-nav-item${tab === item.id ? " active" : ""}`}
            onClick={() => {
              if (item.action === "navigate") {
                navigate(item.id === "Messages" ? "/messages" : "/settings");
              } else {
                setTab(item.id);
              }
            }}
          >
            <i className={`fas fa-${item.icon}`} style={{ width: 18, textAlign: "center", flexShrink: 0 }} />
            {item.label}
            {item.id === "Messages" && unreadMessages > 0 && (
              <span className="nav-badge">{unreadMessages > 9 ? "9+" : unreadMessages}</span>
            )}
          </button>
        ))}
      </nav>

      <div style={{ padding: "12px 0 20px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <button className="seller-nav-item" onClick={() => navigate("/")} style={{ color: "rgba(255,255,255,.5)" }}>
          <i className="fas fa-arrow-left" style={{ width: 18, textAlign: "center" }} />
          Return to UMP
        </button>
      </div>
    </aside>
  );
}

// ─── Alert banners ────────────────────────────────────────────────────────────
function Alerts({ orders, products, kpis, setTab }) {
  const [dismissed, setDismissed] = useState([]);
  const dismiss = (id) => setDismissed((d) => [...d, id]);

  const newOrders = orders.filter((o) => o.status === "pending").length;
  const lowStock  = products.filter((p) => p.stock !== undefined && p.stock <= 5 && p.stock > 0).length;
  const payout    = kpis?.walletBalance || 0;

  const alerts = [
    newOrders > 0 && { id: "orders", bg: "rgba(249,115,22,.12)", border: "rgba(249,115,22,.3)", color: "var(--accent)", icon: "box-archive", text: `${newOrders} New Order${newOrders > 1 ? "s" : ""}!`, cta: "View Now", action: () => setTab("Orders") },
    lowStock > 0  && { id: "stock",  bg: "rgba(234,179,8,.1)",   border: "rgba(234,179,8,.3)",  color: "#d97706",       icon: "triangle-exclamation", text: `${lowStock} Product${lowStock > 1 ? "s" : ""} Low Stock`, cta: "Restock", action: () => setTab("Products") },
    payout > 0    && { id: "payout", bg: "rgba(34,197,94,.1)",   border: "rgba(34,197,94,.3)",  color: "#16a34a",       icon: "wallet", text: `${naira(payout)} Payout Ready`, cta: "Withdraw", action: () => setTab("Payouts") },
  ].filter(Boolean).filter((a) => !dismissed.includes(a.id));

  if (alerts.length === 0) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      {alerts.map((a) => (
        <div key={a.id} className="seller-alert" style={{ background: a.bg, border: `1px solid ${a.border}` }}>
          <i className={`fas fa-${a.icon}`} style={{ color: a.color, fontSize: "1.6rem", flexShrink: 0 }} />
          <span style={{ flex: 1, color: "var(--ink-1)" }}>{a.text}</span>
          <button onClick={a.action} style={{ background: a.color, color: "#fff", border: "none", borderRadius: "var(--r-pill)", padding: "4px 12px", fontSize: "1.2rem", fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "var(--font-sans)" }}>{a.cta}</button>
          <button onClick={() => dismiss(a.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-3)", padding: "0 4px", fontSize: "1.3rem" }}><i className="fas fa-xmark" /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const S_STYLE = {
  pending:   { bg: "#fef3c7", color: "#d97706" },
  confirmed: { bg: "#dbeafe", color: "#1d4ed8" },
  shipped:   { bg: "#e0f2fe", color: "#0284c7" },
  partial:   { bg: "#fef9c3", color: "#a16207" },
  completed: { bg: "#dcfce7", color: "#16a34a" },
  delivered: { bg: "#dcfce7", color: "#16a34a" },
  cancelled: { bg: "#fee2e2", color: "#dc2626" },
};
function StatusBadge({ status }) {
  const s = S_STYLE[status] || S_STYLE.pending;
  return <span style={{ fontSize: "1.1rem", padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.color, fontWeight: 700, whiteSpace: "nowrap" }}>{status || "pending"}</span>;
}

// ─── Verify banner ────────────────────────────────────────────────────────────
function VerifyBanner({ requested, onNavigate }) {
  if (requested) {
    return (
      <div style={{ padding: "12px 16px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.25)", display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <i className="fas fa-clock" style={{ fontSize: "1.6rem", color: "#3b82f6", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1d4ed8" }}>Subscription pending</div>
          <div style={{ fontSize: "1.15rem", color: "var(--ink-3)" }}>We're reviewing your subscription request. You'll be notified once activated.</div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={onNavigate}>View details</button>
      </div>
    );
  }
  return (
    <div style={{ padding: "12px 16px", borderRadius: "var(--r-md)", background: "linear-gradient(135deg,rgba(245,158,11,.1),rgba(217,119,6,.07))", border: "1px solid rgba(245,158,11,.4)", display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
      <i className="fas fa-crown" style={{ fontSize: "1.6rem", color: "#f59e0b", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>Subscribe your store</div>
        <div style={{ fontSize: "1.15rem", color: "var(--ink-3)" }}>Get the UMP crown badge, priority search placement and unlimited listings.</div>
      </div>
      <button className="btn btn-primary btn-sm" style={{ borderRadius: "var(--r-pill)", flexShrink: 0 }} onClick={onNavigate}>
        <i className="fas fa-crown" /> See plans
      </button>
    </div>
  );
}

// ─── Quick Edit Modal ─────────────────────────────────────────────────────────
function QuickEditModal({ product, onClose, onSave, showToast }) {
  const [form, setForm] = useState({
    name: product.name || "",
    price: product.price || "",
    stock: product.stock ?? "",
    desc: product.desc || "",
    condition: product.condition || "New",
    status: product.status || "active",
    colors: Array.isArray(product.colors) ? product.colors : [],
    specs: Object.entries(product.specs || {}).map(([k, v]) => ({ k, v })),
    existingImages: Array.isArray(product.images)
      ? product.images.map((img) => (typeof img === "string" ? { url: img, publicId: "" } : img))
      : [],
    removeImages: [],
    salePrice: product.salePrice != null ? product.salePrice : "",
    saleEndsAt: product.saleEndsAt ? new Date(product.saleEndsAt).toISOString().slice(0, 16) : "",
  });
  const [saving, setSaving] = useState(false);
  const [colorInput, setColorInput] = useState({ name: "", code: "#e0e0e0" });
  const [specInput, setSpecInput] = useState({ k: "", v: "" });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const addColor = () => {
    if (!colorInput.name.trim()) return;
    setForm((f) => ({ ...f, colors: [...f.colors, { ...colorInput }] }));
    setColorInput({ name: "", code: "#e0e0e0" });
  };
  const removeColor = (i) => setForm((f) => ({ ...f, colors: f.colors.filter((_, idx) => idx !== i) }));

  const addSpec = () => {
    if (!specInput.k.trim()) return;
    setForm((f) => ({ ...f, specs: [...f.specs, { ...specInput }] }));
    setSpecInput({ k: "", v: "" });
  };
  const removeSpec = (i) => setForm((f) => ({ ...f, specs: f.specs.filter((_, idx) => idx !== i) }));

  const markRemoveImage = (publicId) => setForm((f) => ({ ...f, removeImages: [...f.removeImages, publicId] }));

  async function handleSave() {
    if (!form.name.trim()) { showToast("Product name is required", "error"); return; }
    if (!form.price || Number(form.price) <= 0) { showToast("Valid price is required", "error"); return; }
    setSaving(true);
    try {
      const specsObj = {};
      form.specs.forEach(({ k, v }) => { if (k) specsObj[k] = v; });
      const updated = await apiFetch(`/api/products/${product._id}`, {
        method: "PUT",
        body: {
          name: form.name.trim(),
          price: Number(form.price),
          stock: form.stock !== "" ? Number(form.stock) : undefined,
          desc: form.desc,
          condition: form.condition,
          status: form.status,
          colors: form.colors,
          specs: specsObj,
          removeImages: form.removeImages,
          salePrice: form.salePrice !== "" ? Number(form.salePrice) : null,
          saleEndsAt: form.saleEndsAt || null,
        },
      });
      showToast("Product updated", "success");
      onSave(updated.product || { ...product, name: form.name, price: Number(form.price), stock: Number(form.stock), desc: form.desc, condition: form.condition });
      onClose();
    } catch (err) {
      showToast(err?.message || "Failed to update product", "error");
    } finally {
      setSaving(false);
    }
  }

  const iSty = { width: "100%", padding: "8px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-1)", fontSize: "1.3rem", fontFamily: "var(--font-sans)", boxSizing: "border-box" };
  const lSty = { fontSize: "1.15rem", color: "var(--ink-3)", fontWeight: 600, marginBottom: 4, display: "block" };

  const visibleImages = form.existingImages.filter((img) => !form.removeImages.includes(img.publicId));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--card)", zIndex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "1.8rem" }}>Quick Edit</div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.8rem", color: "var(--ink-3)" }}><i className="fas fa-xmark" /></button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Product Name</label>
            <input style={iSty} value={form.name} onChange={set("name")} placeholder="Product name" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lSty}>Price (₦)</label>
              <input style={iSty} type="number" min="0" value={form.price} onChange={set("price")} />
            </div>
            <div>
              <label style={lSty}>Stock</label>
              <input style={iSty} type="number" min="0" value={form.stock} onChange={set("stock")} />
            </div>
            <div>
              <label style={lSty}>Condition</label>
              <select style={{ ...iSty }} value={form.condition} onChange={set("condition")}>
                <option value="New">New</option>
                <option value="Used">Used</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Status</label>
            <select style={{ ...iSty }} value={form.status} onChange={set("status")}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Description</label>
            <textarea style={{ ...iSty, height: 80, resize: "vertical" }} value={form.desc} onChange={set("desc")} placeholder="Product description..." />
          </div>

          {/* Flash Sale */}
          <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: "var(--r-md)", border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.04)" }}>
            <label style={{ ...lSty, color: "#dc2626", marginBottom: 8 }}><i className="fas fa-bolt" style={{ marginRight: 5 }} /> Flash Sale (optional)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={lSty}>Sale Price (₦)</label>
                <input style={iSty} type="number" min="0" value={form.salePrice} onChange={set("salePrice")} placeholder="e.g. 3500" />
              </div>
              <div>
                <label style={lSty}>Sale Ends At</label>
                <input style={iSty} type="datetime-local" value={form.saleEndsAt} onChange={set("saleEndsAt")} />
              </div>
            </div>
            {form.salePrice && Number(form.salePrice) > 0 && (
              <button className="btn btn-ghost" style={{ marginTop: 8, fontSize: "1.1rem", padding: "4px 10px", color: "#dc2626" }} onClick={() => setForm((f) => ({ ...f, salePrice: "", saleEndsAt: "" }))}>
                <i className="fas fa-xmark" style={{ marginRight: 4 }} /> Clear sale
              </button>
            )}
          </div>

          {/* Images */}
          {visibleImages.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={lSty}>Images <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(click × to remove)</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {visibleImages.map((img, i) => (
                  <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
                    <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                    {img.publicId && (
                      <button onClick={() => markRemoveImage(img.publicId)} style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                        <i className="fas fa-xmark" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Colors */}
          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Colors</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {form.colors.map((c, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 20, background: "var(--surface)", border: "1px solid var(--line)", fontSize: "1.2rem" }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: c.code || "#999", border: "1px solid var(--line)", flexShrink: 0 }} />
                  {c.name}
                  <button onClick={() => removeColor(i)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0, fontSize: "1rem", lineHeight: 1 }}><i className="fas fa-xmark" /></button>
                </span>
              ))}
              {form.colors.length === 0 && <span style={{ fontSize: "1.2rem", color: "var(--ink-4)" }}>No colors added</span>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input style={{ ...iSty, flex: 1 }} placeholder="Color name (e.g. Red)" value={colorInput.name} onChange={(e) => setColorInput((c) => ({ ...c, name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addColor()} />
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: colorInput.code || "#e0e0e0", border: "1px solid rgba(0,0,0,.15)", flexShrink: 0, display: "inline-block" }} title={colorInput.code} />
              <input type="color" value={colorInput.code} onChange={(e) => setColorInput((c) => ({ ...c, code: e.target.value }))} style={{ width: 40, height: 38, border: "1px solid var(--line)", borderRadius: "var(--r-md)", cursor: "pointer", padding: 2, flexShrink: 0 }} />
              <button className="btn btn-sm btn-ghost" onClick={addColor} style={{ flexShrink: 0 }}>Add</button>
            </div>
          </div>

          {/* Specs */}
          <div style={{ marginBottom: 4 }}>
            <label style={lSty}>Specifications</label>
            {form.specs.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {form.specs.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ flex: 1, fontSize: "1.2rem", padding: "5px 10px", background: "var(--surface)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
                      <strong>{s.k}:</strong> {s.v}
                    </div>
                    <button onClick={() => removeSpec(i)} style={{ border: "none", background: "none", cursor: "pointer", color: "#dc2626", padding: "4px 6px" }}><i className="fas fa-trash" style={{ fontSize: "1.1rem" }} /></button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...iSty, flex: 1 }} placeholder="Key (e.g. Weight)" value={specInput.k} onChange={(e) => setSpecInput((s) => ({ ...s, k: e.target.value }))} />
              <input style={{ ...iSty, flex: 1 }} placeholder="Value (e.g. 500g)" value={specInput.v} onChange={(e) => setSpecInput((s) => ({ ...s, v: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addSpec()} />
              <button className="btn btn-sm btn-ghost" onClick={addSpec} style={{ flexShrink: 0 }}>Add</button>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--line)", display: "flex", gap: 10, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "var(--card)" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Listing Modal (Apartments) ───────────────────────────────────────────────
const AMENITY_OPTIONS = ["WiFi", "Water", "Electricity", "Kitchen", "Bathroom", "Parking", "Security", "Laundry", "AC", "Generator"];

function ListingModal({ listing, onClose, onSave, showToast }) {
  const [form, setForm] = useState({
    name: listing?.name || "",
    type: listing?.type || "Apartment",
    price: listing?.price || "",
    rate: listing?.rate || "per Year",
    location: listing?.location || "",
    beds: listing?.beds || 1,
    baths: listing?.baths || 1,
    distance: listing?.distance || "",
    description: listing?.description || "",
    furnished: listing?.furnished || false,
    available: listing?.available ?? true,
    amenities: listing?.amenities || [],
    pricePerHalfYear: listing?.pricePerHalfYear ?? "",
    agreementFee:  listing?.agreementFee  ?? "",
    commissionFee: listing?.commissionFee ?? "",
    agentFee:      listing?.agentFee      ?? "",
    cautionFee:    listing?.cautionFee    ?? "",
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [customAmenity, setCustomAmenity] = useState("");
  const [saving, setSaving] = useState(false);
  const [listCropQueue, setListCropQueue] = useState([]);
  const [listCropSrc, setListCropSrc] = useState(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const toggleAmenity = (a) => setForm((f) => ({
    ...f,
    amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
  }));

  function handleImagePick(e) {
    const files = Array.from(e.target.files).slice(0, 4 - imagePreviews.length);
    if (!files.length) return;
    const readers = files.map((file) => new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(file);
    }));
    Promise.all(readers).then((srcs) => {
      setListCropQueue(srcs.slice(1));
      setListCropSrc(srcs[0]);
    });
    e.target.value = "";
  }

  function handleListCropConfirm(blob) {
    const file = new File([blob], `listing-${imageFiles.length + 1}.jpg`, { type: "image/jpeg" });
    setImageFiles((prev) => [...prev, file]);
    setImagePreviews((prev) => [...prev, URL.createObjectURL(blob)]);
    if (listCropQueue.length > 0) {
      setListCropSrc(listCropQueue[0]);
      setListCropQueue((q) => q.slice(1));
    } else {
      setListCropSrc(null);
    }
  }

  function removeImage(i) {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleVideoPick(e) {
    const f = e.target.files?.[0];
    if (f) { setVideoFile(f); setVideoPreview(URL.createObjectURL(f)); }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.location.trim() || !form.price) {
      showToast("Name, location, and price are required", "error");
      return;
    }
    if (!imageFiles.length && !listing?.images?.length) {
      showToast("At least one listing photo is required", "error");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("type", form.type);
      fd.append("price", Number(form.price));
      fd.append("rate", form.rate);
      fd.append("location", form.location.trim());
      fd.append("beds", Number(form.beds));
      fd.append("baths", Number(form.baths));
      fd.append("distance", form.distance);
      fd.append("description", form.description);
      fd.append("furnished", form.furnished);
      fd.append("available", form.available);
      if (form.pricePerHalfYear) fd.append("pricePerHalfYear", Number(form.pricePerHalfYear));
      fd.append("agreementFee",  Number(form.agreementFee)  || 0);
      fd.append("commissionFee", Number(form.commissionFee) || 0);
      fd.append("agentFee",      Number(form.agentFee)      || 0);
      fd.append("cautionFee",    Number(form.cautionFee)    || 0);
      form.amenities.forEach((a) => fd.append("amenities", a));
      imageFiles.forEach((f) => fd.append("images", f));
      if (videoFile) fd.append("videos", videoFile);

      let result;
      if (listing) {
        result = await apiFetch(`/api/listings/${listing._id}`, { method: "PUT", body: fd });
      } else {
        result = await apiFetch("/api/listings", { method: "POST", body: fd });
      }
      showToast(listing ? "Listing updated" : "Listing created", "success");
      onSave(result.listing);
    } catch (err) {
      showToast(err?.message || "Failed to save listing", "error");
    } finally {
      setSaving(false);
    }
  }

  const iSty = { width: "100%", padding: "8px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-1)", fontSize: "1.3rem", fontFamily: "var(--font-sans)", boxSizing: "border-box" };
  const lSty = { fontSize: "1.15rem", color: "var(--ink-3)", fontWeight: 600, marginBottom: 4, display: "block" };

  return (
    <>
    {listCropSrc && (
      <ImageCropModal
        src={listCropSrc}
        aspect={4 / 3}
        title={`Crop listing photo ${imagePreviews.length + 1}`}
        onConfirm={handleListCropConfirm}
        onCancel={() => { setListCropSrc(null); setListCropQueue([]); }}
      />
    )}
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 560, width: "100%", maxHeight: "92vh", overflowY: "auto", padding: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--card)", zIndex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "1.8rem" }}>{listing ? "Edit Listing" : "New Listing"}</div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.8rem", color: "var(--ink-3)" }}><i className="fas fa-xmark" /></button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Property Name</label>
            <input style={iSty} value={form.name} onChange={set("name")} placeholder="e.g. Luxury 2BR Apartment near UNILAG" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lSty}>Type</label>
              <select style={{ ...iSty }} value={form.type} onChange={set("type")}>
                <option value="Apartment">Apartment</option>
                <option value="Hostel">Hostel</option>
              </select>
            </div>
            <div>
              <label style={lSty}>Payment Plan</label>
              <select style={{ ...iSty }} value={form.rate} onChange={set("rate")}>
                <option value="per Year">Per Year</option>
                <option value="per Month">Per Month</option>
                <option value="per Semester">Per Semester</option>
                <option value="per Day">Per Day</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lSty}>Price / yr (₦)</label>
              <input style={iSty} type="number" min="0" value={form.price} onChange={set("price")} placeholder="0" />
            </div>
            <div>
              <label style={lSty}>Price / 6 months (₦) <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>optional</span></label>
              <input style={iSty} type="number" min="0" value={form.pricePerHalfYear} onChange={set("pricePerHalfYear")} placeholder="0" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lSty}>Distance to Campus</label>
              <input style={iSty} value={form.distance} onChange={set("distance")} placeholder="e.g. 500m from gate" />
            </div>
            <div>
              <label style={lSty}>Location / Neighborhood</label>
              <input style={iSty} value={form.location} onChange={set("location")} placeholder="e.g. Akoka, Yaba, Lagos" />
            </div>
          </div>

          {/* Agent / move-in fees — optional */}
          <div style={{ marginBottom: 4 }}>
            <label style={lSty}>Agent & Move-in Fees <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional — Lagos agents)</span></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ ...lSty, fontSize: "1.1rem" }}>Agreement fee (₦)</label>
              <input style={iSty} type="number" min="0" value={form.agreementFee} onChange={set("agreementFee")} placeholder="0" />
            </div>
            <div>
              <label style={{ ...lSty, fontSize: "1.1rem" }}>Commission fee (₦)</label>
              <input style={iSty} type="number" min="0" value={form.commissionFee} onChange={set("commissionFee")} placeholder="0" />
            </div>
            <div>
              <label style={{ ...lSty, fontSize: "1.1rem" }}>Agent fee (₦)</label>
              <input style={iSty} type="number" min="0" value={form.agentFee} onChange={set("agentFee")} placeholder="0" />
            </div>
            <div>
              <label style={{ ...lSty, fontSize: "1.1rem" }}>Caution fee (₦)</label>
              <input style={iSty} type="number" min="0" value={form.cautionFee} onChange={set("cautionFee")} placeholder="0" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lSty}>{form.type === "Hostel" ? "Men per Room" : "Bedrooms"}</label>
              <input style={iSty} type="number" min="1" value={form.beds} onChange={set("beds")} placeholder={form.type === "Hostel" ? "e.g. 4" : "1"} />
            </div>
            <div>
              <label style={lSty}>Bathrooms</label>
              <input style={iSty} type="number" min="0" value={form.baths} onChange={set("baths")} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "1.2rem", color: "var(--ink-2)" }}>
                <input type="checkbox" checked={form.furnished} onChange={set("furnished")} />
                Furnished
              </label>
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "1.2rem", color: "var(--ink-2)" }}>
                <input type="checkbox" checked={form.available} onChange={set("available")} />
                Available
              </label>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Description</label>
            <textarea style={{ ...iSty, height: 80, resize: "vertical" }} value={form.description} onChange={set("description")} placeholder="Describe the property..." />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Amenities</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {AMENITY_OPTIONS.map((a) => {
                const active = form.amenities.includes(a);
                return (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)} style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`, background: active ? "rgba(249,115,22,.1)" : "transparent", color: active ? "var(--accent)" : "var(--ink-2)", fontWeight: active ? 600 : 400, fontSize: "1.2rem", cursor: "pointer", transition: "all .15s", fontFamily: "var(--font-sans)" }}>
                    {a}
                  </button>
                );
              })}
              {/* Custom amenities added by user */}
              {form.amenities.filter((a) => !AMENITY_OPTIONS.includes(a)).map((a) => (
                <span key={a} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, border: "1px solid var(--accent)", background: "rgba(249,115,22,.1)", color: "var(--accent)", fontSize: "1.2rem", fontWeight: 600 }}>
                  {a}
                  <button type="button" onClick={() => toggleAmenity(a)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--accent)", padding: 0, lineHeight: 1, fontSize: "1rem", display: "flex", alignItems: "center" }}>
                    <i className="fas fa-xmark" />
                  </button>
                </span>
              ))}
            </div>
            {/* Add custom amenity */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...iSty, flex: 1 }}
                placeholder="Add custom (e.g. Rooftop, CCTV, Gym)…"
                value={customAmenity}
                onChange={(e) => setCustomAmenity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = customAmenity.trim();
                    if (val && !form.amenities.includes(val)) {
                      setForm((f) => ({ ...f, amenities: [...f.amenities, val] }));
                    }
                    setCustomAmenity("");
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ flexShrink: 0 }}
                onClick={() => {
                  const val = customAmenity.trim();
                  if (val && !form.amenities.includes(val)) {
                    setForm((f) => ({ ...f, amenities: [...f.amenities, val] }));
                  }
                  setCustomAmenity("");
                }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Photos */}
          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Photos <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(max 4)</span></label>
            {listing?.images?.length > 0 && imagePreviews.length === 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                {listing.images.map((img, i) => (
                  <img key={i} src={img.url} alt="" style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", border: "1px solid var(--line)" }} />
                ))}
                <span style={{ fontSize: "1.1rem", color: "var(--ink-4)", alignSelf: "center" }}>Pick new photos below to replace</span>
              </div>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "8px 14px", borderRadius: "var(--r-md)", border: "1px dashed var(--line)", background: "var(--surface)", width: "fit-content" }}>
              <i className="fas fa-cloud-arrow-up" style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "1.2rem", color: "var(--ink-2)" }}>{imageFiles.length > 0 ? `${imageFiles.length} photo(s) selected` : "Choose photos"}</span>
              <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImagePick} />
            </label>
            {imagePreviews.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {imagePreviews.map((src, i) => (
                  <div key={i} style={{ position: "relative", width: 80, height: 80 }}>
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                    <button onClick={() => removeImage(i)} style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                      <i className="fas fa-xmark" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video Tour */}
          <div style={{ marginBottom: 4 }}>
            <label style={lSty}>Video Tour <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(optional)</span></label>
            {!videoPreview && listing?.videos?.[0]?.url && (
              <video controls playsInline preload="metadata" style={{ width: "100%", borderRadius: 8, maxHeight: 160, marginBottom: 8 }}>
                <source src={cloudVideo(listing.videos[0].url)} type="video/mp4" />
              </video>
            )}
            {videoPreview ? (
              <div style={{ position: "relative" }}>
                <video controls playsInline preload="metadata" style={{ width: "100%", borderRadius: 8, maxHeight: 160 }}>
                  <source src={videoPreview} type={videoFile?.type || "video/mp4"} />
                </video>
                <button onClick={() => { setVideoFile(null); setVideoPreview(null); }} style={{ position: "absolute", top: 8, right: 8, background: "#dc2626", color: "#fff", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                  <i className="fas fa-xmark" />
                </button>
              </div>
            ) : (
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "8px 14px", borderRadius: "var(--r-md)", border: "1px dashed var(--line)", background: "var(--surface)", width: "fit-content" }}>
                <i className="fas fa-video" style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: "1.2rem", color: "var(--ink-2)" }}>{videoFile ? videoFile.name : "Upload video"}</span>
                <input type="file" accept="video/*" style={{ display: "none" }} onChange={handleVideoPick} />
              </label>
            )}
          </div>
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--line)", display: "flex", gap: 10, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "var(--card)" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? <i className="fas fa-spinner fa-spin" /> : listing ? <><i className="fas fa-check" /> Save Changes</> : <><i className="fas fa-plus" /> Add Listing</>}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Add Product Modal ────────────────────────────────────────────────────────
function AddProductModal({ onClose, onSave, showToast }) {
  const [form, setForm] = useState({ name: "", price: "", stock: "", desc: "", condition: "New", status: "active", category: "", colors: [], specs: [] });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [mainImageIdx, setMainImageIdx] = useState(0);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [colorInput, setColorInput] = useState({ name: "", code: "#e0e0e0" });
  const [specInput, setSpecInput] = useState({ k: "", v: "" });
  const [cropQueue, setCropQueue] = useState([]);
  const [cropSrc, setCropSrc] = useState(null);

  useEffect(() => {
    apiFetch("/api/categories")
      .then((d) => setCategories(d.categories || d || []))
      .catch(() => setCategories([]));
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function handleImages(e) {
    const files = Array.from(e.target.files).slice(0, 4 - imageFiles.length);
    if (!files.length) return;
    const readers = files.map((file) => new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(file);
    }));
    Promise.all(readers).then((srcs) => {
      setCropQueue(srcs.slice(1));
      setCropSrc(srcs[0]);
    });
    e.target.value = "";
  }

  function handleProductCropConfirm(blob) {
    const file = new File([blob], `product-${imageFiles.length + 1}.jpg`, { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    setImageFiles((prev) => [...prev, file]);
    setImagePreviews((prev) => [...prev, url]);
    if (cropQueue.length > 0) {
      setCropSrc(cropQueue[0]);
      setCropQueue((q) => q.slice(1));
    } else {
      setCropSrc(null);
    }
  }

  function removePreview(i) {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
    setMainImageIdx((m) => { if (i < m) return m - 1; if (i === m) return 0; return m; });
  }

  const addColor = () => { if (!colorInput.name.trim()) return; setForm((f) => ({ ...f, colors: [...f.colors, { ...colorInput }] })); setColorInput({ name: "", code: "#e0e0e0" }); };
  const removeColor = (i) => setForm((f) => ({ ...f, colors: f.colors.filter((_, idx) => idx !== i) }));
  const addSpec = () => { if (!specInput.k.trim()) return; setForm((f) => ({ ...f, specs: [...f.specs, { ...specInput }] })); setSpecInput({ k: "", v: "" }); };
  const removeSpec = (i) => setForm((f) => ({ ...f, specs: f.specs.filter((_, idx) => idx !== i) }));

  async function handleSave() {
    setAddError("");
    if (!form.name.trim()) { setAddError("Product name is required."); return; }
    if (!form.price || Number(form.price) <= 0) { setAddError("A valid price greater than ₦0 is required."); return; }
    if (!imageFiles.length) { setAddError("At least one product image is required."); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("price", Number(form.price));
      if (form.stock) fd.append("stock", Number(form.stock));
      if (form.desc) fd.append("desc", form.desc);
      fd.append("condition", form.condition);
      fd.append("status", form.status);
      if (form.category) fd.append("category", form.category);
      fd.append("colors", JSON.stringify(form.colors));
      form.specs.forEach(({ k, v }) => { fd.append("specKey", k); fd.append("specValue", v); });
      // Send main image first so it becomes the cover
      const orderedFiles = mainImageIdx === 0
        ? imageFiles
        : [imageFiles[mainImageIdx], ...imageFiles.filter((_, i) => i !== mainImageIdx)];
      orderedFiles.forEach((file) => fd.append("images", file));

      const result = await apiFetch("/api/products/", { method: "POST", body: fd });
      showToast("Product created!", "success");
      onSave(result.product);
      onClose();
    } catch (err) {
      const msg = err?.message || "Failed to create product. Please try again.";
      setAddError(msg);
    } finally {
      setSaving(false);
    }
  }

  const iSty = { width: "100%", padding: "8px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-1)", fontSize: "1.3rem", fontFamily: "var(--font-sans)", boxSizing: "border-box" };
  const lSty = { fontSize: "1.15rem", color: "var(--ink-3)", fontWeight: 600, marginBottom: 4, display: "block" };

  return (
    <>
    {cropSrc && (
      <ImageCropModal
        src={cropSrc}
        aspect={1}
        title={`Crop product image ${imageFiles.length + 1} of ${imageFiles.length + 1 + cropQueue.length}`}
        onConfirm={handleProductCropConfirm}
        onCancel={() => { setCropSrc(null); setCropQueue([]); }}
      />
    )}
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 580, width: "100%", maxHeight: "92vh", overflowY: "auto", padding: 0 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--card)", zIndex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "1.8rem" }}>Add Product</div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.8rem", color: "var(--ink-3)" }}><i className="fas fa-xmark" /></button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Product Name *</label>
            <input style={iSty} value={form.name} onChange={set("name")} placeholder="e.g. iPhone 13 Pro Case" />
          </div>

          {/* Price / Stock / Condition */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lSty}>Price (₦) *</label>
              <input style={iSty} type="number" min="0" value={form.price} onChange={set("price")} placeholder="0" />
            </div>
            <div>
              <label style={lSty}>Stock</label>
              <input style={iSty} type="number" min="0" value={form.stock} onChange={set("stock")} placeholder="0" />
            </div>
            <div>
              <label style={lSty}>Condition</label>
              <select style={{ ...iSty }} value={form.condition} onChange={set("condition")}>
                <option value="New">New</option>
                <option value="Used">Used</option>
              </select>
            </div>
          </div>

          {/* Category / Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lSty}>Category</label>
              <select style={{ ...iSty }} value={form.category} onChange={set("category")}>
                <option value="">— Select category —</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lSty}>Status</label>
              <select style={{ ...iSty }} value={form.status} onChange={set("status")}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Description</label>
            <textarea style={{ ...iSty, height: 80, resize: "vertical" }} value={form.desc} onChange={set("desc")} placeholder="Describe your product..." />
          </div>

          {/* Images */}
          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Images <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(max 4)</span></label>
            {imageFiles.length < 4 && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "8px 14px", borderRadius: "var(--r-md)", border: "1px dashed var(--line)", background: "var(--surface)", width: "fit-content" }}>
                <i className="fas fa-cloud-arrow-up" style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: "1.2rem", color: "var(--ink-2)" }}>Add photos</span>
                <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImages} />
              </label>
            )}
            {imagePreviews.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {imagePreviews.map((src, i) => (
                  <div
                    key={i}
                    onClick={() => setMainImageIdx(i)}
                    title={i === mainImageIdx ? "Cover photo" : "Tap to set as cover"}
                    style={{ position: "relative", width: 80, height: 80, cursor: "pointer", borderRadius: 8, overflow: "hidden", outline: i === mainImageIdx ? "2.5px solid var(--accent)" : "none", outlineOffset: 2 }}
                  >
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {i === mainImageIdx && (
                      <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(249,115,22,.85)", color: "#fff", fontSize: "0.85rem", fontWeight: 700, textAlign: "center", padding: "1px 0" }}>Cover</span>
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); removePreview(i); }} style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,.65)", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                      <i className="fas fa-xmark" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {imagePreviews.length > 1 && (
              <p style={{ margin: "5px 0 0", fontSize: "1.1rem", color: "var(--ink-3)" }}>
                <i className="fas fa-circle-info" style={{ marginRight: 4 }} />Tap an image to set it as the cover
              </p>
            )}
          </div>

          {/* Colors */}
          <div style={{ marginBottom: 14 }}>
            <label style={lSty}>Colors <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(optional)</span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {form.colors.map((c, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 20, background: "var(--surface)", border: "1px solid var(--line)", fontSize: "1.2rem" }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: c.code || "#999", flexShrink: 0 }} />
                  {c.name}
                  <button onClick={() => removeColor(i)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0, fontSize: "1rem" }}><i className="fas fa-xmark" /></button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input style={{ ...iSty, flex: 1 }} placeholder="Color name" value={colorInput.name} onChange={(e) => setColorInput((c) => ({ ...c, name: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addColor()} />
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: colorInput.code || "#e0e0e0", border: "1px solid rgba(0,0,0,.15)", flexShrink: 0, display: "inline-block" }} title={colorInput.code} />
              <input type="color" value={colorInput.code} onChange={(e) => setColorInput((c) => ({ ...c, code: e.target.value }))} style={{ width: 40, height: 38, border: "1px solid var(--line)", borderRadius: "var(--r-md)", cursor: "pointer", padding: 2, flexShrink: 0 }} />
              <button className="btn btn-sm btn-ghost" onClick={addColor} style={{ flexShrink: 0 }}>Add</button>
            </div>
          </div>

          {/* Specs */}
          <div style={{ marginBottom: 4 }}>
            <label style={lSty}>Specifications <span style={{ fontWeight: 400, color: "var(--ink-4)" }}>(optional)</span></label>
            {form.specs.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {form.specs.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ flex: 1, fontSize: "1.2rem", padding: "5px 10px", background: "var(--surface)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}><strong>{s.k}:</strong> {s.v}</div>
                    <button onClick={() => removeSpec(i)} style={{ border: "none", background: "none", cursor: "pointer", color: "#dc2626", padding: "4px 6px" }}><i className="fas fa-trash" style={{ fontSize: "1.1rem" }} /></button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...iSty, flex: 1 }} placeholder="Key (e.g. Weight)" value={specInput.k} onChange={(e) => setSpecInput((s) => ({ ...s, k: e.target.value }))} />
              <input style={{ ...iSty, flex: 1 }} placeholder="Value (e.g. 500g)" value={specInput.v} onChange={(e) => setSpecInput((s) => ({ ...s, v: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addSpec()} />
              <button className="btn btn-sm btn-ghost" onClick={addSpec} style={{ flexShrink: 0 }}>Add</button>
            </div>
          </div>
        </div>

        {addError && (
          <div style={{ margin: "0 20px 12px", padding: "12px 14px", background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.3)", borderRadius: "var(--r-md)", display: "flex", alignItems: "flex-start", gap: 10, fontSize: "1.25rem", color: "#dc2626" }}>
            <i className="fas fa-circle-exclamation" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Could not create product</div>
              <div style={{ color: "var(--ink-2)", lineHeight: 1.5 }}>{addError}</div>
              <div style={{ marginTop: 6, fontSize: "1.1rem", color: "var(--ink-3)" }}>If this keeps happening, screenshot this message and send it to the admin.</div>
            </div>
          </div>
        )}

        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--line)", display: "flex", gap: 10, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "var(--card)" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-plus" /> Create Product</>}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────
const STRENGTH_RULES = [
  { key: "len",     label: "At least 6 characters",        test: (p) => p.length >= 6 },
  { key: "upper",   label: "One uppercase letter (A–Z)",   test: (p) => /[A-Z]/.test(p) },
  { key: "lower",   label: "One lowercase letter (a–z)",   test: (p) => /[a-z]/.test(p) },
  { key: "number",  label: "One number (0–9)",              test: (p) => /\d/.test(p) },
  { key: "special", label: "One special character (!@#…)",  test: (p) => /[^A-Za-z0-9]/.test(p) },
];
const STRENGTH_COLOR = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
const STRENGTH_LABEL = ["", "Very weak", "Weak", "Fair", "Strong", "Very strong"];
function strengthScore(p) { return STRENGTH_RULES.filter((r) => r.test(p)).length; }

function StrengthMeter({ password }) {
  if (!password) return null;
  const score = strengthScore(password);
  return (
    <div style={{ marginTop: -4, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {STRENGTH_RULES.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < score ? STRENGTH_COLOR[score] : "var(--line)", transition: "background .2s" }} />
        ))}
      </div>
      <div style={{ fontSize: "1.15rem", color: STRENGTH_COLOR[score], fontWeight: 600, marginBottom: 8 }}>{STRENGTH_LABEL[score]}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {STRENGTH_RULES.map((r) => {
          const ok = r.test(password);
          return (
            <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.2rem", color: ok ? "#16a34a" : "var(--ink-3)" }}>
              <i className={`fas fa-${ok ? "circle-check" : "circle"}`} style={{ fontSize: "1.1rem", flexShrink: 0 }} />
              {r.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const showToast = useToast();
  const [tab, setTab] = useState("Home");
  const [profile, setProfile] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [products, setProducts] = useState([]);
  const [productPerformance, setProductPerformance] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [orderFilter, setOrderFilter] = useState("All");
  const [statusUpdating, setStatusUpdating] = useState({});
  const [confirmCancel, setConfirmCancel] = useState(null);

  // Products
  const [quickEdit, setQuickEdit] = useState(null);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [productDeleting, setProductDeleting] = useState(false);

  // Apartments
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsFetched, setListingsFetched] = useState(false);
  const [listingModal, setListingModal] = useState(null);
  const [deleteListingId, setDeleteListingId] = useState(null);
  const [listingDeleting, setListingDeleting] = useState(false);

  // Settings
  const [dashPwd, setDashPwd] = useState({ old: "", new: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdShow, setPwdShow] = useState({ old: false, new: false, confirm: false });
  const [dashStore, setDashStore] = useState({ storeName: "", desc: "", address: "", avatarUrl: "", avatarPublicId: "", bannerUrl: "", bannerPublicId: "" });
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeAvatarUploading, setStoreAvatarUploading] = useState(false);
  const [storeBannerUploading, setStoreBannerUploading] = useState(false);
  const [storeCropSrc, setStoreCropSrc] = useState(null);
  const [storeCropTarget, setStoreCropTarget] = useState(null);
  const [dashNotifs, setDashNotifs] = useState({ orderUpdate: true, newMessage: true, lowStock: true, payoutReady: true });
  const [notifSaving, setNotifSaving] = useState(false);
  const [dashPolicy, setDashPolicy] = useState({ returnPolicy: "", fulfillmentTime: "" });
  const [policySaving, setPolicySaving] = useState(false);
  const DEFAULT_DELIVERY_CONFIG = {
    pickup:       { enabled: true,  instructions: "" },
    selfDelivery: { enabled: false, fee: 0, coverage: "", estimatedDays: "1–3 days" },
    shipbubble:   { enabled: false, pickupAddress: { name: "", phone: "", email: "", street: "", city: "", state: "" } },
  };
  const [deliveryConfig, setDeliveryConfig] = useState(DEFAULT_DELIVERY_CONFIG);
  const [deliveryConfigSaving, setDeliveryConfigSaving] = useState(false);
  const [deliveryConfigured, setDeliveryConfigured] = useState(true); // assume true until profile loads
  const [deliveryModalDismissed, setDeliveryModalDismissed] = useState(false);
  const deliveryCardRef = useRef(null);

  // Promote
  const [adCampaigns, setAdCampaigns] = useState([]);
  const [adCampaignsLoaded, setAdCampaignsLoaded] = useState(false);
  const [adProductId, setAdProductId] = useState("");
  const [adPlan, setAdPlan] = useState("7days");
  const [adLoading, setAdLoading] = useState(false);
  const [adPlans, setAdPlans] = useState([
    { key: "3days",  label: "Starter",  days: 3,  price: 1500 },
    { key: "7days",  label: "Standard", days: 7,  price: 3000 },
    { key: "14days", label: "Premium",  days: 14, price: 5500 },
  ]);

  // Payouts
  const [bankForm, setBankForm] = useState({ bankName: "", bankCode: "", accountNumber: "", accountName: "" });
  const [bankSaving, setBankSaving] = useState(false);
  const [banks, setBanks] = useState([]);
  const [bankVerifying, setBankVerifying] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [retryingPayout, setRetryingPayout] = useState({});
  const [payoutSearch, setPayoutSearch] = useState("");
  const [payoutFilterStatus, setPayoutFilterStatus] = useState("All");

  // Delivery codes (seller enters buyer's code to confirm delivery)
  const [deliveryCodes, setDeliveryCodes] = useState({});
  const [deliverySubmitting, setDeliverySubmitting] = useState({});
  // Partial delivery: { [orderId]: Set<itemId> | null } — null = all pending items
  const [partialMode, setPartialMode] = useState({});
  const [partialSelected, setPartialSelected] = useState({});

  // ── Data load (callable for manual refresh) ──────────────────────────────────
  const loadDashboard = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true); else setLoading(true);
    Promise.all([
      apiFetch("/api/seller-dashboard").catch(() => null),
      apiFetch("/api/products/my").catch(() => []),
      apiFetch("/api/seller-dashboard/orders").catch(() => []),
      apiFetch("/api/payouts").catch(() => []),
      apiFetch("/api/messages/unread-count").catch(() => ({ count: 0 })),
      apiFetch("/api/payouts/details").catch(() => null),
      apiFetch("/api/listings/my").catch(() => ({ listings: [] })),
    ]).then(([dash, prods, ords, pays, unread, bankDets, listingsRes]) => {
      if (!dash && isManual) showToast('Failed to refresh dashboard data', 'error');
      setKpis(dash?.kpis || dash);
      setProfile((prev) => dash?.profile || prev);
      setProductPerformance(dash?.productPerformance || []);
      setProducts(prods.products || prods || []);
      setOrders(ords.orders || ords || []);
      setPayouts(pays.payouts || pays || []);
      setUnreadMessages(unread?.count || unread?.unread || 0);
      setListings(listingsRes?.listings || []);
      setListingsFetched(true);

      if (dash?.profile) {
        setDashStore({
          storeName: dash.profile.storeName || "",
          desc: dash.profile.description || dash.profile.desc || "",
          address: dash.profile.address || "",
          avatarUrl: dash.profile.logo?.url || dash.profile.avatar?.url || "",
          avatarPublicId: dash.profile.logo?.publicId || dash.profile.avatar?.publicId || "",
          bannerUrl: dash.profile.banner?.url || "",
          bannerPublicId: dash.profile.banner?.publicId || "",
        });
        if (dash.profile.returnPolicy || dash.profile.fulfillmentTime) {
          setDashPolicy({ returnPolicy: dash.profile.returnPolicy || "", fulfillmentTime: dash.profile.fulfillmentTime || "" });
        }
        if (dash.profile.notificationPreferences) {
          setDashNotifs((n) => ({ ...n, ...dash.profile.notificationPreferences }));
        }
        const dlv = dash.profile.delivery;
        const hasDelivery = dlv && (dlv.pickup?.enabled || dlv.selfDelivery?.enabled || dlv.shipbubble?.enabled);
        setDeliveryConfigured(!!hasDelivery);
        if (dlv) {
          setDeliveryConfig((prev) => ({
            pickup:       { ...prev.pickup,       ...(dlv.pickup       || {}) },
            selfDelivery: { ...prev.selfDelivery, ...(dlv.selfDelivery || {}) },
            shipbubble:   {
              ...prev.shipbubble,
              ...(dlv.shipbubble || {}),
              pickupAddress: { ...prev.shipbubble.pickupAddress, ...(dlv.shipbubble?.pickupAddress || {}) },
            },
          }));
        }
      }
      if (bankDets?.accountDetails) {
        setBankForm((f) => ({ ...f, ...bankDets.accountDetails }));
      }
      if (dash?.profile?.bankDetails) {
        const bd = dash.profile.bankDetails;
        setBankForm({ bankName: bd.bankName || "", bankCode: bd.bankCode || "", accountNumber: bd.accountNumber || "", accountName: bd.accountName || "" });
      }
    }).finally(() => { setLoading(false); setRefreshing(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user === null) { navigate("/login", { replace: true }); return; }
    if (user && !user.roles?.includes("seller")) { navigate("/partner", { replace: true }); return; }
    if (user?._id) loadDashboard(false);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load banks when Payouts tab opens ───────────────────────────────────────
  useEffect(() => {
    if (tab !== "Payouts" || banks.length > 0) return;
    apiFetch("/api/payments/banks")
      .then((d) => setBanks(d.banks || []))
      .catch(() => {});
  }, [tab, banks.length]);

  // ── Load ad campaigns + plans when Promote tab opens ────────────────────────
  useEffect(() => {
    if (tab !== "Promote" || adCampaignsLoaded) return;
    setAdCampaignsLoaded(true);
    apiFetch("/api/ads/my")
      .then((d) => setAdCampaigns(d.campaigns || []))
      .catch(() => {});
    apiFetch("/api/ads/plans")
      .then((d) => { if (d.plans?.length) setAdPlans(d.plans); })
      .catch(() => {});
  }, [tab, adCampaignsLoaded]);

  // ── Load listings when Apartments tab opens ──────────────────────────────────
  useEffect(() => {
    if (tab !== "Apartments" || listingsFetched) return;
    setListingsFetched(true);
    setListingsLoading(true);
    apiFetch("/api/listings/my")
      .then((d) => setListings(d.listings || []))
      .catch(() => setListings([]))
      .finally(() => setListingsLoading(false));
  }, [tab, listingsFetched]);

  // ── Verify ───────────────────────────────────────────────────────────────────
  async function requestVerification() {
    setVerifyLoading(true);
    try {
      await apiFetch("/api/sellers/request-verification", { method: "POST" });
      setProfile((p) => ({ ...p, subscriptionRequested: true }));
    } catch (err) {
      showToast(err?.message || "Subscription request failed. Please try again.", "error");
    } finally { setVerifyLoading(false); }
  }

  // ── Order status update ───────────────────────────────────────────────────────
  async function updateStatus(orderId, newStatus) {
    setStatusUpdating((s) => ({ ...s, [orderId]: newStatus }));
    try {
      const d = await apiFetch(`/api/orders/${orderId}/status`, { method: "PUT", body: { status: newStatus } });
      setOrders((prev) => prev.map((o) =>
        (o._id || o.id) === orderId
          ? { ...o, status: d.order.status, paymentStatus: d.order.paymentStatus, refund: d.order.refund }
          : o
      ));
      const msgs = {
        confirmed: "Order confirmed — buyer notified",
        shipped:   "Order marked as shipped",
        completed: "Order completed — funds released to your wallet",
        cancelled: "Order cancelled" + (d.order.paymentStatus === "refunded" ? " — refund initiated for buyer" : ""),
      };
      showToast(msgs[newStatus] || "Order updated", "success");
    } catch (err) {
      showToast(err?.message || "Failed to update order", "error");
    } finally {
      setStatusUpdating((s) => { const n = { ...s }; delete n[orderId]; return n; });
      setConfirmCancel(null);
    }
  }

  // ── Product delete ────────────────────────────────────────────────────────────
  async function handleDeleteProduct(productId) {
    setProductDeleting(true);
    try {
      await apiFetch(`/api/products/${productId}`, { method: "DELETE" });
      setProducts((p) => p.filter((x) => x._id !== productId));
      showToast("Product deleted", "success");
    } catch (err) {
      showToast(err?.message || "Failed to delete product", "error");
    } finally {
      setProductDeleting(false);
      setDeleteProductId(null);
    }
  }

  // ── Listing CRUD ───────────────────────────────────────────────────────────────
  function handleListingSaved(saved) {
    setListings((prev) => {
      const idx = prev.findIndex((l) => l._id === saved._id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = saved; return copy; }
      return [saved, ...prev];
    });
    setListingModal(null);
  }

  async function handleDeleteListing(id) {
    setListingDeleting(true);
    try {
      await apiFetch(`/api/listings/${id}`, { method: "DELETE" });
      setListings((l) => l.filter((li) => (li._id || li.id) !== id));
      showToast("Listing deleted", "success");
    } catch (err) {
      showToast(err?.message || "Failed to delete listing", "error");
    } finally {
      setListingDeleting(false);
      setDeleteListingId(null);
    }
  }

  // ── Settings handlers ──────────────────────────────────────────────────────────
  async function changePassword() {
    if (!dashPwd.old || !dashPwd.new || !dashPwd.confirm) { showToast("All fields required", "error"); return; }
    if (!STRENGTH_RULES.every((r) => r.test(dashPwd.new))) { showToast("Password doesn't meet all requirements", "error"); return; }
    if (dashPwd.new !== dashPwd.confirm) { showToast("Passwords don't match", "error"); return; }
    setPwdSaving(true);
    try {
      await apiFetch("/api/seller-dashboard/users/update-password", { method: "PUT", body: { currentPassword: dashPwd.old, newPassword: dashPwd.new } });
      showToast("Password updated", "success");
      setDashPwd({ old: "", new: "", confirm: "" });
    } catch (err) {
      showToast(err?.message || "Failed to update password", "error");
    } finally { setPwdSaving(false); }
  }

  async function uploadStoreImage(file, field) {
    const fd = new FormData();
    fd.append("file", file);
    const data = await apiFetch("/api/upload", { method: "POST", body: fd });
    setDashStore((s) => ({ ...s, [`${field}Url`]: data.url, [`${field}PublicId`]: data.publicId || "" }));
  }

  function openStoreCrop(file, target) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setStoreCropSrc(reader.result); setStoreCropTarget(target); };
    reader.readAsDataURL(file);
  }

  async function handleStoreCropConfirm(blob) {
    const field = storeCropTarget;
    const setter = field === "avatar" ? setStoreAvatarUploading : setStoreBannerUploading;
    setStoreCropSrc(null); setStoreCropTarget(null);
    setter(true);
    try {
      await uploadStoreImage(new File([blob], `${field}.jpg`, { type: "image/jpeg" }), field);
    } catch {
      showToast("Upload failed", "error");
    } finally {
      setter(false);
    }
  }

  async function saveStoreProfile() {
    setStoreSaving(true);
    try {
      await apiFetch("/api/seller-dashboard/sellers/settings", {
        method: "PUT",
        body: {
          storeName: dashStore.storeName,
          description: dashStore.desc,
          address: dashStore.address,
          ...(dashStore.avatarUrl && { logoUrl: dashStore.avatarUrl, logoPublicId: dashStore.avatarPublicId }),
          ...(dashStore.bannerUrl && { bannerUrl: dashStore.bannerUrl, bannerPublicId: dashStore.bannerPublicId }),
        },
      });
      setProfile((p) => ({ ...p, storeName: dashStore.storeName, description: dashStore.desc, address: dashStore.address }));
      showToast("Store profile updated", "success");
    } catch (err) {
      showToast(err?.message || "Failed to update store profile", "error");
    } finally { setStoreSaving(false); }
  }

  async function savePolicies() {
    setPolicySaving(true);
    try {
      await apiFetch("/api/seller-dashboard/sellers/policies", { method: "PUT", body: dashPolicy });
      showToast("Policies saved", "success");
    } catch (err) {
      showToast(err?.message || "Failed to save policies", "error");
    } finally { setPolicySaving(false); }
  }

  async function saveNotifs() {
    setNotifSaving(true);
    try {
      await apiFetch("/api/seller-dashboard/notifications/preferences", { method: "PUT", body: { notificationPreferences: dashNotifs } });
      showToast("Notification preferences saved", "success");
    } catch (err) {
      showToast(err?.message || "Failed to save preferences", "error");
    } finally { setNotifSaving(false); }
  }

  async function saveDeliverySettings() {
    const anyEnabled = deliveryConfig.pickup.enabled || deliveryConfig.selfDelivery.enabled || deliveryConfig.shipbubble.enabled;
    if (!anyEnabled) { showToast("Enable at least one delivery method", "error"); return; }
    setDeliveryConfigSaving(true);
    try {
      await apiFetch("/api/sellers/delivery", { method: "PUT", body: deliveryConfig });
      setDeliveryConfigured(true);
      showToast("Delivery settings saved", "success");
    } catch (err) {
      showToast(err?.message || "Failed to save delivery settings", "error");
    } finally { setDeliveryConfigSaving(false); }
  }

  // ── Payout handlers ────────────────────────────────────────────────────────────
  async function verifyAccount() {
    if (!bankForm.accountNumber || !bankForm.bankCode) { showToast("Select a bank and enter account number first", "error"); return; }
    setBankVerifying(true);
    try {
      const d = await apiFetch(`/api/payments/verify-account?account_number=${bankForm.accountNumber}&bank_code=${bankForm.bankCode}`);
      setBankForm((f) => ({ ...f, accountName: d.account_name }));
      showToast("Account verified: " + d.account_name, "success");
    } catch (err) {
      showToast(err?.message || "Could not verify account", "error");
    } finally { setBankVerifying(false); }
  }

  async function saveBankDetails() {
    if (!bankForm.bankCode || !bankForm.accountNumber || !bankForm.accountName) { showToast("Verify your account first", "error"); return; }
    setBankSaving(true);
    try {
      await apiFetch("/api/payments/bank-details", {
        method: "POST",
        body: { bankName: bankForm.bankName, bankCode: bankForm.bankCode, accountName: bankForm.accountName, accountNumber: bankForm.accountNumber },
      });
      showToast("Bank details saved", "success");
    } catch (err) {
      showToast(err?.message || "Failed to save bank details", "error");
    } finally { setBankSaving(false); }
  }

  async function confirmDeliveryByCode(orderId) {
    const code = (deliveryCodes[orderId] || "").trim().toUpperCase();
    if (!code) { showToast("Enter the delivery code from the buyer", "error"); return; }
    const selected = partialSelected[orderId]; // undefined = all items; Set = partial selection
    if (partialMode[orderId] && selected instanceof Set && selected.size === 0) {
      showToast("Select at least one item being delivered now", "error"); return;
    }
    setDeliverySubmitting((s) => ({ ...s, [orderId]: true }));
    try {
      const body = { deliveryCode: code };
      if (selected instanceof Set) body.deliveredItemIds = [...selected];
      const d = await apiFetch(`/api/orders/${orderId}/confirm-delivery`, { method: "PUT", body });
      if (d.partial) {
        // Partial: mark delivered items completed in local state, keep order open
        setOrders((prev) => prev.map((o) => {
          if ((o._id || o.id) !== orderId) return o;
          const updatedItems = (o.items || []).map((it) =>
            selected?.has(it._id) ? { ...it, status: "completed" } : it
          );
          return { ...o, status: "partial", items: updatedItems };
        }));
        setDeliveryCodes((c) => { const n = { ...c }; delete n[orderId]; return n; });
        setPartialMode((m) => { const n = { ...m }; delete n[orderId]; return n; });
        setPartialSelected((s) => { const n = { ...s }; delete n[orderId]; return n; });
        showToast(d.message, "success");
      } else {
        setOrders((prev) => prev.map((o) => (o._id || o.id) === orderId ? { ...o, status: "completed", paymentStatus: "released" } : o));
        setDeliveryCodes((c) => { const n = { ...c }; delete n[orderId]; return n; });
        setPartialMode((m) => { const n = { ...m }; delete n[orderId]; return n; });
        setPartialSelected((s) => { const n = { ...s }; delete n[orderId]; return n; });
        showToast(d.message || "Delivery confirmed! Transfer initiated.", "success");
      }
    } catch (err) {
      showToast(err?.message || "Invalid delivery code", "error");
    } finally {
      setDeliverySubmitting((s) => { const n = { ...s }; delete n[orderId]; return n; });
    }
  }

  async function startAdCampaign() {
    if (!adProductId) { showToast("Please select a product to promote", "error"); return; }
    setAdLoading(true);
    try {
      const res = await apiFetch("/api/ads/initiate", { method: "POST", body: { productId: adProductId, plan: adPlan } });
      if (res.authorization_url) window.location.href = res.authorization_url;
    } catch (err) {
      showToast(err?.message || "Failed to start ad payment", "error");
    } finally {
      setAdLoading(false);
    }
  }

  async function requestPayout() {
    const amount = Number(payoutAmount);
    if (!amount || amount < 100) { showToast("Minimum payout is ₦100", "error"); return; }
    if (amount > (kpis?.walletBalance || 0)) { showToast("Amount exceeds available balance", "error"); return; }
    setPayoutSaving(true);
    try {
      const result = await apiFetch("/api/payouts/request", { method: "POST", body: { amount, accountDetails: bankForm } });
      showToast(result?.message || "Payout request submitted", "success");
      setPayoutAmount("");
      setKpis((k) => ({ ...k, walletBalance: (k?.walletBalance || 0) - amount }));
      try {
        const pData = await apiFetch("/api/payouts");
        setPayouts(pData.payouts || pData || []);
      } catch { /* ignore refresh failure */ }
    } catch (err) {
      showToast(err?.message || "Failed to request payout", "error");
    } finally { setPayoutSaving(false); }
  }

  async function handleRetryPayout(payoutId) {
    setRetryingPayout((r) => ({ ...r, [payoutId]: true }));
    try {
      const result = await apiFetch(`/api/payouts/${payoutId}/retry`, { method: "POST" });
      showToast(result?.message || "Transfer initiated", "success");
      setPayouts((prev) => prev.map((p) => p._id === payoutId ? { ...p, ...result.payout } : p));
    } catch (err) {
      showToast(err?.message || "Retry failed. Check bank details.", "error");
    } finally {
      setRetryingPayout((r) => { const n = { ...r }; delete n[payoutId]; return n; });
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────────────
  const now = Date.now();
  const ordersLast7 = orders.filter((o) => now - new Date(o.createdAt || 0).getTime() < 7 * 86400000);
  const inventoryValue = products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);
  const productViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
  const filteredOrders = orderFilter === "All" ? orders : orders.filter((o) => o.status === orderFilter.toLowerCase());

  const filteredPayouts = payouts.filter((p) => {
    const matchStatus = payoutFilterStatus === "All" || p.status === payoutFilterStatus.toLowerCase();
    const matchSearch = !payoutSearch || naira(p.amount).includes(payoutSearch) || (p.bank || "").toLowerCase().includes(payoutSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  // ─── Input style helper ────────────────────────────────────────────────────────
  const iSty = { width: "100%", padding: "9px 12px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink-1)", fontSize: "1.3rem", fontFamily: "var(--font-sans)", boxSizing: "border-box" };
  const lSty = { fontSize: "1.15rem", color: "var(--ink-3)", fontWeight: 600, marginBottom: 4, display: "block" };

  // ═══════════════════════════════════════════════════════════════════════════════
  const PAGE_CONTENT = (
    <div style={{ padding: "20px 20px 80px" }}>
      {!loading && !profile?.isSubscribed && (
        <VerifyBanner requested={!!profile?.subscriptionRequested} onNavigate={() => navigate("/subscribe?type=seller")} />
      )}

      <Alerts orders={orders} products={products} kpis={kpis} setTab={setTab} />

      {/* ── Delivery setup required banner ── */}
      {!loading && !deliveryConfigured && tab !== "Settings" && (
        <div style={{
          marginBottom: 16, padding: "14px 16px", borderRadius: "var(--r-md)",
          background: "linear-gradient(135deg, rgba(249,115,22,.12) 0%, rgba(234,88,12,.08) 100%)",
          border: "1.5px solid rgba(249,115,22,.4)",
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(249,115,22,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="fas fa-truck" style={{ color: "var(--accent)", fontSize: "1.6rem" }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800, fontSize: "1.4rem", color: "var(--ink-1)", marginBottom: 2 }}>
              Set up your delivery options
            </div>
            <div style={{ fontSize: "1.2rem", color: "var(--ink-2)", lineHeight: 1.5 }}>
              Buyers can't checkout from your store until you configure at least one delivery method — pickup, self-delivery, or courier.
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0 }}
            onClick={() => {
              setTab("Settings");
              setTimeout(() => deliveryCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
            }}
          >
            <i className="fas fa-gear" style={{ marginRight: 6 }} />Set up delivery
          </button>
        </div>
      )}

      {/* ── Dashboard Home ── */}
      {tab === "Home" && (
        <>
          <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 4px" }}>Welcome to your seller dashboard</h2>
              <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "1.3rem" }}>Here's an overview of your store performance.</p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => loadDashboard(true)}
              disabled={refreshing || loading}
              title="Refresh dashboard data"
              style={{ flexShrink: 0, marginTop: 2 }}
            >
              <i className={`fas fa-rotate-right${refreshing ? " fa-spin" : ""}`} />
              {refreshing ? " Refreshing…" : " Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="kpi-grid">
              {[1,2,3,4].map(i => (
                <div key={i} className="kpi-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Skel w={40} h={40} r={12} />
                  <Skel w="55%" h={22} r={6} />
                  <Skel w="70%" h={12} r={4} />
                </div>
              ))}
            </div>
          ) : (
            <div className="kpi-grid">
              {[
                { label: "Total Revenue",       value: naira(kpis?.totalRevenue || 0),                             icon: "naira-sign",    color: "#22c55e" },
                { label: "Orders (Last 7 Days)", value: ordersLast7.length,                                          icon: "box-archive",   color: "var(--accent)" },
                { label: "Product Views",        value: (kpis?.productViews || productViews).toLocaleString(),       icon: "eye",           color: "#3b82f6" },
                { label: "Inventory Value",      value: naira(kpis?.inventoryValue || inventoryValue),               icon: "boxes-stacked", color: "#7c3aed" },
              ].map((k) => (
                <div key={k.label} className="kpi-card">
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${k.color}1a`, color: k.color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", marginBottom: 10 }}>
                    <i className={`fas fa-${k.icon}`} />
                  </div>
                  <div style={{ fontSize: "2.2rem", fontWeight: 800, lineHeight: 1 }}>{k.value}</div>
                  <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", marginTop: 4 }}>{k.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Orders */}
          <div className="card" style={{ marginBottom: 20, overflow: "hidden", padding: 0 }}>
            <div style={{ padding: "16px 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>Recent Orders</h3>
              <span style={{ fontSize: "1.2rem", color: "var(--accent)", cursor: "pointer", fontWeight: 600 }} onClick={() => setTab("Orders")}>See all</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              {orders.length === 0 && !loading ? (
                <p style={{ textAlign: "center", color: "var(--ink-3)", padding: "28px 0", margin: 0 }}>No orders yet</p>
              ) : (
                <table className="dash-table">
                  <thead><tr><th>Order ID</th><th>Buyer</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o._id || o.id}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "1.15rem", color: "var(--ink-2)" }}>{(o._id || o.id || "").toString().slice(-10)}</td>
                        <td style={{ fontWeight: 600 }}>{o.buyer?.name || "Buyer"}</td>
                        <td>{(o.items || []).length}</td>
                        <td style={{ fontWeight: 700, color: "var(--accent)" }}>{naira(o.totalAmount || o.total || 0)}</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td><button className="btn btn-sm btn-ghost" style={{ padding: "4px 12px" }} onClick={() => setTab("Orders")}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Product Performance */}
          <div className="card" style={{ marginBottom: 20, overflow: "hidden", padding: 0 }}>
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>Product Performance</h3>
            </div>
            <div style={{ overflowX: "auto" }}>
              {products.length === 0 && !loading ? (
                <p style={{ textAlign: "center", color: "var(--ink-3)", padding: "28px 0", margin: 0 }}>No products yet</p>
              ) : (
                <table className="dash-table">
                  <thead><tr><th>Product</th><th>Sold</th><th>Stock</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {products.map((p) => {
                      const perf = productPerformance.find((x) => x.productId === p._id?.toString());
                      const unitsSold = perf?.unitsSold ?? p.sold ?? 0;
                      const revenue = perf?.revenue ?? (p.price || 0) * unitsSold;
                      const variantStock = Array.isArray(p.variants) ? p.variants.reduce((s, v) => s + (v.stock || 0), 0) : 0;
                      const stock = perf?.stock ?? ((p.stock || 0) + variantStock);
                      return (
                        <tr key={p._id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--surface)", overflow: "hidden", flexShrink: 0 }}>
                                {p.images?.[0]
                                  ? <img src={typeof p.images[0] === "string" ? p.images[0] : p.images[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><i className="fas fa-box" style={{ color: "var(--ink-4)", fontSize: "1.2rem" }} /></div>}
                              </div>
                              <span style={{ fontWeight: 600, fontSize: "1.3rem" }}>{p.name}</span>
                            </div>
                          </td>
                          <td>{unitsSold}</td>
                          <td>
                            <span style={{ color: stock === 0 ? "#dc2626" : stock <= 5 ? "#d97706" : "inherit", fontWeight: stock <= 5 ? 700 : 400 }}>
                              {stock === 0 ? "Out of stock" : stock}
                              {stock > 0 && stock <= 5 && <span style={{ fontSize: "1rem", marginLeft: 4 }}>⚠</span>}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{naira(revenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Earnings */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>Earnings & Payouts</h3>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", fontWeight: 600, marginBottom: 4 }}>Available for Payout</div>
                <div style={{ fontSize: "3.2rem", fontWeight: 900, letterSpacing: "-0.04em" }}>{naira(kpis?.walletBalance || 0)}</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setTab("Payouts")}><i className="fas fa-wallet" /> Request Payout</button>
              </div>
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 10 }}>Recent Payout History</div>
                {payouts.length === 0
                  ? <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "1.3rem" }}>No payout history yet</p>
                  : payouts.slice(0, 3).map((p) => (
                    <div key={p._id || p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                      <div>
                        <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{naira(p.amount)}</div>
                        <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>{new Date(p.createdAt || Date.now()).toLocaleDateString()} · {p.bank || "Bank transfer"}</div>
                      </div>
                      <span style={{ fontSize: "1.1rem", padding: "3px 10px", borderRadius: 20, background: "#dcfce7", color: "#16a34a", fontWeight: 700 }}>{p.status || "completed"}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Listings quick-access */}
          <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: 20 }}>
            <div style={{ padding: "16px 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}><i className="fas fa-building" style={{ marginRight: 8, color: "var(--accent)" }} />Apartments & Hostels</h3>
              <span style={{ fontSize: "1.2rem", color: "var(--accent)", cursor: "pointer", fontWeight: 600 }} onClick={() => setTab("Apartments")}>Manage</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "1.3rem" }}>
                You have <strong style={{ color: "var(--ink-1)" }}>{listings.length}</strong> active {listings.length === 1 ? "listing" : "listings"}.
              </p>
              <button className="btn btn-sm" style={{ marginTop: 12, background: "rgba(249,115,22,.1)", color: "var(--accent)", border: "none" }} onClick={() => setTab("Apartments")}>
                <i className="fas fa-arrow-right" /> View all listings
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Orders tab ── */}
      {tab === "Orders" && (
        <div>
          {confirmCancel && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div className="card" style={{ maxWidth: 380, width: "100%", padding: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <i className="fas fa-triangle-exclamation" style={{ color: "#dc2626", fontSize: "2rem" }} />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "1.8rem", fontWeight: 800 }}>Cancel this order?</h3>
                <p style={{ margin: "0 0 20px", color: "var(--ink-2)", fontSize: "1.3rem", lineHeight: 1.6 }}>
                  This cannot be undone. If the buyer already paid, a refund will be automatically initiated.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-ghost btn-block" onClick={() => setConfirmCancel(null)}>Keep order</button>
                  <button className="btn btn-block" style={{ background: "#dc2626", color: "#fff", border: "none" }} disabled={!!statusUpdating[confirmCancel]} onClick={() => updateStatus(confirmCancel, "cancelled")}>
                    {statusUpdating[confirmCancel] ? <i className="fas fa-spinner fa-spin" /> : "Yes, cancel"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 16px" }}>Orders</h2>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", marginBottom: 16 }}>
            {["All", "Pending", "Confirmed", "Shipped", "Completed", "Cancelled"].map((s) => (
              <span key={s} className={`chip${orderFilter === s ? " active" : ""}`} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setOrderFilter(s)}>{s}</span>
            ))}
          </div>

          {filteredOrders.length === 0
            ? <div style={{ textAlign: "center", padding: "60px 0" }}>
                <i className="fas fa-box-archive" style={{ fontSize: "3rem", color: "var(--ink-4)", marginBottom: 12 }} />
                <p style={{ color: "var(--ink-3)", fontSize: "1.4rem" }}>No orders found</p>
              </div>
            : filteredOrders.map((o) => {
                const oid = (o._id || o.id || "").toString();
                const busy = !!statusUpdating[oid];
                const status = o.status || "pending";
                const isDone = status === "completed" || status === "cancelled";

                const dm = o.deliveryMethod || "pickup";
                const SHIPPED_LABEL = dm === "pickup" ? "Ready for Pickup" : dm === "self" ? "Out for Delivery" : null; // null = Shipbubble handles its own button
                const NEXT_ACTION = {
                  pending:   { label: "Confirm Order", newStatus: "confirmed", color: "var(--accent)" },
                  confirmed: SHIPPED_LABEL ? { label: SHIPPED_LABEL, newStatus: "shipped", color: "#3b82f6" } : null,
                  // shipped → completion handled via delivery code input above
                };
                const next = NEXT_ACTION[status];

                return (
                  <div key={oid} className="card" style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", color: "var(--ink-3)" }}>#{oid.slice(-10)}</div>
                        <div style={{ fontWeight: 700, fontSize: "1.4rem", marginTop: 2 }}>{o.buyer?.name || "Buyer"}</div>
                        <div style={{ fontSize: "1.15rem", color: "var(--ink-3)", marginTop: 1 }}>{new Date(o.createdAt || Date.now()).toLocaleDateString()}</div>
                        <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 99, fontSize: "1.1rem", fontWeight: 600,
                          background: dm === "pickup" ? "rgba(249,115,22,.1)" : dm === "self" ? "rgba(59,130,246,.1)" : "rgba(139,92,246,.1)",
                          color: dm === "pickup" ? "var(--accent)" : dm === "self" ? "#3b82f6" : "#8b5cf6",
                        }}>
                          <i className={`fas ${dm === "pickup" ? "fa-person-walking" : dm === "self" ? "fa-bicycle" : "fa-truck"}`} />
                          {dm === "pickup" ? "Self Pickup" : dm === "self" ? "Seller Delivery" : "Courier"}
                          {o.deliveryFee > 0 && <span style={{ opacity: .7 }}>· {naira(o.deliveryFee)}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--accent)" }}>{naira(o.totalAmount || o.total || 0)}</div>
                        <StatusBadge status={status} />
                      </div>
                    </div>

                    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                      {(o.items || []).map((it, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1.3rem", padding: "4px 0" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {it.status === "completed"
                              ? <i className="fas fa-circle-check" style={{ color: "#16a34a", fontSize: "1.1rem" }} />
                              : <i className="fas fa-circle" style={{ color: "var(--ink-4)", fontSize: "1.1rem" }} />}
                            {it.product?.name || it.name || "Item"} <span style={{ color: "var(--ink-3)" }}>×{it.quantity || 1}</span>
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 600 }}>{naira((it.price || 0) * (it.quantity || 1))}</span>
                            {it.status === "completed" && <span style={{ fontSize: "1.05rem", color: "#16a34a", fontWeight: 600 }}>Delivered</span>}
                          </span>
                        </div>
                      ))}

                      {/* Delivery context — shown per method */}
                      {dm === "pickup" && !isDone && (
                        <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(249,115,22,.07)", border: "1px solid rgba(249,115,22,.2)", borderRadius: "var(--r-md)", fontSize: "1.2rem", color: "var(--ink-2)" }}>
                          <i className="fas fa-person-walking" style={{ color: "var(--accent)", marginRight: 6 }} />
                          Buyer will come to you — have the order ready for collection.
                          {o.buyer?.phone && <div style={{ marginTop: 3, color: "var(--ink-3)" }}>Contact: {o.buyer.phone}</div>}
                        </div>
                      )}
                      {dm === "self" && (o.shippingAddress?.address || o.shippingAddress?.city) && !isDone && (
                        <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(59,130,246,.07)", border: "1px solid rgba(59,130,246,.2)", borderRadius: "var(--r-md)", fontSize: "1.2rem", color: "var(--ink-2)" }}>
                          <i className="fas fa-location-dot" style={{ color: "#3b82f6", marginRight: 6 }} />
                          <strong>Deliver to:</strong>{" "}
                          {[o.shippingAddress.address, o.shippingAddress.city, o.shippingAddress.state].filter(Boolean).join(", ")}
                          {o.buyer?.phone && <div style={{ marginTop: 3, color: "var(--ink-3)" }}>Buyer contact: {o.buyer.phone}</div>}
                        </div>
                      )}
                      {dm === "shipbubble" && (o.shippingAddress?.address || o.shippingAddress?.city) && !isDone && (
                        <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(139,92,246,.07)", border: "1px solid rgba(139,92,246,.2)", borderRadius: "var(--r-md)", fontSize: "1.2rem", color: "var(--ink-2)" }}>
                          <i className="fas fa-truck" style={{ color: "#8b5cf6", marginRight: 6 }} />
                          <strong>Courier delivers to:</strong>{" "}
                          {[o.shippingAddress.address, o.shippingAddress.city, o.shippingAddress.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>

                    {!isDone && o.paymentStatus === "paid" && status !== "shipped" && (
                      <div style={{ padding: "10px 16px", background: "rgba(59,130,246,.06)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, fontSize: "1.2rem", color: "#1d4ed8" }}>
                        <i className="fas fa-lock" /> Funds held in UMP escrow — released when delivery is confirmed
                      </div>
                    )}

                    {/* Shipbubble courier booking — shown for shipbubble orders confirmed but not yet shipped */}
                    {o.deliveryMethod === "shipbubble" && status === "confirmed" && o.paymentStatus === "paid" && (
                      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", background: "rgba(139,92,246,.04)" }}>
                        {o.shipbubble?.shipmentId ? (
                          <div style={{ fontSize: "1.25rem" }}>
                            <i className="fas fa-truck" style={{ color: "#8b5cf6", marginRight: 8 }} />
                            Courier booked
                            {o.shipbubble.courierName && <> · <strong>{o.shipbubble.courierName}</strong></>}
                            {o.shipbubble.trackingNumber && <> · Tracking: <strong>{o.shipbubble.trackingNumber}</strong></>}
                            {o.shipbubble.trackingUrl && (
                              <a href={o.shipbubble.trackingUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: "#8b5cf6", fontSize: "1.15rem" }}>
                                <i className="fas fa-arrow-up-right-from-square" /> Track
                              </a>
                            )}
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 6 }}>
                              <i className="fas fa-truck" style={{ marginRight: 6, color: "#8b5cf6" }} />Ready to ship?
                            </div>
                            <div style={{ fontSize: "1.15rem", color: "var(--ink-3)", marginBottom: 10 }}>
                              Pack the order, then book a courier pickup. The courier will collect from your address.
                            </div>
                            <button
                              className="btn btn-sm"
                              style={{ background: "#8b5cf6", color: "#fff", border: "none" }}
                              disabled={deliverySubmitting[oid]}
                              onClick={async () => {
                                setDeliverySubmitting((s) => ({ ...s, [oid]: true }));
                                try {
                                  const d = await apiFetch(`/api/delivery/book/${oid}`, { method: "POST" });
                                  setOrders((prev) => prev.map((ord) =>
                                    (ord._id || ord.id) === oid
                                      ? { ...ord, status: "shipped", shipbubble: d.shipbubble }
                                      : ord
                                  ));
                                  showToast(`Courier booked! Tracking: ${d.shipbubble?.trackingNumber || "—"}`, "success");
                                } catch (err) {
                                  showToast(err?.message || "Failed to book courier", "error");
                                } finally {
                                  setDeliverySubmitting((s) => { const n = { ...s }; delete n[oid]; return n; });
                                }
                              }}
                            >
                              {deliverySubmitting[oid] ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-truck" /> Book Courier Pickup</>}
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Delivery code input — shown when shipped or partially delivered */}
                    {(status === "shipped" || status === "partial") && (
                      <div style={{ padding: "14px 16px", background: "rgba(99,102,241,.06)", borderBottom: "1px solid var(--line)" }}>
                        {status === "partial" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(234,179,8,.1)", border: "1px solid rgba(234,179,8,.3)", borderRadius: "var(--r-md)", padding: "8px 12px", marginBottom: 10, fontSize: "1.2rem", color: "#92400e" }}>
                            <i className="fas fa-box-open" />
                            Partial delivery in progress — {(o.items || []).filter(it => it.status === "completed").length} of {(o.items || []).length} items delivered. Enter buyer's new code for remaining items.
                          </div>
                        )}
                        {o.paymentStatus !== "paid" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.35)", borderRadius: "var(--r-md)", padding: "8px 12px", marginBottom: 10, fontSize: "1.15rem", color: "#92400e" }}>
                            <i className="fas fa-triangle-exclamation" /> Payment not yet confirmed — delivery confirmation will only succeed once the buyer's payment clears.
                          </div>
                        )}
                        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#4f46e5", marginBottom: 8 }}>
                          <i className="fas fa-key" style={{ marginRight: 6 }} />
                          {status === "partial" ? "Confirm remaining items" : "Confirm delivery — enter the buyer's code"}
                        </div>
                        <div style={{ fontSize: "1.15rem", color: "var(--ink-3)", marginBottom: 10 }}>
                          Ask the buyer for their delivery code. Enter it below to release payment.
                        </div>

                        {/* Partial delivery toggle — only show if multiple undelivered items */}
                        {(() => {
                          const pendingItems = (o.items || []).filter(it => it.status !== "completed");
                          const isPartialOn = !!partialMode[oid];
                          if (pendingItems.length < 2) return null;
                          return (
                            <div style={{ marginBottom: 12 }}>
                              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "1.2rem", color: "var(--ink-2)", userSelect: "none" }}>
                                <input
                                  type="checkbox"
                                  checked={isPartialOn}
                                  onChange={(e) => {
                                    const on = e.target.checked;
                                    setPartialMode((m) => ({ ...m, [oid]: on }));
                                    if (on) {
                                      setPartialSelected((s) => ({ ...s, [oid]: new Set() }));
                                    } else {
                                      setPartialSelected((s) => { const n = { ...s }; delete n[oid]; return n; });
                                    }
                                  }}
                                />
                                Not delivering all items today (partial delivery)
                              </label>
                              {isPartialOn && (
                                <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--surface)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
                                  <div style={{ fontSize: "1.15rem", color: "var(--ink-3)", marginBottom: 8 }}>Select items being delivered now:</div>
                                  {pendingItems.map((it) => {
                                    const sel = partialSelected[oid] || new Set();
                                    const checked = sel.has(it._id);
                                    return (
                                      <label key={it._id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "1.25rem", padding: "4px 0" }}>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => {
                                            setPartialSelected((s) => {
                                              const prev = new Set(s[oid] || pendingItems.map(x => x._id));
                                              if (checked) prev.delete(it._id); else prev.add(it._id);
                                              return { ...s, [oid]: prev };
                                            });
                                          }}
                                        />
                                        {it.product?.name || "Item"} ×{it.quantity || 1}
                                        <span style={{ marginLeft: "auto", color: "var(--ink-3)" }}>{naira((it.price || 0) * (it.quantity || 1))}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--r-md)", border: "2px solid #6366f1", background: "#1e1b4b", color: "#fff", fontSize: "1.6rem", fontFamily: "monospace", fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", opacity: o.paymentStatus !== "paid" ? 0.5 : 1 }}
                            placeholder="A1B2C3"
                            maxLength={10}
                            disabled={o.paymentStatus !== "paid"}
                            value={deliveryCodes[oid] || ""}
                            onChange={(e) => setDeliveryCodes((c) => ({ ...c, [oid]: e.target.value.toUpperCase() }))}
                            onKeyDown={(e) => { if (e.key === "Enter") confirmDeliveryByCode(oid); }}
                          />
                          <button
                            className="btn btn-sm"
                            style={{ background: "#4f46e5", color: "#fff", border: "none", flexShrink: 0 }}
                            disabled={deliverySubmitting[oid] || !deliveryCodes[oid] || o.paymentStatus !== "paid"}
                            onClick={() => confirmDeliveryByCode(oid)}
                          >
                            {deliverySubmitting[oid] ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> Confirm</>}
                          </button>
                        </div>
                      </div>
                    )}
                    {status === "cancelled" && o.refund?.status === "requested" && (
                      <div style={{ padding: "10px 16px", background: "rgba(239,68,68,.06)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, fontSize: "1.2rem", color: "#dc2626" }}>
                        <i className="fas fa-rotate-left" /> Refund of {naira(o.refund.amount)} initiated for buyer
                      </div>
                    )}
                    {status === "completed" && (
                      <div style={{ padding: "10px 16px", background: "rgba(34,197,94,.06)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8, fontSize: "1.2rem", color: "#16a34a" }}>
                        <i className="fas fa-wallet" /> {naira(Math.floor((o.totalAmount || 0) * 0.95))} added to your wallet <span style={{ opacity: 0.7, fontWeight: 400 }}>(after 5% UMP fee)</span>
                      </div>
                    )}

                    {!isDone && (
                      <div style={{ padding: "12px 16px", display: "flex", gap: 8 }}>
                        {next && (
                          <button className="btn btn-sm" style={{ background: next.color, color: "#fff", border: "none", flex: 1 }} disabled={busy} onClick={() => updateStatus(oid, next.newStatus)}>
                            {busy && statusUpdating[oid] === next.newStatus ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> {next.label}</>}
                          </button>
                        )}
                        <button className="btn btn-sm btn-ghost" style={{ color: "#dc2626", border: "1px solid #dc2626" }} disabled={busy} onClick={() => setConfirmCancel(oid)}>
                          <i className="fas fa-xmark" /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
        </div>
      )}

      {/* ── Products tab ── */}
      {tab === "Products" && (
        <div>
          {/* Delete confirmation modal */}
          {deleteProductId && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div className="card" style={{ maxWidth: 360, width: "100%", padding: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <i className="fas fa-trash" style={{ color: "#dc2626", fontSize: "1.8rem" }} />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "1.7rem", fontWeight: 800 }}>Delete this product?</h3>
                <p style={{ margin: "0 0 20px", color: "var(--ink-2)", fontSize: "1.3rem" }}>This action cannot be undone.</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-ghost btn-block" onClick={() => setDeleteProductId(null)}>Cancel</button>
                  <button className="btn btn-block" style={{ background: "#dc2626", color: "#fff", border: "none" }} disabled={productDeleting} onClick={() => handleDeleteProduct(deleteProductId)}>
                    {productDeleting ? <i className="fas fa-spinner fa-spin" /> : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {quickEdit && <QuickEditModal product={quickEdit} onClose={() => setQuickEdit(null)} showToast={showToast} onSave={(updated) => { setProducts((p) => p.map((x) => x._id === updated._id ? { ...x, ...updated } : x)); setQuickEdit(null); }} />}
          {addProductOpen && <AddProductModal onClose={() => setAddProductOpen(false)} showToast={showToast} onSave={(product) => { if (product) setProducts((p) => [product, ...p]); setAddProductOpen(false); }} />}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>Products</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setAddProductOpen(true)}><i className="fas fa-plus" /> Add product</button>
          </div>

          {products.length === 0 && !loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <i className="fas fa-boxes-stacked" style={{ fontSize: "3.2rem", color: "var(--ink-4)", marginBottom: 16 }} />
              <p style={{ color: "var(--ink-2)", fontSize: "1.4rem", marginBottom: 12 }}>No products listed yet.</p>
              <button className="btn btn-primary" onClick={() => setAddProductOpen(true)}><i className="fas fa-plus" /> Add your first product</button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="dash-table">
                  <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Views</th><th>Actions</th></tr></thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--surface)", overflow: "hidden", flexShrink: 0 }}>
                              {p.images?.[0]
                                ? <img src={typeof p.images[0] === "string" ? p.images[0] : p.images[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><i className="fas fa-box" style={{ color: "var(--ink-4)" }} /></div>}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "1.3rem" }}>{p.name}</div>
                              <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>{p.category?.name || p.condition || ""}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--accent)" }}>{naira(p.price)}</td>
                        <td><span style={{ fontWeight: p.stock <= 5 ? 700 : 400, color: p.stock <= 5 ? "#dc2626" : "inherit" }}>{p.stock ?? "—"}</span></td>
                        <td>{p.views || 0}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-sm btn-ghost" style={{ padding: "4px 10px" }} title="Quick Edit" onClick={() => setQuickEdit(p)}>
                              <i className="fas fa-pen" />
                            </button>
                            <button className="btn btn-sm" style={{ padding: "4px 10px", color: "#dc2626", border: "1px solid #dc2626", background: "transparent" }} title="Delete" onClick={() => setDeleteProductId(p._id)}>
                              <i className="fas fa-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Apartments tab ── */}
      {tab === "Apartments" && (
        <div>
          {listingModal && (
            <ListingModal
              listing={listingModal === "new" ? null : listingModal}
              onClose={() => setListingModal(null)}
              onSave={handleListingSaved}
              showToast={showToast}
            />
          )}

          {/* Delete listing confirm */}
          {deleteListingId && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div className="card" style={{ maxWidth: 360, width: "100%", padding: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <i className="fas fa-trash" style={{ color: "#dc2626", fontSize: "1.8rem" }} />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: "1.7rem", fontWeight: 800 }}>Delete this listing?</h3>
                <p style={{ margin: "0 0 20px", color: "var(--ink-2)", fontSize: "1.3rem" }}>This cannot be undone.</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-ghost btn-block" onClick={() => setDeleteListingId(null)}>Cancel</button>
                  <button className="btn btn-block" style={{ background: "#dc2626", color: "#fff", border: "none" }} disabled={listingDeleting} onClick={() => handleDeleteListing(deleteListingId)}>
                    {listingDeleting ? <i className="fas fa-spinner fa-spin" /> : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 4px" }}>Apartments</h2>
              <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "1.3rem" }}>Manage your hostel and apartment listings.</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setListingModal("new")}><i className="fas fa-plus" /> Add listing</button>
          </div>

          {listingsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[1, 2, 3].map((i) => <Skel.HostelCard key={i} />)}
            </div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <i className="fas fa-building" style={{ fontSize: "3.2rem", color: "var(--ink-4)", marginBottom: 16 }} />
              <p style={{ color: "var(--ink-2)", fontSize: "1.4rem", marginBottom: 12 }}>No listings yet.</p>
              <button className="btn btn-primary" onClick={() => setListingModal("new")}><i className="fas fa-plus" /> Add your first listing</button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="dash-table">
                  <thead>
                    <tr><th>Property</th><th>Type</th><th>Price</th><th>Beds/Baths</th><th>Available</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => (
                      <tr key={l._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--surface)", overflow: "hidden", flexShrink: 0 }}>
                              {l.images?.[0]?.url
                                ? <img src={l.images[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><i className="fas fa-building" style={{ color: "var(--ink-4)" }} /></div>}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "1.3rem" }}>{l.name}</div>
                              <div style={{ fontSize: "1.1rem", color: "var(--ink-3)" }}>{l.location || ""}</div>
                            </div>
                          </div>
                        </td>
                        <td><span style={{ fontSize: "1.1rem", padding: "3px 8px", borderRadius: 20, background: "var(--surface)", border: "1px solid var(--line)" }}>{l.type || "—"}</span></td>
                        <td style={{ fontWeight: 700, color: "var(--accent)" }}>{naira(l.price)}<span style={{ fontWeight: 400, fontSize: "1.1rem", color: "var(--ink-3)" }}> {l.rate || ""}</span></td>
                        <td>{l.beds || 0} {l.type === "Hostel" ? (l.beds === 1 ? "man/room" : "men/room") : (l.beds === 1 ? "bed" : "beds")} · {l.baths || 0} {l.baths === 1 ? "bath" : "baths"}</td>
                        <td>
                          <span style={{ fontSize: "1.1rem", padding: "3px 8px", borderRadius: 20, background: l.available ? "#dcfce7" : "#fee2e2", color: l.available ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                            {l.available ? "Yes" : "No"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-sm btn-ghost" style={{ padding: "4px 10px" }} onClick={() => setListingModal(l)}>
                              <i className="fas fa-pen" />
                            </button>
                            <button className="btn btn-sm" style={{ padding: "4px 10px", color: "#dc2626", border: "1px solid #dc2626", background: "transparent" }} onClick={() => setDeleteListingId(l._id)}>
                              <i className="fas fa-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Payouts tab ── */}
      {tab === "Payouts" && (
        <div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 20px" }}>Payouts</h2>

          {/* Balance card */}
          <div style={{ background: "linear-gradient(135deg, var(--navy-800), #1e1b4b)", color: "#fff", borderRadius: "var(--r-xl)", padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: "1.2rem", opacity: 0.6, marginBottom: 4 }}>Available for Payout</div>
            <div style={{ fontSize: "3.6rem", fontWeight: 900, letterSpacing: "-0.04em" }}>{naira(kpis?.walletBalance || 0)}</div>
            <div style={{ fontSize: "1.2rem", opacity: 0.5, marginTop: 4 }}>Minimum payout: ₦100 · Processed in 1–2 business days</div>
          </div>

          {/* Bank Account & Request Payout side-by-side on desktop */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 20 }}>
            {/* Bank account */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "1.6rem", fontWeight: 700 }}><i className="fas fa-university" style={{ marginRight: 8, color: "var(--accent)" }} />Bank Account</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={lSty}>Bank</label>
                <select
                  style={iSty}
                  value={bankForm.bankCode}
                  onChange={(e) => {
                    const selected = banks.find((b) => b.code === e.target.value);
                    setBankForm((f) => ({ ...f, bankCode: e.target.value, bankName: selected?.name || "", accountName: "" }));
                  }}
                >
                  <option value="">— Select bank —</option>
                  {banks.map((b, i) => <option key={`${b.code}-${i}`} value={b.code}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lSty}>Account Number</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...iSty, flex: 1 }}
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value, accountName: "" }))}
                    placeholder="10-digit account number"
                    maxLength={10}
                  />
                  <button
                    className="btn btn-sm btn-ghost"
                    style={{ flexShrink: 0 }}
                    disabled={bankVerifying || !bankForm.accountNumber || !bankForm.bankCode}
                    onClick={verifyAccount}
                  >
                    {bankVerifying ? <i className="fas fa-spinner fa-spin" /> : "Verify"}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lSty}>Account Name</label>
                <input
                  style={{ ...iSty, background: bankForm.accountName ? "rgba(34,197,94,.07)" : undefined, color: bankForm.accountName ? "#16a34a" : undefined, fontWeight: bankForm.accountName ? 700 : 400 }}
                  value={bankForm.accountName}
                  readOnly
                  placeholder="Will be auto-filled after verification"
                />
              </div>
              {!bankForm.accountName && (
                <p style={{ margin: "0 0 12px", fontSize: "1.15rem", color: "var(--ink-3)" }}>
                  <i className="fas fa-circle-info" style={{ marginRight: 5 }} />Enter your account number and click Verify to confirm your account name.
                </p>
              )}
              <button className="btn btn-primary btn-sm" disabled={bankSaving || !bankForm.accountName} onClick={saveBankDetails} style={{ width: "100%" }}>
                {bankSaving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save" /> Save Bank Details</>}
              </button>
            </div>

            {/* Request payout */}
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "1.6rem", fontWeight: 700 }}><i className="fas fa-paper-plane" style={{ marginRight: 8, color: "var(--accent)" }} />Request Payout</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={lSty}>Amount (₦)</label>
                <input style={iSty} type="number" min="100" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder="Enter amount (min ₦100)" />
              </div>
              <div style={{ padding: 12, borderRadius: "var(--r-md)", background: "var(--surface)", marginBottom: 16, fontSize: "1.2rem", color: "var(--ink-3)" }}>
                <div><strong style={{ color: "var(--ink-1)" }}>To:</strong> {bankForm.accountName || "—"}</div>
                <div><strong style={{ color: "var(--ink-1)" }}>Bank:</strong> {bankForm.bankName || "—"} {bankForm.accountNumber ? `· ${bankForm.accountNumber}` : ""}</div>
              </div>
              <button className="btn btn-primary btn-sm" disabled={payoutSaving || !bankForm.bankName} onClick={requestPayout} style={{ width: "100%" }}>
                {payoutSaving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-paper-plane" /> Request Payout Now</>}
              </button>
              {!bankForm.accountName && <p style={{ margin: "8px 0 0", fontSize: "1.15rem", color: "var(--ink-3)", textAlign: "center" }}>Add and verify bank details first</p>}
            </div>
          </div>

          {/* Payout history */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700 }}>Payout History</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...iSty, width: 160 }} placeholder="Search..." value={payoutSearch} onChange={(e) => setPayoutSearch(e.target.value)} />
                <select style={{ ...iSty, width: 130 }} value={payoutFilterStatus} onChange={(e) => setPayoutFilterStatus(e.target.value)}>
                  {["All", "Pending", "Completed", "Failed"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {filteredPayouts.length === 0
              ? <p style={{ textAlign: "center", color: "var(--ink-3)", padding: "40px 0", margin: 0 }}>No payout history yet</p>
              : <div style={{ overflowX: "auto" }}>
                  <table className="dash-table">
                    <thead><tr><th>Amount</th><th>Bank</th><th>Date</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {filteredPayouts.map((p) => (
                        <tr key={p._id || p.id}>
                          <td style={{ fontWeight: 800, fontSize: "1.4rem" }}>{naira(p.amount)}</td>
                          <td style={{ fontSize: "1.2rem", color: "var(--ink-2)" }}>{p.accountDetails?.bankName || p.bank || "Bank transfer"}</td>
                          <td style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}>{new Date(p.createdAt || Date.now()).toLocaleDateString()}</td>
                          <td>
                            <span style={{
                              fontSize: "1.1rem", padding: "3px 10px", borderRadius: 20, fontWeight: 700,
                              background: p.status === "completed" ? "#dcfce7" : p.status === "failed" ? "#fee2e2" : p.status === "processing" ? "#dbeafe" : "#fef3c7",
                              color: p.status === "completed" ? "#16a34a" : p.status === "failed" ? "#dc2626" : p.status === "processing" ? "#1d4ed8" : "#d97706",
                            }}>{p.status || "pending"}</span>
                          </td>
                          <td>
                            {p.status === "pending" && (
                              <button
                                className="btn btn-sm btn-primary"
                                style={{ padding: "4px 12px", fontSize: "1.1rem" }}
                                disabled={!!retryingPayout[p._id]}
                                onClick={() => handleRetryPayout(p._id)}
                              >
                                {retryingPayout[p._id] ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-rotate-right" /> Retry</>}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>}
          </div>
        </div>
      )}

      {/* ── Promote tab ── */}
      {tab === "Promote" && (
        <div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 4px" }}>Promote a Product</h2>
          <p style={{ margin: "0 0 24px", color: "var(--ink-3)", fontSize: "1.3rem" }}>
            Advertised products appear in the featured slider on the homepage and get a "Sale" badge boost.
          </p>

          {/* Plan picker */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
            {adPlans.map((p) => (
              <button
                key={p.key}
                onClick={() => setAdPlan(p.key)}
                style={{
                  padding: "16px 12px", borderRadius: "var(--r-lg)", border: `2px solid ${adPlan === p.key ? "var(--accent)" : "var(--line)"}`,
                  background: adPlan === p.key ? "rgba(249,115,22,.06)" : "var(--white)",
                  cursor: "pointer", textAlign: "left", transition: "border-color .15s",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "1.5rem", color: adPlan === p.key ? "var(--accent)" : "var(--ink-1)" }}>{p.label}</div>
                <div style={{ fontSize: "1.2rem", color: "var(--ink-3)", margin: "2px 0 8px" }}>{p.days} days · {AD_PLAN_DESCS[p.key] || ""}</div>
                <div style={{ fontSize: "1.7rem", fontWeight: 900, color: adPlan === p.key ? "var(--accent)" : "var(--ink-1)" }}>
                  ₦{p.price.toLocaleString()}
                </div>
              </button>
            ))}
          </div>

          {/* Product selector */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: "1.3rem", fontWeight: 700, marginBottom: 8 }}>
              Select product to promote
            </label>
            <select
              className="input"
              value={adProductId}
              onChange={(e) => setAdProductId(e.target.value)}
              style={{ marginBottom: 16 }}
            >
              <option value="">— choose a product —</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} {p.isAdvertised ? "⚡ (currently promoted)" : ""}
                </option>
              ))}
            </select>

            <div style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,.06)", border: "1px solid rgba(59,130,246,.2)", fontSize: "1.2rem", color: "#1d4ed8", marginBottom: 16 }}>
              <i className="fas fa-circle-info" style={{ marginRight: 6 }} />
              Payment is processed securely via Paystack. Your ad goes live immediately after payment.
            </div>

            <button
              className="btn btn-primary"
              onClick={startAdCampaign}
              disabled={adLoading || !adProductId}
            >
              {adLoading
                ? <><i className="fas fa-spinner fa-spin" /> Processing…</>
                : <><i className="fas fa-rocket" /> Pay ₦{(adPlans.find(p => p.key === adPlan)?.price || 0).toLocaleString()} &amp; Launch Ad</>}
            </button>
          </div>

          {/* Campaign history */}
          <h3 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 12px" }}>My Campaigns</h3>
          {adCampaigns.length === 0 ? (
            <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: "1.3rem" }}>
              No campaigns yet. Promote your first product above!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {adCampaigns.map((c) => {
                const statusColor = { active: "#16a34a", expired: "#6b7280", cancelled: "#dc2626", pending_payment: "#d97706" }[c.status] || "#6b7280";
                return (
                  <div key={c._id} className="card" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1.3rem" }}>{c.product?.name || "Product"}</div>
                      <div style={{ fontSize: "1.15rem", color: "var(--ink-3)", marginTop: 2 }}>
                        {adPlans.find(p => p.key === c.plan)?.label || c.plan}
                        {c.endsAt && ` · ends ${new Date(c.endsAt).toLocaleDateString("en-NG")}`}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111" }}>₦{c.amount?.toLocaleString()}</span>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: "1.1rem", fontWeight: 700, background: `${statusColor}18`, color: statusColor }}>
                        {c.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Settings tab ── */}
      {tab === "Settings" && (
        <div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 20px" }}>Dashboard Settings</h2>

          {/* Change Password */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.6rem", fontWeight: 700 }}><i className="fas fa-lock" style={{ marginRight: 8, color: "var(--accent)" }} />Change Password</h3>
            {[
              { id: "old",     label: "Current Password",   val: dashPwd.old,     ph: "Current password" },
              { id: "new",     label: "New Password",        val: dashPwd.new,     ph: "New password" },
              { id: "confirm", label: "Confirm New Password",val: dashPwd.confirm, ph: "Repeat new password" },
            ].map(({ id, label, val, ph }) => (
              <div key={id} style={{ marginBottom: id === "new" ? 4 : 12 }}>
                <label style={lSty}>{label}</label>
                <div style={{ position: "relative" }}>
                  <input
                    style={{ ...iSty, paddingRight: 44 }}
                    type={pwdShow[id] ? "text" : "password"}
                    value={val}
                    onChange={(e) => setDashPwd((p) => ({ ...p, [id]: e.target.value }))}
                    placeholder={ph}
                  />
                  <button
                    type="button"
                    onClick={() => setPwdShow((s) => ({ ...s, [id]: !s[id] }))}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "var(--ink-3)", fontSize: "1.4rem", padding: 0 }}
                  >
                    <i className={`fas fa-eye${pwdShow[id] ? "-slash" : ""}`} />
                  </button>
                </div>
                {id === "new" && <StrengthMeter password={val} />}
                {id === "confirm" && val && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "1.2rem", marginTop: 4, color: dashPwd.new === val ? "#16a34a" : "#ef4444" }}>
                    <i className={`fas fa-circle-${dashPwd.new === val ? "check" : "xmark"}`} />
                    {dashPwd.new === val ? "Passwords match" : "Passwords don't match"}
                  </div>
                )}
              </div>
            ))}
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} disabled={pwdSaving} onClick={changePassword}>
              {pwdSaving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save" /> Update Password</>}
            </button>
          </div>

          {/* Store Profile */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.6rem", fontWeight: 700 }}><i className="fas fa-store" style={{ marginRight: 8, color: "var(--accent)" }} />Store Profile</h3>

            {/* Store Avatar / Logo */}
            <label style={lSty}>Store Logo / Profile Image</label>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--surface)", border: "2px solid var(--line)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {storeAvatarUploading
                  ? <i className="fas fa-spinner fa-spin" style={{ color: "var(--accent)", fontSize: "1.6rem" }} />
                  : dashStore.avatarUrl
                  ? <img src={dashStore.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <i className="fas fa-store" style={{ color: "var(--ink-4)", fontSize: "2rem" }} />}
              </div>
              <div>
                <label className="btn btn-sm btn-ghost" style={{ cursor: "pointer" }}>
                  <i className="fas fa-camera" /> {dashStore.avatarUrl ? "Change" : "Upload"} logo
                  <input type="file" accept="image/*" style={{ display: "none" }} disabled={storeAvatarUploading} onChange={(e) => { openStoreCrop(e.target.files[0], "avatar"); e.target.value = ""; }} />
                </label>
                <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 4 }}>JPG or PNG, max 5 MB</div>
              </div>
            </div>

            {/* Store Banner */}
            <label style={lSty}>Store Banner</label>
            <div style={{ marginBottom: 16 }}>
              <div style={{ width: "100%", height: 100, borderRadius: "var(--r-md)", background: "var(--surface)", border: "2px dashed var(--line)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginBottom: 8 }}>
                {storeBannerUploading
                  ? <i className="fas fa-spinner fa-spin" style={{ color: "var(--accent)", fontSize: "2rem" }} />
                  : dashStore.bannerUrl
                  ? <img src={dashStore.bannerUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ textAlign: "center", color: "var(--ink-4)" }}><i className="fas fa-image" style={{ fontSize: "2rem", display: "block", marginBottom: 4 }} /><span style={{ fontSize: "1.2rem" }}>No banner yet</span></div>}
              </div>
              <label className="btn btn-sm btn-ghost" style={{ cursor: "pointer" }}>
                <i className="fas fa-upload" /> {dashStore.bannerUrl ? "Change" : "Upload"} banner
                <input type="file" accept="image/*" style={{ display: "none" }} disabled={storeBannerUploading} onChange={(e) => { openStoreCrop(e.target.files[0], "banner"); e.target.value = ""; }} />
              </label>
              <div style={{ fontSize: "1.1rem", color: "var(--ink-3)", marginTop: 4 }}>Recommended: 1200 × 300 px</div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lSty}>Store Name</label>
              <input style={iSty} value={dashStore.storeName} onChange={(e) => setDashStore((s) => ({ ...s, storeName: e.target.value }))} placeholder="Your store name" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lSty}>Store Description</label>
              <textarea style={{ ...iSty, height: 80, resize: "vertical" }} value={dashStore.desc} onChange={(e) => setDashStore((s) => ({ ...s, desc: e.target.value }))} placeholder="Tell buyers about your store..." />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lSty}>Store / Pickup Address</label>
              <input style={iSty} value={dashStore.address} onChange={(e) => setDashStore((s) => ({ ...s, address: e.target.value }))} placeholder="e.g. Block C Shop 12, Moremi Road, UNILAG" />
              <div style={{ marginTop: 6, padding: "8px 10px", background: "rgba(249,115,22,.07)", border: "1px solid rgba(249,115,22,.22)", borderRadius: "var(--r-md)", display: "flex", gap: 7, alignItems: "flex-start" }}>
                <i className="fas fa-circle-info" style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1, fontSize: "1rem" }} />
                <span style={{ fontSize: "1.1rem", color: "var(--ink-2)", lineHeight: 1.5 }}>
                  Use your <strong>actual pickup address</strong> — buyers who choose self-pickup will see this and use it to collect their orders.
                </span>
              </div>
            </div>
            <button className="btn btn-primary btn-sm" disabled={storeSaving || storeAvatarUploading || storeBannerUploading} onClick={saveStoreProfile}>
              {storeSaving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save" /> Save Store Profile</>}
            </button>
          </div>

          {/* Delivery Configuration */}
          <div ref={deliveryCardRef} className="card" style={{ padding: 20, marginBottom: 16, scrollMarginTop: 16, outline: !deliveryConfigured ? "2px solid var(--accent)" : "none", outlineOffset: 2 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "1.6rem", fontWeight: 700 }}><i className="fas fa-truck" style={{ marginRight: 8, color: "var(--accent)" }} />Delivery Options</h3>
            {!deliveryConfigured && (
              <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(249,115,22,.08)", border: "1px solid rgba(249,115,22,.3)", borderRadius: "var(--r-md)", fontSize: "1.2rem", color: "var(--accent)", fontWeight: 600 }}>
                <i className="fas fa-circle-exclamation" style={{ marginRight: 6 }} />Required — configure at least one method so buyers can check out from your store.
              </div>
            )}
            <p style={{ margin: "0 0 16px", fontSize: "1.2rem", color: "var(--ink-3)" }}>Configure how buyers can receive their orders. At least one method must be enabled.</p>

            {/* Pickup */}
            <div style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.3rem" }}><i className="fas fa-person-walking" style={{ color: "var(--accent)", marginRight: 6 }} />Self Pickup</div>
                  <div style={{ fontSize: "1.15rem", color: "var(--ink-3)" }}>Buyer collects from your store / pickup point</div>
                </div>
                <label className="partner-toggle" style={{ flexShrink: 0, marginLeft: 16 }}>
                  <input type="checkbox" checked={deliveryConfig.pickup.enabled} onChange={(e) => setDeliveryConfig((c) => ({ ...c, pickup: { ...c.pickup, enabled: e.target.checked } }))} />
                  <span className="partner-toggle-track" />
                </label>
              </div>
              {deliveryConfig.pickup.enabled && (
                <div>
                  <label style={lSty}>Pickup Instructions (optional)</label>
                  <input style={iSty} placeholder="e.g. Block C Shop 12, Moremi Rd — ask for John" value={deliveryConfig.pickup.instructions} onChange={(e) => setDeliveryConfig((c) => ({ ...c, pickup: { ...c.pickup, instructions: e.target.value } }))} />
                </div>
              )}
            </div>

            {/* Self-delivery */}
            <div style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.3rem" }}><i className="fas fa-bicycle" style={{ color: "#3b82f6", marginRight: 6 }} />I Deliver Myself</div>
                  <div style={{ fontSize: "1.15rem", color: "var(--ink-3)" }}>You personally deliver to buyers — set your fee and coverage area</div>
                </div>
                <label className="partner-toggle" style={{ flexShrink: 0, marginLeft: 16 }}>
                  <input type="checkbox" checked={deliveryConfig.selfDelivery.enabled} onChange={(e) => setDeliveryConfig((c) => ({ ...c, selfDelivery: { ...c.selfDelivery, enabled: e.target.checked } }))} />
                  <span className="partner-toggle-track" />
                </label>
              </div>
              {deliveryConfig.selfDelivery.enabled && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={lSty}>Delivery Fee (₦)</label>
                    <input style={iSty} type="number" min="0" placeholder="e.g. 500" value={deliveryConfig.selfDelivery.fee} onChange={(e) => setDeliveryConfig((c) => ({ ...c, selfDelivery: { ...c.selfDelivery, fee: Number(e.target.value) } }))} />
                  </div>
                  <div>
                    <label style={lSty}>Estimated Time</label>
                    <input style={iSty} placeholder="e.g. 1–3 days" value={deliveryConfig.selfDelivery.estimatedDays} onChange={(e) => setDeliveryConfig((c) => ({ ...c, selfDelivery: { ...c.selfDelivery, estimatedDays: e.target.value } }))} />
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={lSty}>Coverage Area</label>
                    <input style={iSty} placeholder="e.g. Yaba, Akoka, Bariga" value={deliveryConfig.selfDelivery.coverage} onChange={(e) => setDeliveryConfig((c) => ({ ...c, selfDelivery: { ...c.selfDelivery, coverage: e.target.value } }))} />
                  </div>
                </div>
              )}
            </div>

            {/* Shipbubble courier */}
            <div style={{ padding: "14px 0 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.3rem" }}><i className="fas fa-truck" style={{ color: "#8b5cf6", marginRight: 6 }} />Courier (Shipbubble)</div>
                  <div style={{ fontSize: "1.15rem", color: "var(--ink-3)" }}>Live courier rates via DHL, GIG, Kwik — buyer picks &amp; pays the courier fee</div>
                </div>
                <label className="partner-toggle" style={{ flexShrink: 0, marginLeft: 16 }}>
                  <input type="checkbox" checked={deliveryConfig.shipbubble.enabled} onChange={(e) => setDeliveryConfig((c) => ({ ...c, shipbubble: { ...c.shipbubble, enabled: e.target.checked } }))} />
                  <span className="partner-toggle-track" />
                </label>
              </div>
              {deliveryConfig.shipbubble.enabled && (
                <div>
                  <div style={{ marginBottom: 8, padding: "8px 10px", background: "rgba(139,92,246,.07)", border: "1px solid rgba(139,92,246,.2)", borderRadius: "var(--r-md)", fontSize: "1.15rem", color: "var(--ink-2)" }}>
                    <i className="fas fa-circle-info" style={{ color: "#8b5cf6", marginRight: 6 }} />Enter your pickup address so couriers know where to collect orders
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={lSty}>Contact Name</label>
                      <input style={iSty} placeholder="Full name" value={deliveryConfig.shipbubble.pickupAddress.name} onChange={(e) => setDeliveryConfig((c) => ({ ...c, shipbubble: { ...c.shipbubble, pickupAddress: { ...c.shipbubble.pickupAddress, name: e.target.value } } }))} />
                    </div>
                    <div>
                      <label style={lSty}>Phone</label>
                      <input style={iSty} placeholder="08012345678" value={deliveryConfig.shipbubble.pickupAddress.phone} onChange={(e) => setDeliveryConfig((c) => ({ ...c, shipbubble: { ...c.shipbubble, pickupAddress: { ...c.shipbubble.pickupAddress, phone: e.target.value } } }))} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={lSty}>Street Address</label>
                      <input style={iSty} placeholder="e.g. 14 University Road, UNILAG" value={deliveryConfig.shipbubble.pickupAddress.street} onChange={(e) => setDeliveryConfig((c) => ({ ...c, shipbubble: { ...c.shipbubble, pickupAddress: { ...c.shipbubble.pickupAddress, street: e.target.value } } }))} />
                    </div>
                    <div>
                      <label style={lSty}>City</label>
                      <input style={iSty} placeholder="Lagos" value={deliveryConfig.shipbubble.pickupAddress.city} onChange={(e) => setDeliveryConfig((c) => ({ ...c, shipbubble: { ...c.shipbubble, pickupAddress: { ...c.shipbubble.pickupAddress, city: e.target.value } } }))} />
                    </div>
                    <div>
                      <label style={lSty}>State</label>
                      <input style={iSty} placeholder="Lagos" value={deliveryConfig.shipbubble.pickupAddress.state} onChange={(e) => setDeliveryConfig((c) => ({ ...c, shipbubble: { ...c.shipbubble, pickupAddress: { ...c.shipbubble.pickupAddress, state: e.target.value } } }))} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} disabled={deliveryConfigSaving} onClick={saveDeliverySettings}>
              {deliveryConfigSaving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save" /> Save Delivery Options</>}
            </button>
          </div>

          {/* Notification Preferences */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.6rem", fontWeight: 700 }}><i className="fas fa-bell" style={{ marginRight: 8, color: "var(--accent)" }} />Notification Preferences</h3>
            {[
              { key: "orderUpdate", label: "New orders & order updates", desc: "Get notified when a buyer places an order" },
              { key: "newMessage", label: "New messages", desc: "Get notified when a buyer messages you" },
              { key: "lowStock", label: "Low stock alerts", desc: "Alert when a product has 5 or fewer items" },
              { key: "payoutReady", label: "Payout ready", desc: "Notify when funds are ready to withdraw" },
            ].map(({ key, label, desc }) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "1.3rem" }}>{label}</div>
                  <div style={{ fontSize: "1.15rem", color: "var(--ink-3)" }}>{desc}</div>
                </div>
                <label className="partner-toggle" style={{ flexShrink: 0, marginLeft: 16 }}>
                  <input type="checkbox" checked={dashNotifs[key]} onChange={(e) => setDashNotifs((n) => ({ ...n, [key]: e.target.checked }))} />
                  <span className="partner-toggle-track" />
                </label>
              </div>
            ))}
            <button className="btn btn-primary btn-sm" disabled={notifSaving} style={{ marginTop: 16 }} onClick={saveNotifs}>
              {notifSaving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save" /> Save Preferences</>}
            </button>
          </div>

          {/* Policies & Fulfillment */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.6rem", fontWeight: 700 }}><i className="fas fa-file-lines" style={{ marginRight: 8, color: "var(--accent)" }} />Policies & Fulfillment</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={lSty}>Return Policy</label>
              <textarea style={{ ...iSty, height: 80, resize: "vertical" }} value={dashPolicy.returnPolicy} onChange={(e) => setDashPolicy((p) => ({ ...p, returnPolicy: e.target.value }))} placeholder="Describe your return/refund policy..." />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lSty}>Fulfillment Time</label>
              <input style={iSty} value={dashPolicy.fulfillmentTime} onChange={(e) => setDashPolicy((p) => ({ ...p, fulfillmentTime: e.target.value }))} placeholder="e.g. Ships within 1–2 business days" />
            </div>
            <button className="btn btn-primary btn-sm" disabled={policySaving} onClick={savePolicies}>
              {policySaving ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-save" /> Save Policies</>}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ padding: 20, marginBottom: 16, border: "1px solid rgba(220,38,38,.3)" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.6rem", fontWeight: 700, color: "#dc2626" }}><i className="fas fa-triangle-exclamation" style={{ marginRight: 8 }} />Danger Zone</h3>
            <p style={{ margin: "0 0 16px", fontSize: "1.3rem", color: "var(--ink-2)" }}>Deactivating your account will hide your store and listings from buyers. You can reactivate by contacting support.</p>
            <button className="btn btn-sm" style={{ color: "#dc2626", border: "1px solid #dc2626", background: "transparent" }} onClick={() => showToast("To deactivate your account, contact admin@myump.com.ng", "info")}>
              <i className="fas fa-power-off" /> Deactivate Account
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const MOB_TABS = [
    { id: "Home",       icon: "house",         label: "Home" },
    { id: "Orders",     icon: "box-archive",   label: "Orders" },
    { id: "Products",   icon: "boxes-stacked", label: "Products" },
    { id: "Apartments", icon: "building",      label: "Listings" },
    { id: "Payouts",    icon: "wallet",        label: "Payouts" },
    { id: "Settings",   icon: "gear",          label: "Settings" },
  ];

  return (
    <>
      {storeCropSrc && (
        <ImageCropModal
          src={storeCropSrc}
          aspect={storeCropTarget === "banner" ? 4 / 1 : 1}
          title={storeCropTarget === "banner" ? "Crop store banner" : "Crop store logo"}
          onConfirm={handleStoreCropConfirm}
          onCancel={() => { setStoreCropSrc(null); setStoreCropTarget(null); }}
        />
      )}

      {/* Delivery setup modal — fires on load if not configured */}
      {!loading && !deliveryConfigured && !deliveryModalDismissed && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.65)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="card" style={{ maxWidth: 420, width: "100%", padding: 28, textAlign: "center", position: "relative" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(249,115,22,.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <i className="fas fa-truck" style={{ fontSize: "2.4rem", color: "var(--accent)" }} />
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.9rem", fontWeight: 900 }}>Set up delivery first</h2>
            <p style={{ margin: "0 0 20px", fontSize: "1.3rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
              Buyers <strong>can't check out</strong> from your store until you configure at least one delivery option — pickup, self-delivery, or courier.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setDeliveryModalDismissed(true);
                  setTab("Settings");
                  setTimeout(() => deliveryCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
                }}
              >
                <i className="fas fa-gear" style={{ marginRight: 8 }} />Set up delivery now
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}
                onClick={() => setDeliveryModalDismissed(true)}
              >
                Remind me later
              </button>
            </div>
          </div>
        </div>
      )}
      <FloatingChat />
      <div className="seller-dash">
        <Sidebar tab={tab} setTab={setTab} navigate={navigate} profile={profile} user={user} unreadMessages={unreadMessages} />

        <main className="seller-main">
          <div className="seller-mobile-header" style={{ padding: "14px 16px", background: "var(--navy-800)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.04em" }}>
              <span style={{ color: "var(--accent)" }}>U</span>MP <span style={{ fontSize: "1.4rem", fontWeight: 600, opacity: 0.6 }}>Seller</span>
            </div>
            <button className="btn btn-sm" style={{ background: "rgba(255,255,255,.1)", color: "#fff", border: "none" }} onClick={() => navigate("/")}>
              <i className="fas fa-arrow-left" /> UMP
            </button>
          </div>

          {PAGE_CONTENT}

          <div className="seller-mob-tabs" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--navy-800)", display: "flex", borderTop: "1px solid rgba(255,255,255,.08)", zIndex: 55, overflow: "hidden" }}>
            {MOB_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{ flex: 1, minWidth: 0, padding: "8px 2px", border: "none", background: "transparent", color: tab === t.id ? "var(--accent)" : "rgba(255,255,255,.5)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontFamily: "var(--font-sans)" }}
              >
                <i className={`fas fa-${t.icon}`} style={{ fontSize: "1.35rem" }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", textAlign: "center" }}>{t.label}</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}

