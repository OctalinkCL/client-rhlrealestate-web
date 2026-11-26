import type { Property } from "@/lib/easybroker";
import { CONTACT_WHATSAPP } from "@/lib/contact";
import { formatNumber } from "@/lib/format";

/**
 * Borrador del texto para Instagram, armado solo con datos de EasyBroker
 * (sin IA). Formato acordado con ventas/community manager:
 *
 *   gancho (< 125 caracteres, lo que se ve antes de "… más")
 *   contexto (1–2 frases de la descripción)
 *   datos clave con emoji
 *   precio
 *   llamado a la acción + ficha web
 *   3–5 hashtags locales
 *
 * Regla: el gancho y los destacados salen SOLO de `features` (datos marcados
 * en EasyBroker), nunca de buscar palabras en la descripción: "estructura para
 * instalar ascensor" no es "con ascensor".
 */

/** Lo que Instagram muestra antes de "… más". */
export const CAPTION_VISIBLE_CHARS = 125;
export const CAPTION_MAX_CHARS = 2200;

type Group = "vista" | "equipamiento" | "exterior" | "seguridad" | "extras";

/**
 * Atributos de EasyBroker que venden, en orden de prioridad para el gancho.
 * Los que no aparecen aquí se ignoran (permitido/prohibido fumar, etc.).
 */
const FEATURES: { name: string; text: string; group: Group; hook?: boolean }[] = [
  { name: "Vista al mar", text: "vista al mar", group: "vista", hook: true },
  { name: "Frente a la playa", text: "frente a la playa", group: "vista", hook: true },
  { name: "Vista al agua", text: "vista al agua", group: "vista", hook: true },
  { name: "Frente al agua", text: "frente al agua", group: "vista", hook: true },
  { name: "Acceso a la playa", text: "acceso a la playa", group: "vista", hook: true },
  { name: "Piscina", text: "piscina", group: "equipamiento", hook: true },
  { name: "Jacuzzi", text: "jacuzzi", group: "equipamiento", hook: true },
  { name: "Jardín", text: "jardín", group: "exterior", hook: true },
  { name: "Terraza", text: "terraza", group: "exterior", hook: true },
  { name: "Gimnasio", text: "gimnasio", group: "equipamiento", hook: true },
  { name: "Cancha de tenis", text: "cancha de tenis", group: "equipamiento", hook: true },
  { name: "Seguridad 24 Horas", text: "seguridad 24 horas", group: "seguridad", hook: true },
  { name: "Chimenea", text: "chimenea", group: "equipamiento", hook: true },
  { name: "Balcón", text: "balcón", group: "exterior", hook: true },
  { name: "Ascensor", text: "ascensor", group: "equipamiento" },
  { name: "Aire acondicionado", text: "aire acondicionado", group: "equipamiento" },
  { name: "Calefacción", text: "calefacción", group: "equipamiento" },
  { name: "Patio", text: "patio", group: "exterior" },
  { name: "Parrilla", text: "parrilla", group: "exterior" },
  { name: "Portero", text: "portero", group: "seguridad" },
  { name: "Bodega", text: "bodega", group: "extras" },
  { name: "Estacionamiento techado", text: "estacionamiento techado", group: "extras" },
  { name: "Dormitorio de servicio", text: "dormitorio de servicio", group: "extras" },
  { name: "Baño de Servicio", text: "baño de servicio", group: "extras" },
  { name: "Mascotas permitidas", text: "se aceptan mascotas", group: "extras" },
];

const GROUP_EMOJI: Record<Group, string> = {
  vista: "🌊",
  equipamiento: "✨",
  exterior: "🌿",
  seguridad: "🛡",
  extras: "📦",
};
const GROUP_ORDER: Group[] = ["vista", "equipamiento", "exterior", "seguridad", "extras"];
const MAX_FEATURE_LINES = 3;

