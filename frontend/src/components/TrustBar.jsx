// src/components/cart/TrustBar.jsx
import React from "react";
import "../styles/cart.css";

export default function TrustBar() {
  return (
    <div className="trust-bar">
      <div className="trust-item">
        <img src="../images/secure.png" alt="Secure Checkout" />
        <span>100% Secure Checkout</span>
      </div>
      <div className="trust-item">
        <img src="../images/guarantee.png" alt="Guarantee" />
        <span>Student-to-Student Purchase Guarantee</span>
      </div>
      <div className="trust-item">
        <img src="../images/return.png" alt="Return" />
        <span>Simple Return Process</span>
      </div>
    </div>
  );
}
