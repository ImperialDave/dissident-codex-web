import assert from "node:assert/strict";
import test from "node:test";

// Standalone copy of rules — keep in sync with src/lib/sanitizeError.ts behavior checks.
const BRANDS = [/firebase/gi, /firestore/gi, /livekit/gi, /giphy/gi, /google/gi];

function hasBrand(text) {
  return BRANDS.some((pattern) => pattern.test(text));
}

test("strips firebase auth errors to neutral copy", async () => {
  const { sanitizeUserErrorMessage } = await import("../src/lib/sanitizeError.ts");
  const result = sanitizeUserErrorMessage(
    "Firebase: Error (auth/wrong-password)."
  );
  assert.equal(result, "Incorrect email or password.");
  assert.equal(hasBrand(result), false);
});

test("strips livekit deploy instructions", async () => {
  const { sanitizeUserErrorMessage } = await import("../src/lib/sanitizeError.ts");
  const result = sanitizeUserErrorMessage(
    "Deploy Cloud Functions with LiveKit env vars from dissident-codex-firebase"
  );
  assert.equal(hasBrand(result), false);
  assert.match(result, /try again|not available|went wrong/i);
});

test("maps permission-denied without vendor names", async () => {
  const { sanitizeUserErrorMessage } = await import("../src/lib/sanitizeError.ts");
  const result = sanitizeUserErrorMessage(
    "permission-denied: Missing or insufficient permissions."
  );
  assert.equal(hasBrand(result), false);
  assert.match(result, /permission denied/i);
});