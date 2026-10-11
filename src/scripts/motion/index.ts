/**
 * F0 motion orchestrator (docs/motion-plan.md, section 4).
 *
 * Responsibilities: register plugins, register the reveal easing and hold the
 * gsap.matchMedia() structure that every phase hooks into. F2 (text reveals),
 * F3-v2 (master line system, image line-wipes and the single line-native
 * shutter pin) are wired below; micro-interactions (F4) fill the remaining
 * TODO hooks and their modules (marquee, magnetic, preloader), which are
 * already in place as documented stubs.
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
import { EASE_REVEAL_PATH } from "./tokens";

gsap.registerPlugin(ScrollTrigger, CustomEase, SplitText, DrawSVGPlugin);

// "ll-reveal" is the GSAP twin of EASE_REVEAL (cubic-bezier(0.16, 1, 0.3, 1)).
// The SVG path below is the standard approximation of power4.out used by reveals.
CustomEase.create("ll-reveal", EASE_REVEAL_PATH);

let media: gsap.MatchMedia | null = null;

/** Drops everything created by the previous init (matchMedia contexts revert). */
function resetMotion(): void {
  // destroyTextReveal()/destroyLineSystem()/destroyImageReveal() van ANTES de
  // media.revert(): matchMedia.revert() no revierte mutaciones DOM
  // (wrappers/mascaras de SplitText, textContent de las cifras, anillos y
  // lineas guia creados por JS) y sin estos reverts explicitos habria fugas
  // entre navegaciones VT (text-reveal.ts, line-system.ts, image-reveal.ts).
  destroyTextReveal();
  destroyLineSystem();
  destroyImageReveal();
  if (media !== null) {
    media.revert();
    media = null;
  }
  destroySmoothScroll();
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

  media = gsap.matchMedia();

  // 1) Full experience: smooth scroll, F2 text reveals, F3-v2 line system and
  //    image line-wipes. F4 hooks below.
  media.add("(prefers-reduced-motion: no-preference)", () => {
    initSmoothScroll();
    // Orden determinista (motion-plan.md, section 6): Lenis primero, textos
    // despues; el UNICO ScrollTrigger.refresh() del ciclo lo dispara initMotion.
    initTextReveal();
    // F3-v2: sistema de línea maestra (cometa por secciones, driver único del
    // rail, count-up de Proof) — line-system.ts. Despues de los textos: el
    // orden determinista lo fija motion-plan.md, section 6.
    initLineSystem();
    // F3-v2 tanda 2: line-wipe de las imagenes de servicio — image-reveal.ts.
    // Despues del sistema de linea y de la persiana: sus triggers necesitan el
    // pin ya creado para pinnedContainer (ver image-reveal.ts).
    initImageReveal();
    // TODO(F4): marquee, preloader -> marquee.ts / preloader.ts
    // Cleanup del contexto: gsap.matchMedia ejecuta este return al revertirlo,
    // tambien en el toggle en vivo a reduce (aun sin media.revert()). Sin esta
    // llamada, las mascaras DOM de SplitText, el listener de resize, los
    // anillos y las lineas guia creados por JS quedarian vivos hasta el
    // proximo init. Los destroy son idempotentes (refs a null, Map/Set
    // vacios), asi que el doble call con el destroy explicito de resetMotion()
    // es inocuo.
    return () => {
      destroyTextReveal();
      destroyLineSystem();
      destroyImageReveal();
    };
  });

  // Reduced motion: no smooth scroll, no shutter, no marquee. Content stays
  // complete and reachable. A PROPOSITO no hay split ni desplazamiento: la
  // ocultacion inicial solo existe en la rama no-preference (la pone el script,
  // nunca el CSS), asi que aqui el contenido se ve en su estado final.
  media.add("(prefers-reduced-motion: reduce)", () => {
    // Intentionally empty: F2 adds nothing here (no SplitText at all).
  });

  // Fine pointer only: magnetic CTAs and hover rolls never run on touch.
  media.add("(hover: hover) and (pointer: fine)", () => {
    // TODO(F4): magnetic CTAs + hover rolls -> magnetic.ts
  });

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
