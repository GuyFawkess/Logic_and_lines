/**
 * F0 motion orchestrator (docs/motion-plan.md, section 4).
 *
 * Responsibilities: register plugins, register the reveal easing and hold the
 * gsap.matchMedia() structure that every phase hooks into. F2 (text reveals),
 * F3-v2 (master line system, image line-wipes, the line-native shutter pin and
 * the BookingClose peak with its own circuit driver) and F4 (preloader with
 * reveal gating, velocity-reactive marquee, hover char rolls, live Lanzarote
 * time) are wired below; magnetic.ts remains the only documented stub (F5
 * decides whether magnetic CTAs enter the plan).
 *
 * The module is loaded from a processed <script> in Layout.astro, so it survives
 * ClientRouter navigations as a single instance and re-runs its setup through the
 * astro:page-load / astro:after-swap events below.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { destroySmoothScroll, initSmoothScroll } from "./smooth-scroll";
import { destroyTextReveal, initTextReveal } from "./text-reveal";
import { destroyLineSystem, initLineSystem } from "./line-system";
import { destroyImageReveal, initImageReveal } from "./image-reveal";
import { destroyShutter, destroyShuttersH, initShutter, initShuttersH } from "./shutter";
import { destroyHScroll, getScrollTween, initHScroll } from "./hscroll";
import { destroyCircuit, initCircuit } from "./circuit";
import { destroyPreloader, runPreloader } from "./preloader";
import { destroyMarquee, initMarquee } from "./marquee";
import { destroyHoverRoll, initHoverRoll } from "./hover-roll";
import { destroyLocalTime, initLocalTime } from "./local-time";
import { EASE_REVEAL_PATH } from "./tokens";

gsap.registerPlugin(ScrollTrigger, CustomEase, SplitText, DrawSVGPlugin);

// "ll-reveal" is the GSAP twin of EASE_REVEAL (cubic-bezier(0.16, 1, 0.3, 1)).
// The SVG path below is the standard approximation of power4.out used by reveals.
CustomEase.create("ll-reveal", EASE_REVEAL_PATH);

let media: gsap.MatchMedia | null = null;

/**
 * true solo hasta el primer initMotion del documento: el preloader (y su
 * gating de reveals) corre UNA vez por carga completa; las navegaciones del
 * ClientRouter (VT) y las recargas de ruta no lo ven. Flag de módulo a
 * propósito — NO sessionStorage (regla del brief F4).
 */
let firstDocumentLoad = true;

/** Drops everything created by the previous init (matchMedia contexts revert). */
function resetMotion(): void {
  // destroyTextReveal()/destroyLineSystem()/destroyImageReveal()/
  // destroyShutter()/destroyShuttersH()/destroyHScroll()/destroyCircuit()/
  // destroyMarquee()/destroyHoverRoll() van ANTES de media.revert():
  // matchMedia.revert() no revierte mutaciones DOM (wrappers/mascaras de
  // SplitText, textContent de las cifras, anillos y lineas guia creados por
  // JS, overlays SVG de las persianas, layout horizontal del track, viajero
  // del circuito, clones y estilos inline de la marquee, capas del roll)
  // y sin estos reverts explicitos habria fugas entre navegaciones VT
  // (text-reveal.ts, line-system.ts, image-reveal.ts, shutter.ts, hscroll.ts,
  // circuit.ts, marquee.ts, hover-roll.ts). destroyLocalTime() libera el
  // intervalo de la hora; destroyPreloader() el overlay de la primera carga.
  destroyTextReveal();
  destroyLineSystem();
  destroyImageReveal();
  destroyShutter();
  destroyShuttersH();
  destroyHScroll();
  destroyCircuit();
  destroyMarquee();
  destroyHoverRoll();
  destroyLocalTime();
  if (media !== null) {
    media.revert();
    media = null;
  }
  destroySmoothScroll();
  destroyPreloader();
}
/**
 * Construye el setup de motion. Se llama UNA VEZ en la carga inicial (directo
 * desde el script del Layout, antes de window load: sin flash de texto visible)
 * y luego una vez por navegacion del ClientRouter (astro:page-load, con el flag
 * de after-swap ya puesto). Debe seguir siendo idempotente: reset del estado
 * previo y init.
 */
