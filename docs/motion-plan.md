# Motion Plan — Rediseño Logic & Lines v4 ("Trionn-grade")

> **Estado: PROPUESTA — esperando elección de dirección. No se ha tocado código.**
> Rama destino: `redesign/logic-lines-v4-motion` (desde `main`; se crea en F0). Este doc vive sin trackear en el working tree hasta que F0 lo commitee en la rama nueva.
> Capturas de evidencia: `docs/research-v4/`.
> Investigación realizada con navegador real (Playwright) + forense de motion (sondas DOM, grabación de animaciones a 70ms, firmas de bundles). Todo lo que sigue está **medido**, no adivinado — salvo donde se marca "conocimiento".

---

## 0. Skills usadas y a usar

| Fase | Skill | Para qué |
|---|---|---|
| Investigación (hecho) | `motion-forensics` | Extracción medible de animaciones de trionn.com (stack, persiana, pins, tipografía) |
| Plan (hecho) | `scroll-craft-method` | Gramática de página, curva de sensación, taste floor, refuse list, fingerprint gate |
| F1 diseño estático | `design-taste-frontend` + `impeccable` | Gate anti-genérico y anti-plantilla sobre la dirección elegida |
| F2 texto | `gsap-core` + `gsap-scrolltrigger` | Reveals con SplitText, máscaras, staggers |
| F3 persiana | `gsap-timeline` | Coreografía cover→hold→reveal de belts |
| F4 micro | `gsap-plugins` + `emil-design-eng` | DrawSVG, magnetic, micro-interacciones con criterio |
| QA cada fase | `visual-qa` + `qa` | Matriz de viewports, motion aceptance, reduced-motion, consola |

---

## 1. Hallazgos de investigación

### 1.1 trionn.com — forense completa (medido en vivo, 2026-10-06)

**Stack con evidencia:**

| Capa | Tecnología | Evidencia |
|---|---|---|
| Framework | Next.js (SPA en memoria) | `/_next/static/chunks/`, turbopack |
| Animación | GSAP + ScrollTrigger + SplitText + DrawSVG | firmas en bundles: gsap×141, ScrollTrigger×44, SplitText×3, DrawSVG×13 |
| Smooth scroll | **Lenis** | clase `lenis` en `<html>` (activo); `scrollSmoother`×15 = firma muerta en bundle |
| 3D | Three.js (firmas ×85) — 3 canvas WebGL (hero + 2 más) | `canvas.getContext('webgl')` OK |
| Carrusel | Swiper (firmas ×167) — galería de proyectos | — |
| Audio | Web Audio + toggle "Enable sound" | `<audio>` + botón aria-label |
| Scroll secuencias | secuencia de frames `images/stone/frame_NNNN.webp` | scrub por imágenes |
| Cursor | **NATIVO** (sin cursor custom) | `cursor: auto`, sin fixed con pointer-events:none |

**La persiana (page transition) — anatomía y parámetros MEDIDOS:**

Sistema de overlays fijos compartido preloader + transiciones:
- `.pl-white-overlay` z-9050 — capa de relleno (los belts no cubren el 100%)
- `.pl-overlay` z-9100 — belts del preloader
- `.pl-trans-overlay` z-9200 — belts de transición de ruta (idle: `visibility:hidden`, `pointer-events:none`)
- `.pl-overlay-center` z-9350 — logo/contador del preloader
- 8 partículas `pl-flying-plus` z-9500 — símbolos "+" SVG voladores

Cada overlay contiene **10 belts** (franas horizontales a sangre, ~viewport/10 de alto, gris `rgb(200,200,200)`, `transform-origin: center`, colapso `scaleY(0)`).

Grabación real de una transición home→/about (muestreo 70ms):

| Fase | Duración | Qué pasa |
|---|---|---|
| **COVER** | ~820ms | 10 belts `scaleY 0→1` con **overshoot a 1.10** (ease back/elastic-lite), **cascada de arriba a abajo**, stagger ~60-70ms por belt, cada belt ~450-500ms |
| **HOLD** | ~475ms | Pantalla cubierta; la ruta cambia debajo (swap invisible) |
| **REVEAL** | ~700ms | `scaleY 1→0` **de abajo a arriba** (dirección inversa), undershoot leve (−0.07) |
| **Total** | **~2.15s** | Funciona igual al volver atrás (mismo sistema) |

