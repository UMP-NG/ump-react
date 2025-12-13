import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { apiFetch } from "../utils/api";
import "../styles/Services.css";

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [priceRange, setPriceRange] = useState(100);
  const [category, setCategory] = useState("");
  const [rating, setRating] = useState("");
  const [availability, setAvailability] = useState([]);

  // Load services
  useEffect(() => {
    async function loadServices() {
      try {
        const data = await apiFetch("/services");
        setServices(Array.isArray(data) ? data : data.services || []);
      } catch (err) {
        console.error(err);
        setServices([]);
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, []);

  // Filtered services
  const filteredServices = services.filter((s) => {
    const matchPrice = s.rate <= priceRange;
    const matchCategory = category ? s.category === category : true;
    const matchRating = rating ? s.rating >= parseFloat(rating) : true;
    const matchAvailability =
      availability.length > 0
        ? availability.some((a) => s.availability?.includes(a))
        : true;
    return matchPrice && matchCategory && matchRating && matchAvailability;
  });

  // Handle availability checkbox toggle
  const handleAvailabilityChange = (e) => {
    const { value, checked } = e.target;
    setAvailability((prev) =>
      checked ? [...prev, value] : prev.filter((a) => a !== value)
    );
  };

  return (
    <>
      <Navbar />

      {/* Filters */}
      <section className="filter-bar">
        <div className="filter-item">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="tutoring">Academic Tutoring</option>
            <option value="design">Graphic Design</option>
            <option value="fitness">Fitness Coaching</option>
            <option value="music">Music Lessons</option>
          </select>
        </div>

        <div className="filter-item price-filter">
          <label htmlFor="priceRange">Rate / Price</label>
          <div className="price-range-wrapper">
            <input
              type="range"
              id="priceRange"
              min="0"
              max="100"
              step="5"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
            />
            <span id="priceValue">₦0 - ₦{priceRange}/hr</span>
          </div>
        </div>

        <div className="filter-item">
          <label htmlFor="rating">Rating</label>
          <select
            id="rating"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          >
            <option value="">All Ratings</option>
            <option value="4.5">4.5★ & Up</option>
            <option value="4">4★ & Up</option>
            <option value="3.5">3.5★ & Up</option>
          </select>
        </div>

        <div className="filter-item availability">
          <label>Availability</label>
          <div className="availability-options">
            {["mornings", "afternoons", "evenings", "weekdays", "weekends"].map(
              (time) => (
                <label key={time}>
                  <input
                    type="checkbox"
                    value={time}
                    checked={availability.includes(time)}
                    onChange={handleAvailabilityChange}
                  />{" "}
                  {time.charAt(0).toUpperCase() + time.slice(1)}
                </label>
              )
            )}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="service-listing">
        <div className="service-grid">
          {loading ? (
            <p>Loading services...</p>
          ) : filteredServices.length === 0 ? (
            <div className="empty-state">
              <img src="/images/service.jpg" alt="No services" />
              <h3>No services available yet</h3>
              <p>Once partners add services, they’ll appear here.</p>
            </div>
          ) : (
            filteredServices.map((s) => (
              <div className="service-card" key={s._id}>
                <img
                  src={s.image || "/images/default.jpg"}
                  alt={s.title}
                  className="service-photo"
                />
                <h3 className="service-title">{s.title}</h3>
                <div className="provider-info">
                  <span>{s.name || s.provider?.name || "Unknown"}</span>
                  {s.verified && (
                    <span className="verified-badge">Verified</span>
                  )}
                </div>
                <div className="price">₦{s.rate || "N/A"}/hr</div>
                <div className="rating">
                  ⭐ {s.rating || "0"} <span>/ 5.0</span>
                </div>
                <button
                  className="view-btn"
                  onClick={() =>
                    (window.location.href = `/servicesdp?id=${s._id}`)
                  }
                >
                  View Details
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
