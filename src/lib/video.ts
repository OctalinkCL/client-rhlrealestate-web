/** Extrae el ID de YouTube de watch?v=, youtu.be/, /shorts/ y /embed/. */
export function youTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (!u.hostname.endsWith("youtube.com")) return null;
    return (
      u.searchParams.get("v") ??
      u.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/)?.[1] ??
      null
    );
  } catch {
    return null;
  }
}
