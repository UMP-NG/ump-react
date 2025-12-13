import useReveal from "../hooks/useReveal";

export default function ProductGrid({ products, onQuickView }) {
  useReveal(".product-card");

  if (!products.length) {
    return (
      <section className="product-grid">
        <div className="no-results">
          <img src="../../public/images/empty.png" alt="" />
          <h2>No products found</h2>
          <p>Try adjusting filters or wait for sellers to add products.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="product-grid">
      {products.map((p) => (
        <div className="product-card" key={p._id}>
          <img src={p.images?.[0] || p.image} alt={p.name} />
          <h3>{p.name}</h3>
          <p>₦{Number(p.price).toLocaleString()}</p>

          <div className="actions">
            <button onClick={() => onQuickView(p)}>👁</button>
            <button>Add to Cart</button>
          </div>
        </div>
      ))}
    </section>
  );
}