**Preloader:** belts + caja de logo con **4 cruces "+" de esquina** (marcas de registro de imprenta), 2 piezas SVG del monograma rotando en 3D real (matrix3d), tagline "INSPIRE · INNOVATE · IMPACT" palabra a palabra, **contador de 3 cilindros tipo slot-machine**, 8 "+" voladores. Bandera `data-trionn-ready` en `<html>`.

**Tipografía y color medidos:**

| Elemento | Valor |
|---|---|
| Display | **Familjen Grotesk** — h1 68.5px/400 con tracking **−4.1px**; h2 uppercase 94.9px tracking −7.6px |
| Body | Neue Haas 13.7px |
| Nav | 15.2px uppercase |
| Fondo | monocromo: `#0C0C0C` → gradientes a blanco `#D2D2D2→#FFF` → gris `#C3C3C3` |
| Texto claro | `rgb(216,216,216)` |
| Header | `mix-blend-mode: difference` (flota intacto sobre claro y oscuro) |

**Ritmo de página (desktop 1021×550):** doc 16.360px ≈ **30 viewports**. Pins: hero (0px extra) → about pin **1.100px** → **galería pin 7.425px** (el gran acto: Swiper horizontal + secuencia stone + vídeos) → **acto gris pin 3.575px** (testimonios) → footer `min-h-dvh`. Marquee "INSPIRE INNOVATE IMPACT" pineado a viewport completo.

**Micro-interacciones:**
- **Char-roll en TODOS los links**: texto duplicado apilado + split por caracteres (`span.char`), roll por letra al hover (nav, footer, email, teléfono, redes).
- H1 del hero con **palabra final rotativa** ("mean depth" → "mean intention").
- Footer: tipografía gigante espaciada letra a letra ("D I S C U S S  Y O U R  P R O J E C T"), **hora local** (IST), © año, links roll.
- 5 reglas @keyframes CSS + 13 transition rules (todo lo demás es GSAP).

**Móvil (390×844):** **5 pins (uno MÁS que desktop)**, Lenis activo, canvas a sangre, panel de menú a pantalla completa. NO degradan a versión ligera — reajustan pins. docH 19.451px ≈ 23 viewports.

**Qué NO copiamos de Trionn** (límite creativo y de rendimiento): WebGL/Three.js (coste no justificado para una landing de servicios — se logra el feel con tipografía + persiana + smooth scroll), monocromo exacto, Familjen Grotesk (sería calco), will-change en 1.243 elementos (despilfarro de memoria), el slot-counter. La paleta, tipografía, copy y composición serán propios. Trionn = referencia de **técnica y sensación**.

### 1.2 Referencias adicionales (medidas en vivo salvo marca)

| Sitio | Qué aporta (medido) |
|---|---|
| **dennissnellenberg.com** | GSAP+ScrollTrigger en globals; fuente propia, h1 **192px weight 450**; saludo multi-idioma rotando en el preloader (Hello/Bonjour/Ciao…); 24 máscaras `.line`; footer con "LOCAL TIME" + "VERSION © Edition" |
| **obys.agency** | Blanco/negro puro; serif propia; preloader WebGL con contador a sangre; `difference` (parcial: JS-gated) |
| **locomotive.ca** | Lenis (lo crearon ellos), sin pins en home, display propia "LocomotiveNew" 70px + Helvetica Now; juego de marca en el h1 con símbolos |
| igloo.inc, unseen.co *(conocimiento, no medidos)* | Vocabulario WebGL-límite y estética estudio; los citamos como mapa, no como target |

### 1.3 logicandlines.com actual (producción = diseño v1 sobre `main`)

Medido en vivo: petróleo `#0D1A1F` + texto `#EBEBD9`, Inter + Manrope, h2 64px "Automatiza tu éxito", nav por anchors (Beneficios/Servicios/Proceso/Razones/FAQ + EN/ES), sin pins ni Lenis, sin forms (conversión por Cal.com + wa.me + mailto). Es el diseño que el v4 sustituye.

---

## 2. Inventario de contenido y flujos a preservar (extraído del repo)

> Fuente: colecciones `src/content/**` + diccionarios `src/i18n/translations/{es,en}.js` + páginas. La extracción FINAL del copy se hará en F0 desde la rama `main` (el working tree tiene copy mejorado de v3 que se propone como candidato donde se marca).

