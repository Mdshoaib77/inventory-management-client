import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadDashboard = async () => {
    try {
      const { data } = await client.get("/transactions/dashboard");
      setStats(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(error?.friendlyMessage || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      {loadError && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 mb-4">
          <p className="text-red-800 text-sm">{loadError}</p>
        </div>
      )}

      <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: "#4F46E5" }}>
        <p className="text-indigo-100 text-sm mb-1.5">Total Inventory Value</p>
        <p className="text-white text-3xl font-bold">৳ {stats?.totalInventoryValue?.toFixed(2) ?? "0.00"}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="Total Products" value={stats?.totalItems ?? 0} color="#10B981" />
        <StatCard label="Total Stock Units" value={stats?.totalStockUnits ?? 0} color="#F59E0B" />
        <StatCard label="Today's Revenue" value={`৳ ${stats?.dailyRevenue?.toFixed(2) ?? "0.00"}`} color="#3B82F6" />
        <StatCard label="Units Sold Today" value={stats?.dailyUnitsSold ?? 0} color="#8B5CF6" />
        <StatCard label="Low Stock Count" value={stats?.lowStockCount ?? 0} color="#B45309" />
        <StatCard label="Out of Stock Count" value={stats?.outOfStockCount ?? 0} color="#B91C1C" />
      </div>

      <div className="bg-white rounded-2xl p-4 mb-4">
        <h2 className="text-base font-bold text-gray-900 mb-2.5">⚠️ Low Stock Alerts</h2>
        {stats?.lowStockItems?.length ? (
          stats.lowStockItems.map((item) => (
            <div key={item._id} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
              <p className="text-sm text-gray-900">{item.productName}</p>
              <p className="text-sm text-red-600 font-semibold">{item.quantity} left</p>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-sm">No low stock items 🎉</p>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 mb-4">
        <h2 className="text-base font-bold text-gray-900 mb-2.5">🕘 Recent Activity</h2>
        {stats?.recentActivity?.length ? (
          stats.recentActivity.map((t) => (
            <div key={t._id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
              <div className="min-w-0 mr-3">
                <p className="text-sm font-semibold text-gray-900 truncate">{t.productName}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {new Date(t.date).toLocaleDateString()} {new Date(t.date).toLocaleTimeString()}
                </p>
              </div>
              <p className={`font-bold text-sm ${t.type === "SALE" ? "text-red-500" : "text-emerald-500"}`}>
                {t.type === "SALE" ? `-${t.quantitySold}` : `+${t.quantitySold}`}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-sm">No activity yet</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          className="bg-gray-900 text-white rounded-xl py-4 font-semibold"
          onClick={() => navigate("/scan")}
        >
          📷 Scan & Sell
        </button>
        <button
          className="bg-gray-900 text-white rounded-xl py-4 font-semibold"
          onClick={() => navigate("/inventory/add")}
        >
          ➕ Add Product
        </button>
      </div>
      <button
        className="w-full mt-3 bg-brand text-white rounded-xl py-4 font-semibold"
        onClick={() => navigate("/inventory")}
      >
        📦 Stock In (via Inventory)
      </button>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: color }}>
      <p className="text-white text-xs opacity-90 mb-1.5">{label}</p>
      <p className="text-white text-xl font-bold">{value}</p>
    </div>
  );
}
