// src/components/PaymentMethods.jsx
export default function PaymentMethods({ onSelect }) {
  return (
    <div className="payment-section">
      <h2>Payment Method</h2>
      <p>Select your preferred payment option (Escrow protected):</p>

      <label>
        <input
          type="radio"
          name="payment"
          value="card"
          onChange={(e) => onSelect(e.target.value)}
        />
        Credit/Debit Card (Escrow Secured)
      </label>
      <br />
      <label>
        <input
          type="radio"
          name="payment"
          value="transfer"
          onChange={(e) => onSelect(e.target.value)}
        />
        Bank Transfer (Escrow Secured)
      </label>
    </div>
  );
}
