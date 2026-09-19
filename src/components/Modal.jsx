import React from "react";

// Generic modal shell used by every *Modal component in this app — the
// web equivalent of React Native's <Modal transparent animationType="fade">
// + a centered white card. Clicking the dark backdrop closes the modal
// (mirrors onRequestClose); clicking inside the card never does.
export default function Modal({ visible, onClose, children, maxWidth = "max-w-md" }) {
  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className={`w-full ${maxWidth} bg-white rounded-2xl p-5 max-h-[88vh] overflow-y-auto shadow-xl`}>
        {children}
      </div>
    </div>
  );
}
