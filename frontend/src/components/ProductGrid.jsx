import { useNavigate } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

function getImageUrl(img, fallback = "/images/placeholder.png") {
  if (!img) return fallback;
  if (typeof img === "object" && img.url) return img.url;
  return img;
}

export default function ProductGrid({ products, onQuickView }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const showToast = useToast();
  useReveal(".product-card", [products.length]);

  const handleAddToCart = async (e, productId) => {
    e.stopPropagation();
    try {
      await addToCart(productId);
      navigate("/cart");
    } catch (err) {
      if (err?.status === 401) navigate("/login");
      else showToast("Couldn't add to cart. Try again.", "error");
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
            <button onClick={(e) => handleAddToCart(e, p._id)} title="Add to cart">
              🛒
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
