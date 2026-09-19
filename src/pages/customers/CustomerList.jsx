import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import CustomerTypeBadge from "../../components/CustomerTypeBadge";
import { CUSTOMER_TYPES } from "../../utils/customerType";

const TYPE_FILTERS = ["All", ...CUSTOMER_TYPES];

export default function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCustomers = async () => {
    try {
      const { data } = await client.get("/customers");
      setCustomers(data);
      setError(null);
    } catch (err) {
      setError(err?.friendlyMessage || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const visibleCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesSearch =
        !q ||
        c.customerName.toLowerCase().includes(q) ||
        (c.customerId || "").toLowerCase().includes(q) ||
        (c.mobileNumber || "").toLowerCase().includes(q) ||
        (c.companyName || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (typeFilter === "All") return true;
      return c.customerType === typeFilter;
    });
  }, [customers, search, typeFilter]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-3">
        <input
          className="flex-1 bg-white border border-gray-300 rounded-lg p-3 text-sm"
          placeholder="Search by name, ID, phone, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="hidden sm:flex bg-brand text-white rounded-lg px-5 py-3 font-semibold text-sm whitespace-nowrap"
          onClick={() => navigate("/customers/add")}
        >
          + Add Customer
        </button>
      </div>

      <button
        className="w-full bg-red-50 border border-red-300 rounded-lg p-3 mb-3 text-red-700 font-semibold text-sm"
        onClick={() => navigate("/customers/due")}
      >
        📋 View Due Management
      </button>

      <div className="flex overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            className={`h-[34px] px-3.5 rounded-full text-[13px] font-semibold mr-2 flex-shrink-0 whitespace-nowrap ${
              typeFilter === f ? "bg-brand text-white" : "bg-white border border-gray-200 text-gray-700"
            }`}
            onClick={() => setTypeFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visibleCustomers.length === 0 ? (
        <p className="text-center text-gray-400 mt-10">
          {customers.length === 0 ? "No customers yet. Add one!" : "No customers match your search/filter."}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleCustomers.map((item) => (
            <button
              key={item._id}
              className="bg-white rounded-2xl p-3.5 text-left hover:shadow-sm transition-shadow"
              onClick={() => navigate(`/customers/${item._id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{item.customerName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.customerId}</p>
                </div>
                <CustomerTypeBadge type={item.customerType} />
              </div>
              {!!item.mobileNumber && <p className="text-xs text-gray-500 mt-1.5">📱 {item.mobileNumber}</p>}
              {!!item.companyName && <p className="text-xs text-gray-500 mt-1">🏢 {item.companyName}</p>}
              <div className="flex justify-between border-t border-gray-100 mt-2.5 pt-2.5">
                <p className="text-sm text-gray-700">{item.totalPurchases || 0} purchase(s)</p>
                <p className={`text-sm font-bold ${item.totalDueAmount > 0 ? "text-red-700" : "text-green-700"}`}>
                  {item.totalDueAmount > 0 ? `Due ৳${item.totalDueAmount.toFixed(2)}` : "No Due"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        className="sm:hidden fixed right-5 bottom-24 w-14 h-14 rounded-full bg-brand text-white text-2xl flex items-center justify-center shadow-lg z-30"
        onClick={() => navigate("/customers/add")}
      >
        +
      </button>
    </div>
  );
}
