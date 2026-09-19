import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      // The Super Admin account (role === "SUPER_ADMIN") goes to its own
      // dashboard; every normal, approved shop account goes to the
      // existing app dashboard as before.
      navigate(data?.role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err?.friendlyMessage || err?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <form className="w-full max-w-sm" onSubmit={handleLogin}>
        <h1 className="text-3xl font-bold text-brand text-center">HisabKhata</h1>
        <p className="text-sm text-gray-500 text-center mb-8">Smart Stock & Inventory Management</p>

        {error && <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4 whitespace-pre-line">{error}</p>}

        <input
          className="w-full border border-gray-300 rounded-lg p-3.5 mb-3.5 text-base"
          placeholder="Email"
          type="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <input
          className="w-full border border-gray-300 rounded-lg p-3.5 mb-3.5 text-base"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <button
          type="submit"
          className="w-full bg-brand text-white rounded-lg py-4 font-semibold mt-2 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <Link to="/register" className="block text-center text-brand mt-5 text-sm">
          Don't have an account? Register
        </Link>
      </form>
    </div>
  );
}
