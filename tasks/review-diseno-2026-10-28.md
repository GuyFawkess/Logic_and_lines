# Revisión de diseño — Home Logic & Lines v4 (2026-10-28)

- Rama: `redesign/logic-lines-v4-motion` @ `1c0c8ed` (R6+R7). Solo lectura: no se ha tocado código.
- Criterio: `docs/motion-plan.md` (Dirección C, paleta bloqueada), `docs/research-v4/2026-10-11-catalogo-motion-trionn.md`, `docs/research-v4/trionn-*.jpeg`.
- Evidencia: capturas Playwright headless 1440x900 y 390x844 contra `localhost:4321` (scratchpad de la sesión, no commiteadas) + mediciones JS en vivo + código.
- Medido: doc 15.299 px (17 viewports) en desktop, de los cuales ~10.170 px están pineados (Servicios 5.670, Proceso 2.970, Booking 1.530). CLS 0,0076 desktop / 0,00001 móvil. LCP ≈1,45 s (headless). `scrollWidth <= innerWidth` en 1440, 390, con reduced-motion y sin JS. Sin JS y con reduced-motion: 0 elementos de texto ocultos. Foco visible (outline ámbar 2px) en todo el recorrido con Tab. Contrastes AA: marfil apagado #B3AA9A sobre #0D1A1F 7,71, sobre #16262E 6,76 y sobre #223B47 5,12; ámbar sobre #223B47 5,46; texto #0D1A1F sobre ámbar 8,22.

---

## A) Veredicto

1. **Al nivel de las referencias:** la ingeniería de motion (Lenis + pins deterministas, stack horizontal reversible, driver único en Booking, blur-reveal del claim, marquee reactiva a la velocidad del scroll, roll de caracteres) y la disciplina técnica (sin JS = todo visible, reduced-motion = estado final, CLS prácticamente cero, AA en todo, tracking intacto).
2. **Lejos del nivel:** la **tipografía no tiene escala dramática**. El h1 llega a 96px (Snellenberg 192px) y los 6 h2 miden exactamente 56px, desde la tesis hasta el claim del pico. No hay jerarquía de actos.
3. **La Línea Maestra no se lee como una sola línea:** son 6 dibujos sueltos (vertical del hero, tramo de la tesis, rail, subrayados, circuito) y no aparece en Servicios ni en el footer. Así el concepto de la dirección C se pierde.
4. **Composición y densidad:** el hero tiene unos 340px vacíos arriba y deja los CTAs bajo el pliegue (desktop y móvil). Las tarjetas de servicio están vacías al ~45%. Proceso abre ~900px vacío y Booking deja 228px muertos. El footer (wordmark de 24px) no cierra la página como lo hacen Trionn y Snellenberg.
5. **Superficies planas:** tarjetas #16262E sobre #0D1A1F a 1,14:1. Imágenes de servicio con look IA (cerebro de neón, mano con iconos) que compiten con el ámbar. El grano al 4,5% es la única textura.

---

## B) Hallazgos priorizados

### P0

**P0-1 · Hero: escala insuficiente y CTAs bajo el pliegue**
- Evidencia: `src/components/sections/HeroHome.astro:24` (`min-h-[100dvh] … justify-end pb-16 pt-24`), `:46` (`text-[clamp(2.5rem,7vw,6rem)] max-w-[16ch] leading-[1.12]`). Medido a 1440x900: h1 96px y top 413px, botones entre 865 y 909px (cortados por el pliegue de 900). A 390x844: h1 40px, top 507px y borde inferior del CTA a 853 (> 844). Captura: el h1 parte en "Tu negocio ya tiene la / lógica." y deja "lógica." huérfana.
- Por qué se aleja: Snellenberg usa h1 de 192px y Trionn un hero que ocupa el viewport. Aquí la sección mide 100dvh **más** los 72px del header sticky, así que el contenido cae por debajo del pliegue y deja un vacío arriba sin intención.
- Cambio propuesto:
  - Sección: `min-h-[calc(100svh-72px)] pb-12 pt-16 lg:pb-14`.
  - h1: `text-[clamp(3rem,9vw,8.5rem)] leading-[0.98] tracking-[-0.045em] max-w-none`, con `text-balance` en cada `<span class="block">` (≈130px a 1440, 48px a 390).
  - Línea de keywords: `mt-6 text-sm md:text-[15px]`. CTAs: `mt-8`.
  - Criterio: borde inferior del CTA ≤ `innerHeight - 24` en 1440x900, 1280x720 y 390x844.

