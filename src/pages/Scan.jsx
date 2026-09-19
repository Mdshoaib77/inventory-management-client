import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { Keyboard, Search, X, PackagePlus, Check, AlertTriangle, Camera } from "lucide-react";
import client from "../api/client";
import { useCart } from "../context/CartContext";
import { normalizeBarcode } from "../utils/barcode";

// Scan & Sell.
//
// The scan is the whole interaction: point the camera at a barcode and the
// product lands in the cart. There is deliberately no "confirm quantity"
// step in the middle — at a counter you sell three tins of milk by
// scanning three times, and each scan should just work. Quantity stays
// fully editable afterwards in the cart/checkout.
//
// Both input methods on this screen (camera and product search) feed the
// same shared CartContext that Inventory's "Sell" button uses, so one sale
// can freely mix scanned and hand-picked items.

// How long the scanner ignores further reads after accepting one. ZXing
// decodes many frames per second, so without this a barcode held in view
// for a second would add the same product a dozen times. It is short
// enough that deliberately presenting the item again registers as a new
// scan — which is exactly how a second unit gets added.
const SCAN_COOLDOWN_MS = 1200;

function friendlyCameraError(err) {
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera permission was denied. Allow camera access for this site, then reload.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera found on this device. Use manual entry or product search below.";
  }
  if (name === "NotReadableError") {
    return "The camera is in use by another app. Close it and reload this page.";
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "The camera needs a secure connection (HTTPS). Use manual entry instead.";
  }
  return err?.message || "Could not access the camera.";
}

