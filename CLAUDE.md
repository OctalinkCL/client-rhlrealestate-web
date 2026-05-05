# Proyecto: Réplica de rhlrealestate.cl en Astro

## Objetivo

Construir una réplica del sitio https://rhlrealestate.cl/ usando Astro SSR.
El sitio actual corre en WordPress + Directorist. Lo reemplazamos completamente con Astro consumiendo la API de EasyBroker directamente.

---

## Stack

- **Astro SSR** con Node adapter
- **TailwindCSS** para estilos
- **fetch nativo** — sin axios ni librerías HTTP
- **API Key en .env** — nunca expuesta en el browser
- **Vercel** para deploy

---

## Regla crítica de la API

> La API Key de EasyBroker NUNCA puede consumirse desde el browser (front-end).
> Toda llamada a EasyBroker va desde el servidor de Astro (SSR).
> La API Key vive en `.env` y solo existe en el servidor.

```
# .env
EB_API_KEY=
```

---

## API de EasyBroker

**Base URL:** `https://api.easybroker.com/v1`
**Auth header:** `X-Authorization: {EB_API_KEY}`

---

### 1. GET /v1/properties — Listado de propiedades

```
GET https://api.easybroker.com/v1/properties
```

**Query params disponibles:**

```
page                       → número de página (default 1)
limit                      → resultados por página (max 50, default 20)
search[property_types][]   → array: filtrar por tipo ("Casa", "Departamento", etc)
search[statuses][]         → array: filtrar por estado ("published")
search[sort_by][]          → array: ordenar resultados
```

**Ejemplo de llamada:**

```javascript
const url =
  "https://api.easybroker.com/v1/properties?page=1&limit=50&search[statuses][]=published";
const res = await fetch(url, {
  headers: { "X-Authorization": import.meta.env.EB_API_KEY },
});
const data = await res.json();
// data.content        → array de propiedades
// data.pagination.total      → total de propiedades
// data.pagination.next_page  → siguiente página o null
```

**Estructura de cada propiedad en la respuesta:**

```json
{
  "public_id": "EB-VN8710",
  "title": "Concepción | Departamento con gran vista | UF2.990",
  "description": "Descripción larga de la propiedad...",
  "property_type": "Departamento",
  "bedrooms": 3,
  "bathrooms": 2,
  "parking_spaces": 1,
  "construction_size": 85,
  "lot_size": 0,
  "age": "2005",
  "location": {
    "region": "Región del Biobío",
    "city": "Concepción",
    "city_area": "Centro",
    "street": "Nombre calle 123",
    "latitude": -36.82699,
    "longitude": -73.04977,
    "show_exact_location": true
  },
  "operations": [
    {
      "type": "sale",
      "amount": 2990,
      "currency": "UF",
      "formatted_amount": "UF 2.990",
      "unit": "total"
    }
  ],
  "property_images": [
    { "title": null, "url": "https://assets.stagingeb.com/..." }
  ],
  "videos": ["https://www.youtube.com/watch?v=xxx"],
  "features": ["Elevador", "Gimnasio", "Seguridad 24 Horas"],
  "tags": ["publicadas"]
}
```

**Tipos de operación:**

```
operations[0].type = "sale"    → Venta
operations[0].type = "rental"  → Arriendo
```

---

### 2. GET /v1/properties/{property_id} — Detalle de propiedad

```
GET https://api.easybroker.com/v1/properties/EB-VN8710
```

Retorna el objeto completo de una sola propiedad.
Usar el `public_id` como identificador en las URLs del sitio.

```javascript
const res = await fetch(`https://api.easybroker.com/v1/properties/${id}`, {
  headers: { "X-Authorization": import.meta.env.EB_API_KEY },
});
const property = await res.json();
```

---

### 3. GET /v1/locations — Ubicaciones para el buscador

```
GET https://api.easybroker.com/v1/locations
```

Sin parámetros devuelve el país y sus regiones/estados.
Con parámetro `name` devuelve esa ubicación y sus hijos (ciudad, barrio).

**Jerarquía:** País → Región → Ciudad → Barrio/Comuna

Usar para poblar el dropdown de ubicación en el buscador del sitio.

```javascript
// Todas las regiones
const res = await fetch("https://api.easybroker.com/v1/locations", {
  headers: { "X-Authorization": import.meta.env.EB_API_KEY },
});
const data = await res.json();
// data.localities → array de regiones/ciudades hijas

// Ciudades de una región específica
const res2 = await fetch(
  "https://api.easybroker.com/v1/locations?name=Biobío",
  {
    headers: { "X-Authorization": import.meta.env.EB_API_KEY },
  },
);
```

---

### 4. POST /v1/contact_requests — Enviar lead

```
POST https://api.easybroker.com/v1/contact_requests
```

Crea o actualiza un lead en EasyBroker interesado en una propiedad.

**Body params:**

```
source        → OBLIGATORIO — dominio del sitio ("rhlrealestate.cl")
property_id   → ID de la propiedad ("EB-VN8710")
name          → nombre del contacto
email         → obligatorio si no hay phone
phone         → obligatorio si no hay email
message       → mensaje del contacto
```

**Ejemplo:**

```javascript
// Este POST va en un endpoint de Astro (src/pages/api/contacto.js)
// NUNCA desde el browser directamente
const res = await fetch("https://api.easybroker.com/v1/contact_requests", {
  method: "POST",
  headers: {
    "X-Authorization": import.meta.env.EB_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    source: "rhlrealestate.cl",
    property_id: "EB-VN8710",
    name: "Juan Pérez",
    email: "juan@email.com",
    phone: "+56912345678",
    message: "Me interesa esta propiedad",
  }),
});
```

**Códigos de respuesta:**

```
200 → Lead creado exitosamente
401 → API Key inválida
404 → property_id no existe en EasyBroker
422 → datos inválidos
```

---

## Caché

Usar `Cache-Control: s-maxage=300` (5 minutos) en todas las respuestas.
El sitio es inmobiliario — no necesita tiempo real.
5 minutos es el balance perfecto entre frescura y rendimiento.
