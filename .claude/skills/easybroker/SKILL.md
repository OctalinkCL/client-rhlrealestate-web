---
name: easybroker
description: Experto en la API de EasyBroker para este proyecto. Usar SIEMPRE que la tarea toque datos de propiedades, leads o ubicaciones; src/lib/easybroker.ts; endpoints en src/pages/api/; filtros u orden del buscador; tipos Property/Operation/Location; errores 4xx de EasyBroker; o al agregar un endpoint nuevo de EasyBroker (contact_requests, locations, property_types, features, listing_statuses, collaborations).
---

# EasyBroker API — guía del proyecto

Comportamiento **verificado contra la API real el 2026-11-21**: producción (solo GET)
y staging (POST de contact_requests). Donde la documentación oficial y la API no
coinciden, manda lo verificado aquí. El detalle de campos y respuestas está en
[reference.md](reference.md).

## Reglas no negociables

1. **La API key nunca llega al browser.** Toda llamada sale del servidor de Astro
   (frontmatter `.astro` o `src/pages/api/*`). Nunca usar `PUBLIC_` en la variable ni
   pasar datos crudos con la key a un `<script>`.
2. **Todo pasa por `src/lib/easybroker.ts`** (`ebFetch` / `createContactRequest`).
   No hacer `fetch` a EasyBroker desde otros archivos.
3. **Nunca hacer POST/PATCH a producción para probar.** Crea leads o modifica
   propiedades reales de RHL. Para probar escrituras se usa **staging** (abajo).
4. Las páginas que consumen EasyBroker llaman `setCacheHeaders(Astro.response)`
   (`src/lib/cache.ts`). Los endpoints POST responden `Cache-Control: no-store`.
   EasyBroker responde `no-store`, así que nuestra caché es la única capa.

## Ambientes

| | Base URL | Key |
|---|---|---|
| Producción | `https://api.easybroker.com/v1` | `EB_API_KEY` en `.env` |
| Staging (sandbox) | `https://api.stagingeb.com/v1` | Key pública de prueba: `l7u502p8v46ba3ppgvj5y2aad50lb9` |

Staging tiene datos ficticios (otros IDs, por ejemplo `EB-C6349`) y no acepta la key de
producción. Sirve para probar `/contact_requests` sin ensuciar el CRM.

Header de auth: `X-Authorization: <key>`. Límite: **20 requests/segundo**. No hay
headers de rate limit en la respuesta; un exceso devuelve `429`.

## Endpoints que usa el proyecto

| Endpoint | Función en `easybroker.ts` | Dónde se usa |
|---|---|---|
| `GET /properties` | `getProperties`, `getPropertiesFeatures`, `getExclusiveProperties` | `propiedades/index.astro`, home |
| `GET /properties/{id}` | `getProperty`, `findProperty` (null si 404) | detalle de propiedad |
| `GET /locations` | `getLocations` | `Hero.astro`, `propiedades/index.astro` |
| `GET /property_types` | `getPropertyTypes` | `Buscador.astro` |
| `POST /contact_requests` | `createContactRequest` | `api/lead.ts`, `api/contacto.ts` |

Disponibles y no usados: `GET /features`, `GET /listing_statuses` (sirve para
sincronizar cambios con `search[updated_after]`), `GET /collaborations` (hoy devuelve
0), `GET /contacts`, `GET /users`, `GET /property_integrations`.

## Trampas verificadas (leer antes de tocar filtros o tipos)

**1. Los parámetros inválidos se ignoran sin error.** Es la trampa más peligrosa:
- `search[statuses][]=foo` → ignora el filtro y devuelve **todas** las propiedades,
  incluidas las no publicadas (78 en vez de 73).
- `search[sort_by]=published_at-desc` → se ignora y queda el orden por defecto.
- `/locations?name=Biobío` → se ignora y devuelve el país (Chile). El parámetro correcto es `query`.

→ Valida siempre los valores contra los enums antes de enviarlos. Un 200 no
significa que el filtro se aplicó; revisa `pagination.total`.

**2. `search[sort_by]` es escalar, no array.** `search[sort_by][]=...` → `422
Unpermitted parameters`. Solo acepta `updated_at-asc` | `updated_at-desc`. No existe
ordenar por precio ni por `published_at` en la API.

**3. Listado ≠ detalle.** El item de `GET /properties` **no trae** `description`,
imágenes (solo `title_image_full`/`thumb`), `features`, `tags`, `exclusive`,
`published_at`, `videos` ni `conservation_state`. Además `location` es un **string**
("Barrio, Ciudad, Región") en el listado y un **objeto** en el detalle. Para filtrar
por `exclusive` hay que pedir el detalle de cada propiedad: N+1 llamadas, respetar el
rate limit y cachear.

