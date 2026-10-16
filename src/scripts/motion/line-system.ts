/**
 * Sistema de Línea Maestra (F3-v2) — dirección C "La Línea Maestra".
 *
 * Tres consumidores, un módulo (arquitectura del patrón text-reveal.ts: init
 * orquestado en la rama no-preference del matchMedia de index.ts, destroy
 * llamado desde resetMotion() ANTES de media.revert() y en el cleanup del
 * contexto para el toggle en vivo a reduce):
 *
 *  1. Cometa por secciones: cada `[data-line-segment]` FUERA del rail se dibuja
 *     con DrawSVG como cometa (cabeza "0% 8%" → "12% 100%": la cabeza recorre
 *     el 92% del segmento mientras la cola persigue el 12%, a la misma
 *     duración → cabeza ~7.7x más rápida) ligado a un ScrollTrigger de su
 *     sección con scrub LINE.scrub. Las tandas 2-3 añadirán segmentos aquí.
 *  2. ProcessRail (driver único, técnica 7 del catálogo): UN ScrollTrigger
 *     SIN pin + UNA timeline scrubbed de coreografía FIJA (R6): los 3
 *     segmentos crecen drawSVG continuo, los 4 nodos estallan con un pop seco
 *     y las 4 tarjetas entran en secuencia — la línea es la que manda. FUERA
 *     el cometa/cola perseguidora (R6: leía "línea fea") y las medidas por
 *     fracción de pantalla. R6: el driver va ENCADENADO al pin de Servicios
 *     (id "rail-grid", RAIL.priority 15): start = hscroll.end leído FRESCO —
 *     el rail arranca justo cuando el slide de salida termina y Proceso queda
 *     revelado (el PANEL está pinneado por GSAP: hscroll.ts crea el pin
 *     "proceso" sobre [data-proceso-pin], mismo priority 15 — se sostiene en
 *     viewport top durante slide+rail y libera en flujo exactamente cuando
 *     este driver acaba). En móvil (<lg, Tailwind lg) NO hay línea:
 *     entrada simple de tarjetas (decisión: el rail vertical exigiría
 *     reestructurar el grid F1 — intocable salvo SVG necesario — y la entrada
 *     ya da vida a la sección; el diseño F1 deliberately no tiene línea en
 *     móvil).
 *  3. Proof: count-up de las cifras (1.240 / 38 / 6) + subrayado ámbar de 2px
 *     dibujado justo tras arrancar el count (técnica 10 del catálogo) y
 *     entrada escalonada RE-DISPARRABLE del grid de razones (rediseño legacy:
 *     misma gramática de tarjeta que el rail móvil + política R1 de
 *     text-reveal.ts).
 *
 * ESTADO FINAL SIN JS (regla de oro): el markup parte del estado FINAL (línea
 * completa, nodos visibles, cifras finales, reglas dibujadas) y es el JS quien
 * lo "prepara" para animar con gsap.set. Si la sección ya pasó al inicializar
 * (VT a ancla, resize por debajo), no se prepara nada: queda el estado final
 * del markup sin re-animar (mismo principio que el flag `revealed` de
 * text-reveal.ts).
 *
 * POPS: tween independiente del scrub con guard por Set — hacer scroll hacia
 * atrás no los rebota (spec F3-v2). El anillo se crea por JS (artefacto de
 * animación): sin JS el markup no cambia respecto al diseño F1.
 *
 * COMETA + SETTLE: el estado final literal del brief ("12% 100%") dejaría un
 * hueco del 12% en el ARRANQUE de cada segmento (la cola persigue hacia
 * delante). Se añade una fase de settle (la cola vuelve a "0% 100%") para que
 * la línea quede completa: cometPhase del slice de cada segmento dibuja, el
 * resto sella. Con scrub la lectura es: el cometa dibuja y la cola sella.
 *
 * Medición de nodos: la fracción de cada `[data-node]` a lo largo de su
 * segmento se mide en ESPACIO DE PANTALLA (getScreenCTM), así que sirve igual
 * para `<line>` con coordenadas en % (proyección sobre la recta) que para
 * `<path>` futuro (muestreo getPointAtLength + punto más cercano).
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DUR, LINE, RAIL, RESIZE_DEBOUNCE } from "./tokens";
import { buildNodeRing, isPast } from "./utils";

type SegmentEl = SVGLineElement | SVGPathElement;

interface NodeRecord {
  el: SVGCircleElement;
  svg: SVGSVGElement;
  segment: SegmentEl;
  /** Fracción 0..1 del nodo a lo largo de su segmento (medida en pantalla). */
  fraction: number;
  /** Anillo efímero creado por JS en el pop (null si ya se retiró). */
  ring: SVGCircleElement | null;
}