export function initMotion(): void {
  resetMotion();

  // Hora viva de Lanzarote (F4): contenido, no animación — corre en TODAS las
  // ramas (reduced-motion incluida), fuera del matchMedia. Sin-JS queda la
  // hora del build (fallback aceptable, ver local-time.ts).
  initLocalTime();

  // Gating del preloader (F4, técnica 11 del catálogo): SOLO primera carga del
  // documento (flag de módulo, NO sessionStorage). runPreloader crea el
  // overlay de forma síncrona (tapar antes del primer paint de reveals) y
  // devuelve la promesa que libera las reveals AL EMPEZAR la salida del
  // overlay (el hero entra con la pantalla aún abriéndose). Reduced-motion
  // resuelve la promesa al instante sin overlay (dentro de runPreloader).
  // Las navegaciones VT nunca llegan aquí con el flag en true: su init viene
  // de astro:page-load tras un after-swap.
  let revealGate: Promise<void> | null = null;
  if (firstDocumentLoad) {
    revealGate = runPreloader();
    firstDocumentLoad = false;
  }

  media = gsap.matchMedia();

  // 1) Gramática de capítulos (F4-t2): los 4 primeros pins de la página, en
  //    ORDEN DE PÁGINA — persiana vertical Thesis→Services (pin 1), scroll
  //    horizontal de servicios (pin 2, anidado en el wrapper de la persiana:
  //    su start lee el end de "shutter-v"), persianas horizontales de
  //    ProcessRail y FaqIndex (pins 3-4). El refresh corre en orden de
  //    creación y así cada pin-spacer queda contabilizado al posicionar los
  //    triggers siguientes (fuente GSAP). El quinto pin es el pico peak-end
  //    de BookingClose (circuit.ts, ÚLTIMO en la rama general). matchMedia
  //    revierte los pins limpiamente al cruzar lg (móvil sin nada de esto),
  //    por eso la condición es compuesta y no un check manual.
  media.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
    initShutter();
    initHScroll();
    initShuttersH();
    return () => {
      destroyHScroll();
      destroyShuttersH();
      destroyShutter();
    };
  });

  // 2) Full experience: smooth scroll, F2 text reveals, F3-v2 line system and
  //    image line-wipes, F4 marquee velocity-reactive.
  media.add("(prefers-reduced-motion: no-preference)", () => {
    initSmoothScroll();
    // F4: marquee velocity-reactive (técnica 8) — no depende de triggers al
    // load: puede montar sin esperar al preloader.
    initMarquee();
    // Gating F4 (técnica 11): en la primera carga, las reveals NO arrancan
    // hasta que el preloader empieza a salir. Lenis/pins/marquee ya montaron
    // arriba. El guard `disposed` cubre el hueco asíncrono: si el contexto se
    // revierte antes de que la promesa resuelva (navegación VT durante el
    // preloader, toggle a reduce), los inits en vuelo se descartan y no
    // quedan huérfanos fuera del contexto.
    let disposed = false;
    const startReveals = (): void => {
      if (disposed) return;
      initTextReveal();
      // F3-v2: sistema de línea maestra (cometa por secciones, driver único
      // del rail, count-up de Proof) — line-system.ts. Despues de los textos:
      // el orden determinista lo fija motion-plan.md, section 6.
      initLineSystem();
      // F3-v2 tanda 2: line-wipe de las imagenes de servicio — image-reveal.ts.
      // Despues del sistema de linea. En desktop recibe el tween del hscroll
      // (containerAnimation: wipes al entrar cada panel por la derecha); en
      // movil recibe null (scrub vertical). Ambos modos scrub/reversibles
      // (politica rewind F4-t2).
      initImageReveal(getScrollTween());
      // F3-v2 tanda 3 (pico peak-end): cierre de circuito en BookingClose —
      // circuit.ts. ULTIMO de la rama: su pin es el de la seccion mas baja con
      // triggers de la pagina, asi que el refresh en orden de creacion lo mide
      // con el pin-spacer de la persiana ya contabilizado, y ningun trigger
      // posterior necesita el suyo (tras BookingClose solo queda el footer).
      // Montarse ASINCRONAMENTE (tras el preloader) es seguro por lo mismo:
      // su pin-spacer se inserta por DEBAJO de todos los triggers ya medidos,
      // y el ScrollTrigger.refresh() final de este ciclo ya corrió — cada
      // trigger nuevo se auto-mide al crearse.
      initCircuit();
    };
    if (revealGate !== null) {
      revealGate.then(startReveals);
    } else {
      startReveals();
    }
    // Cleanup del contexto: gsap.matchMedia ejecuta este return al revertirlo,
    // tambien en el toggle en vivo a reduce (aun sin media.revert()). Sin esta
    // llamada, las mascaras DOM de SplitText, el listener de resize, los
    // anillos y las lineas guia creados por JS, y el Lenis del smooth scroll
    // quedarian vivos hasta el proximo init. El flag disposed (arriba) cubre
    // el caso de revertirse ANTES de que el preloader libere las reveals.
    // Los destroy son idempotentes (refs a null, Map/Set vacios), asi que el
    // doble call con el destroy explicito de resetMotion() es inocuo.
    // destroyShutter()/destroyShuttersH()/destroyHScroll() NO van aqui: viven
    // en su rama compuesta lg + no-preference, que trae su propio cleanup
    // (arriba) y se revierte junto con esta rama.
    return () => {
      disposed = true;
      destroyTextReveal();
      destroyLineSystem();
      destroyImageReveal();
      destroyCircuit();
      destroySmoothScroll();
    };
  });

  // Reduced motion: no smooth scroll, no shutter, no marquee, no preloader,
  // no hover roll. Content stays complete and reachable. A PROPOSITO no hay
  // split ni desplazamiento: la ocultacion inicial solo existe en la rama
  // no-preference (la pone el script, nunca el CSS), asi que aqui el
  // contenido se ve en su estado final. La hora viva (initLocalTime) corre
  // fuera de las ramas: es contenido, no animación.
  media.add("(prefers-reduced-motion: reduce)", () => {
    // Intentionally empty: F2 adds nothing here (no SplitText at all).
  });

  // Fine pointer only: hover roll de chars (F4, técnica 9) en CTAs/links.
  // Condición compuesta con no-preference: reduced-motion = texto normal
  // (regla del brief). El magnetic (stub magnetic.ts) decide en F5 si entra.
  media.add(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    () => {
      initHoverRoll();
      return () => {
        destroyHoverRoll();
      };
    },
  );

  // UN ScrollTrigger.refresh() final por ciclo de init (motion-plan.md,
  // section 6): medicion compartida tras montar todo en orden determinista.
  // Nunca setTimeout(0) (leccion Lenis+pins).
  ScrollTrigger.refresh();
}

// ClientRouter events (fuente: node_modules/astro/dist/transitions/router.js):
// astro:page-load se dispara EN LA CARGA INICIAL (window load) y tras cada swap;
// astro:after-swap SOLO en navegaciones y SIEMPRE antes que page-load. El init
// temprano de la carga inicial ya lo hizo el script del Layout, asi que el flag
// de swap evita el segundo init (que truncaba el reveal del hero al matar el
// tween en vuelo y re-splitear con el WeakMap ya marcado).
let didSwap = false;

document.addEventListener("astro:page-load", () => {
  // Carga inicial: after-swap no llego, flag en false -> ya inicializado.
  if (!didSwap) return;
  didSwap = false;
  initMotion();
});

document.addEventListener("astro:after-swap", () => {
  didSwap = true;
  // Libera el estado ligado al DOM viejo; el init lo hara el page-load siguiente.
  resetMotion();
});
