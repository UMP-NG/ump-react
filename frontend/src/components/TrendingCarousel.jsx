import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../utils/api";

export default function TrendingCarousel() {
  const [items, setItems] = useState([]);
  const index = useRef(0);
  const trackRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/products/advertised`)
      .then((res) => res.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (!items.length) return;

    const id = setInterval(() => {
      index.current = (index.current + 1) % items.length;
      trackRef.current.style.transform = `translateX(-${
        index.current * 320
      }px)`;
    }, 3000);

    return () => clearInterval(id);
  }, [items]);

  if (!items.length) return null;

  return (
    <section className="trending-carousel">
      <h2>🔥 Trending Now</h2>
      <div className="carousel-wrapper">
        <div className="carousel-track" ref={trackRef}>
          {items.map((p) => (
            <div className="carousel-card" key={p._id}>
              <img src={`${API_BASE}${p.image}`} alt={p.name} />
              <h4>{p.name}</h4>
              <span>₦{p.price.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
