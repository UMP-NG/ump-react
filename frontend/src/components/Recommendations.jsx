import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { getImageUrl, naira } from "./ProductCard";
import Ph from "./Ph";

export default function Recommendations() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    apiFetch("/api/products?limit=6&sort=new")
      .then((d) => setItems(d.products || d || []))
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 12, color: "var(--ink-1)" }}>
        You might also like
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4 }}>
        {items.map((item) => {
          const img = getImageUrl(item.images?.[0]);
          return (
            <div
              key={item._id}
              onClick={() => navigate(`/products/${item._id}`)}
              style={{ flexShrink: 0, width: 130, cursor: "pointer" }}
            >
              <div style={{ width: 130, height: 130, borderRadius: "var(--r-lg)", overflow: "hidden", background: "var(--surface)", marginBottom: 6 }}>
                {img
                  ? <img src={img} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <Ph kind={item.category?.name?.toLowerCase() || "default"} />}
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent)", marginTop: 2 }}>{naira(item.price)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
