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
    return "Permission denied. Make sure you are signed in, then update Firestore/Storage rules in Firebase Console to allow the Codex web app (see firestore.rules in the project).";
  }
  if (message.includes("unavailable")) {
    return "Service temporarily unavailable. Try again.";
  }
  return message;
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
  return containsGifUrl(url) ? "gif" : "image";
}

export function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
