import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import InventoryList from "./pages/inventory/InventoryList";
import AddProduct from "./pages/inventory/AddProduct";
import CustomerList from "./pages/customers/CustomerList";
import CustomerProfile from "./pages/customers/CustomerProfile";
import AddCustomer from "./pages/customers/AddCustomer";
import DueManagement from "./pages/customers/DueManagement";
import Scan from "./pages/Scan";
import Checkout from "./pages/Checkout";
import History from "./pages/History";
import AdminDashboard from "./pages/admin/AdminDashboard";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Super Admin Approval System: standalone dashboard, no sidebar/
              tab-bar Layout — it's a separate app surface from the shop app. */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            <Route path="inventory" element={<InventoryList />} />
            <Route path="inventory/add" element={<AddProduct />} />
            <Route path="inventory/edit/:id" element={<AddProduct />} />

            <Route path="customers" element={<CustomerList />} />
            <Route path="customers/add" element={<AddCustomer />} />
            <Route path="customers/edit/:id" element={<AddCustomer />} />
            <Route path="customers/due" element={<DueManagement />} />
            <Route path="customers/:id" element={<CustomerProfile />} />

            <Route path="scan" element={<Scan />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="history" element={<History />} />
          </Route>

          {/* Checkout is registered as a sibling route reachable from both
              Inventory and Scan, same as mobile App.js registering
              CheckoutScreen at the root Stack Navigator level. */}

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}
