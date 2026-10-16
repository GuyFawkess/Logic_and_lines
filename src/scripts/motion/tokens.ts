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
  /** Longitud del rango scrubbed (vh): los 3 tramos + pops + tarjetas. */
  railLenVh: 2.2,
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
 * SOLO primera carga del documento (flag de módulo, no sessionStorage); las
 * navegaciones VT y reduced-motion no lo ven.
 */
export const PRELOADER = {
  /** Duración del dibujo de línea + contador (s), ease power1.inOut. */
  dur: 1.4,
  /** Salida del overlay (s), yPercent -100 con power4.inOut. */
  exitDur: 0.7,
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
