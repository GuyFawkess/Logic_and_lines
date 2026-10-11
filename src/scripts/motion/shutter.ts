/**
 * Persiana line-native Thesis→ServicesIndex (F3-v2) — técnica 5 del catálogo
 * (docs/research-v4/2026-10-11-catalogo-motion-trionn.md). USO ÚNICO en toda
 * la página: es EL momento donde la línea maestra muta de forma (veredicto §4
 * del catálogo: una wipe repetida entre bloques arruina el ritmo).
 *
 * ARQUITECTURA (regla de oro sin-JS): TODO lo efímero lo crea el JS. El markup
 * solo aporta un wrapper vacío `<div data-shutter>` alrededor de ServicesIndex
 * (index.astro / en/index.astro, sin estilos que oculten nada). Sin JS, en
 * móvil (<lg) o con reduced-motion: flujo normal, cero overlays, cero pin.
 *
 * PIEZAS (creadas por JS, solo lg + no-preference):
 *  - Overlay SVG absoluto (inset 0 del wrapper, pointer-events:none) con:
 *      · <mask maskUnits="userSpaceOnUse">: rect negro (tapa) + 2 rects
 *        blancos por lama que expanden su width desde el centro de la lama
 *        hacia fuera (mitad izquierda con x = centro - width, borde derecho
 *        clavado en el centro; solape 5% anti-gap; shape-rendering
 *        crispEdges).
 *      · <rect> cover a sangre, fill var(--color-bg) por style (var() no
 *        funciona en atributos SVG, lección del anillo de line-system),
 *        enmascarado — ES la persiana: el fondo de página tapando el
 *        contenido.
 *      · <rect> ámbar de 2px: el frente de onda; viaja de izquierda a derecha
 *        al ritmo del stagger y se desvanece al asentarse el último grupo.
 *  - Pin del wrapper: start "top top", end "+=150%", pin, scrub 2.2,
 *    anticipatePin 1. La máscara se aplica al rect DENTRO del SVG (SVG 1.1
 *    clásico, soporte universal) y NO como CSS mask sobre HTML (las
 *    referencias a <mask> inline desde CSS tienen soporte desigual).
 *
 * RESIZE: el SVG lleva viewBox="0 0 W H" + preserveAspectRatio="none": las
 * coordenadas de lamas y frente viven en unidades de usuario y escalan con el
 * wrapper, así que NO hay reconstrucción en resize (el pin lo refresca
 * ScrollTrigger solo). Por eso este módulo no lleva listener de resize.
 *
 * CICLO DEL OVERLAY: se oculta (display:none, coste cero) cuando el scrub
 * COMPLETA (onComplete de la timeline) — no en onLeave: con scrub el playhead
 * va con retraso respecto al scroll y ocultar antes del catch-up cortaría
 * lamas a medio abrir. onEnterBack lo restaura para que el scrub inverso
 * vuelva a cerrar las lamas al subir (la transición es reversible).
 *
 * INTERACCIONES:
 *  - El h2 de ServicesIndex (data-reveal="lines") dispara su trigger
 *    "top 85%" ANTES del pin (bajo la persiana cerrada): la persiana actúa
 *    como su reveal; el once de text-reveal no re-dispara tras el unpin.
 *  - Los line-wipe de las imágenes (image-reveal.ts) usan pinnedContainer =
 *    este wrapper: sus starts se desplazan por el pin-spacer (filas profundas
 *    sin él dispararían ~1.5vh tarde).
 *  - ORDEN DE CREACIÓN: index.ts registra esta condición ANTES que la rama
 *    general para que el pin exista al crear los demás triggers (el refresh
 *    corre en orden de creación y contabiliza el pin-spacer).
 */
import gsap from "gsap";
import { BLADES, OVERSHOOT, SHUTTER } from "./tokens";

const SVG_NS = "http://www.w3.org/2000/svg";
const MASK_ID = "ll-shutter-mask";

interface ShutterState {
  overlay: SVGSVGElement | null;
  timeline: gsap.core.Timeline | null;
  wave: SVGRectElement | null;
  /** Mitades izquierdas (una por lama, en orden de lama). */
  leftRects: SVGRectElement[];
  /** Mitades derechas (una por lama, en orden de lama). */
  rightRects: SVGRectElement[];
  /** Centro x de cada lama (unidades de usuario del viewBox). */
  centers: number[];
  /** Anchura final de cada mitad (media lama + solape). */
  extW: number;
}

