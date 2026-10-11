/**
 * Persianas de lamas line-native (F3-v2 + F4-t2) — técnica 5 del catálogo
 * (docs/research-v4/2026-10-11-catalogo-motion-trionn.md).
 *
 * ORIENTACIÓN CONFIGURABLE (F4-t2): la instancia VERTICAL ([data-shutter],
 * Thesis→ServicesIndex) conserva su USO ÚNICO narrativo — EL momento donde la
 * línea maestra muta de forma (veredicto §4 del catálogo: una wipe repetida
 * entre bloques arruina el ritmo). Las instancias HORIZONTALES
 * ([data-shutter-h], F4) marcan los flips de capítulo oscuro→claro en las
 * entradas a ProcessRail y FaqIndex: 3 persianas en total en la home. Una
 * lama horizontal es una FILA apilada verticalmente que abre centro-fuera
 * (dos mitades por lama, solape +0.05, crispEdges) y el frente de onda ámbar
 * viaja ARRIBA→ABAJO: exactamente el mismo comportamiento, rotado 90°.
 *
 * ARQUITECTURA (regla de oro sin-JS): TODO lo efímero lo crea el JS. El
 * markup solo aporta wrappers vacíos alrededor de las secciones (sin estilos
 * que oculten nada). Sin JS, en móvil (<lg) o con reduced-motion: flujo
 * normal, cero overlays, cero pins.
 *
 * PIEZAS (creadas por JS, solo lg + no-preference):
 *  - Overlay SVG absoluto (inset 0 del wrapper, pointer-events:none) con:
 *      · <mask maskUnits="userSpaceOnUse">: rect negro (tapa) + 2 rects
 *        blancos por lama que expanden su tamaño desde el centro de la lama
 *        hacia fuera (mitad negativa con posición = centro - tamaño, borde
 *        positivo clavado en el centro; solape 5% anti-gap; shape-rendering
 *        crispEdges). ID ÚNICO por instancia: con 3 persianas en el documento
 *        un id compartido haría que todos los covers resolvieran la PRIMERA
 *        mask (url(#id) resuelve por documento).
 *      · <rect> cover a sangre, fill var(--color-bg) por style (var() no
 *        funciona en atributos SVG, lección del anillo de line-system),
 *        enmascarado — ES la persiana: el fondo de página tapando el
 *        contenido. En los flips horizontales ese fondo es el capítulo
 *        OSCURO entrando y al abrirse se ve el capítulo CLARO (#223B47).
 *      · <rect> ámbar de 2px: el frente de onda; viaja (izq→der en v,
 *        arriba→abajo en h) al ritmo del stagger y se desvanece al
 *        asentarse el último grupo.
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
 *  - El h2 de cada sección envuelta (data-reveal="lines") dispara su trigger
 *    "top 85%" ANTES del pin (bajo la persiana cerrada): la persiana actúa
 *    como su reveal; el once de text-reveal no re-dispara tras el unpin.
 *  - Los triggers internos de las secciones envueltas (line-wipes de
 *    image-reveal.ts, driver del rail de line-system.ts) usan
 *    pinnedContainer/containerAnimation apuntando al wrapper correspondiente.
 *  - ORDEN DE CREACIÓN: index.ts registra la persiana vertical PRIMERO (su
 *    pin es el primero de la página y el hscroll anida dentro), luego el
 *    hscroll y luego las horizontales — el refresh corre en orden de
 *    creación y contabiliza cada pin-spacer para los triggers siguientes.
 *  - El trigger vertical lleva id "shutter-v": hscroll.ts lee su end para
 *    alinear su propio pin con el unpin (ver hscroll.ts).
 */
import gsap from "gsap";
import { BLADES, OVERSHOOT, SHUTTER } from "./tokens";
import { SVG_NS } from "./utils";

/** Orientación de la persiana: "v" = lamas verticales (viaja en x), "h" = lamas horizontales (viaja en y). */
type ShutterOrientation = "v" | "h";