interface SegmentRecord {
  el: SegmentEl;
  svg: SVGSVGElement;
  /** Tween de dibujo (cometa): su progreso gobierna los pops del segmento. */
  tween: gsap.core.Tween | null;
  nodes: NodeRecord[];
}

interface RailState {
  timeline: gsap.core.Timeline | null;
  cards: HTMLElement[];
  segments: SegmentRecord[];
  nodes: NodeRecord[];
  mobileTween: gsap.core.Tween | null;
  mobileTrigger: ScrollTrigger | null;
}

interface StatRecord {
  el: HTMLElement;
  /** Texto server-renderizado (valor final, fuente de verdad del formato). */
  original: string;
  final: number;
  fmt: (v: number) => string;
  line: SVGLineElement | null;
}

interface ProofState {
  trigger: ScrollTrigger | null;
  stats: StatRecord[];
  tweens: gsap.core.Tween[];
  /** Tarjetas del grid de razones (entrada escalonada re-disparable). */
  cards: HTMLElement[];
  cardsTween: gsap.core.Tween | null;
  cardsTrigger: ScrollTrigger | null;
}

/** Tolerancia (px) para considerar un nodo "apoyado" sobre un segmento. */
const ON_LINE_TOLERANCE = 24;

/** Muestras de getPointAtLength para medir la fracción de un nodo en un path. */
const PATH_SAMPLES = 48;

/** Margen para comparar fracciones con la cabeza (ruido de redondeo). */
const FRACTION_EPS = 0.005;

/** Subida de las tarjetas en su entrada (px). */
const CARD_Y = 24;

/** Start del driver del rail y de la entrada móvil: "top 85%". */
const RAIL_START = 0.85;

/** Start del trigger de Proof: "top 80%". */
const PROOF_START = 0.8;

/** Start del trigger del grid de razones: "top 85%" (igual que los reveals de texto). */
const PROOF_GRID_START = 0.85;

const rail: RailState = {
  timeline: null,
  cards: [],
  segments: [],
  nodes: [],
  mobileTween: null,
  mobileTrigger: null,
};

const proof: ProofState = {
  trigger: null,
  stats: [],
  tweens: [],
  cards: [],
  cardsTween: null,
  cardsTrigger: null,
};

/** Segmentos independientes (fuera del rail), con su timeline propia. */
const standalone: Array<{ timeline: gsap.core.Timeline; record: SegmentRecord }> = [];

/** Nodos que ya estallaron: el pop es UNA sola vez por nodo y por ciclo. */
const firedNodes = new Set<Element>();

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let lastWidth = 0;

function isDesktop(): boolean {
  // Tailwind lg: el rail SVG es `hidden lg:block`.
  return window.matchMedia("(min-width: 1024px)").matches;
}

/** Punto de unidades de usuario del SVG a coordenadas de pantalla. */
function toScreen(svg: SVGSVGElement, x: number, y: number): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  const p = new DOMPoint(x, y).matrixTransform(ctm ?? new DOMMatrix());
  return { x: p.x, y: p.y };
}

/**
 * Proyecta el centro de un nodo sobre un segmento. Devuelve null si el SVG
 * está oculto (p. ej. el rail en móvil) o no se puede medir.
 */
