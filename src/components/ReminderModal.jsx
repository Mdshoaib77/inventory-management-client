import React, { useState } from "react";
import Modal from "./Modal";

// Web equivalent of mobile/components/ReminderModal.js. React Native's
// Share sheet (WhatsApp/SMS/etc.) becomes the Web Share API where
// supported (mobile Chrome/Safari), with a "Copy" fallback everywhere
// else (most desktop browsers don't implement navigator.share).
export default function ReminderModal({ visible, loading, reminder, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!reminder?.message) return;
    if (navigator.share) {
      try {
        await navigator.share({ text: reminder.message });
      } catch {
        // Share sheet dismissal/cancellation throws too — nothing to show.
      }
    } else {
      try {
        await navigator.clipboard.writeText(reminder.message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard API blocked — nothing more we can do silently.
      }
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <h2 className="text-lg font-bold text-gray-900 mb-3">Payment Reminder</h2>

      {loading ? (
        <div className="py-8 text-center text-gray-400">Loading...</div>
      ) : (
        <>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5">
            <p className="text-sm text-gray-900 leading-relaxed">{reminder?.message}</p>
          </div>
          {!!reminder?.whatsappNumber && <p className="text-xs text-gray-500 mt-2">WhatsApp: {reminder.whatsappNumber}</p>}
          {!!reminder?.mobileNumber && <p className="text-xs text-gray-500 mt-1">Mobile: {reminder.mobileNumber}</p>}
        </>
      )}

      <div className="flex gap-3 mt-5">
        <button className="flex-1 py-3.5 rounded-lg bg-gray-100 text-gray-900 font-semibold" onClick={onClose}>
          Close
        </button>
        <button
          className="flex-1 py-3.5 rounded-lg bg-brand text-white font-semibold disabled:opacity-50"
          onClick={handleShare}
          disabled={loading}
        >
          {copied ? "Copied!" : navigator.share ? "Share" : "Copy"}
        </button>
      </div>
    </Modal>
  );
}
