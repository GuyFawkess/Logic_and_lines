/**
 * Lenis smooth scroll wired to the GSAP ticker (docs/motion-plan.md, section 4).
 *
 * ScrollSmoother is discarded on purpose: Lenis is already a dependency, plays better
 * with SSR/MPA and is the tool measured on trionn.com. Under
 * `prefers-reduced-motion: reduce` no instance is ever created.
 *
 * R6 (2026-10-15): sin sistema de fronteras no hay teleports ni re-encuadre
 * de aterrizajes (jumpTo / isAnchorFlight / onAnchorSettle ELIMINADOS junto a
 * shutter.ts). Las anclas son NÚMERICAS y estables: lenis.scrollTo(number)
 * nunca persigue el rect de un elemento pineado. Destinos:
 *   - #servicios → hscroll.start (el pin engancha exactamente al llegar);
 *   - #proceso   → hscroll.end   (el slide de salida acaba AQUÍ: Proceso
 *                  revelado a viewport completo, rail a punto de arrancar);
 *   - el resto (#razones/#faq/#booking) → top natural (offsetParents: desde
 *     R6 no hay pin-spacers intermedios que sortear).
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

let lenis: Lenis | null = null;
let tickerFn: ((time: number) => void) | null = null;

/** Creates the Lenis singleton and hooks it to gsap.ticker. Idempotent. */
export function initSmoothScroll(): void {
  if (lenis !== null) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  lenis = new Lenis({ autoRaf: false });
  // ScrollTrigger must track Lenis-driven scroll position.
  lenis.on("scroll", ScrollTrigger.update);
  // Lenis.raf() takes milliseconds, gsap.ticker passes seconds.
  tickerFn = (time: number): void => {
    lenis?.raf(time * 1000);
  };
  gsap.ticker.add(tickerFn);
  gsap.ticker.lagSmoothing(0);

  // Anclas de la MISMA página vía scrollToAnchor (ver onAnchorClick).
  document.addEventListener("click", onAnchorClick, true);

  // Aterrizaje con hash en la URL (carga directa /#faq, vuelta atrás, VT con
  // hash): el navegador nativo ya hizo el scroll al fragmento al parsear la
  // URL; lo RE-LANZAMOS por la misma ruta que un click para que el objetivo
  // sea numérico y estable (pins). El tick de espera cubre el caso de que el
  // ScrollTrigger "hscroll" aún no existiera (en la práctica ya existe: la
  // rama lg+no-preference corre ANTES que esta en initMotion).
  if (window.location.hash !== "" && document.querySelector(window.location.hash) !== null) {
    const hash = window.location.hash;
    window.setTimeout(() => scrollToAnchor(hash), 50);
  }
}

/** Tears the singleton down so a route swap can re-init cleanly. Idempotent. */
export function destroySmoothScroll(): void {
  // El delegado de anclas vive con la instancia Lenis.
  document.removeEventListener("click", onAnchorClick, true);
  if (lenis === null) return;
  if (tickerFn !== null) {
    gsap.ticker.remove(tickerFn);
    tickerFn = null;
  }
  lenis.destroy();
  lenis = null;
}

/**
 * R6: objetivo NUMÉRICO de un ancla intra-página (lenis.scrollTo(number):
 * estable — la alternativa `lenis.scrollTo(el,…)` perseguía el rect.top de un
 * elemento pineado/transformado, con overshoot impredecible).
 */
function computeAnchorTarget(el: HTMLElement): number {
  const hs = ScrollTrigger.getById("hscroll");
  if (hs !== null && hs !== undefined) {
    if (el.id === "servicios") return Math.round(hs.start);
    if (el.id === "proceso") return Math.round(hs.end);
  }
  // Fallback natural (anclas sin pin, reduced-motion o <lg): ascender
  // offsetParents hasta body. El scroll-margin-top del browser lo aplica el
  // vuelo nativo; con Lenis se respeta restando el margen medido.
  let top = 0;
  for (let n: HTMLElement | null = el; n !== null && n !== document.body; ) {
    top += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  return Math.round(top - margin);
}

/**
 * Snap instantáneo al completar el vuelo: Lenis puede asentar a ±1px del
 * target con su lerp/easing por defecto. Un segundo scrollTo immediate: true
 * corrige la deriva antes de soltar.
 */
function snapScroll(y: number): void {
  if (lenis !== null) {
    lenis.scrollTo(y, { immediate: true, force: true });
  } else {
    window.scrollTo(0, y);
  }
  ScrollTrigger.update();
}

/**
 * Scrolls to an in-page anchor. Uses Lenis when active, native smooth scroll as
 * fallback (instant under reduced motion). R6: objetivo numérico vía
 * computeAnchorTarget (ver cabecera) — sin marcas de vuelo ni settles: no hay
 * fronteras que teleporten a mitad de trayecto.
 */
export function scrollToAnchor(target: string): void {
  const el = document.querySelector<HTMLElement>(target);
  if (el === null) return;
  if (lenis !== null) {
    const targetY = computeAnchorTarget(el);
    lenis.scrollTo(targetY, {
      onComplete: () => {
        // Snap exacto: mata la deriva de lerp/easing de Lenis.
        snapScroll(targetY);
      },
    });
    return;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

/**
 * Delegado de clicks en anclas de la MISMA página. Ruteados por
 * scrollToAnchor: Lenis manda el scroll (un salto nativo desincroniza su
 * targetScroll) y el objetivo es el número estable del pin. `href="#"` vacío
 * y enlaces a OTRAS rutas (prefijo de home en subpáginas) quedan como
 * estaban. preventDefault en CAPTURA: el ClientRouter de Astro ignora el
 * evento (defaultPrevented) y no re-scrolla por su cuenta.
 */
function onAnchorClick(event: MouseEvent): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  const target = event.target as Element | null;
  const link = target?.closest("a[href]") ?? null;
  if (link === null) return;
  const href = link.getAttribute("href") ?? "";
  if (href === "" || !href.startsWith("#") || href === "#") return;
  if (document.querySelector(href) === null) return;
  event.preventDefault();
  // Deep-link consistente: el hash queda en la URL. Se conserva history.state
  // (el ClientRouter de Astro guarda índice/scroll ahí: machacarlo con null
  // rompería la restauración de scroll en back/forward). pushState no navega.
  try {
    history.pushState(history.state, "", href);
  } catch {
    /* entorno sin history disponible: el scroll importa, el hash no */
  }
  scrollToAnchor(href);
}
