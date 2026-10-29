/**
 * Motion tokens for the v4 "La Linea Maestra" system.
 *
 * R6 (2026-10-15): gramática de transiciones NATURALES estilo Trionn. Fuera el
 * sistema de persianas/fronteras (shutter.ts ELIMINADO: cero overlays, cero
 * teleports, cero tokens de frontera). El scroll es continuo:
 *   - Servicios pinea (STACK) y su cola desliza la SECCIÓN entera a la
 *     izquierda (REVEAL.slideLenVh) revelando Proceso, que espera DEBAJO
 *     pinneado por GSAP (pin "proceso" sobre [data-proceso-pin], montado por
 *     hscroll.ts con el wrapper adelantado por margen negativo).
 *   - El rail del Proceso (RAIL) encadena su rango al end del pin de
 *     Servicios: start = hscroll.end leído FRESCO en cada refresh.
 *   - El pico (CIRCUIT) pinea solo su viaje propio.
 *
 * Prioridades de refresh (GSAP 3.15.0: priority MAYOR refresca PRIMERO, sort
 * `(priority || 0) * -1e6`): hscroll 19 → rail-grid 15 → circuit 10 — orden
 * de página descendente, así cada trigger lee anclas frescas con los pins de
 * arriba ya aplicados. Los triggers naturales (reveals, proof, móviles)
 * quedan a 0.
 */

/**
 * Reveal easing (CSS form). Its GSAP counterpart is the CustomEase "ll-reveal"
 * registered in index.ts from EASE_REVEAL_PATH: a power4.out approximation.
 */
export const EASE_REVEAL = "cubic-bezier(0.16, 1, 0.3, 1)";

/** SVG path used to register the CustomEase "ll-reveal" (GSAP side of EASE_REVEAL). */
export const EASE_REVEAL_PATH = "M0,0 C0.16,1 0.3,1 1,1";

/** Durations, in seconds. */
export const DUR = {
  /** Hovers and micro-interactions. */
  fast: 0.4,
  /** Standard reveals (text, images). */
  base: 0.8,
  /** Hero and other big moments. */
  slow: 1.2,
} as const;

/** Staggers, in seconds. */
export const STAGGER = {
  /** Between split lines (desktop). */
  text: 0.06,
  /** Between split lines (mobile). */
  textMobile: 0.04,
} as const;

/*
 * Text reveals (F2, text-reveal.ts). Kept here so every motion constant has a
 * single home (docs/motion-plan.md, section 4).
 */

/** Mobile breakpoint for text reveals. Aligned with Tailwind `md` (768px). */
export const MOBILE_QUERY = "(max-width: 767px)";

/**
 * Words reveal travel (px): short fade + rise (y 12 -> 0). The spec leaves the
 * final value to implementation; 12px floats a 14px mono line without noise.
 */
export const WORDS_Y = 12;

/** Re-split resize debounce (ms). Same tolerance SplitText autoSplit uses. */
export const RESIZE_DEBOUNCE = 200;

/*
 * Line system (F3-v2, line-system.ts) — "La Linea Maestra" (direccion C).
 * R6: los cometas con cola perseguidora (headStart/tailChase) solo viven ya en
 * los segmentos INDEPENDIENTES (Thesis); el rail del Proceso usa coreografía
 * fija (línea que crece continua + pops secos + tarjetas en secuencia).
 */
export const LINE = {
  /** Comet head start (% of the segment): visible segment width at rest. */
  headStart: 8,
  /** Tail chase (% of the segment): where the tail lands when the head arrives. */
  tailChase: 12,
  /** Fraction of each segment's timeline slice spent drawing (rest = tail settle). */
  cometPhase: 0.8,
  /**
   * Scrub (s) de los segmentos independientes (cometas por secciones).
   * R6: el rail ya no lo comparte — usa RAIL.scrub (0.6).
   */
  scrub: 0.75,
  /** Node pop duration (s), ease nodePopEase (solo circuito y móvil). */
  nodePopDur: 0.45,
  /** Node pop ease (overshoot del pop, compartido line-system + circuit). */
  nodePopEase: "back.out(2.2)",
  /** Delta de radio del anillo del pop sobre el nodo (px). */
  nodeRingRadiusDelta: 6,
  /** Grosor del trazo del anillo del pop (px). */
  nodeRingStroke: 1.5,
  /** Node ring draw+fade duration (s), ease power2.out. */
  nodeRingDur: 0.4,
  /** Stats count-up duration (s), ease power2.out. */
  countDur: 1.4,
  /** Stat underline draw duration (s), ease power3.inOut. */
  underlineDur: 0.8,
} as const;

