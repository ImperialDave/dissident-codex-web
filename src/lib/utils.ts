import { Timestamp } from "firebase/firestore";
import { FOUNDER_EMAIL } from "./constants";
import { roleFromString, type RoleName, type User } from "@/models";

export function isFounderEmail(email?: string | null): boolean {
  return email?.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
}

export function resolveRole(user?: User | null, emailHint?: string | null): RoleName {
  const email = user?.email || emailHint || "";
  if (isFounderEmail(email)) return "FOUNDER";
  return roleFromString(user?.role);
}

export function withResolvedRole(user: User, emailHint?: string | null): User {
  const role = resolveRole(user, emailHint);
  return user.role === role ? user : { ...user, role };
}

export function formatTimestamp(ts?: Timestamp | null): string {
  if (!ts) return "";
  const date = ts.toDate();
  return date.toLocaleString();
}

export function timeAgo(ts?: Timestamp | null): string {
  if (!ts) return "";
  const seconds = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function mapFirestoreError(message: string): string {
  if (message.includes("permission-denied")) {
    return "Permission denied. Try logging out and back in. On iPhone, use Safari directly (not an in-app browser from Discord/Instagram). If it still fails, your account profile may be incomplete — contact a mod.";
  }
  if (message.includes("unavailable")) {
    return "Service temporarily unavailable. Try again.";
  }
  return message;
}

function callableErrorFields(err: unknown): { code: string; message: string; details: string } {
  if (!err || typeof err !== "object") {
    return { code: "", message: err instanceof Error ? err.message : String(err ?? ""), details: "" };
  }
  const rec = err as { code?: string; message?: string; details?: unknown };
  const code = String(rec.code ?? "");
  const message = String(rec.message ?? "").trim();
  const details =
    typeof rec.details === "string"
      ? rec.details
      : rec.details != null
        ? JSON.stringify(rec.details)
        : "";
  return { code, message, details };
}

/** Firebase callable (httpsCallable) errors often surface as bare "internal". */
export function mapCallableError(err: unknown): string {
  const { code, message, details } = callableErrorFields(err);
  const combined = [message, details].filter(Boolean).join(" — ");

  if (code.includes("failed-precondition") && combined.toLowerCase().includes("livekit")) {
    return "Voice server is not configured. Deploy Cloud Functions with LiveKit env vars (npm run deploy:voice from a machine that has functions/.env).";
  }
  if (code.includes("unauthenticated")) {
    return "Sign in required for voice calls.";
  }
  if (code.includes("permission-denied")) {
    return mapFirestoreError(message || "permission-denied");
  }
  if (code.includes("not-found")) {
    return combined || "Voice session not found.";
  }
  if (code.includes("internal")) {
    if (combined && combined !== "internal") {
      return mapFirestoreError(combined);
    }
    return "Voice server error. LiveKit credentials may be missing on deployed Cloud Functions — run npm run deploy:voice with functions/.env filled in.";
  }
  if (message && message !== "internal") {
    return mapFirestoreError(message);
  }
  if (err instanceof Error && err.message && err.message !== "internal") {
    return mapFirestoreError(err.message);
  }
  return "Voice call failed. Try again or contact support.";
}

/** Account-deletion callable errors — not voice/LiveKit. */
export function mapDeleteAccountError(err: unknown): string {
  const { code, message, details } = callableErrorFields(err);
  const combined = [message, details].filter(Boolean).join(" — ");

  if (code.includes("unauthenticated")) {
    return "Sign in required.";
  }
  if (code.includes("permission-denied")) {
    return "Founder access required to delete accounts.";
  }
  if (code.includes("invalid-argument")) {
    return combined || "Invalid request.";
  }
  if (code.includes("failed-precondition")) {
    return combined || "This account cannot be deleted.";
  }
  if (code.includes("not-found")) {
    if (combined.toLowerCase().includes("user")) {
      return combined;
    }
    return (
      combined ||
      "Delete account function not found. Deploy functions:deleteUserAccount to Firebase."
    );
  }
  if (code.includes("internal")) {
    if (combined && combined !== "internal") {
      return mapFirestoreError(combined);
    }
    return "Account deletion failed on the server. Check Firebase Functions logs for deleteUserAccount.";
  }
  if (message && message !== "internal") {
    return mapFirestoreError(message);
  }
  if (err instanceof Error && err.message && err.message !== "internal") {
    return mapFirestoreError(err.message);
  }
  return "Account deletion failed. Try again or contact support.";
}

/** Safari private mode and some in-app browsers throw on localStorage writes. */
export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // non-fatal — drafts/theme prefs are optional
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // non-fatal
    }
  },
};

export function truncateAuthorName(name: string, max = 50): string {
  const trimmed = name.trim();
  if (!trimmed) return "User";
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

/** Firestore rejects documents containing undefined field values. */
export function stripUndefinedFields<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

export function dmRoomId(uidA: string, uidB: string): string {
  const sorted = [uidA, uidB].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

export function topicRoomId(categoryId: string): string {
  return `topic_${categoryId}`;
}

export function chessGameId(uidA: string, uidB: string): string {
  const sorted = [uidA, uidB].sort();
  return `chess_${sorted[0]}_${sorted[1]}`;
}

export function normalizeMediaUrl(url?: string | null): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

export function containsGifUrl(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("giphy.com") ||
    lower.includes("tenor.com") ||
    lower.includes(".gif")
  );
}

export function resolveMediaType(
  mediaType?: string | null,
  url?: string | null
): string | undefined {
  if (mediaType?.trim()) return mediaType.trim();
  if (!url?.trim()) return undefined;
  const lower = url.toLowerCase();
  if (
    lower.includes(".mp4") ||
    lower.includes(".webm") ||
    lower.includes(".mov") ||
    lower.includes("video")
  ) {
    return "video";
  }
  return containsGifUrl(url) ? "gif" : "image";
}

export function chatMessageType(
  mediaType?: string | null,
  imageUrl?: string | null
): string {
  const resolved = resolveMediaType(mediaType, imageUrl);
  if (resolved === "gif") return "gif";
  if (resolved === "video") return "video";
  if (resolved === "image" && imageUrl?.trim()) return "image";
  return "text";
}

export function chatMessagePreview(
  text: string,
  mediaType?: string | null
): string {
  const trimmed = text.trim();
  if (trimmed) return trimmed.slice(0, 120);
  const mt = mediaType?.toLowerCase();
  if (mt === "gif") return "[GIF]";
  if (mt === "video") return "[Video]";
  if (mt === "image") return "[Photo]";
  return "[Media]";
}

export function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
