/**
 * Motion tokens for the v4 "La Linea Maestra" system.
 *
 * Single source of truth for easings, durations and staggers. Values come from
 * docs/motion-plan.md (section 4) and are adapted from the transition measured on
 * trionn.com (see docs/research-v4): we keep the feel, not their numbers.
 */

/**
 * Reveal easing (CSS form). Its GSAP counterpart is the CustomEase "ll-reveal"
 * registered in index.ts from EASE_REVEAL_PATH: a power4.out approximation.
 */
export const EASE_REVEAL = "cubic-bezier(0.16, 1, 0.3, 1)";

/** SVG path used to register the CustomEase "ll-reveal" (GSAP side of EASE_REVEAL). */
export const EASE_REVEAL_PATH = "M0,0 C0.16,1 0.3,1 1,1";

/**
 * Shutter belt easing. Softened `back.out` so belts overshoot slightly and settle
 * (Trionn's belts overshoot harder with elastic; 1.4 is the sober adaptation).
 *
 * ⚠️ SUPERSEDED (F3-v2, 2026-10-11): pertenecía a la persiana de rutas de 6
 * lamas, descartada por el catálogo (docs/research-v4, §4). Se conserva como
 * referencia histórica; la persiana vigente (shutter.ts) usa power2.inOut por
 * lama + overshoot manual del último grupo (OVERSHOOT, que sí sigue vivo).
 */
export const EASE_SHUTTER = "back.out(1.4)";

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
  /** Between shutter belts. ⚠️ SUPERSEDED (F3-v2): el stagger de lamas vive en SHUTTER.stagger. */
  belt: 0.055,
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
 * Shutter (route transition) constants. Trionn runs 10 horizontal belts with a
 * ~820ms cover / ~475ms hold / ~700ms reveal cycle (overshoot 1.10). Ours is leaner
 * and vertical so the belts read as segments of "La Linea Maestra": fewer belts,
 * shorter phases, lighter overshoot (see docs/motion-plan.md, section 4).
 *
 * ⚠️ SUPERSEDED (F3-v2, 2026-10-11): la persiana de rutas de 6 lamas
 * (BELTS/BELTS_MOBILE + fases COVER/HOLD/REVEAL) queda descartada por el
 * catálogo (docs/research-v4, §4: densidad insuficiente y wipe repetida =
 * ruina de ritmo). Se conservan como referencia histórica; la persiana VIGENTE
 * es la line-native de BLADES lamas (constantes SHUTTER, abajo) y OVERSHOOT
 * sigue en uso para su último grupo de lamas.
 */

/** Vertical belts on desktop. ⚠️ SUPERSEDED (F3-v2) -> BLADES. */
export const BELTS = 6;

/** Vertical belts on mobile. ⚠️ SUPERSEDED (F3-v2): sin persiana en móvil. */
export const BELTS_MOBILE = 4;

/** COVER phase (s): belts scale 0 -> 1 with overshoot, cascaded. ⚠️ SUPERSEDED (F3-v2). */
export const COVER = 0.75;

/** HOLD phase (s): screen stays covered while the content swaps underneath. ⚠️ SUPERSEDED (F3-v2). */
export const HOLD = 0.35;

/** REVEAL phase (s): belts scale 1 -> 0 in inverse direction, no undershoot. ⚠️ SUPERSEDED (F3-v2). */
export const REVEAL = 0.6;

/** scaleY overshoot during COVER (1.06 vs the measured 1.10 on Trionn). */
export const OVERSHOOT = 1.06;

/*
 * Line system (F3-v2, line-system.ts) — "La Linea Maestra" (direccion C).
 * Params from the research catalog (docs/research-v4, techniques 1, 2 and 10):
 * comet draw with chasing tail, node pops with ring, stats count-up. The comet
 * ends with a tail "settle" so every segment stays complete (see line-system.ts
 * header for why the brief's literal end state would leave a 12% gap).
 */
export const LINE = {
  /** Comet head start (% of the segment): visible segment width at rest. */
  headStart: 8,
  /** Tail chase (% of the segment): where the tail lands when the head arrives. */
  tailChase: 12,
  /** Fraction of each segment's timeline slice spent drawing (rest = tail settle). */
  cometPhase: 0.8,
  /** Scrub smoothing (s) shared by every line ScrollTrigger. */
  scrub: 0.5,
  /** Node pop duration (s), ease nodePopEase. */
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

/*
 * Persiana line-native (F3-v2, shutter.ts) — la transición estrella
 * Thesis→ServicesIndex, USO ÚNICO en toda la página (catálogo §4: la wipe
 * repetida entre bloques arruina el ritmo; aquí es EL momento donde la línea
 * muta de forma). Parámetros del catálogo (técnica 5): 12 lamas, stagger 0.02,
 * scrub 2.0-2.5, máscara SVG userSpaceOnUse con rects centro-fuera.
 */
export const BLADES = 12;

export const SHUTTER = {
  /** Query lg (Tailwind): la persiana solo existe en desktop. */
  lgQuery: "(min-width: 1024px)",
  /** Distancia pineada: 1.5 viewports de scroll para el reveal. */
  pinDistance: "+=150%",
  /** Scrub (s): suavizado del playhead (rango del catálogo 2.0-2.5). */
  scrub: 2.2,
  /** Stagger entre lamas (s), de izquierda a derecha (frente de onda). */
  stagger: 0.02,
  /** Duración de apertura de cada lama (unidades de timeline, scrubbed). */
  bladeDur: 0.5,
  /** Solape anti-gap entre las mitades de una lama (fracción de media lama). */
  overlap: 0.05,
  /** Grosor del frente de onda ámbar (px). */
  waveWidth: 2,
  /** Fade final del frente de onda (unidades de timeline). */
  waveFade: 0.15,
  /** Duración del overshoot de subida y del settle del último grupo (s de timeline). */
  overshootDur: 0.15,
} as const;

/*
 * Scroll horizontal reversible de ServicesIndex (F4-t2, hscroll.ts) — 6
 * paneles iguales, pin + scrub 100% reversible. Solo lg + no-preference: el
 * layout horizontal lo aplica el JS (regla de oro sin-JS).
 */
export const HSCROLL = {
  /** Query lg (Tailwind): el horizontal solo existe en desktop. */
  lgQuery: "(min-width: 1024px)",
  /** Ancho de cada panel (iguales): fila editorial con la siguiente asomando. */
  panelWidth: "min(72vw, 900px)",
  /** Separación entre paneles del track. */
  gap: "4rem",
  /** Scrub (s) del pin horizontal (rebobinado con lag táctil). */
  scrub: 0.8,
  /** Recorrido mínimo (px) para montar el horizontal (si el track cabe, vertical). */
  minDistance: 10,
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
 * de circuito con viajero MotionPath, pop del nodo de cierre (params de LINE)
 * y flash ÚNICO del CTA (sin pulso repetitivo, sin glow: el F1 ya retiró el
 * pulso del booking). El claim usa el blur-reveal de chars de trionn
 * (técnica 6: blur 12px -> 0, stagger 0.08 from:"random", power2.out — SOLO
 * headings).
 */
export const CIRCUIT = {
  /** Query lg (Tailwind): pin + driver único solo en desktop. */
  lgQuery: "(min-width: 1024px)",
  /** Distancia pineada del pico (relativa: el refresh la re-mide). */
  pinDistance: "+=170%",
  /** Scrub (s) del driver único (rango del brief 0.8-1.2). */
  scrub: 1,
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
