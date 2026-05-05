const BASE_URL = 'https://api.easybroker.com/v1';

// --- Types ---

export type SortBy =
  | 'published_at_desc'  // más reciente primero (default)
  | 'published_at_asc'   // más antiguo primero
  | 'price_asc'          // precio ascendente
  | 'price_desc';        // precio descendente

export interface PropertyImage {
  title: string | null;
  url: string;
}

export interface Operation {
  type: 'sale' | 'rental';
  amount: number;
  currency: string;
  formatted_amount: string;
  unit: string;
}

export interface PropertyLocation {
  region: string;
  city: string;
  city_area: string;
  street: string;
  latitude: number;
  longitude: number;
  show_exact_location: boolean;
}

export interface Property {
  public_id: string;
  title: string;
  description: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  construction_size: number;
  lot_size: number;
  age: string;
  location: PropertyLocation;
  operations: Operation[];
  property_images: PropertyImage[];
  videos: string[];
  features: string[];
  tags: string[];
}

export interface Pagination {
  total: number;
  next_page: number | null;
}

export interface PropertiesResponse {
  content: Property[];
  pagination: Pagination;
}

// --- Core fetcher (privado) ---

type Params = Record<string, string | number | null | undefined>;

async function ebFetch<T>(path: string, params: Params = {}): Promise<T> {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: { 'X-Authorization': import.meta.env.EB_API_KEY },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EasyBroker ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// --- API pública ---

export function getProperties({
  page = 1,
  limit = 20,
  sort = 'published_at_desc' as SortBy,
} = {}): Promise<PropertiesResponse> {
  return ebFetch<PropertiesResponse>('/properties', {
    page,
    limit,
    'search[statuses][]': 'published',
    'search[sort_by][]': sort,
  });
}

export function getProperty(id: string): Promise<Property> {
  return ebFetch<Property>(`/properties/${id}`);
}
