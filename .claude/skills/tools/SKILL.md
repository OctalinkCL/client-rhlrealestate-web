---
name: tools
description: Herramientas internas del equipo de RHL en /tools (login con contraseña). Usar SIEMPRE que la tarea toque src/pages/tools/, src/lib/tools/, src/middleware.ts, src/lib/tools-auth.ts, public/tools/, el logo/marca de agua en fotos, el video Ken Burns con música, el ZIP de fotos, o el carrusel de Instagram que se arma desde EasyBroker.
---

# Herramientas internas (/tools)

Estado al **2026-11-21**. Mini herramientas para el equipo del cliente: sin base de
datos ni almacenamiento. El servidor solo valida el acceso y consulta EasyBroker;
**todo el procesamiento de imágenes y video ocurre en el navegador**.

> Antes de implementar algo nuevo aquí: proponer el enfoque y esperar el OK del usuario.

## Por qué en el navegador

En Vercel, procesar en el servidor choca con el límite de ~4.5 MB por request
(12 fotos no caben), con el tiempo máximo de las funciones (un video no alcanza) y
con el peso de ffmpeg. En el navegador se usan Canvas + WebCodecs (codificación por
hardware), las fotos nunca se suben a ningún lado y "sin memoria" sale gratis.

## Acceso

| Archivo | Qué hace |
|---|---|
| `src/lib/tools-auth.ts` | Contraseña única `TOOLS_PASSWORD` (`.env` y Vercel). La cookie `rhl_tools` guarda un HMAC derivado de la contraseña, nunca la contraseña. Cambiar la clave cierra todas las sesiones. `safeNext()` evita redirecciones abiertas. |
| `src/middleware.ts` | Protege `/tools/*` y `/api/tools/*` (redirige al login o responde 401). Fuerza `Cache-Control: private, no-store` y `X-Robots-Tag: noindex`. **Excepción a la regla de caché `s-maxage` de CLAUDE.md**: una página protegida en la CDN se serviría sin login. |
| `src/pages/tools/login.astro`, `logout.ts` | Login simple. Un error espera 1 s. Si falta la variable, el login lo avisa y nadie entra. |

- Nivel de seguridad acordado con el usuario: básico y suficiente (un usuario, sin datos sensibles). No sumar más capas sin que lo pida.
- `public/tools/**` (música, portada, final) **no** pasa por el middleware: es público. Está bien, no es sensible.
- Astro **no carga un `src/middleware.ts` nuevo ni cambios de `.env` sin reiniciar** el servidor de desarrollo.

## Principios de UX (decididos con el usuario, 2026-11-21)

Tres pestañas, **una tarea y un resultado por herramienta**: "Fotos con logo"
(`/tools/logo`), "Video" (`/tools/video`) y "Carrusel redes" (`/tools/redes`).
- La pantalla vacía muestra solo la zona de carga. Las opciones aparecen cuando ya hay fotos.
- Los botones no cambian de nombre ni de lugar. Cambiar una opción borra el resultado anterior, así el resultado siempre corresponde a las opciones actuales.
- No hay ZIP combinado de fotos y video (se descartó): cada herramienta descarga lo suyo. Un MP4 suelto se sube directo a YouTube.
- No se agregan casillas que cambien el modo de la página. La opción del logo vive solo en Video ("Agregar logo al video").
- Pendiente para más adelante: reordenar fotos arrastrándolas y adaptar la interfaz al celular.

Piezas compartidas: `src/components/tools/Dropzone.astro` (zona de carga) y `src/lib/tools/ui.ts`
(`bindDropzone`, `photoTile`, `photosLabel`).

## /tools/logo: Fotos con logo

Página: `src/pages/tools/logo.astro`. Flujo: subir JPG/PNG/WebP (HEIC se omite con
aviso) → miniaturas con logo (un clic descarga una) → "Descargar fotos (ZIP)".
Al terminar ofrece el atajo **"¿Quieres un video con estas fotos? → Crear video"**.

**Atajo a Video** (`src/lib/tools/handoff.ts`): las páginas son distintas, así que las fotos
**limpias** se guardan un momento en IndexedDB y se navega a `/tools/video?desde=fotos`.
Video las lee y **las borra de inmediato**, y el traspaso vence a los 10 minutos. Si IndexedDB
falla (modo privado), solo navega y el usuario vuelve a subir las fotos.