function projectNode(
  svg: SVGSVGElement,
  seg: SegmentEl,
  node: SVGCircleElement,
): { fraction: number; distance: number } | null {
  const svgRect = svg.getBoundingClientRect();
  if (svgRect.width === 0 && svgRect.height === 0) return null;
  const nodeRect = node.getBoundingClientRect();
  const nx = nodeRect.left + nodeRect.width / 2;
  const ny = nodeRect.top + nodeRect.height / 2;

  if (seg instanceof SVGLineElement) {
    const ctm = svg.getScreenCTM();
    if (ctm === null) return null;
    // Los % de x1/x2 se resuelven contra el viewport del SVG (baseVal.value).
    const p1 = toScreen(svg, seg.x1.baseVal.value, seg.y1.baseVal.value);
    const p2 = toScreen(svg, seg.x2.baseVal.value, seg.y2.baseVal.value);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) {
      return { fraction: 0, distance: Math.hypot(nx - p1.x, ny - p1.y) };
    }
    const t = ((nx - p1.x) * dx + (ny - p1.y) * dy) / len2;
    const cx = p1.x + t * dx;
    const cy = p1.y + t * dy;
    return {
      fraction: Math.min(Math.max(t, 0), 1),
      distance: Math.hypot(nx - cx, ny - cy),
    };
  }

  // <path>: muestreo uniforme y punto más cercano al centro del nodo.
  const ctm = svg.getScreenCTM();
  if (ctm === null) return null;
  const total = seg.getTotalLength();
  if (total === 0) return null;
  let bestFraction = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= PATH_SAMPLES; i++) {
    const len = (i / PATH_SAMPLES) * total;
    const pt = seg.getPointAtLength(len);
    const sp = toScreen(svg, pt.x, pt.y);
    const d = Math.hypot(sp.x - nx, sp.y - ny);
    if (d < bestDistance) {
      bestDistance = d;
      bestFraction = len / total;
    }
  }
  return { fraction: bestFraction, distance: bestDistance };
}

/**
 * Asigna cada nodo al segmento donde su fracción proyectada es MAYOR (lado de
 * llegada): en una unión, el nodo pertenece al segmento que TERMINA en él
 * (fracción ~1) y no al que arranca (~0), así el pop dispara cuando la cabeza
 * del cometa LLEGA al nodo y no en el arranque del siguiente segmento.
 * Devuelve los registros creados (los nodos sin segmento no estallan).
 */
function assignNodes(
  svg: SVGSVGElement,
  records: SegmentRecord[],
  nodeEls: SVGCircleElement[],
): NodeRecord[] {
  const created: NodeRecord[] = [];
  nodeEls.forEach((nodeEl) => {
    let best: { record: SegmentRecord; fraction: number } | null = null;
    for (const record of records) {
      const proj = projectNode(svg, record.el, nodeEl);
      if (proj === null) continue;
      if (proj.fraction < -FRACTION_EPS || proj.fraction > 1 + FRACTION_EPS) continue;
      if (proj.distance > ON_LINE_TOLERANCE) continue;
      if (best === null || proj.fraction > best.fraction) {
        best = { record, fraction: Math.min(Math.max(proj.fraction, 0), 1) };
      }
    }
    if (best === null) return;
    const rec: NodeRecord = {
      el: nodeEl,
      svg,
      segment: best.record.el,
      fraction: best.fraction,
      ring: null,
    };
    best.record.nodes.push(rec);
    created.push(rec);
  });
  return created;
}

/** Posición de la cabeza del cometa (0..1 del segmento) para el progreso dado. */
function headFraction(tween: gsap.core.Tween): number {
  const start = LINE.headStart / 100;
  return start + (1 - start) * tween.progress();
}

/**
 * Estalla todos los nodos del segmento cuya fracción ya cruzó la cabeza.
 * El render de immediateRender (totalTime 0, sección aún sin scroll) NO
 * estalla nodos: el primer pop espera al primer movimiento real del cometa.
 */
function checkSegmentPops(record: SegmentRecord): void {
  const tween = record.tween;
  if (tween === null || record.nodes.length === 0) return;
  if (tween.totalTime() === 0) return;
  const head = headFraction(tween);
  for (const node of record.nodes) {
    if (firedNodes.has(node.el)) continue;
    if (node.fraction <= head + FRACTION_EPS) popNode(node);
  }
}

/**
 * Pop de un nodo: tween independiente del scrub (una sola vez, guard por Set)
 * + anillo efímero creado por JS que se dibuja y se desvanece.
 */
function popNode(node: NodeRecord): void {
  firedNodes.add(node.el);
  gsap.fromTo(node.el, { scale: 0 }, {
    scale: 1,
    duration: LINE.nodePopDur,
    ease: LINE.nodePopEase,
    transformOrigin: "50% 50%",
  });
  // Anillo: artefacto de animación creado por JS (sin JS el markup queda como
  // el diseño F1); el stroke va por style porque var() no funciona en
  // atributos (utils.ts).
  const ring = buildNodeRing(
    {
      cx: node.el.getAttribute("cx") ?? "50%",
      cy: node.el.getAttribute("cy") ?? "50%",
      r: node.el.r.baseVal.value,
    },
    document,
  );
  node.svg.appendChild(ring);
  node.ring = ring;
  gsap.fromTo(ring, { drawSVG: "0% 0%", opacity: 0.9 }, {
    drawSVG: "0% 100%",
    opacity: 0,
    duration: LINE.nodeRingDur,
    ease: "power2.out",
    onComplete: () => {
      ring.remove();
      if (node.ring === ring) node.ring = null;
    },
  });
}

