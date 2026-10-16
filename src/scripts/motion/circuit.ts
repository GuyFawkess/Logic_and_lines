/**
 * Pico peak-end — BookingClose (F3-v2) — dirección C "La Línea Maestra".
 *
 * El momento firma del cierre (peak-end rule; catálogo técnicas 7, 14 y 6 de
 * docs/research-v4/2026-10-11-catalogo-motion-trionn.md): la línea que ha
 * recorrido la página llega a esta sección, un bucle continuo parte del nodo
 * de entrada (donde la Línea Maestra cruza el borde del bucle), rodea la fila
 * del CTA y vuelve a cerrarse sobre ese mismo nodo. Un viajero (dot ámbar de
 * 8px) recorre el path mientras se dibuja y, al tocar el nodo, este estalla
 * (pop + anillo, params de LINE) y el CTA recibe un flash ÚNICO (sin pulso
 * repetitivo, sin glow: el F1 ya retiró el pulso del booking).
 *
 * DRIVER ÚNICO (técnica 7, desktop lg+): UN ScrollTrigger (pin de la sección,
 * start "top top", end += pinTravelVh, scrub 1, anticipatePin 1) + UNA
 * timeline construida una vez que contiene el dibujo + viajero + pop + anillo
 * + flash + hold. Cero triggers en paralelo para el circuito: todo deriva del
 * mismo progreso scrubbed.
 *
 * R6 (2026-10-15): fuera el sistema de fronteras — el end ya NO se extiende
 * con el openLen de la ex-frontera b5 ni la timeline lleva segmento frontal:
 * el pin mide SOLO el viaje propio del circuito (CIRCUIT.pinTravelVh) y la
 * transición natural FAQ→Booking lo aterriza directamente en "top top".
 *
 * CLAIM (R3-7, supersede el toggleActions de R1): el blur-reveal pasa de
 * trigger de visibilidad a SCRUB ligado al scroll — trigger propio SIN pin
 * sobre [circuit.start + tramo del draw, +40vh] (dentro del rango pineado,
 * tras el flash; R6 eliminó el openLen que se sumaba aquí), scrub 0.6,
 * 100% reversible al subir (el re-difuminado progresa con el scroll, sin
 * replay). En móvil sin pin se conserva el toggleActions re-disparable
 * (mountClaimTrigger). will-change del claim vía onToggle de los triggers
 * (regla del plan).
 *
 * FIX F-3 → SUPERSEDED por R1 → SUPERSEDED por R3-7 (2026-10-12): el claim
 * fue re-disparable (R1, toggleActions "restart none restart reverse") y en R3
 * pasa a SCRUB (ver arriba). En móvil sin pin se conserva el R1.
 *
 * R1 (refactor de anclas): el pin mantiene start "top top" NATURAL (la
 * sección llega arriba → se engancha: transición FAQ→CTA continua por
 * construcción). SIN sectionDocTop ni overrides: cero compensaciones manuales.
 * R6: refreshPriority 10 (CIRCUIT.priority — en GSAP 3.15.0 priority MAYOR
 * refresca ANTES, sort * -1e6; orden de página: hscroll 19 > rail 15 >
 * circuit 10). El trigger se crea asíncrono tras el preloader.
 *
 * MÓVIL (<lg): sin pin (decisión: 170% de scroll extra no cabe en pantallas
 * cortas y el pico ya vive en el contenido). El claim y el circuito animan al
 * ENTRAR ("top 80%" / "top 85%"); el claim usa el mismo toggleActions
 * re-disparable que en desktop. El circuito móvil es una timeline time-based
 * (1.3s, power2.inOut) con el mismo viajero + pop + flash; sin hold (no hay
 * unpin que sostener).
 *
 * ESTADO FINAL SIN JS (regla de oro): el markup parte del estado FINAL (path
 * completo dibujado, nodo visible, claim sin split) y es el JS quien prepara
 * con gsap.set. El viajero y el anillo son artefactos de animación creados
 * por JS (sin JS no existen). Si el punto de disparo ya pasó al inicializar
 * (VT a ancla, resize), no se prepara nada: estado final del markup sin
 * re-animar (patrón isPast de line-system.ts). El PIN, en cambio, SIEMPRE se
 * crea en lg+ (estabilidad del layout: sin él, un resize con la sección
 * pasada acortaría la página y saltaría el scroll).
 *
 * SCRUB Y REVERSIBILIDAD: el circuito entero es scrubbed (reversible al
 * scroll hacia atrás: el cierre se "des-cierra"). Para que el scrub inverso
 * no deje residuos, pop/anillo/flash usan from/to con starts grabados en el
 * primer render: al retroceder antes de su inicio vuelven al estado oculto/
 * base (nodo scale 0, anillo autoAlpha 0, CTA en su color de markup).
 *
 * MOTIONPATH + PIN: el viajero (div HTML) y el path comparten contenedor (la
 * fila del CTA), así que la matriz relativa que MotionPath hornea en el init
 * del tween es INVARIANTE al position:fixed del pin (la traslación común se
 * cancela en _getAlignMatrix) — no hay desalineación al engancharse el pin.
 * Verificado contra el fuente del plugin (node_modules/gsap/MotionPathPlugin.js,
 * _align/_getAlignMatrix): la matriz se calcula en el init del tween, no por
 * render, y es relativa al parentNode del target.
 *
 * BLUR-REVEAL DEL CLAIM (técnica 6, params de trionn): SplitText chars
 * (aria:"auto" preserva el nombre accesible del h2) -> gsap.set contenedor+
 * chars {autoAlpha:0, filter:blur(12px)} -> en desktop scrubbed sobre su
 * trigger propio (R3-7); en móvil al entrar. will-change vía onToggle.
 * SOLO heading (el blur en párrafos está prohibido por el catálogo §3).
 * Reduced-motion: el módulo no corre (rama reduce vacía en index.ts) -> el
 * h2 queda en estado final del markup, sin blur.
 *
 * GEOMETRÍA DEL BUCLE (BookingClose.astro): svg con viewBox="0 0 1000 88" +
 * preserveAspectRatio="none" (el bucle se estira con la fila) y
 * vector-effect="non-scaling-stroke" (trazo 2px constante). El borde derecho
 * del bucle (x=980 = 98%) despeja el borde derecho del CTA en todos los
 * anchos (el CTA es el último flex item shrink-0: su borde derecho es
 * W - padding de la fila, 24/40px; 98% deja 11-21px de aire). El nodo vive en
 * un svg propio SIN estirar (un circle dentro del estirado sería elipse) y
 * centrado con translate sobre el svg padre — GSAP anima el circle hijo, no
 * el svg, así que el centrado por translate es seguro (lección Morning
 * Ritual: solo prohíbe translate en el elemento que GSAP anima).
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CIRCUIT, LINE, RESIZE_DEBOUNCE } from "./tokens";
import { buildNodeRing, isPast } from "./utils";

interface ClaimState {
  el: HTMLElement | null;
  split: SplitText | null;
  /** Timeline del blur-reveal (pausada; el ScrollTrigger con toggleActions la
   *  controla: R1 la hace re-disparable — ver cabecera F-3/R1). */
  timeline: gsap.core.Timeline | null;
}

