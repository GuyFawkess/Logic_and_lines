/**
 * Marquee velocity-reactive (F4) — técnica 8 del catálogo
 * (docs/research-v4/2026-10-11-catalogo-motion-trionn.md): la banda acelera,
 * frena e INVIERTI dirección según la velocidad de scroll — un adorno que
 * responde al tacto.
 *
 * Receta: loop base `xPercent -50` lineal en repeat -1 con el contenido
 * duplicado por JS; un ScrollTrigger global (sin pin) lee `getVelocity()` en
 * su onUpdate y aplica `timeScale = clamp(±4, 1 + velocity/400)`; el retorno
 * suave al reposo lo hace un lerp en el gsap.ticker (onUpdate deja de disparar
 * al parar el scroll, así que el retorno no puede vivir ahí).
 *
 * Regla de oro sin-JS: la conversión a marquee es JS-only. Sin JS (y en
 * reduced-motion, porque el módulo solo se llama en la rama no-preference) la
 * banda queda EXACTAMENTE como hoy: grid estático flex-wrap.
 *
 * Costura del loop: el gap del contenedor (`gap-x-8`) no existe en el punto de
 * vuelta del loop, así que (1) cada `<li>` sin separador ámbar recibe uno
 * clonado (todas las frases acaban en nodo), (2) el espaciado entre items pasa
 * del gap del contenedor a `margin-right` por item, y (3) el track se duplica.
 * Con las dos mitades idénticas y espaciado por item, `xPercent -50` cae
 * exactamente sobre la copia: costura perfecta.
 *
 * Móvil: igual (es barato). `overflow:hidden` en la banda (por JS) evita que
 * el track nowrap desborde la página.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MARQUEE } from "./tokens";

interface MarqueeEntry {
  band: HTMLElement;
  track: HTMLElement;
  /** Nº de `<li>` originales (los clones se eliminan contando desde aquí). */
  originalCount: number;
  /** true si se añadió separador ámbar al último `<li>` original. */
  separatorAdded: boolean;
  loop: gsap.core.Tween;
  visibility: ScrollTrigger;
  velocity: ScrollTrigger;
}

const entries: MarqueeEntry[] = [];
let settleFn: (() => void) | null = null;

/**
 * Monta la marquee sobre cada `[data-marquee-band]`. Idempotente: destruye lo
 * anterior antes de montar (la ruta nueva trae DOM nuevo).
 */
export function initMarquee(): void {
  destroyMarquee();

  document.querySelectorAll<HTMLElement>("[data-marquee-band]").forEach((band) => {
    const track = band.querySelector<HTMLElement>("ul");
    if (track === null) return;

    const originalCount = track.children.length;
    if (originalCount === 0) return;

    // Separador ámbar para el último `<li>` (clonado del primero que lo tenga):
    // sin él, la costura del loop mostraría una unión sin nodo.
    const anySeparator = track.querySelector("svg");
    let separatorAdded = false;
    if (anySeparator !== null) {
      const lastItem = track.children[originalCount - 1] as HTMLElement;
      if (lastItem.querySelector("svg") === null) {
        const separator = anySeparator.cloneNode(true) as Element;
        separator.setAttribute("aria-hidden", "true");
        lastItem.appendChild(separator);
        separatorAdded = true;
      }
    }

    // Espaciado por item (margin-right) en lugar del gap del contenedor:
    // condición de costura (ver cabecera). gap-x-8 = 2rem.
    const items = Array.from(track.children) as HTMLElement[];
    items.forEach((item) => {
      item.style.marginRight = "2rem";
    });
    track.style.columnGap = "0px";
    // Track nowrap a sangre del contenido; la banda recorta.
    track.style.flexWrap = "nowrap";
    track.style.width = "max-content";
    track.style.maxWidth = "none";
    // La marquee anima permanentemente: único will-change persistente
    // justificado (regla "solo durante la animación" = toda la vida aquí).
    track.style.willChange = "transform";
    band.style.overflow = "hidden";

    // Duplicado: segunda mitad idéntica a la primera.
    items.forEach((item) => {
      const clone = item.cloneNode(true) as HTMLElement;
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });

    // Loop base lineal (el scrub/velocity lo acelera, jamás lo easea).
    const loop = gsap.to(track, {
      xPercent: -50,
      ease: "none",
      duration: MARQUEE.dur,
      repeat: -1,
    });

    // Pausa fuera de viewport (patrón del proyecto: onToggle).
    const visibility = ScrollTrigger.create({
      trigger: band,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        if (self.isActive) {
          loop.play();
        } else {
          loop.pause();
        }
      },
    });
    // Estado inicial explícito (onToggle solo avisa de CAMBIOS).
    if (!visibility.isActive) loop.pause();

    // Acoplamiento al scroll: timeScale desde la velocidad global. Sin pin y
    // sin animación asociada: standalone (fuente GSAP). El clamp permite
    // negativos: al subir, la banda invierte dirección (técnica 8).
    const velocity = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const scale = gsap.utils.clamp(
          MARQUEE.timeScaleMin,
          MARQUEE.timeScaleMax,
          1 + self.getVelocity() / MARQUEE.velocityFactor,
        );
        loop.timeScale(scale);
      },
    });

    entries.push({ band, track, originalCount, separatorAdded, loop, visibility, velocity });
  });

  // Retorno suave al reposo: lerp en el ticker (onUpdate calla al parar el
  // scroll y dejaría el último timeScale clavado). Un solo fn compartido.
  if (settleFn === null && entries.length > 0) {
    settleFn = () => {
      entries.forEach((entry) => {
        if (entry.loop.paused()) return;
        const current = entry.loop.timeScale();
        if (current === 1) return;
        const next = current + (1 - current) * MARQUEE.settleLerp;
        entry.loop.timeScale(Math.abs(next - 1) < 0.005 ? 1 : next);
      });
    };
    gsap.ticker.add(settleFn);
  }
}

/**
 * Limpieza total: mata loop + triggers + ticker y REVIERTE las mutaciones DOM
 * (matchMedia.revert() no las deshace: lección del proyecto). Idempotente.
 */
export function destroyMarquee(): void {
  if (settleFn !== null) {
    gsap.ticker.remove(settleFn);
    settleFn = null;
  }
  entries.forEach((entry) => {
    entry.loop.kill();
    entry.visibility.kill();
    entry.velocity.kill();
    // Revert DOM: clones fuera (todo lo que exceda el recuento original),
    // separador añadido fuera, estilos inline fuera.
    while (entry.track.children.length > entry.originalCount) {
      entry.track.lastElementChild?.remove();
    }
    if (entry.separatorAdded) {
      const lastItem = entry.track.children[entry.originalCount - 1] as HTMLElement | undefined;
      const svgs = lastItem?.querySelectorAll("svg");
      if (svgs !== undefined && svgs.length > 0) {
        svgs[svgs.length - 1].remove();
      }
    }
    Array.from(entry.track.children).forEach((item) => {
      (item as HTMLElement).style.marginRight = "";
    });
    entry.track.style.columnGap = "";
    entry.track.style.flexWrap = "";
    entry.track.style.width = "";
    entry.track.style.maxWidth = "";
    entry.track.style.willChange = "";
    entry.band.style.overflow = "";
  });
  entries.length = 0;
}
