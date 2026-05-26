const strip = (str: string) => str.replace(/<[^>]*>/g, "").trim();

export interface ContactPayload {
  nombre: string;
  email: string;
  telefono: string;
  tipo: string;
  modalidad: string;
}

export async function sendContactEmail(raw: ContactPayload) {
  const nombre = strip(raw.nombre ?? "");
  const email = strip(raw.email ?? "");
  const telefono = strip(raw.telefono ?? "");
  const tipo = strip(raw.tipo ?? "");
  const modalidad = strip(raw.modalidad ?? "");

  if (!nombre || !email || !telefono || !tipo || !modalidad) {
    return { ok: false, status: 422, error: "Campos requeridos faltantes" };
  }

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
      subject: `Contacto Web — ${tipo} / ${modalidad}`,
      text: `Nombre: ${nombre}\nEmail: ${email}\nTeléfono: +56 ${telefono}\nTipo de propiedad: ${tipo}\nModalidad: ${modalidad}`,
    }),
  });

  if (!res.ok) {
    const resendError = await res.json().catch(() => ({}));
    console.error("[resend]", res.status, resendError);
    return { ok: false, status: 500, error: "Error al enviar el mensaje" };
  }

  return { ok: true, status: 200 };
}