const state: ShutterState = {
  overlay: null,
  timeline: null,
  wave: null,
  leftRects: [],
  rightRects: [],
  centers: [],
  extW: 0,
};

function isDesktop(): boolean {
  return window.matchMedia(SHUTTER.lgQuery).matches;
}

function makeRect(x: number, y: number, w: number, h: number): SVGRectElement {
  const r = document.createElementNS(SVG_NS, "rect");
  r.setAttribute("x", String(x));
  r.setAttribute("y", String(y));
  r.setAttribute("width", String(w));
  r.setAttribute("height", String(h));
  return r;
}

/** Construye el overlay (mask + cover + frente de onda) y lo añade al wrapper. */
function buildOverlay(wrapper: HTMLElement): void {
  const W = wrapper.offsetWidth;
  const H = wrapper.offsetHeight;

  const svg = document.createElementNS(SVG_NS, "svg");
  // viewBox + preserveAspectRatio="none": las coordenadas de la máscara viven
  // en unidades de usuario y escalan con el wrapper -> inmune al resize.
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;inset:0;pointer-events:none;";

  const defs = document.createElementNS(SVG_NS, "defs");
  const mask = document.createElementNS(SVG_NS, "mask");
  mask.setAttribute("id", MASK_ID);
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  mask.setAttribute("x", "0");
  mask.setAttribute("y", "0");
  mask.setAttribute("width", String(W));
  mask.setAttribute("height", String(H));

  // Tapa: negro = el cover tapa; las lamas (blancas) le abren huecos.
  const black = makeRect(0, 0, W, H);
  black.style.fill = "#000";
  mask.appendChild(black);

  const bladeW = W / BLADES;
  const halfW = bladeW / 2;
  const extW = halfW * (1 + SHUTTER.overlap);
  const leftRects: SVGRectElement[] = [];
  const rightRects: SVGRectElement[] = [];
  const centers: number[] = [];
  for (let i = 0; i < BLADES; i++) {
    const center = i * bladeW + halfW;
    centers.push(center);
    // Mitad izquierda: borde derecho SIEMPRE en el centro (x = centro - width);
    // su borde izquierdo es el frente que viaja hacia fuera.
    const left = makeRect(center, 0, 0, H);
    // Mitad derecha: x fijada en el centro; su borde derecho viaja hacia
    // fuera. El solape (extW > halfW en ambas) cubre la costura central.
    const right = makeRect(center, 0, 0, H);
    for (const r of [left, right]) {
      r.style.fill = "#fff";
      r.setAttribute("shape-rendering", "crispEdges");
      mask.appendChild(r);
    }
    leftRects.push(left);
    rightRects.push(right);
  }
  defs.appendChild(mask);
  svg.appendChild(defs);

  // Cover: el fondo de página tapando el contenido; la máscara le abre las
  // lamas. fill por style (var() no funciona en atributos SVG).
  const cover = makeRect(0, 0, W, H);
  cover.style.fill = "var(--color-bg)";
  cover.setAttribute("mask", `url(#${MASK_ID})`);
  svg.appendChild(cover);

  // Frente de onda: la línea ámbar viaja de izquierda a derecha al ritmo del
  // stagger (la línea ES la persiana, dirección C).
  const wave = makeRect(0, 0, SHUTTER.waveWidth, H);
  wave.style.fill = "var(--color-primary)";
  svg.appendChild(wave);

  wrapper.appendChild(svg);
  state.overlay = svg;
  state.wave = wave;
  state.leftRects = leftRects;
  state.rightRects = rightRects;
  state.centers = centers;
  state.extW = extW;
}

