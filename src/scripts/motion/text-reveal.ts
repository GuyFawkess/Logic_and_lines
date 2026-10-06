/**
 * Text reveals (SplitText with overflow masks) - phase F2.
 *
 * Spec: split by line with a mask (yPercent 110 -> 0), by word for single-line
 * phrases, chars only for link hover rolls. Re-split on document.fonts.ready,
 * debounced resize (200ms, width changes only) and language/route changes.
 * Content must stay visible without JS: the script sets the initial hidden state,
 * never the CSS (docs/motion-plan.md, section 4).
 */
export function initTextReveal(): void {
  // TODO(F2): implement SplitText line/word reveals using EASE_REVEAL and DUR.base.
}
