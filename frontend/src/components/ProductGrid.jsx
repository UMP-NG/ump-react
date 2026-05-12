import { useNavigate } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import { apiFetch } from "../utils/api";

function getImageUrl(img, fallback = "/images/placeholder.png") {
  if (!img) return fallback;
  if (typeof img === "object" && img.url) return img.url;
  return img;
}

export default function ProductGrid({ products, onQuickView }) {
  const navigate = useNavigate();
  useReveal(".product-card", [products.length]);

  const addToCart = async (e, productId) => {
    e.stopPropagation();
    try {
      await apiFetch("/api/cart/add", {
        method: "POST",
        body: { productId, quantity: 1 },
      });
      alert("Added to cart!");
    } catch (err) {
      if (err.status === 401) navigate("/login");
      else alert("Failed to add to cart.");
    }
  };

  if (!products.length) {
    return (
      <section className="product-grid">
        <div className="no-results">
          <img src="/images/empty.png" alt="" />
          <h2>No products found</h2>
          <p>Try adjusting filters or wait for sellers to add products.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="product-grid">
      {products.map((p) => (
        <div
          className="product-card"
          key={p._id}
          onClick={() => navigate(`/products/${p._id}`)}
          style={{ cursor: "pointer" }}
        >
          <div className="product-image">
            <img
              src={getImageUrl(p.images?.[0], p.image)}
              alt={p.name}
              loading="lazy"
            />
          </div>
          <div className="product-info">
            <h3>{p.name}</h3>
            <p>₦{Number(p.price || 0).toLocaleString()}</p>
          </div>
          <div className="product-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(p);
              }}
              title="Quick view"
            >
              👁
            </button>
            <button onClick={(e) => addToCart(e, p._id)} title="Add to cart">
              🛒
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
