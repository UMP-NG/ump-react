// src/components/ShippingForm.jsx
export default function ShippingForm({ onChange }) {
  return (
    <div className="info-form">
      <h2>Shipping Information</h2>
      <form id="shippingForm">
        <label>
          Full Name:
          <input
            type="text"
            onChange={(e) =>
              onChange((prev) => ({ ...prev, fullName: e.target.value }))
            }
          />
        </label>
        <label>
          Email:
          <input
            type="email"
            onChange={(e) =>
              onChange((prev) => ({ ...prev, email: e.target.value }))
            }
          />
        </label>
        <label>
          Address/Hostel:
          <input
            type="text"
            onChange={(e) =>
              onChange((prev) => ({ ...prev, location: e.target.value }))
            }
          />
        </label>
        <label>
          Phone Number:
          <input
            type="tel"
            onChange={(e) =>
              onChange((prev) => ({ ...prev, phone: e.target.value }))
            }
          />
        </label>
      </form>
    </div>
  );
}
