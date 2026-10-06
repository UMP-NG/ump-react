import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import Skel from "../components/Skel";
import ImageCropModal from "../components/ImageCropModal";
import { cloudVideo } from "../utils/cloudinary";
import { naira } from "../components/ProductCard";

const NAV = [
  { id: "Home",     icon: "house",    label: "Dashboard Home" },
  { id: "Listings", icon: "building", label: "Listings" },
  { id: "Settings", icon: "gear",     label: "Settings" },
];

const AMENITY_OPTIONS = ["WiFi", "Water", "Electricity", "Kitchen", "Bathroom", "Parking", "Security", "Laundry", "AC", "Generator"];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ tab, setTab, navigate, user }) {
  const avatarUrl = user?.avatar?.url || (typeof user?.avatar === "string" ? user.avatar : null);
  const initials = (user?.name || "A").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const [avatarBroken, setAvatarBroken] = useState(false);

  return (
    <aside className="seller-sidebar">
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ fontSize: "2.4rem", fontWeight: 900, letterSpacing: "-0.04em", color: "#fff" }}>
          <span style={{ color: "var(--accent)" }}>U</span>MP
        </div>
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex", alignItems: "center", gap: 6, marginTop: 4, padding: 0,
            background: "transparent", border: "none", cursor: "pointer",
            fontSize: "1.1rem", color: "rgba(255,255,255,.5)", fontFamily: "var(--font-sans)",
          }}
        >
          <i className="fas fa-arrow-left" />
          Go back
        </button>
      </div>

      <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div className="avatar" style={{ width: 44, height: 44, fontSize: "1.6rem", flexShrink: 0, overflow: "hidden", padding: avatarUrl && !avatarBroken ? 0 : undefined }}>
          {avatarUrl && !avatarBroken ? <img src={avatarUrl} alt={user?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setAvatarBroken(true)} /> : initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "1.4rem", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.name || "Agent"}
          </div>
          <div style={{ fontSize: "1.1rem", color: "rgba(255,255,255,.45)" }}>UMP Agent</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "8px 0" }}>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`seller-nav-item${tab === item.id ? " active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            <i className={`fas fa-${item.icon}`} style={{ width: 18, textAlign: "center", flexShrink: 0 }} />
            {item.label}
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

// ─── Listing Modal ────────────────────────────────────────────────────────────
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
        <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "var(--card-bg)", zIndex: 1 }}>
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
            <label style={lSty}>Agent & Move-in Fees <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></label>
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
              {form.amenities.filter((a) => !AMENITY_OPTIONS.includes(a)).map((a) => (
                <span key={a} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, border: "1px solid var(--accent)", background: "rgba(249,115,22,.1)", color: "var(--accent)", fontSize: "1.2rem", fontWeight: 600 }}>
                  {a}
                  <button type="button" onClick={() => toggleAmenity(a)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--accent)", padding: 0, lineHeight: 1, fontSize: "1rem", display: "flex", alignItems: "center" }}>
                    <i className="fas fa-xmark" />
                  </button>
                </span>
              ))}
            </div>
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
              <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { handleImagePick(e); e.target.value = ""; }} />
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

        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--line)", display: "flex", gap: 10, justifyContent: "flex-end", position: "sticky", bottom: 0, background: "var(--card-bg)" }}>
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

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const showToast = useToast();
  const [tab, setTab] = useState("Home");

  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingModal, setListingModal] = useState(null);
  const [deleteListingId, setDeleteListingId] = useState(null);
  const [listingDeleting, setListingDeleting] = useState(false);

  useEffect(() => {
    if (user === null) { navigate("/login", { replace: true }); return; }
    if (user && !user.roles?.includes("agent")) { navigate("/partner", { replace: true }); return; }
  }, [user, navigate]);

  const isAgent = user?.roles?.includes("agent");
  useEffect(() => {
    if (!isAgent) return;
    setListingsLoading(true);
    apiFetch("/api/listings/my")
      .then((d) => setListings(d.listings || []))
      .catch(() => setListings([]))
      .finally(() => setListingsLoading(false));
  }, [user?._id, isAgent]);

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

  const MOB_TABS = [
    { id: "Home",     icon: "house",    label: "Home" },
    { id: "Listings", icon: "building", label: "Listings" },
    { id: "Settings", icon: "gear",     label: "Settings" },
  ];

  if (!user?.roles?.includes("agent")) return null;

  return (
    <div className="seller-dash">
      <Sidebar tab={tab} setTab={setTab} navigate={navigate} user={user} />

      <main className="seller-main">
        <div className="seller-mobile-header" style={{ padding: "14px 16px", background: "var(--navy-800)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.04em" }}>
            <span style={{ color: "var(--accent)" }}>U</span>MP <span style={{ fontSize: "1.4rem", fontWeight: 600, opacity: 0.6 }}>Agent</span>
          </div>
          <button className="btn btn-sm" style={{ background: "rgba(255,255,255,.1)", color: "#fff", border: "none" }} onClick={() => navigate("/")}>
            <i className="fas fa-arrow-left" /> UMP
          </button>
        </div>

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px 90px" }}>

          {tab === "Home" && (
            <div>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 4px" }}>Agent Dashboard</h2>
              <p style={{ margin: "0 0 20px", color: "var(--ink-3)", fontSize: "1.3rem" }}>Manage your hostel and apartment listings.</p>
              <div className="card" style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(249,115,22,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="fas fa-building" style={{ fontSize: "2rem", color: "var(--accent)" }} />
                </div>
                <div>
                  <div style={{ fontSize: "2.4rem", fontWeight: 800 }}>{listings.length}</div>
                  <div style={{ fontSize: "1.2rem", color: "var(--ink-3)" }}>Active {listings.length === 1 ? "listing" : "listings"}</div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setTab("Listings")}>
                  <i className="fas fa-arrow-right" /> Manage listings
                </button>
              </div>
            </div>
          )}

          {tab === "Listings" && (
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
                  <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 4px" }}>Listings</h2>
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

          {tab === "Settings" && (
            <div>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 20px" }}>Settings</h2>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: "1.3rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
                  Signed in as <strong>{user?.name}</strong> ({user?.email}).<br />
                  Agreement, commission, agent and caution fees are set per-listing when you add or edit a property.
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="seller-mob-tabs" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--navy-800)", display: "flex", borderTop: "1px solid rgba(255,255,255,.08)", zIndex: 55, overflow: "hidden" }}>
          {MOB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ flex: 1, minWidth: 0, padding: "8px 2px", border: "none", background: "transparent", color: tab === t.id ? "var(--accent)" : "rgba(255,255,255,.5)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontFamily: "var(--font-sans)" }}
            >
              <i className={`fas fa-${t.icon}`} style={{ fontSize: "1.7rem" }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", textAlign: "center" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
