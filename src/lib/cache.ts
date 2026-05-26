export function setCacheHeaders(response: { headers: Headers }, maxAge = 3600): void {
  response.headers.set('Cache-Control', `s-maxage=${maxAge}, stale-while-revalidate=60`);
}
