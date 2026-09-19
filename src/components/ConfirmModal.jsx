import React from "react";
import Modal from "./Modal";

// Generic "are you sure?" confirmation dialog, styled to match the rest of
// the app's modals (built on the shared <Modal> shell). Used by the Super
// Admin Dashboard before Reject / Delete actions.
export default function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  loading = false,
}) {
  return (
    <Modal visible={visible} onClose={loading ? undefined : onClose} maxWidth="max-w-sm">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-2 leading-relaxed">{message}</p>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 ${
            danger ? "bg-red-500 hover:bg-red-600" : "bg-brand hover:bg-brand-dark"
          }`}
        >
          {loading ? "Please wait..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