/**
 * Añade a `tl` el cometa de un segmento en la posición `at` (unidades de
 * timeline): fase de dibujo (cabeza headStart% → 100%, cola 0% → tailChase%)
 * + settle de la cola (tailChase% → 0) para que el segmento quede completo.
 * immediateRender: false en el settle (segundo fromTo sobre la misma
 * propiedad: sin él pisaría el estado de arranque del cometa). Devuelve el
 * tween de dibujo. `withPopChecks`: los segmentos FUERA del rail (standalone)
 * estallan sus nodos por onUpdate discreto (mecánica legacy); el RAIL desde
 * R6 usa coreografía fija sin cometa (ver initRailDesktop).
 */
function addCometToTimeline(
  tl: gsap.core.Timeline,
  record: SegmentRecord,
  at: number,
  withPopChecks = true,
): gsap.core.Tween {
  // Tween creado fuera y añadido con tl.add(): Timeline.fromTo() devuelve la
  // propia timeline (encadenado fluido) y no exponeria el tween del cometa,
  // que es el que gobierna los pops.
  const comet = gsap.fromTo(
    record.el,
    { drawSVG: `0% ${LINE.headStart}%` },
    {
      drawSVG: `${LINE.tailChase}% 100%`,
      ease: "none",
      duration: LINE.cometPhase,
      onUpdate: withPopChecks
        ? () => {
            checkSegmentPops(record);
          }
        : undefined,
    },
  );
  tl.add(comet, at);
  // immediateRender: false en el settle (segundo fromTo sobre la misma
  // propiedad: sin el pisaria el estado de arranque del cometa).
  const settle = gsap.fromTo(
    record.el,
    { drawSVG: `${LINE.tailChase}% 100%` },
    { drawSVG: "0% 100%", ease: "none", duration: 1 - LINE.cometPhase, immediateRender: false },
  );
  tl.add(settle, at + LINE.cometPhase);
  return comet;
}

/** Prepara nodos para el pop (ocultación inicial SOLO por gsap.set). */
function prepareNodes(nodeEls: SVGCircleElement[]): void {
  gsap.set(nodeEls, { scale: 0, transformOrigin: "50% 50%" });
}

/**
 * Driver del rail en lg+ (R6, retiming R6-b): UN trigger SIN pin + UNA
 * timeline scrubbed de coreografía FIJA en unidades normalizadas (nada de
 * medidas por fracción de pantalla). R6-b: TODO asentado antes del 0.85 (la
 * QA medía card4 a opacity 0.90 en el fin del rango):
 *   - segmento k: drawSVG 0→100% (ease none) en [0,0.13] / [0.24,0.37] /
 *     [0.48,0.61] — la línea crece continua por tramos;
 *   - nodo k: pop seco back.out(1.7) dur 0.05 en 0.13 / 0.37 / 0.61 / 0.64;
 *   - tarjeta k: y:24→0 + autoAlpha 0→1 (0.09, power1.out) en
 *     0.16 / 0.40 / 0.64 / 0.67 — card4 asienta en 0.76, resto hold.
 * R6-c: la duración total de la tl es EXACTAMENTE 1.0 (hold 0.76→1.0 fijado
 * con un tween vacío al montar). El scrub mapea el progreso del trigger
 * [0..1] a la duración REAL de la timeline: sin ese cierre tl.duration()
 * era 0.76 — las fracciones del guion no eran fracciones del rango, el
 * asentamiento chocaba contra el fin del pin y el rabo del rango se leía
 * muerto (QA2: estados idénticos a mitad del rango).
 * FUERA el cometa/tailChase (R6: la lectura pedida es "la línea crece
 * continua y las tarjetas salen en secuencia") y los anillos del pop (con un
 * pop de 0.05 unidades un anillo no se lee: el pop seco basta).
 *
 * SIN pin PROPIO: el PANEL de Proceso está pinneado por GSAP (pin "proceso",
 * hscroll.ts — cubre slide+rail con start "top top" natural); este driver
 * solo dibuja. ENCADENADO al pin de Servicios: start = hscroll.end leído
 * FRESCO en cada refresh (el slide de salida acaba EXACTAMENTE cuando el
 * rail arranca) y end = start + RAIL.railLenVh. refreshPriority 15
 * (RAIL.priority): hscroll (19) refresca antes y circuit (10) después — cada
 * ancla lee posiciones frescas (GSAP 3.15.0: priority MAYOR refresca
 * PRIMERO).
 *
 * Sin guard isPast: el start ya no depende de la posición del grid (encadena
 * al pin de Servicios) y el propio ScrollTrigger coloca el playhead —
 * progreso 0 esperando abajo del todo, 1 si el aterrizaje ya pasó el rango.
 */