interface CircuitState {
  section: HTMLElement | null;
  row: HTMLElement | null;
  path: SVGPathElement | null;
  node: SVGCircleElement | null;
  nodeSvg: SVGSVGElement | null;
  ring: SVGCircleElement | null;
  traveler: HTMLDivElement | null;
  cta: HTMLButtonElement | null;
  /** Driver único desktop: timeline scrubbed con pin (null en móvil). */
  timeline: gsap.core.Timeline | null;
  /** Timeline time-based móvil (null en desktop). */
  mobileTimeline: gsap.core.Timeline | null;
  mobileTrigger: ScrollTrigger | null;
  mobileClaimTrigger: ScrollTrigger | null;
  /** Trigger scrubbed del claim en desktop (R3-7): rango dentro del pin,
   * tras el draw/flash. null en móvil (allí manda mountClaimTrigger). */
  desktopClaimTrigger: ScrollTrigger | null;
  claim: ClaimState;
  /** Colores del flash leídos de las vars @theme (null: sin flash). */
  colors: { base: string; hover: string } | null;
}

const state: CircuitState = {
  section: null,
  row: null,
  path: null,
  node: null,
  nodeSvg: null,
  ring: null,
  traveler: null,
  cta: null,
  timeline: null,
  mobileTimeline: null,
  mobileTrigger: null,
  mobileClaimTrigger: null,
  desktopClaimTrigger: null,
  claim: { el: null, split: null, timeline: null },
  colors: null,
};

