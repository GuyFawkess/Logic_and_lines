/**
 * Hero logo mark (T7) — "la línea construye el logo".
 *
 * El logo de marca (public/logoSolo.svg) se DIBUJA dentro del hero: 4 paths
 * (2 marcos ámbar + 2 glifos marfil) que se trazan con DrawSVG, se rellenan y
 * se disuelven de nuevo en línea cuando el hero sale del viewport.
 *
 * REGLAS (docs/motion-plan.md + brief T7):
 * - El MARKUP parte del estado FINAL (relleno completo, sin trazo): sin JS y
 *   con prefers-reduced-motion se ve el logo finished. El estado inicial
 *   (fill-opacity 0, trazo por path, drawSVG "0%") lo pone SOLO el JS con
 *   gsap.set — nunca el CSS (regla de oro).
 * - La intro arranca con el GATE del preloader (index.ts la llama dentro de
 *   startReveals, igual que las text reveals).
 * - INTRO: una timeline por rama, construida una vez. Desktop <= 2.4 s,
 *   móvil <= 1.6 s (la misma timeline con timeScale).
 * - SCRUB (desktop): se monta SOLO cuando la intro termina (nunca dos tweens
 *   sobre la misma propiedad a la vez) y es reversible (subir re-forma el logo).
 * - TILT: solo (hover:hover) and (pointer:fine) en desktop; se salta en táctil.
 * - Sin propiedades de layout animadas: solo transform, opacity, stroke y
 *   dash (nada de width/height/top/left).
 * - will-change SOLO durante la animación y retirado al terminar.
 *
 * GEOMETRÍA (medido en el navegador, 2026-10-28): el h1 del hero son 3 líneas
 * visuales y la tercera ("Yo trazo las líneas.") llega hasta x=1127 a 1440 y
 * su línea de caja empieza 258 px por debajo del borde superior del h1. El
 * logo va pegado al borde superior del h1 (top-0 del contenedor de contenido)
 * y a 40 px del borde derecho, así que el hueco libre real es de ~245 x 258 px:
 * por eso el tamaño del mark es clamp(190px, 14vw, 225px) y no 360px — con 360
 * el logo pisaría la tercera línea del titular.
 */
import gsap from "gsap";
import { HERO_LOGO } from "./tokens";

type PartName = "frame-outer" | "frame-inner" | "glyph-l" | "glyph-1";

/** Orden de la intro (dibujo). */
const INTRO_ORDER: PartName[] = ["frame-outer", "frame-inner", "glyph-l", "glyph-1"];
/** Orden inverso: el disolvido deshace el dibujo al revés. */
const REVERSE_ORDER: PartName[] = ["glyph-1", "glyph-l", "frame-inner", "frame-outer"];

interface HeroLogoParts {
  svg: SVGSVGElement;
  slot: HTMLElement;
  section: HTMLElement;
  byName: Record<PartName, SVGPathElement>;
}

interface HeroLogoState {
  parts: HeroLogoParts;
  /** Timeline de la intro (desktop o móvil, según la rama). */
  intro: gsap.core.Timeline | null;
  /** Timeline del disolvido por scroll (desktop, montada al acabar la intro). */
  scrub: gsap.core.Timeline | null;
  /** Clone del marco exterior que recorre el dash marfil (artefacto JS). */
  dash: SVGPathElement | null;
  /** Listeners del tilt (pointermove/pointerleave) sobre el slot. */
  tiltCleanup: (() => void) | null;
}

let state: HeroLogoState | null = null;
/** Contexto de matchMedia propio: se revierte en destroyHeroLogo(). */
let media: gsap.MatchMedia | null = null;

/** Trazo de dibujado de un path: su propio color (marcos) o el marfil del sistema. */
function strokeFor(part: SVGPathElement, name: PartName): string {
  if (name === "glyph-l" || name === "glyph-1") return HERO_LOGO.dashStroke;
  return part.getAttribute("fill") ?? "currentColor";
}

