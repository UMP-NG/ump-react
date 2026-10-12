// Shared helper for computing what a product actually costs right now,
// honoring an active sale price (seller-set salePrice/saleEndsAt, or an
// admin Promotion that writes into the same fields) — the single source of
// truth so every checkout path (cart, bank-transfer checkout, etc.) agrees
// on the same discounted price instead of each re-deriving it separately.
export function effectivePrice(product) {
  if (
    product.salePrice != null &&
    product.salePrice >= 0 &&
    product.salePrice < product.price &&
    (!product.saleEndsAt || new Date(product.saleEndsAt) > new Date())
  ) {
    return product.salePrice;
  }
  return product.price;
}
