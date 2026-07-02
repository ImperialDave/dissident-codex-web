const DEFAULT_FALLBACK = "Something went wrong. Please try again.";

/** Error codes mapped to safe, vendor-neutral copy. */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  "permission-denied": "Permission denied. Try logging out and back in.",
  unavailable: "Service temporarily unavailable. Try again.",
  unauthenticated: "Sign in required.",
  "not-found": "Not found.",
  "failed-precondition": "This action is not available right now.",
  "invalid-argument": "Invalid request.",
  internal: "Server error. Try again later.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password is too weak. Use at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/operation-not-allowed": "Sign-in is not available right now.",
  "storage/unauthorized": "Upload blocked — sign in again or try a smaller file.",
  "storage/canceled": "Upload was canceled.",
  "storage/quota-exceeded": "Upload failed — file may be too large.",
  "storage/invalid-checksum": "Upload failed — try the file again.",
};

const BRAND_PATTERNS: RegExp[] = [
  /firebase\s+functions?/gi,
  /cloud\s+functions?/gi,
  /firestore/gi,
  /livekit/gi,
  /giphy/gi,
  /google\s+cloud/gi,
  /firebase/gi,
  /google/gi,
  /railway/gi,
  /vercel/gi,
  /amazon\s+web\s+services/gi,
  /\baws\b/gi,
  /cloudinary/gi,
  /twilio/gi,
  /sendgrid/gi,
  /algolia/gi,
  /openai/gi,
  /tenor/gi,
];

const INTERNAL_HINTS = [
  /https?:\/\//i,
  /\bnpm\s+run\b/i,
  /\bdeploy\b/i,
  /\.env\b/i,
  /dissident-codex/i,
  /functions\//i,
  /storage\//i,
  /\benv\s+var/i,
  /\bcredentials?\b/i,
  /\bconfigured\b/i,
  /\bapi\s+key\b/i,
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractErrorCodes(message: string): string[] {
  const codes = new Set<string>();
  const patterns = [
    /(?:^|\s|\()([a-z]+(?:\/[a-z0-9_-]+)+)(?:\)|\s|$|\.)/gi,
    /(?:^|\s)(permission-denied|unavailable|unauthenticated|not-found|internal|failed-precondition)(?:\s|$|\.)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of message.matchAll(pattern)) {
      const code = match[1]?.toLowerCase();
      if (code) codes.add(code);
    }
  }

  return [...codes];
}

function mapKnownCodes(message: string): string | null {
  const lower = message.toLowerCase();

  if (lower.includes("permission-denied") || lower.includes("missing or insufficient permissions")) {
    return ERROR_CODE_MESSAGES["permission-denied"]!;
  }
  if (lower.includes("unavailable")) {
    return ERROR_CODE_MESSAGES.unavailable!;
  }
  if (lower.includes("failed-precondition") && lower.includes("index")) {
    return "Search index is still building — try again in a few minutes.";
  }
  if (lower.includes("failed-precondition") && lower.includes("livekit")) {
    return "Voice calls are not available right now. Try again later.";
  }
  if (lower.includes("not-found") && lower.includes("function")) {
    return "This feature is not available right now.";
  }

  for (const code of extractErrorCodes(message)) {
    const mapped = ERROR_CODE_MESSAGES[code];
    if (mapped) return mapped;
    const slash = code.includes("/") ? code.slice(code.indexOf("/") + 1) : null;
    if (slash && ERROR_CODE_MESSAGES[slash]) return ERROR_CODE_MESSAGES[slash]!;
  }

  return null;
}

function stripBrands(message: string): string {
  let next = message;
  for (const pattern of BRAND_PATTERNS) {
    next = next.replace(pattern, "");
  }
  return normalizeWhitespace(
    next
      .replace(/\(\s*\)/g, "")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/^[,.;:\-–—]+\s*/g, "")
      .replace(/\s*[,.;:\-–—]+$/g, "")
  );
}

function looksInternal(message: string): boolean {
  const lower = message.toLowerCase();
  if (!lower) return true;
  if (INTERNAL_HINTS.some((pattern) => pattern.test(lower))) return true;
  if (/^error\b/i.test(lower) && lower.length < 24) return true;
  if (/^(internal|unknown|failed)$/i.test(lower)) return true;
  if (/^[a-z]+(?:\/[a-z0-9_-]+)+$/i.test(lower)) return true;
  return false;
}

/** Remove vendor names and technical leakage from a user-visible error string. */
export function sanitizeUserErrorMessage(
  message: string,
  fallback = DEFAULT_FALLBACK
): string {
  const trimmed = normalizeWhitespace(message);
  if (!trimmed) return fallback;

  const mapped = mapKnownCodes(trimmed);
  if (mapped) return mapped;

  const stripped = stripBrands(trimmed);
  if (!stripped || looksInternal(stripped)) return fallback;

  const remapped = mapKnownCodes(stripped);
  if (remapped) return remapped;

  if (looksInternal(stripped)) return fallback;
  return stripped;
}

/** Normalize any thrown value into safe user-facing copy. */
export function sanitizeUserError(err: unknown, fallback = DEFAULT_FALLBACK): string {
  if (!err) return fallback;

  if (typeof err === "string") {
    return sanitizeUserErrorMessage(err, fallback);
  }

  if (err instanceof Error) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code ?? "")
        : "";
    const parts = [code, err.message].filter(Boolean).join(" ");
    return sanitizeUserErrorMessage(parts || err.message, fallback);
  }

  if (typeof err === "object") {
    const rec = err as { code?: string; message?: string; details?: unknown };
    const details =
      typeof rec.details === "string"
        ? rec.details
        : rec.details != null
          ? JSON.stringify(rec.details)
          : "";
    const combined = [rec.code, rec.message, details].filter(Boolean).join(" — ");
    if (combined) return sanitizeUserErrorMessage(combined, fallback);
  }

  return sanitizeUserErrorMessage(String(err), fallback);
}