import { getCache, setCache } from './cache';

const BASE_URL = 'https://api.easybroker.com/v1';

// --- Types ---

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
  name: string;
  latitude: number;
  longitude: number;
  street: string;
  postal_code: string | null;
  show_exact_location: boolean;
  hide_exact_location: boolean;
  exterior_number: string;
  interior_number: string;
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
  location: PropertyLocation;
  operations: Operation[];
  property_images: PropertyImage[];
  videos: string[];
  features: string[];
  tags: string[];
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
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ''}`;

  const cached = getCache<T>(url);
  if (cached) return cached;

  const res = await fetch(url, {
    headers: { 'X-Authorization': import.meta.env.EB_API_KEY },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EasyBroker ${res.status}: ${text}`);
  }

  const data = await res.json() as T;
  setCache(url, data);
  return data;
}

// --- API pública ---

export function getProperties(filters: Params = {}): Promise<PropertiesResponse> {
  return ebFetch<PropertiesResponse>('/properties', filters);
}

export function getProperty(id: string): Promise<Property> {
  return ebFetch<Property>(`/properties/${id}`);
}

export function getLocations(name?: string): Promise<LocationsResponse> {
  return ebFetch<LocationsResponse>('/locations', name ? { name } : {});
}
