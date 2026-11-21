import type { APIRoute } from "astro";
import { createContactRequest, EasyBrokerError } from "../../lib/easybroker";
import { buildLeadMessage, isLeadOperation } from "../../lib/contact";

const clean = (value: unknown, max: number) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, max);

const json = (body: object, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.json().catch(() => null);
  if (!raw) return json({ error: "Solicitud inválida" }, 400);

  // Honeypot: los bots llenan el campo oculto; respondemos ok sin crear lead
  if (raw.website) return json({ ok: true }, 200);

  const property_id = clean(raw.property_id, 20);
  const name = clean(raw.name, 100);
  const email = clean(raw.email, 150);
  const digits = clean(raw.phone, 20).replace(/\D/g, "");

  if (!/^EB-[A-Z0-9]+$/i.test(property_id)) {
    return json({ error: "Propiedad inválida" }, 422);
  }

  const message = isLeadOperation(raw.operation)
    ? buildLeadMessage(raw.operation, raw)
    : null;
  if (!message) {
    return json({ error: "Responde todas las preguntas." }, 422);
  }

  if (!name || (!email && !digits)) {
    return json({ error: "Completa tu nombre y un email o teléfono." }, 422);
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "El email no es válido." }, 422);
  }
  if (digits && digits.length !== 8) {
    return json({ error: "El teléfono debe tener 8 dígitos." }, 422);
  }

  try {
    await createContactRequest({
      property_id,
      name,
      email: email || undefined,
      phone: digits ? `+569${digits}` : undefined,
      message,
    });
    return json({ ok: true }, 200);
  } catch (error) {
    console.error("[lead]", error);
    if (error instanceof EasyBrokerError && error.status === 404) {
      return json({ error: "Esta propiedad ya no está disponible." }, 404);
    }
    if (error instanceof EasyBrokerError && error.status === 422) {
      return json({ error: "Revisa los datos ingresados." }, 422);
    }
    return json({ error: "Ocurrió un error. Intenta nuevamente." }, 502);
  }
};