**Logo** (`src/lib/tools/watermark.ts`)
- `public/logo_rhl_white.svg`, centrado, **ancho = 70% del lado corto**, **opacidad 0.6**. Se midió en fotos publicadas por el cliente (743/1032 y 547/792 ≈ 0.7). Constantes `LOGO_SCALE` y `LOGO_OPACITY`.
- El SVG trae `width/height="100%"`: hay que fijar el tamaño en píxeles antes de dibujarlo en el canvas (lo hace `rasterize()`).
- Al ir centrado, el logo sobrevive al recorte cuadrado del carrusel.

**Fotos** (`photos.ts`): salen siempre en JPG al 90%, con un lado mayor máximo de 3840 px (4K) y la orientación EXIF corregida. Los nombres repetidos se renombran como `-2`, `-3` (`uniqueName` en `download.ts`), igual en la vista previa y en el ZIP.

**ZIP** (`download.ts`): `fflate`, sin recomprimir (nivel 0), porque JPG y MP4 ya vienen comprimidos.

## /tools/video: Video

Página: `src/pages/tools/video.astro`. Flujo: subir fotos (o recibirlas del atajo) →
miniaturas y "Cambiar fotos" → **"☑ Agregar logo al video"** (marcado por defecto; la
ayuda dice que se desmarque si las fotos ya tienen logo) → música → "Crear video" →
progreso con tiempo restante estimado según la velocidad real del equipo, y "Cancelar" →
"✓ Video listo" con el reproductor (arranca solo, en silencio) y "Descargar video (MP4)".

**Render** (`video.ts`), el mismo efecto del showcase de la ficha (`PropertyShowcase.astro`):
- 1920×1080 (YouTube), 30 fps, **4 s por foto**, **fundido de 1 s**, foto al **110%** con **paneo solo lateral ±4%** que alterna la dirección. La foto saliente sigue moviéndose durante el fundido.
- Fundido desde y hacia negro de 0,5 s al inicio y al final. Sin lámina final, por decisión del usuario.
- El logo se dibuja **fijo encima de cada cuadro**. El video siempre parte de las fotos **limpias**: si se armara con las fotos ya marcadas, el logo se movería con el paneo.
- Las fotos con proporción menor a 1.2 (verticales o cuadradas) van completas sobre un fondo desenfocado. El desenfoque se hace achicando y ampliando, no con `ctx.filter`, que Safari no soporta.
- Codificación con **Mediabunny** (`CanvasSource` H.264 + `AudioBufferSource` AAC, `fastStart: 'in-memory'`). El audio se encola en paralelo con los cuadros, no antes.
- Rendimiento medido en Chrome: 12 fotos → 48 s de video en unos 11 s.
- Soporte: Chrome y Edge. Si `canEncodeVideo('avc', 1920×1080)` falla, el botón queda desactivado con un aviso. No se probó en Safari.

**Música** (`tracks.ts` con la lista y `music.ts` con el procesamiento)
- 3 pistas en `public/tools/music/pista-{1,2,3}.mp3`, de **mixkit.co** (sabido por el metadato de descarga de macOS). Licencia Mixkit: uso comercial gratis, sin atribución. **Falta identificar el nombre de cada pista** en Mixkit.
- La pista se ajusta al largo exacto del video con `OfflineAudioContext`: se repite o se corta, con fundido de entrada de 0,5 s y de salida de 2 s, a 48 kHz estéreo.
- `tracks.ts` no tiene dependencias porque lo importa el frontmatter (servidor). No importar `mediabunny` en el servidor.

### Referencia: sandbox anterior
`~/Downloads/restore-image/src/pages/pack-rrss.astro`: prueba de concepto con `mp4-muxer`. Lo que se corrigió respecto a ella:
- El tamaño del video dependía de la primera foto.
- El formato `avc1.42001f` (nivel 3.1) no llega a 1080p.
- El logo se pegaba antes del paneo y se movía con la foto.
- El audio terminaba de golpe.
- Los errores se perdían sin aviso.

## /tools/redes: carrusel de Instagram desde EasyBroker

Página: `src/pages/tools/redes.astro` (`?codigo=EB-XXXX`, resuelto en el servidor con `findProperty`).

