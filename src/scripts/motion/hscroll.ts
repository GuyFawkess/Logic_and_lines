/**
 * Sticky-stacking cards de ServicesIndex (F4-t3) — sustituye el "track que se
 * traslada" por un "stack que se apila" (patrón sticky-stacking adaptado del
 * referente de 21st.dev a GSAP; SIN React: mismo contrato, otro motor).
 *
 * GEOMETRÍA: el stage (el wrapper [data-hscroll], flex-1 bajo el header con el
 * h2) contiene las N tarjetas ABSOLUTAS apiladas en el MISMO slot centrado
 * (inset:0 + margin:auto + ancho/alto fijos → centrado por LAYOUT, nunca por
 * transform: lección Morning Ritual — GSAP hornea el translate). El z es el
 * orden natural del DOM: la tarjeta N queda ENCIMA. Pin + scrub se mantienen
 * con el MISMO encadenado del debugger (start = end de "shutter-v" vía
 * shutterAlignedStart(), pinnedContainer, id "hscroll" para "shutter-h-0").
 *
 * COREOGRAFÍA (UNA timeline scrubbed → 100% reversible, ease "none" en todo:
 * el scroll manda). Unidades de timeline = transiciones; N tarjetas → duración
 * N-1. Para la tarjeta j (0-indexed):
 *  - j >= 1 ENTRADA: xPercent 120 → 0 durante [j-1, j] (desliza desde la
 *    derecha; 120% de su ancho la deja fuera del stage a cualquier viewport).
 *    Ocultación inicial SOLO por gsap.set (regla sin-JS) + immediateRender
 *    false para que el from no se hornee al crear.
 *  - j <= N-2 ESCALA PROGRESIVA: 1 → targetScale(j) durante [j, N-1], con
 *    targetScale(j) = max(0.6, 1 - (N-j-1) * 0.08) (matemática del referente,
 *    portada literal). Progresiva, sin saltos: cuando la tarjeta j+1 aterriza,
 *    la j está EXACTAMENTE a 0.92 y sigue encogiendo mientras llegan las
 *    demás — la más enterrada acaba a 0.6.
 *  - j <= N-2 DERIVA (profundidad, sutil): x 0 → -(N-1-j)*12px durante
 *    [j, N-1]: la cubierta se desplaza un pelín a la izquierda por nivel.
 *
 * TARJETAS DE CONTENIDO (no solo imagen como el referente): conservan TODO el
 * markup (imagen 4/3 + número + título + spec + descripción + CTA con sus
 * data-gtm INTACTOS). El cromo de tarjeta (radio, borde hairline, fondo
 * --color-card, padding) lo aplica el JS con vars del sistema — SIN hex
 * nuevos y SIN tocar el fallback: sin JS / reduced / móvil las filas
 * verticales del markup quedan exactamente como estaban.
 *
 * WIPES HORIZONTALES FUERA (F4-t3): la entrada deslizante ES el reveal.
 * image-reveal.ts sigue vivo para el fallback móvil; sus triggers
 * horizontales (containerAnimation) quedan desconectados — ya no existe tween
 * de track que devolver (getScrollTween eliminado) y setupWipe() salta las
 * figuras del stack vía isStackActive().
 *
 * CONTADOR: `01 / 06` en mono junto al h2 — creado por JS (regla sin-JS) y
 * actualizado por el onUpdate del scrub: refleja la tarjeta que ENTRA / está
 * en cima. aria-hidden: artefacto de animación, no contenido.
 *
 * ORDEN DE CREACIÓN: index.ts llama initHScroll() en la rama lg +
 * no-preference DESPUÉS de initShutter() (su start lee el end de ese pin) y
 * ANTES de initShuttersH() (los pins siguientes miden con este spacer ya
 * contabilizado). El ÚNICO refresh del ciclo lo dispara initMotion. El guard
 * interno repite la condición compuesta (STACK.mountQuery): doble cerradura,
 * el stack no existe en reduce aunque el módulo se llamara fuera de la rama.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { STACK } from "./tokens";

interface StackState {
  timeline: gsap.core.Timeline | null;
  wrapper: HTMLElement | null;
  track: HTMLElement | null;
  section: HTMLElement | null;
  cards: HTMLElement[];
  counter: HTMLElement | null;
  /** true mientras el stack esté montado (la consulta image-reveal.ts). */
  mounted: boolean;
}

