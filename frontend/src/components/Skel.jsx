/* Skeleton building blocks — all use the .skel CSS class for the shimmer animation */
import React from "react";

function S({ w = "100%", h = 14, r = 6, style }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

S.Line  = ({ w = "100%", h = 13, style }) => <S w={w} h={h} r={6} style={style} />;
S.Thick = ({ w = "100%", h = 20, style }) => <S w={w} h={h} r={8} style={style} />;
S.Box   = ({ h = 200, r = 12, style }) => <S w="100%" h={h} r={r} style={style} />;
S.Circle = ({ size = 48, style }) => <S w={size} h={size} r="50%" style={{ flexShrink: 0, ...style }} />;

S.Text = function SkelText({ lines = 2, gap = 8, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <S.Line key={i} w={i === lines - 1 ? "65%" : "100%"} />
      ))}
    </div>
  );
};

/* ── ProductCard skeleton (used on Market, Category, Wishlist, Home) ── */
S.ProductCard = function SkelProductCard() {
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", background: "var(--white)", border: "1px solid var(--line)" }}>
      <S.Box h={180} r={0} />
      <div style={{ padding: "12px 12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <S.Line w="80%" />
        <S.Line w="50%" h={10} />
        <S.Thick w="55%" h={18} />
      </div>
    </div>
  );
};

/* ── Notification row skeleton ── */
S.NotifRow = function SkelNotifRow() {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 12px" }}>
      <S.Circle size={40} style={{ borderRadius: 12 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <S.Line w="70%" h={13} />
        <S.Line w="90%" h={11} />
        <S.Line w="30%" h={10} />
      </div>
    </div>
  );
};

/* ── Order card skeleton ── */
S.OrderCard = function SkelOrderCard() {
  return (
    <div style={{ borderRadius: 16, background: "var(--white)", border: "1px solid var(--line)", padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <S w={60} h={60} r={10} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <S.Line w="45%" h={13} />
        <S.Line w="60%" h={11} />
        <S.Line w="35%" h={16} />
      </div>
      <S w={60} h={22} r={10} />
    </div>
  );
};

/* ── Service card skeleton ── */
S.ServiceCard = function SkelServiceCard() {
  return (
    <div style={{ borderRadius: 16, background: "var(--white)", border: "1px solid var(--line)", padding: 14, display: "flex", gap: 12 }}>
      <S w={96} h={96} r={14} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <S.Line w="75%" />
        <S.Line w="45%" h={11} />
        <S.Line w="30%" h={10} />
        <S.Thick w="40%" h={18} />
      </div>
    </div>
  );
};

/* ── Store card skeleton ── */
S.StoreCard = function SkelStoreCard() {
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", background: "var(--white)", border: "1px solid var(--line)" }}>
      <S.Box h={80} r={0} />
      <div style={{ padding: "0 12px 14px", textAlign: "center", marginTop: -30 }}>
        <S.Circle size={60} style={{ margin: "0 auto 10px", borderRadius: 16, border: "3px solid var(--white)" }} />
        <S.Line w="70%" style={{ margin: "0 auto 8px" }} />
        <S.Line w="45%" h={11} style={{ margin: "0 auto 10px" }} />
        <S w="100%" h={34} r={20} />
      </div>
    </div>
  );
};

/* ── Hostel card skeleton ── */
S.HostelCard = function SkelHostelCard() {
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", background: "var(--white)", border: "1px solid var(--line)" }}>
      <S.Box h={180} r={0} />
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <S.Line w="55%" h={16} />
          <S w={80} h={16} r={6} />
        </div>
        <S.Line w="65%" h={12} />
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {[1,2,3].map(i => <S key={i} w={32} h={32} r={10} />)}
        </div>
      </div>
    </div>
  );
};

/* ── Product detail skeleton ── */
S.ProductDetail = function SkelProductDetail() {
  return (
    <>
      <S.Box h={320} r={0} />
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <S.Line w="80%" h={26} />
        <S.Line w="40%" h={14} />
        <S.Thick w="45%" h={32} />
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {[1,2,3].map(i => <S key={i} w={60} h={28} r={20} />)}
        </div>
        <S w="100%" h={1} r={0} style={{ marginTop: 8 }} />
        <S.Text lines={4} gap={10} />
      </div>
      <div style={{ margin: "0 16px", borderRadius: 16, padding: 14, border: "1px solid var(--line)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <S.Circle size={52} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <S.Line w="55%" />
            <S.Line w="35%" h={11} />
          </div>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <S.Text lines={3} gap={8} />
      </div>
    </>
  );
};

/* ── Service detail skeleton ── */
S.ServiceDetail = function SkelServiceDetail() {
  return (
    <>
      <S.Box h={280} r={0} />
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <S.Line w="75%" h={24} />
        <S.Line w="40%" h={14} />
        <S.Thick w="45%" h={28} />
        <S w="100%" h={1} r={0} style={{ marginTop: 4 }} />
        <S.Text lines={3} gap={9} />
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 8 }}>
          <S.Thick w="30%" h={16} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[1,2,3,4,5].map(i => <S key={i} w={80} h={34} r={20} />)}
          </div>
        </div>
      </div>
      <div style={{ margin: "0 16px", borderRadius: 16, padding: 14, border: "1px solid var(--line)", display: "flex", gap: 12, alignItems: "center" }}>
        <S.Circle size={52} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
          <S.Line w="50%" />
          <S.Line w="35%" h={11} />
        </div>
      </div>
    </>
  );
};

/* ── Store detail skeleton ── */
S.StoreDetail = function SkelStoreDetail() {
  return (
    <>
      <S.Box h={160} r={0} />
      <div style={{ padding: "0 16px" }}>
        <S w={72} h={72} r={16} style={{ marginTop: -36, border: "3px solid var(--white)" }} />
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <S.Line w="55%" h={22} />
          <S.Line w="40%" h={13} />
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 16, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
              <S w={36} h={18} r={6} />
              <S w={48} h={11} r={4} />
            </div>
          ))}
        </div>
        <S.Text lines={2} gap={8} style={{ marginTop: 14 }} />
        <div style={{ marginTop: 24 }}>
          <S.Thick w="35%" h={20} style={{ marginBottom: 14 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
            {[1,2,3,4].map(i => <S.ProductCard key={i} />)}
          </div>
        </div>
      </div>
    </>
  );
};