**P0-2 · Jerarquía plana: todos los h2 miden 56px**
- Evidencia: el mismo `text-[clamp(2rem,4.5vw,3.5rem)]` aparece en `Thesis.astro:32`, `ServicesIndex.astro:52`, `ProcessRail.astro:52`, `Proof.astro:40` y `FaqIndex.astro:51`, y el claim usa `BookingClose.astro:42` `clamp(2.25rem,4vw,3.5rem)`. Medido: 56px / -2,24px en los 6.
- Por qué se aleja: Trionn alterna escalas (h2 en mayúsculas a 95px frente a h1 de 68px) y el plan pide «escala dramática» y un único pico (§5, curva de sensación). Con todo a 56px, la tesis, los capítulos y el cierre pesan lo mismo y el pico no se nota.
- Cambio propuesto, una escala de 3 niveles:
  - (a) Tesis: `text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.02] tracking-[-0.045em] max-w-[16ch]`.
  - (b) Títulos de capítulo (Servicios, Proceso, Razones, FAQ): `text-[clamp(2.25rem,5.5vw,5rem)] leading-[1] tracking-[-0.045em]`.
  - (c) Claim de Booking (pico): `text-[clamp(2.75rem,7vw,7rem)] leading-[0.98] tracking-[-0.05em] max-w-[16ch]`.
  - Mantener el `<span class="text-primary">` de R7.
  - Guardas en Servicios: con el stack montado, el borde inferior de la tarjeta debe quedar ≤ `innerHeight - 24` en 1440x900 y 1280x720 (si no, bajar Servicios a `clamp(…,4.25rem)`).

**P0-3 · La Línea Maestra no se lee como una sola línea**
- Evidencia:
  - Hero: vertical con nodo (`HeroHome.astro:32`).
  - Tesis: un tramo horizontal suelto que empieza en otro eje (`Thesis.astro:16-30`, x=60, mientras el texto del hero está en x=116).
  - Servicios: sin línea persistente; solo la guía efímera del image-wipe.
  - Rail de Proceso, subrayados de Proof y circuito de Booking: piezas aisladas.
  - Footer: sin línea (`SiteFooter.astro`).
  - Capturas: `d-01250`, `d-07300`, `d-14400`.
- Por qué se aleja: el plan (§3 C y catálogo §0.3, «Continuidad») define la línea como un **sistema continuo** que convierte cada sección en un nodo. Hoy hay 6 adornos ámbar independientes. Es la seña de identidad de la dirección y no se percibe.
- Cambio propuesto, una «espina» de costura en el gutter izquierdo (x = `lg:left-10`, el mismo eje que la línea del hero):
  - Un `<svg data-line-seam>` absoluto de 1,5px de grosor (`stroke-(--color-primary)`, `vector-effect:non-scaling-stroke`) que baja desde el nodo del hero, atraviesa la Tesis y termina en un nodo `r=5` a la altura del baseline de cada h2 de capítulo (Tesis, Proof, FAQ, Booking).
  - Animación con DrawSVG `"0% 0%" → "0% 100%"`, `scrub: 0.5`, `ease:"none"`, un trigger por sección (`start:"top 80%"`, `end:"bottom 60%"`). Pop del nodo con el patrón existente (`back.out(2.2)` 0,45s, guard `fired`).
  - Estado final en el markup; `gsap.set` en JS; en reduced-motion, la línea completa.
  - El tramo horizontal de la Tesis pasa a nacer de esa espina (x1 = gutter) en lugar de flotar.
  - Fuera de alcance: Servicios y Proceso (ya tienen gramática propia).

### P1

**P1-1 · Servicios: tarjeta medio vacía, imagen pequeña y look IA**
- Evidencia:
  - `tokens.ts:158,165`: tarjeta `clamp(880px,62vw,1160px)` x `min(60svh,640px)` (≈540px de alto); el contenido termina hacia los 290px y deja ~250px vacíos (capturas `d-01700`, `d-03500`).
  - Imagen en 4/12 col (`ServicesIndex.astro:82-85`), unos 238px de ancho.
  - Imágenes webp con neón y brillo ámbar (cerebro, mano con iconos, casa iluminada), en contra de la regla del plan §8 («sin look IA (neón/circuitos/robots)») y de un único dueño del ámbar.
  - Tarjeta sobre el fondo: 1,14:1, muy plana.
