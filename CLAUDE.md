# Proyecto: Réplica de rhlrealestate.cl en Astro

> **Plan de proyecto:** Ver [PLAN.md](./PLAN.md) — roadmap por fases con estado actual, tareas pendientes y arquitectura de caché.

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

Usar la skill **`easybroker`** ([.claude/skills/easybroker/SKILL.md](.claude/skills/easybroker/SKILL.md)) para cualquier trabajo con la API:
endpoints, filtros, tipos, errores, leads y el ambiente de pruebas (staging). Ahí está el
comportamiento **verificado contra la API real**, que en varios puntos difiere de la
documentación oficial (por ejemplo, los parámetros inválidos se ignoran sin dar error).

- Todo acceso pasa por `src/lib/easybroker.ts`.
- Nunca hacer POST a producción para probar: usar staging.
- Para verificar una respuesta real: `.claude/skills/easybroker/scripts/eb-get.sh '/path'`.

---

## Caché

Usar `Cache-Control: s-maxage=300` (5 minutos) en todas las respuestas.
El sitio es inmobiliario — no necesita tiempo real.
5 minutos es el balance perfecto entre frescura y rendimiento.

**Excepción:** `/tools/*` y `/api/tools/*` van siempre con `Cache-Control: private, no-store`
(lo aplica `src/middleware.ts`). Una página protegida cacheada en la CDN se serviría sin login.

---

## Herramientas internas (/tools)

Herramientas para el equipo del cliente, protegidas con una sola contraseña
(`TOOLS_PASSWORD` en `.env` y en Vercel). Login, cookie y rutas protegidas en
`src/lib/tools-auth.ts` + `src/middleware.ts`. El procesamiento de imágenes y video
se hace en el navegador; el servidor solo valida el acceso y consulta EasyBroker.

```
# .env
TOOLS_PASSWORD=
```
