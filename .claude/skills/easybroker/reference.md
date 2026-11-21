# EasyBroker API — referencia de endpoints

Respuestas reales observadas el 2026-11-21 (cuenta RHL en producción y staging),
complementadas con la documentación oficial. Lo marcado **(doc)** viene solo de la
documentación y no se observó en vivo.

---

## GET /properties

Query params:

| Param | Tipo | Notas |
|---|---|---|
| `page` | int | default 1 |
| `limit` | int | default 20, máx 50 |
| `search[statuses][]` | string[] | `published`, `not_published`, `reserved`, `sold`, `rented`, `suspended`, `flagged`, `disapproved`. Un valor inválido **se ignora**. |
| `search[sort_by]` | string (escalar) | `updated_at-asc` \| `updated_at-desc`. Con `[]` da 422. Un valor inválido **se ignora**. |
| `search[property_types][]` | string[] | nombre (`Departamento`) o symbol (`apartment`) |
| `search[operation_type]` | string | `sale` \| `rental` \| `temporary_rental` (verificado) |
| `search[min_price]`, `search[max_price]` | int | requieren `operation_type` (doc) |
| `search[min_bedrooms]`, `search[min_bathrooms]`, `search[min_parking_spaces]` | int | (doc) |
| `search[min_construction_size]`, `search[max_construction_size]`, `search[min_lot_size]`, `search[max_lot_size]` | int, m² | (doc) |
| `search[updated_after]`, `search[updated_before]` | ISO 8601 | (doc) |

Respuesta:

```json
{
  "pagination": {
    "limit": 3, "page": 1, "total": 73,
    "next_page": "https://api.easybroker.com/v1/properties?limit=3&page=2&search%5Bstatuses%5D%5B%5D=published"
  },
  "content": [
    {
      "public_id": "EB-UH7861",
      "title": "Casa en Condominio en Lomas de San Andrés",
      "title_image_full": "https://assets.easybroker.com/property_images/5547861/103890832/EB-UH7861.png?version=1774987057",
      "title_image_thumb": "https://assets.easybroker.com/property_images/5547861/103890832/EB-UH7861.png?version=1774987057&width=200",
      "location": "Lomas de San Andrés, Concepción, Biobío",
      "operations": [
        {
          "type": "sale", "amount": 10290.0, "currency": "UF",
          "formatted_amount": "UF 10.290", "unit": "total",
          "commission": { "type": "unspecified" }
        }
      ],
      "bedrooms": 4, "bathrooms": 3, "parking_spaces": 2,
      "property_type": "Casa",
      "lot_size": 194.0, "construction_size": 167.0,
      "updated_at": "2026-09-21T15:58:14-06:00",
      "agent": "Dioce Carrasco",
      "show_prices": true,
      "share_commission": false
    }
  ]
}
```

Campos del item del listado (completo): `agent` (string), `bathrooms`, `bedrooms`,
`construction_size`, `location` (string), `lot_size`, `operations`, `parking_spaces`,
`property_type`, `public_id`, `share_commission`, `show_prices`, `title`,
`title_image_full`, `title_image_thumb`, `updated_at`.

---

## GET /properties/{property_id}

Acepta `public_id` (`EB-XXXX`) o el ID interno. Si no existe: `404 {"error":"No se encontró la propiedad"}`.

Campos (todos los observados):

| Campo | Tipo | Notas |
|---|---|---|
| `public_id`, `title`, `description` | string | |
| `private_description`, `internal_id`, `collaboration_notes` | string \| null | uso interno, **no mostrar en el sitio** |
| `public_url` | string | URL en easybroker.com |
| `property_type` | string | nombre localizado (`Casa`) |
| `bedrooms`, `bathrooms`, `half_bathrooms`, `parking_spaces`, `floors` | number \| null | |
| `floor` | string \| null | |
| `lot_size`, `construction_size`, `lot_length`, `lot_width`, `covered_space` | number \| null | m² / m |
| `age` | number \| `"under_construction"` \| `"new_construction"` | observado: `2017` |
| `conservation_state` | `new`\|`excellent`\|`good`\|`regular`\|`bad`\|`to_remodel`\|null | solo en el detalle |
| `exclusive` | boolean \| null | solo en el detalle |
| `shared_commission_percentage` | 50 \| null | |
| `show_prices`, `share_commission` | boolean | si `show_prices` es false, no mostrar el precio |
| `maintenance_amount` | int \| null | gastos comunes |
| `maintenance_currency` | string \| null | |
| `rental_maintenance_included` | boolean \| null | |
| `expenses` | null observado | no documentado |
| `created_at`, `updated_at`, `published_at` | ISO 8601 (`published_at` nullable) | |
| `tags` | string[] | p. ej. `["Condominio Concepción", "Lomas de San Andrés"]` |
| `location` | objeto, ver abajo | |
| `operations` | Operation[] | |
| `property_images` / `images` | `{title: string\|null, url: string}[]` | **idénticos**; usamos `property_images` |
| `features` | `{name, category}[]` | categorías vistas: `Exterior`, `General` |
| `videos` | string[] | URLs YouTube (`youtu.be/...` o `youtube.com/watch?v=`) |
| `virtual_tour` | string \| null | |
| `property_files` | string[] | |
| `agent` | objeto | `{id, name, full_name, mobile_phone, profile_image_url, email}` |

