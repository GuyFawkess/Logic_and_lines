/**
 * F0 motion orchestrator (docs/motion-plan.md, section 4).
 *
 * Responsibilities at F0: register plugins, register the reveal easing and hold the
 * gsap.matchMedia() structure that every later phase hooks into. F2 (text reveals),
 * F3 (shutter/route transitions) and F4 (micro-interactions) fill the TODO hooks
 * below and their modules (text-reveal, shutter, image-reveal, marquee, magnetic,
 * preloader), which are already in place as documented stubs.
 *
 * The module is loaded from a processed <script> in Layout.astro, so it survives
 * ClientRouter navigations as a single instance and re-runs its setup through the
 * astro:page-load / astro:after-swap events below.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { destroySmoothScroll, initSmoothScroll } from "./smooth-scroll";
import { EASE_REVEAL_PATH } from "./tokens";

gsap.registerPlugin(ScrollTrigger, CustomEase);

// "ll-reveal" is the GSAP twin of EASE_REVEAL (cubic-bezier(0.16, 1, 0.3, 1)).
// The SVG path below is the standard approximation of power4.out used by reveals.
CustomEase.create("ll-reveal", EASE_REVEAL_PATH);

let media: gsap.MatchMedia | null = null;

/** Drops everything created by the previous init (matchMedia contexts revert). */
function resetMotion(): void {
  if (media !== null) {
    media.revert();
    media = null;
  }
  destroySmoothScroll();
}

/**
 * Builds the motion setup. Called once from the Layout script and again on every
 * astro:page-load, so it must stay idempotent: reset previous state, then init.
 */
export function initMotion(): void {
  resetMotion();

  media = gsap.matchMedia();

  // Full experience: smooth scroll now, the F2/F3/F4 hooks below in their phases.
  media.add("(prefers-reduced-motion: no-preference)", () => {
    initSmoothScroll();
    // TODO(F2): text reveals (SplitText + line masks) -> text-reveal.ts
    // TODO(F3): shutter + route transitions -> shutter.ts
    // TODO(F4): marquee, image reveals, preloader -> marquee.ts / image-reveal.ts / preloader.ts
  });

  // Reduced motion: no smooth scroll, no shutter, no marquee. Content stays
  // complete and reachable; F2+ may add fades of <= 200ms here.
  media.add("(prefers-reduced-motion: reduce)", () => {
    // Intentionally empty at F0.
  });

  // Fine pointer only: magnetic CTAs and hover rolls never run on touch.
  media.add("(hover: hover) and (pointer: fine)", () => {
    // TODO(F4): magnetic CTAs + hover rolls -> magnetic.ts
  });
}

// ClientRouter events: astro:page-load fires on the first load and after every
// route swap (the DOM is new each time), so the setup is rebuilt from scratch.
// astro:after-swap fires before that with the new DOM already in place, and is
// used to release state bound to the old one. Both only exist because
// <ClientRouter /> is in the Layout head.
document.addEventListener("astro:page-load", () => {
  initMotion();
});

document.addEventListener("astro:after-swap", () => {
  resetMotion();
});