/**
 * R6 — Gramática de REVEAL natural (transición Servicios→Proceso): sin
 * overlays. La cola del pin de hscroll desliza la SECCIÓN de Servicios fuera
 * por la izquierda y Proceso (pinneado, z-0) queda revelado debajo.
 */
export const REVEAL = {
  /**
   * Tramo del slide final (svh): la sección sale xPercent 0 → -100 con
   * power2.inOut. R6-b: es TAMBIÉN el tramo inicial del pin "proceso" de
   * hscroll.ts (que cubre slide + RAIL.railLenVh) y el sumando del margen del
   * wrapper (-100svh de la sección - este slide = -210svh): deja el top del
   * wrapper en el inicio EXACTO del slide, donde el pin engancha con "top
   * top" natural (ver hscroll.ts).
   */
  slideLenVh: 1.1,
} as const;

/**
 * R6 — Driver del rail del Proceso (line-system.ts, desktop lg+): UN trigger
 * SIN pin + UNA timeline scrubbed de coreografía FIJA (línea crece continua,
 * nodos con pop seco, tarjetas en secuencia). Encadenado al pin de Servicios.
 * R6-b: el PANEL está pinneado aparte (pin "proceso", hscroll.ts — cubre
 * slide + este rango con refreshPriority igual a RAIL.priority); este valor
 * de priority es el que comparten ambos triggers de Proceso.
 */
export const RAIL = {
  /**
   * Longitud del rango scrubbed (vh): los 3 tramos + pops + tarjetas + cita.
   * P1-2a/P1-2c: 1.6 (antes 2.2) — la tarjeta 01 y el nodo 1 NACEN visibles
   * (el capítulo de Proceso no abre vacío) y la cita entra tras la tarjeta 04
   * dentro de este mismo rango.
   */
  railLenVh: 1.6,
  /** Scrub (s): igualado al del pin de Servicios (R6). */
  scrub: 0.6,
  /** refreshPriority (ver cabecera: 19 > 15 > 10, orden de página). */
  priority: 15,
} as const;

/*
 * Sticky-stacking cards de ServicesIndex (F4-t3, hscroll.ts) — 6 tarjetas de
 * contenido apiladas en el mismo slot; cada nueva entra desde la DERECHA
 * mientras las cubiertas escalan hacia atrás (progresivo). Pin + scrub 100%
 * reversible. Solo lg + no-preference: el layout del stack lo aplica el JS
 * (regla de oro sin-JS). R6: la cola del pin añade el dwell de lectura y el
 * SLIDE de salida de la sección (REVEAL.slideLenVh) que revela Proceso.
 * Matemática del referente (21st.dev adaptado a GSAP):
 * targetScale(j) = max(minScale, 1 - (N-j-1) * scaleStep).
 */
