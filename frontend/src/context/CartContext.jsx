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
      .catch(() => setCartItems(new Map()));
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
    try {
      if (quantity < 1) {
        await apiFetch(`/api/cart/remove/${productId}`, { method: "DELETE" });
        setCartItems((prev) => { const m = new Map(prev); m.delete(productId); return m; });
      } else {
        await apiFetch("/api/cart/update", { method: "PUT", body: { productId, quantity } });
        setCartItems((prev) => {
          const m = new Map(prev);
          const item = m.get(productId);
          if (item) m.set(productId, { ...item, quantity });
          return m;
        });
      }
    } catch (err) {
      refreshCart();
      throw err; // re-throw so callers can show an error toast
    }
  }

  async function addToCart(productId, quantity = 1) {
    const pid = productId.toString();

    // Optimistic update — reflect the addition immediately so the UI feels instant
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
      await apiFetch("/api/cart/add", { method: "POST", body: { productId, quantity } });
      refreshCart(); // background sync to get accurate price / server state
    } catch (err) {
      refreshCart(); // revert optimistic update to real server state
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
