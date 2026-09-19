import React, { createContext, useState, useEffect, useContext } from "react";
import client, { setOnUnauthorized } from "../api/client";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If ANY request later gets a 401 (token expired mid-session, or the
    // account was removed), clear the session and drop back to Login.
    setOnUnauthorized(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    });
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("token");

      if (!storedUser || !storedToken) {
        setLoading(false);
        return;
      }

      // Show the cached session immediately so the app doesn't flash a
      // Login screen while we check the token — then confirm it's still
      // valid in the background.
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      try {
        const { data } = await client.get("/auth/me");
        // Refresh role/status in case the Super Admin changed it (e.g. an
        // account was rejected) since this token was issued.
        const merged = { ...parsedUser, ...data };
        localStorage.setItem("user", JSON.stringify(merged));
        setUser(merged);
      } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    const { data } = await client.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    return data;
  };

  // Public self-registration. The account created is always role "USER" /
  // status "PENDING" — the backend deliberately does NOT return a token
  // here, so this does NOT log the user in. The caller (Register.jsx)
  // shows a "waiting for approval" message instead of navigating into
  // the app. shopPhone is required by the backend; shopAddress is optional.
  const register = async (shopName, email, password, shopPhone, shopAddress) => {
    const { data } = await client.post("/auth/register", {
      shopName,
      email,
      password,
      shopPhone,
      shopAddress,
    });
    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
