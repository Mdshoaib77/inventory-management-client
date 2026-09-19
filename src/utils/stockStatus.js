// Single source of truth for stock status, matching backend + mobile:
//   OUT OF STOCK: quantity === 0
//   LOW STOCK:    quantity > 0 AND quantity <= minStockAlert
//   IN STOCK:     quantity > minStockAlert
export function getStockStatus(product) {
  if (product.quantity === 0) return "OUT_OF_STOCK";
  if (product.quantity <= product.minStockAlert) return "LOW_STOCK";
  return "IN_STOCK";
}

export const STOCK_STATUS_LABEL = {
  IN_STOCK: "In Stock",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
};

export const STOCK_STATUS_COLOR = {
  IN_STOCK: { bg: "#DCFCE7", text: "#15803D" },
  LOW_STOCK: { bg: "#FEF3C7", text: "#B45309" },
  OUT_OF_STOCK: { bg: "#FEE2E2", text: "#B91C1C" },
};
