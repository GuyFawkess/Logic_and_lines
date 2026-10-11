/**
 * Scroll horizontal reversible de ServicesIndex (F4-t2) — gramática de
 * capítulos del plan (docs/motion-plan.md §F4): 6 paneles iguales, pin +
 * scrub → 100% reversible (el x del track va ligado al scroll; hacer scroll
 * hacia atrás rebobina los paneles).
 *
 * REGLA DE ORO SIN-JS: el layout horizontal (flex nowrap + ancho de panel +
 * clip) se aplica SOLO por JS (gsap.set) dentro de la rama lg + no-preference
 * del matchMedia de index.ts. Sin JS, en móvil (<lg) o con reduced-motion los
 * 6 servicios apilan VERTICAL (las filas igualadas del markup, intactas):
 * contenido 100% visible siempre. destroyHScroll() hace clearProps de todo lo
 * aplicado y devuelve el markup a su estado vertical.
 *
 * ENCADENAMIENTO DE PINS (el punto delicado de esta tanda): la persiana
 * vertical (shutter.ts, trigger con id "shutter-v") pinea el wrapper que
 * CONTIENE esta sección; su unpin deja el top de la sección exactamente en el
 * borde superior del viewport, donde arranca este pin. El start se resuelve
 * como NUMERO absoluto leyendo el end del trigger "shutter-v" en el refresh
 * (fuente GSAP: los starts numéricos no se re-offsettean por pins previos —
 * aquí eso es justo lo que queremos: posición absoluta real) con fallback
 * "top top" si la persiana no existe en el markup. El pinnedContainer apunta
 * al wrapper de la persiana para que SU pin-spacer acomode la expansión que
 * provoca el spacer anidado de este pin (mecanismo _subPinOffset del fuente
 * de ScrollTrigger: sin él, el spacer exterior queda corto y el contenido
 * posterior solaparía la sección).
 *
 * WIPES DENTRO DEL HORIZONTAL: image-reveal.ts recibe este tween vía
 * getScrollTween() como containerAnimation, de modo que cada panel dispare su
 * line-wipe al ENTRAR por la derecha, en modo scrub (reversible). Por eso el
 * tween usa ease "none" (obligatorio con containerAnimation: mapeo 1:1
 * scroll↔posición horizontal) y NO se anima el elemento pineado (se anima el
 * track, hijo; el pin es sobre la sección).
 *
 * CONTADOR: `01 / 06` en mono junto al h2 — creado por JS (regla sin-JS: sin
 * JS no existe) y actualizado por el onUpdate del scrub. aria-hidden: es un
 * artefacto de animación, no contenido.
 *
 * ORDEN DE CREACIÓN: index.ts llama initHScroll() en la rama lg +
 * no-preference DESPUÉS de initShutter() (su start lee el end de ese pin) y
 * ANTES de initShuttersH() (los pins siguientes miden con este spacer ya
 * contabilizado). El UNICO refresh del ciclo lo dispara initMotion.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HSCROLL } from "./tokens";

interface HScrollState {
  tween: gsap.core.Tween | null;
  wrapper: HTMLElement | null;
  track: HTMLElement | null;
  section: HTMLElement | null;
  panels: HTMLElement[];
  counter: HTMLElement | null;
}

const state: HScrollState = {
  tween: null,
  wrapper: null,
  track: null,
  section: null,
  panels: [],
  counter: null,
};

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * Start absoluto del pin: el fin del pin de la persiana vertical (ver
 * cabecera). Function-based para re-medirse en cada refresh; numérico para
 * que ningún offset de pins previos lo toque.
 */
function shutterAlignedStart(): number | string {
  const st = ScrollTrigger.getById("shutter-v");
  return st ? Math.round(st.end) : "top top";
}