**Rutas:** `/` y `/en/` (home SSR) · `/contact` + `/en/contact` · `/service/[id]` ×6 ×2 idiomas (SSG) · `/politica-de-privacidad` + `/en/privacy-policy` · `/thankyou` (noindex) · `/en/landing-lead` (B2B, standalone, **se deja intacta**) · 404s · `POST /api/track` (CAPI).

**Servicios (colección `services`, orden):** 1. Logic Map™ (diagnóstico y diseño del sistema) · 2. Sales Line (captación y gestión de leads) · 3. Flow Line (automatización de procesos internos) · 4. Logic Agents™ (agentes IA personalizados) · 5. Logic Support (atención y soporte con IA) · 6. SmartHost™ (SaaS propio de alquiler vacacional, **Early Access**). Cada ficha tiene hero/problem/solution/automation/benefits/use_cases/final_cta en ES+EN.

**Proceso (4 pasos):** 01 Diagnóstico (llamada 30 min) → 02 Diseño lógico (plan aprobado antes de pagar) → 03 Construcción (sprints cortos semanales) → 04 Entrega y soporte.

**Razones (4):** "Hablas conmigo, no con un comercial" · "Código limpio, y es tuyo" · "Pienso en años, no en lanzamientos" · "Resultados que se miden".

**Stats:** 1.240 h automatizadas · 38 webs/sistemas · 6 líneas de servicio — ⚠️ marcadas `[PENDIENTE CLIENTE]`: confirmar o dejar en estado "sin-dato" (regla: números reales o ninguno).

**FAQ (6):** solo/equipo, precio, plazos, proveedor actual, mantenimiento, fuera de Lanzarote.

**Contacto/CTAs:** email `logicandlinestudios@gmail.com` · WhatsApp `wa.me/34628125302` · Instagram `@logic_and_lines` · Cal.com `logic-and-lines-knzt9s/1ª-llamada-de-evaluacion` · CTA primario "Reserva tu llamada" → `/contact` con `data-cal-link` · eventos GTM `cta_click`, `schedule_click`, etc. vía atributos `data-gtm-*`.

**Copy candidata v3 (mejor que la de main, a decidir):** hero "Tu negocio ya tiene la lógica. / Yo trazo las líneas." (EN: "Your business already has the logic. / I draw the lines.") + keywords line "Marketing y automatización con IA para negocios en Lanzarote".

**Tracking CRÍTICO (no romper):** Cookiebot + Consent Mode v2 (default denied), GTM (head+body+pageview en `astro:page-load` + listener delegado de `data-gtm-event`), Meta Pixel con `hasConsentFor()` + dedup `event_id`, CAPI `/api/track` (rate limit 100/min). Todo vive en `Layout.astro` + 3 componentes — el nuevo Layout debe re-montarlos EXACTAMENTE igual. Env: `GTM_ID`, `PUBLIC_META_PIXEL_ID`, `META_CAPI_TOKEN`, `COOKIEBOT_ID`.

**Assets reutilizables:** logos SVG (`logoSolo.svg`, `logoEntero.svg`), imágenes de servicio webp (17-33KB c/u, 6 servicios), `aboutPic.webp` (retrato, hoy sin referenciar), `logoEnteroOG.png` (og). Los capas hero v2/v3 (`public/assets/hero/**`, `neon/**`) NO se reutilizan.

**i18n:** diccionarios JS por idioma + rutas con prefijo `/en/` + `LanguageSwitcher` accesible (evento GTM `language_switch`). El split de texto debe re-ejecutarse al cambiar de idioma.

---

## 3. Direcciones visuales (ELIGE 1)

Las tres comparten: identidad ligada al nombre ("Logic & Lines" = estructura, línea, trazo, retícula), tipografía con carácter y escala dramática, composiciones asimétricas, detalles de oficio (hairlines, microtipografía), motion coherente (misma familia de easings), contraste AA, sin daisyUI, sin `data-theme`, sin morados/azules SaaS. Ningusa repite la gramática "chaptered editorial" de v3 (descartada) ni la paleta petróleo+ámbar de v1.

### Dirección A — "EL PLANO" (blueprint técnico-cálido)

