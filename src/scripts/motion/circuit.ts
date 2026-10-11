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
 * start "top top", end +=170%, scrub 1, anticipatePin 1) + UNA timeline
 * construida una vez que contiene dibujo + viajero + pop + anillo + flash +
 * hold. Cero triggers en paralelo: todo deriva del mismo progreso scrubbed.
 * El claim es la excepción DECLARADA: time-based one-shot al INICIARSE el pin
 * (onEnter del propio trigger del pin), nunca scrubbed (spec tanda 3).
 *
 * MÓVIL (<lg): sin pin (decisión: 170% de scroll extra no cabe en pantallas
 * cortas y el pico ya vive en el contenido). Dos triggers once: el claim
 * (blur-reveal) dispara cuando la sección entra ("top 80%") y el circuito
 * cuando entra su fila ("top 85%") — cada elemento anima al ENTRAR, no antes.
 * El circuito móvil es una timeline time-based (1.3s, power2.inOut) con el
 * mismo viajero + pop + flash; sin hold (no hay unpin que sostener).
 *
 * ESTADO FINAL SIN JS (regla de oro): el markup parte del estado FINAL (path
 * completo dibujado, nodo visible, claim sin split) y es el JS quien prepara
 * con gsap.set. El viajero y el anillo son artefactos de animación creados
 * por JS (sin JS no existen). Si el punto de disparo ya pasó al inicializar
 * (VT a ancla, resize), no se prepara nada: estado final del markup sin
 * re-animar (patrón isPast de line-system.ts). El PIN, en cambio, SIEMPRE se
 * crea en lg+ (estabilidad del layout: sin él, un resize con la sección
 * pasada acortaría la página y saltaría el scroll — patrón shutter.ts, que
 * tampoco guarda isPast para su pin).
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
 * chars {autoAlpha:0, filter:blur(12px), willChange} -> al disparar:
 * contenedor autoAlpha 1/blur 0 (0.5s) + chars blur 0/autoAlpha 1 (0.8s,
 * stagger 0.08 from:"random", power2.out). will-change retirado onComplete.
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
  tween: gsap.core.Tween | null;
  played: boolean;
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
  claim: { el: null, split: null, tween: null, played: false },
  colors: null,
};

/**
 * Memoria de "claim ya revelado" que sobrevive a los re-inits de resize
 * (patrón revealedMemory de text-reveal.ts): sin ella, un resize a mitad del
 * pin re-prepararía el h2 y el blur-reveal se repetiría. DOM nuevo de una
 * navegación VT = memoria nueva (el claim se anima de nuevo, correcto).
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
 * Prepara el claim: SplitText chars + ocultación por gsap.set. Si el punto de
 * disparo (fracción `fraction` del viewport) ya pasó, o el claim ya se reveló
 * en un init anterior (resize a mitad del pin), NO se prepara: el h2 queda en
 * estado final del markup, sin split y sin estilos inline.
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
  // y chars a autoAlpha 0 + blur; will-change solo durante el reveal.
  gsap.set([h2, ...split.chars], {
    autoAlpha: 0,
    filter: `blur(${CIRCUIT.claimBlur}px)`,
    willChange: "filter, opacity",
  });
}

/**
 * Claim: blur-reveal de chars (técnica 6). Una sola vez por elemento (guard
 * `played` + playedMemory): el onEnter del pin puede dispararse en cada
 * re-entrada al rango y el claim no debe re-animarse.
 */
function playClaim(): void {
  const { el, split, played } = state.claim;
  if (el === null || split === null || played) return;
  state.claim.played = true;
  playedMemory.set(el, true);
  // Contenedor: autoAlpha 1 + blur 0 (0.5s, técnica 6).
  gsap.to(el, { autoAlpha: 1, filter: "blur(0px)", duration: 0.5, ease: "power2.out" });
  // Chars: blur 12 -> 0, stagger aleatorio (técnica 6, params de trionn).
  state.claim.tween = gsap.to(split.chars, {
    autoAlpha: 1,
    filter: "blur(0px)",
    duration: CIRCUIT.claimDur,
    ease: "power2.out",
    stagger: { each: CIRCUIT.claimStagger, from: "random" },
    onComplete: () => {
      // will-change retirado al terminar (regla del plan, sección 4).
      gsap.set([el, ...split.chars], { clearProps: "willChange" });
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

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      // Encadenado al unpin de la segunda persiana horizontal ("shutter-h-1" en
      // shutter.ts) para cerrar el hueco muerto de ~1000 px entre el flip del
      // cap\u00edtulo claro y el arranque del pico peak-end.
      start: () => {
        const prev = ScrollTrigger.getById("shutter-h-1");
        return prev ? Math.round(prev.end) : "top top";
      },
      end: CIRCUIT.pinDistance,
      pin: true,
      scrub: CIRCUIT.scrub,
      anticipatePin: 1,
      id: "circuit",
      // El claim (blur-reveal) arranca con el pin, UNA vez (guard en playClaim):
      // el onEnter del pin se re-dispara en cada re-entrada al rango.
      onEnter: () => {
        playClaim();
      },
    },
  });
  state.timeline = tl;

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

  // Red de seguridad del claim (patrón line-system): si el pin ya está activo
  // al crear el trigger (VT a ancla dentro del rango, resize), el onEnter no
  // volverá a cruzar el start. top <= 0 cubre "pineado ahora" y "pasado".
  if (section.getBoundingClientRect().top <= 0) playClaim();
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

  // Claim móvil: su propio trigger (el h2 entra antes que la fila del CTA).
  state.mobileClaimTrigger = ScrollTrigger.create({
    trigger: section,
    start: `top ${Math.round(CIRCUIT.mobileClaimStart * 100)}%`,
    once: true,
    onEnter: () => {
      playClaim();
    },
  });
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

  // Claim: se prepara con la fracción de disparo de cada modo (desktop: el
  // pin empieza con la sección a top 0; móvil: trigger a top 80%).
  prepareClaim(isDesktop() ? 0 : CIRCUIT.mobileClaimStart);

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
  const { el, split, tween } = state.claim;
  if (tween !== null) tween.kill();
  if (el !== null) {
    gsap.killTweensOf(el);
    gsap.set(el, { clearProps: "opacity,visibility,filter,willChange" });
  }
  split?.revert();
  state.claim = { el: null, split: null, tween: null, played: false };
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
 * pin es el de la sección más baja con triggers de la página y el refresh
 * corre en orden de creación (el pin-spacer de la persiana, anterior en la
 * página, ya existe al medirlo; ningún trigger posterior necesita el suyo).
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