interface ShutterInstance {
  timeline: gsap.core.Timeline;
  overlay: SVGSVGElement;
  destroy(): void;
}

/** La persiana vertical única (Thesis→ServicesIndex). */
let vertical: ShutterInstance | null = null;

/** Persianas horizontales de capítulo (ProcessRail, FaqIndex). */
const horizontals: ShutterInstance[] = [];

function makeRect(x: number, y: number, w: number, h: number): SVGRectElement {
  const r = document.createElementNS(SVG_NS, "rect");
  r.setAttribute("x", String(x));
  r.setAttribute("y", String(y));
  r.setAttribute("width", String(w));
  r.setAttribute("height", String(h));
  return r;
}

/**
 * Construye el overlay (mask + cover + frente de onda) y lo añade al wrapper.
 * maskId debe ser único en el documento (ver cabecera).
 */
function buildOverlay(
  wrapper: HTMLElement,
  orientation: ShutterOrientation,
  maskId: string,
): {
  svg: SVGSVGElement;
  wave: SVGRectElement;
  firstRects: SVGRectElement[];
  secondRects: SVGRectElement[];
  centers: number[];
  extSize: number;
} {
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
  mask.setAttribute("id", maskId);
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  mask.setAttribute("x", "0");
  mask.setAttribute("y", "0");
  mask.setAttribute("width", String(W));
  mask.setAttribute("height", String(H));

  // Tapa: negro = el cover tapa; las lamas (blancas) le abren huecos.
  const black = makeRect(0, 0, W, H);
  black.style.fill = "#000";
  mask.appendChild(black);

  // Eje principal: en "v" las lamas son columnas (se abren en x, viajan en
  // x); en "h" son filas (se abren en y, viajan en y). La dimensión cruzada
  // de cada lama cubre el wrapper entero (H en "v", W en "h").
  const mainSize = orientation === "v" ? W : H;
  const bladeSize = mainSize / BLADES;
  const halfSize = bladeSize / 2;
  const extSize = halfSize * (1 + SHUTTER.overlap);

  const firstRects: SVGRectElement[] = [];
  const secondRects: SVGRectElement[] = [];
  const centers: number[] = [];
  for (let i = 0; i < BLADES; i++) {
    const center = i * bladeSize + halfSize;
    centers.push(center);
    // Mitad negativa: su borde positivo SIEMPRE en el centro de la lama; el
    // borde negativo es el frente que viaja hacia fuera.
    // Mitad positiva: posición fijada en el centro; su borde positivo viaja
    // hacia fuera. El solape (extSize > halfSize en ambas) cubre la costura.
    const first =
      orientation === "v"
        ? makeRect(center, 0, 0, H) // x = centro, width crece hacia la izquierda
        : makeRect(0, center, W, 0); // y = centro, height crece hacia arriba
    const second =
      orientation === "v"
        ? makeRect(center, 0, 0, H) // x fijo en el centro, width crece a la derecha
        : makeRect(0, center, W, 0); // y fijo en el centro, height crece abajo
    for (const r of [first, second]) {
      r.style.fill = "#fff";
      r.setAttribute("shape-rendering", "crispEdges");
      mask.appendChild(r);
    }
    firstRects.push(first);
    secondRects.push(second);
  }
  defs.appendChild(mask);
  svg.appendChild(defs);

  // Cover: el fondo de página tapando el contenido; la máscara le abre las
  // lamas. fill por style (var() no funciona en atributos SVG).
  const cover = makeRect(0, 0, W, H);
  cover.style.fill = "var(--color-bg)";
  cover.setAttribute("mask", `url(#${maskId})`);
  svg.appendChild(cover);

  // Frente de onda: la línea ámbar viaja al ritmo del stagger (la línea ES la
  // persiana, dirección C): vertical de izquierda a derecha, horizontal de
  // arriba a abajo.
  const wave =
    orientation === "v"
      ? makeRect(0, 0, SHUTTER.waveWidth, H)
      : makeRect(0, 0, W, SHUTTER.waveWidth);
  wave.style.fill = "var(--color-primary)";
  svg.appendChild(wave);

  wrapper.appendChild(svg);
  return { svg, wave, firstRects, secondRects, centers, extSize };
}

