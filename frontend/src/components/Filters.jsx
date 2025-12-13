import React, { useState } from "react";
import "../styles/market.css";

export default function Filters({ onFilterChange }) {
  const [activeSection, setActiveSection] = useState(null);

  const toggleSection = (section) =>
    setActiveSection(activeSection === section ? null : section);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    onFilterChange(name, value, checked);
  };

  return (
    <div className="filter-panel">
      <h3>Filter Options</h3>

      {/* Category */}
      <div
        className={`filter-section ${
          activeSection === "category" ? "active" : ""
        }`}
      >
        <button onClick={() => toggleSection("category")}>
          Category <i className="fas fa-chevron-down"></i>
        </button>
        <div className="options">
          {["Electronics", "Fashion", "Books", "Food", "Phones", "Others"].map(
            (cat) => (
              <label key={cat}>
                <input
                  type="checkbox"
                  name="category"
                  value={cat}
                  onChange={handleChange}
                />
                {cat}
              </label>
            )
          )}
        </div>
      </div>

      {/* Price */}
      <div
        className={`filter-section ${
          activeSection === "price" ? "active" : ""
        }`}
      >
        <button onClick={() => toggleSection("price")}>
          Price Range <i className="fas fa-chevron-down"></i>
        </button>
        <div className="options">
          {[
            { label: "Under $50", value: "under-50" },
            { label: "$50 - $100", value: "50-100" },
            { label: "$100 - $200", value: "100-200" },
            { label: "Above $200", value: "above-200" },
          ].map((p) => (
            <label key={p.value}>
              <input
                type="checkbox"
                name="price"
                value={p.value}
                onChange={handleChange}
              />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      {/* Condition */}
      <div
        className={`filter-section ${
          activeSection === "condition" ? "active" : ""
        }`}
      >
        <button onClick={() => toggleSection("condition")}>
          Condition <i className="fas fa-chevron-down"></i>
        </button>
        <div className="options">
          {["New", "Used", "Refurbished"].map((cond) => (
            <label key={cond}>
              <input
                type="checkbox"
                name="condition"
                value={cond.toLowerCase()}
                onChange={handleChange}
              />
              {cond}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
