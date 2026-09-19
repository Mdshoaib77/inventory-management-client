import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CartBar from "./CartBar";

// Same 5 sections + icons as mobile/navigation/MainTabs.js's `icons` map,
// laid out as a sidebar on desktop / bottom tab bar on mobile widths
// (React Router replacing React Navigation's bottom tabs + nested stacks).
const TABS = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/inventory", label: "Inventory", icon: "📦" },
  { to: "/customers", label: "Customers", icon: "👥" },
  { to: "/scan", label: "Scan", icon: "📷" },
  { to: "/history", label: "History", icon: "🧾" },
];

function TabLink({ tab, vertical }) {
  return (
    <NavLink
      to={tab.to}
      className={({ isActive }) =>
        vertical
          ? `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
              isActive ? "bg-indigo-50 text-brand" : "text-gray-500 hover:bg-gray-50"
            }`
          : `flex flex-col items-center justify-center flex-1 py-2 text-[11px] font-semibold ${
              isActive ? "text-brand" : "text-gray-400"
            }`
      }
    >
      <span className={vertical ? "text-lg" : "text-xl"}>{tab.icon}</span>
      <span className={vertical ? "" : "mt-0.5"}>{tab.label}</span>
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:flex-shrink-0 bg-white border-r border-gray-200 p-4">
        <div className="px-2 py-3 mb-2">
          <p className="text-xl font-bold text-brand">HisabKhata</p>
          <p className="text-xs text-gray-500 mt-1 truncate">{user?.shopName}</p>
        </div>
        <nav className="flex-1 flex flex-col gap-1">
          {TABS.map((tab) => (
            <TabLink key={tab.to} tab={tab} vertical />
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-4 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 text-left"
        >
          Logout
        </button>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-brand leading-none">HisabKhata</p>
            <p className="text-xs text-gray-500 mt-0.5">{user?.shopName}</p>
          </div>
          <button onClick={handleLogout} className="text-red-500 text-sm font-semibold">
            Logout
          </button>
        </header>

        <main className="flex-1 pb-20 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex">
          {TABS.map((tab) => (
            <TabLink key={tab.to} tab={tab} />
          ))}
        </nav>
      </div>

      <CartBar />
    </div>
  );
}
