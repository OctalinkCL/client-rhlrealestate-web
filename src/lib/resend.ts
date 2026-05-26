const strip = (str: string) => str.replace(/<[^>]*>/g, "").trim();

export interface ContactPayload {
  nombre: string;
  email: string;
  asunto?: string;
  mensaje: string;
}

export async function sendContactEmail(raw: ContactPayload) {
  const nombre = strip(raw.nombre ?? "");
  const email = strip(raw.email ?? "");
  const asunto = strip(raw.asunto ?? "");
  const mensaje = strip(raw.mensaje ?? "");

  if (!nombre || !email || !mensaje) {
    return { ok: false, status: 422, error: "Campos requeridos faltantes" };
  }

  console.debug("API_KEY", import.meta.env.RESEND_API_KEY)

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${import.meta.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "RHL Contacto <no-reply@rhlrealestate.cl>",
      to: "contacto@rhlrealestate.cl",
      reply_to: email,
      subject: `Contacto web${asunto ? ` — ${asunto}` : ""}`,
      text: `Nombre: ${nombre}\nEmail: ${email}\nAsunto: ${asunto || "—"}\n\n${mensaje}`,
    }),
  });

  if (!res.ok) {
    const resendError = await res.json().catch(() => ({}));
    console.error("[resend]", res.status, resendError);
    return { ok: false, status: 500, error: "Error al enviar el mensaje" };
  }

  return { ok: true, status: 200 };
}