/** Lee el logo del DOM. Devuelve null si el markup no está (o está incompleto). */
function queryParts(): HeroLogoParts | null {
  const svg = document.querySelector<SVGSVGElement>("[data-hero-logo]");
  if (svg === null) return null;
  const slot = svg.closest<HTMLElement>("[data-hero-logo-slot]");
  const section = svg.closest<HTMLElement>("section");
  if (slot === null || section === null) return null;

  const byName = {} as Record<PartName, SVGPathElement>;
  for (const name of INTRO_ORDER) {
    const part = svg.querySelector<SVGPathElement>(`[data-logo-part="${name}"]`);
    if (part === null) return null;
    byName[name] = part;
  }
  return { svg, slot, section, byName };
}

/**
 * Estado inicial de dibujado (SOLO por gsap.set): el relleno a 0 y el trazo
 * listo para DrawSVG. El markup sigue siendo el estado final (lleno, sin
 * trazo) para sin-JS y reduced-motion.
 */
function prepareParts(parts: HeroLogoParts): void {
  for (const name of INTRO_ORDER) {
    const part = parts.byName[name];
    gsap.set(part, {
      fillOpacity: 0,
      stroke: strokeFor(part, name),
      strokeOpacity: 1,
      strokeWidth: HERO_LOGO.strokeWidth,
      drawSVG: "0% 0%",
    });
  }
}

/** Clone del marco exterior: el único trazo marfil que lo recorre (artefacto JS). */
function buildDash(parts: HeroLogoParts): SVGPathElement {
  const clone = parts.byName["frame-outer"].cloneNode(false) as SVGPathElement;
  clone.removeAttribute("data-logo-part");
  clone.setAttribute("data-logo-dash", "");
  clone.setAttribute("fill", "none");
  clone.style.stroke = HERO_LOGO.dashStroke;
  clone.style.strokeWidth = String(HERO_LOGO.strokeWidth);
  clone.style.strokeOpacity = "1";
  parts.svg.appendChild(clone);
  return clone;
}

/**
 * INTRO: los 4 paths se dibujan (DrawSVG), se rellenan y se les retira el
 * trazo para resolver EXACTAMENTE el logo original. Un único dash marfil
 * recorre el marco exterior y desaparece.
 *
 * Tiempos (s, escala desktop) — ver HERO_LOGO:
 *   0.00 marco exterior (0.90) · 0.45 marco interior (0.70) ·
 *   0.85 glifo L (0.50) · 0.97 glifo 1 (0.50) · 1.15 relleno (0.50) ·
 *   1.20 dash (1.20) -> 2.40 s.
 */
function buildIntro(parts: HeroLogoParts): gsap.core.Timeline {
  const { byName } = parts;
  const tInner = HERO_LOGO.frameDur - HERO_LOGO.innerOverlap;
  const tGlyph = tInner + HERO_LOGO.innerDur - HERO_LOGO.glyphOverlap;
  const tFill = tInner + HERO_LOGO.innerDur;
  const tDash = tFill + 0.05;

  const tl = gsap.timeline();
  const dash = buildDash(parts);
  if (state !== null) state.dash = dash;

  // (1) Dibujo de los dos marcos (ámbar).
  tl.fromTo(
    byName["frame-outer"],
    { drawSVG: "0% 0%" },
    { drawSVG: "0% 100%", duration: HERO_LOGO.frameDur, ease: "power2.inOut" },
    0,
  );
  tl.fromTo(
    byName["frame-inner"],
    { drawSVG: "0% 0%" },
    { drawSVG: "0% 100%", duration: HERO_LOGO.innerDur, ease: "power2.inOut" },
    tInner,
  );

  // (2) Dibujo de los dos glifos (marfil), con stagger.
  tl.fromTo(
    byName["glyph-l"],
    { drawSVG: "0% 0%" },
    { drawSVG: "0% 100%", duration: HERO_LOGO.glyphDur, ease: "power2.inOut" },
    tGlyph,
  );
  tl.fromTo(
    byName["glyph-1"],
    { drawSVG: "0% 0%" },
    { drawSVG: "0% 100%", duration: HERO_LOGO.glyphDur, ease: "power2.inOut" },
    tGlyph + HERO_LOGO.glyphStagger,
  );

  // (3) Relleno: los 4 paths pasan a relleno 1 y el trazo se retira (resuelve
  //     el logo original, sin trazos residuales).
  tl.to(
    INTRO_ORDER.map((name) => byName[name]),
    {
      fillOpacity: 1,
      strokeOpacity: 0,
      duration: HERO_LOGO.fillDur,
      ease: "power1.out",
    },
    tFill,
  );

  // (4) Un SOLO dash marfil recorre el marco exterior y se desvanece al
  //     terminar (sin loop, sin glow, sin blur).
  tl.fromTo(
    dash,
    { drawSVG: "0% 0%" },
    {
      drawSVG: `${100 - HERO_LOGO.dashRatio}% 100%`,
      duration: HERO_LOGO.dashDur,
      ease: "power1.inOut",
    },
    tDash,
  );
  tl.to(dash, {
    strokeOpacity: 0,
    duration: HERO_LOGO.dashFadeDur,
    ease: "power1.in",
  }, tDash + HERO_LOGO.dashDur - HERO_LOGO.dashFadeDur);

  // El dash es un artefacto de animación: fuera del DOM al terminar.
  tl.add(() => {
    dash.remove();
    if (state !== null && state.dash === dash) state.dash = null;
  }, tDash + HERO_LOGO.dashDur);

  return tl;
}

