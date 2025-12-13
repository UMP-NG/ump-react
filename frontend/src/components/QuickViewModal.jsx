export default function QuickViewModal({ product, onClose }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close-modal" onClick={onClose}>
          &times;
        </span>

        <img src={product.images?.[0] || product.image} alt={product.name} />
        <h2>{product.name}</h2>
        <p>₦{product.price}</p>
        <p>{product.desc || "No description"}</p>
      </div>
    </div>
  );
}
