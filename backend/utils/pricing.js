// Shared helper for computing what a product actually costs right now,
// honoring an active sale price (seller-set salePrice/saleEndsAt, or an
// admin Promotion that writes into the same fields) — the single source of
// truth so every checkout path (cart, bank-transfer checkout, etc.) agrees
// on the same discounted price instead of each re-deriving it separately.
export function isOnSale(product) {
  return (
    product.salePrice != null &&
    product.salePrice >= 0 &&
    product.salePrice < product.price &&
    (!product.saleEndsAt || new Date(product.saleEndsAt) > new Date())
  );
}

export function effectivePrice(product) {
  return isOnSale(product) ? product.salePrice : product.price;
}

// What the SELLER should be paid for one unit right now — distinct from
// effectivePrice(), which is what the BUYER pays. A seller-set sale (no
// activePromotion) pays out at the same discounted price the buyer paid,
// same as always. An admin-created store Promotion writes into the exact
// same salePrice/saleEndsAt fields, but the seller never chose that discount
// — they're paid the full, undiscounted price, and the platform absorbs the
// gap between what the buyer paid and what the seller is owed.
export function payoutPrice(product) {
  if (isOnSale(product) && product.activePromotion) return product.price;
  return effectivePrice(product);
}
