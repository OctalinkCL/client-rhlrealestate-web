/** Piezas de interfaz compartidas por las herramientas (solo navegador). */

/** Conecta la zona de carga (Dropzone.astro): clic para elegir y arrastrar y soltar. */
export function bindDropzone(input: HTMLInputElement, onFiles: (files: File[]) => void) {
  const zone = input.closest<HTMLElement>("[data-dropzone]");

  input.addEventListener("change", () => {
    const files = Array.from(input.files ?? []);
    input.value = ""; // permite volver a elegir las mismas fotos
    if (files.length) onFiles(files);
  });

  if (!zone) return;
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (!input.disabled) zone.dataset.dragging = "";
  });
  zone.addEventListener("dragleave", (e) => {
    if (!zone.contains(e.relatedTarget as Node)) delete zone.dataset.dragging;
  });
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    delete zone.dataset.dragging;
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (!input.disabled && files.length) onFiles(files);
  });
}

/** Miniatura con nombre. Con `download`, un clic descarga esa foto. */
export function photoTile(url: string, name: string, download = false): HTMLLIElement {
  const li = document.createElement("li");
  const box = document.createElement(download ? "a" : "div");
  box.className = download
    ? "block overflow-hidden rounded-lg bg-white shadow-sm ring-rhl-primary hover:ring-2"
    : "block overflow-hidden rounded-lg bg-white shadow-sm";
  if (box instanceof HTMLAnchorElement) {
    box.href = url;
    box.download = name;
    box.title = `Descargar ${name}`;
  }

  const img = document.createElement("img");
  img.src = url;
  img.alt = name;
  img.loading = "lazy";
  img.decoding = "async";
  img.className = "aspect-4/3 w-full object-cover";

  const caption = document.createElement("span");
  caption.textContent = name;
  caption.className = "block truncate px-2 py-1.5 text-xs text-rhl-secondary";

  box.append(img, caption);
  li.append(box);
  return li;
}

/** "12 fotos" / "1 foto" */
export function photosLabel(n: number): string {
  return `${n} ${n === 1 ? "foto" : "fotos"}`;
}
