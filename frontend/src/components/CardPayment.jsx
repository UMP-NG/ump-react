import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// This component is not used in the app — payment is handled via Flutterwave/Paystack
// redirects in Cart.jsx. Kept as a safe no-op to avoid import errors if referenced.
export default function CardPayment() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/cart", { replace: true }); }, [navigate]);
  return null;
}
