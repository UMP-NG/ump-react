import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { apiFetch } from "../utils/api";

export default function Store({ headerSearchResults = [] }) {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterActive, setFilterActive] = useState(false);

  // Load sellers
  useEffect(() => {
    async function loadSellers() {
      try {
        const data = await apiFetch("/sellers");
        setSellers(Array.isArray(data) ? data : data.sellers || []);
      } catch (err) {
        console.error(err);
        setSellers([]);
      } finally {
        setLoading(false);
      }
    }
    loadSellers();
  }, []);

  // Apply category filter
  const filteredSellers =
    filterCategory === "all"
      ? sellers
      : sellers.filter((s) =>
          s.category?.some(
            (c) => c.toLowerCase() === filterCategory.toLowerCase()
          )
        );

  // Determine which list to show: search results from header or filtered store
  const displaySellers = headerSearchResults.length
    ? headerSearchResults
    : filteredSellers;

  return (
    <>
      <Navbar />

      {/* Filter Toggle */}
      <button
        className="filter-toggle"
        onClick={() => setFilterActive((prev) => !prev)}
      >
        {filterActive ? "✖ Close Filters" : "☰ Filters"}
      </button>

      {/* Filter Panel */}
      {filterActive && (
        <aside className="filter-panel active">
          <h3>Filter by Category</h3>
          <ul className="filter-list">
            {["all", "electronics", "fashion", "books", "accessories"].map(
              (cat) => (
                <li key={cat}>
                  <button
                    className="filter-btn"
                    onClick={() => setFilterCategory(cat)}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                </li>
              )
            )}
          </ul>
        </aside>
      )}

      <main className="store-container">
        {loading ? (
          <p style={{ textAlign: "center", width: "100%" }}>
            Loading sellers...
          </p>
        ) : displaySellers.length ? (
          <div className="store-grid">
            {displaySellers.map((s) => (
              <a
                key={s._id}
                href={`/seller?id=${s._id}`}
                className="store-card"
              >
                <img
                  src={s.logo || "/images/guy.png"}
                  alt={s.name}
                  className="store-avatar"
                />
                <h3 className="store-name">{s.name}</h3>
                <div className="store-stats">⭐ {s.rating || "0"}</div>
              </a>
            ))}
          </div>
        ) : (
          <div
            className="empty-state"
            style={{ margin: "4rem auto", textAlign: "center" }}
          >
            <img src="/images/empty.png" alt="No sellers" />
            <h3>No sellers found</h3>
            <p>Try another keyword or check back later.</p>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