const TYPE_EMOJI: Record<string, string> = {
  Casa: "🏡",
  "Casa en condominio": "🏡",
  Departamento: "🏢",
  Oficina: "🏢",
  Edificio: "🏢",
  Local: "🏬",
  Bodega: "📦",
  Terreno: "🌳",
  Parcela: "🌳",
};

const OPERATION_WORD: Record<string, string> = {
  sale: "venta",
  rental: "arriendo",
  temporary_rental: "arriendo",
};

// --- Utilidades ------------------------------------------------------------

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** ["a", "b", "c"] → "a, b y c" */
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const m2 = (n: number) => `${formatNumber(n)} m²`;

/** "Lomas de San Andrés" → "lomasdesanandrés" (Instagram acepta tildes y ñ). */
const hashtag = (text: string) =>
  "#" + text.toLocaleLowerCase("es").replace(/[^\p{L}\p{N}]/gu, "");

/** "+56 9 4804 3836" */
function formatPhone(digits: string): string {
  const m = digits.match(/^56(9)(\d{4})(\d{4})$/);
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : `+${digits}`;
}

// --- Partes del texto ------------------------------------------------------

function locationParts(p: Property) {
  const [neighborhood = "", commune = ""] = (p.location?.name ?? "")
    .split(",")
    .map((s) => s.trim());
  return { neighborhood, commune };
}

/**
 * Atributos que dicen lo mismo que otro más específico: con "Vista al mar"
 * sobra "Vista al agua", con "Frente a la playa" sobra "Frente al agua".
 */
const REDUNDANT_WITH: Record<string, string[]> = {
  "Vista al agua": ["Vista al mar"],
  "Frente al agua": ["Frente a la playa", "Vista al mar", "Vista al agua"],
  "Acceso a la playa": ["Frente a la playa"],
};

function knownFeatures(p: Property) {
  const names = new Set((p.features ?? []).map((f) => f.name));
  return FEATURES.filter(
    (f) => names.has(f.name) && !(REDUNDANT_WITH[f.name] ?? []).some((n) => names.has(n)),
  );
}

/** EasyBroker manda el piso como número o como símbolo ("ground_floor"). */
function floorLabel(p: Property): string | null {
  const floor = String(p.floor ?? "").trim();
  if (floor === "ground_floor") return "Primer piso";
  if (!/^\d+$/.test(floor)) return null;
  return `Piso ${floor}${p.floors ? ` de ${p.floors}` : ""}`;
}

function buildHook(p: Property, features: ReturnType<typeof knownFeatures>): string {
  const { neighborhood, commune } = locationParts(p);
  const place = neighborhood || commune;
  const type = p.property_type || "Propiedad";
  const furnished = (p.features ?? []).some((f) => f.name === "Amoblado");
  const operation = OPERATION_WORD[p.operations?.[0]?.type ?? ""] ?? "venta";
  const emoji = TYPE_EMOJI[type] ?? "🏡";

  const feminine = /^(Casa|Oficina|Bodega|Parcela|Cabaña)/.test(type);
  const furnishedWord = furnished ? (feminine ? " amoblada" : " amoblado") : "";
  const base = `${type}${furnishedWord} en ${operation}${place ? ` en ${place}` : ""}`;
  // Solo una vista en el gancho ("con vista al mar", no tres variantes de agua)
  const hookFeatures = features.filter((f) => f.hook);
  const firstView = hookFeatures.find((f) => f.group === "vista");
  const attrs = hookFeatures
    .filter((f) => f.group !== "vista" || f === firstView)
    .map((f) => f.text);

  // Hasta 3 atributos, sacando los últimos si no cabe antes del "… más"
  for (let n = Math.min(3, attrs.length); n >= 0; n--) {
    const hook = `${base}${n ? ` con ${joinList(attrs.slice(0, n))}` : ""} ${emoji}`;
    if (hook.length <= CAPTION_VISIBLE_CHARS || n === 0) return hook;
  }
  return `${base} ${emoji}`;
}