/** Pin + timeline scrubbed de las lamas. */
function buildTimeline(wrapper: HTMLElement): void {
  const { leftRects, rightRects, centers, extW, wave } = state;
  if (wave === null || leftRects.length === 0 || rightRects.length === 0) return;
  const W = wrapper.offsetWidth;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: wrapper,
      start: "top top",
      end: SHUTTER.pinDistance,
      pin: true,
      scrub: SHUTTER.scrub,
      anticipatePin: 1,
      // Al volver a entrar en el rango (scroll hacia atrás tras haber
      // completado) el overlay vuelve: el scrub inverso cierra las lamas.
      onEnterBack: () => {
        showOverlay();
      },
    },
    // Ocultar el overlay SOLO cuando el scrub completa (progress 1), nunca en
    // onLeave: con scrub el playhead va con retraso y ocultar antes del
    // catch-up cortaría lamas a medio abrir (ver cabecera).
    onComplete: () => {
      hideOverlay();
    },
  });
  state.timeline = tl;

  const bladeEase = "power2.inOut";
  // Lamas: pares centro-fuera, stagger 0.02 de izquierda a derecha. La mitad
  // izquierda mueve x y width en el MISMO tween (su borde derecho queda
  // clavado en el centro de la lama: x = centro - width); la derecha solo
  // width (x fijado en el centro). Valores function-based/absolutos: los
  // relativos en timelines scrubbed dependen del orden de resolución.
  tl.to(
    leftRects,
    {
      attr: { x: (i: number) => centers[i] - extW, width: extW },
      duration: SHUTTER.bladeDur,
      ease: bladeEase,
      stagger: { each: SHUTTER.stagger },
    },
    0,
  );
  tl.to(
    rightRects,
    {
      attr: { width: extW },
      duration: SHUTTER.bladeDur,
      ease: bladeEase,
      stagger: { each: SHUTTER.stagger },
    },
    0,
  );

  // Overshoot 1.06 SOLO en el último grupo de lamas (las 2 últimas): suben un
  // 6% su anchura final y se asientan. Valores absolutos por rect.
  const mainEnd = (BLADES - 1) * SHUTTER.stagger + SHUTTER.bladeDur;
  const overW = extW * OVERSHOOT;
  for (let b = BLADES - 2; b < BLADES; b++) {
    const left = leftRects[b];
    const right = rightRects[b];
    tl.to(left, { attr: { x: centers[b] - overW, width: overW }, duration: SHUTTER.overshootDur, ease: "power2.out" }, mainEnd);
    tl.to(right, { attr: { width: overW }, duration: SHUTTER.overshootDur, ease: "power2.out" }, mainEnd);
    tl.to(left, { attr: { x: centers[b] - extW, width: extW }, duration: SHUTTER.overshootDur, ease: "power2.inOut" }, mainEnd + SHUTTER.overshootDur);
    tl.to(right, { attr: { width: extW }, duration: SHUTTER.overshootDur, ease: "power2.inOut" }, mainEnd + SHUTTER.overshootDur);
  }

  // Frente de onda: cruza el wrapper al ritmo del stagger (lineal, sincronizado
  // con la cascada de lamas) y se desvanece al asentarse el último grupo.
  const total = mainEnd + SHUTTER.overshootDur * 2;
  tl.to(wave, { attr: { x: W - SHUTTER.waveWidth }, duration: mainEnd, ease: "none" }, 0);
  tl.to(wave, { autoAlpha: 0, duration: SHUTTER.waveFade, ease: "power1.out" }, total - SHUTTER.waveFade);
}

function hideOverlay(): void {
  if (state.overlay !== null) state.overlay.style.display = "none";
}

function showOverlay(): void {
  if (state.overlay !== null) state.overlay.style.display = "";
}

/** Mata trigger + timeline y retira el overlay. Idempotente. */
function killShutter(): void {
  if (state.timeline !== null) {
    state.timeline.scrollTrigger?.kill();
    state.timeline.kill();
    state.timeline = null;
  }
  state.overlay?.remove();
  state.overlay = null;
  state.wave = null;
  state.leftRects = [];
  state.rightRects = [];
  state.centers = [];
  state.extW = 0;
}

/**
 * Monta la persiana. Idempotente: destruye lo anterior antes de montar (la
 * ruta nueva trae DOM nuevo). Se llama en la condición compuesta
 * lg + no-preference del matchMedia de index.ts, registrada ANTES que la rama
 * general (el pin debe existir al crear los demás triggers — ver cabecera).
 * matchMedia revierte el pin limpiamente al cruzar lg (móvil sin persiana).
 */
export function initShutter(): void {
  destroyShutter();
  const wrapper = document.querySelector<HTMLElement>("[data-shutter]");
  if (wrapper === null || !isDesktop()) return;
  buildOverlay(wrapper);
  buildTimeline(wrapper);
}

/**
 * Limpieza total: mata pin/timeline, retira el overlay y limpia refs.
 * resetMotion() la llama ANTES de media.revert() porque matchMedia.revert()
 * no deshace mutaciones DOM (el overlay); el doble pase con el cleanup del
 * contexto es inocuo.
 */
export function destroyShutter(): void {
  killShutter();
}
