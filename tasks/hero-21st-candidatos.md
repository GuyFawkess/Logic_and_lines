# Hero v4 — candidatos de inspiración (21st.dev) + concepto propio

**Fecha:** 2026-10-28 · **Estado:** research read-only (no se ha tocado `src/`)
**Contexto:** el hero v4 actual (`src/components/sections/HeroHome.astro`) tiene claim serif en 2 líneas (`clamp(3rem,9vw,8.5rem)`, palabra en ámbar en itálica), un `<svg>` con línea vertical ámbar de 2 px + nodo al final (**estática**, "primer trazo"), y reveal `data-reveal="lines"` con `SplitText mask:"lines"` + `yPercent 110→0`.
**Reglas de marca/descarte:** sin glow/bloom, sin partículas, sin gradientes animados, sin look IA morado/azul, sin WebGL/Three.js; degradar a contenido estático visible sin JS y con `prefers-reduced-motion`; LCP = texto real, no imagen.
**Plugins ya instalados y registrados** (`src/scripts/motion/index.ts:37`, gsap 3.15.0): ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin, CustomEase → **ningún candidato necesita plugin nuevo**.

| # | Candidato | Efecto | Complejidad | Assets |
|---|---|---|---|---|
| 1 | Text Animation — [ajith66310/text-animation](https://21st.dev/r/ajith66310/text-animation) (id 27427) | Bloque de color barre cada línea y la sustituye por el texto | M | **0** |
| 2 | Gradient + Dynamic Lines — [minhxthanh/animated-section-with-gradient-and-dynamic-lines](https://21st.dev/r/minhxthanh/animated-section-with-gradient-and-dynamic-lines) (id 2529) | Trazos horizontales tipo circuito con cometido que los recorre | M | **0** |
| 3 | Blueprint Ink Reveal — [kedhareswer/blueprint-ink-reveal](https://21st.dev/r/kedhareswer/blueprint-ink-reveal) (id 29677) | Palabra trazada a hairline tipo plano técnico que se tinta | M | **0** |
| ★ | Concepto propio — "Línea Maestra extendida" | La línea ámbar del hero dibuja un diagrama lógico y un pulso recorre sus nodos | M | **0** |

---

## 1 · Text Animation (block-wipe por línea) — id 27427 · 0 assets

**Qué es.** Cada línea del titular se revela con un bloque de color que barre de izquierda a derecha (`scaleX 0→1`, `power4.inOut`, 0.85 s), el texto aparece en el punto medio del barrido y el bloque sale por la derecha: un telón editorial por línea.

**Re-implementación (Astro + GSAP).** Reutiliza el hook `data-reveal="lines"` que ya existe: en `text-reveal.ts` cambiar el reveal actual (`yPercent 110→0` con máscara) por el block-wipe — `SplitText.create(h1, { type: "lines", autoSplit: true, onSplit })` → por cada línea, wrapper con `overflow: clip` + bloque `position:absolute` con `background: var(--color-primary)`; timeline por línea `scaleX 0→1 → opacity 1 → transformOrigin "right center" → scaleX 0` (0.7–0.85 s, `power4.inOut`, stagger 0.08). Plugins: **SplitText** (ya en uso) + CSS `clip`; sin ScrollTrigger nuevo si se dispara en mount, o `ScrollTrigger` con `toggleActions: "restart none restart reverse"` para respetar la política R1 re-disparable. Sin JS el bloque se queda `scaleX: 0` y el texto visible (estado final en el markup, regla de oro vigente). Con `prefers-reduced-motion` no corre la rama (texto visible).

**Complejidad.** M (el tween es S; encajar el contrato actual de re-split por fuentes/resize y el estado "ya revelado" es la parte M).

**Assets.** **0 assets (SVG/CSS/tipografía pura)** — solo la fuente Sentient ya cargada.

---

## 2 · Animated Section with Gradient and Dynamic Lines — id 2529 · 0 assets

**Qué es.** Cuatro trazos horizontales en zigzag (estilo circuito) atraviesan la sección; cada trazo se dibuja con `stroke-dashoffset` y lleva encima un segmento brillante que lo recorre de lado a lado (máscara + rectángulo desplazándose).

**Re-implementación (Astro + GSAP).** SVG inline en el `<section>` (3–4 `<path>` con el mismo `d` en dos capas: base en `--color-hairline` + capa animada en ámbar). Dibujo del trazo con **DrawSVG** (`drawSVG: "0% 100%"`), ya usado por `line-system.ts` para los segmentos `[data-line-segment]`. El cometido = un `<rect>` dentro de un `<mask>` con gradiente que se desplaza en X con un tween lineal en bucle; mejor: atarlo al scroll con **ScrollTrigger** `scrub` (mismo lenguaje que el cometa actual de `line-system.ts`) para que la línea "tenga dirección". Plugins: **DrawSVGPlugin** + **ScrollTrigger** + **MotionPathPlugin** (opcional, para que el trazo siga la ruta real del nodo). Cuidado de marca: el titular con `bg-gradient-to-r` del original se cambia por **ámbar plano** (los gradientes animados están vetados); el trazo sí es la textura.

**Complejidad.** M (paths + máscaras + draw + scrub).

**Assets.** **0 assets (SVG inline)** — el "original" tampoco trae imágenes, solo trazos vectoriales duplicados en dos capas.

---

## 3 · Blueprint Ink Reveal — id 29677 · 0 assets

**Qué es.** Una palabra se dibuja a filete (hairline) como si fuera un plano técnico, con marcas de registro y ticks en los ejes; al pasar el puntero, la mancha de tinta revela las letras macizas por debajo. Se dibuja en canvas en runtime: sin imagen, sin fuente extra, sin red.

**Re-implementación (Astro + GSAP).** Capa `<canvas>` decorativa **encima** del H1 real (el H1 sigue en el DOM → LCP, SEO y selección intactos; el canvas es puro adorno y en `prefers-reduced-motion` no se monta). Contorno: `ctx.strokeText` con línea ámbar de 1 px + `ctx.setLineDash` para los ticks de registro; relleno: se dibuja el texto macizo en ivory y se **enmascara** con un reveal (GSAP sobre un `<clipPath>`/máscara SVG, o `globalCompositeOperation` con un trazo que se dibuja). Plugins: **ScrollTrigger** (revelado por scroll) + GSAP timeline; Canvas 2D nativo para el trazo. Riesgo: el doble render (DOM + canvas) puede desincronizarse al redimensionar → re-dibujar en `ResizeObserver` con debounce.

**Complejidad.** M/L (canvas + máscara + sincronía de fuentes y resize).

**Assets.** **0 assets (canvas en runtime)** — confirmado en la descripción del componente: sin imagen, sin fuente, sin petición de red.

---

## ★ Concepto propio — "La Línea Maestra extendida" (0 assets)

**Qué es.** El trazo ámbar del hero deja de ser estático: al cargar, **dibuja un diagrama lógico ortogonal** (3–4 ramales en ángulo recto como el "circuito" del candidato 2, pero **con nodos = secciones**) que abraza el claim; un **pulso** recorre el diagrama y enciende cada nodo en orden, y al bajar al scroll el pulso continúa hacia el primer nodo de la página (Servicios), que es literalmente el mismo sistema de líneas que ya vive en `line-system.ts`.

**Re-implementación (Astro + GSAP).** Un `<svg>` en el hero con `<path>` ortogonales y `<circle>` por nodo; el trazo se dibuja con **DrawSVG** (`drawSVG: "0% 100%"`, 1.2 s, `power2.out`) en mount, encadenado al reveal del claim (mismo timeline, no en paralelo). El pulso = un `<circle>` que recorre el path con **MotionPathPlugin** (`motionPath: { path, align, autoRotate: false }`) en bucle; cada nodo hace un "pop" seco (escala 1→1.35→1) en el instante en que el pulso lo cruza (coordenadas calculadas con `path.getPointAtLength()`). Para que el hero sea el **segmento 0** de la línea de la página, se marca con `data-line-segment` y se engancha al mismo `ScrollTrigger`/`priority` que usa `line-system.ts`; el nodo final del diagrama se alinea con el borde inferior del viewport para que el trazo "continúe" hacia la siguiente sección. Plugins: **DrawSVGPlugin + MotionPathPlugin + ScrollTrigger** (los tres ya registrados). Cierre: con `prefers-reduced-motion` el diagrama aparece completo y estático (markup en estado final) y sin JS igual.

**Complejidad.** M (coords de nodos + un path de pulso + pop sincronizado).

**Assets.** **0 assets (SVG inline + tipografía)** — el claim, los nodos y los trazos son vectores y texto.

---

## Descartados (y por qué)

- **Shader/canvas/WebGL** (25723, 21836, 5746, 9718, 18254, 26237, 23698): vetados por presupuesto de rendimiento; A/B de paleta azul CI.
- **Con gradiente/aurora/glow** (2529 titular, 33949, 7035, 4673): violan "sin glow" y "sin gradientes animados".
- **Con foto o vídeo de fondo** (25444, 25482, 27355, 2061, 2765, 5967): rompen LCP y el registro sobrio de marca.
- **Hero Recursive Type** (33311, canvas con microtexto dentro de un wordmark): muy "wow" pero el titular deja de ser texto real (LCP/SEO) y arrastra cientos de nodos DOM si se replica en DOM.
- **Marquee / Hero Shutter Text** (9989, 4365, 10277): el titular ya es el protagonista; el marquee compite y añade ruido, y el shutter es un remake de un efecto tipográfico ya cubierto por el candidato 1.

**Verificación:** los candidatos 1 y 2 se han descargado y revisado código (GSAP SplitText `type:"lines"` + bloque con `scaleX`/`power4.inOut`; SVG con `<mask>` + `stroke-dashoffset`). El 3 y el ★ se han juzgado por metadata + preview (el código de 21st no se ha descargado: cupo diario de 2 recuperaciones agotado).
