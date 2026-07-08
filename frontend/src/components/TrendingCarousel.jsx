import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../utils/api";

export default function TrendingCarousel() {
  const [items, setItems] = useState([]);
  const index = useRef(0);
  const trackRef = useRef(null);
  const touchStartRef = useRef(0);
  const touchEndRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/products/advertised`)
      .then((res) => res.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (!items.length) return;

    intervalRef.current = setInterval(() => {
      index.current = (index.current + 1) % items.length;
      trackRef.current.style.transform = `translateX(-${
        index.current * 320
      }px)`;
    }, 3000);

    return () => clearInterval(intervalRef.current);
  }, [items]);

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches?.[0]?.clientX || 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleTouchEnd = (e) => {
    touchEndRef.current = e.changedTouches?.[0]?.clientX || 0;
    const diff = touchStartRef.current - touchEndRef.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold && items.length) {
      if (diff > 0) {
        index.current = (index.current + 1) % items.length;
      } else {
        index.current = (index.current - 1 + items.length) % items.length;
      }
      trackRef.current.style.transform = `translateX(-${index.current * 320}px)`;
    }

    // Restart auto-advance
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      index.current = (index.current + 1) % items.length;
      trackRef.current.style.transform = `translateX(-${index.current * 320}px)`;
    }, 3000);
  };

  if (!items.length) return null;

  return (
    <section className="trending-carousel">
      <h2>🔥 Trending Now</h2>
      <div className="carousel-wrapper" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