- Cambio propuesto (solo en modo stack):
  - Imagen a `md:col-span-5` y a sangre vertical de la tarjeta (`h-full aspect-auto object-cover`, quitando `aspect-[4/3]` solo con el stack montado).
  - Número `01…06` en `font-display text-[clamp(3rem,5vw,5rem)] leading-none text-(--color-text-dark)/40`.
  - h3 a `clamp(2rem,3vw,3rem)`.
  - Tratamiento de imagen unificado: `filter: grayscale(1) contrast(1.05) brightness(.92)` en reposo y `grayscale(0)` en la tarjeta superior del stack (transición 600ms `cubic-bezier(.16,1,.3,1)`; nada de filtros animados por scroll). Así el ámbar vuelve a ser de la línea.
  - Borde de tarjeta `border-(--color-text)/10` en lugar de la hairline del 14% que se pierde.

**P1-2 · Proceso: capítulo vacío al llegar, más un residuo de 20px**
- Evidencia:
  - Medido al final de hscroll y en el ancla `#proceso` (y=7276): las 4 tarjetas a `opacity:0`; la 01 llega a 1 hacia y≈8200, es decir ~900px de scroll con solo el título y la cita (captura `d-07300`).
  - La sección de Servicios queda con `right=20px`: `max-w-[1400px] mx-auto` dentro de 1440 hace que `xPercent:-100` no la saque del todo, y se ve una franja oscura de 20px en el borde izquierdo (pixel (12,25,30) frente al capítulo (32,56,67)).
- Por qué se aleja: R6 se hizo justamente para eliminar «pantallas vacías / tramos muertos».
- Cambio propuesto:
  - (a) En `line-system.ts`, la tarjeta 01 y el nodo 1 empiezan en el estado final (no se ocultan con `gsap.set`) y el primer tramo arranca en progress 0. `RAIL.railLenVh` pasa de 2.2 a 1.6.
  - (b) En `ServicesIndex.astro:45`, la `<section>` pasa a ser full-bleed (`w-full bg-(--color-bg)`) y `max-w-[1400px] px-6 lg:px-10` baja a un div interior (el mismo patrón que ProcessRail). Así `xPercent -100` la saca por completo.
  - (c) La cita (`ProcessRail.astro:143`) entra después de la tarjeta 04, no antes.

**P1-3 · Booking (el pico): composición alineada arriba y 228px muertos**
- Evidencia: `BookingClose.astro:24-27` (`py-24 lg:py-32 lg:min-h-[100svh]`, sin centrado vertical). Medido: 228px vacíos bajo la hora de Lanzarote, a lo que se suma el tramo pineado de 1.530px (captura `d-13300`).
- Cambio propuesto: `lg:flex lg:flex-col lg:justify-center` en la sección (el pin del driver no cambia). El claim, a la escala del P0-2c. La píldora del circuito pasa de `max-w-[640px]` a `max-w-[720px]` y el CTA de `h-12 px-8` a `lg:h-14 lg:px-10 text-base`.

**P1-4 · Footer sin cierre**
- Evidencia: `SiteFooter.astro:44`, wordmark `text-xl md:text-2xl tracking-[0.32em]` (24px). Hay 4 columnas con 6 enlaces apilados (`min-h-11`), lo que deja una retícula dispersa. No hay roll ni sticky-reveal (técnica 13, F5 pendiente). Referencia: `docs/research-v4/trionn-04-footer.jpeg`, con el wordmark a todo el ancho **hecho de líneas**.
- Cambio propuesto:
  - Wordmark a ancho completo bajo los enlaces: `font-display uppercase text-[clamp(3rem,13.5vw,12.5rem)] leading-[0.85] tracking-[-0.03em] text-(--color-text)`, con textura de líneas estática: `mask-image: repeating-linear-gradient(to bottom,#000 0 3px,transparent 3px 7px)` (no animada, cumple la regla).
  - La espina del P0-3 termina en el baseline del wordmark.
  - Enlaces del footer añadidos a `TARGETS` del roll (`hover-roll.ts:39-44`).
  - Retícula a `lg:grid-cols-[2fr_1fr_1fr_1fr]` con `gap-y-0` en las listas.

**P1-5 · El preloader supera el presupuesto y se repite en cada recarga**
- Evidencia: `tokens.ts:239,241`, `dur 1.4 + exitDur 0.7 = 2,1 s`, frente a la aceptación de F4 (≤1,6 s) y del §5 (≤1,2 s). `index.ts:96` usa un flag de módulo, sin sessionStorage, en contra del plan §6/§7 («`sessionStorage` para saltarlo en visitas repetidas»).
- Cambio propuesto: `dur: 1.0`, `exitDur: 0.6` (total 1,6 s) y `sessionStorage['ll-pre']=1` tras la primera vista (lectura y escritura en try/catch, fail-open = mostrar).

