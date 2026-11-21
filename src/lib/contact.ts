export const CONTACT_EMAIL = "contacto@rhlrealestate.cl";
export const CONTACT_WHATSAPP = "56948043836";

interface PropertyRef {
  title: string;
  publicId: string;
}

function propertyMessage({ title, publicId }: PropertyRef) {
  return `Hola, me interesa esta propiedad: "${title}" (ID: ${publicId})`;
}

/** Link de WhatsApp con mensaje prellenado sobre la propiedad. */
export function propertyWhatsappHref(property: PropertyRef) {
  const text = encodeURIComponent(propertyMessage(property));
  return `https://api.whatsapp.com/send/?phone=${CONTACT_WHATSAPP}&text=${text}&type=phone_number&app_absent=0`;
}

// --- Calificación de leads ---
// Preguntas de un toque que reemplazan el mensaje libre. Se usan en el
// formulario (RequestContact) y en el servidor (/api/lead) para validar
// las respuestas y armar el mensaje que llega a EasyBroker.

export type LeadOperation = "sale" | "rental";

export interface LeadQuestion {
  name: string;
  label: string;
  /** Etiqueta corta con la que aparece en el mensaje de EasyBroker */
  summary: string;
  options: string[];
}

export const LEAD_OPERATIONS: Record<LeadOperation, string> = {
  sale: "Comprar",
  rental: "Arrendar",
};

export const LEAD_QUESTIONS: Record<LeadOperation, LeadQuestion[]> = {
  sale: [
    {
      name: "plazo",
      label: "¿Para cuándo buscas?",
      summary: "Plazo",
      options: ["0 a 2 meses", "2 a 6 meses", "Más de 6 meses"],
    },
    {
      name: "financiamiento",
      label: "¿Cómo la financiarías?",
      summary: "Financiamiento",
      options: [
        "Contado",
        "Crédito pre-aprobado",
        "Necesito crédito",
        "Vendo otra propiedad",
      ],
    },
    {
      name: "proposito",
      label: "¿Para qué la quieres?",
      summary: "Propósito",
      options: ["Vivir", "Invertir"],
    },
  ],
  rental: [
    {
      name: "mudanza",
      label: "¿Para cuándo la necesitas?",
      summary: "Mudanza",
      options: ["Inmediato", "1 a 2 meses", "Más adelante"],
    },
    {
      name: "renta",
      label: "¿Cómo acreditas tu renta?",
      summary: "Acreditación de renta",
      options: ["Liquidaciones de sueldo", "Independiente (boletas)", "Con aval"],
    },
  ],
};

export function isLeadOperation(value: unknown): value is LeadOperation {
  return value === "sale" || value === "rental";
}

/**
 * Arma el mensaje estructurado para EasyBroker.
 * Devuelve null si falta alguna respuesta o no es una opción válida.
 */
export function buildLeadMessage(
  operation: LeadOperation,
  answers: Record<string, unknown>,
): string | null {
  const lines = [`Busca: ${LEAD_OPERATIONS[operation]}`];

  for (const question of LEAD_QUESTIONS[operation]) {
    const answer = answers[question.name];
    if (typeof answer !== "string" || !question.options.includes(answer)) {
      return null;
    }
    lines.push(`${question.summary}: ${answer}`);
  }

  return lines.join("\n");
}