/**
 * Memoria de "claim ya revelado en este DOM" que sobrevive a los re-inits de
 * resize (patrón revealedMemory de text-reveal.ts): sin ella, un resize a
 * mitad del pin re-prepararía el h2 y el blur-reveal se repetiría. Se marca
 * en el primer onEnter del trigger del claim. DOM nuevo de una navegación VT
 * = memoria nueva (el claim se anima de nuevo, correcto).
 */
const playedMemory = new WeakMap<Element, boolean>();

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let lastWidth = 0;

function isDesktop(): boolean {
  return window.matchMedia(CIRCUIT.lgQuery).matches;
}

/**
 * Lee los dos ámbar de la paleta desde las vars @theme de :root (sin hex en
 * el código: la paleta es de las vars). Fail-safe NO silencioso: si alguna no
 * resuelve, el flash no se monta (el pop del nodo sí) y el motivo queda en
 * consola.
 */
function readColors(): { base: string; hover: string } | null {
  const style = getComputedStyle(document.documentElement);
  const base = style.getPropertyValue("--color-primary").trim();
  const hover = style.getPropertyValue("--color-primary-hover").trim();
  if (base === "" || hover === "") {
    console.warn("[circuit] vars --color-primary* no resueltas: el CTA queda sin flash");
    return null;
  }
  return { base, hover };
}

/** Viajero: dot ámbar creado por JS (artefacto de animación, sin JS no existe). */
function buildTraveler(row: HTMLElement): HTMLDivElement {
  const traveler = document.createElement("div");
  traveler.style.cssText =
    `position:absolute;top:0;left:0;width:${CIRCUIT.travelerSize}px;height:${CIRCUIT.travelerSize}px;` +
    "border-radius:50%;background:var(--color-primary);pointer-events:none;";
  row.appendChild(traveler);
  return traveler;
}

/** Anillo del pop: artefacto creado por JS en el svg del nodo (patrón line-system). */
function buildRing(node: SVGCircleElement, nodeSvg: SVGSVGElement): SVGCircleElement {
  const ring = buildNodeRing(
    {
      cx: node.getAttribute("cx") ?? "6",
      cy: node.getAttribute("cy") ?? "6",
      r: node.r.baseVal.value,
    },
    document,
  );
  nodeSvg.appendChild(ring);
  return ring;
}

/**
 * Prepara el claim: SplitText chars + ocultación por gsap.set + timeline
 * PAUSADA del blur-reveal (el ScrollTrigger con toggleActions la gobierna —
 * R1: re-disparable). Si el punto de disparo (fracción `fraction` del
 * viewport) ya pasó, o el claim ya se reveló en un init anterior (resize a
 * mitad del pin), NO se prepara: el h2 queda en estado final del markup, sin
 * split y sin estilos inline.
 */
function prepareClaim(fraction: number): void {
  const h2 = state.section?.querySelector<HTMLElement>("h2") ?? null;
  if (h2 === null) return;
  state.claim.el = h2;
  if (playedMemory.get(h2) === true) return;
  if (isPast(state.section as Element, fraction)) return;
  const split = SplitText.create(h2, { type: "chars,words", aria: "auto" });
  state.claim.split = split;
  // Ocultación inicial SOLO por gsap.set (regla de oro). Técnica 6: contenedor
  // y chars a autoAlpha 0 + blur. El will-change lo gestiona la timeline por
  // ciclo (onStart/onComplete abajo: con el reveal re-disparable, cada
  // ejecución lo vuelve a aplicar y retirar).
  const chars = split.chars;
  gsap.set([h2, ...chars], {
    autoAlpha: 0,
    filter: `blur(${CIRCUIT.claimBlur}px)`,
  });

  // F-3: el spread se CAPA a ~1.5s de reveal total (criterio del plan):
  // trionn usa stagger 0.08 fijo, pero con 38 chars daba 0.08*37+0.8 = 3.84s
  // de estado intermedio "roto" (el vídeo F-3). Se conservan duración,
  // easing y orden random (el EFECTO no cambia): solo se comprime la
  // separación entre chars en titulares largos; en cortos queda 0.08.
  const spread = Math.max(1.5 - CIRCUIT.claimDur, 0);
  const each = Math.min(CIRCUIT.claimStagger, chars.length > 1 ? spread / (chars.length - 1) : spread);

  const tl = gsap.timeline({ paused: true });
  // Contenedor: autoAlpha 1 + blur 0 (0.5s, técnica 6).
  tl.to(h2, { autoAlpha: 1, filter: "blur(0px)", duration: 0.5, ease: "power2.out" }, 0);
  // Chars: blur 12 -> 0, stagger aleatorio (técnica 6, params de trionn).
  tl.to(chars, {
    autoAlpha: 1,
    filter: "blur(0px)",
    duration: CIRCUIT.claimDur,
    ease: "power2.out",
    stagger: { each, from: "random" },
  }, 0);
  // will-change: lo aplican/retiran los TRIGGERS por onToggle (R3-7: en scrub
  // los onStart/onComplete de la timeline no son fiables — ver setClaimWillChange).
  state.claim.timeline = tl;
}

