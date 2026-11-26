import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  canEncodeVideo,
} from "mediabunny";
import { prepareSoundtrack } from "./music";
import { drawLogo, getLogo, logoWidthFor } from "./watermark";

/**
 * Video horizontal (YouTube) con el mismo efecto del showcase de la ficha
 * (PropertyShowcase.astro): foto al 110%, paneo lateral ±4% alternando
 * dirección y fundido de 1 s en el que la foto saliente sigue moviéndose.
 * Todo se renderiza y codifica en el navegador (WebCodecs).
 */

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const FPS = 30;
export const SECONDS_PER_PHOTO = 4;
export const FADE_SECONDS = 1;

/** Igual que el showcase: scale-110 + translate ±4%. */
const ZOOM = 1.1;
const PAN = 0.04;
/** Fundido desde/hacia negro al inicio y al final del video. */
const EDGE_FADE_SECONDS = 0.5;
/** Bajo esta proporción (verticales, cuadradas) la foto va completa sobre un fondo desenfocado. */
const CONTAIN_BELOW_ASPECT = 1.2;

const SLIDE_W = Math.round(VIDEO_WIDTH * ZOOM);
const SLIDE_H = Math.round(VIDEO_HEIGHT * ZOOM);

export interface VideoProgress {
  /** 0 a 1 */
  fraction: number;
  label: string;
}

export interface VideoOptions {
  /** Dibuja el logo fijo encima del video (false si las fotos ya lo traen). */
  withLogo: boolean;
  /** URL de la pista de música; null = video sin audio. */
  musicUrl: string | null;
  onProgress?: (progress: VideoProgress) => void;
  signal?: AbortSignal;
}

export function videoDuration(photoCount: number): number {
  return photoCount * SECONDS_PER_PHOTO;
}

/** WebCodecs + H.264 a 1080p (Chrome/Edge sí; Safari/Firefox varía). */
export async function canCreateVideo(): Promise<boolean> {
  if (typeof VideoEncoder === "undefined") return false;
  try {
    return await canEncodeVideo("avc", {
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
    });
  } catch {
    return false;
  }
}

// --- Preparación de cada foto ------------------------------------------

type Ctx2D = OffscreenCanvasRenderingContext2D;

function drawCover(ctx: Ctx2D, img: CanvasImageSource & { width: number; height: number }, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function drawContain(ctx: Ctx2D, img: ImageBitmap, w: number, h: number) {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/**
 * Fondo desenfocado sin depender de ctx.filter (Safari no lo soporta):
 * se reduce la foto a una miniatura y se vuelve a ampliar.
 */
function drawBlurredBackdrop(ctx: Ctx2D, img: ImageBitmap, w: number, h: number) {
  const tiny = new OffscreenCanvas(48, 27);
  const tctx = tiny.getContext("2d")!;
  tctx.imageSmoothingQuality = "high";
  drawCover(tctx, img, tiny.width, tiny.height);

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tiny, 0, 0, w, h);
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, w, h);
}

/**
 * Cada foto se lleva una sola vez al tamaño que necesita el paneo
 * (110% del video). Así no se guardan fotos de 12 MP en memoria.
 */
async function prepareSlide(file: Blob): Promise<ImageBitmap> {
  const src = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const canvas = new OffscreenCanvas(SLIDE_W, SLIDE_H);
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";

    if (src.width / src.height >= CONTAIN_BELOW_ASPECT) {
      drawCover(ctx, src, SLIDE_W, SLIDE_H);
    } else {
      drawBlurredBackdrop(ctx, src, SLIDE_W, SLIDE_H);
      drawContain(ctx, src, SLIDE_W, SLIDE_H);
    }
    return canvas.transferToImageBitmap();
  } finally {
    src.close();
  }
}

// --- Render de cada frame ----------------------------------------------

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Paneo del showcase: dura la foto + el fundido de salida, de +4% a -4%
 * (pares) o de -4% a +4% (impares), lineal.
 */
