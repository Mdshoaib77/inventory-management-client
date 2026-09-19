import React from "react";
import { STOCK_STATUS_LABEL, STOCK_STATUS_COLOR } from "../utils/stockStatus";

export default function StatusBadge({ status }) {
  const colors = STOCK_STATUS_COLOR[status] || STOCK_STATUS_COLOR.IN_STOCK;
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {STOCK_STATUS_LABEL[status]}
    </span>
  );
}