/**
 * will-change del claim SOLO mientras su trigger está activo (R3-7, regla del
 * plan sección 4): onToggle del trigger del claim (móvil y scrub-desktop) y
 * del driver del circuito (desktop).
 */
function setClaimWillChange(active: boolean): void {
  const h2 = state.claim.el;
  const chars = state.claim.split?.chars ?? [];
  if (h2 === null) return;
  if (active) {
    gsap.set([h2, ...chars], { willChange: "filter, opacity" });
  } else {
    gsap.set([h2, ...chars], { clearProps: "willChange" });
  }
}

/**
 * Trigger del claim MÓVIL (sin pin): toggleActions RE-DISPARABLES (R1):
 * onEnter/onEnterBack restart, onLeave none, onLeaveBack reverse. El primer
 * onEnter marca la memoria (los re-inits de resize no re-preparan un claim ya
 * revelado). En desktop el claim ya NO pasa por aquí (R3-7: scrub propio).
 */
function mountClaimTrigger(trigger: Element, start: string): ScrollTrigger {
  return ScrollTrigger.create({
    trigger,
    start,
    animation: state.claim.timeline ?? undefined,
    toggleActions: "restart none restart reverse",
    onToggle: (self) => {
      setClaimWillChange(self.isActive);
    },
    onEnter: () => {
      if (state.claim.el !== null) playedMemory.set(state.claim.el, true);
    },
  });
}

/**
 * Prepara las piezas comunes a ambos modos (path/nodo ocultos por gsap.set,
 * viajero y anillo creados por JS). El markup parte de estado final: sin JS
 * nada de esto existe o está oculto.
 */
function buildPieces(): boolean {
  const { row, path, node, nodeSvg, cta } = state;
  if (row === null || path === null || node === null || nodeSvg === null || cta === null) {
    return false;
  }
  gsap.set(path, { drawSVG: "0% 0%" });
  gsap.set(node, { scale: 0, transformOrigin: "50% 50%" });
  state.traveler = buildTraveler(row);
  state.ring = buildRing(node, nodeSvg);
  gsap.set(state.ring, { autoAlpha: 0 });
  state.colors = readColors();
  return true;
}

/**
 * Flash único del CTA: ida (power1.in, 37.5% de flashDur) y vuelta (power1.out,
 * 62.5%) sobre backgroundColor — un solo destello a hover-ámbar, sin pulso
 * repetitivo ni glow. Tweens `to` (no fromTo): el scrub inverso vuelve al
 * start grabado (el color base del markup), nunca deja el CTA en hover.
 * onComplete limpia el inline para devolver el control al CSS (hover incluido).
 */
function addCtaFlash(tl: gsap.core.Timeline, at: number): void {
  const { cta, colors } = state;
  if (cta === null || colors === null) return;
  tl.to(cta, {
    backgroundColor: colors.hover,
    duration: CIRCUIT.flashDur * 0.375,
    ease: "power1.in",
  }, at);
  tl.to(cta, {
    backgroundColor: colors.base,
    duration: CIRCUIT.flashDur * 0.625,
    ease: "power1.out",
    onComplete: () => {
      gsap.set(cta, { clearProps: "backgroundColor" });
    },
  }, at + CIRCUIT.flashDur * 0.375);
}