- **Concepto:** la web como hoja de proyecto técnico del estudio: retícula visible, líneas de cota, cruces de registro "+", anotaciones en mono, numeración de plano real (A-01…). El oficio del desarrollador hecho estética: el plano ANTES del edificio — exactamente lo que vende Logic Map™.
- **Paleta:** papel técnico cálido `#F3F0E9` · tinta `#191B20` · gris grafito (hairlines) `#8A8D95` · acento naranja internacional `#E8490F` (un solo acento, dueño de estados y CTAs). Un acto invertido (tinta sobre papel) como pico.
- **Tipografía:** **Archivo variable** (eje width: Expanded Black para display monumental, normal para body — una sola familia, Google Fonts OFL, self-host) + **Fragment Mono** para cotas/anotaciones.
- **Gramática:** filmic one-shot técnico — una tesis lineal (del problema disperso al sistema dibujado), sin numeración decorativa (los números que aparecen son de plano: información, no adorno).
- **Ejemplo de sección:** Servicios = 6 planos sucesivos: hairline superior que se dibuja (DrawSVG), nº de plano `A-03` en mono pequeño, título del servicio en Expanded enorme, línea de cota con extremos, descripción en columna estrecha, imagen real del servicio entrando con máscara. Nada de grid de cards.
- **Motion distintivo:** las cotas se trazan al entrar; el hover de cada servicio estampa su número; el preloader coloca las 4 cruces de registro y traza el marco del wordmark.
- **Riesgo:** caer en cliché "blueprint cyan" → mitigado: papel cálido + naranja, jamás azul de plano.

### Dirección B — "PRENSA & TRAZO" (editorial tipográfico suizo-brutal)

- **Concepto:** la retícula suiza llevada al límite: tipografía MASSIVE (referencia Snellenberg 192px), reglas horizontales duras que estructuran la página como un periódico de un solo tema, asimetrías deliberadas, microtipografía exquisita. La voz la lleva el tipo; la decoración, fuera.
- **Paleta:** crudo `#EFECE4` · negro `#141414` · acento verde abeto `#2B4B3F` (dueño de CTAs y marcas). Acto final invertido en negro.
- **Tipografía:** **Zodiak** (Fontshare, serif display con carácter y óptica editorial) + **General Sans** (Fontshare, body) — licencia libre comercial, self-host.
- **Gramática:** typographic poster con actos — las palabras llegan a pesos/tamaños desiguales; prohibido: cards, scrims, fondos fotográficos, motion decorativo que no sirva al texto.
- **Ejemplo de sección:** el hero es SOLO tipografía: claim a 3 tamaños en desorden deliberado, regla gruesa debajo, metadatos en la margen (mono pequeño: Lanzarote · ES/EN · est. 2023). Servicios = lista de índice de periódico: número, título gigante, página-flecha; hover: el título se desliza y la regla se intensifica.
- **Motion distintivo:** "la regla maestra" — una regla horizontal que viaja por la página marcando cada acto; velocity-skew sutil en titulares al hacer scroll rápido (skewY ±2°, de vuelta a 0).
- **Riesgo:** parecer estático frente a la promesa "Trionn-grade" → mitigado: la fuerza está en reveals tipográficos impecables + la persiana + smooth scroll; es la dirección más sobria.

### Dirección C — "LA LÍNEA MAESTRA" (el diagrama vivo)

- **Concepto:** una única línea continua (SVG path, sticky a viewport) se dibuja con el scroll atravesando TODA la página y conectando los nodos-sección: el sistema del cliente dibujándose ante sus ojos. La línea ES la marca ("Lines"); el nodo final cierra el circuito en el CTA. Hereda la idea "rail maestro de líneas" del v2 (que nunca llegó a navegadores) y la lleva a su forma pura.
- **Paleta:** marfil `#F5F2EB` · tinta china `#1A1A18` · acento cobre `#B4593A` · línea gris cálido. Grano sutil al 4% en los tramos oscuros.
- **Tipografía:** **Sentient** (Fontshare, serif con itálicas expresivas para énfasis) + **Cabinet Grotesk** (Fontshare, grotesk con personalidad) + acentos **JetBrains Mono** (labels de nodo).
- **Gramática:** continuous world ligero — un espacio (la línea) recorrido por actos que cuelgan de ella; cada sección es un nodo con label mono (`NODO 02 — MÉTODO`).
- **Ejemplo de sección:** el proceso de 4 pasos cuelga de la línea maestra: la línea dibuja un tramo, el paso aparece junto al nodo, conector corto, siguiente tramo. En el pico, la línea se tensa y cruza la pantalla entera.
- **Motion distintivo:** la línea dibujándose (DrawSVG + scrub) + nodos que se "sueldan" (pulso corto al completarse cada tramo); la persiana de rutas usa lamas QUE SON segmentos de línea.
- **Riesgo:** el trazo continuo exige coreografía fina (la línea debe estar siempre sincronizada con el contenido) → mitigado: la línea vive en un layer sticky propio, calculada por sección con longitudes relativas, no px absolutos.

