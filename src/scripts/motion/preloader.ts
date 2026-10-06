/**
 * Short entrance preloader - phase F4.
 *
 * Spec: <= 1.2s, skippable, first visit only (sessionStorage) so LCP is not hurt,
 * hero SSR content visible underneath (docs/motion-plan.md, sections 5-6).
 */
export function initPreloader(): void {
  // TODO(F4): short skippable entrance, skipped on repeat visits.
}