export const STACK = {
  /** Query de montaje del stack — lg Y sin reduced-motion (regla del
   *  proyecto: el layout apilado y el estado inicial oculto SOLO existen con
   *  movimiento; en reduce el fallback es el flujo vertical del markup). Es
   *  la MISMA condición de la rama matchMedia de index.ts y además el guard
   *  interno de initHScroll (doble cerradura): aunque el módulo se llamara
   *  fuera de la rama, reduce nunca monta el stack. */
  mountQuery: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
  /**
   * Ancho de las tarjetas (las 6 IGUALES: imprescindible para apilar). R2
   * (escala editorial, feedback del usuario): techo 1160px (rango pedido
   * 1120-1200) y floor 880px — por debajo, el grid 12-col interno con
   * gap-10 colapsa (columnas de <10px en un stage de 1024px).
   */
  cardWidth: "clamp(880px, 62vw, 1160px)",
  /**
   * Alto de las tarjetas (igual para las 6; proporción ~1.9:1 con el ancho).
   * R3-4: cap 60svh — reparte el aire a ambos lados en viewports de 800-943px
   * de alto sin capar el 640px en pantallas altas. Palanca complementaria en
   * hscroll.ts (neutralización del pt del h2 en modo stack).
   */
  cardHeight: "min(60svh, 640px)",
  /** Scrub (s) del pin (rebobinado con lag táctil). R6: 0.6 (antes 0.8),
   *  igualado al rail — todo el sistema más ágil. */
  scrub: 0.6,
  /** refreshPriority (ver cabecera: 19 > 15 > 10, orden de página). */
  priority: 19,
  /**
   * R6: dwell de LECTURA tras el viaje — la tarjeta 06 queda quieta y
   * legible antes del slide de salida (ex-BOUNDARY.stackDwellVh).
   */
  stackDwellVh: 0.7,
  /**
   * Escala de la tarjeta más enterrada. R2 (feedback: profundidad sutil tipo
   * 21st.dev, nada del 0.6 dramático del referente): la primera acaba a 0.94
   * y las siguientes suben PROGRESIVAMENTE hasta ~0.96 (con N=6). La fórmula
   * de targetScale (hscroll.ts) es minScale + j * scaleStep.
   */
  minScale: 0.94,
  /** Subida de escala por nivel de cercanía a la cima (0.94 -> ~0.96 con N=6). */
  scaleStep: 0.005,
  /**
   * Oscurecimiento de la tarjeta cubierta: overlay interno (div creado por JS,
   * bg --color-bg-alt) cuya opacity va de 0 a este valor en el mismo rango
   * que la escala. Solo opacity (transform/opacity, nada de filter).
   */
  dimOpacity: 0.45,
  /** Deriva horizontal por nivel de profundidad (px, sutil). */
  drift: 12,
  /** Entrada de las tarjetas nuevas: % de su propio ancho desde la derecha. */
  enterXPercent: 120,
  /**
   * Ease de la entrada (R2): back.out MUY suave = aterrizaje con leve
   * overshoot elegante que se asienta (sin rebote cómico). Dentro del scrub
   * sigue siendo 100% reversible: al retroceder, el overshoot se deshace.
   */
  enterEase: "back.out(1.2)",
  /** Viewports de scroll por transición de tarjeta (ritmo del pin). */
  vhPerCard: 0.9,
} as const;

/**
 * Variante VERTICAL del stack de Servicios (<lg + no-preference, 2026-10-28):
 * la tarjeta k sube desde el borde inferior del stage y cubre a la k-1
 * (escala + overlay de oscurecimiento), y tras la última Proceso SUBE como
 * una hoja sobre el stack (scroll natural 1:1: el wrapper se adelanta
 * -100svh y pinta encima; sin transform). Desktop (STACK) no cambia.
 */
export const STACK_MOBILE = {
  /** Query de montaje (doble cerradura, igual que STACK.mountQuery). */
  mountQuery: "(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)",
  /** Viewports de scroll por tarjeta (~75% del alto, pedido 70-80%). */
  vhPerCard: 0.5,
  /** Dwell de lectura de la última tarjeta antes de que suba Proceso (vh). */
  dwellVh: 0.25,
  /** Tramo en que Proceso sube y cubre (vh): 1 = scroll natural 1:1. */
  riseVh: 1,
  /** Escala de la tarjeta cubierta (origin arriba-centro). */
  coverScale: 0.94,
  /** Asomo superior de la tarjeta cubierta (px). */
  peek: 12,
  /** pt del h2 en modo stack móvil (cabecera fija de 72px + aire). */
  titlePad: "7.5rem",
  /** Aire entre el stage y el borde inferior del viewport. */
  stageGap: "1rem",
} as const;

/*
 * Line-wipe de imágenes de servicio (F3-v2, image-reveal.ts) — técnica 4 del
 * catálogo: clip-path inset + línea guía ámbar sincronizada + inner-parallax.
 * F4-t2: los wipes pasan de once a SCRUB (política rewind, reversibles).
 */
