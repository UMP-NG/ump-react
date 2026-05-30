import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch, getToken } from "../utils/api";
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
    if (!getToken()) { setCartItems(new Map()); return; }
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

  async function addToCart(productId) {
    await apiFetch("/api/cart/add", { method: "POST", body: { productId, quantity: 1 } });
    refreshCart();
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
