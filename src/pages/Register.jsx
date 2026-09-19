import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Once registration succeeds, we stop showing the form and show a
  // "waiting for approval" confirmation instead — there is no token to log
  // in with, since new accounts start out PENDING.
  const [submittedEmail, setSubmittedEmail] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!shopName.trim() || !email.trim() || !password || !shopPhone.trim()) {
      setError("Please fill all fields (phone number is required)");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!/^[0-9+\-\s]{7,20}$/.test(shopPhone.trim())) {
      setError("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    try {
      const data = await register(
        shopName.trim(),
        email.trim(),
        password,
        shopPhone.trim(),
        shopAddress.trim()
      );
      setSubmittedEmail(data?.email || email.trim());
    } catch (err) {
      setError(err?.friendlyMessage || err?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-3xl mx-auto mb-5">
            ⏳
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Registration Submitted</h1>
          <p className="text-sm text-gray-500 mt-3 leading-relaxed">
            Thanks! Your account for <span className="font-semibold text-gray-700">{submittedEmail}</span> has been
            created and is now <span className="font-semibold text-amber-600">waiting for Super Admin approval</span>.
            You'll be able to log in as soon as it's approved.
          </p>
          <Link
            to="/login"
            className="block w-full bg-brand text-white rounded-lg py-4 font-semibold mt-8 text-center"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <form className="w-full max-w-sm" onSubmit={handleRegister}>
        <h1 className="text-2xl font-bold text-brand text-center">Create Account</h1>
        <p className="text-sm text-gray-500 text-center mb-8">Register your shop on HisabKhata</p>

        {error && <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</p>}

        <p className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs rounded-lg p-3 mb-4">
          New accounts require Super Admin approval before you can log in. A valid phone number is
          required so the Super Admin can verify your shop before approving.
        </p>

        <input
          className="w-full border border-gray-300 rounded-lg p-3.5 mb-3.5 text-base"
          placeholder="Shop Name"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          disabled={loading}
        />
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
          placeholder="Password (min. 6 characters)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        <input
          className="w-full border border-gray-300 rounded-lg p-3.5 mb-3.5 text-base"
          placeholder="Phone Number"
          type="tel"
          value={shopPhone}
          onChange={(e) => setShopPhone(e.target.value)}
          disabled={loading}
        />
        <input
          className="w-full border border-gray-300 rounded-lg p-3.5 mb-3.5 text-base"
          placeholder="Shop Address (optional)"
          value={shopAddress}
          onChange={(e) => setShopAddress(e.target.value)}
          disabled={loading}
        />

        <button
          type="submit"
          className="w-full bg-brand text-white rounded-lg py-4 font-semibold mt-2 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Register"}
        </button>

        <Link to="/login" className="block text-center text-brand mt-5 text-sm">
          Already have an account? Login
        </Link>
      </form>
    </div>
  );
}
