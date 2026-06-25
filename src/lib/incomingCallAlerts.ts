let ringInterval: ReturnType<typeof setInterval> | null = null;
let titleInterval: ReturnType<typeof setInterval> | null = null;
let audioContext: AudioContext | null = null;
let originalTitle = "";

function playBeep() {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.25);
  } catch {
    // Autoplay or Web Audio unavailable — tab title still flashes.
  }
}

export function startIncomingCallAlerts(callerName: string): void {
  stopIncomingCallAlerts();
  originalTitle = document.title;

  ringInterval = setInterval(playBeep, 2000);
  playBeep();

  let showAlt = false;
  titleInterval = setInterval(() => {
    showAlt = !showAlt;
    document.title = showAlt ? `(📞) ${callerName} is calling` : originalTitle;
  }, 1000);

  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification("Incoming voice call", {
        body: `${callerName} is calling you on Codex`,
        tag: "codex-incoming-call",
        requireInteraction: true,
      });
    } catch {
      // Notification API unavailable.
    }
  }
}

export function stopIncomingCallAlerts(): void {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
  }
  if (originalTitle) {
    document.title = originalTitle;
    originalTitle = "";
  }
}

export async function requestCallNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}
