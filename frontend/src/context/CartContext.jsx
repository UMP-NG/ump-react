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
  // Map<productId string → { quantity, price, negotiatedPrice, negotiationId }>
  const [cartItems, setCartItems] = useState(new Map());

  const buildMap = (items) => {
    const m = new Map();
    for (const item of items) {
      const id = item.product?._id?.toString() || item.product?.toString();
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

  async function updateQty(productId, quantity) {
    // Optimistic update first — removes and qty changes feel instant
    setCartItems((prev) => {
      const m = new Map(prev);
      if (quantity < 1) {
        m.delete(productId);
      } else {
        const item = m.get(productId);
        if (item) m.set(productId, { ...item, quantity });
      }
      return m;
    });

    try {
      if (quantity < 1) {
        await apiFetch(`/api/cart/remove/${productId}`, { method: "DELETE" });
      } else {
        await apiFetch("/api/cart/update", { method: "PUT", body: { productId, quantity } });
      }
    } catch (err) {
      refreshCart(); // revert to server state on failure
      throw err;
    }
  }

  async function addToCart(productId, quantity = 1, variants = {}) {
    const pid = productId.toString();

    setCartItems((prev) => {
      const m = new Map(prev);
      const existing = m.get(pid);
      if (existing) {
        m.set(pid, { ...existing, quantity: existing.quantity + quantity });
      } else {
        m.set(pid, { product: productId, quantity, price: 0 });
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
