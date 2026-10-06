// Hora local de Lanzarote (Atlantic/Canary) para el cierre y el footer.
// Se calcula en el render de cada página (frontmatter SSR).
export function formatLanzaroteTime(lang: "es" | "en" = "es"): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "es-ES", {
    timeZone: "Atlantic/Canary",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}
