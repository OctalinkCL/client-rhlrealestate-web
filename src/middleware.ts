import { defineMiddleware } from "astro:middleware";
import { TOOLS_COOKIE, isToolsPath, isValidSession } from "@/lib/tools-auth";

const PUBLIC_TOOLS_PATHS = new Set(["/tools/login", "/tools/login/"]);

/**
 * Protege /tools y /api/tools con la contraseña de TOOLS_PASSWORD.
 * Estas respuestas nunca se cachean en la CDN (a diferencia del sitio
 * público, que usa s-maxage): una página cacheada se serviría sin login.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search } = context.url;
  if (!isToolsPath(pathname)) return next();

  const authorized =
    PUBLIC_TOOLS_PATHS.has(pathname) ||
    isValidSession(context.cookies.get(TOOLS_COOKIE)?.value);

  let response: Response;
  if (authorized) {
    response = await next();
  } else if (pathname.startsWith("/api/")) {
    response = new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  } else {
    const nextParam = encodeURIComponent(pathname + search);
    response = context.redirect(`/tools/login?next=${nextParam}`, 302);
  }

  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
});
