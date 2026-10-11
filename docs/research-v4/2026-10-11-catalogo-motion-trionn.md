# Catálogo de motion "trionn-level" — Logic & Lines v4 (dirección C "La Línea Maestra")

- **Fecha:** 2026-10-11
- **Rama / HEAD de referencia:** `redesign/logic-lines-v4-motion` @ `ca672c1` (*fix(f2): continue reveal tween across autoSplit re-split during animation*)
- **Propósito:** catálogo de técnicas para el upgrade de motion v4 — **validación humana pendiente**. Investigación web (case study oficial de trionn en Codrops, tutorial Codrops de máscaras SVG, docs GSAP, librería Osmo, Exo Ape/Locomotive). SOLO técnicas y parámetros: nada de assets, copy ni código de terceros se copia.
- **Contexto de decisión:** el usuario calificó la ejecución actual de la línea maestra ("stroke-dashoffset que crece") como pobre y lejos de trionn.com. Este catálogo alimenta la revisión de F3/F4/F5 (ver §5, pendiente de OK).
- **Restricciones del proyecto:** Astro 5 + GSAP 3.15 (todos los plugins gratuitos) + ScrollTrigger + Lenis. **Sin WebGL**. Paleta bloqueada (#0D1A1F / #16262E / #FEF7EA / #B3AA9A / ámbar #E5A525 · hover #F0B83A). Tipos self-host Sentient + Cabinet Grotesk + JetBrains Mono. Reglas v4 vigentes: ocultación inicial SOLO por `gsap.set` (sin JS = todo visible), reduced-motion = estado final visible, ámbar un único dueño, sin daisyUI, tracking intocable.

---

## 0. Diagnóstico: por qué la línea actual "decepciona" (según la evidencia, no opinión)

El closing note del case study de trionn lo dice textualmente: *"el nivel final de pulido vino menos de los efectos individuales y más de sincronizar cuidadosamente cada capa de la experiencia"*. Un `stroke-dashoffset` que crece no falla por ser dashoffset — falla porque una línea que SOLO crece no tiene ninguna de las 4 propiedades que hacen que la línea de trionn se sienta viva:

1. **Masa y velocidad**: la línea tiene "cuerpo" (segmento con cola tipo cometa, no un extremo ciego), y reacciona a la velocidad del scroll.
2. **Responsabilidad**: el mundo reacciona a la línea (nodos que estallan al pasarla, iconos que se dibujan al llegar la línea, contadores que arrancan).
3. **Continuidad**: la línea no es UN elemento, es un SISTEMA — se convierte en subrayado, en borde de imagen, en marco del CTA, en lama de persiana. Eso es exactamente la promesa de la dirección C.
4. **Orquestación**: un único valor de progreso por sección gobierna todo (ver §1, técnica 7). Esa es la arquitectura que separa un sitio premiado de una suma de efectos.

---

## 1. Tabla de técnicas (portables a Astro + GSAP 3.15 + ScrollTrigger + Lenis, sin WebGL)

| # | Técnica | Qué es | Receta GSAP concreta | Dónde encaja en NUESTRAS secciones | Impacto | Riesgo/Perf |
|---|---------|--------|----------------------|-------------------------------------|---------|-------------|
| 1 | **DrawSVG segmentado "cometa"** | La línea no crece desde un extremo ciego: es un segmento con cola que viaja (cabeza dibuja, cola persigue) | `gsap.fromTo(line, {drawSVG:"0 8%"}, {drawSVG:"92% 100%", ease:"none", scrollTrigger:{trigger, scrub:0.5}})` — la semántica de segmentos de DrawSVG (`"20% 80%"`) permite animar cabeza y cola a velocidades distintas. Variante: cabeza `"0%→100%"` mientras la cola va `"0%→88%"`. Flag `"live"` si el layout cambia en resize. Ojo Firefox: usar `102%` si el trazo se queda corto | La Línea Maestra continua entre TODOS los bloques (Hero→BookingClose) | **Alto** | Bajo. Solo anima dashoffset/dasharray sobre 1-3 paths |
| 2 | **Nodos que estallan al paso de la línea** | Circles/dots del path que hacen pop con overshoot cuando el cometa los cruza, cada uno una sola vez | Detectar cruce: en `onUpdate` del ScrollTrigger de la línea, comparar `DrawSVGPlugin.getPosition(path)` (posición actual de la cabeza) vs la posición del nodo a lo largo del path (precalculada con `getPointAtLength`). Anim del nodo: `scale 0→1, ease:"back.out(2.2)"`, 0.45s + anillo `drawSVG:"0%"→"100%"` 0.4s power2.out + `opacity` — disparado una vez con guard `if (fired.has(node)) return` | ProcessRail (4 dots), Proof, ramas en ServicesIndex, el nodo final en BookingClose | **Alto** | Bajo. Verificación O(1) por frame |
| 3 | **Ramificación de línea hacia cards + draw de iconos** | Del tronco salen ramitas cortas hacia cada card; el icono SVG de la card se dibuja cuando la línea "llega" (trionn hace esto exacto en sus cards de servicios) | Ramas: `gsap.from(".branch", {drawSVG:0, duration:0.8, stagger:0.1, ease:"power2.inOut"})` encadenado. Iconos al centro: cuando el card cruza el centro del viewport → `gsap.fromTo(paths, {drawSVG:"0%"}, {drawSVG:"100%", duration:1.5, stagger:0.04})` (parámetros literales de trionn) | **ServicesIndex** (6 servicios): la línea baja por el índice y ramifica a cada fila con su imagen | **Alto** | Medio. Divide paths multi-segmento con el helper `splitPaths()` de la doc oficial |
| 4 | **Line-wipe de imagen (reveal anclado a la línea)** | La imagen se revela con un clip-path/edge cuyo borde ES el paso de la línea ámbar; dentro, inner-parallax | Contenedor `overflow:hidden` + imagen `scale:1.25→1, yPercent:6→-6` (scrub ligero, `scrub:0.8`); reveal: `clipPath:"inset(0 100% 0 0)" → "inset(0 0% 0 0)"`, `duration:1.1, ease:"power4.inOut"`, sincronizado con el tween de la línea que cruza esa fila (misma timeline) | ServicesIndex (imágenes por servicio), Proof (imagen de apoyo si hay) | **Alto** | Medio. clip-path + scale en GPU; mantener `will-change` solo durante el tween |
| 5 | **Persiana line-native "v2" (F3 corregida)** | La persiana existe, pero con densidad y dirección de línea: 12-16 lamas que se abren centro-fuera EN CADA lama, con stagger de onda y la línea viajando por el frente de la onda | Máscara SVG (`maskUnits="userSpaceOnUse"`) con rects blancos: cada lama = 2 rects que parten del centro (`x` fijo / `x-w`) y expanden `width` con +0.05 de solape anti-gap; `shape-rendering="crispEdges"`; `stagger:{each:0.02, from:"start"}`; todo dentro de un ScrollTrigger `scrub:2.0-2.5` (parámetros del tutorial de Codrops de máscaras: 12-30 divisiones, stagger 0.02, scrub 2.0-2.5) | SOLO en 1-2 momentos (ver veredicto §4): p. ej. Thesis→ServicesIndex | **Alto (1 uso)** / **Medio (abusado)** | Medio. SVG mask + scrub es barato; el coste real es narrativo si se repite |
| 6 | **BlurTextReveal de chars** (signature de trionn) | El titular entra char a char desenfocándose a foco, "fuera de orden" | SplitText chars → `gsap.set(el+chars, {autoAlpha:0, filter:"blur(12px)", willChange:"filter, opacity"})` → timeline: `blur:0, duration:0.8, stagger:{each:0.08, from:"random"}, ease:"power2.out"` + contenedor `autoAlpha:1, blur:0, duration:0.5`. Quitar `will-change` onComplete. Gating: solo arranca cuando el preloader/transición acaba (trionn: `delay:1.2` tras el loader) | Hero h1, Thesis (la frase tesis), BookingClose (claim final). NOTA: ya teníamos BlurTextReveal de la v2 — reactivarlo con los params exactos de trionn | **Alto** | Medio. `filter:blur` es caro → solo headings, nunca párrafos |
| 7 | **Un solo driver de progreso por sección (arquitectura trionn)** | En su sección más compleja, trionn NO usa ScrollTrigger: un único `progress 0→1` se remapea a rangos (explode 0.35–0.53, cards 0.56–1.0) y una timeline construida UNA vez se scrubbea con `.progress()`. Cero desincronización, cero carrera de triggers | `ScrollTrigger.create({trigger, start:"top top", end:"+=250%", pin:true, onUpdate: s => state.progress = s.progress})`; RAF: `targetT = map(progress)`; `tl.progress(targetT)` con lerp suavizado (trionn: `0.12` hacia el target en la secuencia de frames) | **ProcessRail** (pin de los 4 pasos: línea+dots+números+textos desde UN progreso) y **BookingClose** (cierre de circuito: dibujo + nodo + claim + CTA) | **Alto** (esto ES el "nivel trionn" percibido) | Medio: requiere construir la timeline una vez y refresh en resize, pero elimina la clase entera de bugs de sincronía que ya sufrimos en v2 |
| 8 | **Marquee reactiva a velocidad y dirección** | La banda acelera, frena e invierte según scroll — convierte un adorno en respuesta táctil | Loop base: `gsap.to(track, {xPercent:-50, ease:"none", duration:18, repeat:-1})` con contenido duplicado; en ScrollTrigger global `onUpdate`: `tl.timeScale(gsap.utils.clamp(-4, 4, 1 + self.getVelocity()/400))`, con retorno suave `gsap.to(tl, {timeScale: self.direction * base})` (patrón del foro GSAP "increase speed of marquee"; Osmo lo tiene como `marquee-with-scroll-direction`) | **MarqueeBand** (la única marquee estática que F4 iba a animar — este es el modo correcto) | Medio-alto | Bajo |
| 9 | **Hover roll de chars en CTAs/links** (trionn lo hace en sus botones) | El label se desliza hacia arriba char a char y entra una copia desde abajo | SplitText chars duplicados en dos capas apiladas → hover: `yPercent:-100, stagger:0.02, duration:0.4, ease:"power4.out"`; salida: `from:"end"` para efecto ola inversa. Variante CSS pura de Osmo: `button-with-css-character-stagger` | CTAs (hero, BookingClose), nav, footer links. Es micro pero trionn lo usa en TODA su UI — es parte del "sentido de acabado" | Medio-alto | Bajo. Puerta `@media (hover:hover) and (pointer:fine)` (regla que ya tenemos) |
| 10 | **Stats count-up con zero-pad + subrayado dibujado** | Contador 0→1.240 con padding tipo terminal ("050+", "01.5K+" en trionn = count-up con pad) + línea que subraya la cifra al terminar | `const obj={v:0}; gsap.to(obj,{v:1240, duration:1.4, ease:"power2.out", onUpdate:() => el.textContent = format(obj.v)})` con `snap`, `onEnter` once; subrayado: `gsap.from(rule, {drawSVG:0, duration:0.8, ease:"power3.inOut"}, "-=0.6")` | **Proof** (1.240 / 38 / 6): cifra sube, la línea ámbar subraya, y esa MISMA línea continúa hacia el siguiente bloque (continuidad) | Medio-alto | Bajo |
| 11 | **Preloader corto que desembolsa en el hero** | Contador + la propia línea dibujándose; al completar, la pantalla se "abre" y arranca el hero — NADA anima antes (trionn: `transitionReady` flag; BlurText con `delay:1.2`) | `progress 0→100` (~1.2-1.6s, power1.inOut) mientras `gsap.from(logoPath, {drawSVG:0, duration:1.4})`; al completar: panel `yPercent:-100, duration:0.7, ease:"power4.inOut"` y `onComplete: heroTL.play()` | Primera carga de la home. La línea del preloader ES la línea maestra: nace aquí | **Alto** | Bajo-medio. Cuidado con LCP: preloader ≤1.6s y hero visible sin JS (regla F1) |
| 12 | **Coreografía por eventos, no por delays mágicos** | Cada momento dispara al siguiente con un evento cuando TERMINA el anterior (trionn usa `CustomEvent("trionn:about-lion-start")` tras `headingAnimMs`) | `headingTL.eventCallback("onComplete", () => window.dispatchEvent(new CustomEvent("ll:thesis-done")))` + listener `{once:true}` en la sección siguiente (con check de "ya disparado" para refresh/soft-nav) | Hero→Marquee→Thesis; y el preloader→hero de la técnica 11 | Medio | Bajo. Es disciplina de orquestación, gratis en perf |
| 13 | **Footer sticky-reveal** (Exo Ape) | El footer queda "debajo" y el contenido sube revelándolo con parallax — cierre físico de la página | `.footer{position:sticky; bottom:0}` bajo el main, o `gsap.to(main, {yPercent:-100…})` variante; con la línea maestra terminando EN el wordmark del footer | **Footer** | Medio | Bajo. Verificar iOS `position:sticky` + Lenis (patrón conocido: contenedor fijo de Lenis) |
| 14 | **MotionPath del "viajero" por la línea** | Un punto/orbe pequeño recorre la línea (con `autoRotate` si lleva un chevron); es el "cursor" de la línea y puede llevar las reveals asociadas | `gsap.to(dot, {motionPath:{path:"#masterline", align:"#masterline", alignOrigin:[0.5,0.5], start:0, end:1}, ease:"none", scrollTrigger:{scrub:0.5}})` — un solo elemento animado por frame, muy barato | ProcessRail (el punto que recorre los 4 pasos) o BookingClose (el punto cierra el circuito). Alternativa/adición al cometa de la técnica 1 | Alto si se integra con las reveals, ruido si va solo | Medio. `align` usa getBBox → recalcular en resize |

**Nota Exo Ape:** su página (fetch del HTML) confirma la gramática — hero serif gigante con palabras apiladas, imágenes de proyecto en tarjetas verticales, "Scroll to explore", footer revelado bajo el contenido; el clon documentado de referencia lista sus rasgos: header context-aware, page transitions, scroll horizontal, pins, custom cursor, footer sticky. **No se pudo extraer de su fuente la implementación exacta de sus "scribbles"** (el fetch por texto no incluye los SVG internos) — si se quiere esa pieza concreta, toca sesión con navegador. Su lección portable es la §13 y la coherencia de que TODO el sitio comparte el mismo vocabulario de reveal.

---

## 2. Los 5 signature moves de trionn (con parámetros medidos del case study)

1. **Un estado compartido que funde scroll+hover+click (`explodeAmt`)**: `explodeAmt = Math.max(scrollProgress, hoverAmt, burstContrib, introAmt)` — un solo valor gobierna el símbolo del hero; soltar el ratón revierte suave porque todo es estado, no tweens. Lección portable: **nuestra línea debería tener un único valor maestro por sección** del que derivan línea, nodos, textos e imágenes (técnica 7).
2. **BlurTextReveal chars "from random"**: blur 12px→0 + autoAlpha, `stagger 0.08 from:"random"`, `power2.out`, 0.8s, tras el loader (`delay:1.2`). El desorden aleatorio es lo que evita el look "máquina de escribir".
3. **La secuencia de Services con driver único**: 371 frames WebP precargados en chunks de 20 en `requestIdleCallback` con `img.decode()`; frame objetivo con lerp `0.12`; titular explotado en glifos medidos con la **Range API**; cards entrando en pares izq/der con trayectoria curva `arc = sin(frac*π)`; iconos con DrawSVG 1.5s/stagger 0.04 al pasar el centro; cierre con stripe wipe. La wipe es el ÚLTIMO acto de una secuencia que ya contó algo — nunca la transición seca entre bloques.
4. **Chispas de soldadura sobre las líneas guía del hero** ("Dare to touch the lines"): hit-test de ratón contra los paths con tolerancia 14px (canvas 2D offscreen como textura, no raycasting), ráfagas de 5-6 bolts con cooldown 0.04–0.10s, targets aleatorios entre las otras líneas, glow por capas de `THREE.Line` **sin post-procesado de bloom**. Es el patrón "la línea responde al usuario" que en v4 puede traducirse sin WebGL en: la línea se **tensa y vibra** (desplazamiento sine 1-2px) al pasar el cursor cerca, o los nodos cercanos al cursor se cargan (stroke más grueso).
5. **Logo de cable como cuerdas de guitarra en el footer**: cada stroke es una cuerda; la onda se **redibuja proceduralmente cada frame** (26 puntos, envolvente `sin(πt)` que anula los extremos, 2.2 ciclos), suelta con `expo.out 0.9s`, y cada stroke tiene un **clon invisible con stroke 18× más ancho** como hit-area. Lección portable para v4: la línea maestra puede "vibrar como cuerda" al hover — es GSAP puro sobre el atributo `d`, cero WebGL.

(Extra, aplica a cualquier técnica: nada arranca hasta `transitionReady`; render/pesado solo cuando la sección está a ±1 viewport; `will-change` retirado al terminar; `gsap.matchMedia()` para dar a desktop y mobile lógicas distintas.)

---

## 3. Qué NO hacer (lo que delata)

- **Glow post-procesado / bloom** en la línea. Trionn lo evita incluso teniendo WebGL: glow por capas geométricas. En SVG: máximo un segundo path difuminado con `filter` estático, sin animar el filtro.
- **Partículas genéricas / confetti / estrellas** alrededor de la línea. Todo lo que trionn dispara está anclado a un elemento con significado (nodos, iconos, letras).
- **Gradientes animados** (línea degradada que "fluye", fondos con gradiente en movimiento). Es el tell nº1 de IA y además compite con el ámbar plano #E5A525, que es nuestro activo de marca.
- **Delays mágicos** (`delay: 0.6` "a ojo") en cadena. Trionn usa gating explícito (`transitionReady`, `CustomEvent`). Un delay mal puesto en móvil rompe la coreografía entera.
- **`blur()` en párrafos** o en más de 2-3 headings visibles. El blur es el reveal premium de trionn *precisamente porque lo racionan*; en bloque de texto largo es jank seguro.
- **Pins/wipes repetidos entre los 9 bloques**: mata el ritmo, infla la longitud de scroll y el coste móvil (veredicto §4).
- **Dashoffset lineal sin segmento ni easing** — la versión actual. También: sin `pointer-events` y sin hit-area ancha, una línea fina es *invisible* como superficie de interacción (trionn: clon con stroke 18×).
- Ya en nuestras reglas, reconfirmado por trionn: **un solo dueño del acento** (la línea es el ámbar; nada más compite), reduced-motion = estado final visible, sin-JS todo legible.

---

## 4. Veredicto: la F3 persiana de 6 lamas NO es la transición correcta tal como está especificada

Concreto, en tres puntos:

1. **6 lamas es densidad insuficiente.** El estándar del patrón (tutorial Codrops de máscaras SVG + recursos Osmo `shutter-scroll-transition`/`column-wipe-page-transition`) usa **12–30 divisiones con stagger 0.02**. Con 6, la persiana se lee como puerta corredera genérica (y Osmo la vende literalmente como recurso de plantilla — es decir, no es fingerprint nuestro). Además cada lama premium se abre **centro-fuera con dos mitades** (rect par `left/right`, solape +0.05, `crispEdges`), no como bloque que cae.
2. **Aplicarla entre 9 bloques = 8 wipes = ruina de ritmo.** Trionn usa su stripe wipe como **cierre de secuencias pineadas que ya contaron una historia** (Services→Testimonials, Gallery→siguiente), 2-3 veces en TODO el sitio. Una wipe entre cada par de bloques de una home de 9 se convierte en el nuevo "skew" de la v2: la gramática se vuelve predecible al tercer uso.
3. **La persiana solo tiene sentido si la línea ES la persiana.** Tal como está en el plan (COVER/HOLD/REVEAL con overshoot), es un efecto pegado *encima* de la dirección C. La versión que sí suma: la línea maestra llega al borde inferior, se **ensancha horizontalmente** hasta cubrir (la COVER es la propia línea creciendo en grosor, no un panel), y al descubrirse se **vuelve a estirar en las lamas** — la onda de lamas se abre siguiendo a la línea como frente de onda.

**Propuesta concreta para 9 bloques (1 pico + 1 semi-pico + transiciones line-native en el resto):**

| Transición | Bloques | Mecanismo |
|---|---|---|
| **Persiana line-native (F3 v2)** — el único pin fuerte | Thesis → ServicesIndex | 12-14 lamas, máscara SVG, scrub 2.0-2.5, stagger 0.02, la línea viaja por el frente de la onda. Overshoot 1.06 solo en el último grupo de lamas, no en todas |
| **Semi-pico (sin pin o pin corto)** | FAQ → BookingClose | Line-wipe completo a pantalla: la línea se ensancha a banda ámbar de 100vh que barre y dentro de ella viaja el claim siguiente (esto ES una "persiana de 1 lama con la línea dentro") |
| **Costuras line-native** | todos los demás pares | El cometa (téc. 1) + nodos que estallan (téc. 2) + rules que se dibujan a lo ancho (DrawSVG 0.8-1.2s) + footer sticky-reveal (téc. 13). La página se siente continua porque la línea nunca se corta — no porque haya cortinas |
| **Pico peak-end** | BookingClose | Timeline única con driver de progreso (téc. 7): la línea cierra el circuito (MotionPath del viajero + último segmento DrawSVG hasta tocar el nodo inicial), BlurText del claim, CTA con hover roll |

Así F3 deja de ser "un efecto entre secciones" y pasa a ser **el único momento donde la línea muta de forma** — que es exactamente cómo trionn justifica su stripe wipe.

---

## 5. Propuesta de plan revisado (pendiente OK del usuario)

Reordenación de fases respecto al plan vigente (`docs/motion-plan.md`), aplicando el catálogo anterior. **Nada de esto se implementa sin OK explícito.**

### F3-v2 — Persiana line-native + arquitectura de driver único
- **Persiana line-native de 12-14 lamas, UNA sola vez** en Thesis→ServicesIndex (téc. 5): máscara SVG con `maskUnits="userSpaceOnUse"`, cada lama = 2 rects centro-fuera con solape +0.05 y `crispEdges`, `stagger:{each:0.02}`, `scrub:2.0-2.5`; **la línea maestra viaja como frente de onda** (su cabeza marca qué lamas están abiertas). Se descarta la persiana de 6 lamas del plan original (ver §4) y el uso repetido entre bloques.
- **Arquitectura de driver único de progreso por sección (téc. 7)** para **ProcessRail** y **BookingClose**: un solo ScrollTrigger `pin` + `onUpdate` alimenta una timeline construida una vez y scrubbeada con `.progress()`; dentro de ella, línea+dots+números+textos derivan del mismo progreso (nada de triggers en paralelo → elimina la clase de bugs de carrera de ScrollTriggers que ya sufrimos en v2).

### F3-v2 (cont.) — Costuras line-native en el resto de la página
- **Cometa** (téc. 1) recorriendo la línea maestra entre todos los bloques con `scrub:0.5` (segmento `"0 8%"` → `"92% 100%"`).
- **Nodos que estallan** (téc. 2: `back.out(2.2)` + anillo DrawSVG) al paso del cometa en ProcessRail, Proof y ServicesIndex; ramificación hacia las 6 filas de servicios con draw de iconos 1.5s/stagger 0.04 (téc. 3).
- **Underlines/reglas dibujadas** (DrawSVG 0.8-1.2s power3.inOut) como costura entre bloques — la línea nunca se corta; no hay cortinas.
- Coreografía por eventos, no por delays (téc. 12) en Hero→Marquee→Thesis.

### Pico — BookingClose (peak-end)
- **Semi-pico line-wipe en FAQ→BookingClose**: la línea se ensancha a banda ámbar 100vh que barre la pantalla y dentro viaja el claim (la "persiana de 1 lama"). (Se descarta la alternativa Proof→FAQ.)
- **Cierre de circuito**: MotionPath del viajero (téc. 14) + último segmento DrawSVG hasta tocar el nodo inicial; BlurText del claim (téc. 6); CTA con hover roll (téc. 9). Todo dentro del driver único de BookingClose.

### F4 — Micro-respuestas (contenido del F4 original, con recetas del catálogo)
- **Hover rolls de chars** en CTAs/nav/footer (téc. 9; `yPercent:-100, stagger:0.02, power4.out`, salida `from:"end"`; solo `hover:hover` + `pointer:fine`).
- **Marquee velocity-reactive** (téc. 8; `timeScale` con `getVelocity()` clamp ±4, retorno suave por `direction`).
- **Count-up stats con zero-pad + subrayado dibujado** en Proof (téc. 10; 1.240/38/6, `duration:1.4 power2.out` + DrawSVG de la regla).
- **Preloader de línea** (téc. 11): contador 0→100 (~1.2-1.6s) + DrawSVG del wordmark/línea; cortina `power4.inOut` 0.7s; `onComplete` dispara el hero por evento (téc. 12). LCP: ≤1.6s y hero visible sin JS.
- Hora viva de Lanzarote (ya en F4 original, sin cambios).

### F5 — Imágenes y pulido (contenido del F5 original, con recetas del catálogo)
- **Line-wipe de imágenes** (téc. 4): `clip-path inset` + `scale 1.25→1` + inner-parallax `yPercent 6→-6`, sincronizado con el paso de la línea en ServicesIndex (y Proof si procede).
- **Footer sticky-reveal** (téc. 13), con la línea maestra terminando en el wordmark.
- Pulido: `will-change` retirado al terminar, `gsap.matchMedia()` desktop/mobile, escena "calentada" solo a ±1 viewport, QA reduced-motion + sin-JS en cada técnica.

### Notas de validación
- Este modelo **no ve imágenes**: toda la investigación es por texto (case study oficial + docs); la validación perceptual corresponde al usuario con capturas (`docs/f1-captures/` estilo) o sesión con navegador.
- Fuente principal de parámetros: el case study de Codrops escrito por el propio equipo de trionn (jul-2026) — ya no es deducción reverse-engineering, es su documentación.
- Regla anti-copia: solo técnicas/parámetros; cero assets, copy o código de terceros.

---

## 6. Fuentes

- **Trionn (case study oficial con código):** "The Architecture Behind Trionn: Coordinating GSAP, Three.js, Lenis, and Web Audio" — Codrops, 15-jul-2026 — https://tympanus.net/codrops/2026/07/15/the-architecture-behind-trionn-coordinating-gsap-three-js-lenis-and-web-audio/
- **Transiciones persiana/grid con máscaras SVG (tutorial con repo):** "SVG Mask Transitions on Scroll with GSAP and ScrollTrigger" — Codrops, 11-mar-2026 — https://tympanus.net/codrops/2026/03/11/svg-mask-transitions-on-scroll-with-gsap-and-scrolltrigger/ · repo: https://github.com/Hiro-kiii/Scroll-Transition · demo: https://tympanus.net/Tutorials/SVGMaskScrollTransition/
- **DrawSVG (semántica de segmentos, stagger, `live`, `splitPaths`):** https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/
- **MotionPath (align/start/end/autoRotate):** https://gsap.com/docs/v3/Plugins/MotionPathPlugin/
- **Osmo (Dennis Snellenberg + Ilja van Eck, 38 SOTD entre ambos)** — recursos citados: `draw-path-on-scroll`, `follow-svg-path-on-scroll`, `draw-svg-page-transition`, `curved-wipe-page-transition`, `shutter-scroll-transition`, `column-wipe-page-transition`, `draw-random-underline`, `line-reveal-testimonials`, `highlight-marker-text-reveal`, `masked-text-reveal`, `number-odometer`, `button-with-css-character-stagger`, `marquee-with-scroll-direction`, `elastic-line`, `sticky-steps-basic`, `image-sequence-on-scroll`, `momentum-based-hover` — https://osmo.supply/
- **Exo Ape:** https://exoape.com/ (estructura verificada por fetch) · despiece de features vía clon documentado: https://github.com/KaryanVisuals/eXoaPe
- **Locomotive:** https://locomotive.ca/ (tipografía repetida/cíclica y retícula editorial)
- **Trionn en vivo** (hero "hold to blast", stats zero-pad "050+/01.5K+"): https://trionn.com/
