import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { useUser } from "./UserContext";

const WishlistContext = createContext({ ids: new Set(), listingIds: new Set(), toggle: async () => {}, toggleListing: async () => {} });

export function WishlistProvider({ children }) {
  const { user } = useUser();
  const [ids, setIds] = useState(new Set());
  const [listingIds, setListingIds] = useState(new Set());

  useEffect(() => {
    if (!user) { setIds(new Set()); setListingIds(new Set()); return; }
    apiFetch("/api/wishlist")
      .then((d) => {
        const items = d?.items || [];
        const listings = d?.listings || [];
        setIds(new Set(items.map((it) => (it._id || it).toString())));
        setListingIds(new Set(listings.map((l) => (l._id || l).toString())));
      })
      .catch(() => {});
  }, [user]);

  const toggle = useCallback(async (productId) => {
    const id = productId.toString();
    setIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    try {
      const d = await apiFetch(`/api/wishlist/${id}`, { method: "POST" });
      if (typeof d?.inWishlist === "boolean") {
        setIds((prev) => { const n = new Set(prev); d.inWishlist ? n.add(id) : n.delete(id); return n; });
      }
    } catch {
      setIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }
  }, []);

  const toggleListing = useCallback(async (listingId) => {
    const id = listingId.toString();
    setListingIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    try {
      const d = await apiFetch(`/api/wishlist/listing/${id}`, { method: "POST" });
      if (typeof d?.inWishlist === "boolean") {
        setListingIds((prev) => { const n = new Set(prev); d.inWishlist ? n.add(id) : n.delete(id); return n; });
      }
    } catch {
      setListingIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
      throw new Error("Failed to update");
    }
  }, []);

  return (
    <WishlistContext.Provider value={{ ids, listingIds, toggle, toggleListing }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
