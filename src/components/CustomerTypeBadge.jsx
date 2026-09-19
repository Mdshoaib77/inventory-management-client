import React from "react";
import { CUSTOMER_TYPE_COLOR } from "../utils/customerType";

export default function CustomerTypeBadge({ type }) {
  const colors = CUSTOMER_TYPE_COLOR[type] || CUSTOMER_TYPE_COLOR["New Customer"];
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {type}
    </span>
  );
}
