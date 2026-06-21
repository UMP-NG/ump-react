import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { socket } from "../utils/socket";
import { useUser } from "./UserContext";

const CartContext = createContext({
  cartItems: new Map(),
  refreshCart: () => {},
  updateQty: async () => {},
  addToCart: async () => {},
});

export function CartProvider({ children }) {
  const { user } = useUser();
  // Map<cart-item _id string → item> — keyed by subdocument _id so two variants
  // of the same product are tracked as distinct entries.
  const [cartItems, setCartItems] = useState(new Map());

  const buildMap = (items) => {
    const m = new Map();
    for (const item of items) {
      const id = item._id?.toString();
      if (id) m.set(id, item);
    }
    return m;
  };

  const refreshCart = useCallback(() => {
    apiFetch("/api/cart")
      .then((d) => setCartItems(buildMap(d.items || [])))
      .catch(() => {}); // On transient error keep current state; sign-out clears via the user effect below
  }, []);

  // Reload cart when user signs in / out
  useEffect(() => {
    if (user) refreshCart();
    else setCartItems(new Map());
  }, [user, refreshCart]);

  // Listen for seller-applied negotiated price updates
  useEffect(() => {
    function onCartUpdated() { refreshCart(); }
    socket.on("cart_updated", onCartUpdated);
    return () => socket.off("cart_updated", onCartUpdated);
  }, [refreshCart]);

  async function updateQty(itemId, quantity) {
    // Optimistic update first — removes and qty changes feel instant
    setCartItems((prev) => {
      const m = new Map(prev);
      if (quantity < 1) {
        m.delete(itemId);
      } else {
        const item = m.get(itemId);
        if (item) m.set(itemId, { ...item, quantity });
      }
      return m;
    });

    try {
      if (quantity < 1) {
        await apiFetch(`/api/cart/remove/${itemId}`, { method: "DELETE" });
      } else {
        await apiFetch("/api/cart/update", { method: "PUT", body: { itemId, quantity } });
      }
    } catch (err) {
      refreshCart(); // revert to server state on failure
      throw err;
    }
  }

  async function addToCart(productId, quantity = 1, variants = {}) {
    // Optimistic add — key is a placeholder until the server confirms and refreshCart runs
    const optimisticKey = `optimistic:${productId}:${variants.selectedColor || ""}:${variants.selectedSize || ""}:${variants.selectedType || ""}`;

    setCartItems((prev) => {
      const m = new Map(prev);
      const existing = m.get(optimisticKey);
      if (existing) {
        m.set(optimisticKey, { ...existing, quantity: existing.quantity + quantity });
      } else {
        m.set(optimisticKey, { product: productId, quantity, price: 0, ...variants });
      }
      return m;
    });

    try {
      await apiFetch("/api/cart/add", { method: "POST", body: { productId, quantity, ...variants } });
      refreshCart();
    } catch (err) {
      refreshCart();
      throw err;
    }
  }

  return (
    <CartContext.Provider value={{ cartItems, refreshCart, updateQty, addToCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
