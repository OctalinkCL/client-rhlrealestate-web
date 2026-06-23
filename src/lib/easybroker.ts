const BASE_URL = "https://api.easybroker.com/v1";

// --- Types ---

export interface PropertyImage {
  title: string | null;
  url: string;
}

export interface Operation {
  type: "sale" | "rental";
  amount: number;
  currency: string;
  formatted_amount: string;
  unit: string;
}

export interface PropertyLocation {
  name: string;
  latitude: number | null;
  longitude: number | null;
  street: string | null;
  postal_code: string | null;
  show_exact_location: boolean;
  hide_exact_location: boolean;
  exterior_number: string | null;
  interior_number: string | null;
}

export interface PropertyFeature {
  name: string;
  category: string;
}

export interface Property {
  public_id: string;
  title: string;
  title_image_full: string;
  title_image_thumb: string;
  description: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  construction_size: number;
  lot_size: number;
  age: string;
  location: PropertyLocation | null;
  operations: Operation[];
  property_images: PropertyImage[];
  videos: string[];
  features: PropertyFeature[];
  tags: string[];
  exclusive: boolean | null;
  published_at: string | null;
}

export interface Pagination {
  limit: number;
  page: number;
  total: number;
  next_page: string | null;
}

export interface PropertiesResponse {
  content: Property[];
  pagination: Pagination;
}

// Estructura que retorna el endpoint /properties (listado)
// location es un string plano, no un objeto PropertyLocation
export interface PropertyListItem {
  public_id: string;
  title: string;
  title_image_full: string;
  title_image_thumb: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  construction_size: number;
  lot_size: number;
  location: string | null;
  operations: Operation[];
  tags: string[];
  exclusive: boolean | null;
}

export interface PropertiesListResponse {
  content: PropertyListItem[];
  pagination: Pagination;
}

export interface EBLocation {
  name: string;
  level: string;
  parent_name: string | null;
  localities: EBLocation[];
}

export interface LocationsResponse {
  localities: EBLocation[];
}

// --- Core fetcher ---

type Params = Record<string, string | number | null | undefined>;

async function ebFetch<T>(path: string, params: Params = {}): Promise<T> {
  // String manual — URLSearchParams codifica [ ] como %5B%5D y EasyBroker rechaza eso
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");

  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: { "X-Authorization": import.meta.env.EB_API_KEY },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EasyBroker ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

// --- API pública ---

export function getProperties(
  filters: Params = {},
): Promise<PropertiesListResponse> {
  return ebFetch<PropertiesListResponse>("/properties", filters);
}

export function getProperty(id: string): Promise<Property> {
  return ebFetch<Property>(`/properties/${id}`);
}

export function getPropertiesFeatures(): Promise<PropertiesListResponse> {
  return ebFetch<PropertiesListResponse>("/properties", {
    limit: 9,
    "search[statuses][]": "published",
    "search[sort_by]": "published_at-desc",
  });
}

export function getLocations(name?: string): Promise<LocationsResponse> {
  return ebFetch<LocationsResponse>("/locations", name ? { name } : {});
}

export interface PropertyType {
  name: string;
}

export interface PropertyTypesResponse {
  content: PropertyType[];
}

export function getPropertyTypes(): Promise<PropertyTypesResponse> {
  return ebFetch<PropertyTypesResponse>("/property_types", {
    limit: 100,
    locale: "es",
  });
}

async function fetchInBatches<T>(
  ids: string[],
  fetcher: (id: string) => Promise<T>,
  batchSize = 5,
  delayMs = 600,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fetcher));
    results.push(...batchResults);
    if (i + batchSize < ids.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

export async function getExclusiveProperties(): Promise<Property[]> {
  const allIds: string[] = [];
  let page = 1;

  while (true) {
    const response = await ebFetch<PropertiesListResponse>("/properties", {
      limit: 50,
      page,
      "search[statuses][]": "published",
    });
    allIds.push(...response.content.map((p) => p.public_id));
    if (!response.pagination.next_page) break;
    page++;
  }

  const details = await fetchInBatches(allIds, getProperty);
  return details
    .filter((p) => p.exclusive === true)
    .sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateB - dateA;
    });
}
