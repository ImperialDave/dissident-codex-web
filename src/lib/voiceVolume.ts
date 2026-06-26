import { Track, type LocalAudioTrack, type RemoteAudioTrack, type Room } from "livekit-client";

export const VOICE_VOLUME_MIN_PERCENT = 10;
export const VOICE_VOLUME_MAX_PERCENT = 200;
export const VOICE_VOLUME_DEFAULT_PERCENT = 100;

export function clampVoiceVolumePercent(percent: number): number {
  return Math.min(VOICE_VOLUME_MAX_PERCENT, Math.max(VOICE_VOLUME_MIN_PERCENT, percent));
}

export function voiceVolumePercentToGain(percent: number): number {
  return clampVoiceVolumePercent(percent) / 100;
}

function isRemoteAudioTrack(track: unknown): track is RemoteAudioTrack {
  return Boolean(
    track &&
      typeof track === "object" &&
      "kind" in track &&
      (track as { kind?: string }).kind === Track.Kind.Audio &&
      "setVolume" in track
  );
}

export function applySpeakerVolumeToRoom(room: Room, percent: number) {
  const gain = voiceVolumePercentToGain(percent);
  room.remoteParticipants.forEach((participant) => {
    participant.audioTrackPublications.forEach((publication) => {
      const track = publication.track;
      if (isRemoteAudioTrack(track)) {
        track.setVolume(gain);
      }
    });
  });
}

type MicGainPipeline = {
  ctx: AudioContext;
  gain: GainNode;
  source: MediaStreamAudioSourceNode;
  inputTrackId: string;
};

let micGainPipeline: MicGainPipeline | null = null;

export function teardownMicGainPipeline() {
  if (!micGainPipeline) return;
  try {
    micGainPipeline.source.disconnect();
    micGainPipeline.gain.disconnect();
    void micGainPipeline.ctx.close();
  } catch {
    // Best-effort cleanup.
  }
  micGainPipeline = null;
}

export async function applyMicVolumeToRoom(room: Room, percent: number) {
  const gain = voiceVolumePercentToGain(percent);
  const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
  const track = publication?.track as LocalAudioTrack | undefined;
  const inputTrack = track?.mediaStreamTrack;
  if (!track || !inputTrack || !track.sender) return;

  if (!micGainPipeline || micGainPipeline.inputTrackId !== inputTrack.id) {
    teardownMicGainPipeline();
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(new MediaStream([inputTrack]));
    const gainNode = ctx.createGain();
    const dest = ctx.createMediaStreamDestination();
    source.connect(gainNode);
    gainNode.connect(dest);
    const processed = dest.stream.getAudioTracks()[0];
    await track.sender.replaceTrack(processed);
    micGainPipeline = { ctx, gain: gainNode, source, inputTrackId: inputTrack.id };
  }

  micGainPipeline.gain.gain.setTargetAtTime(gain, micGainPipeline.ctx.currentTime, 0.05);
}
