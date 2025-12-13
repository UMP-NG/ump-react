import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

import Header from "../components/Navbar";
import Filters from "../components/Filters";
import TrendingCarousel from "../components/TrendingCarousel";
import ProductGrid from "../components/ProductGrid";
import QuickViewModal from "../components/QuickViewModal";
import Footer from "../components/Footer";
import "../styles/market.css";

export default function Market() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [quickView, setQuickView] = useState(null);

  useEffect(() => {
    apiFetch("/api/products")
      .then((res) => {
        setProducts(res.products || []);
        setFiltered(res.products || []);
      })
      .catch(() => setProducts([]));
  }, []);

  const handleSearch = async (query) => {
    if (!query) {
      setFiltered(products);
      return;
    }
    const res = await apiFetch(`/api/search/products?query=${query}`);
    setFiltered(res);
  };

  const applyFilters = async (params) => {
    const qs = new URLSearchParams(params).toString();
    const res = await apiFetch(`/api/products/filter?${qs}`);
    setFiltered(res);
  };

  return (
    <>
      <Header onSearch={handleSearch} />

      <Filters onApply={applyFilters} />

      <TrendingCarousel />

      <ProductGrid products={filtered} onQuickView={setQuickView} />

      {quickView && (
        <QuickViewModal
          product={quickView}
          onClose={() => setQuickView(null)}
        />
      )}

      <Footer />
    </>
  );
}
