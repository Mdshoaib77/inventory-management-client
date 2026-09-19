import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";

const FILTERS = [
  { key: "all", label: "All Due" },
  { key: "today", label: "Today's Due" },
  { key: "month", label: "This Month" },
  { key: "old", label: "Old Due" },
  { key: "paid", label: "Paid" },
];

export default function DueManagement() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [customers, setCustomers] = useState([]);
  const [totalDue, setTotalDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadDueList = async () => {
    try {
      const { data } = await client.get("/customers/due/list", { params: { filter } });
      setCustomers(data.customers || []);
      setTotalDue(data.totalDue || 0);
      setLoadError(null);
    } catch (error) {
      setLoadError(error?.friendlyMessage || "Could not load due list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDueList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <h1 className="text-lg font-bold text-gray-900 mb-3">Due Management</h1>

      <div className="flex gap-1.5 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`flex-1 min-h-[38px] px-1.5 rounded-full text-[11px] font-semibold ${
              filter === f.key ? "bg-brand text-white" : "bg-white border border-gray-200 text-gray-700"
            }`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 mb-4">
        <p className="text-gray-300 text-xs">Total in this view</p>
        <p className="text-white text-2xl font-bold mt-1">৳{totalDue.toFixed(2)}</p>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 mb-3">
          <p className="text-red-800 text-sm">{loadError}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <p className="text-center text-gray-400 mt-10">No customers in this view</p>
      ) : (
        <div className="space-y-2.5">
          {customers.map((item) => (
            <button
              key={item._id}
              className="w-full flex justify-between items-center bg-white rounded-xl p-3.5 text-left"
              onClick={() => navigate(`/customers/${item._id}`)}
            >
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate">{item.customerName}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {item.customerId}
                  {item.lastPurchaseDate ? ` • Last purchase ${new Date(item.lastPurchaseDate).toLocaleDateString()}` : ""}
                </p>
              </div>
              <p className={`font-bold ${item.totalDueAmount > 0 ? "text-red-700" : "text-green-700"} whitespace-nowrap ml-3`}>
                ৳{item.totalDueAmount.toFixed(2)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