export default function Scan() {
  const { addItem, items, itemCount } = useCart();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const lockRef = useRef(false);
  const cooldownRef = useRef(null);

  const [cameraError, setCameraError] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Transient confirmation shown over the camera after each scan.
  const [feedback, setFeedback] = useState(null);
  const feedbackTimer = useRef(null);

  // Barcode that matched nothing in this merchant's inventory.
  const [unknownCode, setUnknownCode] = useState(null);

  // Manual product search: barcode AND manual search both available on
  // the sales screen, sharing one cart.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  // The cart is read inside async scan handlers. Reading it from a ref
  // avoids acting on a stale closure when scans arrive back-to-back.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const showFeedback = useCallback((next) => {
    setFeedback(next);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2600);
  }, []);

  const releaseLock = useCallback(() => {
    clearTimeout(cooldownRef.current);
    cooldownRef.current = setTimeout(() => {
      lockRef.current = false;
    }, SCAN_COOLDOWN_MS);
  }, []);

  // Adds one unit of a product to the cart, enforcing available stock.
  // Every outcome is reported through the feedback banner.
  const addOneToCart = useCallback(
    (product) => {
      const available = Number(product.quantity) || 0;
      const line = itemsRef.current.find((l) => l.product._id === product._id);
      const inCart = line ? line.quantity : 0;

      if (available <= 0) {
        showFeedback({
          tone: "error",
          title: "Out of stock",
          detail: `${product.productName} has no units available.`,
        });
        return;
      }

      // Stock validation: the cart can never hold more units than exist.
      if (inCart >= available) {
        showFeedback({
          tone: "warn",
          title: "Insufficient stock",
          detail: `Only ${available} unit${available === 1 ? "" : "s"} of ${product.productName} available - all are already in the cart.`,
        });
        return;
      }

      addItem(product, 1);
      const newQty = inCart + 1;
      showFeedback({
        tone: "success",
        title: product.productName,
        detail: `Qty ${newQty}${newQty > 1 ? " (updated)" : ""} - ${available - newQty} left in stock`,
      });
    },
    [addItem, showFeedback]
  );

  const handleBarcodeScanned = useCallback(
    async (raw) => {
      const code = normalizeBarcode(raw);
      if (!code) return;

      lockRef.current = true;
      setBusy(true);
      try {
        // LOCAL DATABASE ONLY. Selling never depends on the internet
        // beyond reaching this shop's own backend.
        const { data: product } = await client.get(`/products/barcode/${encodeURIComponent(code)}`);
        addOneToCart(product);
      } catch (error) {
        if (error?.response?.status === 404) {
          setUnknownCode(code);
        } else {
          showFeedback({
            tone: "error",
            title: "Lookup failed",
            detail: error?.friendlyMessage || "Could not reach the server. Check your connection and try again.",
          });
        }
      } finally {
        setBusy(false);
        releaseLock();
      }
    },
    [addOneToCart, releaseLock, showFeedback]
  );

  // Keep the newest handler in a ref so the camera effect runs once and
  // never tears down/restarts the stream on re-render.
  const scanHandlerRef = useRef(handleBarcodeScanned);
  useEffect(() => {
    scanHandlerRef.current = handleBarcodeScanned;
  }, [handleBarcodeScanned]);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let stopped = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (stopped || lockRef.current) return;
        if (result) {
          scanHandlerRef.current(result.getText());
        } else if (err && !(err instanceof NotFoundException)) {
          // Frequent no-barcode-this-frame errors - safe to ignore.
        }
      })
      .catch((err) => {
        setCameraError(friendlyCameraError(err));
        setManualMode(true);
      });

    return () => {
      stopped = true;
      clearTimeout(cooldownRef.current);
      clearTimeout(feedbackTimer.current);
      try {
        reader.stopContinuousDecode?.();
        reader.reset?.();
      } catch {
        // Stream may already be closed.
      }
      try {
        const stream = videoRef.current?.srcObject;
        stream?.getTracks?.().forEach((t) => t.stop());
      } catch {
        // Nothing attached.
      }
    };
  }, []);

  // Product list for manual search - fetched once, on first use only, so
  // the camera path never pays for it.
  const openSearch = async () => {
    setSearchOpen(true);
    if (productsLoaded) return;
    try {
      const { data } = await client.get("/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    } finally {
      setProductsLoaded(true);
    }
  };

  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products.slice(0, 25);
    return products
      .filter(
        (p) =>
          p.productName?.toLowerCase().includes(term) ||
          p.category?.toLowerCase().includes(term) ||
          (p.barcode || "").toLowerCase().includes(term)
      )
      .slice(0, 25);
  }, [products, searchTerm]);

  const submitManual = () => {
    const code = normalizeBarcode(manualCode);
    if (!code) return;
    setManualCode("");
    handleBarcodeScanned(code);
  };

  const goAddProduct = (code) => {
    setUnknownCode(null);
    // Hand the scanned barcode to the Add Product form so it arrives
    // already filled in (and already looked up).
    navigate("/inventory/add", { state: { barcode: code } });
  };

  const feedbackTone =
    feedback?.tone === "success" ? "bg-emerald-600" : feedback?.tone === "warn" ? "bg-amber-600" : "bg-red-600";

  return (
    <div className="relative bg-black min-h-[calc(100vh-64px)] md:min-h-[calc(100vh-2rem)] md:rounded-2xl md:m-4 overflow-hidden flex items-center justify-center">
      {!manualMode ? (
        <>
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
          <div className="relative z-10 flex flex-col items-center pointer-events-none">
            <div className="w-64 h-40 border-4 border-brand rounded-2xl" />
            <p className="text-white mt-4 text-sm bg-black/50 px-3 py-2 rounded-lg text-center">
              Place the barcode inside the frame
            </p>
            <p className="text-white/70 mt-1.5 text-xs bg-black/40 px-3 py-1.5 rounded-lg text-center">
              Scanning adds the product to the cart - scan again for more
            </p>
          </div>

          <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-wrap gap-2 justify-center">
            <button
              className="flex items-center gap-2 bg-white/90 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-full"
              onClick={openSearch}
            >
              <Search size={16} /> Search product
            </button>
            <button
              className="flex items-center gap-2 bg-white/90 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-full"
              onClick={() => setManualMode(true)}
            >
              <Keyboard size={16} /> Manual entry
            </button>
          </div>

          {cameraError && (
            <p className="absolute top-6 left-6 right-6 z-10 text-white text-sm bg-red-600/80 px-3 py-2 rounded-lg text-center">
              {cameraError}
            </p>
          )}
        </>
      ) : (
        <div className="relative z-10 w-full max-w-sm p-6">
          {/* A camera failure force-switches this screen into manual mode.
              Repeat the reason here, otherwise the user is dropped into a
              text box with no idea why the camera never opened. */}
          {cameraError && (
            <p className="text-white text-sm bg-red-600/80 px-3 py-2 rounded-lg text-center mb-4">{cameraError}</p>
          )}
          <p className="text-white text-center mb-4 text-sm">Enter the barcode manually</p>
          <input
            autoFocus
            className="w-full rounded-lg px-3 py-3 text-base mb-3"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Barcode"
            onKeyDown={(e) => e.key === "Enter" && submitManual()}
          />
          <div className="flex gap-2">
            {!cameraError && (
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-white/20 text-white font-semibold text-sm"
                onClick={() => setManualMode(false)}
              >
                <Camera size={16} /> Use camera
              </button>
            )}
            <button className="flex-1 py-3 rounded-lg bg-brand text-white font-semibold text-sm" onClick={submitManual}>
              Add to cart
            </button>
          </div>
          <button
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white/10 text-white font-semibold text-sm"
            onClick={openSearch}
          >
            <Search size={16} /> Search product instead
          </button>
        </div>
      )}

      {busy && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-black/70 text-white px-5 py-3 rounded-xl">
          Looking up product...
        </div>
      )}

      {!!feedback && (
        <div className={`absolute top-6 left-6 right-6 z-30 ${feedbackTone} text-white rounded-xl px-4 py-3 shadow-lg`}>
          <div className="flex items-start gap-2">
            {feedback.tone === "success" ? (
              <Check size={18} className="mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{feedback.title}</p>
              <p className="text-xs opacity-90">{feedback.detail}</p>
            </div>
          </div>
        </div>
      )}

      {itemCount > 0 && !searchOpen && !unknownCode && !feedback && (
        <button
          className="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-white text-gray-900 text-sm font-bold px-4 py-2 rounded-full shadow"
          onClick={() => navigate("/checkout")}
        >
          {itemCount} item{itemCount === 1 ? "" : "s"} in cart - Checkout
        </button>
      )}

      {!!unknownCode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900">Product not found</h2>
            <p className="text-sm text-gray-500 mt-1">No product in your inventory uses this barcode.</p>
            <p className="mt-3 font-mono text-sm bg-gray-100 text-gray-800 rounded-lg px-3 py-2 break-all">{unknownCode}</p>
            <div className="flex gap-3 mt-5">
              <button
                className="flex-1 py-3.5 rounded-lg bg-gray-100 text-gray-900 font-semibold"
                onClick={() => setUnknownCode(null)}
              >
                Cancel
              </button>
              <button
                className="flex-[1.3] flex items-center justify-center gap-2 py-3.5 rounded-lg bg-brand text-white font-semibold"
                onClick={() => goAddProduct(unknownCode)}
              >
                <PackagePlus size={18} /> Add New Product
              </button>
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Search Product</h2>
              <button
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                onClick={() => setSearchOpen(false)}
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <input
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-3"
              placeholder="Product name, category or barcode"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="overflow-y-auto -mx-1 px-1">
              {!productsLoaded && <p className="text-sm text-gray-400 py-6 text-center">Loading products...</p>}

              {productsLoaded && searchResults.length === 0 && (
                <p className="text-sm text-gray-400 py-6 text-center">No matching products.</p>
              )}

              {searchResults.map((p) => {
                const line = items.find((l) => l.product._id === p._id);
                const inCart = line ? line.quantity : 0;
                const available = Number(p.quantity) || 0;
                const maxed = available <= 0 || inCart >= available;
                return (
                  <button
                    key={p._id}
                    className="w-full text-left flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 disabled:opacity-50"
                    disabled={maxed}
                    onClick={() => addOneToCart(p)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{p.productName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Stock {available}
                        {inCart > 0 && ` - ${inCart} in cart`}
                        {!!p.barcode && ` - ${p.barcode}`}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-brand whitespace-nowrap">
                      {available <= 0 ? "Out of stock" : maxed ? "Max" : "Add"}
                    </span>
                  </button>
                );
              })}
            </div>

            {itemCount > 0 && (
              <button
                className="mt-4 w-full py-3.5 rounded-lg bg-brand text-white font-bold"
                onClick={() => navigate("/checkout")}
              >
                Checkout - {itemCount} item{itemCount === 1 ? "" : "s"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
