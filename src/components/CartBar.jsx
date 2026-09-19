import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, ChevronRight } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function CartBar() {
  const { itemCount, subtotal } = useCart();
  const navigate = useNavigate();

  if (itemCount === 0) return null;

  return (
    <div className="fixed left-0 right-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none">
      <button
        className="pointer-events-auto flex items-center w-full max-w-md bg-gray-900 rounded-2xl py-2.5 px-3.5 shadow-xl hover:bg-gray-800 transition-colors"
        onClick={() => navigate("/checkout")}
      >
        <div className="relative mr-3 flex-shrink-0">
          <ShoppingCart size={20} className="text-white" />
          <span className="absolute -top-2 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-gray-900">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        </div>
        <div className="flex-1 text-left mr-2 min-w-0">
          <p className="text-white font-bold text-sm truncate">View Cart</p>
          <p className="text-gray-400 text-[11px] truncate">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </p>
        </div>
        <p className="text-indigo-300 font-bold text-[15px] mr-1 whitespace-nowrap">৳{subtotal.toFixed(2)}</p>
        <ChevronRight size={18} className="text-indigo-300" />
      </button>
    </div>
  );
}
