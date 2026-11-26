import { drawLogo, getLogo, logoWidthFor } from "./watermark";

/** Lado mayor máximo de la foto exportada (4K). Más grande solo pesa más. */
export const MAX_SIDE = 3840;
export const JPEG_QUALITY = 0.9;

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface ProcessedPhoto {
  name: string;
  blob: Blob;
  width: number;
  height: number;
}

export function isAcceptedPhoto(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}

/** Foto → JPG con el logo centrado. Respeta la orientación EXIF. */
export async function addLogoToPhoto(file: File): Promise<ProcessedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("El navegador no permite dibujar en canvas");

    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    drawLogo(ctx, await getLogo(logoWidthFor(width, height)), width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("No se pudo exportar la imagen");

    return { name: toJpgName(file.name), blob, width, height };
  } finally {
    bitmap.close();
  }
}

function toJpgName(name: string): string {
  return `${name.replace(/\.[^.]+$/, "") || "foto"}.jpg`;
}