/** 1–2 frases del primer párrafo de la descripción (el contexto, no el detalle). */
function buildContext(p: Property): string {
  const first = (p.description ?? "")
    .split(/\n\s*\n/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .find((s) => s && !/^[A-ZÁÉÍÓÚÑ\s]+:/.test(s)); // salta títulos tipo "PRIMER PISO:"
  if (!first) return "";

  const sentences = first.match(/[^.!?]+[.!?]+/g) ?? [first];
  let out = "";
  for (const s of sentences) {
    if (out && (out.length > 120 || out.split(/[.!?]/).length > 2)) break;
    out += s.trim() + " ";
  }
  out = out.trim();
  return out.length > 320 ? out.slice(0, 317).trimEnd() + "…" : out;
}

function buildFacts(p: Property, features: ReturnType<typeof knownFeatures>): string[] {
  const lines: string[] = [];

  const rooms = [
    p.bedrooms > 0 && `🛏 ${plural(p.bedrooms, "dormitorio", "dormitorios")}`,
    p.bathrooms > 0 &&
      `🛁 ${plural(p.bathrooms, "baño", "baños")}` +
        (p.half_bathrooms
          ? p.half_bathrooms === 1
            ? " + baño de visita"
            : ` + ${p.half_bathrooms} medios baños`
          : ""),
  ].filter(Boolean);
  if (rooms.length) lines.push(rooms.join(" · "));

  if (p.parking_spaces > 0) {
    lines.push(`🚗 ${plural(p.parking_spaces, "estacionamiento", "estacionamientos")}`);
  }

  const sizes = [
    p.construction_size > 0 && `${m2(p.construction_size)} construidos`,
    p.lot_size > 0 && `${m2(p.lot_size)} de terreno`,
  ].filter(Boolean);
  if (sizes.length) lines.push(`📐 ${sizes.join(" · ")}`);

  const floor = floorLabel(p);
  if (floor) lines.push(`🏢 ${floor}`);

  // Atributos agrupados: "🌿 Jardín, patio y terraza"
  const featureLines = GROUP_ORDER.map((group) => {
    const items = features.filter((f) => f.group === group).map((f) => f.text);
    return items.length ? `${GROUP_EMOJI[group]} ${capitalize(joinList(items))}` : null;
  }).filter((l): l is string => l !== null);
  lines.push(...featureLines.slice(0, MAX_FEATURE_LINES));

  return lines;
}

function buildPrice(p: Property): string {
  const ops = (p.operations ?? []).filter((op) => op.formatted_amount);
  if (!ops.length) return "";
  const price = (op: (typeof ops)[number]) =>
    op.type === "sale" ? op.formatted_amount : `${op.formatted_amount} / mes`;
  if (ops.length === 1) return `💰 ${price(ops[0])}`;
  return `💰 ${ops.map((op) => `${capitalize(OPERATION_WORD[op.type] ?? op.type)}: ${price(op)}`).join(" · ")}`;
}

function buildHashtags(p: Property): string {
  const { neighborhood, commune } = locationParts(p);
  const operation = OPERATION_WORD[p.operations?.[0]?.type ?? ""] ?? "venta";
  const typeWord = (p.property_type || "propiedad").split(" ")[0];
  const tags = [
    "rhlrealestate",
    neighborhood,
    commune,
    `${operation}${typeWord}`,
    commune && `propiedades${commune}`,
  ]
    .filter(Boolean)
    .map((t) => hashtag(t as string));
  return [...new Set(tags)].slice(0, 5).join(" ");
}

// --- Texto completo --------------------------------------------------------

export function buildCaption(p: Property): string {
  const features = knownFeatures(p);
  const blocks = [
    buildHook(p, features),
    buildContext(p),
    buildFacts(p, features).join("\n"),
    buildPrice(p),
    [
      `👉 Escríbenos por DM o al WhatsApp ${formatPhone(CONTACT_WHATSAPP)}.`,
      `Ficha completa con fotos y mapa en rhlrealestate.cl (link en la bio) · ${p.public_id}`,
    ].join("\n"),
    buildHashtags(p),
  ];
  return blocks.filter(Boolean).join("\n\n");
}
