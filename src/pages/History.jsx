import React, { useState, useEffect } from "react";
import client from "../api/client";
import InvoiceModal from "../components/InvoiceModal";

const VIEW_MODES = ["Stock Log", "Sales History", "Revenue & Profit"];
const TYPE_FILTERS = ["All", "Sales", "Restock"];
const PERIOD_FILTERS = ["Today", "7 Days", "30 Days", "All"];

const STATUS_BADGE_CLASS = {
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  DUE: "bg-red-100 text-red-700",
};

function periodToDateRange(period) {
  if (period === "All") return {};
  const to = new Date();
  const from = new Date();
  if (period === "Today") from.setHours(0, 0, 0, 0);
  else if (period === "7 Days") from.setDate(from.getDate() - 7);
  else if (period === "30 Days") from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function History() {
  const [viewMode, setViewMode] = useState("Stock Log");
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ salesRevenue: 0, unitsSold: 0, unitsRestocked: 0 });
  const [typeFilter, setTypeFilter] = useState("All");
  const [period, setPeriod] = useState("30 Days");

  const [sales, setSales] = useState([]);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
  const [loadingSaleDetail, setLoadingSaleDetail] = useState(false);

  const [revenueData, setRevenueData] = useState({
    totalStockPurchaseCost: 0,
    totalRevenue: 0,
    totalDiscount: 0,
    totalBaseProfit: 0,
    totalNetProfit: 0,
    sales: [],
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadStockLog = async () => {
    const params = {};
    if (typeFilter === "Sales") params.type = "SALE";
    if (typeFilter === "Restock") params.type = "RESTOCK";
    Object.assign(params, periodToDateRange(period));

    const { data } = await client.get("/transactions/history", { params });
    setTransactions(data.transactions || []);
    setSummary(data.summary || { salesRevenue: 0, unitsSold: 0, unitsRestocked: 0 });
  };

  const loadSalesHistory = async () => {
    const params = {};
    const range = periodToDateRange(period);
    if (range.from) params.from = range.from;
    if (range.to) params.to = range.to;

    const { data } = await client.get("/sales", { params });
    setSales(data || []);
  };

  const loadRevenueProfit = async () => {
    const params = {};
    const range = periodToDateRange(period);
    if (range.from) params.from = range.from;
    if (range.to) params.to = range.to;

    const { data } = await client.get("/sales/analytics/revenue-profit", { params });
    setRevenueData({
      totalStockPurchaseCost: data.totalStockPurchaseCost || 0,
      totalRevenue: data.totalRevenue || 0,
      totalDiscount: data.totalDiscount || 0,
      totalBaseProfit: data.totalBaseProfit || 0,
      totalNetProfit: data.totalNetProfit || 0,
      sales: data.sales || [],
    });
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      if (viewMode === "Stock Log") await loadStockLog();
      else if (viewMode === "Sales History") await loadSalesHistory();
      else await loadRevenueProfit();
      setLoadError(null);
    } catch (error) {
      setLoadError(error?.friendlyMessage || "Could not load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, period, viewMode]);

  const handleOpenSale = async (saleId) => {
    setLoadingSaleDetail(true);
    try {
      const { data: detail } = await client.get(`/sales/${saleId}`);
      setSelectedSaleDetail(detail);
    } catch (error) {
      alert(error?.friendlyMessage || "Could not load invoice");
    } finally {
      setLoadingSaleDetail(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <h1 className="text-lg font-bold text-gray-900 mb-3">Sales Reports & Transaction History</h1>

      <div className="flex gap-2 mb-2.5">
        {VIEW_MODES.map((m) => (
          <button
            key={m}
            className={`flex-1 min-h-[40px] rounded-lg text-[13px] font-bold border ${
              viewMode === m ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-200 text-gray-700"
            }`}
            onClick={() => setViewMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {viewMode === "Stock Log" && (
        <div className="flex gap-2 mb-2.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              className={`flex-1 min-h-[38px] rounded-full text-[13px] font-semibold border ${
                typeFilter === f ? "bg-brand border-brand text-white" : "bg-white border-gray-200 text-gray-700"
              }`}
              onClick={() => setTypeFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        {PERIOD_FILTERS.map((p) => (
          <button
            key={p}
            className={`flex-1 min-h-[34px] rounded-full text-xs font-semibold ${
              period === p ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
            }`}
            onClick={() => setPeriod(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {viewMode === "Stock Log" && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <SummaryCard label="Sales Revenue" value={`৳${summary.salesRevenue.toFixed(2)}`} />
          <SummaryCard label="Units Sold" value={summary.unitsSold} />
          <SummaryCard label="Units Restocked" value={summary.unitsRestocked} />
        </div>
      )}

      {viewMode === "Revenue & Profit" && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <SummaryCard label="Stock Purchase Cost" value={`৳${revenueData.totalStockPurchaseCost.toFixed(2)}`} />
            <SummaryCard label="Total Revenue" value={`৳${revenueData.totalRevenue.toFixed(2)}`} />
            <SummaryCard
              label="Net Profit"
              value={`৳${revenueData.totalNetProfit.toFixed(2)}`}
              valueClass={revenueData.totalNetProfit < 0 ? "text-red-700" : ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <SummaryCard label="Total Discount Issued" value={`৳${revenueData.totalDiscount.toFixed(2)}`} />
            <SummaryCard
              label="Base Profit (pre-discount)"
              value={`৳${revenueData.totalBaseProfit.toFixed(2)}`}
              valueClass={revenueData.totalBaseProfit < 0 ? "text-red-700" : ""}
            />
          </div>
        </>
      )}

      {loadError && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 mb-3">
          <p className="text-red-800 text-sm">{loadError}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === "Stock Log" ? (
        transactions.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No transactions for this period</p>
        ) : (
          <div className="space-y-2.5">
            {transactions.map((item) => (
              <div key={item._id} className="flex justify-between bg-white rounded-xl p-3.5">
                <div className="min-w-0 mr-3">
                  <div className="flex items-start gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0 ${
                        item.type === "SALE" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {item.type}
                    </span>
                    <p className="text-[15px] font-semibold text-gray-900 break-words">{item.productName}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${item.type === "SALE" ? "text-red-500" : "text-emerald-500"}`}>
                    {item.type === "SALE" ? "-" : "+"}
                    {item.quantitySold} units
                  </p>
                  {item.type === "SALE" && <p className="text-emerald-500 font-bold text-sm mt-0.5">৳ {item.totalAmount.toFixed(2)}</p>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : viewMode === "Sales History" ? (
        sales.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No sales for this period</p>
        ) : (
          <div className="space-y-2.5">
            {sales.map((item) => (
              <button
                key={item._id}
                className="w-full flex justify-between bg-white rounded-xl p-3.5 text-left disabled:opacity-50"
                onClick={() => handleOpenSale(item._id)}
                disabled={loadingSaleDetail}
              >
                <div className="min-w-0 mr-3">
                  <div className="flex items-start gap-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0 ${STATUS_BADGE_CLASS[item.status]}`}>
                      {item.status}
                    </span>
                    <p className="text-[15px] font-semibold text-gray-900">{item.invoiceNumber}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.customer?.customerName || "Walk-in"} • {item.customer?.mobileNumber || ""}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">৳ {item.totalAmount.toFixed(2)}</p>
                  <p className="text-emerald-500 font-semibold text-sm mt-0.5">Paid ৳{item.paidAmount.toFixed(2)}</p>
                  {item.dueAmount > 0 && <p className="text-red-500 font-semibold text-sm mt-0.5">Due ৳{item.dueAmount.toFixed(2)}</p>}
                </div>
              </button>
            ))}
          </div>
        )
      ) : revenueData.sales.length === 0 ? (
        <p className="text-center text-gray-400 mt-10">No sales for this period</p>
      ) : (
        <div className="space-y-2.5">
          {revenueData.sales.map((item) => (
            <div key={item.saleId} className="bg-white rounded-2xl p-3.5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 mr-3">
                  <p className="text-[15px] font-semibold text-gray-900">{item.invoiceNumber}</p>
                  <p className="text-[13px] font-semibold text-gray-700 mt-1">
                    {item.customerName}
                    {!!item.mobileNumber && `  •  ${item.mobileNumber}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded flex-shrink-0 ${STATUS_BADGE_CLASS[item.status]}`}>
                  {item.status}
                </span>
              </div>

              <div className="h-px bg-gray-100 my-2.5" />

              {item.items.map((li, idx) => {
                const hasCost = li.avgCostAtSale !== undefined && li.avgCostAtSale !== null;
                return (
                  <div key={`${item.saleId}-${idx}`} className="mb-2.5">
                    <p className="text-sm font-bold text-gray-900">
                      {li.productName} <span className="text-xs font-semibold text-gray-500">× {li.quantity} pcs</span>
                    </p>
                    <div className="flex flex-wrap justify-between gap-2 mt-1">
                      {hasCost && <p className="text-xs text-gray-500">Avg Cost ৳{li.avgCostAtSale.toFixed(2)}</p>}
                      <p className="text-xs text-gray-500">Sell Price ৳{li.sellPrice.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 mt-1">
                      <p className="text-xs text-gray-500">Revenue ৳{li.itemRevenue.toFixed(2)}</p>
                      <p className={`text-xs font-bold ${li.itemBaseProfit < 0 ? "text-red-700" : "text-green-700"}`}>
                        Item {li.itemBaseProfit >= 0 ? "Profit" : "Loss"} ৳{Math.abs(li.itemBaseProfit).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}

              <div className="h-px bg-gray-100 my-2.5" />

              <Row label="Subtotal" value={`৳${item.subtotal.toFixed(2)}`} />
              {item.discount > 0 && <Row label="Discount" value={`- ৳${item.discount.toFixed(2)}`} valueClass="text-red-700" />}
              <Row label="Final Paid (Revenue)" value={`৳${item.revenue.toFixed(2)}`} />
              <Row label="Base Profit" value={`৳${item.baseProfit.toFixed(2)}`} valueClass={item.baseProfit < 0 ? "text-red-700" : ""} />
              <Row
                label={`Net ${item.profit >= 0 ? "Profit" : "Loss"} (after discount)`}
                value={`৳${Math.abs(item.profit).toFixed(2)}`}
                valueClass={item.profit >= 0 ? "text-green-700" : "text-red-700"}
              />
            </div>
          ))}
        </div>
      )}

      <InvoiceModal
        visible={!!selectedSaleDetail}
        sale={selectedSaleDetail?.sale}
        customer={selectedSaleDetail?.customer}
        lineItems={selectedSaleDetail?.lineItems?.map((t) => ({
          productId: t.productId,
          productName: t.productName,
          quantity: t.quantitySold,
          unitPrice: t.unitPrice,
          lineTotal: t.totalAmount,
          costPriceAtSale: t.costPriceAtSale,
        }))}
        payments={selectedSaleDetail?.payments}
        onClose={() => setSelectedSaleDetail(null)}
      />
    </div>
  );
}

function SummaryCard({ label, value, valueClass = "" }) {
  return (
    <div className="bg-white rounded-xl py-3 px-1.5 text-center min-h-[66px] flex flex-col justify-center">
      <p className="text-[11px] text-gray-500 mb-1">{label}</p>
      <p className={`text-[15px] font-bold text-gray-900 ${valueClass}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, valueClass = "" }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[13px] text-gray-500 font-semibold">{label}</span>
      <span className={`text-[15px] font-extrabold text-gray-900 ${valueClass}`}>{value}</span>
    </div>
  );
}
