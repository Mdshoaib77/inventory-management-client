import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import StatusBadge from "../../components/StatusBadge";
import RestockModal from "../../components/RestockModal";
import SellModal from "../../components/SellModal";
import PurchaseHistoryModal from "../../components/PurchaseHistoryModal";
import { useCart } from "../../context/CartContext";
import { getStockStatus } from "../../utils/stockStatus";
import { Chip, FILTER_ICONS, SORT_ICONS, ACTION_ICONS } from "../../utils/inventoryIcons";

const STOCK_FILTERS = ["All", "In Stock", "Low Stock", "Out of Stock"];
const SORT_OPTIONS = ["Newest", "Name A-Z", "Quantity Low-High", "Price Low-High"];

export default function InventoryList() {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const [loading, setLoading] = useState(true);
  const [restockTarget, setRestockTarget] = useState(null);
  const [sellTarget, setSellTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const loadProducts = async () => {
    try {
      const { data } = await client.get("/products");
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err?.friendlyMessage || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    if (deletingId === id) return;
    setDeletingId(id);
    try {
      await client.delete(`/products/${id}`);
      loadProducts();
    } catch (err) {
      alert(err?.friendlyMessage || "Could not delete product");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestockConfirm = async (quantityAdded, purchasePrice) => {
    try {
      await client.post("/transactions/restock", {
        productId: restockTarget._id,
        quantityAdded,
        purchasePrice,
      });
      setRestockTarget(null);
      loadProducts();
    } catch (err) {
      alert(err?.friendlyMessage || "Could not add stock");
    }
  };

  const handleSellConfirm = (quantity) => {
    addItem(sellTarget, quantity);
    setSellTarget(null);
  };

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = products.filter((p) => {
      const matchesSearch =
        !q ||
        p.productName.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const status = getStockStatus(p);
      if (stockFilter === "In Stock") return status === "IN_STOCK";
      if (stockFilter === "Low Stock") return status === "LOW_STOCK";
      if (stockFilter === "Out of Stock") return status === "OUT_OF_STOCK";
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "Name A-Z":
          return a.productName.localeCompare(b.productName);
        case "Quantity Low-High":
          return a.quantity - b.quantity;
        case "Price Low-High": {
          const costA = a.avgCostPrice > 0 ? a.avgCostPrice : a.unitPrice;
          const costB = b.avgCostPrice > 0 ? b.avgCostPrice : b.unitPrice;
          return costA - costB;
        }
        case "Newest":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return list;
  }, [products, search, stockFilter, sortBy]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-4">
        <input
          className="flex-1 bg-white border border-gray-300 rounded-lg p-3 text-sm"
          placeholder="Search by name, category, or barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="hidden sm:flex bg-brand text-white rounded-lg px-5 py-3 font-semibold text-sm whitespace-nowrap"
          onClick={() => navigate("/inventory/add")}
        >
          + Add Product
        </button>
      </div>

      <div className="flex overflow-x-auto pb-1 mb-3 -mx-1 px-1">
        {STOCK_FILTERS.map((f) => (
          <Chip key={f} label={f} Icon={FILTER_ICONS[f]} selected={stockFilter === f} onClick={() => setStockFilter(f)} variant="filter" />
        ))}
      </div>

      <div className="flex overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {SORT_OPTIONS.map((s) => (
          <Chip key={s} label={s} Icon={SORT_ICONS[s]} selected={sortBy === s} onClick={() => setSortBy(s)} variant="sort" />
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
      ) : visibleProducts.length === 0 ? (
        <p className="text-center text-gray-400 mt-10">
          {products.length === 0 ? "No products yet. Add one!" : "No products match your search/filter."}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleProducts.map((item) => {
            const status = getStockStatus(item);
            const isDeleting = deletingId === item._id;
            const cost = item.avgCostPrice > 0 ? item.avgCostPrice : item.unitPrice;
            return (
              <div key={item._id} className="bg-white rounded-2xl p-3.5">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-[15px] break-words">{item.productName}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{item.category || "General"}</p>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="flex justify-between items-start mt-2.5 gap-1.5 flex-wrap">
                  <p className="text-sm text-gray-700">
                    Avg Cost: ৳{cost.toFixed(2)} × {item.quantity} pcs
                  </p>
                  <p className="text-sm font-bold text-gray-900">৳{(cost * item.quantity).toFixed(2)}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">Available: {item.quantity} pcs</p>
                {!!item.barcode && <p className="text-[11px] text-gray-400 mt-1">Barcode: {item.barcode}</p>}

                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-600 font-bold text-xs py-2.5 rounded-lg"
                      onClick={() => setRestockTarget(item)}
                    >
                      <ACTION_ICONS.stockIn size={16} /> Stock In
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50 text-brand font-bold text-xs py-2.5 rounded-lg disabled:opacity-50"
                      onClick={() => setSellTarget(item)}
                      disabled={status === "OUT_OF_STOCK"}
                    >
                      <ACTION_ICONS.sell size={16} /> Sell
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-600 font-bold text-xs py-2.5 rounded-lg"
                      onClick={() => navigate(`/inventory/edit/${item._id}`, { state: { product: item } })}
                    >
                      <ACTION_ICONS.edit size={16} /> Edit
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-100 text-red-500 font-bold text-xs py-2.5 rounded-lg disabled:opacity-50"
                      onClick={() => handleDelete(item._id)}
                      disabled={isDeleting}
                    >
                      <ACTION_ICONS.delete size={16} /> {isDeleting ? "..." : "Delete"}
                    </button>
                  </div>
                  <button
                    className="w-full flex items-center justify-center gap-1.5 bg-gray-100 text-gray-600 font-bold text-xs py-2.5 rounded-lg"
                    onClick={() => setHistoryTarget(item)}
                  >
                    <ACTION_ICONS.history size={16} /> Purchase History
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile-only floating add button (desktop has the header button) */}
      <button
        className="sm:hidden fixed right-5 bottom-24 w-14 h-14 rounded-full bg-brand text-white text-2xl flex items-center justify-center shadow-lg z-30"
        onClick={() => navigate("/inventory/add")}
      >
        +
      </button>

      <RestockModal
        visible={!!restockTarget}
        product={restockTarget}
        onClose={() => setRestockTarget(null)}
        onConfirm={handleRestockConfirm}
      />
      <SellModal visible={!!sellTarget} product={sellTarget} onClose={() => setSellTarget(null)} onConfirm={handleSellConfirm} />
      <PurchaseHistoryModal visible={!!historyTarget} product={historyTarget} onClose={() => setHistoryTarget(null)} />
    </div>
  );
}