export const IMAGE_WIPE = {
  /** Duración del wipe (s), ease power4.inOut. */
  dur: 1.1,
  /** Escala inicial de la imagen (inner-parallax; acaba EXACTA en 1). */
  scaleFrom: 1.15,
  /** Fade de la línea guía al terminar (s). */
  lineFade: 0.2,
  /** Grosor de la línea guía (px). */
  lineWidth: 2,
  /** Start del trigger vertical: "top 80%". */
  start: 0.8,
  /** End del trigger vertical: "top 35%" (el wipe completa con la fila en zona de lectura). */
  end: 0.35,
  /** Scrub (s) del wipe vertical (reversible). */
  scrub: 0.8,
  /** Start del trigger horizontal (containerAnimation): el panel entra por la derecha. */
  hStart: "left 90%",
  /** End del trigger horizontal: el wipe completa con el panel ya en zona de lectura. */
  hEnd: "left 40%",
} as const;

/*
 * Preloader (F4, preloader.ts) — técnica 11 del catálogo: contador + la línea
 * maestra dibujándose; al completar, el overlay se levanta y el hero arranca.
 * Gating DOBLE (P1-5): (1) flag de módulo en index.ts — SOLO primera carga
 * del documento; las navegaciones VT y reduced-motion no lo ven; (2)
 * sessionStorage (sessionKey) — la MISMA pestaña ya no lo repite en recargas
 * posteriores. Lectura/escritura en try/catch con fail-open = mostrar el
 * preloader (el peor caso es repetir el overlay, nunca dejar la página
 * tapada). Presupuesto F4: dur + exitDur = 1.0 + 0.6 = 1.6 s (≤1,6 s).
 */
export const PRELOADER = {
  /** Duración del dibujo de línea + contador (s), ease power1.inOut. */
  dur: 1.0,
  /** Salida del overlay (s), yPercent -100 con power4.inOut. */
  exitDur: 0.6,
  /** Clave de sessionStorage: la pestaña que ya vio el overlay no lo repite. */
  sessionKey: "ll-pre",
  /** Hard-cap failsafe (s): si algo se atasca, el overlay se quita igual. */
  hardCap: 2.5,
} as const;

/*
 * Marquee velocity-reactive (F4, marquee.ts) — técnica 8 del catálogo: loop
 * base lineal + timeScale acoplado a la velocidad de scroll (invierte al
 * subir), con retorno suave al reposo.
 */
export const MARQUEE = {
  /** Duración del loop base xPercent -50 (s), lineal. */
  dur: 19,
  /** Divisor de velocidad: timeScale = 1 + velocity / factor. */
  velocityFactor: 400,
  /** Límites del timeScale (invierte dirección al subir: negativo permitido). */
  timeScaleMin: -4,
  timeScaleMax: 4,
  /** Velocidad de retorno suave al reposo (lerp por frame del ticker). */
  settleLerp: 0.06,
} as const;

/*
 * Hover roll de chars (F4, hover-roll.ts) — técnica 9 del catálogo: label
 * duplicado en dos capas apiladas; hover saca la capa superior char a char
 * mientras la copia entra desde abajo. Salida en ola inversa (reverse del
 * timeline). Solo (hover:hover) and (pointer:fine) + no-preference.
 */
export const ROLL = {
  /** Duración del roll (s). */
  dur: 0.4,
  /** Stagger entre chars (s). */
  stagger: 0.02,
} as const;

/*
 * Pico peak-end — BookingClose (F3-v2, circuit.ts) — técnicas 7, 14 y 6 del
 * catálogo (docs/research-v4/2026-10-11-catalogo-motion-trionn.md): driver
 * único (UN ScrollTrigger pineado + UNA timeline construida una vez), cierre
 * de circuito con viajero MotionPath, pop del nodo de cierre y flash ÚNICO
 * del CTA. El claim usa el blur-reveal de chars (técnica 6). R6: el pin mide
 * SOLO el viaje propio del circuito (sin extensiones de frontera).
 */
