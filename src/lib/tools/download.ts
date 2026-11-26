import { zipSync, type Zippable } from "fflate";

export interface NamedBlob {
  name: string;
  blob: Blob;
}

/** Evita nombres repetidos dentro del ZIP: foto.jpg, foto-2.jpg, ... */
export function uniqueName(name: string, used: Set<string>): string {
  let candidate = name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let i = 2; used.has(candidate.toLowerCase()); i++) {
    candidate = `${base}-${i}${ext}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Arma el ZIP sin recomprimir: JPG y MP4 ya vienen comprimidos y
 * comprimirlos de nuevo solo gasta tiempo.
 */
export async function buildZip(files: NamedBlob[]): Promise<Blob> {
  const used = new Set<string>();
  const entries: Zippable = {};
  for (const { name, blob } of files) {
    const data = new Uint8Array(await blob.arrayBuffer());
    entries[uniqueName(name, used)] = [data, { level: 0 }];
  }
  const zipped = zipSync(entries);
  return new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  // Safari necesita que la URL siga viva un momento después del click
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** fecha local YYYY-MM-DD para nombres de archivo */
export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
