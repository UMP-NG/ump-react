import React from "react";
import "../styles/index.css";

export default function VibeSection() {
  const vibes = [
    {
      title: "Fashion Trends",
      img: "/images/fash-trend.jpg",
      link: "/pages/category.html?slug=fashion",
    },
    {
      title: "Study Essentials",
      img: "/images/study-essen.jpg",
      link: "/pages/category.html?slug=books",
    },
    {
      title: "Cozy Home",
      img: "/images/cozy-hostel.jpg",
      link: "/pages/category.html?slug=art-decor",
    },
    {
      title: "Tech Life",
      img: "/images/tech-life.jpg",
      link: "/pages/category.html?slug=electronics",
    },
  ];

  return (
    <section className="vibe">
      <h2>🎨 Shop by Vibe</h2>
      <p>Discover themed collections curated for your lifestyle and mood.</p>

      <div className="vibe-grid">
        {vibes.map((vibe, i) => (
          <a key={i} href={vibe.link} className="vibe-card">
            <img src={vibe.img} alt={vibe.title} />
            <div className="vibe-overlay">
              <h3>{vibe.title}</h3>
            </div>
          </a>
        ))}
      </div>

      <a href="/pages/collections.html" className="view-all-btn">
        View All Vibes →
      </a>
    </section>
  );
}
