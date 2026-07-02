import { sanitizeUserError, sanitizeUserErrorMessage } from "@/lib/sanitizeError";
import { useVoiceUiStore } from "@/stores/voiceUiStore";

export type MicrophoneAccessStatus = "granted" | "denied" | "unsupported" | "error";

export interface MicrophoneAccessResult {
  status: MicrophoneAccessStatus;
  message?: string;
}

function micErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return "Microphone access was blocked. Allow microphone in your browser site settings and try again.";
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      return "No microphone was found. Connect a microphone and try again.";
    }
    if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      return "Microphone is in use by another app. Close other apps using the mic and try again.";
    }
  }
  return sanitizeUserError(err, "Could not access microphone");
}

export async function requestMicrophoneAccess(): Promise<MicrophoneAccessResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      status: "unsupported",
      message: "Microphone is not supported in this browser.",
    };
  }
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return {
      status: "error",
      message: "Microphone requires a secure connection (HTTPS).",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return { status: "granted" };
  } catch (err) {
    const message = micErrorMessage(err);
    if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
      return { status: "denied", message };
    }
    return { status: "error", message };
  }
}

export async function queryMicrophonePermission(): Promise<PermissionState | "unknown"> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown";
  }
  try {
    const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return result.state;
  } catch {
    return "unknown";
  }
}

/** Request mic on a user click; updates voiceUiStore and returns the access result. */
export async function ensureMicrophoneForVoice(): Promise<MicrophoneAccessResult> {
  const result = await requestMicrophoneAccess();
  const store = useVoiceUiStore.getState();

  if (result.status === "granted") {
    store.setMicPreflightGranted(true);
    store.setShowMicDeniedDialog(false);
    return result;
  }

  store.setMicPreflightGranted(false);
  if (result.status === "denied") {
    store.setShowMicDeniedDialog(true);
  }
  return result;
}

export function mapMicrophoneConnectError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (
    message.includes("NotAllowedError") ||
    message.includes("Permission denied") ||
    message.includes("permission") ||
    message.toLowerCase().includes("notallowed")
  ) {
    return "Microphone blocked — allow in site settings, then try again.";
  }
  return sanitizeUserErrorMessage(message, "Could not connect microphone.");
}
