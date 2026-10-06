/**
 * Motion tokens for the v4 "La Linea Maestra" system.
 *
 * Single source of truth for easings, durations and staggers. Values come from
 * docs/motion-plan.md (section 4) and are adapted from the transition measured on
 * trionn.com (see docs/research-v4): we keep the feel, not their numbers.
 */

/**
 * Reveal easing (CSS form). Its GSAP counterpart is the CustomEase "ll-reveal"
 * registered in index.ts from EASE_REVEAL_PATH: a power4.out approximation.
 */
export const EASE_REVEAL = "cubic-bezier(0.16, 1, 0.3, 1)";

/** SVG path used to register the CustomEase "ll-reveal" (GSAP side of EASE_REVEAL). */
export const EASE_REVEAL_PATH = "M0,0 C0.16,1 0.3,1 1,1";

/**
 * Shutter belt easing. Softened `back.out` so belts overshoot slightly and settle
 * (Trionn's belts overshoot harder with elastic; 1.4 is the sober adaptation).
 */
export const EASE_SHUTTER = "back.out(1.4)";

/** Durations, in seconds. */
export const DUR = {
  /** Hovers and micro-interactions. */
  fast: 0.4,
  /** Standard reveals (text, images). */
  base: 0.8,
  /** Hero and other big moments. */
  slow: 1.2,
} as const;

/** Staggers, in seconds. */
export const STAGGER = {
  /** Between split lines (desktop). */
  text: 0.06,
  /** Between split lines (mobile). */
  textMobile: 0.04,
  /** Between shutter belts. */
  belt: 0.055,
} as const;

/*
 * Shutter (route transition) constants. Trionn runs 10 horizontal belts with a
 * ~820ms cover / ~475ms hold / ~700ms reveal cycle (overshoot 1.10). Ours is leaner
 * and vertical so the belts read as segments of "La Linea Maestra": fewer belts,
 * shorter phases, lighter overshoot (see docs/motion-plan.md, section 4).
 */

/** Vertical belts on desktop. */
export const BELTS = 6;

/** Vertical belts on mobile. */
export const BELTS_MOBILE = 4;

/** COVER phase (s): belts scale 0 -> 1 with overshoot, cascaded. */
export const COVER = 0.75;

/** HOLD phase (s): screen stays covered while the content swaps underneath. */
export const HOLD = 0.35;

/** REVEAL phase (s): belts scale 1 -> 0 in inverse direction, no undershoot. */
export const REVEAL = 0.6;

/** scaleY overshoot during COVER (1.06 vs the measured 1.10 on Trionn). */
export const OVERSHOOT = 1.06;