const state: StackState = {
  timeline: null,
  wrapper: null,
  track: null,
  section: null,
  cards: [],
  counter: null,
  mounted: false,
};

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * Escala final de la tarjeta j cuando esté totalmente enterrada (matemática
 * del referente, portada literal): la primera acaba a 0.6 con N=6 y cada una
 * tiene su target — progresivo, sin saltos.
 */
function targetScale(j: number, n: number): number {
  return Math.max(STACK.minScale, 1 - (n - j - 1) * STACK.scaleStep);
}

/**
 * Start absoluto del pin: el fin del pin de la persiana vertical (id
 * "shutter-v"). Function-based para re-medirse en cada refresh; numérico para
 * que ningún offset de pins previos lo toque. NO SE TOCA: encadenado del
 * debugger (commit 0fe093d).
 */
function shutterAlignedStart(): number | string {
  const st = ScrollTrigger.getById("shutter-v");
  return st ? Math.round(st.end) : "top top";
}

/** ¿Está el stack de tarjetas montado? (la consulta image-reveal.ts). */
export function isStackActive(): boolean {
  return state.mounted;
}

/** Monta el stack. Idempotente: destruye lo anterior antes de montar. */
export function initHScroll(): void {
  destroyHScroll();
  const wrapper = document.querySelector<HTMLElement>("[data-hscroll]");
  // Doble cerradura (STACK.mountQuery = lg + no-preference): la rama
  // matchMedia de index.ts ya exige la misma condición, pero este guard
  // propio garantiza que NINGUNA vía de llamada monte el stack con
  // reduced-motion (tarjetas absolutas + xPercent 120 = fuera de pantalla y
  // fallback vertical muerto — hallazgo QA). En reduce: return sin tocar el
  // markup; las filas verticales quedan como están.
  if (wrapper === null || !window.matchMedia(STACK.mountQuery).matches) return;
  const track = wrapper.querySelector<HTMLElement>("[data-hscroll-track]");
  const section = wrapper.closest<HTMLElement>("section");
  if (track === null || section === null) return;
  const cards = Array.from(track.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  if (cards.length < 2) return;

  state.wrapper = wrapper;
  state.track = track;
  state.section = section;
  state.cards = cards;
  state.mounted = true;

  // Layout de stage SOLO por JS (regla de oro sin-JS): la sección pasa a
  // capítulo a viewport completo (header + stage) y el stage a slot relativo
  // que acota las tarjetas absolutas.
  gsap.set(section, {
    minHeight: "100svh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  });
  gsap.set(wrapper, {
    position: "relative",
    overflow: "hidden",
    flex: "1 1 auto",
    width: "100%",
  });
  gsap.set(track, { position: "absolute", inset: "0" });

  // Tarjetas: todas IGUALES (imprescindible para apilar), centradas por
  // LAYOUT (inset + margin:auto — nunca translate: GSAP lo hornea), con el
  // cromo del sistema (radio 12px = rounded-xl, hairline, --color-card).
  // Sin hex nuevos: todo por vars existentes.
  gsap.set(cards, {
    position: "absolute",
    inset: "0",
    margin: "auto",
    width: STACK.cardWidth,
    height: STACK.cardHeight,
    overflow: "hidden",
    borderRadius: "0.75rem",
    border: "1px solid var(--color-hairline)",
    backgroundColor: "var(--color-card)",
    padding: "2.5rem 3rem",
    willChange: "transform",
  });
  // Ocultación inicial SOLO por gsap.set: las tarjetas 2..N esperan fuera del
  // stage (a la derecha); sin JS nunca se aplica → filas verticales visibles.
  gsap.set(cards.slice(1), { xPercent: STACK.enterXPercent });

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
    counter.textContent = `${pad2(1)} / ${pad2(cards.length)}`;
    header.appendChild(counter);
    state.counter = counter;
  }

  let lastIdx = -1;
  const total = pad2(cards.length);
  const updateCounter = (progress: number): void => {
    const counter = state.counter;
    if (counter === null) return;
    const idx = Math.min(
      cards.length - 1,
      Math.max(0, Math.round(progress * (cards.length - 1))),
    );
    if (idx === lastIdx) return;
    lastIdx = idx;
    counter.textContent = `${pad2(idx + 1)} / ${total}`;
  };

  const n = cards.length;

  // UNA timeline scrubbed para TODO el stack (política rewind: reversible).
  // Recorrido pineado: ~0.9 viewport por transición de tarjeta (ritmo similar
  // al track anterior, ~4.5 viewports en total con N=6).
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: () => shutterAlignedStart(),
      end: () => "+=" + Math.round((n - 1) * window.innerHeight * STACK.vhPerCard),
      pin: true,
      scrub: STACK.scrub,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      // El trigger vive dentro del wrapper pineado por la persiana vertical:
      // pinnedContainer hace que ese pin-spacer exterior acomode la expansión
      // de este spacer anidado (_subPinOffset en el fuente de ScrollTrigger).
      pinnedContainer: section.closest("[data-shutter]") ?? undefined,
      // Id para que la primera persiana horizontal (shutter.ts -> "shutter-h-0")
      // encadene su start con el unpin de este pin (cierra el hueco muerto
      // entre fin del stack y entrada al capítulo claro).
      id: "hscroll",
      onUpdate: (self) => {
        updateCounter(self.progress);
      },
    },
  });

  // Coreografía por tarjeta (ver cabecera): entrada desde la derecha +
  // escala progresiva + deriva de profundidad. Todo ease "none": el scroll
  // es el playhead. Rangos en unidades de timeline [j, N-1] = el rango
  // [i*step, 1] del referente con step = 1/(N-1).
  cards.forEach((card, j) => {
    if (j > 0) {
      // Entrada: desliza desde la derecha hasta cubrir el slot.
      timeline.fromTo(
        card,
        { xPercent: STACK.enterXPercent },
        { xPercent: 0, duration: 1, ease: "none", immediateRender: false },
        j - 1,
      );
    }
    if (j < n - 1) {
      // Escala progresiva hacia su target mientras las siguientes llegan.
      timeline.to(
        card,
        { scale: targetScale(j, n), duration: n - 1 - j, ease: "none" },
        j,
      );
      // Deriva de profundidad: sutil desplazamiento a la izquierda por nivel.
      timeline.to(
        card,
        { x: () => -(n - 1 - j) * STACK.drift, duration: n - 1 - j, ease: "none" },
        j,
      );
    }
  });

  state.timeline = timeline;
}