/**
 * SCRUB (desktop): el logo se deshace mientras el hero sale del viewport
 * (relleno -> 0, trazo -> 1, el dibujo se deshace del revés) y se re-forma al
 * subir. Reversible al 100 % (scrub, sin replay).
 *
 * Se monta SOLO cuando la intro ha terminado: nunca hay dos tweens sobre la
 * misma propiedad a la vez.
 */
function mountScrub(parts: HeroLogoParts): void {
  const { byName, svg } = parts;
  const rev = REVERSE_ORDER.map((name) => byName[name]);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: parts.section,
      start: "top top",
      end: "bottom top",
      scrub: HERO_LOGO.scrub,
      invalidateOnRefresh: true,
      id: "hero-logo",
      onToggle: (self) => {
        gsap.set(rev, {
          willChange: self.isActive ? "fill-opacity,stroke-opacity,stroke-dashoffset" : "auto",
        });
        gsap.set(svg, { willChange: self.isActive ? "transform" : "auto" });
      },
    },
  });

  // El relleno se va primero (el logo deja de ser una masa y pasa a línea);
  // el trazo aparece y el dibujo se deshace del revés, en cascada.
  tl.fromTo(rev, { fillOpacity: 1 }, {
    fillOpacity: 0,
    duration: HERO_LOGO.dissolveFillDur,
    stagger: HERO_LOGO.dissolveStagger,
    ease: "none",
  }, 0);
  tl.fromTo(rev, { strokeOpacity: 0 }, {
    strokeOpacity: 1,
    duration: HERO_LOGO.dissolveStrokeDur,
    stagger: HERO_LOGO.dissolveStagger,
    ease: "none",
  }, HERO_LOGO.dissolveStrokeAt);
  tl.fromTo(rev, { drawSVG: "0% 100%" }, {
    drawSVG: "0% 0%",
    duration: HERO_LOGO.dissolveDrawDur,
    stagger: HERO_LOGO.dissolveStagger,
    ease: "none",
  }, HERO_LOGO.dissolveDrawAt);
  tl.fromTo(svg, { scale: 1, y: 0 }, {
    scale: HERO_LOGO.dissolveScale,
    y: () => (window.innerHeight * HERO_LOGO.dissolveYVh) / 100,
    duration: HERO_LOGO.dissolveMoveDur,
    ease: "none",
  }, 0);

  if (state !== null) state.scrub = tl;
}

/**
 * TILT: rotación máx. ±5° siguiendo el puntero. Solo puntero fino y desktop;
 * en táctil no se monta (y si se desmonta, el logo vuelve a 0).
 */
