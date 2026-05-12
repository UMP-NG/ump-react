import { apiFetch } from "../utils/api";
import { useEffect } from "react";

export default function CardPayment() {
  useEffect(() => {
    const init = async () => {
      const res = await apiFetch("/api/payments/initialize", {
        method: "POST",
      });

      window.location.href = res.authorization_url;
    };

    init();
  }, []);

  return <p>Redirecting to payment...</p>;
}