**P1-6 · Hover roll incompleto**
- Evidencia: `hover-roll.ts:39-44` solo cubre «Ver servicio», el CTA de Cal, la nav y el CTA del header. Quedan fuera los 2 CTAs del hero (`data-gtm-location="hero"`), los enlaces del footer y los de WhatsApp y email de Booking. Trionn aplica el roll en todos los enlaces (plan §1.1).
- Cambio propuesto: añadir `'[data-gtm-location="hero"]'`, `'footer a'` y `'#booking a[data-gtm-event="contact_click"]'`, con el mismo `ROLL` (0,4s, stagger 0,02, `power4.out`) y la misma puerta `(hover:hover) and (pointer:fine)`. Los `<a>` con `underline` (Booking) necesitan `inline-flex items-center` para que la capa 2 no se duplique; ya lo tienen.

### P2

**P2-1 · Marquee con poca presencia**
- Evidencia: `MarqueeBand.astro:25`, `text-lg lg:text-xl` (20px), `py-6`. En Trionn es un acto a viewport completo.
- Cambio propuesto: `text-[clamp(1.5rem,3.2vw,3rem)] tracking-[-0.02em]`, `py-8 lg:py-10`, frases alternas en `italic`, nodos ámbar de `h-1.5` a `h-2`.

**P2-2 · Voz y afirmaciones inconsistentes (genérico IA)**
- Evidencia: «Yo trazo» y «Soy desarrollador» conviven con «Combinamos…», «Metodología probada que garantiza resultados», «Equipo experto disponible… siempre», «Reduce hasta un 85%» (sin dato) y el «¿Trabajáis…?» de las FAQ.
- Por qué importa: el plan fija «números reales o ninguno» y la marca es unipersonal.
- **Requiere decisión del usuario**: unificar a primera persona del singular y retirar el 85% o confirmarlo. Es copy, no diseño.

**P2-3 · Acabado: glow ámbar y eje de alineación**
- Evidencia:
  - `BookingClose.astro:193`, el hover del CTA proyecta `box-shadow 0 6px 18px` ámbar (un glow en hover, prohibido).
  - `BookingClose.astro:73`, `drop-shadow` estático en el circuito (tolerado por el catálogo §3; recomiendo quitarlo por coherencia).
  - `Thesis.astro:38`, `md:pl-[6%]` crea un tercer eje (x=140) frente a h2 x=60 y hero x=116.
- Cambio propuesto: quitar el `box-shadow` (dejar `translateY(-2px)` y el cambio de color) y el `drop-shadow`. En la Tesis, `md:pl-0`; el eje del cuerpo queda fijado por la espina del P0-3.

---

## C) Lo que NO tocar (ratificado)