/** Driver único desktop: pin de la sección + timeline scrubbed construida una vez. */
function initDesktop(): void {
  const { section } = state;
  if (section === null || !buildPieces()) return;
  const { path, node, ring, traveler } = state;
  if (path === null || node === null || ring === null || traveler === null) return;

  // R6: pin de SOLO el viaje propio (CIRCUIT.pinTravelVh) — sin el openLen de
  // la ex-frontera b5 ni segmento frontal: la transición natural FAQ→Booking
  // aterriza la sección en "top top" y el draw arranca inmediatamente.
  const baseUnits = CIRCUIT.drawDur + LINE.nodePopDur + CIRCUIT.holdDur;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      // Recorrido propio del pico, sin extensiones de frontera (R6).
      end: () => "+=" + Math.round(CIRCUIT.pinTravelVh * 100) + "%",
      pin: true,
      scrub: CIRCUIT.scrub,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      // R6: refreshPriority 10 (CIRCUIT.priority) — EN GSAP 3.15.0 priority
      // MAYOR refresca ANTES (sort * -1e6). Orden de página: hscroll 19 >
      // rail 15 > circuit 10; los dos primeros ya aplicaron sus spacers
      // cuando este lee sus anclas.
      refreshPriority: CIRCUIT.priority,
      id: "circuit",
      // will-change del claim (R3-7): activo mientras el pin lo esté.
      onToggle: (self) => {
        setClaimWillChange(self.isActive);
      },
    },
  });
  state.timeline = tl;

  // R3-7 — CLAIM como SCRUB (supersede toggleActions): trigger propio SIN pin
  // dentro del rango pineado, tras el draw/flash: [start + px donde acaba el
  // draw, +40vh]. scrub 0.6, 100% reversible al subir (re-difuminado
  // progresivo ligado al scroll, sin replay). Function-based: lee el start/
  // end FRESCOS del circuito en cada refresh (invalidateOnRefresh).
  if (state.claim.timeline !== null) {
    const claimStartPx = (): number => {
      const st = tl.scrollTrigger;
      if (st === undefined) return Number.MAX_SAFE_INTEGER;
      const drawEnd = (CIRCUIT.drawDur / baseUnits) * (st.end - st.start);
      return Math.round(st.start + drawEnd);
    };
    state.desktopClaimTrigger = ScrollTrigger.create({
      trigger: section,
      start: () => claimStartPx(),
      end: () => claimStartPx() + Math.round(0.4 * window.innerHeight),
      animation: state.claim.timeline,
      scrub: 0.6,
      invalidateOnRefresh: true,
      id: "circuit-claim",
      onToggle: (self) => {
        setClaimWillChange(self.isActive);
      },
    });
  }

  // (a) Dibujo del circuito: la cabeza avanza 0% -> 100% (sin cola-cometa:
  // es el cierre, quiere continuidad — spec tanda 3).
  tl.fromTo(path, { drawSVG: "0% 0%" }, {
    drawSVG: "0% 100%",
    duration: CIRCUIT.drawDur,
    ease: "none",
  }, 0);

  // (b) Viajero: recorre el path en sincronía con la cabeza del dibujo (misma
  // duración, ease none). align en espacio relativo viajero/path (mismo
  // contenedor: inmune al position:fixed del pin — ver cabecera).
  tl.to(traveler, {
    motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
    duration: CIRCUIT.drawDur,
    ease: "none",
  }, 0);
  tl.fromTo(traveler, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.03, ease: "none" }, 0);
  // El viajero se disuelve al llegar al nodo: se "suelda" en él (y el pop
  // toma el relevo). immediateRender false: antes del primer render el
  // viajero sigue visible (el fade-in lo gobierna).
  tl.to(traveler, {
    autoAlpha: 0,
    scale: 0.4,
    duration: 0.04,
    ease: "power1.in",
    immediateRender: false,
  }, CIRCUIT.drawDur - 0.04);

  // (c) Cierre: pop del nodo (params de LINE: back.out(2.2), 0.45) + anillo
  // (drawSVG 0 -> 100%, 0.4, mitad dibujo / mitad fade para que el scrub
  // inverso lo deje oculto) + flash único del CTA.
  tl.fromTo(node, { scale: 0 }, {
    scale: 1,
    duration: LINE.nodePopDur,
    ease: LINE.nodePopEase,
    immediateRender: false,
  }, CIRCUIT.drawDur);
  tl.fromTo(ring, { drawSVG: "0% 0%", autoAlpha: 0 }, {
    drawSVG: "0% 100%",
    autoAlpha: 0.9,
    duration: LINE.nodeRingDur * 0.5,
    ease: "power2.out",
    immediateRender: false,
  }, CIRCUIT.drawDur);
  tl.to(ring, {
    autoAlpha: 0,
    duration: LINE.nodeRingDur * 0.5,
    ease: "power1.out",
    immediateRender: false,
  }, CIRCUIT.drawDur + LINE.nodeRingDur * 0.5);
  addCtaFlash(tl, CIRCUIT.drawDur);

  // Hold: la timeline sostiene el circuito cerrado; el unpin libera.
  tl.to({}, { duration: CIRCUIT.holdDur }, CIRCUIT.drawDur + LINE.nodePopDur);
}

