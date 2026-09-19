import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import client from "../../api/client";
import CustomerTypeBadge from "../../components/CustomerTypeBadge";
import AddPaymentModal from "../../components/AddPaymentModal";
import ReminderModal from "../../components/ReminderModal";
import InvoiceModal from "../../components/InvoiceModal";
import { useCart } from "../../context/CartContext";

export default function CustomerProfile() {
  const { id: customerId } = useParams();
  const navigate = useNavigate();
  const { clearCart, setPresetCustomer } = useCart();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
  const [loadingSaleDetail, setLoadingSaleDetail] = useState(false);
  const [reminderVisible, setReminderVisible] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminder, setReminder] = useState(null);

  const loadProfile = async () => {
    try {
      const { data: profile } = await client.get(`/customers/${customerId}`);
      setData(profile);
    } catch (error) {
      alert(error?.friendlyMessage || "Could not load customer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleDelete = async () => {
    if (!window.confirm("This also removes their purchase and payment history. This cannot be undone. Continue?")) return;
    if (deleting) return;
    setDeleting(true);
    try {
      await client.delete(`/customers/${customerId}`);
      navigate("/customers");
    } catch (error) {
      alert(error?.friendlyMessage || "Could not delete customer");
    } finally {
      setDeleting(false);
    }
  };

  const handleCollectPayment = async ({ paymentAmount, paymentMethod, paymentNote }) => {
    try {
      await client.post(`/customers/${customerId}/payments`, { paymentAmount, paymentMethod, paymentNote });
      setPaymentModalVisible(false);
      loadProfile();
    } catch (error) {
      alert(error?.friendlyMessage || error?.response?.data?.message || "Could not record payment");
    }
  };

  const handleOpenReminder = async () => {
    setReminderVisible(true);
    setReminderLoading(true);
    try {
      const { data: r } = await client.get(`/customers/${customerId}/reminder`);
      setReminder(r);
    } catch (error) {
      alert(error?.friendlyMessage || "Could not prepare reminder");
      setReminderVisible(false);
    } finally {
      setReminderLoading(false);
    }
  };

  // "New Sale" starts the unified Cart -> Checkout flow pre-filled for
  // this customer — every purchase, from here or from Inventory/Scan,
  // goes through the same Checkout page.
  const handleStartNewSale = () => {
    clearCart();
    setPresetCustomer(data.customer);
    if (window.confirm(`Add products for ${data.customer.customerName} from Inventory or Scan, then Checkout.\n\nGo to Inventory now?`)) {
      navigate("/inventory");
    }
  };

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

  const mergedHistory = data
    ? [
        ...data.purchases.map((p) => ({ kind: "purchase", id: p._id, date: p.date, record: p })),
        ...data.sales.map((s) => ({ kind: "sale", id: s._id, date: s.date, record: s })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { customer, summary, payments } = data;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <button className="text-sm text-gray-500 mb-3" onClick={() => navigate(-1)}>
        ← Back
      </button>

      {/* Customer Information */}
      <div className="bg-white rounded-2xl p-4 mb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900">{customer.customerName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{customer.customerId}</p>
          </div>
          <CustomerTypeBadge type={customer.customerType} />
        </div>

        {!!customer.mobileNumber && <p className="text-sm text-gray-700 mt-2">📱 Mobile: {customer.mobileNumber}</p>}
        {!!customer.whatsappNumber && <p className="text-sm text-gray-700 mt-2">💬 WhatsApp: {customer.whatsappNumber}</p>}
        {!!customer.email && <p className="text-sm text-gray-700 mt-2">✉️ {customer.email}</p>}
        {!!customer.companyName && <p className="text-sm text-gray-700 mt-2">🏢 {customer.companyName}</p>}
        {!!customer.address && <p className="text-sm text-gray-700 mt-2">📍 {customer.address}</p>}

        <div className="flex gap-2 mt-3.5">
          <button
            className="flex-1 bg-gray-100 text-gray-700 font-bold text-[13px] py-3 rounded-lg"
            onClick={() => navigate(`/customers/edit/${customer._id}`, { state: { customer } })}
          >
            Edit
          </button>
          <button
            className="flex-1 bg-red-100 text-red-500 font-bold text-[13px] py-3 rounded-lg disabled:opacity-50"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Purchase Summary */}
      <div className="bg-white rounded-2xl p-4 mb-3">
        <h2 className="text-[15px] font-bold text-gray-900 mb-2.5">Purchase Summary</h2>
        <div className="grid grid-cols-2 gap-3">
          <SummaryCell label="Total Purchase" value={`৳${summary.totalPurchaseAmount.toFixed(2)}`} />
          <SummaryCell label="Paid" value={`৳${summary.totalPaidAmount.toFixed(2)}`} colorClass="text-green-700" />
          <SummaryCell
            label="Due"
            value={`৳${summary.totalDueAmount.toFixed(2)}`}
            colorClass={summary.totalDueAmount > 0 ? "text-red-700" : "text-green-700"}
          />
          <SummaryCell label="Purchases" value={summary.totalPurchases} />
        </div>
        <p className="text-xs text-gray-500 mt-3.5">
          Last Purchase: {summary.lastPurchaseDate ? new Date(summary.lastPurchaseDate).toLocaleDateString() : "—"}
        </p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <button className="bg-brand text-white font-bold text-[13px] py-3.5 rounded-xl" onClick={handleStartNewSale}>
          🛒 New Sale
        </button>
        <button
          className="bg-emerald-500 text-white font-bold text-[13px] py-3.5 rounded-xl disabled:opacity-50"
          onClick={() => setPaymentModalVisible(true)}
          disabled={summary.totalDueAmount <= 0}
        >
          💰 Collect Payment
        </button>
      </div>
      <button
        className="w-full mb-3 bg-amber-700 text-white font-bold text-[13px] py-3.5 rounded-xl disabled:opacity-50"
        onClick={handleOpenReminder}
        disabled={summary.totalDueAmount <= 0}
      >
        🔔 Send Reminder
      </button>

      {/* Purchase History */}
      <div className="bg-white rounded-2xl p-4 mb-3">
        <h2 className="text-[15px] font-bold text-gray-900 mb-2.5">Purchase History</h2>
        {mergedHistory.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-2">No purchases yet</p>
        ) : (
          mergedHistory.map((entry) =>
            entry.kind === "sale" ? (
              <button
                key={entry.id}
                className="w-full flex justify-between py-2.5 border-b border-gray-50 last:border-0 text-left disabled:opacity-50"
                onClick={() => handleOpenSale(entry.record._id)}
                disabled={loadingSaleDetail}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {entry.record.invoiceNumber}{" "}
                    <span className="text-[9px] font-extrabold text-brand bg-indigo-50 px-1.5 rounded">SALE</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(entry.record.date).toLocaleDateString()} • {entry.record.status}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-bold text-gray-900">৳{entry.record.totalAmount.toFixed(2)}</p>
                  <p className="text-[11px] text-brand mt-0.5">View →</p>
                </div>
              </button>
            ) : (
              <button
                key={entry.id}
                className="w-full flex justify-between py-2.5 border-b border-gray-50 last:border-0 text-left"
                onClick={() => setSelectedPurchase(entry.record)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{entry.record.productName}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {entry.record.invoiceNumber} • {new Date(entry.record.date).toLocaleDateString()} • Qty {entry.record.quantity}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-bold text-gray-900">৳{entry.record.totalAmount.toFixed(2)}</p>
                  <p className="text-[11px] text-brand mt-0.5">View →</p>
                </div>
              </button>
            )
          )
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl p-4 mb-6">
        <div className="flex justify-between items-center mb-2.5">
          <h2 className="text-[15px] font-bold text-gray-900">Payment History</h2>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
              summary.totalDueAmount > 0 ? "bg-amber-100 text-gray-700" : "bg-green-100 text-gray-700"
            }`}
          >
            {summary.totalPurchases === 0 ? "NO PURCHASES" : summary.totalDueAmount > 0 ? "PARTIAL" : "FULL PAID"}
          </span>
        </div>
        {payments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-2">No payments recorded yet</p>
        ) : (
          payments.map((pay) => (
            <div key={pay._id} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-gray-900">{new Date(pay.paymentDate).toLocaleDateString()}</p>
                {!!pay.paymentNote && <p className="text-[11px] text-gray-400 mt-0.5">{pay.paymentNote}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-700">Paid: ৳{pay.paymentAmount.toFixed(2)}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{pay.paymentMethod}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <AddPaymentModal
        visible={paymentModalVisible}
        dueAmount={summary.totalDueAmount}
        onClose={() => setPaymentModalVisible(false)}
        onConfirm={handleCollectPayment}
      />

      <ReminderModal visible={reminderVisible} loading={reminderLoading} reminder={reminder} onClose={() => setReminderVisible(false)} />

      <InvoiceModal purchase={selectedPurchase} visible={!!selectedPurchase} onClose={() => setSelectedPurchase(null)} />

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
        }))}
        payments={selectedSaleDetail?.payments}
        onClose={() => setSelectedSaleDetail(null)}
      />
    </div>
  );
}

function SummaryCell({ label, value, colorClass = "text-gray-900" }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${colorClass}`}>{value}</p>
    </div>
  );
}