export const CIRCUIT = {
  /** Query lg (Tailwind): pin + driver único solo en desktop. */
  lgQuery: "(min-width: 1024px)",
  /**
   * Recorrido pineado PROPIO del pico (vh). R6: sin el openLen heredado de la
   * frontera b5 — el circuito se dibuja íntegro en su propio rango.
   */
  pinTravelVh: 1.7,
  /** Scrub (s) del driver único (rango del brief 0.8-1.2). */
  scrub: 1,
  /** refreshPriority (ver cabecera: 19 > 15 > 10, orden de página). */
  priority: 10,
  /** Duración del dibujo del circuito (unidades de timeline scrubbed). */
  drawDur: 0.7,
  /** Tamaño del viajero (px). */
  travelerSize: 8,
  /** Hold tras el pop antes de que el unpin libere (unidades de timeline). */
  holdDur: 0.2,
  /** Flash único del CTA (unidades de timeline, ida y vuelta). */
  flashDur: 0.4,
  /** Duración del dibujo en móvil (s reales: timeline time-based, sin pin). */
  mobileDur: 1.3,
  /** Start del trigger móvil del claim: "top 80%" (el h2 entra antes que la fila). */
  mobileClaimStart: 0.8,
  /** Start del trigger móvil del circuito (sobre la fila): "top 85%". */
  mobileRowStart: 0.85,
  /** Blur inicial del claim (px, técnica 6). */
  claimBlur: 12,
  /** Duración del reveal de cada char del claim (s, técnica 6). */
  claimDur: 0.8,
  /** Stagger entre chars del claim (s, from:"random", técnica 6). */
  claimStagger: 0.08,
} as const;

/*
 * Hero logo mark (T7) — "la línea construye el logo": el logo de marca
 * (public/logoSolo.svg: 2 marcos ámbar + 2 glifos marfil) se DIBUJA dentro del
 * hero y se disuelve de nuevo en línea con el scroll.
 *
 * El MARKUP parte del estado FINAL (relleno completo): sin JS y con
 * reduced-motion se ve el logo finished. El ocultado inicial (fill-opacity 0,
 * trazo listo para dibujar) lo pone SOLO el JS con gsap.set.
 *
 * INTRO (una timeline, construida una vez por rama):
 *   t=0.00 marco exterior (0.90) | t=0.45 marco interior (0.70) |
 *   t=0.85 glifo L (0.50) | t=0.97 glifo 1 (0.50) | t=1.15 relleno (0.50) |
 *   t=1.20 un solo trazo marfil recorre el marco exterior (1.20) -> 2.40 s.
 *   El presupuesto del brief es <= 2.4 s: el dash arranca 0.05 s después del
 *   relleno (no después de que termine) para caber dentro.
 * MOVIL: la MISMA timeline con timeScale 1.5 -> 1.60 s (brief: <= 1.6 s).
 */
export const HERO_LOGO = {
  /** Query lg (Tailwind): scrub + tilt solo en desktop. */
  lgQuery: "(min-width: 1024px)",
  /** Duración del dibujo de cada tramo (s, escala desktop). */
  frameDur: 0.9,
  innerDur: 0.7,
  glyphDur: 0.5,
  /** Stagger entre los dos glifos (s). */
  glyphStagger: 0.12,
  /** Solape del tramo interior con el exterior (s; el interior entra antes). */
  innerOverlap: 0.45,
  /** Solape del tramo de glifos con el de marcos (s; entran antes). */
  glyphOverlap: 0.3,
  /** Cierre: relleno 0 -> 1 y trazo -> 0 (s). */
  fillDur: 0.5,
  /** Un único trazo marfil que recorre el marco exterior (s). */
  dashDur: 1.2,
  /** Desvanecido del dash en su cola (s) — cierra dentro del presupuesto. */
  dashFadeDur: 0.3,
  /** Fracción de la longitud del marco usada por el dash (%). */
  dashRatio: 12,
  /** Timeline completa (s) — presupuesto del brief: <= 2.4. */
  totalDur: 2.4,
  /** Timeline móvil (s) — presupuesto del brief: <= 1.6. */
  mobileDur: 1.6,
  /** Scrub (s) del disolvido por scroll (desktop). */
  scrub: 0.6,
  /**
   * FASES del disolvido (fracción del rango scrubbed). El rango del trigger
   * es toda la salida del hero (828 px a 1440), pero el logo vive en la
   * parte ALTA del hero: si el disolvido tardase todo el rango, se
   * completaría con el logo ya fuera de pantalla y no se vería. Por eso las
   * tres fases caben en el primer 32 % del rango — justo lo que el logo
   * tarda en salir del viewport.
   *   relleno se va (0 -> 0.12) · el trazo aparece (0.04 -> 0.18) ·
   *   el dibujo se deshace del revés (0.08 -> 0.20).
   */
  dissolveFillDur: 0.12,
  dissolveStrokeAt: 0.04,
  dissolveStrokeDur: 0.14,
  dissolveDrawAt: 0.08,
  dissolveDrawDur: 0.12,
  /** Stagger del disolvido (fracción del rango), en orden inverso al dibujo. */
  dissolveStagger: 0.02,
  /** Escala y desplazamiento del disolvido (fracción del rango). */
  dissolveMoveDur: 0.24,
  /** Escala final del disolvido (el logo se encoge). */
  dissolveScale: 0.82,
  /** Desplazamiento vertical del disolvido (vh, negativo = sube). */
  dissolveYVh: -6,
  /** Tilt del puntero: grados máximos por eje. */
  tiltMax: 5,
  /** Tilt: suavizado del quickTo (s). */
  tiltDur: 0.6,
  /** Grosor del trazo de dibujado (px de pantalla, non-scaling-stroke). */
  strokeWidth: 1.5,
  /** Trazo del dash (color de marca del glifo): el marfil del sistema. */
  dashStroke: "var(--color-text)",
} as const;

