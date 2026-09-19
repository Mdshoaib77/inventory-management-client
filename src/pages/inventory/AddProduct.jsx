import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { Camera, Loader2, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import client from "../../api/client";
import BarcodeScannerModal from "../../components/BarcodeScannerModal";
import { normalizeBarcode, isGtinCandidate } from "../../utils/barcode";

export default function AddProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEdit = !!id;
  const [existing, setExisting] = useState(location.state?.product || null);
  const [loadingExisting, setLoadingExisting] = useState(isEdit && !location.state?.product);

  // A barcode scanned on the Sales screen for a product that doesn't exist
  // yet is handed over through router state, so the user never has to
  // re-scan or retype it after tapping "Add New Product".
  const prefilledBarcode = normalizeBarcode(location.state?.barcode || "");

  const [productName, setProductName] = useState(existing?.productName || "");
  const [barcode, setBarcode] = useState(existing?.barcode || prefilledBarcode);

  // Barcode lookup state. `lookupStatus` drives a single status strip
  // under the barcode field so the user always knows what the app is
  // doing with the code they just scanned.
  //   idle | searching | local-found | filled | no-data | error
  const [lookupStatus, setLookupStatus] = useState("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const [conflictProduct, setConflictProduct] = useState(null);
  const [externalImage, setExternalImage] = useState("");
  const [externalSource, setExternalSource] = useState("");
  const [category, setCategory] = useState(existing?.category || "");
  const [unitCost, setUnitCost] = useState(existing ? String(existing.unitPrice) : "");
  const [quantity, setQuantity] = useState(existing ? String(existing.quantity) : "");
  const [minStockAlert, setMinStockAlert] = useState(existing ? String(existing.minStockAlert) : "5");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  // Direct navigation to /inventory/edit/:id (page refresh, bookmarked
  // link) won't have router state — fall back to fetching the product by
  // id via GET /products then filtering, since there's no GET /products/:id
  // route on the backend (kept as-is, unchanged contract).
  useEffect(() => {
    if (!isEdit || existing) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await client.get("/products");
        const found = data.find((p) => p._id === id);
        if (!cancelled && found) {
          setExisting(found);
          setProductName(found.productName);
          setBarcode(found.barcode || "");
          setCategory(found.category || "");
          setUnitCost(String(found.unitPrice));
          setQuantity(String(found.quantity));
          setMinStockAlert(String(found.minStockAlert));
        }
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // ---------------------------------------------------------------
  // Barcode resolution pipeline
  // ---------------------------------------------------------------
  // Order matters and is deliberate:
  //   1. OWN DATABASE FIRST — always. If the merchant already stocks this
  //      product we must surface it and refuse to create a duplicate,
  //      and we must do it without any dependency on the internet.
  //   2. Only when it is genuinely new do we ask an external product
  //      database to pre-fill the form. That call is best-effort: any
  //      failure silently degrades to normal manual entry.
  // Never run while editing an existing product — the user is correcting
  // that record, not creating one.
  const runBarcodeLookup = async (rawCode) => {
    const code = normalizeBarcode(rawCode);
    setConflictProduct(null);
    setExternalImage("");
    setExternalSource("");

    if (!code) {
      setLookupStatus("idle");
      setLookupMessage("");
      return;
    }
    if (isEdit) {
      setLookupStatus("idle");
      setLookupMessage("");
      return;
    }

    setLookupStatus("searching");
    setLookupMessage("Checking your inventory...");

    // --- Step 1: this merchant's own catalogue -----------------------
    try {
      const { data: owned } = await client.get(`/products/barcode/${encodeURIComponent(code)}`);
      setConflictProduct(owned);
      setLookupStatus("local-found");
      setLookupMessage(`This barcode is already registered to "${owned.productName}".`);
      return;
    } catch (err) {
      // A 404 is the expected, healthy "this is a new product" path.
      // Anything else (offline, 500, timeout) means we could not verify
      // locally — say so plainly and stop, rather than silently calling
      // a third party or pretending the barcode is new.
      if (err?.response?.status !== 404) {
        setLookupStatus("error");
        setLookupMessage(
          err?.friendlyMessage || "Could not check your inventory right now. You can still enter the product manually."
        );
        return;
      }
    }

    // --- Step 2: optional external enrichment ------------------------
    // Skipped entirely for alphanumeric/internal labels, which are never
    // present in public GTIN databases.
    if (!isGtinCandidate(code)) {
      setLookupStatus("no-data");
      setLookupMessage("New barcode. Enter the product details below.");
      return;
    }

    setLookupMessage("Looking up product information...");
    try {
      const { data: info } = await client.get(`/products/lookup/${encodeURIComponent(code)}`);

      // Only ever FILL BLANKS. Anything the user has already typed wins —
      // auto-fill must never overwrite a human decision.
      let filledCount = 0;
      setProductName((prev) => {
        if (prev.trim() || !info.productName) return prev;
        filledCount += 1;
        return info.productName;
      });
      setCategory((prev) => {
        if (prev.trim() || !info.category) return prev;
        filledCount += 1;
        return info.category;
      });

      if (info.imageUrl) setExternalImage(info.imageUrl);
      setExternalSource(info.source || "an external product database");

      setLookupStatus("filled");
      setLookupMessage(
        filledCount > 0
          ? `Found "${info.productName}". Check the details and add your cost and quantity.`
          : `Found "${info.productName}" — your entries were kept.`
      );
    } catch (err) {
      // 409 means the server found it in our own DB after all (race with
      // another device). Treat it as the local-found case.
      if (err?.response?.status === 409 && err.response.data?.product) {
        const owned = err.response.data.product;
        setConflictProduct(owned);
        setLookupStatus("local-found");
        setLookupMessage(`This barcode is already registered to "${owned.productName}".`);
        return;
      }
      // Everything else — no match, provider down, offline, timeout —
      // is the same outcome for the user: type it in yourself.
      setLookupStatus("no-data");
      setLookupMessage("No public information found for this barcode. Enter the product details below.");
    }
  };

  // Run the lookup once on mount when a barcode arrived from the Sales
  // screen, so the user lands on a form that is already working for them.
  useEffect(() => {
    if (!isEdit && prefilledBarcode) {
      runBarcodeLookup(prefilledBarcode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedName = productName.trim();
    const costNum = parseFloat(unitCost);
    const qtyNum = parseInt(quantity, 10);
    const alertNum = minStockAlert.trim() === "" ? 5 : parseInt(minStockAlert, 10);

    if (!trimmedName) {
      setError("Product name is required");
      return;
    }
    if (unitCost.trim() === "" || !Number.isFinite(costNum) || costNum < 0) {
      setError("Unit Purchase Cost must be a number 0 or greater");
      return;
    }
    if (quantity.trim() === "" || !Number.isFinite(qtyNum) || qtyNum < 0) {
      setError("Quantity must be a number 0 or greater");
      return;
    }
    if (!Number.isFinite(alertNum) || alertNum < 0) {
      setError("Minimum stock alert must be a number 0 or greater");
      return;
    }

    const payload = {
      productName: trimmedName,
      barcode: normalizeBarcode(barcode),
      category: category.trim() || "General",
      unitPrice: costNum,
      quantity: qtyNum,
      minStockAlert: alertNum,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await client.put(`/products/${existing?._id || id}`, payload);
      } else {
        await client.post("/products", payload);
      }
      navigate("/inventory");
    } catch (err) {
      // The backend reports which product already owns a duplicate
      // barcode — surface that as a link instead of a dead-end error.
      const data = err?.response?.data;
      if (data?.conflictProductId) {
        setConflictProduct({ _id: data.conflictProductId, productName: data.conflictProductName });
      }
      setError(err?.friendlyMessage || data?.message || "Could not save product");
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
      <h1 className="text-xl font-bold text-gray-900 mb-4">{isEdit ? "Edit Product" : "Add Product"}</h1>

      {error && <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</p>}

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-5">
        <label className="block text-sm text-gray-500 font-semibold mt-2 mb-1.5">Product Name *</label>
        <input
          className="w-full border border-gray-300 rounded-lg p-3 text-[15px]"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          disabled={saving}
        />

        <label className="block text-sm text-gray-500 font-semibold mt-4 mb-1.5">Barcode</label>
        <div className="flex items-center gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg p-3 text-[15px]"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onBlur={(e) => runBarcodeLookup(e.target.value)}
            placeholder="Scan or type manually"
            disabled={saving}
          />
          <button
            type="button"
            className="flex items-center gap-2 bg-indigo-50 text-brand px-3 py-3 rounded-lg font-semibold text-sm whitespace-nowrap"
            onClick={() => setScannerOpen(true)}
            disabled={saving}
          >
            <Camera size={18} />
            <span className="hidden sm:inline">Scan Barcode</span>
          </button>
        </div>

        {/* Single status strip for the whole barcode pipeline: searching
            our own inventory, an existing-product conflict, a successful
            auto-fill, or a clean "type it in yourself". */}
        {lookupStatus !== "idle" && (
          <div
            className={`mt-2 rounded-lg p-3 text-sm flex items-start gap-2 ${
              lookupStatus === "local-found"
                ? "bg-amber-50 border border-amber-200 text-amber-800"
                : lookupStatus === "filled"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : lookupStatus === "error"
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-gray-50 border border-gray-200 text-gray-600"
            }`}
          >
            {lookupStatus === "searching" && <Loader2 size={16} className="animate-spin mt-0.5 shrink-0" />}
            {lookupStatus === "filled" && <Sparkles size={16} className="mt-0.5 shrink-0" />}
            {lookupStatus === "local-found" && <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
            {lookupStatus === "error" && <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
            {lookupStatus === "no-data" && <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
            <div className="min-w-0">
              <p>{lookupMessage}</p>

              {lookupStatus === "local-found" && conflictProduct?._id && (
                <Link
                  to={`/inventory/edit/${conflictProduct._id}`}
                  state={{ product: conflictProduct }}
                  className="inline-block mt-1.5 font-semibold underline"
                >
                  Open that product instead
                </Link>
              )}

              {lookupStatus === "filled" && !!externalSource && (
                <p className="text-[11px] opacity-80 mt-1">
                  Information from {externalSource}. Please check it before saving.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Reference image only. Nothing is downloaded or stored — this
            project has no image storage, so the existing schema is
            untouched and this is purely a visual confirmation that the
            scanned barcode matched the item in the merchant's hand. */}
        {!!externalImage && (
          <div className="mt-2 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
            <img
              src={externalImage}
              alt=""
              className="w-14 h-14 object-contain rounded bg-white"
              onError={() => setExternalImage("")}
              referrerPolicy="no-referrer"
            />
            <p className="text-[11px] text-gray-500">
              Reference image for the scanned barcode. It is not saved with the product.
            </p>
          </div>
        )}

        <label className="block text-sm text-gray-500 font-semibold mt-4 mb-1.5">Category</label>
        <input
          className="w-full border border-gray-300 rounded-lg p-3 text-[15px]"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Defaults to General"
          disabled={saving}
        />

        <label className="block text-sm text-gray-500 font-semibold mt-4 mb-1.5">Unit Purchase Cost *</label>
        <input
          className="w-full border border-gray-300 rounded-lg p-3 text-[15px]"
          value={unitCost}
          onChange={(e) => setUnitCost(e.target.value)}
          type="number"
          step="0.01"
          placeholder="Per-unit buying price"
          disabled={saving}
        />
        <p className="text-[11px] text-gray-400 mt-1.5">
          What you pay per unit. Selling price is set later, per sale, in the cart — it defaults to this cost but you can change it any
          time.
        </p>

        <label className="block text-sm text-gray-500 font-semibold mt-4 mb-1.5">Quantity *</label>
        <input
          className="w-full border border-gray-300 rounded-lg p-3 text-[15px]"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          type="number"
          disabled={saving}
        />

        <label className="block text-sm text-gray-500 font-semibold mt-4 mb-1.5">Low Stock Alert Threshold</label>
        <input
          className="w-full border border-gray-300 rounded-lg p-3 text-[15px]"
          value={minStockAlert}
          onChange={(e) => setMinStockAlert(e.target.value)}
          type="number"
          disabled={saving}
        />

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            className="flex-1 py-3.5 rounded-lg bg-gray-100 text-gray-900 font-semibold"
            onClick={() => navigate("/inventory")}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="flex-1 py-3.5 rounded-lg bg-brand text-white font-semibold disabled:opacity-60" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update Product" : "Save Product"}
          </button>
        </div>
      </form>

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          // Close the scanner immediately (camera is already released by
          // the modal) so the user sees the form react at once, then run
          // the lookup in the background.
          setScannerOpen(false);
          setBarcode(code);
          runBarcodeLookup(code);
        }}
      />
    </div>
  );
}