/** Pin + timeline scrubbed de las lamas (comportamiento común, eje parametrizado). */
function mountShutter(
  wrapper: HTMLElement,
  orientation: ShutterOrientation,
  maskId: string,
): ShutterInstance | null {
  if (!window.matchMedia(SHUTTER.lgQuery).matches) return null;
  const W = wrapper.offsetWidth;
  const H = wrapper.offsetHeight;
  if (W === 0 || H === 0) return null;

  const { svg, wave, firstRects, secondRects, centers, extSize } = buildOverlay(
    wrapper,
    orientation,
    maskId,
  );

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: wrapper,
      start: "top top",
      end: SHUTTER.pinDistance,
      pin: true,
      scrub: SHUTTER.scrub,
      anticipatePin: 1,
      // Id solo en la vertical: hscroll.ts alinea su pin con este unpin.
      ...(orientation === "v" ? { id: "shutter-v" } : {}),
      // Al volver a entrar en el rango (scroll hacia atrás tras haber
      // completado) el overlay vuelve: el scrub inverso cierra las lamas.
      onEnterBack: () => {
        svg.style.display = "";
      },
    },
    // Ocultar el overlay SOLO cuando el scrub completa (progress 1), nunca en
    // onLeave: con scrub el playhead va con retraso y ocultar antes del
    // catch-up cortaría lamas a medio abrir (ver cabecera).
    onComplete: () => {
      svg.style.display = "none";
    },
  });

  const bladeEase = "power2.inOut";
  // Lamas: pares centro-fuera, stagger 0.02 en el orden del frente de onda
  // (izq→der en v, arriba→abajo en h). La mitad negativa mueve posición y
  // tamaño en el MISMO tween (su borde positivo queda clavado en el centro
  // de la lama); la positiva solo tamaño (posición fijada en el centro).
  // Valores function-based/absolutos: los relativos en timelines scrubbed
  // dependen del orden de resolución.
  if (orientation === "v") {
    tl.to(
      firstRects,
      {
        attr: { x: (i: number) => centers[i] - extSize, width: extSize },
        duration: SHUTTER.bladeDur,
        ease: bladeEase,
        stagger: { each: SHUTTER.stagger },
      },
      0,
    );
    tl.to(
      secondRects,
      {
        attr: { width: extSize },
        duration: SHUTTER.bladeDur,
        ease: bladeEase,
        stagger: { each: SHUTTER.stagger },
      },
      0,
    );
  } else {
    tl.to(
      firstRects,
      {
        attr: { y: (i: number) => centers[i] - extSize, height: extSize },
        duration: SHUTTER.bladeDur,
        ease: bladeEase,
        stagger: { each: SHUTTER.stagger },
      },
      0,
    );
    tl.to(
      secondRects,
      {
        attr: { height: extSize },
        duration: SHUTTER.bladeDur,
        ease: bladeEase,
        stagger: { each: SHUTTER.stagger },
      },
      0,
    );
  }

  // Overshoot 1.06 SOLO en el último grupo de lamas (las 2 últimas, donde
  // aterriza el frente de onda): suben un 6% su tamaño final y se asientan.
  // Valores absolutos por rect.
  const mainEnd = (BLADES - 1) * SHUTTER.stagger + SHUTTER.bladeDur;
  const overSize = extSize * OVERSHOOT;
  for (let b = BLADES - 2; b < BLADES; b++) {
    const first = firstRects[b];
    const second = secondRects[b];
    if (orientation === "v") {
      tl.to(first, { attr: { x: centers[b] - overSize, width: overSize }, duration: SHUTTER.overshootDur, ease: "power2.out" }, mainEnd);
      tl.to(second, { attr: { width: overSize }, duration: SHUTTER.overshootDur, ease: "power2.out" }, mainEnd);
      tl.to(first, { attr: { x: centers[b] - extSize, width: extSize }, duration: SHUTTER.overshootDur, ease: "power2.inOut" }, mainEnd + SHUTTER.overshootDur);
      tl.to(second, { attr: { width: extSize }, duration: SHUTTER.overshootDur, ease: "power2.inOut" }, mainEnd + SHUTTER.overshootDur);
    } else {
      tl.to(first, { attr: { y: centers[b] - overSize, height: overSize }, duration: SHUTTER.overshootDur, ease: "power2.out" }, mainEnd);
      tl.to(second, { attr: { height: overSize }, duration: SHUTTER.overshootDur, ease: "power2.out" }, mainEnd);
      tl.to(first, { attr: { y: centers[b] - extSize, height: extSize }, duration: SHUTTER.overshootDur, ease: "power2.inOut" }, mainEnd + SHUTTER.overshootDur);
      tl.to(second, { attr: { height: extSize }, duration: SHUTTER.overshootDur, ease: "power2.inOut" }, mainEnd + SHUTTER.overshootDur);
    }
  }

  // Frente de onda: cruza el wrapper al ritmo del stagger (lineal, sincronizado
  // con la cascada de lamas) y se desvanece al asentarse el último grupo.
  const total = mainEnd + SHUTTER.overshootDur * 2;
  if (orientation === "v") {
    tl.to(wave, { attr: { x: W - SHUTTER.waveWidth }, duration: mainEnd, ease: "none" }, 0);
  } else {
    tl.to(wave, { attr: { y: H - SHUTTER.waveWidth }, duration: mainEnd, ease: "none" }, 0);
  }
  tl.to(wave, { autoAlpha: 0, duration: SHUTTER.waveFade, ease: "power1.out" }, total - SHUTTER.waveFade);

  return {
    timeline: tl,
    overlay: svg,
    destroy(): void {
      tl.scrollTrigger?.kill();
      tl.kill();
      svg.remove();
    },
  };
}

