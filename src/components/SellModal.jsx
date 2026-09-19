import React, { useState, useEffect } from "react";
import Modal from "./Modal";

// Web equivalent of mobile/components/SellModal.js — "Add to Cart" from
// the Inventory list. Never completes a sale directly; only calls
// onConfirm(quantity), which adds the line to the shared cart. The actual
// sale/stock deduction happens once at Checkout.
export default function SellModal({ visible, product, onClose, onConfirm }) {
  const [qty, setQty] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setQty("");
      setSubmitting(false);
    }
  }, [visible]);

  if (!product) return null;

  const available = product.quantity;
  const parsedQty = parseInt(qty, 10);
  const isWholeNumberInput = /^\d+$/.test(qty.trim());
  const isValid = isWholeNumberInput && Number.isInteger(parsedQty) && parsedQty > 0 && parsedQty <= available;

  let errorMessage = "";
  if (qty.trim() !== "") {
    if (!isWholeNumberInput || !Number.isInteger(parsedQty) || parsedQty <= 0) {
      errorMessage = "Enter a whole number greater than 0.";
    } else if (parsedQty > available) {
      errorMessage = `Only ${available} unit${available === 1 ? "" : "s"} available.`;
    }
  }

  const handleConfirm = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(parsedQty);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <h2 className="text-lg font-bold text-gray-900">Add to Cart</h2>
      <p className="text-sm text-gray-700 mt-2 mb-3">{product.productName}</p>

      <div className="flex justify-between py-1 text-sm">
        <span className="text-gray-500">Available</span>
        <span className="text-gray-900 font-semibold">
          {available} unit{available === 1 ? "" : "s"}
        </span>
      </div>
      {!!product.avgCostPrice && (
        <div className="flex justify-between py-1 text-sm">
          <span className="text-gray-500">Average Cost</span>
          <span className="text-gray-900 font-semibold">৳{product.avgCostPrice.toFixed(2)}</span>
        </div>
      )}

      {available === 0 ? (
        <p className="text-red-700 bg-red-100 rounded-lg p-2.5 mt-3 text-sm font-semibold text-center">
          This product is out of stock.
        </p>
      ) : (
        <>
          <label className="block text-sm text-gray-500 font-semibold mt-3 mb-1.5">Quantity to sell</label>
          <input
            className={`w-full border rounded-lg px-3 py-3 text-base ${errorMessage ? "border-red-500" : "border-gray-300"}`}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            type="number"
            placeholder={`Max ${available}`}
            autoFocus
            disabled={submitting}
          />
          {errorMessage && <p className="text-red-700 text-xs mt-1.5">{errorMessage}</p>}
          {isValid && <p className="text-emerald-600 text-sm font-bold mt-2.5">Selling price is set at Checkout</p>}
        </>
      )}

      <div className="flex gap-3 mt-5">
        <button className="flex-1 py-3.5 rounded-lg bg-gray-100 text-gray-900 font-semibold" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button
          className="flex-1 py-3.5 rounded-lg bg-brand text-white font-semibold disabled:opacity-50"
          onClick={handleConfirm}
          disabled={!isValid || submitting || available === 0}
        >
          {submitting ? "Adding..." : "Add to Cart"}
        </button>
      </div>
    </Modal>
  );
}
