/**
 * Lenis smooth scroll wired to the GSAP ticker (docs/motion-plan.md, section 4).
 *
 * ScrollSmoother is discarded on purpose: Lenis is already a dependency, plays better
 * with SSR/MPA and is the tool measured on trionn.com. Under
 * `prefers-reduced-motion: reduce` no instance is ever created.
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
}

/** Tears the singleton down so a route swap can re-init cleanly. Idempotent. */
export function destroySmoothScroll(): void {
  if (lenis === null) return;
  if (tickerFn !== null) {
    gsap.ticker.remove(tickerFn);
    tickerFn = null;
  }
  lenis.destroy();
  lenis = null;
}

/**
 * Scrolls to an in-page anchor. Uses Lenis when active, native smooth scroll as
 * fallback (instant under reduced motion).
 */
export function scrollToAnchor(target: string): void {
  const el = document.querySelector<HTMLElement>(target);
  if (el === null) return;
  if (lenis !== null) {
    lenis.scrollTo(el);
    return;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}
