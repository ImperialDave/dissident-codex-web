"use client";

import { useEffect, useState } from "react";
import { deleteUserAccount } from "@/services/moderationService";
import type { User } from "@/models";
import { isFounderEmail } from "@/lib/utils";

interface DeleteAccountButtonProps {
  target: User;
  onDeleted?: () => void | Promise<void>;
  onError?: (message: string) => void;
  compact?: boolean;
}

export function DeleteAccountButton({
  target,
  onDeleted,
  onError,
  compact = false,
}: DeleteAccountButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const protectedAccount = isFounderEmail(target.email);

  useEffect(() => {
    if (!open) return;
    setConfirmText("");
    setError("");
  }, [open]);

  if (protectedAccount) return null;

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      await deleteUserAccount(target.uid);
      setOpen(false);
      await onDeleted?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete account";
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }

  const canConfirm = confirmText.trim().toUpperCase() === "DELETE";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`codex-btn-danger rounded-lg text-sm ${compact ? "px-3 py-1" : "px-4 py-2"}`}
      >
        Delete account
      </button>

      {open && (
        <div className="codex-modal-overlay">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="codex-modal max-w-md"
          >
            <div className="codex-modal-body">
            <h2 id="delete-account-title" className="text-lg font-semibold text-white">
              Delete account permanently?
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              This removes <span className="font-medium text-white">{target.displayName}</span>
              {target.email ? ` (${target.email})` : ""} from Firebase Auth and Codex. Their posts
              and comments will show as &quot;Deleted user&quot;.
            </p>
            <p className="mt-3 text-sm text-red-300">This cannot be undone.</p>

            <label className="mt-4 block text-sm text-slate-400">
              Type <span className="font-mono text-slate-200">DELETE</span> to confirm
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="codex-input mt-2 w-full rounded-lg px-3 py-2"
                placeholder="DELETE"
                autoComplete="off"
              />
            </label>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="codex-btn-secondary rounded-full px-4 py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading || !canConfirm}
                className="codex-btn-danger rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {loading ? "Deleting…" : "Delete account"}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}