/**
 * Monta la persiana vertical única ([data-shutter]). Idempotente: destruye lo
 * anterior antes de montar (la ruta nueva trae DOM nuevo). Se llama en la
 * condición compuesta lg + no-preference del matchMedia de index.ts,
 * registrada ANTES que la rama general y antes del hscroll (ver cabecera).
 * matchMedia revierte el pin limpiamente al cruzar lg (móvil sin persiana).
 */
export function initShutter(): void {
  destroyShutter();
  const wrapper = document.querySelector<HTMLElement>("[data-shutter]");
  if (wrapper === null) return;
  vertical = mountShutter(wrapper, "v", "ll-shutter-mask-v");
}

/** Limpieza de la persiana vertical. Idempotente. */
export function destroyShutter(): void {
  vertical?.destroy();
  vertical = null;
}

/**
 * Monta las persianas HORIZONTALES de capítulo (todas las [data-shutter-h]:
 * entradas a ProcessRail y FaqIndex). Idempotente. Se llama en la misma rama
 * lg + no-preference, DESPUÉS de initShutter() e initHScroll() (orden de
 * página: sus pins miden con los spacers previos ya contabilizados).
 */
export function initShuttersH(): void {
  destroyShuttersH();
  document.querySelectorAll<HTMLElement>("[data-shutter-h]").forEach((wrapper, i) => {
    const instance = mountShutter(wrapper, "h", `ll-shutter-mask-h-${i}`);
    if (instance !== null) horizontals.push(instance);
  });
}

/** Limpieza de las persianas horizontales. Idempotente. */
export function destroyShuttersH(): void {
  horizontals.forEach((instance) => instance.destroy());
  horizontals.length = 0;
}