**Fingerprint check** (vs v3 chaptered editorial, vs Sal y Pimienta, vs v1): las 3 direcciones difieren en ≥5/6 dimensiones (gramática, nav, hero, forma de actos, cierre, signature move). Aprobado por el gate.

---

## 4. Sistema de motion (común a las 3 direcciones)

### Módulos `src/scripts/motion/`

```
index.ts          — init único, registro de plugins, gsap.matchMedia, cleanup con ctx.revert()
tokens.ts         — CustomEase, duraciones, staggers centralizados
smooth-scroll.ts  — Lenis + gsap.ticker (wiring exacto abajo)
text-reveal.ts    — SplitText con máscaras; re-split tras document.fonts.ready y resize
shutter.ts        — la persiana (spec abajo)
image-reveal.ts   — reveals de imagen con clip-path
marquee.ts        — banda de frases (pausable, fuera de viewport quieta)
magnetic.ts       — magnetic en CTAs, SOLO (hover:hover) and (pointer:fine)
preloader.ts      — entrada corta, skippable (ver rendimiento)
```

**Sin cursor custom** (Trionn usa el nativo; el taste floor lo desaconseja).

### Tokens de motion

| Token | Valor | Uso |
|---|---|---|
| `--ease-reveal` | CustomEase ≈ `power4.out` (cubic-bezier(.16,1,.3,1), el "feel Trionn") | reveals de texto/imagen |
| `--ease-shutter` | `back.out(1.4)` suavizado | belts de la persiana |
| `--dur-fast` | 0.4s | hovers, micro |
| `--dur-base` | 0.8s | reveals |
| `--dur-slow` | 1.2s | momentos hero |
| `--stagger-text` | 60ms entre líneas (40ms mobile) | SplitText |
| `--stagger-belt` | 55ms entre lamas | persiana |

### La persiana v4 (spec propia, inspirada en las mediciones)

- Overlay fijo con **6 lamas VERTICALES** a sangre (no 10 horizontales: nos diferencia y lee mejor con tipografía vertical de sección), `scaleY` con `transform-origin` alternado (top/bottom), color según dirección (papel/tinta del acto destino).
- **COVER** ~750ms: `scaleY 0→1` cascada, stagger 55ms, overshoot 1.06 con `--ease-shutter`.
- **HOLD** ~350ms: swap de contenido (route change o cambio de fondo del acto).
- **REVEAL** ~600ms: `scaleY 1→0` dirección inversa, sin undershoot (más sobrio que Trionn).
- Capa de relleno sólida por debajo de las lamas (lección Trionn: los belts no cubren el 100%).
- `pointer-events: none` en idle; `visibility` gestionada; `will-change: transform` SOLO durante la animación (nada del will-change×1243 de Trionn).
- **Dónde aplica:** cambios de RUTA (`/`↔`/contact`↔`/service/[id]`, ES↔EN incluido) y al abrir el CTA de reserva. **Dónde NO:** entre secciones del scroll interno (cubrir el contenido a mitad de lectura rompe el flujo; las secciones transicionan con fondos/wipes ligeros dentro de su propio acto). Las anclas van con `lenis.scrollTo`.
- **Arquitectura en Astro MPA:** View Transitions API nativas de Astro (`<ClientRouter />`) para el swap + nuestro overlay belts como skin del transition (`astro:before-swap`/`astro:after-swap`). Alternativa evaluada: Swup/Barba (más control, +8KB y una dep más) — se descarta salvo que las VT fallen en QA. El re-init de motion tras swap cuelga de `astro:page-load`.

### Smooth scroll — DECISIÓN: Lenis (confirmar)

**Lenis YA está en package.json (1.3.26) — no hay que instalar nada.** Wiring:

