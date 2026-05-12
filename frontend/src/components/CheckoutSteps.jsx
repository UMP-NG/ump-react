export default function CheckoutSteps({ step }) {
  const steps = ["Cart", "Shipping", "Payment"];

  return (
    <div className="checkout-steps">
      {steps.map((label, i) => (
        <div
          key={label}
          className={`step ${
            step === i + 1 ? "active" : step > i + 1 ? "done" : ""
          }`}
        >
          <span>{i + 1}</span>
          <p>{label}</p>
        </div>
      ))}
    </div>
  );
}
