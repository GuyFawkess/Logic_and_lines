/**
 * Hora viva de Lanzarote (F4) — resuelve el flag de F1: la hora se renderiza
 * congelada en el build (formatLanzaroteTime en el frontmatter SSR de
 * SiteFooter.astro y BookingClose.astro) y este módulo la actualiza por JS
 * cada 30s con Intl.DateTimeFormat sobre la zona Atlantic/Canary (el alias
 * IANA correcto de Lanzarote, el mismo que ya usa src/lib/time.ts).
 *
 * Hook: `data-local-time` (+ `data-local-time-lang` = "es"|"en") sobre los
 * `<time>` existentes — sin markup nuevo. Sin-JS: queda la hora del build
 * (fallback aceptable y documentado en los componentes). Reduced-motion:
 * sigue viva (es contenido, no animación — por eso vive FUERA del
 * matchMedia, en initMotion).
 */
let timer: ReturnType<typeof setInterval> | null = null;

/** Actualiza todos los `[data-local-time]` solo si el texto cambia. */
function updateAll(): void {
  document.querySelectorAll<HTMLElement>("[data-local-time]").forEach((el) => {
    const lang = el.dataset.localTimeLang === "en" ? "en-GB" : "es-ES";
    const text = new Intl.DateTimeFormat(lang, {
      timeZone: "Atlantic/Canary",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    if (el.textContent !== text) {
      el.textContent = text;
    }
  });
}

/**
 * Arranca el refresco de la hora. Idempotente: destruye el intervalo previo
 * (initMotion corre por cada navegación VT).
 */
export function initLocalTime(): void {
  destroyLocalTime();
  if (document.querySelector("[data-local-time]") === null) return;
  updateAll();
  // 30s: la hora cambia cada minuto; dos oportunidades por minuto la pican
  // sin despertar el main thread más de lo necesario.
  timer = setInterval(updateAll, 30_000);
}

/** Para el intervalo. Idempotente. */
export function destroyLocalTime(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}