**Datos** (`social-data.ts`, solo servidor): `toSocialProperty()` reduce la `Property` a lo que necesita la portada y la página la entrega como JSON en `<script type="application/json">`, con `<` escapado.
- Operación "Venta" / "Arriendo". La línea 1 es el barrio (primer tramo de `location.name`) y la línea 2 el título.
- **Superficie** a la izquierda, como en la referencia del cliente. En terreno se usa `lot_size`; en el resto, construida o, si no hay, terreno.
- **Datos con ícono: máximo 3, los elige el usuario.** Por defecto: casa, casa en condominio y departamento muestran dormitorios, baños y estacionamientos; terreno y el resto, ninguno. Los datos en 0 no aparecen.
- Íconos: los mismos Lucide de `PropertyStats.astro`, en blanco sobre un cuadrado azul de la marca. Se renderizan en `<template data-icon>` y el cliente los convierte en imagen para el canvas.

**Fotos de EasyBroker (verificado el 2026-11-21 en 3 propiedades)**
- Todas vienen en **1200×675 (16:9)**. Pedir `&width=1920` o `3000` devuelve igual 1200×675: **no hay versión más grande**.
- `assets.easybroker.com` responde **`Access-Control-Allow-Origin: *`**: con `crossOrigin="anonymous"` el canvas se puede exportar sin proxy. Las miniaturas también llevan `crossorigin` para no dejar una versión sin CORS en la caché del navegador.
- **Ya traen el logo al centro** → en el carrusel no se agrega logo (decisión del usuario: nada de doble logo).
- Se **recortan al centro** a 1080×1080 (decisión del usuario). Se amplían 1,6×, así que quedan algo más blandas; se aceptó porque Instagram comprime igual.

**Render** (`carousel.ts`, en el navegador)
- Portada = foto recortada + capa `public/tools/redes/portada-base.svg` (transparente arriba, panel gris abajo) + textos y cuadrados dibujados por código.
- "Venta" en Inter 800 y "Disponible" en EB Garamond cursiva; las dos ya están cargadas en `global.css`. Hay que llamar `ensureFonts()` antes de dibujar, porque el canvas no espera las fuentes web.
- `fitText()` achica la fuente y, si aun así no cabe, corta con "…".
- Slide final: `public/tools/redes/final.svg`.
- Máximo 20 slides (límite de Instagram): portada + hasta 18 fotos + final. La foto elegida como portada no se repite.
- ZIP: `01-portada.jpg`, `02.jpg` … `NN-final.jpg`.

**Provisionales:** `portada-base.svg` y `final.svg` los generamos a partir de la referencia del cliente. Cuando lleguen sus PNG, se reemplazan los archivos y se actualizan `COVER_BASE_URL` / `FINAL_SLIDE_URL` en `carousel.ts`. Si la zona transparente o el panel cambian de tamaño, hay que ajustar las coordenadas de `renderCover` (panel desde y≈808, textos en 862/906, cuadrados con `top` 922).

## Pendientes (al 2026-11-21)

1. **El logo de la foto de EasyBroker choca con "Venta" en la portada**, porque el logo queda en el centro del cuadrado. Opciones planteadas: (a) subir opcionalmente una foto limpia para la portada (recomendada), (b) achicar o bajar "Venta / Disponible", (c) dejarlo así. Sin decidir.
2. ~~Mejorar la UX de `/tools/logo`~~: resuelto con la separación en 3 pestañas (ver Principios de UX).
3. Recibir del cliente: PNG de portada con zona transparente, PNG del slide final, íconos SVG propios (opcional) y fuentes exactas.
4. Identificar el nombre de las pistas en Mixkit.
5. Probar el carrusel con un terreno y una oficina (portada sin íconos o con solo la superficie).
6. Etapa 2 de redes: texto de la publicación con plantilla (sin IA), usando la descripción de EasyBroker, el precio y hashtags, con un botón "Copiar". Límite de Instagram: 2.200 caracteres y 30 hashtags.

## Cómo probar

- Servidor de pruebas: `TOOLS_PASSWORD=test-pass npx astro dev --port 4399`.
- Navegador automatizado: Playwright con el Chrome en caché (`~/Library/Caches/ms-playwright/chromium-1228/.../Google Chrome for Testing`) e instalar `playwright-core` en el scratchpad, no en el proyecto.
- En modo desarrollo, Vite recarga la página la primera vez que optimiza una dependencia nueva (aparecen errores 504 "Outdated Optimize Dep"): hay que esperar a `networkidle` y volver a cargar la página antes de interactuar.
- EasyBroker: solo GET contra producción (ver la skill `easybroker`). Propiedad de prueba con 16 fotos: `EB-UH7861` (casa).
