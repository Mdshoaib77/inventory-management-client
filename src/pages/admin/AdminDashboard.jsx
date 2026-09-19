import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "../../components/ConfirmModal";

const SECTIONS = [
  { key: "PENDING", title: "Pending Requests", color: "amber" },
  { key: "APPROVED", title: "Approved Users", color: "emerald" },
  { key: "REJECTED", title: "Rejected Users", color: "red" },
];

// Tailwind needs full class names to appear somewhere in source for the JIT
// compiler to pick them up — so each color's classes are spelled out here
// instead of built with string interpolation like `bg-${color}-50`.
const COLOR_CLASSES = {
  amber: { pill: "bg-amber-50 text-amber-600", dot: "bg-amber-400" },
  emerald: { pill: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-400" },
  red: { pill: "bg-red-50 text-red-600", dot: "bg-red-400" },
};

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function UserRow({ user, onApprove, onReject, onDelete, busy }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 last:border-b-0 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{user.shopName}</p>
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
        {user.shopPhone && <p className="text-xs text-gray-500 truncate">📞 {user.shopPhone}</p>}
        {user.shopAddress && <p className="text-xs text-gray-400 truncate">📍 {user.shopAddress}</p>}
        <p className="text-[11px] text-gray-400 mt-0.5">Registered {formatDate(user.createdAt)}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {user.status !== "APPROVED" && (
          <button
            onClick={() => onApprove(user)}
            disabled={busy}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            Accept
          </button>
        )}
        {user.status !== "REJECTED" && (
          <button
            onClick={() => onReject(user)}
            disabled={busy}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
          >
            Reject
          </button>
        )}
        <button
          onClick={() => onDelete(user)}
          disabled={busy}
          className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  // Destructive-action confirmation modal state: { type: "reject"|"delete", user }
  const [confirmAction, setConfirmAction] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await client.get("/admin/users");
      setUsers(data);
    } catch (err) {
      setError(err?.friendlyMessage || err?.response?.data?.message || "Failed to load registration requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const grouped = useMemo(() => {
    const g = { PENDING: [], APPROVED: [], REJECTED: [] };
    for (const u of users) {
      if (g[u.status]) g[u.status].push(u);
    }
    return g;
  }, [users]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Accept has no destructive side-effect, so it runs immediately —
  // Reject and Delete go through the confirmation modal first.
  const handleApprove = async (target) => {
    setActionError("");
    setBusyId(target._id);
    try {
      await client.put(`/admin/users/${target._id}/approve`);
      setUsers((prev) => prev.map((u) => (u._id === target._id ? { ...u, status: "APPROVED" } : u)));
    } catch (err) {
      setActionError(err?.friendlyMessage || err?.response?.data?.message || "Failed to approve this account");
    } finally {
      setBusyId(null);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, user: target } = confirmAction;
    setActionError("");
    setBusyId(target._id);
    try {
      if (type === "reject") {
        await client.put(`/admin/users/${target._id}/reject`);
        setUsers((prev) => prev.map((u) => (u._id === target._id ? { ...u, status: "REJECTED" } : u)));
      } else if (type === "delete") {
        await client.delete(`/admin/users/${target._id}`);
        setUsers((prev) => prev.filter((u) => u._id !== target._id));
      }
      setConfirmAction(null);
    } catch (err) {
      setActionError(
        err?.friendlyMessage ||
          err?.response?.data?.message ||
          `Failed to ${type === "reject" ? "reject" : "delete"} this account`
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-brand leading-none">HisabKhata</p>
          <p className="text-xs text-gray-500 mt-1">Super Admin Dashboard · {user?.email}</p>
        </div>
        <button onClick={handleLogout} className="text-red-500 text-sm font-semibold px-3 py-2 hover:bg-red-50 rounded-lg">
          Logout
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {actionError && (
          <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{actionError}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
            {error}
            <button onClick={loadUsers} className="block mt-2 font-semibold underline">
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {SECTIONS.map((section) => {
              const list = grouped[section.key];
              const colors = COLOR_CLASSES[section.color];
              return (
                <div key={section.key} className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      {section.title}
                    </h2>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colors.pill}`}>{list.length}</span>
                  </div>

                  {list.length === 0 ? (
                    <p className="text-sm text-gray-400 py-6 text-center">No accounts here yet.</p>
                  ) : (
                    <div>
                      {list.map((u) => (
                        <UserRow
                          key={u._id}
                          user={u}
                          busy={busyId === u._id}
                          onApprove={handleApprove}
                          onReject={(target) => setConfirmAction({ type: "reject", user: target })}
                          onDelete={(target) => setConfirmAction({ type: "delete", user: target })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ConfirmModal
        visible={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
        loading={!!confirmAction && busyId === confirmAction.user._id}
        title={confirmAction?.type === "delete" ? "Delete this account?" : "Reject this registration?"}
        message={
          confirmAction?.type === "delete"
            ? `This will permanently delete ${confirmAction.user.shopName} (${confirmAction.user.email}). This cannot be undone.`
            : `${confirmAction?.user?.shopName} (${confirmAction?.user?.email}) will be blocked from logging in until approved again.`
        }
        confirmLabel={confirmAction?.type === "delete" ? "Delete" : "Reject"}
      />
    </div>
  );
}
