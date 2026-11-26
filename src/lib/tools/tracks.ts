/**
 * Pistas para el video. Descargadas de https://mixkit.co (licencia Mixkit:
 * uso comercial gratis, sin atribución). Pendiente: identificar el nombre
 * de cada pista en Mixkit para dejar la licencia documentada.
 *
 * Sin dependencias: se importa también desde el frontmatter (servidor).
 */
export const TRACKS = [
  { id: "pista-1", label: "Pista 1", url: "/tools/music/pista-1.mp3" },
  { id: "pista-2", label: "Pista 2", url: "/tools/music/pista-2.mp3" },
  { id: "pista-3", label: "Pista 3", url: "/tools/music/pista-3.mp3" },
] as const;