`location` del detalle:

```json
{
  "name": "Lomas de San Andrés, Concepción, Biobío",
  "latitude": -36.788585508, "longitude": -73.0521736387,
  "street": "valle las monjas", "postal_code": null,
  "exterior_number": "710", "interior_number": "casa 73",
  "show_exact_location": false, "hide_exact_location": true
}
```

Si `hide_exact_location` es true o `show_exact_location` es false, **no mostrar la
calle/número ni el pin exacto**. Usar un área aproximada.

### Operation

```ts
// sale / rental
{ type: "sale" | "rental"; amount: number; currency: string;
  formatted_amount: string; unit: "total" | "square_meter" | "hectare";
  commission?: { type: "percentage" | "months" | "amount" | "unspecified"; value?: number; currency?: string } }

// temporary_rental (doc)
{ type: "temporary_rental"; amount: number; currency: string;
  formatted_amount: string; period: "monthly" | "weekly" | "daily" }
```

---

## GET /locations

| Param | Notas |
|---|---|
| (ninguno) | país de la cuenta + sus regiones |
| `query` | nombre de la ubicación, p. ej. `Biobío` o `Concepción, Biobío`. Devuelve esa ubicación + sus hijos |
| `postal_code` | prioridad sobre `query` (doc) |
| ~~`name`~~ | **no existe**: se ignora y devuelve el país |

```json
// GET /locations
{ "name": "Chile", "full_name": "Chile", "type": "Country",
  "localities": [ { "name": "Valparaíso", "full_name": "Valparaíso", "type": "State" }, "... 16 regiones" ] }

// GET /locations?query=Biobío
{ "name": "Biobío", "full_name": "Biobío", "type": "State",
  "localities": [ { "name": "Talcahuano", "full_name": "Talcahuano, Biobío", "type": "City" }, "... 37 comunas" ] }
```

Jerarquía de `type`: `Country` → `State` (región) → `City` (comuna) → `Neighborhood`.
No hay campos `level` ni `parent_name`. Un nivel no encontrado da `404`.

---

## GET /property_types

Params: `locale` (`es`), `page`, `limit` (100 funciona).

```json
{ "pagination": { "limit": 100, "page": 1, "total": 19, "next_page": null },
  "content": [ { "name": "Bodega", "symbol": "storage_unit" }, "..." ] }
```

`symbol` es el identificador estable; `name` está localizado.

## GET /features

Params: `locale`, `page`, `limit`. `content: [{ "name": "Ascensor" }]` (31 en total
para Chile). En el listado no trae `category`; en el detalle de propiedad sí.

## GET /listing_statuses (doc)

Params: `page`, `limit` (máx **100**), `search[statuses][]`, `search[updated_after]`,
`search[updated_before]`. `content: [{ public_id, status, updated_at }]`. Útil para
saber qué propiedades cambiaron de estado sin bajar el listado completo.

## GET /collaborations

Params: `page`, `limit`. `content: [{ agency_id, agency_name, group }]`. Hoy RHL
tiene **0** colaboraciones. Es de uso interno y no tiene sentido en el sitio público.

---

## POST /contact_requests

Body JSON:

| Campo | Regla (verificada en staging) |
|---|---|
| `source` | **obligatorio**. Usamos `"rhlrealestate.cl"` |
| `property_id` | opcional; si no existe → 404 |
| `name`, `email`, `phone` | al menos uno |
| `message` | obligatorio si **no** hay `property_id` |

| Caso | Status | Body |
|---|---|---|
| OK | 200 | `{"status":"successful"}` |
| sin `source` | 422 | `{"error":"Debes especificar una fuente de contacto."}` |
| sin name/email/phone | 422 | `{"error":"Debes especificar un nombre, correo o número telefónico."}` |
| sin `property_id` ni `message` | 422 | `{"error":"Debes especificar un mensaje."}` |
| `property_id` inexistente | 404 | `{"error":"No se encontró la propiedad especificada."}` |
| body vacío | 400 | `{"error":"..."}` |
| key inválida | 401 | `{"error":"Your API key is invalid"}` |

---

## Errores (general)

| Status | Significado |
|---|---|
| 400 | filtro o formato inválido (aunque muchos filtros inválidos **no** dan 400, se ignoran) |
| 401 | key ausente o inválida, o la cuenta no tiene API |
| 403 | el plan no permite el recurso |
| 404 | no existe o no pertenece a la cuenta |
| 422 | datos inválidos o `Unpermitted parameters` |
| 429 | rate limit (20 req/s). Esperar y reintentar con backoff |

Cuerpo: `{"error": "..."}` (mensaje localizado) o `{"errors": {"campo": ["..."]}}`.
Decidir por status, nunca por el texto.