/** Móvil (<lg): sin pin. Dos triggers once (claim en la sección, circuito en la fila). */
function initMobile(): void {
  const { section, row } = state;
  if (section === null || row === null) return;

  // ¿Ya pasó la fila al inicializar? Markup final sin preparar (patrón line-system).
  if (isPast(row, CIRCUIT.mobileRowStart)) return;
  if (!buildPieces()) return;
  const { path, node, ring, traveler } = state;
  if (path === null || node === null || ring === null || traveler === null) return;

  // Timeline time-based (sin scrub: el momento se reproduce entero al entrar).
  const tl = gsap.timeline({ paused: true });
  state.mobileTimeline = tl;

  tl.fromTo(path, { drawSVG: "0% 0%" }, {
    drawSVG: "0% 100%",
    duration: CIRCUIT.mobileDur,
    ease: "power2.inOut",
  }, 0);
  tl.to(traveler, {
    motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
    duration: CIRCUIT.mobileDur,
    ease: "power2.inOut",
  }, 0);
  tl.fromTo(traveler, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1, ease: "none" }, 0);
  tl.to(traveler, {
    autoAlpha: 0,
    scale: 0.4,
    duration: 0.12,
    ease: "power1.in",
    immediateRender: false,
  }, CIRCUIT.mobileDur - 0.12);
  tl.fromTo(node, { scale: 0 }, {
    scale: 1,
    duration: LINE.nodePopDur,
    ease: LINE.nodePopEase,
    immediateRender: false,
  }, CIRCUIT.mobileDur);
  tl.fromTo(ring, { drawSVG: "0% 0%", autoAlpha: 0 }, {
    drawSVG: "0% 100%",
    autoAlpha: 0.9,
    duration: LINE.nodeRingDur * 0.5,
    ease: "power2.out",
    immediateRender: false,
  }, CIRCUIT.mobileDur);
  tl.to(ring, {
    autoAlpha: 0,
    duration: LINE.nodeRingDur * 0.5,
    ease: "power1.out",
    immediateRender: false,
  }, CIRCUIT.mobileDur + LINE.nodeRingDur * 0.5);
  addCtaFlash(tl, CIRCUIT.mobileDur);

  // Circuito: dispara cuando ENTRA su fila (no la sección: la fila queda por
  // debajo del pliegue al entrar la sección y el dibujo correría fuera de
  // pantalla).
  state.mobileTrigger = ScrollTrigger.create({
    trigger: row,
    start: `top ${Math.round(CIRCUIT.mobileRowStart * 100)}%`,
    once: true,
    onEnter: () => {
      tl.play();
    },
  });

  // Claim móvil: su propio trigger (el h2 entra antes que la fila del CTA),
  // RE-DISPARABLE igual que en desktop (R1).
  state.mobileClaimTrigger = mountClaimTrigger(
    section,
    `top ${Math.round(CIRCUIT.mobileClaimStart * 100)}%`,
  );
}

/**
 * Re-monta la parte dependiente del ancho (driver lg+ vs móvil). Llamado por
 * el resize debounced (solo cambios de ancho, tolerancia de autoSplit) y por
 * initCircuit. El listener de resize NO se toca aquí (lo gestiona el par
 * initCircuit/destroyCircuit para no desmontarlo en pleno resize).
 */
