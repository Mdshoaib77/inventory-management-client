import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { X, Camera, Keyboard } from "lucide-react";
import Modal from "./Modal";
import { normalizeBarcode } from "../utils/barcode";

// Web equivalent of mobile/screens/ScanScreen.js's camera (expo-camera ->
// @zxing/browser reading the device webcam). Every mobile barcode type
// used there (ean13/ean8/upc_a/upc_e/code128/code39/qr) is covered by
// ZXing's default reader. A manual entry fallback is always available —
// required per the master prompt for when the browser has no camera
// access (permission denied, no camera hardware, insecure context, etc).
// Browser camera errors surface as raw DOMException names that mean
// nothing to a shopkeeper. Translate the ones that actually happen into
// an instruction the user can act on.
function friendlyCameraError(err) {
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera permission was denied. Allow camera access for this site in your browser settings, then try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device. You can type the barcode instead.";
  }
  if (name === "NotReadableError") {
    return "The camera is already in use by another app. Close it and try again.";
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "The camera needs a secure connection (HTTPS). Open this site over HTTPS, or type the barcode instead.";
  }
  return err?.message || "Could not access the camera.";
}

export default function BarcodeScannerModal({ visible, onClose, onDetected, title = "Scan Barcode" }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  // ZXing's continuous decoder fires its callback on EVERY frame that
  // decodes successfully — holding a barcode in view for a second can
  // emit a dozen identical results. This latch makes one presentation of
  // a barcode produce exactly one onDetected call. It is reset when the
  // modal reopens, so deliberately scanning the same item again still
  // registers as a new scan.
  const handledRef = useRef(false);
  const [cameraError, setCameraError] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");

  // Keep the latest onDetected in a ref so the camera effect below can
  // depend only on `visible`. Without this, a parent that re-creates its
  // handler each render would tear down and restart the camera stream on
  // every render — visibly flickering the preview on mobile.
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!visible) return;
    setCameraError(null);
    setManualMode(false);
    setManualCode("");
    handledRef.current = false;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let stopped = false;

    // Releases the camera immediately. Called the moment a barcode is
    // accepted so the torch/preview never stays live after a successful
    // scan (a real battery and privacy concern on phones).
    const stopCamera = () => {
      stopped = true;
      try {
        reader.stopContinuousDecode?.();
        reader.reset?.();
      } catch {
        // Stream may already be closed — nothing to clean up.
      }
      // @zxing/browser does not always detach the underlying MediaStream
      // on reset(); stopping every track guarantees the camera light goes
      // out on mobile browsers.
      try {
        const stream = videoRef.current?.srcObject;
        stream?.getTracks?.().forEach((track) => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
      } catch {
        // Nothing attached.
      }
    };

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (stopped || handledRef.current) return;
        if (result) {
          const code = normalizeBarcode(result.getText());
          if (!code) return;
          handledRef.current = true;
          stopCamera();
          onDetectedRef.current?.(code);
        } else if (err && !(err instanceof NotFoundException)) {
          // Real decode errors are extremely frequent (they fire on every
          // frame with no barcode in view) — NotFoundException is the
          // normal "nothing found this frame" case and is safe to ignore.
        }
      })
      .catch((err) => {
        setCameraError(friendlyCameraError(err));
        setManualMode(true);
      });

    return stopCamera;
  }, [visible]);

  if (!visible) return null;

  const submitManual = () => {
    const code = normalizeBarcode(manualCode);
    if (!code || handledRef.current) return;
    handledRef.current = true;
    onDetectedRef.current?.(code);
  };

  return (
    <Modal visible={visible} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex items-start justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {!manualMode ? (
        <>
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-2/3 h-1/2 border-4 border-brand rounded-2xl" />
            </div>
          </div>
          {cameraError && (
            <p className="text-sm text-red-600 mt-3">{cameraError}</p>
          )}
          <p className="text-xs text-gray-500 mt-3 text-center">
            Point your camera at a product barcode. No camera, or having trouble?
          </p>
          <button
            className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm"
            onClick={() => setManualMode(true)}
          >
            <Keyboard size={16} /> Enter barcode manually
          </button>
        </>
      ) : (
        <div>
          <label className="block text-sm text-gray-500 font-semibold mb-1.5">Barcode</label>
          <input
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Type or paste the barcode"
            onKeyDown={(e) => e.key === "Enter" && submitManual()}
          />
          <div className="flex gap-2 mt-4">
            {!cameraError && (
              <button
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm"
                onClick={() => setManualMode(false)}
              >
                <Camera size={16} /> Use camera
              </button>
            )}
            <button
              className="flex-1 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm disabled:opacity-50"
              disabled={!manualCode.trim()}
              onClick={submitManual}
            >
              Use this code
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