```ts
const lenis = new Lenis({ autoRaf: false });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

ScrollSmoother se descarta (firmas muertas en Trionn, peor integración con SSR/pins, Lenis ya demostrado). `prefers-reduced-motion: reduce` → Lenis no se instancia.

### SplitText + i18n

- Split por LÍNEAS con máscara (`overflow:hidden` en el wrapper de línea, `yPercent 110 → 0`) para titulares; por PALABRAS para frases de una línea; chars SOLO en el hover roll de links (texto duplicado apilado).
- Re-split en: `document.fonts.ready`, `resize` (debounce 200ms, solo si cambia el ancho), y tras cambiar de idioma/ruta.
- El contenido queda visible sin JS y con reduced-motion (la ocultación inicial la pone el script, NUNCA el CSS — lección de CLS heredada).

### matchMedia (ramas)

| Condición | Comportamiento |
|---|---|
| `no-preference` | completo |
| `reduce` | sin persiana, sin parallax, sin Lenis, sin marquee; fades ≤200ms o estado final; contenido íntegro y alcanzable |
| `(hover:hover) and (pointer:fine)` | magnetic + hovers roll |
| móvil | stagger menor, sin velocity-skew, persiana de 4 lamas, pins revisados (ver riesgos) |

---

## 5. Mapa de secciones (home, común + variante por dirección)

| # | Sección | Contenido (del inventario §2) | Motion |
|---|---|---|---|
| 0 | Preloader | wordmark + (A: cruces de registro / B: regla que se traza / C: primer trazo de la línea) | corto (≤1.2s), skippable, solo primera visita |
| 1 | Hero | claim (candidato v3 "Tu negocio ya tiene la lógica. Yo trazo las líneas.") + keywords line + 2 CTAs | entrada tras preloader por líneas; palabra final rotativa propia ("sistema/orden/líneas") |
| 2 | Banda marquee | frases de marca ("Sistemas que trabajan por ti"…) | marquee continuo, pausa fuera de viewport |
| 3 | Tesis | subtitle full-stack + propuesta | reveal por líneas + regla/línea según dirección |
| 4 | Servicios ×6 | los 6 servicios reales, con imagen real cada uno | la pieza central: ver "ejemplo de sección" por dirección; hover roll; NADA de grid de cards |
| 5 | Proceso ×4 | 4 pasos | conectado por línea/regla; cada paso entra al alcanzar su nodo |
| 6 | Pruebas | stats (confirmar o "sin-dato") + 4 razones | cifras con count-up SOLO si se confirman reales |
| 7 | FAQ ×6 | 6 preguntas | acordeón con máscara, foco visible |
| 8 | Cierre/Booking | "El siguiente paso es una conversación" + Cal.com + wa.me + email | el "final resuelve": CTA en pie con contenido, hora local Lanzarote |
| 9 | Footer | nav, Instagram, legales, © | tipografía espaciada + roll hovers (patrón medido en Trionn/Snellenberg) |

Otras rutas: `/contact` (datos + Cal.com), `/service/[id]` (ficha completa por servicio, 6×2), privacidad, thankyou, 404 — todas con la misma gramática y persiana en la navegación.

**Curva de sensación** (scroll-craft): curiosidad (hero) → reconocimiento (tesis) → **confianza creciente (servicios, el tramo largo)** → tensión ligera (proceso: "¿y yo dónde entro?") → **pico: cierre/booking** (la línea/regla/plano se completa y el CTA queda en pie) → calma (footer). Un solo pico; el tramo de servicios es el de mayor scroll room.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Lenis + pins (carrera de ScrollTriggers; ya mordió en Sal y Pimienta y Morning Ritual) | init orquestado en orden determinista desde `index.ts` + UN `ScrollTrigger.refresh()` final; pins justificados uno a uno en F3; NADA de `setTimeout(0)` |
| SplitText + i18n ES/EN | re-split en `fonts.ready` + resize + cambio de idioma; testeado en ambas rutas |
| Transiciones de ruta en MPA (Astro no es SPA como Trionn) | View Transitions nativas + overlay belts; fallback documentado si VT falla: navegación clásica con belts solo de salida |
| Tracking tras swap de ruta (Cookiebot/GTM/Pixel) | GTM ya pageviewea en `astro:page-load`; verificar pixel único por vista en QA F0; los componentes de tracking NO se reescriben |
| CLS por ocultación pre-animación | la ocultación inicial la pone SIEMPRE el script; imágenes con width/height intrínsecos (lección Morning Ritual) |
| LCP ralentizado por preloader | preloader ≤1.2s, `sessionStorage` para saltarlo en visitas repetidas, hero SSR visible debajo |
| Scroll horizontal por tweens con immediateRender | check `scrollWidth <= innerWidth` en QA por viewport |
| Pins residuales en móvil (fallo conocido del portfolio) | revisión de pin-spacers por viewport en cada QA; colapso limpio con `matchMedia` |
| Reduced-motion emulado "pegado" en sesiones Playwright (lección Sal y Pimienta) | protocolo QA: verificar `matchMedia(...).matches === false` al inicio, recargar tras emular, restaurar |

---

## 7. Presupuesto de rendimiento

| Métrica | Objetivo | Cómo |
|---|---|---|
| LCP | < 2.5s (móvil) | hero tipográfico (0 imágenes críticas), fuentes self-host con `font-display: swap` + preload de la display, preloader skippable |
| CLS | < 0.05 | ver riesgos; sin animaciones de layout (solo transform/opacity/clip-path) |
| INP | < 200ms | listeners pasivos, magnetic/roll solo en fine-pointer, sin work en scroll handler (todo por ScrollTrigger) |
| JS de motion añadido | ≤ ~60KB gz | gsap core ~28 + ScrollTrigger ~14 + SplitText ~7 + CustomEase ~2 + Lenis ~5 ≈ **56KB**; registro selectivo de plugins; SIN Three.js |
| Fuentes | 2 familias + 1 mono de labels | subsets woff2; variable cuando exista |
| Scroll | 60fps | transform/opacity only, `will-change` solo durante animación |

---

## 8. Imágenes necesarias (preliminar)

Las 3 direcciones son tipográficas/lineales — el presupuesto de imágenes es MÍNIMO (así se quiere):

1. **Textura de grano/fondo** (1, tileable sutil) — común.
2. **Imagen de acto invertido/pico** (1, abstracta de línea/trazo acorde a la dirección) — según dirección.
3. **Imágenes de servicio** (6) — REUTILIZAR las webp reales existentes (con intrinsic size); regenerar solo si la dirección pide coherencia total (decidir en F1).
4. **Retrato** — `aboutPic.webp` existe (hoy sin usar); se usa tal cual o no se usa (nada de generar retratos sintéticos).
5. **og-image** (1200×630) — nueva, tipográfica.

Los prompts completos por recurso (OpenWork + fal.ai) van en `docs/assets-prompts.md` **tras elegir dirección** (entregable 8.2 del master prompt). Mientras: marcadores `TODO-ASSET`. Reglas: sin texto incrustado, sin personas reconocibles, sin look IA (neón/circuitos/robots), dimensiones explícitas, srcset.

---

## 9. Fases y criterios de aceptación

| Fase | Alcance | Aceptación |
|---|---|---|
| **F0** | rama `redesign/logic-lines-v4-motion` desde `main`, tokens Tailwind 4 (`@theme`), tipografías self-host, layout base, i18n intacto, tracking re-montado y verificado, `lenis` (ya en deps) + `motion/` skeleton | `astro check` 0 errores · build OK · `/` y `/en/` · Cookiebot+GTM+Pixel activos en dev · sin daisyUI ni `data-theme` |
| **F1** | estructura + diseño estático de TODAS las secciones con contenido real (gate `design-taste-frontend`+`impeccable`) | capturas por sección · squint test · sin scroll horizontal · a11y base |
| **F2** | SplitText + reveals de texto | reveals medibles por viewport · re-split tras fonts.ready/resize/idioma · reduced-motion |
| **F3** | persiana + transiciones de ruta | grabación del ciclo cover/hold/reveal con timings · atrás/adelante/anclas sin glitch · VT + tracking intacto |
| **F4** | micro-interacciones (roll, magnetic, marquee, parallax, image-reveal, preloader) | hover/focus/active/disabled · fine-pointer gating · consola limpia |
| **F5** | imágenes, pulido, móvil, rendimiento, a11y final | checklist completo §10 master prompt · Lighthouse en presupuesto · 60fps · capturas finales |

Cada fase termina con el checklist del master prompt (§10) + validación visual del usuario. Sin push a `main` ni merge sin OK.

---

## 10. Decisiones que necesito del usuario

1. **Dirección visual: A (El Plano) / B (Prensa & Trazo) / C (La Línea Maestra).**
2. **Confirmar Lenis** como smooth scroll (recomendado; ya en deps).
3. **Copy del hero**: candidato v3 ("Tu negocio ya tiene la lógica. Yo trazo las líneas.") vs extraer de `main` en F0.
4. **Stats (1.240h / 38 / 6)**: confirmar como reales, o bloque en estado "sin-dato".
