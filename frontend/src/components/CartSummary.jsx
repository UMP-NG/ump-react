// src/components/CartSummary.jsx
export default function CartSummary({ cart }) {
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  return (
    <div className="cart-summary">
      <h3>Order Summary</h3>
      <p>Subtotal: ₦{subtotal.toLocaleString()}</p>
      <p>Tax: ₦0</p>
      <p>Total: ₦{subtotal.toLocaleString()}</p>
    </div>
  );
}
