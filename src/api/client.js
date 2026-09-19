import axios from "axios";

/**
 * Base URL resolution:
 * 1. VITE_API_URL from client/.env, if set — this is the recommended way
 *    to point the web app at your backend (local, LAN, or deployed).
 * 2. Fallback to http://localhost:5000/api for zero-config local dev.
 */
function resolveBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, "");
  }
  return "http://localhost:5000/api";
}

export const BASE_URL = resolveBaseUrl();

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Simple event hook so AuthContext can react when the backend rejects the
// current token (expired / user deleted) from ANY request, not just the
// startup check.
let onUnauthorized = null;
export function setOnUnauthorized(handler) {
  onUnauthorized = handler;
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.friendlyMessage =
        "Cannot connect to server. Make sure:\n" +
        "1) The backend is running (npm run dev in /server)\n" +
        "2) Your browser can reach the API\n" +
        `3) The API URL is correct (currently: ${BASE_URL})`;
    } else if (error.response.status === 401) {
      error.friendlyMessage = error.response.data?.message || "Your session has expired. Please log in again.";
      if (onUnauthorized) onUnauthorized();
    } else if (error.response.status >= 500) {
      error.friendlyMessage = "Server error. Check the backend terminal for details.";
    } else {
      error.friendlyMessage = error.response.data?.message || "Something went wrong.";
    }
    return Promise.reject(error);
  }
);

export default client;