function initRailDesktop(railSvg: SVGSVGElement, grid: HTMLElement, cards: HTMLElement[]): void {
  const segEls = Array.from(railSvg.querySelectorAll<SegmentEl>("[data-line-segment]"));
  const nodeEls = Array.from(railSvg.querySelectorAll<SVGCircleElement>("[data-node]"));
  if (segEls.length === 0) return;

  const firstSeg = segEls[0];
  if (firstSeg === undefined) return; // inalcanzable (length > 0 arriba): guarda de tipos

  const records: SegmentRecord[] = segEls.map((el) => ({ el, svg: railSvg, tween: null, nodes: [] }));
  // Nodos SIN medición (la coreografía es fija, no derivada de fracciones):
  // registros mínimos para que el destroy los devuelva al estado del markup.
  const nodeRecords: NodeRecord[] = nodeEls.map((el) => ({
    el,
    svg: railSvg,
    segment: firstSeg,
    fraction: 0,
    ring: null,
  }));
  rail.segments = records;
  rail.nodes = nodeRecords;
  rail.cards = cards;

  // Preparación SOLO por JS (regla de oro): el markup parte de estado final.
  // Segmentos incluidos: los fromTo de la timeline llevan immediateRender
  // false (no hornean el from hasta que el playhead llega), así que SIN este
  // set los segmentos 2-3 se verían completos (estado markup) en reposo.
  prepareNodes(nodeEls);
  gsap.set(segEls, { drawSVG: "0% 0%" });
  if (cards.length > 0) gsap.set(cards, { y: CARD_Y, autoAlpha: 0 });

  // Trigger: el wrapper del capítulo (markup de index.astro/en). El PANEL
  // interior está pinneado por hscroll.ts (pin "proceso") durante TODO este
  // rango: el dibujo ocurre con el capítulo quieto en viewport.
  const under = grid.closest<HTMLElement>("[data-proceso-under]") ?? grid;
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: under,
      id: "rail-grid",
      refreshPriority: RAIL.priority,
      start: () => {
        const hs = ScrollTrigger.getById("hscroll");
        // Sin hscroll (ancho <lg en la rama no-preference): arranque natural.
        return hs !== undefined ? Math.round(hs.end) : "top 80%";
      },
      end: () => "+=" + Math.round(RAIL.railLenVh * window.innerHeight),
      scrub: RAIL.scrub,
      invalidateOnRefresh: true,
    },
  });
  rail.timeline = tl;

  // Coreografía FIJA (retiming R6-b — ver doc de la función): segmentos,
  // nodos y tarjetas asientan antes del 0.85; el resto del rango es hold.
  // Segmentos: la línea crece continua, un tramo fijo por segmento.
  const SEG_AT = [0, 0.24, 0.48];
  const SEG_DUR = 0.13;
  records.forEach((record, k) => {
    tl.fromTo(
      record.el,
      { drawSVG: "0% 0%" },
      {
        drawSVG: "0% 100%",
        duration: SEG_DUR,
        ease: "none",
        immediateRender: false,
      },
      SEG_AT[k] ?? k * SEG_DUR,
    );
  });

  // Nodos: pop seco back.out(1.7) (0.05) cuando la línea llega a cada uno.
  const NODE_AT = [0.13, 0.37, 0.61, 0.64];
  const NODE_DUR = 0.05;
  nodeRecords.forEach((rec, k) => {
    tl.fromTo(
      rec.el,
      { scale: 0 },
      {
        scale: 1,
        duration: NODE_DUR,
        ease: "back.out(1.7)",
        immediateRender: false,
        transformOrigin: "50% 50%",
      },
      NODE_AT[k] ?? NODE_AT[NODE_AT.length - 1],
    );
  });

  // Tarjetas: cada una entra justo detrás de su nodo (0.09; card4 asienta en
  // 0.76 — margen de 0.24 hasta el fin del rango para que el estado final sea
  // EXACTO incluso con el catch-up del scrub).
  const CARD_AT = [0.16, 0.4, 0.64, 0.67];
  const CARD_DUR = 0.09;
  cards.forEach((card, k) => {
    tl.fromTo(
      card,
      { y: CARD_Y, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: CARD_DUR,
        ease: "power1.out",
        immediateRender: false,
      },
      CARD_AT[k] ?? CARD_AT[CARD_AT.length - 1],
    );
  });

  // HOLD final (R6-c): la duración total de la tl debe ser EXACTAMENTE 1.0
  // para que las fracciones de arriba sean fracciones del rango del trigger
  // (ver docstring). Tween vacío que solo fija el fin en 1.0: el hold
  // 0.76→1.0 queda como tramo real de scroll (dwell de lectura).
  if (Math.abs(tl.duration() - 1) > 1e-6) {
    tl.set({}, {}, 1);
  }
}