/**
 * Limpieza total: mata timeline/trigger y devuelve section/wrapper/track/cards
 * al estado del markup (filas verticales). resetMotion() la llama ANTES de
 * media.revert(); idempotente. clearProps "all" en las tarjetas es seguro: no
 * tienen ningún estilo inline previo (el cromo lo puso este módulo).
 *
 * REVERSIÓN EN TOGGLE EN VIVO (verificada en el fuente de GSAP 3.15,
 * Context.kill(revert)): al cruzar a reduce, matchMedia revierte el contexto
 * en dos fases — (1) los tweens grabados (los gsap.set de layout y el estado
 * inicial) se revierten en orden inverso de creación y cada propiedad vuelve
 * a su valor PRE-set (los estilos inline desaparecen); (2) DESPUÉS corre este
 * cleanup, cuyo clearProps remata cualquier resto. Resultado: tarjetas de
 * vuelta al flujo del markup (fallback vertical opera). Al volver a
 * no-preference el contexto se recrea y initHScroll() remonta el stack
 * (idempotente: destruye lo anterior al entrar). Mismo ciclo que
 * hover-roll/shutter.
 */
export function destroyHScroll(): void {
  if (state.timeline !== null) {
    state.timeline.scrollTrigger?.kill();
    state.timeline.kill();
    state.timeline = null;
  }
  if (state.cards.length > 0) {
    // FIX (f4): killTweensOf antes del clearProps. Causa raíz: los fromTo
    // hijos del timeline (parent.data === "nested") sobreviven a
    // `timeline.kill()` porque Context.kill solo itera data top-level
    // (getTweens() excluye anidados). Sus propTweens quedan vivos en el
    // _gsap cache de cada card. Cuando ScrollTrigger.kill (invocado antes)
    // pierde el pin-spacer y dispara un refresh, esos propTweens vuelven a
    // escribir `transform: translate(120%, 0%)` DESPUÉS del clearProps.
    // killTweensOf limpia los propTweens residuales, clearProps borra el
    // estilo inline: ningún render posterior puede reescribir el transform.
    gsap.killTweensOf(state.cards);
    gsap.set(state.cards, { clearProps: "all" });
  }
  if (state.track !== null) {
    gsap.set(state.track, { clearProps: "position,inset" });
  }
  if (state.wrapper !== null) {
    gsap.set(state.wrapper, { clearProps: "position,overflow,flex,width" });
  }
  if (state.section !== null) {
    gsap.set(state.section, {
      clearProps: "minHeight,display,flexDirection,justifyContent",
    });
  }
  if (state.counter !== null) {
    state.counter.remove();
    state.counter = null;
  }
  state.cards = [];
  state.wrapper = null;
  state.track = null;
  state.section = null;
  state.mounted = false;
}
