import React, { createContext, useContext, useMemo, useState, useCallback } from "react";

const CartContext = createContext();

// One shared cart used by BOTH the Inventory "Sell" button and the Barcode
// Scanner, plus by Checkout to actually complete the sale. This mirrors
// mobile/context/CartContext.js exactly.
export const CartProvider = ({ children }) => {
  // items: [{ product, quantity, sellingPrice }]
  const [items, setItems] = useState([]);

  // Set when "New Sale" is started from a Customer's profile, so Checkout
  // can skip the mobile-number lookup and pre-fill the customer form.
  const [presetCustomer, setPresetCustomer] = useState(null);

  // Default selling price: a newly-added cart line defaults its selling
  // price to the product's current Weighted Average Cost Price
  // (avgCostPrice), falling back to unitPrice for legacy products with no
  // avgCostPrice ever recorded.
  const defaultSellingPrice = (product) => (product.avgCostPrice > 0 ? product.avgCostPrice : product.unitPrice);

  const addItem = useCallback((product, quantity) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((line) => line.product._id === product._id);
      if (existingIndex >= 0) {
        const next = [...prev];
        const newQty = next[existingIndex].quantity + quantity;
        next[existingIndex] = {
          ...next[existingIndex],
          product,
          quantity: Math.min(newQty, product.quantity),
        };
        return next;
      }
      return [...prev, { product, quantity: Math.min(quantity, product.quantity), sellingPrice: defaultSellingPrice(product) }];
    });
  }, []);

  const updateSellingPrice = useCallback((productId, sellingPrice) => {
    setItems((prev) => prev.map((line) => (line.product._id === productId ? { ...line, sellingPrice } : line)));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    setItems((prev) =>
      prev.map((line) => (line.product._id === productId ? { ...line, quantity } : line)).filter((line) => line.quantity > 0)
    );
  }, []);

  const incrementItem = useCallback((productId) => {
    setItems((prev) =>
      prev.map((line) =>
        line.product._id === productId ? { ...line, quantity: Math.min(line.quantity + 1, line.product.quantity) } : line
      )
    );
  }, []);

  const decrementItem = useCallback((productId) => {
    setItems((prev) =>
      prev
        .map((line) => (line.product._id === productId ? { ...line, quantity: line.quantity - 1 } : line))
        .filter((line) => line.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((line) => line.product._id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setPresetCustomer(null);
  }, []);

  const itemCount = useMemo(() => items.reduce((sum, l) => sum + l.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, l) => sum + l.sellingPrice * l.quantity, 0), [items]);

  const value = {
    items,
    addItem,
    updateQuantity,
    updateSellingPrice,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
    itemCount,
    subtotal,
    presetCustomer,
    setPresetCustomer,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