/** Móvil (<lg): entrada simple de tarjetas, sin línea (ver cabecera). */
function initRailMobile(grid: HTMLElement, cards: HTMLElement[]): void {
  if (cards.length === 0) return;
  if (isPast(grid, RAIL_START)) return; // markup final sin preparar
  rail.cards = cards;
  gsap.set(cards, { y: CARD_Y, autoAlpha: 0 });
  const tween = gsap.to(cards, {
    y: 0,
    autoAlpha: 1,
    duration: DUR.base,
    ease: "ll-reveal",
    stagger: 0.08,
    paused: true,
  });
  rail.mobileTween = tween;
  rail.mobileTrigger = ScrollTrigger.create({
    trigger: grid,
    start: "top 85%",
    once: true,
    onEnter: () => {
      tween.play();
    },
  });
}

/** Re-monta la parte dependiente del ancho (driver lg+ vs entrada móvil). */
function applyRailMode(): void {
  destroyRail();
  const railSvg = document.querySelector<SVGSVGElement>("[data-line-rail]");
  const grid = document.querySelector<HTMLElement>("[data-rail-grid]");
  if (railSvg === null || grid === null) return;
  const cards = Array.from(grid.querySelectorAll<HTMLElement>("article"));
  if (isDesktop()) {
    initRailDesktop(railSvg, grid, cards);
  } else {
    initRailMobile(grid, cards);
  }
}

/** Formateador con el MISMO separador que renderizó el servidor (ES punto de
 * miles, EN coma): se detecta del texto server-renderizado, no del idioma. */
function makeFormatter(sample: string): (v: number) => string {
  if (sample.includes(".")) {
    const nf = new Intl.NumberFormat("de-DE");
    return (v: number): string => nf.format(Math.round(v));
  }
  if (sample.includes(",")) {
    const nf = new Intl.NumberFormat("en-US");
    return (v: number): string => nf.format(Math.round(v));
  }
  return (v: number): string => String(Math.round(v));
}

/** Count-up + subrayados de Proof (disparo compartido del onEnter). */
function playProof(): void {
  proof.stats.forEach((stat) => {
    const obj = { v: 0 };
    proof.tweens.push(
      gsap.to(obj, {
        v: stat.final,
        duration: LINE.countDur,
        ease: "power2.out",
        onUpdate: () => {
          stat.el.textContent = stat.fmt(obj.v);
        },
      }),
    );
    if (stat.line !== null) {
      proof.tweens.push(
        gsap.fromTo(stat.line, { drawSVG: "0% 0%" }, {
          drawSVG: "0% 100%",
          duration: LINE.underlineDur,
          ease: "power3.inOut",
          delay: 0.1, // el subrayado arranca justo tras el count
        }),
      );
    }
  });
}

/**
 * Proof: count-up de las cifras + subrayado ámbar dibujado (técnica 10) y
 * entrada escalonada del grid de razones (rediseño legacy). Las tarjetas usan
 * la MISMA gramática de entrada del sistema (initRailMobile: y CARD_Y ->
 * 0, autoAlpha, ease "ll-reveal", stagger) con la política R1 de text-reveal.ts
 * (toggleActions "restart none restart reverse": re-disparable al bajar y
 * reversible al subir). Ocultación inicial SOLO por gsap.set y SOLO en esta
 * rama no-preference: sin JS o con reduced-motion el markup queda visible
 * (regla de oro).
 */
