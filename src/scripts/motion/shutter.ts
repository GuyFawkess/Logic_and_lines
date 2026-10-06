/**
 * The shutter: route transitions built from vertical belts - phase F3.
 *
 * Spec: overlay with BELTS / BELTS_MOBILE belts, scaleY with alternating
 * transform-origin, COVER -> HOLD -> REVEAL phases from tokens.ts, plus a solid
 * fill layer under the belts (they never cover 100% by themselves). Applies to
 * route changes and to opening the booking CTA only, never between scroll
 * sections. Built on top of Astro View Transitions
 * (astro:before-swap / astro:after-swap) (docs/motion-plan.md, section 4).
 */
export function initShutter(): void {
  // TODO(F3): belt overlay skin over the ClientRouter swap, using EASE_SHUTTER,
  // COVER/HOLD/REVEAL and OVERSHOOT. pointer-events none and no will-change at idle.
}
