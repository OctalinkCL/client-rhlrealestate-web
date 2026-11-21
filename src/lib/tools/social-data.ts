import type { Property } from "@/lib/easybroker";
import { formatNumber } from "@/lib/format";

/**
 * Datos de una propiedad para armar el carrusel de redes. Se calcula en el
 * servidor (la API key nunca llega al navegador) y se entrega al cliente como JSON.
 */

export type StatKey =
  | "bedrooms"
  | "bathrooms"
  | "half_bathrooms"
  | "parking_spaces"
  | "construction_size"
  | "lot_size"
  | "floors"
  | "floor"
  | "age";

export interface CoverStat {
  key: StatKey;
  /** Texto bajo el ícono: "2 dormitorios" */
  label: string;
}

export interface SocialProperty {
  id: string;
  title: string;
  type: string;
  /** "Venta" | "Arriendo" según las operaciones de EasyBroker */
  operations: string[];
  price: string | null;
  /** Primer tramo de la ubicación ("Lomas de San Andrés") */
  neighborhood: string;
  location: string;
  /** Superficie destacada a la izquierda de la portada ("67 m²") */
  surface: string | null;
  stats: CoverStat[];
  /** Datos marcados por defecto en la portada (máximo 3) */
  defaultStats: StatKey[];
  images: string[];
}

export const MAX_COVER_STATS = 3;

const OPERATION_LABEL: Record<string, string> = {
  sale: "Venta",
  rental: "Arriendo",
  temporary_rental: "Arriendo",
};

/** Tipos que muestran dormitorios/baños/estacionamientos por defecto. */
const RESIDENTIAL = new Set(["Casa", "Casa en condominio", "Departamento"]);
const LAND = new Set(["Terreno", "Parcela", "Sitio"]);

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const m2 = (value: number) => `${formatNumber(value)} m²`;

function buildStats(p: Property): CoverStat[] {
  const age = String(p.age ?? "").trim();
  const stats: (CoverStat | false | null | undefined | 0)[] = [
    p.bedrooms > 0 && {
      key: "bedrooms",
      label: plural(p.bedrooms, "dormitorio", "dormitorios"),
    },
    p.bathrooms > 0 && {
      key: "bathrooms",
      label: plural(p.bathrooms, "baño", "baños"),
    },
    p.half_bathrooms && {
      key: "half_bathrooms",
      label: plural(p.half_bathrooms, "medio baño", "medios baños"),
    },
    p.parking_spaces > 0 && {
      key: "parking_spaces",
      label: plural(p.parking_spaces, "estacionamiento", "estacionamientos"),
    },
    p.construction_size > 0 && {
      key: "construction_size",
      label: `${m2(p.construction_size)} construidos`,
    },
    p.lot_size > 0 && { key: "lot_size", label: `${m2(p.lot_size)} terreno` },
    p.floors && { key: "floors", label: plural(p.floors, "piso", "pisos") },
    p.floor && { key: "floor", label: `piso ${p.floor}°` },
    /^\d{4}$/.test(age) && { key: "age", label: `año ${age}` },
  ];
  return stats.filter(Boolean) as CoverStat[];
}

export function toSocialProperty(p: Property): SocialProperty {
  const stats = buildStats(p);
  const isLand = LAND.has(p.property_type);

  const surfaceValue = isLand
    ? p.lot_size
    : p.construction_size || p.lot_size;

  const defaultStats: StatKey[] = RESIDENTIAL.has(p.property_type)
    ? (["bedrooms", "bathrooms", "parking_spaces"] as const).filter((key) =>
        stats.some((s) => s.key === key),
      )
    : [];

  const operations = [
    ...new Set(
      (p.operations ?? []).map((op) => OPERATION_LABEL[op.type]).filter(Boolean),
    ),
  ];

  const locationName = p.location?.name ?? "";

  return {
    id: p.public_id,
    title: p.title,
    type: p.property_type,
    operations: operations.length ? operations : ["Venta"],
    price: p.operations?.[0]?.formatted_amount ?? null,
    neighborhood: locationName.split(",")[0]?.trim() ?? "",
    location: locationName,
    surface: surfaceValue > 0 ? m2(surfaceValue) : null,
    stats,
    defaultStats: defaultStats.slice(0, MAX_COVER_STATS),
    images: (p.property_images ?? []).map((img) => img.url),
  };
}
