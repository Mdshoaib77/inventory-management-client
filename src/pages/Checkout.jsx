import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import client from "../api/client";
import { useCart } from "../context/CartContext";
import { CUSTOMER_TYPES, PAYMENT_METHODS } from "../utils/customerType";
import InvoiceModal from "../components/InvoiceModal";

export default function Checkout() {
  const navigate = useNavigate();
  const { items, incrementItem, decrementItem, removeItem, updateSellingPrice, clearCart, subtotal, presetCustomer } = useCart();

  const [customerName, setCustomerName] = useState(presetCustomer?.customerName || "");
  const [mobileNumber, setMobileNumber] = useState(presetCustomer?.mobileNumber || "");
  const [whatsappNumber, setWhatsappNumber] = useState(presetCustomer?.whatsappNumber || "");
  const [email, setEmail] = useState(presetCustomer?.email || "");
  const [address, setAddress] = useState(presetCustomer?.address || "");
  const [companyName, setCompanyName] = useState(presetCustomer?.companyName || "");
  const [customerType, setCustomerType] = useState(presetCustomer?.customerType || "New Customer");

  const [discount, setDiscount] = useState("0");
  const [paymentMode, setPaymentMode] = useState("Full");
  const [partialAmount, setPartialAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentNote, setPaymentNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  const discountNum = Number(discount) || 0;
  const totalAmount = Math.max(0, subtotal - discountNum);
  const paidAmount = paymentMode === "Full" ? totalAmount : Number(partialAmount) || 0;
  const dueAmount = Math.max(0, totalAmount - paidAmount);

  const totalCost = useMemo(() => items.reduce((sum, l) => sum + (l.product.avgCostPrice || 0) * l.quantity, 0), [items]);
  const baseProfit = subtotal - totalCost;
  const netProfit = baseProfit - discountNum;

  const validationError = useMemo(() => {
    if (items.length === 0) return "Your cart is empty.";
    if (!customerName.trim()) return "Customer name is required.";
    if (!mobileNumber.trim()) return "Mobile number is required.";
    const invalidPriceLine = items.find((l) => !Number.isFinite(Number(l.sellingPrice)) || Number(l.sellingPrice) < 0);
    if (invalidPriceLine) return `Enter a valid selling price for ${invalidPriceLine.product.productName}.`;
    if (discountNum < 0) return "Discount cannot be negative.";
    if (discountNum > subtotal) return "Discount cannot be greater than the subtotal.";
    if (paymentMode === "Partial") {
      if (partialAmount.trim() === "" || !Number.isFinite(Number(partialAmount)) || Number(partialAmount) <= 0) {
        return "Enter a valid partial payment amount.";
      }
      if (Number(partialAmount) > totalAmount) return "Payment amount cannot exceed the total amount.";
    }
    return null;
  }, [items, customerName, mobileNumber, discountNum, subtotal, paymentMode, partialAmount, totalAmount]);

  const handleCompleteSale = async () => {
    if (validationError) {
      alert(validationError);
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        items: items.map((line) => ({
          productId: line.product._id,
          quantity: line.quantity,
          sellingPrice: Number(line.sellingPrice),
        })),
        customer: {
          customerName: customerName.trim(),
          mobileNumber: mobileNumber.trim(),
          whatsappNumber: whatsappNumber.trim(),
          email: email.trim(),
          address: address.trim(),
          companyName: companyName.trim(),
          customerType,
        },
        discount: discountNum,
        paidAmount,
        paymentMethod,
        paymentNote: paymentNote.trim(),
      };

      const { data } = await client.post("/sales/checkout", payload);
      setCompletedSale(data);
    } catch (error) {
      alert(error?.friendlyMessage || error?.response?.data?.message || "Could not complete the sale.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseInvoice = () => {
    setCompletedSale(null);
    clearCart();
    navigate(-1);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 pb-10">
      {/* ---------------- Cart ---------------- */}
      <h2 className="text-[15px] font-bold text-gray-900 mb-2">Cart</h2>
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl p-4 mb-4">
          <p className="text-gray-400 text-sm text-center py-3">Your cart is empty. Go back and add products from Inventory or Scan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 mb-4">
          {items.map((line) => {
            const avgCost = line.product.avgCostPrice || 0;
            const priceNum = Number(line.sellingPrice);
            const priceIsValid = Number.isFinite(priceNum) && priceNum >= 0;
            const profitPerUnit = priceIsValid ? priceNum - avgCost : null;
            const lineTotal = priceIsValid ? priceNum * line.quantity : 0;
            const lineProfit = profitPerUnit !== null ? profitPerUnit * line.quantity : null;

            return (
              <div key={line.product._id} className="py-2.5 border-b border-gray-100 last:border-0">
                <div className="flex items-start">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm font-semibold text-gray-900">{line.product.productName}</p>
                    {avgCost > 0 && <p className="text-[11px] text-gray-400 mt-0.5">Avg cost: ৳{avgCost.toFixed(2)}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 mx-2 flex-shrink-0">
                    <button
                      className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center"
                      onClick={() => decrementItem(line.product._id)}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold text-gray-900 min-w-[20px] text-center">{line.quantity}</span>
                    <button
                      className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center disabled:opacity-40"
                      onClick={() => incrementItem(line.product._id)}
                      disabled={line.quantity >= line.product.quantity}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button className="p-1 flex-shrink-0" onClick={() => removeItem(line.product._id)}>
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>

                <div className="flex justify-between items-end mt-2">
                  <div className="flex-shrink-0">
                    <p className="text-[11px] text-gray-500 mb-1">Selling price / unit</p>
                    <input
                      className={`border rounded-lg py-1.5 px-2.5 text-sm font-semibold w-28 ${
                        priceIsValid ? "border-gray-300" : "border-red-500"
                      }`}
                      value={String(line.sellingPrice)}
                      onChange={(e) => updateSellingPrice(line.product._id, e.target.value === "" ? "" : Number(e.target.value))}
                      type="number"
                      step="0.01"
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-bold text-gray-900">৳{lineTotal.toFixed(2)}</p>
                    {profitPerUnit !== null && (
                      <p className={`text-[11px] font-semibold mt-0.5 ${profitPerUnit < 0 ? "text-red-700" : "text-green-700"}`}>
                        {profitPerUnit >= 0 ? "Profit" : "Loss"}: ৳{Math.abs(profitPerUnit).toFixed(2)}/unit
                      </p>
                    )}
                    {lineProfit !== null && (
                      <p className={`text-[11px] font-semibold mt-0.5 ${lineProfit < 0 ? "text-red-700" : "text-green-700"}`}>
                        Total {lineProfit >= 0 ? "Profit" : "Loss"}: ৳{Math.abs(lineProfit).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="h-px bg-gray-100 my-2.5" />

          <Row label="Subtotal" value={`৳${subtotal.toFixed(2)}`} />
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-gray-500">Discount</span>
            <input
              className="border border-gray-300 rounded-lg py-1.5 px-2.5 text-[13px] w-24 text-right"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              type="number"
            />
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-[15px] font-bold text-gray-900">Total</span>
            <span className="text-lg font-extrabold text-brand">৳{totalAmount.toFixed(2)}</span>
          </div>

          <div className="h-px bg-gray-100 my-2.5" />

          <Row label="Base Profit (before discount)" value={`৳${baseProfit.toFixed(2)}`} valueClass={baseProfit < 0 ? "text-red-700" : ""} />
          <div className="flex justify-between py-1">
            <span className="text-[13px] font-bold text-gray-900">Net Profit (after discount)</span>
            <span className={`text-sm font-bold ${netProfit < 0 ? "text-red-700" : "text-green-700"}`}>৳{netProfit.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* ---------------- Customer Information ---------------- */}
      <h2 className="text-[15px] font-bold text-gray-900 mb-2">Customer Information</h2>
      <div className="bg-white rounded-2xl p-4 mb-4">
        {presetCustomer && (
          <p className="text-xs text-brand bg-indigo-50 rounded-lg p-2 mb-2.5">
            Pre-filled for {presetCustomer.customerName}. Edit if needed.
          </p>
        )}
        <Field label="Customer Name *" value={customerName} onChange={setCustomerName} placeholder="e.g. Rahim Ahmed" />
        <Field label="Mobile Number *" value={mobileNumber} onChange={setMobileNumber} placeholder="e.g. 01700000000" type="tel" />
        <p className="text-[11px] text-gray-400 -mt-3 mb-3">
          If this number matches an existing customer, their profile will be used automatically — no duplicate will be created.
        </p>
        <Field label="WhatsApp Number" value={whatsappNumber} onChange={setWhatsappNumber} type="tel" />
        <Field label="Email Address" value={email} onChange={setEmail} type="email" />
        <label className="block text-sm text-gray-500 font-semibold mt-3 mb-1.5">Address</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg p-3 text-[15px] min-h-[60px] mb-1"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Field label="Company Name" value={companyName} onChange={setCompanyName} />

        <label className="block text-sm text-gray-500 font-semibold mt-3 mb-2">Customer Type</label>
        <div className="flex flex-wrap gap-2">
          {CUSTOMER_TYPES.map((t) => (
            <button
              key={t}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold ${customerType === t ? "bg-brand text-white" : "bg-gray-100 text-gray-700"}`}
              onClick={() => setCustomerType(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- Payment ---------------- */}
      <h2 className="text-[15px] font-bold text-gray-900 mb-2">Payment</h2>
      <div className="bg-white rounded-2xl p-4 mb-4">
        <div className="flex gap-2.5 mb-3">
          <button
            className={`flex-1 py-3 rounded-lg font-bold text-[13px] ${paymentMode === "Full" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
            onClick={() => setPaymentMode("Full")}
          >
            Full Payment
          </button>
          <button
            className={`flex-1 py-3 rounded-lg font-bold text-[13px] ${paymentMode === "Partial" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
            onClick={() => setPaymentMode("Partial")}
          >
            Partial Payment
          </button>
        </div>

        {paymentMode === "Partial" && (
          <Field
            label="Amount received now"
            value={partialAmount}
            onChange={setPartialAmount}
            type="number"
            placeholder={`Max ৳${totalAmount.toFixed(2)}`}
          />
        )}

        <label className="block text-sm text-gray-500 font-semibold mt-1 mb-2">Payment Method</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold ${paymentMethod === m ? "bg-brand text-white" : "bg-gray-100 text-gray-700"}`}
              onClick={() => setPaymentMethod(m)}
            >
              {m}
            </button>
          ))}
        </div>

        <Field label="Note (optional)" value={paymentNote} onChange={setPaymentNote} placeholder="e.g. Advance received" />

        <div className="h-px bg-gray-100 my-2.5" />
        <Row label="Paying now" value={`৳${paidAmount.toFixed(2)}`} />
        <Row label="Due after this sale" value={`৳${dueAmount.toFixed(2)}`} valueClass={dueAmount > 0 ? "text-red-700" : ""} />
      </div>

      {!!validationError && items.length > 0 && (
        <p className="bg-red-100 text-red-800 text-xs rounded-lg p-2.5 mb-3 text-center">{validationError}</p>
      )}

      <button
        className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl disabled:opacity-50"
        onClick={handleCompleteSale}
        disabled={!!validationError || submitting}
      >
        {submitting ? "Processing..." : `Complete Sale — ৳${totalAmount.toFixed(2)}`}
      </button>

      <InvoiceModal
        visible={!!completedSale}
        sale={completedSale?.sale}
        customer={completedSale?.customer}
        lineItems={completedSale?.lineItems}
        payments={completedSale?.payment ? [completedSale.payment] : []}
        onClose={handleCloseInvoice}
      />
    </div>
  );
}

function Row({ label, value, valueClass = "" }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-bold text-gray-900 ${valueClass}`}>{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <>
      <label className="block text-sm text-gray-500 font-semibold mt-3 mb-1.5">{label}</label>
      <input
        className="w-full border border-gray-300 rounded-lg p-3 text-[15px] mb-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
      />
    </>
  );
}
