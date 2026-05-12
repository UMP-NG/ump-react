// src/components/cart/Recommendations.jsx
import React, { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import "../styles/cart.css";

export default function Recommendations() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function loadRecommendations() {
      try {
        const res = await apiFetch("/api/recommendations");
        setItems(res.items || []);
      } catch {
        setItems([]);
      }
    }
    loadRecommendations();
  }, []);

  if (!items.length) return null;

  return (
    <div className="forgot-something">
      <h3>Forgot Something?</h3>
      <div className="recommendations">
        {items.map((item) => (
          <div key={item.id} className="recommendation-card">
            <img src={item.image} alt={item.name} />
            <span>{item.name}</span>
            <span>₦{item.price.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
