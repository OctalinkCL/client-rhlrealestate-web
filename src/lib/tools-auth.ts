import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Acceso a /tools: una sola contraseña compartida (TOOLS_PASSWORD en .env).
 *
 * La cookie guarda un HMAC derivado de la contraseña, nunca la contraseña.
 * Cambiar TOOLS_PASSWORD invalida todas las sesiones abiertas.
 */

export const TOOLS_COOKIE = "rhl_tools";
export const TOOLS_SESSION_DAYS = 30;

function password(): string | null {
  const value = import.meta.env.TOOLS_PASSWORD;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function isToolsConfigured(): boolean {
  return password() !== null;
}

/** Compara en tiempo constante (se hashea antes para igualar largos). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(input: string): boolean {
  const pw = password();
  return pw !== null && safeEqual(input, pw);
}

export function sessionToken(): string | null {
  const pw = password();
  if (!pw) return null;
  return createHmac("sha256", pw).update("rhl-tools-session-v1").digest("hex");
}

export function isValidSession(cookie: string | undefined): boolean {
  const expected = sessionToken();
  return !!cookie && expected !== null && safeEqual(cookie, expected);
}

/** Solo permite volver a rutas internas de /tools (evita open redirects). */
export function safeNext(next: string | null | undefined): string {
  return next && isToolsPath(next) && !next.startsWith("//")
    ? next
    : "/tools";
}

export function isToolsPath(pathname: string): boolean {
  return (
    pathname === "/tools" ||
    pathname.startsWith("/tools/") ||
    pathname.startsWith("/api/tools/")
  );
}