function mountTilt(parts: HeroLogoParts): void {
  const { svg, slot } = parts;
  const max = HERO_LOGO.tiltMax;
  const rotateX = gsap.quickTo(svg, "rotationX", {
    duration: HERO_LOGO.tiltDur,
    ease: "power3.out",
  });
  const rotateY = gsap.quickTo(svg, "rotationY", {
    duration: HERO_LOGO.tiltDur,
    ease: "power3.out",
  });

  const onMove = (event: PointerEvent): void => {
    const rect = slot.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateY(px * max * 2);
    rotateX(-py * max * 2);
  };
  const onLeave = (): void => {
    rotateX(0);
    rotateY(0);
  };

  slot.addEventListener("pointermove", onMove);
  slot.addEventListener("pointerleave", onLeave);
  const cleanup = (): void => {
    slot.removeEventListener("pointermove", onMove);
    slot.removeEventListener("pointerleave", onLeave);
  };
  if (state !== null) state.tiltCleanup = cleanup;
}

/**
 * Monta el logo del hero. Idempotente: destruye lo anterior antes de montar.
 * La llama index.ts DENTRO del gate del preloader (startReveals): antes del
 * gate no hay nada que dibujar.
 */
export function initHeroLogo(): void {
  destroyHeroLogo();

  const parts = queryParts();
  if (parts === null) return;

  state = {
    parts,
    intro: null,
    scrub: null,
    dash: null,
    tiltCleanup: null,
  };
  prepareParts(parts);

  media = gsap.matchMedia();

  // Desktop: intro + scrub (el scrub se monta al acabar la intro).
  media.add(HERO_LOGO.lgQuery, () => {
    const tl = buildIntro(parts);
    if (state !== null) state.intro = tl;
    gsap.set(Object.values(parts.byName), {
      willChange: "fill-opacity,stroke-opacity,stroke-dashoffset",
    });
    gsap.set(parts.svg, { willChange: "transform" });
    tl.eventCallback("onComplete", () => {
      // will-change fuera al terminar la intro (regla del plan).
      gsap.set(Object.values(parts.byName), { willChange: "auto" });
      gsap.set(parts.svg, { willChange: "auto" });
      mountScrub(parts);
    });
    return () => {
      tl.kill();
      if (state !== null && state.intro === tl) state.intro = null;
    };
  });

  // Móvil: solo la intro (la misma timeline, comprimida a <= 1.6 s).
  media.add("(max-width: 1023px)", () => {
    const tl = buildIntro(parts);
    tl.timeScale(HERO_LOGO.totalDur / HERO_LOGO.mobileDur);
    if (state !== null) state.intro = tl;
    gsap.set(Object.values(parts.byName), {
      willChange: "fill-opacity,stroke-opacity,stroke-dashoffset",
    });
    tl.eventCallback("onComplete", () => {
      gsap.set(Object.values(parts.byName), { willChange: "auto" });
    });
    return () => {
      tl.kill();
      if (state !== null && state.intro === tl) state.intro = null;
    };
  });

  // Tilt: puntero fino + desktop.
  media.add(
    `${HERO_LOGO.lgQuery} and (hover: hover) and (pointer: fine)`,
    () => {
      mountTilt(parts);
      return () => {
        state?.tiltCleanup?.();
        if (state !== null) state.tiltCleanup = null;
        gsap.set(parts.svg, { rotationX: 0, rotationY: 0 });
      };
    },
  );
}

/**
 * Limpieza total: mata la timeline de la intro y la del scrub, revierte el
 * contexto de matchMedia, quita el dash (artefacto JS) y devuelve los paths y
 * el svg al estado del MARKUP (relleno completo, sin trazo, sin will-change).
 * Idempotente.
 */
export function destroyHeroLogo(): void {
  if (state !== null) {
    state.tiltCleanup?.();
    const { parts } = state;
    if (state.scrub !== null) {
      state.scrub.scrollTrigger?.kill();
      state.scrub.kill();
    }
    state.intro?.kill();
    state.dash?.remove();
    gsap.killTweensOf(Object.values(parts.byName));
    gsap.killTweensOf(parts.svg);
    gsap.set(Object.values(parts.byName), {
      clearProps: "fillOpacity,stroke,strokeOpacity,strokeWidth,drawSVG,willChange",
    });
    gsap.set(parts.svg, {
      clearProps: "transform,willChange",
    });
  }
  if (media !== null) {
    media.revert();
    media = null;
  }
  state = null;
  // El dash puede haber quedado montado si la intro se mató a medias.
  document.querySelectorAll<SVGPathElement>("[data-logo-dash]").forEach((el) => el.remove());
}
