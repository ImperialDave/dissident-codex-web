"use client";

import { FormEvent, useEffect, useState } from "react";
import { sanitizeUserError } from "@/lib/sanitizeError";
import { changePassword } from "@/services/authService";

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError(sanitizeUserError(err, "Could not change password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="codex-modal-overlay" onClick={onClose}>
      <div
        className="codex-modal max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="codex-modal-header">
          <h2 className="font-semibold">Change password</h2>
          <button
            type="button"
            onClick={onClose}
            className="codex-btn-ghost rounded-full px-2 py-1 text-sm"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="codex-modal-body space-y-3">
          <p className="text-xs text-slate-400">
            Enter your current password, then choose a new one (at least 6 characters).
          </p>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="codex-input w-full rounded-lg px-3 py-2"
            placeholder="Current password"
            autoComplete="current-password"
            required
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="codex-input w-full rounded-lg px-3 py-2"
            placeholder="New password"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="codex-input w-full rounded-lg px-3 py-2"
            placeholder="Confirm new password"
            autoComplete="new-password"
            minLength={6}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}
          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="codex-btn-accent w-full rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}