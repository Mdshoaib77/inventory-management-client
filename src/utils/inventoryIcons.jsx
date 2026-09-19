import React from "react";
import {
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Type,
  ArrowUp,
  Banknote,
  PlusCircle,
  ShoppingCart,
  Pencil,
  Trash2,
  Receipt,
} from "lucide-react";

// Centralized icon mapping for the Inventory page — web equivalent of
// mobile/utils/inventoryIcons.js (Ionicons -> lucide-react, same set of
// concepts: one icon per filter/sort/action).
export const FILTER_ICONS = {
  All: LayoutGrid,
  "In Stock": CheckCircle2,
  "Low Stock": AlertTriangle,
  "Out of Stock": XCircle,
};

export const SORT_ICONS = {
  Newest: Clock,
  "Name A-Z": Type,
  "Quantity Low-High": ArrowUp,
  "Price Low-High": Banknote,
};

export const ACTION_ICONS = {
  stockIn: PlusCircle,
  sell: ShoppingCart,
  edit: Pencil,
  delete: Trash2,
  history: Receipt,
};

const CHIP_ICON_SIZE = 15;

// A single reusable chip used for BOTH filter and sort buttons, same as
// mobile's <Chip>. Fixed height/padding regardless of selected state —
// only background/text/icon color changes on selection.
export function Chip({ label, Icon, selected, onClick, variant = "filter" }) {
  const isFilter = variant === "filter";
  const base =
    "inline-flex items-center h-[34px] rounded-full font-semibold whitespace-nowrap flex-shrink-0 transition-colors";
  const filterClasses = isFilter
    ? selected
      ? "bg-brand border border-brand text-white px-3.5 text-[13px]"
      : "bg-white border border-gray-200 text-gray-700 px-3.5 text-[13px]"
    : selected
    ? "bg-gray-900 text-white px-3 text-xs"
    : "bg-gray-100 text-gray-500 px-3 text-xs";

  return (
    <button type="button" className={`${base} ${filterClasses} mr-2`} onClick={onClick}>
      <Icon size={CHIP_ICON_SIZE} className="mr-1.5 flex-shrink-0" />
      {label}
    </button>
  );
}
