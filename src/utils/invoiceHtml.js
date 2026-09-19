// Ported near-verbatim from mobile/components/InvoiceModal.js's HTML
// builder. On mobile this HTML was handed to expo-print (Print.printAsync
// / Print.printToFileAsync + expo-sharing) to produce a shareable PDF. On
// web there's no direct equivalent of that native module, so the same
// HTML/CSS document is instead opened in a hidden iframe and printed with
// window.print() — every browser's print dialog offers a "Save as PDF"
// destination, which is the documented web equivalent for this feature
// (see master prompt: "generate a printable/downloadable PDF ... or the
// browser print dialog via window.print()").

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(n) {
  return (Number(n) || 0).toFixed(2);
}

function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function formatDateTime(d) {
  const dt = new Date(d);
  return `${dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })} ${dt.toLocaleTimeString(
    undefined,
    { hour: "2-digit", minute: "2-digit" }
  )}`;
}

function shopInitials(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "IN";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const PDF_STATUS_COLOR = {
  PAID: { bg: "#DCFCE7", text: "#15803D" },
  PARTIAL: { bg: "#FEF3C7", text: "#B45309" },
  DUE: { bg: "#FEE2E2", text: "#B91C1C" },
};

const PDF_STYLES = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, Helvetica, Arial, sans-serif;
    color: #111827;
    font-size: 11.5px;
  }
  .header-band {
    background: linear-gradient(120deg, #4F46E5 0%, #4338CA 100%);
    color: #ffffff;
    padding: 9mm 12mm 7mm 12mm;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .logo-badge {
    width: 40px; height: 40px; border-radius: 10px;
    background: rgba(255,255,255,0.16);
    border: 1.5px solid rgba(255,255,255,0.55);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 800; color: #ffffff; flex-shrink: 0;
  }
  .shop-name { font-size: 18px; font-weight: 800; margin: 0; color: #ffffff; line-height: 1.25; }
  .shop-meta { font-size: 9.5px; color: rgba(255,255,255,0.88); margin: 1px 0; }
  .invoice-badge { text-align: right; }
  .invoice-title { font-size: 21px; font-weight: 800; letter-spacing: 1.5px; margin: 0 0 4px 0; color: #ffffff; }
  .invoice-meta { font-size: 10px; color: rgba(255,255,255,0.92); margin: 1.5px 0; }
  .status-pill { display: inline-block; margin-top: 6px; padding: 3px 12px; border-radius: 20px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.3px; }
  .content { padding: 7mm 12mm 0 12mm; }
  .meta-row { display: flex; gap: 10px; margin-bottom: 12px; }
  .meta-card { flex: 1; background: #F9FAFB; border: 1px solid #EEF0F3; border-left: 3px solid #4F46E5; border-radius: 6px; padding: 8px 10px; }
  .meta-card-label { font-size: 8.5px; font-weight: 800; color: #4F46E5; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0; }
  .customer-name { font-size: 12.5px; font-weight: 800; color: #111827; margin: 0 0 2px 0; }
  .customer-line { font-size: 10px; color: #374151; margin: 1.5px 0; }
  .meta-line { display: flex; justify-content: space-between; font-size: 10px; color: #6B7280; margin: 2.5px 0; }
  .meta-line strong { color: #111827; font-weight: 700; }
  .section-label { font-size: 9px; font-weight: 800; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 5px 0; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  table.items thead th { background: #111827; color: #ffffff; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; padding: 7px 8px; }
  table.items thead th.num { text-align: right; }
  table.items tbody td { padding: 6.5px 8px; font-size: 10.5px; border-bottom: 1px solid #EEF0F3; vertical-align: top; }
  table.items tbody tr:nth-child(even) { background: #FAFAFB; }
  table.items td.idx { color: #9CA3AF; width: 22px; }
  td.product-cell { max-width: 0; width: 44%; }
  .product-name { font-weight: 600; color: #111827; word-break: break-word; overflow-wrap: break-word; white-space: normal; }
  .product-sub { font-size: 9px; color: #9CA3AF; margin-top: 2px; word-break: break-word; }
  table.items td.num { text-align: right; white-space: nowrap; }
  .summary-wrap { display: flex; justify-content: flex-end; margin-bottom: 12px; }
  table.totals { width: 250px; border-collapse: collapse; background: #F9FAFB; border-radius: 8px; overflow: hidden; border: 1px solid #EEF0F3; }
  table.totals td { padding: 5px 10px; font-size: 10.5px; }
  table.totals td.label { color: #6B7280; }
  table.totals td.value { text-align: right; color: #111827; font-weight: 700; }
  table.totals tr.grand td { background: #4F46E5; padding: 8px 10px; font-size: 12.5px; font-weight: 800; }
  table.totals tr.grand td.label { color: #ffffff; }
  table.totals tr.grand td.value { color: #ffffff; font-size: 14.5px; }
  table.totals tr.paid td.value, table.totals tr.due td.value { font-weight: 800; }
  table.totals tr.paid td.value { color: #15803D; }
  table.totals tr.due td.value { color: #B91C1C; }
  .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
  .dot-green { background: #16A34A; }
  .dot-red { background: #DC2626; }
  table.payments { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 10px; }
  table.payments th { text-align: left; font-size: 8.5px; text-transform: uppercase; color: #6B7280; border-bottom: 1px solid #E5E7EB; padding: 5px 8px; }
  table.payments td { font-size: 10px; padding: 5px 8px; border-bottom: 1px solid #F3F4F6; }
  table.payments td.num { text-align: right; }
  .footer { margin-top: 10px; padding: 8px 12mm 8mm 12mm; border-top: 1px solid #E5E7EB; text-align: center; }
  .footer-thanks { font-size: 10.5px; font-weight: 800; color: #4F46E5; margin: 0 0 2px 0; }
  .footer-brand { font-size: 9px; color: #6B7280; margin: 1px 0; font-weight: 600; }
  .footer-note { font-size: 8.5px; color: #9CA3AF; margin: 1px 0; }
`;

function headerBandHtml({ shop, meta, statusHtml }) {
  return `
    <div class="header-band">
      <div class="brand">
        <div class="logo-badge">${escapeHtml(shopInitials(shop?.shopName))}</div>
        <div>
          <div class="shop-name">${escapeHtml(shop?.shopName || "Invoice")}</div>
          ${shop?.shopAddress ? `<div class="shop-meta">${escapeHtml(shop.shopAddress)}</div>` : ""}
          ${shop?.shopPhone ? `<div class="shop-meta">Phone: ${escapeHtml(shop.shopPhone)}</div>` : ""}
        </div>
      </div>
      <div class="invoice-badge">
        <div class="invoice-title">INVOICE</div>
        ${meta}
        ${statusHtml || ""}
      </div>
    </div>
  `;
}

function footerHtml(shop) {
  return `
    <div class="footer">
      <p class="footer-thanks">Thank you for your business${shop?.shopName ? ` — ${escapeHtml(shop.shopName)}` : ""}!</p>
      <p class="footer-brand">Generated by HisabKhata App</p>
      <p class="footer-note">Computer generated invoice · No signature required · ${escapeHtml(formatDateTime(new Date()))}</p>
    </div>
  `;
}

export function buildSaleInvoiceHtml({ shop, sale, customer, lineItems, payments }) {
  const statusColors = PDF_STATUS_COLOR[sale.status] || PDF_STATUS_COLOR.DUE;

  const rows = (lineItems || [])
    .map(
      (li, idx) => `
        <tr>
          <td class="idx">${idx + 1}</td>
          <td class="product-cell"><div class="product-name">${escapeHtml(li.productName)}</div></td>
          <td class="num">${escapeHtml(li.quantity)}</td>
          <td class="num">৳${money(li.unitPrice)}</td>
          <td class="num"><strong>৳${money(li.lineTotal)}</strong></td>
        </tr>
      `
    )
    .join("");

  const paymentRows = (payments || [])
    .map(
      (p) => `
        <tr>
          <td>${escapeHtml(formatDate(p.paymentDate))}</td>
          <td>${escapeHtml(p.paymentMethod || sale.paymentMethod || "-")}</td>
          <td class="num">৳${money(p.paymentAmount)}</td>
        </tr>
      `
    )
    .join("");

  const header = headerBandHtml({
    shop,
    meta: `
      <div class="invoice-meta"># ${escapeHtml(sale.invoiceNumber)}</div>
      <div class="invoice-meta">${escapeHtml(formatDateTime(sale.date))}</div>
    `,
    statusHtml: `
      <div class="status-pill" style="background:${statusColors.bg}; color:${statusColors.text};">
        ${escapeHtml(sale.status)}
      </div>
    `,
  });

  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8" /><style>${PDF_STYLES}</style></head>
      <body>
        ${header}
        <div class="content">
          <div class="meta-row">
            <div class="meta-card">
              <div class="meta-card-label">Bill To</div>
              <div class="customer-name">${escapeHtml(customer?.customerName || "-")}</div>
              ${customer?.mobileNumber ? `<div class="customer-line">📱 ${escapeHtml(customer.mobileNumber)}</div>` : ""}
              ${customer?.address ? `<div class="customer-line">📍 ${escapeHtml(customer.address)}</div>` : ""}
              ${customer?.companyName ? `<div class="customer-line">${escapeHtml(customer.companyName)}</div>` : ""}
            </div>
            <div class="meta-card">
              <div class="meta-card-label">Invoice Info</div>
              <div class="meta-line"><span>Invoice No</span><strong>${escapeHtml(sale.invoiceNumber)}</strong></div>
              <div class="meta-line"><span>Date</span><strong>${escapeHtml(formatDate(sale.date))}</strong></div>
              <div class="meta-line"><span>Payment Method</span><strong>${escapeHtml(sale.paymentMethod || "-")}</strong></div>
              <div class="meta-line"><span>Status</span><strong>${escapeHtml(sale.status)}</strong></div>
            </div>
          </div>

          <div class="section-label">Products</div>
          <table class="items">
            <thead>
              <tr>
                <th class="num" style="text-align:left;">SL</th>
                <th style="text-align:left;">Product Name</th>
                <th class="num">Qty</th>
                <th class="num">Unit Price</th>
                <th class="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="5" style="text-align:center; color:#9CA3AF; padding:14px;">No items</td></tr>`}
            </tbody>
          </table>

          <div class="summary-wrap">
            <table class="totals">
              <tr><td class="label">Subtotal</td><td class="value">৳${money(sale.subtotal)}</td></tr>
              <tr><td class="label">Discount</td><td class="value">৳${money(sale.discount)}</td></tr>
              <tr class="grand"><td class="label">Grand Total Payable</td><td class="value">৳${money(sale.totalAmount)}</td></tr>
              <tr class="paid"><td class="label"><span class="dot dot-green"></span>Paid</td><td class="value">৳${money(sale.paidAmount)}</td></tr>
              <tr class="due"><td class="label"><span class="dot dot-red"></span>Due</td><td class="value">৳${money(sale.dueAmount)}</td></tr>
            </table>
          </div>

          ${
            paymentRows
              ? `
            <div class="section-label">Payment History</div>
            <table class="payments">
              <thead><tr><th>Date</th><th>Method</th><th style="text-align:right;">Amount</th></tr></thead>
              <tbody>${paymentRows}</tbody>
            </table>
          `
              : ""
          }
        </div>
        ${footerHtml(shop)}
      </body>
    </html>
  `;
}

export function buildPurchaseInvoiceHtml({ shop, purchase }) {
  const header = headerBandHtml({
    shop,
    meta: `
      <div class="invoice-meta"># ${escapeHtml(purchase.invoiceNumber)}</div>
      <div class="invoice-meta">${escapeHtml(formatDateTime(purchase.date))}</div>
    `,
  });

  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8" /><style>${PDF_STYLES}</style></head>
      <body>
        ${header}
        <div class="content">
          <div class="section-label">Item</div>
          <table class="items">
            <thead>
              <tr>
                <th class="num" style="text-align:left;">SL</th>
                <th style="text-align:left;">Product Name</th>
                <th class="num">Qty</th>
                <th class="num">Unit Price</th>
                <th class="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="idx">1</td>
                <td class="product-cell">
                  <div class="product-name">${escapeHtml(purchase.productName)}</div>
                  ${purchase.productDetails ? `<div class="product-sub">${escapeHtml(purchase.productDetails)}</div>` : ""}
                </td>
                <td class="num">${escapeHtml(purchase.quantity)}</td>
                <td class="num">৳${money(purchase.unitPrice)}</td>
                <td class="num"><strong>৳${money(purchase.totalAmount)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="summary-wrap">
            <table class="totals">
              <tr><td class="label">Discount</td><td class="value">৳${money(purchase.discount)}</td></tr>
              <tr class="grand"><td class="label">Total Amount</td><td class="value">৳${money(purchase.totalAmount)}</td></tr>
            </table>
          </div>
        </div>
        ${footerHtml(shop)}
      </body>
    </html>
  `;
}

export function sanitizeFileNamePart(value) {
  return String(value || "invoice").replace(/[^A-Za-z0-9-_]+/g, "-");
}

// ---------------------------------------------------------------------------
// PDF / print export
// ---------------------------------------------------------------------------
// The invoice HTML/CSS above is intentionally untouched — this section only
// changes HOW that document is handed to the browser's print pipeline, because
// the previous implementation produced a blank white PDF on mobile/responsive
// devices. Root causes fixed here:
//
//   1. The render iframe was 0x0. A frame with a zero-sized layout viewport
//      gives the print pipeline an empty/collapsed box on Android Chrome and
//      iOS Safari, so the rasterised pages come out blank. It now renders at a
//      real A4 box, parked off-screen.
//   2. The iframe was removed 500ms after print() was called. On desktop
//      print() blocks until the dialog closes, so that was safe; on mobile it
//      returns immediately while the OS print/share sheet asynchronously reads
//      the document — so the document was destroyed mid-render. Teardown now
//      waits for afterprint / window refocus, with a long safety timeout.
//   3. onload was assigned AFTER document.write()+close(), so the load event
//      could fire before the handler existed and print() never ran at all.
//      Readiness is now wired up before any content is written.
//   4. Nothing waited for fonts/layout, so capture could happen pre-paint.
//
// Everything below is export mechanics only. No invoice markup, dimensions,
// colours, typography or wording is altered by any of it.

// 210mm at 96dpi. Used only as the off-screen render box so the invoice lays
// out at its normal A4 width regardless of the device's viewport width.
const PRINT_RENDER_WIDTH_PX = 794;

// Injected into the print document, never into the on-screen UI. This is
// deliberately the ONLY declaration added, and it affects no box, size,
// position or font — it purely stops mobile print engines from discarding the
// invoice's existing background colours/gradients, which would otherwise make
// the indigo header band and the dark table header print as blank white.
// (A `width: 210mm` rule was tried here and removed: 210mm resolves to
// 793.7px vs the 794px A4 box, and the fractional difference shifted text
// baselines by a sub-pixel amount. Page geometry is left entirely to the
// invoice's own `@page { size: A4; margin: 0 }`.)
const PRINT_FIDELITY_STYLES = `
  html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
`;

function buildPrintDocument(html) {
  let out = String(html);
  const headClose = out.indexOf("</head>");
  const injection =
    `<meta name="viewport" content="width=${PRINT_RENDER_WIDTH_PX}, initial-scale=1" />` +
    `<style>${PRINT_FIDELITY_STYLES}</style>`;
  if (headClose !== -1) {
    out = out.slice(0, headClose) + injection + out.slice(headClose);
  }
  return out;
}

// Resolves once the frame has actually laid out and painted. Races rAF (which
// mobile browsers can throttle in a backgrounded/off-screen frame) against a
// parent-window timer so this can never hang.
function waitForPaint(win) {
  return new Promise((resolve) => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const timer = setTimeout(go, 600);
    try {
      win.requestAnimationFrame(() => {
        win.requestAnimationFrame(() => {
          clearTimeout(timer);
          go();
        });
      });
    } catch {
      /* rAF unavailable — the timer above covers it */
    }
  });
}

// Waits for webfonts and any images to settle, but never blocks the export on
// them. The current invoice template has no <img> tags, so in practice this
// resolves immediately; it guards the path if a logo is added later.
function waitForAssets(win) {
  const pending = [];

  try {
    const fonts = win.document.fonts;
    if (fonts && fonts.ready && typeof fonts.ready.then === "function") {
      pending.push(fonts.ready);
    }
  } catch {
    /* ignore */
  }

  try {
    const images = Array.from(win.document.images || []);
    images.forEach((img) => {
      if (img.complete) return;
      pending.push(
        new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        })
      );
    });
  } catch {
    /* ignore */
  }

  if (!pending.length) return Promise.resolve();

  return Promise.race([
    Promise.all(pending).catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
}

// Last-resort path if the off-screen frame can't be used at all. Called from
// within the original click handler's task, so it is not treated as a blocked
// popup. Same HTML, same design — just printed from its own tab.
function printInNewWindow(html) {
  try {
    const doc = buildPrintDocument(html).replace(
      "</body>",
      `<script>
         window.addEventListener("load", function () {
           setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 350);
         });
       <\/script></body>`
    );
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      URL.revokeObjectURL(url);
      return false;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  } catch {
    return false;
  }
}

// Renders the given invoice HTML in an off-screen A4 frame and opens the
// browser's print dialog, whose "Save as PDF" / "Save to Files" destination is
// the download path on both desktop and mobile. Returns a promise that settles
// once the dialog has been handed the document.
export function printHtml(html) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("printHtml requires a browser environment"));
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("tabindex", "-1");
    iframe.title = "invoice-print";

    // Real A4 box parked off-screen. Deliberately NOT display:none,
    // visibility:hidden or 0x0 — all three collapse the layout viewport and
    // are what made the exported PDF blank on mobile.
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "-10000px";
    iframe.style.width = `${PRINT_RENDER_WIDTH_PX}px`;
    iframe.style.height = "1123px"; // 297mm @96dpi
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.zIndex = "-1";

    let printed = false;
    let torndown = false;
    let readyTimer = null;

    const teardown = () => {
      if (torndown) return;
      torndown = true;
      clearTimeout(readyTimer);
      window.removeEventListener("focus", onWindowFocus);
      clearTimeout(safetyTimer);
      // Give the print pipeline a moment to finish reading the document
      // before the frame is detached.
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
    };

    const onWindowFocus = () => {
      // Fires when the print dialog / OS share sheet is dismissed.
      if (printed) setTimeout(teardown, 800);
    };
    // Long stop so a frame can never leak if no event ever arrives.
    const safetyTimer = setTimeout(teardown, 120000);

    const fail = (err) => {
      clearTimeout(readyTimer);
      if (printInNewWindow(html)) {
        teardown();
        resolve();
      } else {
        teardown();
        reject(err instanceof Error ? err : new Error("Unable to open the print view"));
      }
    };

    const onReady = async () => {
      if (printed) return;
      clearTimeout(readyTimer);
      const win = iframe.contentWindow;
      if (!win || !win.document || !win.document.body) {
        fail(new Error("Print frame did not initialise"));
        return;
      }

      try {
        await waitForAssets(win);
        await waitForPaint(win);

        // If the document still measures zero the frame never laid out and
        // printing it would produce exactly the blank page we're fixing.
        const height = win.document.body.scrollHeight || 0;
        if (height <= 0) {
          fail(new Error("Print frame rendered with no content"));
          return;
        }

        printed = true;
        window.addEventListener("focus", onWindowFocus);
        try {
          win.addEventListener("afterprint", () => setTimeout(teardown, 500), { once: true });
        } catch {
          /* afterprint unsupported — focus/safety timer cover teardown */
        }

        win.focus();
        win.print();
        resolve();
      } catch (err) {
        fail(err);
      }
    };

    // Readiness is wired BEFORE any content is written, so the load event
    // cannot be missed.
    iframe.addEventListener("load", onReady, { once: true });

    try {
      document.body.appendChild(iframe);
    } catch (err) {
      fail(err);
      return;
    }

    const printDoc = buildPrintDocument(html);

    try {
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(printDoc);
      doc.close();
    } catch (err) {
      fail(err);
      return;
    }

    // Some mobile browsers do not fire load for a document written this way.
    // Poll for a ready document as a backstop, then fall back entirely.
    const startedAt = Date.now();
    const poll = () => {
      if (printed || torndown) return;
      let ready = false;
      try {
        const d = iframe.contentWindow && iframe.contentWindow.document;
        ready = !!(d && d.readyState === "complete" && d.body && d.body.scrollHeight > 0);
      } catch {
        ready = false;
      }
      if (ready) {
        onReady();
      } else if (Date.now() - startedAt > 8000) {
        fail(new Error("Print frame timed out"));
      } else {
        readyTimer = setTimeout(poll, 120);
      }
    };
    readyTimer = setTimeout(poll, 120);
  });
}