function applyMode(): void {
  teardown();
  const section = document.querySelector<HTMLElement>("[data-circuit]");
  if (section === null) return;
  const row = section.querySelector<HTMLElement>("[data-circuit-row]");
  const path = section.querySelector<SVGPathElement>("[data-circuit-path]");
  const node = section.querySelector<SVGCircleElement>("[data-node]");
  const cta = section.querySelector<HTMLButtonElement>("[data-cal-link]");
  if (row === null || path === null || node === null || cta === null) return;
  const nodeSvg = node.closest<SVGSVGElement>("svg");
  if (nodeSvg === null) return;

  state.section = section;
  state.row = row;
  state.path = path;
  state.node = node;
  state.nodeSvg = nodeSvg;
  state.cta = cta;

  // Claim: misma fracción de disparo en ambos modos (F-3): el h2 entra por
  // "top 80%" (mobileClaimStart ahora es LA fracción del claim en cualquier
  // ancho); el isPast correspondiente deja el markup final si ya pasó.
  prepareClaim(CIRCUIT.mobileClaimStart);

  if (isDesktop()) {
    initDesktop();
  } else {
    initMobile();
  }
}

function onResize(): void {
  if (resizeTimer !== null) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeTimer = null;
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    applyMode();
  }, RESIZE_DEBOUNCE);
}

/**
 * Limpieza de animaciones y artefactos (sin tocar el listener de resize):
 * mata triggers/timelines, retira viajero y anillo (artefactos JS) y devuelve
 * path/nodo/CTA/h2 al estado del markup (path completo, nodo visible, CTA sin
 * color inline, h2 sin split ni estilos inline). Idempotente.
 */
function teardown(): void {
  if (state.timeline !== null) {
    state.timeline.scrollTrigger?.kill();
    state.timeline.kill();
    state.timeline = null;
  }
  if (state.mobileTimeline !== null) {
    state.mobileTimeline.kill();
    state.mobileTimeline = null;
  }
  if (state.mobileTrigger !== null) {
    state.mobileTrigger.kill();
    state.mobileTrigger = null;
  }
  if (state.mobileClaimTrigger !== null) {
    state.mobileClaimTrigger.kill();
    state.mobileClaimTrigger = null;
  }
  if (state.desktopClaimTrigger !== null) {
    // F-3: el trigger propio del claim muere aquí en CADA remonte (resize
    // cambia el breakpoint, resetMotion en VT). El playedMemory evita que el
    // trigger nuevo re- anime un claim ya revelado.
    state.desktopClaimTrigger.kill();
    state.desktopClaimTrigger = null;
  }
  state.traveler?.remove();
  state.ring?.remove();
  if (state.path !== null) {
    // DrawSVG escribe dasharray/dashoffset inline: fuera, el markup manda.
    state.path.style.strokeDasharray = "";
    state.path.style.strokeDashoffset = "";
  }
  if (state.node !== null) {
    gsap.killTweensOf(state.node);
    state.node.removeAttribute("transform");
    state.node.style.transform = "";
  }
  if (state.cta !== null) {
    gsap.killTweensOf(state.cta);
    gsap.set(state.cta, { clearProps: "backgroundColor" });
  }
  const { el, split, timeline } = state.claim;
  if (timeline !== null) timeline.kill();
  if (el !== null) {
    gsap.killTweensOf(el);
    gsap.set(el, { clearProps: "opacity,visibility,filter,willChange" });
  }
  split?.revert();
  state.claim = { el: null, split: null, timeline: null };
  state.traveler = null;
  state.ring = null;
  state.colors = null;
  state.section = null;
  state.row = null;
  state.path = null;
  state.node = null;
  state.nodeSvg = null;
  state.cta = null;
}

/**
 * Monta el pico peak-end de BookingClose. Idempotente: destruye lo anterior
 * antes de montar (la ruta nueva trae DOM nuevo). Se llama en la rama
 * no-preference del matchMedia de index.ts, DESPUÉS de initImageReveal(): su
 * pin (refreshPriority 10, R6) es el más bajo de la página y refresca el
 * último del trío 19/15/10.
 */
export function initCircuit(): void {
  destroyCircuit();
  lastWidth = window.innerWidth;
  applyMode();
  window.addEventListener("resize", onResize);
}

/**
 * Limpieza total: listener de resize + teardown. resetMotion() la llama ANTES
 * de media.revert() porque matchMedia.revert() no deshace mutaciones DOM (el
 * viajero y el anillo creados por JS, los estilos inline); el doble pase con
 * el cleanup del contexto es inocuo (todo idempotente).
 */
export function destroyCircuit(): void {
  window.removeEventListener("resize", onResize);
  if (resizeTimer !== null) {
    clearTimeout(resizeTimer);
    resizeTimer = null;
  }
  teardown();
}