**4. Filtros que SÍ existen en la API** (preferirlos a filtrar en el cliente, que
pierde resultados más allá de `limit=50`):
`search[operation_type]` (`sale` | `rental` | `temporary_rental`),
`search[min_price]` / `search[max_price]` (requieren `operation_type`),
`search[min_bedrooms]`, `search[min_bathrooms]`, `search[min_parking_spaces]`,
`search[min_construction_size]`, `search[max_construction_size]`,
`search[min_lot_size]`, `search[max_lot_size]`,
`search[updated_after]`, `search[updated_before]` (ISO 8601).
`search[property_types][]` acepta nombre (`Departamento`) o symbol (`apartment`).
**No hay filtro por ubicación** en `/properties`.

**5. Paginación.** `limit` máximo 50 (en `listing_statuses` es 100). `next_page` es una
**URL completa** o `null`, no un número. Para iterar: `page++` mientras
`next_page !== null`.

**6. Tipos reales vs documentados.**
- `age` llega como **number** (`2017`). Según la documentación también puede ser `"under_construction"` o `"new_construction"`.
- `operations[].type` puede ser `temporary_rental`, que trae `period`
  (`monthly`|`weekly`|`daily`) en vez de `unit`.
- `operations[].commission.type` puede ser `"unspecified"` (no está documentado).
- `amount` es float (`10290.0`). Para mostrar precios usar `formatted_amount`.
- El detalle trae **`images` y `property_images` idénticos**. Usamos `property_images`.
- `floor` es string o null; `floors` es number o null.

**7. Errores.** El cuerpo es `{"error": "<mensaje>"}` con el mensaje **en español y
localizado**. La documentación también menciona `{"errors": {"campo": ["msg"]}}` para
validaciones. **Nunca comparar el texto del mensaje**; decidir por status HTTP.
Un parámetro no permitido da `422 {"error":"Unpermitted parameters", "message": ...}`.

**8. Encoding del query string.** Funcionan tanto `search[statuses][]` literal como
`search%5Bstatuses%5D%5B%5D` (verificado). Con `curl` hay que pasar `-g` o los `[]`
se interpretan como glob y la request ni sale.

**9. Imágenes.** Las URLs de `assets.easybroker.com` vienen firmadas (`?s=...&version=...`).
No reconstruirlas ni recortar el query. El thumb es la misma URL con `&width=200`.

## POST /contact_requests — reglas verificadas en staging

- `source` es obligatorio → sin él da `422 "Debes especificar una fuente de contacto."`.
  Usamos `"rhlrealestate.cl"`.
- Con `property_id` basta con **uno** de `name` / `email` / `phone`; si no hay ninguno,
  da `422`.
- **Sin `property_id`, `message` es obligatorio** (`422 "Debes especificar un mensaje."`).
  Esto aplica al formulario de contacto general.
- Si `property_id` no existe → `404`.
- Respuesta OK: `200 {"status":"successful"}`. Crea el lead **o lo actualiza** si el
  contacto ya existe.
- Teléfono: lo enviamos como `+569XXXXXXXX`.

## Cómo verificar antes de asumir

Si algo no calza con esta guía o con la documentación, **pregúntale a la API**:

```bash
# GET de solo lectura contra producción (lee la key de .env, nunca la imprime)
.claude/skills/easybroker/scripts/eb-get.sh '/properties?limit=2&search[statuses][]=published'

# Contra staging (key pública)
.claude/skills/easybroker/scripts/eb-get.sh --staging '/properties/EB-C6349'
```

El script solo hace GET. Para probar un POST, usar `curl` contra staging con la key
pública. Si descubres un comportamiento nuevo, actualiza esta skill y la fecha de
verificación de arriba.

## Documentación oficial (en formato Markdown, ideal para leer con fetch)

- Índice completo: https://dev.easybroker.com/llms.txt
- Cualquier página de referencia en Markdown: agregar `.md`, por ejemplo
  https://dev.easybroker.com/reference/get_properties.md
- Errores: https://dev.easybroker.com/docs/errores-de-la-api.md
- Changelog: https://dev.easybroker.com/changelog. **Revisarlo cuando algo empiece a
  fallar sin cambios nuestros.** Últimos cambios relevantes: `conservation_state`
  (solo en el detalle), `exclusive` + `shared_commission_percentage`, endpoints
  `/features` y `/property_types`, y `email`/`phone` ya no son obligatorios a la vez.
