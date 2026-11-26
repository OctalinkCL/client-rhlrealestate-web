/**
 * Carrusel de Instagram 1:1 (solo navegador): portada + fotos + slide final.
 *
 * Las fotos vienen de assets.easybroker.com, que responde
 * `Access-Control-Allow-Origin: *`: con crossOrigin="anonymous" el canvas no
 * queda "contaminado" y se puede exportar. Ya traen el logo, no se agrega otro.
 */

export const SLIDE_SIZE = 1080;
export const MAX_SLIDES = 20; // límite de Instagram
/** Capa con zona transparente para la foto (provisional: luego el PNG del cliente). */
export const COVER_BASE_URL = "/tools/redes/portada-base.svg";
/** Slide final fijo: imagen original del cliente (1080×1080), se usa tal cual. */
export const FINAL_SLIDE_URL = "/tools/redes/final.png";
export const JPEG_QUALITY = 0.92;

const NAVY = "#072c5a";
const SANS = '"Inter Variable", "Inter", sans-serif';
const SERIF = '"EB Garamond", Georgia, serif';

// --- Carga de imágenes y fuentes ----------------------------------------

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  let pending = imageCache.get(url);
  if (!pending) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    pending = img.decode().then(() => img);
    imageCache.set(url, pending);
    pending.catch(() => imageCache.delete(url));
  }
  return pending;
}

let fontsReady: Promise<unknown> | null = null;

/** El canvas no espera las fuentes web: hay que cargarlas antes de dibujar. */
export function ensureFonts(): Promise<unknown> {
  fontsReady ??= Promise.all([
    document.fonts.load(`800 100px ${SANS}`),
    document.fonts.load(`700 40px ${SANS}`),
    document.fonts.load(`400 24px ${SANS}`),
    document.fonts.load(`italic 600 100px ${SERIF}`),
  ]);
  return fontsReady;
}

// --- Utilidades de dibujo -----------------------------------------------

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = SLIDE_SIZE;
  canvas.height = SLIDE_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

/** Recorte centrado que llena el cuadrado (las fotos de EB son 16:9). */
function drawCoverCrop(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.max(
    SLIDE_SIZE / img.naturalWidth,
    SLIDE_SIZE / img.naturalHeight,
  );
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (SLIDE_SIZE - w) / 2, (SLIDE_SIZE - h) / 2, w, h);
}

/**
 * Escribe el texto centrado en x, achicando la fuente hasta que quepa en
 * maxWidth; si ni al mínimo cabe, lo corta con "…".
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: (size: number) => string,
  size: number,
  minSize = Math.round(size * 0.7),
) {
  let s = size;
  ctx.font = font(s);
  while (s > minSize && ctx.measureText(text).width > maxWidth) {
    s -= 1;
    ctx.font = font(s);
  }
  let out = text;
  while (out.length > 1 && ctx.measureText(out).width > maxWidth) {
    out = out.slice(0, -2).trimEnd() + "…";
  }
  ctx.fillText(out, x, y);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

export function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo exportar el slide"))),
      "image/jpeg",
      JPEG_QUALITY,
    ),
  );
}

// --- Portada ------------------------------------------------------------

export interface CoverStatInput {
  label: string;
  icon: HTMLImageElement;
}

export interface CoverInput {
  photoUrl: string;
  /** "Venta" | "Arriendo" */
  operation: string;
  line1: string;
  line2: string;
  surface: string | null;
  stats: CoverStatInput[];
}

/**
 * "Venta / Disponible" en la parte superior. Tamaños fijos, como la referencia
 * del cliente (no se igualan anchos: en su portada "Venta" es más angosta).
 * `tracking` es el espacio entre letras como fracción del tamaño (negativo = más
 * apretado, como en la referencia).
 */
const HEADLINE = {
  operationY: 165,
  operationSize: 106,
  operationTracking: -0.045,
  availableY: 272,
  availableSize: 135,
  availableWeight: 600,
  availableTracking: -0.035,
};

const PANEL_CENTER = 600;
const TILE = { w: 132, h: 108, top: 922, slot: 190, icon: 64, radius: 8 };

export async function renderCover(canvas: HTMLCanvasElement, input: CoverInput): Promise<void> {
  const [photo, base] = await Promise.all([
    loadImage(input.photoUrl),
    loadImage(COVER_BASE_URL),
    ensureFonts(),
  ]);
  const ctx = context(canvas);

  drawCoverCrop(ctx, photo);
  ctx.drawImage(base, 0, 0, SLIDE_SIZE, SLIDE_SIZE);

  // "Venta / Disponible" arriba: las fotos de EasyBroker traen el logo al
  // centro, así que el texto no puede ir a media altura.
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 18;
  // letterSpacing en canvas: Chrome/Edge sí; donde no exista se ignora sin error
  ctx.letterSpacing = `${HEADLINE.operationTracking * HEADLINE.operationSize}px`;
  fitText(ctx, input.operation, 540, HEADLINE.operationY, 760, (s) => `800 ${s}px ${SANS}`, HEADLINE.operationSize);
  ctx.letterSpacing = `${HEADLINE.availableTracking * HEADLINE.availableSize}px`;
  fitText(
    ctx,
    "Disponible",
    540,
    HEADLINE.availableY,
    760,
    (s) => `italic ${HEADLINE.availableWeight} ${s}px ${SERIF}`,
    HEADLINE.availableSize,
  );
  ctx.restore();

  // Panel: ubicación y título
  ctx.fillStyle = NAVY;
  ctx.textAlign = "center";
  const titleFont = (s: number) => `700 ${s}px ${SANS}`;
  fitText(ctx, input.line1, PANEL_CENTER, 862, 880, titleFont, 38, 26);
  fitText(ctx, input.line2, PANEL_CENTER, 906, 880, titleFont, 38, 26);

  // Superficie a la izquierda (como en la referencia)
  const hasSurface = Boolean(input.surface);
  if (hasSurface) {
    const x = input.stats.length ? 160 : 540;
    ctx.font = `400 24px ${SANS}`;
    ctx.fillText("Superficie:", x, 962);
    ctx.font = `500 38px ${SANS}`;
    ctx.fillText(input.surface!, x, 1006);
  }

  // Hasta 3 datos con ícono blanco en cuadrado azul
  const n = input.stats.length;
  if (n) {
    const center = hasSurface ? 620 : 540;
    const start = center - (n * TILE.slot) / 2;
    input.stats.forEach((stat, i) => {
      const cx = start + TILE.slot * (i + 0.5);
      ctx.fillStyle = NAVY;
      roundRect(ctx, cx - TILE.w / 2, TILE.top, TILE.w, TILE.h, TILE.radius);
      ctx.drawImage(
        stat.icon,
        cx - TILE.icon / 2,
        TILE.top + (TILE.h - TILE.icon) / 2,
        TILE.icon,
        TILE.icon,
      );
      fitText(ctx, stat.label, cx, TILE.top + TILE.h + 34, TILE.slot - 8, (s) => `400 ${s}px ${SANS}`, 23, 17);
    });
  }
}

// --- Fotos y slide final ------------------------------------------------

export async function renderPhotoSlide(url: string): Promise<Blob> {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  drawCoverCrop(context(canvas), img);
  return canvasToJpeg(canvas);
}

export async function renderFinalSlide(): Promise<Blob> {
  const img = await loadImage(FINAL_SLIDE_URL);
  const canvas = document.createElement("canvas");
  drawCoverCrop(context(canvas), img);
  return canvasToJpeg(canvas);
}
