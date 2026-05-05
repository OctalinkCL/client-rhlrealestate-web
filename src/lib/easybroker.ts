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
  location: PropertyLocation | string;
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
  const url = new URL(BASE_URL + path);

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.append(k, String(v));
    }
  });

  const res = await fetch(url.toString(), {
    headers: { 'X-Authorization': import.meta.env.EB_API_KEY },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EasyBroker ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
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
