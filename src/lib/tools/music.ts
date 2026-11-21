import { canEncodeAudio } from "mediabunny";

export const SAMPLE_RATE = 48_000;
export const CHANNELS = 2;
const FADE_IN_SECONDS = 0.5;
const FADE_OUT_SECONDS = 2;

/** AAC es el audio que esperan YouTube y los reproductores en un MP4. */
export async function canEncodeMusic(): Promise<boolean> {
  if (typeof AudioEncoder === "undefined") return false;
  try {
    return await canEncodeAudio("aac", {
      numberOfChannels: CHANNELS,
      sampleRate: SAMPLE_RATE,
    });
  } catch {
    return false;
  }
}

/**
 * Deja la pista exactamente del largo del video: la repite si es más corta,
 * la corta si es más larga, con fundido de entrada y de salida.
 */
export async function prepareSoundtrack(url: string, duration: number): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar la música (${res.status})`);

  const length = Math.ceil(duration * SAMPLE_RATE);
  const ctx = new OfflineAudioContext(CHANNELS, length, SAMPLE_RATE);
  const decoded = await ctx.decodeAudioData(await res.arrayBuffer());

  const source = ctx.createBufferSource();
  source.buffer = decoded;
  source.loop = true;

  const gain = ctx.createGain();
  const fadeOutStart = Math.max(FADE_IN_SECONDS, duration - FADE_OUT_SECONDS);
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(1, FADE_IN_SECONDS);
  gain.gain.setValueAtTime(1, fadeOutStart);
  gain.gain.linearRampToValueAtTime(0, duration);

  source.connect(gain).connect(ctx.destination);
  source.start(0);
  return ctx.startRendering();
}
