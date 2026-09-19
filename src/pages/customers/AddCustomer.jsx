import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import client from "../../api/client";
import { CUSTOMER_TYPES } from "../../utils/customerType";

export default function AddCustomer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEdit = !!id;
  const [existing, setExisting] = useState(location.state?.customer || null);
  const [loadingExisting, setLoadingExisting] = useState(isEdit && !location.state?.customer);

  const [customerName, setCustomerName] = useState(existing?.customerName || "");
  const [mobileNumber, setMobileNumber] = useState(existing?.mobileNumber || "");
  const [whatsappNumber, setWhatsappNumber] = useState(existing?.whatsappNumber || "");
  const [email, setEmail] = useState(existing?.email || "");
  const [address, setAddress] = useState(existing?.address || "");
  const [companyName, setCompanyName] = useState(existing?.companyName || "");
  const [customerType, setCustomerType] = useState(existing?.customerType || "New Customer");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit || existing) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await client.get(`/customers/${id}`);
        if (!cancelled) {
          const c = data.customer;
          setExisting(c);
          setCustomerName(c.customerName || "");
          setMobileNumber(c.mobileNumber || "");
          setWhatsappNumber(c.whatsappNumber || "");
          setEmail(c.email || "");
          setAddress(c.address || "");
          setCompanyName(c.companyName || "");
          setCustomerType(c.customerType || "New Customer");
        }
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setError("Customer name is required");
      return;
    }

    const payload = {
      customerName: trimmedName,
      mobileNumber: mobileNumber.trim(),
      whatsappNumber: whatsappNumber.trim(),
      email: email.trim(),
      address: address.trim(),
      companyName: companyName.trim(),
      customerType,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await client.put(`/customers/${existing?._id || id}`, payload);
      } else {
        await client.post("/customers", payload);
      }
      navigate(isEdit ? `/customers/${existing?._id || id}` : "/customers");
    } catch (err) {
      setError(err?.friendlyMessage || err?.response?.data?.message || "Could not save customer");
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8">
      <h1 className="text-xl font-bold text-gray-900 mb-4">{isEdit ? "Edit Customer" : "Add Customer"}</h1>

      {error && <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</p>}

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-5">
        <label className="block text-sm text-gray-500 font-semibold mt-2 mb-1.5">Customer Name *</label>
        <input
          className="w-full border border-gray-300 rounded-lg p-3 text-[15px]"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          disabled={saving}
        />

        <label className="block text-sm text-gray-500 font-semibold mt-4 mb-1.5">Mobile Number</label>
        <input
          className="w-full border border-gray-300 rounded-lg p-3 text-[15px]"
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
          type="tel"
          disabled={saving}
        />

        <label className="block text-sm text-gray-500 font-semibold mt-4 mb-1.5">WhatsApp Number</label>
        <input
          className="w-full border border-gray-300 rounded-lg p-3 text-[15px]"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          type="tel"
          placeholder="Leave blank if same as mobile"
          disabled={saving}
        />

        <label className="block text-sm text-gray-500 font-semibold mt-4 mb-1.5">Email Address</label>
        <input
          className="w-full border border-gray-300 rounded-lg p-3 text-[15px]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoCapitalize="none"
          disabled={saving}
        />

        <label className="block text-sm text-gray-500 font-semibold mt-4 mb-1.5">Address</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg p-3 text-[15px] min-h-[70px]"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={saving}
        />

        <label className="block text-sm text-gray-500 font-semibold mt-4 mb-1.5">Company Name</label>
        <input
          className="w-full border border-gray-300 rounded-lg p-3 text-[15px]"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          disabled={saving}
        />

        <label className="block text-sm text-gray-500 font-semibold mt-4 mb-2">Customer Type</label>
        <div className="flex flex-wrap gap-2">
          {CUSTOMER_TYPES.map((t) => (
            <button
              type="button"
              key={t}
              className={`px-3.5 py-2.5 rounded-full text-[13px] font-semibold ${
                customerType === t ? "bg-brand text-white" : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => setCustomerType(t)}
              disabled={saving}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            className="flex-1 py-3.5 rounded-lg bg-gray-100 text-gray-900 font-semibold"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="flex-1 py-3.5 rounded-lg bg-brand text-white font-semibold disabled:opacity-60" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update Customer" : "Save Customer"}
          </button>
        </div>
      </form>
    </div>
  );
}
