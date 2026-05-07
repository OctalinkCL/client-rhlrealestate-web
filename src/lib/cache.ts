const store = new Map<string, { data: unknown; expiresAt: number }>();

export function getCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlMs = 3_600_000): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Le dice al CDN de Vercel que cachee el HTML renderizado 1 hora.
// stale-while-revalidate sirve el HTML anterior mientras regenera en background.
export function setCacheHeaders(response: Response, maxAge = 3600): void {
  response.headers.set('Cache-Control', `s-maxage=${maxAge}, stale-while-revalidate=60`);
}
