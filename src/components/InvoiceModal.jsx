import React, { useState } from "react";
import Modal from "./Modal";
import { useAuth } from "../context/AuthContext";
import { buildSaleInvoiceHtml, buildPurchaseInvoiceHtml, printHtml } from "../utils/invoiceHtml";

const STATUS_COLOR = {
  PAID: { bg: "#DCFCE7", text: "#15803D" },
  PARTIAL: { bg: "#FEF3C7", text: "#B45309" },
  DUE: { bg: "#FEE2E2", text: "#B91C1C" },
};

// Web port of mobile/components/InvoiceModal.js. Supports the same two
// shapes: a legacy single-line `purchase` record, or a full unified POS
// `sale` (+ customer, lineItems, payments).
//
// STRICT UI SEPARATION (unchanged from mobile): this is the
// CUSTOMER-facing invoice. It never renders AvgCost, Base Profit, or Net
// Profit even if the caller's lineItems/sale objects also carry
// costPriceAtSale/baseProfit/netProfit for internal bookkeeping.
export default function InvoiceModal({ visible, purchase, sale, customer, lineItems, payments, onClose }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!visible || (!purchase && !sale)) return null;

  const buildHtml = () =>
    sale
      ? buildSaleInvoiceHtml({ shop: user, sale, customer, lineItems, payments })
      : buildPurchaseInvoiceHtml({ shop: user, purchase });

  // printHtml is asynchronous: it has to render the invoice off-screen and
  // wait for fonts/layout before handing the document to the print dialog.
  // Awaiting it keeps the button disabled for exactly that window (instead of
  // a fixed 600ms guess) and surfaces a real failure instead of silently
  // doing nothing on mobile.
  const handlePrintOrDownload = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await printHtml(buildHtml());
    } catch (err) {
      console.error("Invoice print/PDF export failed:", err);
      alert("Could not open the invoice for printing. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sale) {
    const statusColors = STATUS_COLOR[sale.status] || STATUS_COLOR.DUE;
    return (
      <Modal visible={visible} onClose={onClose} maxWidth="max-w-lg">
        <p className="text-lg font-extrabold text-gray-900">{user?.shopName || "Invoice"}</p>
        {!!user?.shopAddress && <p className="text-xs text-gray-500 mt-0.5">{user.shopAddress}</p>}
        {!!user?.shopPhone && <p className="text-xs text-gray-500 mt-0.5">Phone: {user.shopPhone}</p>}

        <div className="h-px bg-gray-100 my-3.5" />

        <div className="flex justify-between items-start">
          <div>
            <p className="text-base font-bold text-gray-900">Invoice {sale.invoiceNumber}</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString()}
            </p>
          </div>
          <span
            className="text-[11px] font-extrabold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
          >
            {sale.status}
          </span>
        </div>

        <div className="h-px bg-gray-100 my-3.5" />

        <p className="text-xs text-gray-500 font-bold uppercase mb-1.5">Customer</p>
        <p className="text-[15px] font-bold text-gray-900">{customer?.customerName}</p>
        {!!customer?.mobileNumber && <p className="text-sm text-gray-700 mt-1">📱 {customer.mobileNumber}</p>}
        {!!customer?.address && <p className="text-sm text-gray-700 mt-1">📍 {customer.address}</p>}

        <div className="h-px bg-gray-100 my-3.5" />

        <p className="text-xs text-gray-500 font-bold uppercase mb-1.5">Products</p>
        {(lineItems || []).map((li) => (
          <div key={li.productId} className="flex justify-between items-start border-b border-gray-50 py-1.5">
            <div className="min-w-0 mr-3">
              <p className="text-sm font-bold text-gray-900">{li.productName}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Qty {li.quantity} × ৳{li.unitPrice}
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">৳{li.lineTotal.toFixed(2)}</p>
          </div>
        ))}

        <div className="h-px bg-gray-100 my-3.5" />

        <div className="flex justify-between py-1.5 text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-semibold text-gray-900">৳{sale.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-1.5 text-sm">
          <span className="text-gray-500">Discount</span>
          <span className="font-semibold text-gray-900">৳{sale.discount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="font-bold text-gray-900">Grand Total Payable</span>
          <span className="font-bold text-brand text-lg">৳{sale.totalAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-1.5 text-sm">
          <span className="text-gray-500">Paid</span>
          <span className="font-semibold text-green-700">৳{sale.paidAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-1.5 text-sm">
          <span className="text-gray-500">Due</span>
          <span className={`font-semibold ${sale.dueAmount > 0 ? "text-red-700" : "text-gray-900"}`}>
            ৳{sale.dueAmount.toFixed(2)}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">Payment Method: {sale.paymentMethod}</p>

        {!!payments?.length && (
          <>
            <div className="h-px bg-gray-100 my-3.5" />
            <p className="text-xs text-gray-500 font-bold uppercase mb-1.5">Payment History</p>
            {payments.map((p) => (
              <div key={p._id} className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-500">{new Date(p.paymentDate).toLocaleDateString()}</span>
                <span className="font-semibold text-gray-900">৳{p.paymentAmount.toFixed(2)}</span>
              </div>
            ))}
          </>
        )}

        <div className="flex gap-2 mt-4">
          <button className="flex-1 py-3.5 rounded-lg bg-gray-100 text-gray-900 font-semibold" onClick={onClose} disabled={busy}>
            Close
          </button>
          <button
            className="flex-[1.3] py-3.5 rounded-lg bg-brand text-white font-bold text-sm disabled:opacity-70"
            onClick={handlePrintOrDownload}
            disabled={busy}
          >
            {busy ? "Preparing..." : "Print / Save as PDF"}
          </button>
        </div>
      </Modal>
    );
  }

  // ---------------- Legacy single-line Purchase invoice ----------------
  return (
    <Modal visible={visible} onClose={onClose} maxWidth="max-w-lg">
      <p className="text-base font-bold text-gray-900">Invoice {purchase.invoiceNumber}</p>
      <p className="text-xs text-gray-400 mt-1">
        {new Date(purchase.date).toLocaleDateString()} {new Date(purchase.date).toLocaleTimeString()}
      </p>
      <div className="h-px bg-gray-100 my-3.5" />
      <p className="text-[15px] font-bold text-gray-900">{purchase.productName}</p>
      {!!purchase.productDetails && <p className="text-sm text-gray-500 mt-1">{purchase.productDetails}</p>}

      <div className="flex justify-between py-1.5 text-sm mt-2">
        <span className="text-gray-500">Quantity</span>
        <span className="font-semibold text-gray-900">{purchase.quantity}</span>
      </div>
      <div className="flex justify-between py-1.5 text-sm">
        <span className="text-gray-500">Unit Price</span>
        <span className="font-semibold text-gray-900">৳{purchase.unitPrice.toFixed(2)}</span>
      </div>
      <div className="flex justify-between py-1.5 text-sm">
        <span className="text-gray-500">Discount</span>
        <span className="font-semibold text-gray-900">৳{purchase.discount.toFixed(2)}</span>
      </div>

      <div className="h-px bg-gray-100 my-3.5" />

      <div className="flex justify-between py-1.5">
        <span className="font-bold text-gray-900">Total Amount</span>
        <span className="font-bold text-brand text-lg">৳{purchase.totalAmount.toFixed(2)}</span>
      </div>

      <div className="flex gap-2 mt-4">
        <button className="flex-1 py-3.5 rounded-lg bg-gray-100 text-gray-900 font-semibold" onClick={onClose} disabled={busy}>
          Close
        </button>
        <button
          className="flex-[1.3] py-3.5 rounded-lg bg-brand text-white font-bold text-sm disabled:opacity-70"
          onClick={handlePrintOrDownload}
          disabled={busy}
        >
          {busy ? "Preparing..." : "Print / Save as PDF"}
        </button>
      </div>
    </Modal>
  );
}
