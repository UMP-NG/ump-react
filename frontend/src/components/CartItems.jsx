// src/components/CartItems.jsx
export default function CartItems({ cart }) {
  return (
    <div className="cart-items">
      {cart.length === 0 ? (
        <p>Your cart is empty</p>
      ) : (
        cart.map((item) => (
          <div className="cart-item" key={item.id}>
            <img src={item.image} alt={item.name} />
            <div className="cart-item-details">
              <h4>{item.name}</h4>
              <p>₦{item.price.toLocaleString()}</p>
              <p>Qty: {item.qty}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
