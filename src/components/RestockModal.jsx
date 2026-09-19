import React, { useState, useEffect } from "react";
import Modal from "./Modal";

export default function RestockModal({ visible, product, onClose, onConfirm }) {
  const [qty, setQty] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setQty("");
      setPurchasePrice("");
      setSubmitting(false);
    }
  }, [visible]);

  if (!product) return null;

  const parsedQty = parseInt(qty, 10);
  const parsedPrice = parseFloat(purchasePrice);
  const isValid = Number.isInteger(parsedQty) && parsedQty > 0 && Number.isFinite(parsedPrice) && parsedPrice >= 0;

  const handleConfirm = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onConfirm(parsedQty, parsedPrice);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <h2 className="text-lg font-bold text-gray-900">Stock In</h2>
      <p className="text-sm text-gray-700 mt-2">{product.productName}</p>
      <p className="text-xs text-gray-500 mb-4">
        Current stock: {product.quantity}
        {!!product.avgCostPrice && `  •  Avg cost: ৳${product.avgCostPrice.toFixed(2)}`}
      </p>

      <label className="block text-sm text-gray-500 font-semibold mb-1.5">Quantity to add</label>
      <input
        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base mb-5"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        type="number"
        min="1"
        placeholder="e.g. 10"
        autoFocus
      />

      <label className="block text-sm text-gray-500 font-semibold mb-1.5">Purchase price (per unit)</label>
      <input
        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base mb-5"
        value={purchasePrice}
        onChange={(e) => setPurchasePrice(e.target.value)}
        type="number"
        min="0"
        step="0.01"
        placeholder="e.g. 2000"
      />

      <div className="flex gap-3">
        <button className="flex-1 py-3.5 rounded-lg bg-gray-100 text-gray-900 font-semibold" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button
          className="flex-1 py-3.5 rounded-lg bg-emerald-500 text-white font-semibold disabled:opacity-50"
          onClick={handleConfirm}
          disabled={!isValid || submitting}
        >
          {submitting ? "Adding..." : "Add Stock"}
        </button>
      </div>
    </Modal>
  );
}