function drawSlide(
  ctx: CanvasRenderingContext2D,
  slide: ImageBitmap,
  index: number,
  t: number,
  alpha = 1,
) {
  const p = clamp01((t - index * SECONDS_PER_PHOTO) / (SECONDS_PER_PHOTO + FADE_SECONDS));
  const direction = index % 2 === 0 ? 1 : -1;
  const offset = direction * PAN * (1 - 2 * p);

  ctx.globalAlpha = alpha;
  ctx.drawImage(
    slide,
    Math.round((VIDEO_WIDTH - SLIDE_W) / 2 + offset * VIDEO_WIDTH),
    Math.round((VIDEO_HEIGHT - SLIDE_H) / 2),
  );
  ctx.globalAlpha = 1;
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  slides: ImageBitmap[],
  logo: HTMLImageElement | null,
  t: number,
  total: number,
) {
  const index = Math.min(Math.floor(t / SECONDS_PER_PHOTO), slides.length - 1);
  const intoSlide = t - index * SECONDS_PER_PHOTO;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  if (index > 0 && intoSlide < FADE_SECONDS) {
    // La saliente sigue con su paneo y la entrante aparece encima
    drawSlide(ctx, slides[index - 1], index - 1, t);
    drawSlide(ctx, slides[index], index, t, intoSlide / FADE_SECONDS);
  } else {
    drawSlide(ctx, slides[index], index, t);
  }

  if (logo) drawLogo(ctx, logo, VIDEO_WIDTH, VIDEO_HEIGHT);

  const edge = Math.max(
    1 - t / EDGE_FADE_SECONDS,
    (t - (total - EDGE_FADE_SECONDS)) / EDGE_FADE_SECONDS,
  );
  if (edge > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${clamp01(edge)})`;
    ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  }
}

// --- Generación ---------------------------------------------------------

const nextTick = () => new Promise<void>((r) => setTimeout(r, 0));

function abortError() {
  return new DOMException("Video cancelado", "AbortError");
}

export async function createVideo(photos: Blob[], options: VideoOptions): Promise<Blob> {
  const { withLogo, musicUrl, onProgress, signal } = options;
  if (!photos.length) throw new Error("No hay fotos para el video");

  const total = videoDuration(photos.length);
  const slides: ImageBitmap[] = [];
  try {
    let soundtrack: AudioBuffer | null = null;
    if (musicUrl) {
      onProgress?.({ fraction: 0, label: "Preparando música…" });
      soundtrack = await prepareSoundtrack(musicUrl, total);
    }

    for (let i = 0; i < photos.length; i++) {
      if (signal?.aborted) throw abortError();
      onProgress?.({
        fraction: (i / photos.length) * 0.1,
        label: `Preparando foto ${i + 1} de ${photos.length}…`,
      });
      slides.push(await prepareSlide(photos[i]));
    }

    const logo = withLogo
      ? await getLogo(logoWidthFor(VIDEO_WIDTH, VIDEO_HEIGHT))
      : null;

    const canvas = document.createElement("canvas");
    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    ctx.imageSmoothingQuality = "high";

    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target: new BufferTarget(),
    });
    const source = new CanvasSource(canvas, {
      codec: "avc",
      quality: QUALITY_HIGH,
      keyFrameInterval: 2,
    });
    output.addVideoTrack(source, { frameRate: FPS });

    const audioSource = soundtrack
      ? new AudioBufferSource({ codec: "aac", quality: QUALITY_HIGH })
      : null;
    if (audioSource) output.addAudioTrack(audioSource);

    await output.start();

    const frames = Math.round(total * FPS);
    const startedAt = performance.now();
    // El audio se encola en paralelo: si se espera completo antes del video,
    // el muxer puede quedarse esperando frames para intercalar.
    const audioDone = audioSource
      ? audioSource.add(soundtrack!).then(() => audioSource.close())
      : Promise.resolve();
    audioDone.catch(() => {}); // el error se maneja al esperarlo abajo
    try {
      for (let f = 0; f < frames; f++) {
        if (signal?.aborted) throw abortError();
        const t = f / FPS;
        renderFrame(ctx, slides, logo, t, total);
        await source.add(t, 1 / FPS);

        if (f % FPS === 0) {
          // Tiempo restante según la velocidad real de este equipo
          const elapsed = (performance.now() - startedAt) / 1000;
          const remaining = f > 0 ? Math.ceil((elapsed / f) * (frames - f)) : null;
          onProgress?.({
            fraction: 0.1 + (f / frames) * 0.88,
            label:
              `Generando video… ${Math.round((f / frames) * 100)}%` +
              (remaining !== null && f >= FPS * 2 ? ` · quedan ~${remaining} s` : ""),
          });
          await nextTick(); // deja respirar a la UI
        }
      }
      onProgress?.({ fraction: 0.99, label: "Finalizando MP4…" });
      await audioDone;
      await output.finalize();
    } catch (err) {
      await output.cancel().catch(() => {});
      throw err;
    }

    onProgress?.({ fraction: 1, label: "Video listo" });
    return new Blob([output.target.buffer!], { type: "video/mp4" });
  } finally {
    slides.forEach((s) => s.close());
  }
}
