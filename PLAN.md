# Plan de Proyecto — RHL Real Estate en Astro

Réplica productiva de rhlrealestate.cl usando Astro SSR + EasyBroker API.
Referencia visual: https://rhlrealestate.cl/ (WordPress original, solo para UI).

---

## Estado Actual del Codebase

**Implementado:**
- `src/pages/index.astro` — Homepage mínimo (sin hero real, sin propiedades destacadas)
- `src/pages/propiedades/index.astro` — Listado con filtros básicos y paginación
- `src/pages/propiedades/[id].astro` — Detalle de propiedad (sin galería ni formulario)
- `src/components/Buscador.astro` — Filtros de búsqueda (tipo/ubicación/operación)
- `src/lib/easybroker.ts` — Cliente API TypeScript completo
- `src/layouts/Layout.astro` — Layout mínimo, sin Header ni Footer

**Pendiente (todo lo de abajo):**

---

## Fase 1 — Infraestructura Base
*Todo el resto se construye encima de esto. Empezar aquí.*

| Tarea | Archivo | Notas |
|-------|---------|-------|
| Caché in-process + headers | `src/lib/cache.ts` (nuevo) | Ver sección Caché abajo |
| Integrar cache en cliente API | `src/lib/easybroker.ts` | Wrappear `ebFetch` con get/setCache |
| Header de navegación | `src/components/Header.astro` (nuevo) | Logo, nav, dropdown Ventas/Arriendos |
| Footer | `src/components/Footer.astro` (nuevo) | Email, teléfono, links, copyright |
| Layout con Header/Footer + meta | `src/layouts/Layout.astro` | Props: title, description, ogImage |
| Endpoint de leads | `src/pages/api/contacto.ts` (nuevo) | POST → EasyBroker `/contact_requests` |
| Cache-Control en todas las páginas | `index.astro`, `propiedades/*` | `setCacheHeaders(Astro.response)` |
| Documentar variables de entorno | `.env.example` (nuevo) | Solo `EB_API_KEY=` |

---

## Fase 2 — Homepage
*La carta de presentación del negocio.*

| Tarea | Detalle |
|-------|---------|
| Hero section | Imagen de fondo, toggle Ventas/Arriendo, Buscador integrado |
| Propiedades destacadas | Grid últimas 6 propiedades publicadas (datos reales de EB) |
| Sección "Modo RHL" | Bloque estático: Estrategia, Evaluación, Seguimiento, Seguridad |
| CTAs principales | Botones "Comprar" y "Arrendar" → `/propiedades?operacion=sale/rental` |

---

## Fase 3 — Listado Mejorado
*El core del negocio inmobiliario.*

| Tarea | Detalle |
|-------|---------|
| Componente PropertyCard | `src/components/PropertyCard.astro`: imagen, precio UF, tipo, ubicación, dorms/baños/m² |
| Fix filtro de ubicación | Bug actual: `typeof p.location === 'string'` siempre es false. Cambiar a `p.location.name` |
| Filtro de precio | Rango mín/máx client-side sobre el dataset |
| Toggle Grid/Lista | Cambiar entre grilla 3 col y vista lista con más detalle |
| Títulos de página dinámicos | SEO: title según filtros activos |

---

## Fase 4 — Detalle de Propiedad
*Donde el interés se convierte en lead.*

| Tarea | Detalle |
|-------|---------|
| Galería de imágenes | Carrusel/lightbox con `property_images` |
| Todas las características | Dorms, baños, m², año, estacionamientos, features list |
| Formulario de contacto | Conectado a `/api/contacto` → EasyBroker |
| Mapa | Embed Google Maps/OpenStreetMap con lat/lng del API |
| Video | Embed YouTube si `property.videos` tiene contenido |
| Meta OG dinámicos | og:title, og:image, og:description por propiedad |

---

## Fase 5 — Páginas Institucionales
*Credibilidad y conversión.*

| Tarea | Detalle |
|-------|---------|
| Nosotros | `src/pages/nosotros.astro` — Info del equipo RHL (contenido estático) |
| Contacto | `src/pages/contacto.astro` — Formulario general conectado a EasyBroker |

---

## Fase 6 — SEO y Calidad
*Lo que separa "funciona" de "productivo".*

| Tarea | Detalle |
|-------|---------|
| Sitemap | `src/pages/sitemap.xml.ts` — generado dinámicamente con todas las propiedades |
| robots.txt | `public/robots.txt` |
| Favicons | Reemplazar SVGs de Astro por logo real de RHL |
| Página 404 | `src/pages/404.astro` con links de retorno |

---

## Fase 7 — QA y Deploy Productivo
*Antes de apuntar el dominio real.*

| Tarea | Detalle |
|-------|---------|
| Testing flujo completo | Buscar → Filtrar → Ver detalle → Enviar lead |
| Variables en Vercel | Configurar `EB_API_KEY` en el panel de Vercel (producción) |
| Apuntar dominio | `rhlrealestate.cl` → deployment de Vercel |
| Smoke test | Verificar que la API Key no aparece en responses del browser |

---

## Arquitectura de Caché

### ¿Por qué cachear?
No solo para evitar el rate limit de EasyBroker — también para rendimiento y estabilidad en producción. Sin caché, cada visita hace una llamada HTTP al API externo.

### Estrategia: dos capas

**Capa 1 — Edge Cache de Vercel** (la más importante, 1 línea por página):
```typescript
Astro.response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
```
El CDN de Vercel cachea el HTML renderizado 5 minutos. Resultado: 1 llamada a EasyBroker cada 5 minutos por ruta, sin importar cuántos usuarios entren simultáneamente.

**Capa 2 — `src/lib/cache.ts` en memoria** (capa secundaria, ~20 líneas):
```typescript
// Map con TTL — se limpia solo al expirar
const store = new Map<string, { data: unknown; expiresAt: number }>();
```
Evita llamadas duplicadas dentro del mismo serverless instance antes de que el edge cache se caliente. Se separa de `easybroker.ts` porque son responsabilidades distintas — si el día de mañana se migra a Vercel KV, solo se toca `cache.ts`, no el cliente HTTP.

### TTL recomendado
5 minutos (`300_000` ms) en ambas capas. El sitio es inmobiliario — los datos no cambian por segundo.

---

## Orden de ejecución recomendado para empezar

1. `cache.ts` + headers en páginas existentes → evita rate limit desde hoy
2. Header + Footer + Layout → base visual para todo el resto
3. Homepage hero + destacadas → primera impresión al cliente
4. PropertyCard → componente reutilizable en homepage y listado
5. Formulario de leads en detalle → genera negocio desde el día 1