- Paleta bloqueada (#0D1A1F / #16262E / #FEF7EA / #B3AA9A / #E5A525, hover #F0B83A, capítulo #223B47). No añadir hex nuevos.
- Dirección C, tipografías Sentient + Cabinet Grotesk + JetBrains Mono, Lenis y cursor nativo.
- **R6**: transiciones naturales sin persianas (shutter.ts eliminado; deja sin efecto las «3 persianas» de F4), stack horizontal de Servicios con el slide que revela Proceso debajo y prioridades 19 > 15 > 10.
- **R7**: Proof legacy (grid 3x2 de tarjetas con icono en círculo, count-up y subrayado) y las palabras ámbar en los títulos. Aviso: con R7 el ámbar ya tiene varios dueños. No extenderlo a nada más (ni etiquetas, ni bordes, ni fondos).
- Tarjetas de Proceso al estilo «las de antes» (preferencia del usuario).
- Copy del hero v3 y stats 1.240 / 38 / 6.
- Reglas técnicas: ocultación inicial solo por `gsap.set`, reduced-motion = estado final, `will-change` temporal, reveals de texto `once` y el resto scrubbed, un único `ScrollTrigger.refresh()`.
- Tracking: Cookiebot, GTM, Pixel, CAPI, atributos `data-gtm-*`, el embed de Cal.com y el `trackMetaEvent` del footer y de Booking.
- FAQ con `<details>` nativo y JSON-LD FAQPage.

---

## D) Lote para delegar a opencode (tareas independientes, sin ficheros compartidos)

Común a todas: `npx astro check` sin errores nuevos (baseline 53/0/18), `npm run build` OK, y además en 1440x900, 1280x720 y 390x844: `scrollWidth <= innerWidth`; sin JS y con reduced-motion, 0 nodos de texto ocultos; consola sin errores nuevos. Aplicar cada cambio también en `/en/` cuando el markup sea compartido (lo es: los componentes reciben `currentLang`).

**T1 · Hero y Tesis (P0-1, P0-2a, P2-3 eje)**
- Ficheros: `src/components/sections/HeroHome.astro`, `src/components/sections/Thesis.astro`.
- Verificación:
  - h1 ≥ 120px a 1440 y ≥ 48px a 390.
  - Borde inferior del CTA del hero ≤ `innerHeight - 24` en los 3 viewports.
  - Ninguna línea del h1 con una sola palabra (comparar los rects de los `.ll-line`).
  - h2 de la Tesis ≥ 80px a 1440.
  - Mismo `left` para el h2 y el `<p>` de la Tesis.

**T2 · Escala de capítulos y pico (P0-2b/c, P1-3, P2-3 glow)**
- Ficheros: `src/components/sections/ProcessRail.astro` (solo h2), `src/components/sections/Proof.astro` (solo h2), `src/components/sections/FaqIndex.astro` (solo h2), `src/components/sections/BookingClose.astro`.
- Verificación:
  - h2 de capítulo ≥ 72px a 1440.
  - Claim de Booking ≥ 96px a 1440 y estrictamente mayor que cualquier otro h2.
  - En el pin de Booking, |hueco superior − hueco inferior| ≤ 24px a 1440x900.
  - `grep box-shadow\|drop-shadow BookingClose.astro` = 0.
  - El circuito sigue cerrando (path con drawSVG 100% al final del pin).

**T3 · Servicios: tarjeta, imagen y salida limpia (P1-1, P1-2b)**
- Ficheros: `src/components/sections/ServicesIndex.astro`, `src/scripts/motion/hscroll.ts` (solo si el layout del stack necesita ajuste por el wrapper interior).
- Verificación:
  - Con el stack montado, el contenido de texto más la imagen ocupan ≥ 85% de la altura de la tarjeta.
  - En y = hscroll.end, `#servicios.getBoundingClientRect().right <= 0`.
  - Imágenes en `grayscale(1)` salvo la tarjeta superior.
  - h2 de Servicios con la escala del P0-2b y borde inferior de la tarjeta ≤ `innerHeight - 24` en 1440x900 y 1280x720.
  - Móvil y fallback vertical sin cambios visuales (comparar con `docs/r6-captures/08-mobile-proceso.png`).

**T4 · Footer de cierre y roll completo (P1-4, P1-6)**
- Ficheros: `src/components/sections/SiteFooter.astro`, `src/scripts/motion/hover-roll.ts`.
- Verificación:
  - Ancho del wordmark ≥ 85% del contenedor a 1440 y a 390, sin desbordamiento horizontal.
  - Al hacer hover (puntero fino) en los CTAs del hero, en los enlaces del footer y en WhatsApp/email de Booking aparece la capa 2 del roll (`[aria-hidden="true"]` dentro del label).
  - Sin texto duplicado visible en reposo.
  - El nombre accesible de cada enlace no cambia.
  - `trackMetaEvent` sigue disparándose (listener intacto).

**T5 · Preloader y arranque de Proceso (P1-5, P1-2a/c)**
- Ficheros: `src/scripts/motion/tokens.ts` (PRELOADER, RAIL), `src/scripts/motion/index.ts` (gating con sessionStorage), `src/scripts/motion/line-system.ts` (estado inicial de la tarjeta 01 y orden de la cita), `src/components/sections/ProcessRail.astro` (solo si la cita necesita `data-*`).
- Verificación:
  - El overlay desaparece en ≤ 1.650 ms en la primera carga y no aparece en una segunda recarga dentro de la misma pestaña.
  - En el ancla `#proceso` (y = hscroll.end), la tarjeta 01 está a `opacity 1`.
  - En `hscroll.end + 0,5·innerHeight`, al menos 2 tarjetas a `opacity 1`.
  - Rewind a y=0 sin estados rotos.
  - Con reduced-motion no hay preloader y el rail aparece completo.

Fuera del lote (requiere decisión del usuario): P0-3 (la espina de la Línea Maestra, que toca varias secciones y `line-system.ts`; conviene ejecutarla después de T1-T5 para no pisar ficheros), P2-1 (marquee) y P2-2 (voz y afirmaciones del copy).
