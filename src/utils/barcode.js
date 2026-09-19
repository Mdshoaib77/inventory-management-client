// Frontend mirror of server/utils/barcode.js. The two files MUST stay in
// sync: the client normalizes before it searches or saves so that a code
// typed with a stray space finds the same product the camera finds, and
// so the value we POST is byte-identical to what the server would store.
//
// Kept as a tiny standalone module (no imports) precisely so it can be
// copied/compared against the server version at a glance.

export function normalizeBarcode(value) {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width characters
    .replace(/\s+/g, "") // all whitespace, including inner spaces/newlines
    .trim();
}

// Fixed-length all-digit retail symbologies (EAN-8/13, UPC-A/E, GTIN-14).
// Used only to decide whether an external lookup is worth offering — an
// alphanumeric Code 39 shelf label will never be in a GTIN database.
export function isGtinCandidate(value) {
  const code = normalizeBarcode(value);
  return /^\d+$/.test(code) && [8, 12, 13, 14].includes(code.length);
}
