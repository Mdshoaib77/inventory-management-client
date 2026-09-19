import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // The Super Admin account has its own dashboard and doesn't use the
  // regular shop app (inventory, customers, sales, etc.) at all.
  if (isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
