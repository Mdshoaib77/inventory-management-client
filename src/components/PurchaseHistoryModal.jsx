import React, { useState, useEffect } from "react";
import { Calendar, Archive, X } from "lucide-react";
import Modal from "./Modal";
import client from "../api/client";

export default function PurchaseHistoryModal({ visible, product, onClose }) {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible || !product) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await client.get("/transactions/history", {
          params: { type: "RESTOCK", productId: product._id },
        });
        if (!cancelled) setEntries(data.transactions || []);
      } catch (err) {
        if (!cancelled) setError(err?.friendlyMessage || "Could not load purchase history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [visible, product]);

  if (!product) return null;

  return (
    <Modal visible={visible} onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">Purchase History</h2>
          <p className="text-sm text-gray-500 mt-1">{product.productName}</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      <div className="flex gap-2.5 mt-4 mb-4">
        <div className="flex-1 rounded-xl bg-indigo-50 py-2.5 px-3">
          <p className="text-[11px] text-gray-500 font-semibold mb-0.5">Available</p>
          <p className="text-[15px] text-gray-900 font-extrabold">{product.quantity} pcs</p>
        </div>
        {!!product.avgCostPrice && (
          <div className="flex-1 rounded-xl bg-emerald-50 py-2.5 px-3">
            <p className="text-[11px] text-gray-500 font-semibold mb-0.5">Avg. Cost</p>
            <p className="text-[15px] text-gray-900 font-extrabold">৳{product.avgCostPrice.toFixed(2)}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : error ? (
        <p className="text-red-700 text-sm text-center py-4">{error}</p>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <Archive size={28} className="text-gray-300" />
          <p className="text-gray-400 text-sm">No stock-in records yet</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-80 overflow-y-auto">
          {entries.map((item) => {
            const unitPrice = item.purchasePrice ?? item.unitPrice;
            return (
              <div key={item._id} className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-brand text-xs font-bold px-2.5 py-1 rounded-full">
                    <Calendar size={12} /> {new Date(item.date).toLocaleDateString()}
                  </span>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    +{item.quantitySold} pcs
                  </span>
                </div>
                <div className="flex justify-between items-end mt-3">
                  <div>
                    <p className="text-[11px] text-gray-400 font-semibold mb-0.5">Unit price</p>
                    <p className="text-[15px] text-gray-900 font-bold">৳{unitPrice.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400 font-semibold mb-0.5">Total spent</p>
                    <p className="text-base text-emerald-600 font-extrabold">৳{item.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="w-full mt-4 py-3.5 rounded-xl bg-gray-100 text-gray-900 font-bold" onClick={onClose}>
        Close
      </button>
    </Modal>
  );
}