function initProof(): void {
  const ul = document.querySelector<HTMLElement>("[data-stats]");
  if (ul === null) return;

  const stats: StatRecord[] = [];
  Array.from(ul.querySelectorAll<HTMLElement>("li")).forEach((li) => {
    const valueEl = li.querySelector<HTMLElement>("[data-stat-value]");
    if (valueEl === null) return;
    const original = (valueEl.textContent ?? "").trim();
    // Objetivo del count: el atributo data-stat-value, poblado por el servidor
    // con el valor final (Proof.astro). El FORMATO lo dicta el texto
    // server-renderizado (original), no el idioma.
    const attrRaw = (valueEl.getAttribute("data-stat-value") ?? "").trim();
    const final = Number(attrRaw.replace(/[^\d]/g, ""));
    // Fail-safe NO silencioso: si no hay objetivo válido (atributo vacío o no
    // numérico — no debería pasar con el markup actual), la cifra se queda
    // EXACTAMENTE como la renderizó el servidor: sin count y sin preparar el
    // texto a "0". Un valor sin objetivo jamás se toca: el texto nunca puede
    // quedar en "0" sin un tween que lo devuelva al valor final.
    if (attrRaw === "" || !Number.isFinite(final) || final <= 0) return;
    stats.push({
      el: valueEl,
      original,
      final,
      fmt: makeFormatter(original),
      line: li.querySelector<SVGLineElement>("[data-underline] line"),
    });
  });
  if (stats.length === 0) return;
  proof.stats = stats;

  // ¿Ya pasó? El markup ya muestra valores finales y regla dibujada: no tocar.
  if (isPast(ul, PROOF_START)) return;

  // Preparación SOLO por JS: cifras a 0 (mismo formato) y reglas sin dibujar.
  stats.forEach((stat) => {
    stat.el.textContent = stat.fmt(0);
    if (stat.line !== null) gsap.set(stat.line, { drawSVG: "0% 0%" });
  });

  proof.trigger = ScrollTrigger.create({
    trigger: ul,
    start: "top 80%",
    once: true,
    onEnter: () => {
      playProof();
    },
  });

  // Grid de razones (rediseño legacy): entrada escalonada re-disparable.
  // ¿Ya pasó? Estado final del markup sin preparar (mismo guard que las cifras).
  const grid = document.querySelector<HTMLElement>("[data-reasons-grid]");
  if (grid === null) return;
  const cards = Array.from(grid.querySelectorAll<HTMLElement>("article"));
  if (cards.length === 0 || isPast(grid, PROOF_GRID_START)) return;
  proof.cards = cards;
  gsap.set(cards, { y: CARD_Y, autoAlpha: 0 });
  proof.cardsTween = gsap.to(cards, {
    y: 0,
    autoAlpha: 1,
    duration: DUR.base,
    ease: "ll-reveal",
    stagger: 0.08,
    paused: true,
  });
  proof.cardsTrigger = ScrollTrigger.create({
    trigger: grid,
    start: "top 85%",
    animation: proof.cardsTween,
    toggleActions: "restart none restart reverse",
  });
}

/** Cometas por secciones: segmentos `[data-line-segment]` fuera del rail. */
function initStandaloneSegments(): void {
  const segEls = Array.from(document.querySelectorAll<SegmentEl>("[data-line-segment]")).filter(
    (el) => el.closest("[data-line-rail]") === null,
  );
  segEls.forEach((el) => {
    const svg = el.closest<SVGSVGElement>("svg");
    if (svg === null) return;
    const section = el.closest("section") ?? svg;
    // ¿Ya pasó la sección? Markup final (línea completa, nodos visibles): no
    // se prepara nada.
    if (isPast(section, PROOF_START)) return;

    const record: SegmentRecord = { el, svg, tween: null, nodes: [] };
    const nodeEls = Array.from(svg.querySelectorAll<SVGCircleElement>("[data-node]"));
    assignNodes(svg, [record], nodeEls);
    prepareNodes(nodeEls);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 80%",
        end: "bottom 55%",
        scrub: LINE.scrub,
      },
    });
    record.tween = addCometToTimeline(tl, record, 0);
    standalone.push({ timeline: tl, record });
  });
}

