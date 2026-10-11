/**
 * Preloader corto de línea (F4) — técnica 11 del catálogo
 * (docs/research-v4/2026-10-11-catalogo-motion-trionn.md): contador + la línea
 * maestra dibujándose; al completar, el overlay se levanta (yPercent -100) y
 * el hero arranca. Aquí NACE la línea maestra: es el primer trazo ámbar del
 * documento.
 *
 * Reglas del brief (docs/motion-plan.md §F4):
 * - Markup creado ÍNTEGRAMENTE por JS (regla de oro: sin-JS = sin preloader,
 *   contenido visible; el HTML estático no contiene ni un nodo del overlay).
 * - SOLO primera carga del documento: el gating vive en index.ts con un flag
 *   de módulo (NO sessionStorage: cada recarga completa lo muestra; las
 *   navegaciones del ClientRouter nunca, porque su init llega por
 *   astro:page-load con el flag de swap ya consumido).
 * - Reduced-motion: sin preloader (init directo como hoy).
 * - LCP: el overlay es position:fixed sobre el contenido ya pintado; no
 *   retrasa ninguna carga (cap total 1.4s + 0.7s).
 * - Hard-cap 2.5s: si algo se atasca (p.ej. el ticker), el overlay se quita
 *   igual y se continúa — failsafe NO silencioso (console.warn).
 *
 * Gating: la promesa se resuelve cuando la SALIDA del overlay EMPIEZA (no al
 * terminar): index.ts arranca las reveals en ese momento para que el hero
 * entre mientras la pantalla aún se abre (feel trionn, técnica 11: "la
 * pantalla se abre y arranca el hero"). La eliminación del DOM ocurre al
 * completar la salida, en el onComplete del timeline.
 */
import gsap from "gsap";
import { PRELOADER } from "./tokens";

/** Timeline vivo del preloader (para el failsafe y destroyPreloader). */
let timeline: gsap.core.Timeline | null = null;
/** Timeout del hard-cap. */
let failsafe: ReturnType<typeof setTimeout> | null = null;
/** Resolución pendiente de la promesa de gating (null si no hay ninguna). */
let resolveGate: (() => void) | null = null;
/** true cuando el gating ya se resolvió (o no hacía falta): evita doble resolve. */
let gateResolved = true;

/** Resuelve el gating una sola vez. */
function settleGate(): void {
  if (gateResolved) return;
  gateResolved = true;
  const resolve = resolveGate;
  resolveGate = null;
  resolve?.();
}

/** Quita el overlay del DOM y libera refs. Idempotente. */
function removeOverlay(overlay: HTMLElement | null): void {
  overlay?.remove();
  timeline = null;
  if (failsafe !== null) {
    clearTimeout(failsafe);
    failsafe = null;
  }
}

/**
 * Ejecuta el preloader y devuelve la promesa de gating. Las reveals de la
 * primera carga NO arrancan hasta que esta promesa se resuelve (al empezar la
 * salida del overlay). Idempotente a nivel de documento: index.ts solo lo
 * llama en la primera carga; si se llamara dos veces, la segunda devuelve una
 * promesa ya resuelta sin crear overlay.
 */
export function runPreloader(): Promise<void> {
  // Reduced-motion: sin preloader — init directo como hoy (regla del brief).
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return Promise.resolve();
  }
  // Doble llamada defensiva: sin overlay duplicado, gating inmediato.
  if (timeline !== null || !gateResolved) {
    return Promise.resolve();
  }

  // --- Overlay creado por JS (sin-JS = sin preloader) ---
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  // Marca para destroyPreloader: el overlay vive fuera de matchMedia, así que
  // su limpieza no puede depender de selectores de contenido.
  overlay.setAttribute("data-ll-preloader", "");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:90;display:flex;flex-direction:column;" +
    "align-items:center;justify-content:center;gap:1.25rem;background:var(--color-bg);";

  const wordmark = document.createElement("span");
  wordmark.textContent = "Logic & Lines";
  wordmark.style.cssText =
    "font-family:var(--font-display);font-size:clamp(1.5rem,3vw,2.25rem);" +
    "letter-spacing:-0.02em;color:var(--color-text);";

  // La línea maestra NACE aquí: primer trazo ámbar del documento.
  const lineSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  lineSvg.setAttribute("viewBox", "0 0 220 2");
  lineSvg.style.cssText = "width:220px;height:2px;overflow:visible;";
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", "0");
  line.setAttribute("y1", "1");
  line.setAttribute("x2", "220");
  line.setAttribute("y2", "1");
  line.setAttribute("stroke", "var(--color-primary)");
  line.setAttribute("stroke-width", "2");
  lineSvg.appendChild(line);

  // Contador discreto en mono (opcional del brief): tabular-nums para que no
  // baile el ancho.
  const counter = document.createElement("span");
  counter.style.cssText =
    "font-family:var(--font-mono);font-size:0.75rem;" +
    "font-variant-numeric:tabular-nums;color:var(--color-text-dark);";
  counter.textContent = "0";

  overlay.append(wordmark, lineSvg, counter);
  document.body.appendChild(overlay);

  // --- Timeline: ~1.4s línea+contador, luego salida 0.7s ---
  gateResolved = false;
  const progress = { v: 0 };
  const tl = gsap.timeline();
  timeline = tl;

  tl.fromTo(
    wordmark,
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: 0.4, ease: "power1.out" },
    0,
  );
  tl.fromTo(
    line,
    { drawSVG: "0% 0%" },
    {
      drawSVG: "0% 100%",
      duration: PRELOADER.dur,
      ease: "power1.inOut",
    },
    0,
  );
  tl.fromTo(
    progress,
    { v: 0 },
    {
      v: 100,
      duration: PRELOADER.dur,
      ease: "power1.inOut",
      onUpdate: () => {
        counter.textContent = String(Math.round(progress.v));
      },
    },
    0,
  );
  // Salida: el gating se resuelve AL EMPIEZAR (las reveals entran con la
  // pantalla aún abriéndose); el DOM se libera al completar.
  tl.to(overlay, {
    yPercent: -100,
    duration: PRELOADER.exitDur,
    ease: "power4.inOut",
    onStart: settleGate,
    onComplete: () => removeOverlay(overlay),
  });

  // Hard-cap failsafe (NO silencioso): si el timeline se atasca (ticker
  // bloqueado, pestaña en segundo plano con rAF congelado, etc.), el overlay
  // se quita igual y el gating se resuelve para no dejar la página tapada.
  failsafe = setTimeout(() => {
    if (timeline === null) return;
    console.warn(
      "[ll-preloader] hard-cap alcanzado (" +
        String(PRELOADER.hardCap) +
        "s): forzando la salida del overlay.",
    );
    timeline.kill();
    timeline = null;
    removeOverlay(overlay);
    settleGate();
  }, PRELOADER.hardCap * 1000);

  return new Promise<void>((resolve) => {
    resolveGate = resolve;
  });
}

/**
 * Cancela el preloader en curso (resetMotion lo llama: una navegación VT
 * durante el preloader descarta el overlay con el documento viejo). Resuelve
 * el gating pendiente para no colgar promesas; el listener asociado ya tiene
 * su guard de disposed en index.ts. Idempotente.
 */
export function destroyPreloader(): void {
  if (timeline !== null) {
    timeline.kill();
    timeline = null;
  }
  if (failsafe !== null) {
    clearTimeout(failsafe);
    failsafe = null;
  }
  document.querySelectorAll<HTMLDivElement>("[data-ll-preloader]").forEach((el) => {
    el.remove();
  });
  settleGate();
}