/* ── Hostel detail skeleton ── */
S.HostelDetail = function SkelHostelDetail() {
  return (
    <>
      <div style={{ height: 260, margin: "0 16px", borderRadius: 20, overflow: "hidden" }}>
        <S.Box h={260} r={0} />
      </div>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <S.Line w="55%" h={24} />
          <S w={90} h={24} r={6} />
        </div>
        <S.Line w="50%" h={13} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          {[1,2,3,4].map(i => <S key={i} w={90} h={32} r={20} />)}
        </div>
        <S.Text lines={4} gap={9} style={{ marginTop: 4 }} />
        <div style={{ borderRadius: 16, padding: 14, border: "1px solid var(--line)", display: "flex", gap: 12, alignItems: "center", marginTop: 4 }}>
          <S.Circle size={48} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <S.Line w="45%" />
            <S.Line w="30%" h={11} />
          </div>
        </div>
      </div>
    </>
  );
};

/* ── Wishlist grid skeleton ── */
S.WishlistGrid = function SkelWishlistGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {[1,2,3,4].map(i => <S.ProductCard key={i} />)}
    </div>
  );
};

/* ── Cart items skeleton ── */
S.CartItems = function SkelCartItems() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ borderRadius: 16, background: "var(--white)", border: "1px solid var(--line)", padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
          <S w={72} h={72} r={12} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <S.Line w="70%" />
            <S.Thick w="40%" h={18} />
          </div>
          <S w={80} h={32} r={20} />
        </div>
      ))}
    </div>
  );
};

/* ── Search results skeleton ── */
S.SearchResults = function SkelSearchResults() {
  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[1,2,3,4].map(i => <S.ProductCard key={i} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[1,2,3].map(i => <S.ServiceCard key={i} />)}
      </div>
    </div>
  );
};

export default S;