/** Re-mide las fracciones de los nodos de los segmentos independientes. */
function remeasureStandalone(): void {
  standalone.forEach(({ record }) => {
    record.nodes.forEach((node) => {
      const proj = projectNode(node.svg, node.segment, node.el);
      if (proj !== null) node.fraction = Math.min(Math.max(proj.fraction, 0), 1);
    });
  });
}

function onResize(): void {
  if (resizeTimer !== null) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeTimer = null;
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    applyRailMode();
    remeasureStandalone();
  }, RESIZE_DEBOUNCE);
}

/** Limpieza del rail (driver lg+, entrada móvil, nodos y segmentos). */
function destroyRail(): void {
  if (rail.timeline !== null) {
    rail.timeline.scrollTrigger?.kill();
    rail.timeline.kill();
    rail.timeline = null;
  }
  if (rail.mobileTrigger !== null) {
    rail.mobileTrigger.kill();
    rail.mobileTrigger = null;
  }
  if (rail.mobileTween !== null) {
    rail.mobileTween.kill();
    rail.mobileTween = null;
  }
  rail.nodes.forEach(disposeNode);
  rail.segments.forEach((record) => {
    record.el.style.strokeDasharray = "";
    record.el.style.strokeDashoffset = "";
  });
  // Restaura las tarjetas al estado del markup (quita y/autoAlpha inline).
  if (rail.cards.length > 0) {
    gsap.set(rail.cards, { clearProps: "transform,opacity,visibility" });
  }
  rail.cards = [];
  rail.segments = [];
  rail.nodes = [];
}

/** Devuelve un nodo al estado del markup: sin tween, sin transform, sin anillo. */
function disposeNode(node: NodeRecord): void {
  firedNodes.delete(node.el);
  gsap.killTweensOf(node.el);
  node.el.removeAttribute("transform");
  node.el.style.transform = "";
  if (node.ring !== null) {
    gsap.killTweensOf(node.ring);
    node.ring.remove();
    node.ring = null;
  }
}

/** Limpieza de Proof: trigger, tweens, texto original, estilos de la regla y
 * estado del grid de razones (tarjetas devueltas al estado del markup). */
function destroyProof(): void {
  if (proof.trigger !== null) {
    proof.trigger.kill();
    proof.trigger = null;
  }
  proof.tweens.forEach((tween) => tween.kill());
  proof.tweens = [];
  proof.stats.forEach((stat) => {
    stat.el.textContent = stat.original;
    if (stat.line !== null) {
      stat.line.style.strokeDasharray = "";
      stat.line.style.strokeDashoffset = "";
    }
  });
  proof.stats = [];
  if (proof.cardsTrigger !== null) {
    proof.cardsTrigger.kill();
    proof.cardsTrigger = null;
  }
  if (proof.cardsTween !== null) {
    proof.cardsTween.kill();
    proof.cardsTween = null;
  }
  if (proof.cards.length > 0) {
    gsap.set(proof.cards, { clearProps: "transform,opacity,visibility" });
    proof.cards = [];
  }
}

/**
 * Monta todo el sistema de línea. Idempotente: destruye lo anterior antes de
 * montar (la ruta nueva trae DOM nuevo). Se llama en la rama no-preference del
 * matchMedia de index.ts, después de initTextReveal().
 */
export function initLineSystem(): void {
  destroyLineSystem();
  lastWidth = window.innerWidth;
  applyRailMode();
  initStandaloneSegments();
  initProof();
  window.addEventListener("resize", onResize);
}

/**
 * Limpieza total: mata triggers/tweens, restaura los atributos y estilos SVG
 * al estado del markup (línea completa, nodos visibles, reglas dibujadas),
 * devuelve el texto original de las cifras, retira los anillos creados por JS
 * y limpia todas las referencias. resetMotion() lo llama ANTES de
 * media.revert() porque matchMedia.revert() no restaura mutaciones DOM
 * (textContent, anillos); el doble pase con el revert del contexto es inocuo.
 */
export function destroyLineSystem(): void {
  window.removeEventListener("resize", onResize);
  if (resizeTimer !== null) {
    clearTimeout(resizeTimer);
    resizeTimer = null;
  }
  destroyRail();
  standalone.forEach(({ timeline, record }) => {
    timeline.scrollTrigger?.kill();
    timeline.kill();
    record.nodes.forEach(disposeNode);
    record.el.style.strokeDasharray = "";
    record.el.style.strokeDashoffset = "";
  });
  standalone.length = 0;
  destroyProof();
  firedNodes.clear();
}