/** Monta el horizontal. Idempotente: destruye lo anterior antes de montar. */
export function initHScroll(): void {
  destroyHScroll();
  const wrapper = document.querySelector<HTMLElement>("[data-hscroll]");
  if (wrapper === null || !window.matchMedia(HSCROLL.lgQuery).matches) return;
  const track = wrapper.querySelector<HTMLElement>("[data-hscroll-track]");
  const section = wrapper.closest<HTMLElement>("section");
  if (track === null || section === null) return;
  const panels = Array.from(track.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  if (panels.length === 0) return;

  state.wrapper = wrapper;
  state.track = track;
  state.section = section;
  state.panels = panels;

  // Layout horizontal SOLO por JS (regla de oro sin-JS): la sección pasa a
  // capítulo a viewport completo (header + track centrados) y el track a
  // cinta de paneles iguales recortada por el wrapper.
  gsap.set(section, {
    minHeight: "100svh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  });
  gsap.set(wrapper, { overflow: "hidden" });
  gsap.set(track, {
    display: "flex",
    flexWrap: "nowrap",
    width: "max-content",
    alignItems: "stretch",
    columnGap: HSCROLL.gap,
  });
  gsap.set(panels, { width: HSCROLL.panelWidth, flexShrink: 0 });

  const distance = (): number => Math.max(track.scrollWidth - wrapper.clientWidth, 0);
  // Si el track cabe (viewport enorme, contenido corto): sin horizontal, el
  // vertical del markup manda.
  if (distance() < HSCROLL.minDistance) {
    destroyHScroll();
    return;
  }

  // Contador de progreso: artefacto de animación creado por JS (sin JS no
  // existe). Absolute dentro del header relativo: resize-proof.
  const header = section.querySelector<HTMLElement>("[data-hscroll-header]");
  if (header !== null) {
    const counter = document.createElement("p");
    counter.setAttribute("data-hscroll-progress", "");
    counter.setAttribute("aria-hidden", "true");
    counter.style.cssText =
      "position:absolute;right:0;bottom:0;" +
      "font-family:var(--font-mono);font-size:0.875rem;line-height:1.5;" +
      "font-variant-numeric:tabular-nums;color:var(--color-text-dark);";
    counter.textContent = `${pad2(1)} / ${pad2(panels.length)}`;
    header.appendChild(counter);
    state.counter = counter;
  }

  let lastIdx = -1;
  const total = pad2(panels.length);
  const updateCounter = (progress: number): void => {
    const counter = state.counter;
    if (counter === null) return;
    const idx = Math.min(
      panels.length - 1,
      Math.max(0, Math.round(progress * (panels.length - 1))),
    );
    if (idx === lastIdx) return;
    lastIdx = idx;
    counter.textContent = `${pad2(idx + 1)} / ${total}`;
  };

  state.tween = gsap.to(track, {
    x: () => -distance(),
    // ease "none" OBLIGATORIO: containerAnimation mapea scroll↔x 1:1.
    ease: "none",
    scrollTrigger: {
      trigger: section,
      start: () => shutterAlignedStart(),
      end: () => "+=" + distance(),
      pin: true,
      scrub: HSCROLL.scrub,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      // El trigger vive dentro del wrapper pineado por la persiana vertical:
      // pinnedContainer hace que ese pin-spacer exterior acomode la expansión
      // de este spacer anidado (_subPinOffset en el fuente de ScrollTrigger).
      pinnedContainer: section.closest("[data-shutter]") ?? undefined,
      onUpdate: (self) => {
        updateCounter(self.progress);
      },
    },
  });
}

/** Tween horizontal para los containerAnimation de image-reveal.ts (o null). */
export function getScrollTween(): gsap.core.Tween | null {
  return state.tween;
}

/**
 * Limpieza total: mata trigger/tween y devuelve section/wrapper/track/panels
 * al estado del markup (filas verticales). resetMotion() la llama ANTES de
 * media.revert(); idempotente.
 */
export function destroyHScroll(): void {
  if (state.tween !== null) {
    state.tween.scrollTrigger?.kill();
    state.tween.kill();
    state.tween = null;
  }
  if (state.track !== null) {
    gsap.set(state.track, {
      clearProps: "display,flexWrap,width,alignItems,columnGap,x",
    });
  }
  if (state.panels.length > 0) {
    gsap.set(state.panels, { clearProps: "width,flexShrink" });
  }
  if (state.section !== null) {
    gsap.set(state.section, {
      clearProps: "minHeight,display,flexDirection,justifyContent",
    });
  }
  if (state.wrapper !== null) {
    gsap.set(state.wrapper, { clearProps: "overflow" });
  }
  if (state.counter !== null) {
    state.counter.remove();
    state.counter = null;
  }
  state.panels = [];
  state.wrapper = null;
  state.track = null;
  state.section = null;
}