/**
 * Hero "zoom a traves del logo" (prototipo B elegido, 2026-10-28) — lo usa el
 * <script> de HeroHome.astro. El HERO_LOGO de arriba es el hero anterior
 * (retirado de index.ts; conservado en el tag git hero-logo-animation).
 *
 * Escena (desktop, pin scrubbed, timeline normalizada 0..1):
 *   0.00-0.25 el claim se retira · 0.00-1.00 la camara atraviesa el marco
 *   interior (scale 1 -> zoomScale, power2.in) mientras los dos marcos GIRAN
 *   en sentidos opuestos (cerradura de combinacion, ease none = el scrub manda)
 *   · 0.20-0.40 la barra de CTAs sale · 0.78-0.94 el logo se apaga ·
 *   0.90-1.00 la barra de CTAs vuelve sobre el fondo ya limpio.
 * El fondo NO cambia: termina en --color-bg (#0D1A1F), el mismo del body/Thesis.
 */
export const HERO_ZOOM = {
  lgQuery: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
  smQuery: "(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)",
  /** Intro desktop (s); movil = la misma timeline comprimida. */
  introDur: 2.4,
  mobileDur: 1.6,
  /** Longitud del pin (end relativo) y suavizado del scrub (s). */
  pinEnd: "+=140%",
  scrub: 0.8,
  /** Escala final de la camara (origen = centro del marco interior). */
  zoomScale: 14,
  /** Giro total (grados) durante TODO el pin, lineal con el scroll:
   *  tres ritmos distintos (cerradura de combinacion). Marcos en sentidos
   *  opuestos; los glifos "L1" giran como una unidad sobre su propio centro.
   *  Reposo (inicio del pin) = 0 en los tres. */
  outerRotate: 120,
  innerRotate: -180,
  glyphRotate: 90,
  /** Fases (fraccion de la timeline del pin). */
  claimOutDur: 0.25,
  barOutAt: 0.2,
  barOutDur: 0.2,
  markOutAt: 0.78,
  markOutDur: 0.16,
  barBackAt: 0.9,
  barBackDur: 0.1,
  /**
   * Movil/tablet (<1024px, 2026-10-28): la MISMA escena (mismas fases y giros
   * de arriba) con numeros tactiles: pin mas corto, scrub mas agil y menos
   * zoom (el logo en reposo ya ocupa ~60vw). Las alturas del hero van en svh
   * y ScrollTrigger 3.15 ignora el resize de la barra de URL en tactil
   * (ignoreMobileResize = isTouch === 1 por defecto): el pin no se re-mide al
   * plegarse la barra.
   */
  mobile: {
    /** Escala final de la camara (origen = centro del marco interior). */
    scale: 11,
    /** Longitud del pin (end relativo). */
    end: "+=110%",
    /** Suavizado del scrub (s). */
    scrub: 0.6,
  },
} as const;
