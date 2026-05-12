export default function DeliveryOptions({ onChange }) {
  return (
    <div className="delivery-options">
      <h3>Delivery Options</h3>

      <label>
        <input type="radio" name="delivery" onChange={() => onChange(2000)} />
        Standard Delivery (₦2,000)
      </label>

      <label>
        <input type="radio" name="delivery" onChange={() => onChange(5000)} />
        Express Delivery (₦5,000)
      </label>
    </div>
  );
}
