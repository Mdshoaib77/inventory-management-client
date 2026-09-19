import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { PAYMENT_METHODS } from "../utils/customerType";

export default function AddPaymentModal({ visible, dueAmount, onClose, onConfirm }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount("");
      setMethod("Cash");
      setNote("");
      setSubmitting(false);
    }
  }, [visible]);

  const parsedAmount = parseFloat(amount);
  const isValid = Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= dueAmount;

  const handleConfirm = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onConfirm({ paymentAmount: parsedAmount, paymentMethod: method, paymentNote: note.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <h2 className="text-lg font-bold text-gray-900">Collect Payment</h2>
      <p className="text-sm text-red-700 font-semibold mt-2 mb-4">Current due: ৳{dueAmount?.toFixed(2) ?? "0.00"}</p>

      <label className="block text-sm text-gray-500 font-semibold mb-1.5">Payment amount</label>
      <input
        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base mb-1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        type="number"
        placeholder="e.g. 20000"
        autoFocus
      />
      {amount.trim() !== "" && !isValid && (
        <p className="text-red-500 text-xs mb-2">
          {parsedAmount > dueAmount ? "Cannot exceed the current due amount" : "Enter an amount greater than 0"}
        </p>
      )}

      <label className="block text-sm text-gray-500 font-semibold mb-1.5 mt-3">Payment method</label>
      <div className="flex flex-wrap gap-2 mb-4">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m}
            type="button"
            className={`px-3 py-2 rounded-full text-xs font-semibold ${
              method === m ? "bg-brand text-white" : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setMethod(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <label className="block text-sm text-gray-500 font-semibold mb-1.5">Note (optional)</label>
      <input
        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Advance payment received"
      />

      <div className="flex gap-3 mt-5">
        <button className="flex-1 py-3.5 rounded-lg bg-gray-100 text-gray-900 font-semibold" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
        <button
          className="flex-1 py-3.5 rounded-lg bg-emerald-500 text-white font-semibold disabled:opacity-50"
          onClick={handleConfirm}
          disabled={!isValid || submitting}
        >
          {submitting ? "Recording..." : "Record Payment"}
        </button>
      </div>
    </Modal>
  );
}
