/**
 * Logo de RHL como marca de agua (solo navegador).
 *
 * Medido sobre las fotos publicadas por el cliente: el logo va centrado y su
 * ancho es ~70% del lado corto de la foto, con opacidad parcial.
 */

export const LOGO_URL = "/logo_rhl_white.svg";
/** Ancho del logo como fracción del lado corto de la imagen. */
export const LOGO_SCALE = 0.7;
export const LOGO_OPACITY = 0.6;

let svgSource: Promise<string> | null = null;
const rasterCache = new Map<number, Promise<HTMLImageElement>>();

function loadSvgSource(): Promise<string> {
  svgSource ??= fetch(LOGO_URL).then((res) => {
    if (!res.ok) throw new Error(`No se pudo cargar el logo (${res.status})`);
    return res.text();
  });
  return svgSource;
}

/**
 * El SVG trae width/height="100%": sin tamaño intrínseco el navegador no lo
 * dibuja de forma fiable en canvas. Se fija el tamaño en píxeles antes de cargarlo.
 */
async function rasterize(width: number): Promise<HTMLImageElement> {
  const doc = new DOMParser().parseFromString(
    await loadSvgSource(),
    "image/svg+xml",
  );
  const svg = doc.documentElement;
  const [, , vbW, vbH] = (svg.getAttribute("viewBox") ?? "0 0 420 60")
    .split(/[\s,]+/)
    .map(Number);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(Math.round((width * vbH) / vbW)));

  const blob = new Blob([new XMLSerializer().serializeToString(doc)], {
    type: "image/svg+xml",
  });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } finally {
    URL.revokeObjectURL(url);
  }
  return img;
}

/** Logo rasterizado al ancho pedido (cacheado: las fotos suelen repetir tamaño). */
export function getLogo(width: number): Promise<HTMLImageElement> {
  let logo = rasterCache.get(width);
  if (!logo) {
    logo = rasterize(width);
    rasterCache.set(width, logo);
    logo.catch(() => rasterCache.delete(width));
  }
  return logo;
}

export function logoWidthFor(w: number, h: number): number {
  return Math.round(Math.min(w, h) * LOGO_SCALE);
}

/** Dibuja el logo centrado. Síncrono para poder usarse por frame en el video. */
export function drawLogo(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  w: number,
  h: number,
  opacity = LOGO_OPACITY,
): void {
  const lw = logoWidthFor(w, h);
  const lh = Math.round((lw * logo.naturalHeight) / logo.naturalWidth);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(logo, Math.round((w - lw) / 2), Math.round((h - lh) / 2), lw, lh);
  ctx.restore();
}
