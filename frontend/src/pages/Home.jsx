import React from "react";
import Navbar from "../components/Navbar";
import AdvertSlider from "../components/AdvertSlider";
import FeaturedCategories from "../components/FeaturedCategories";
import Footer from "../components/Footer";
import CreatorsSection from "../components/CreatorsSection";
import WhatWeDo from "../components/WhatWeDo";
import HowItWorks from "../components/HowItWorks";
import "../styles/index.css";

export default function Home() {
  return (
    <div>
      <Navbar />
      <main>
        <AdvertSlider />
        <FeaturedCategories />
        <section className="vibe">
          <h2>🎨 Shop by Vibe</h2>
          <p>
            Discover themed collections curated for your lifestyle and mood.
          </p>

          <div className="vibe-grid">
            <a href="/pages/category.html?slug=fashion" className="vibe-card">
              <img src="/images/fash-trend.jpg" alt="Fashion Trends" />
              <div className="vibe-overlay">
                <h3>Fashion Trends</h3>
              </div>
            </a>

            <a href="/pages/category.html?slug=books" className="vibe-card">
              <img src="/images/study-essen.jpg" alt="Study Essentials" />
              <div className="vibe-overlay">
                <h3>Study Essentials</h3>
              </div>
            </a>

            <a href="/pages/category.html?slug=art-decor" className="vibe-card">
              <img src="/images/cozy-hostel.jpg" alt="Cozy Home" />
              <div className="vibe-overlay">
                <h3>Cozy Home</h3>
              </div>
            </a>

            <a
              href="/pages/category.html?slug=electronics"
              className="vibe-card"
            >
              <img src="/images/tech-life.jpg" alt="Tech Life" />
              <div className="vibe-overlay">
                <h3>Tech Life</h3>
              </div>
            </a>
          </div>

          <a href="/pages/collections.html" className="view-all-btn">
            View All Vibes →
          </a>
        </section>

        <CreatorsSection />
        <WhatWeDo />
        <HowItWorks />
      </main>

      <Footer />
    </div>
  );
}
