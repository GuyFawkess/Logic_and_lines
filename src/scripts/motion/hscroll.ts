/**
 * Sticky-stacking cards de ServicesIndex (F4-t3) + SLIDE de salida (R6).
 *
 * STACK (gramática sin cambios): tarjetas ABSOLUTAS apiladas en el mismo slot
 * centrado (inset:0 + margin:auto — centrado por LAYOUT, nunca por transform:
 * lección Morning Ritual). La tarjeta j entra desde la derecha (xPercent 120,
 * back.out(1.2)) mientras las cubiertas escalan (progresivo 0.94→0.96), se
 * oscurecen (overlay opacity) y derivan a la izquierda. UNA timeline scrubbed
 * → 100% reversible. El layout del capítulo (sección 100svh flex, stage
 * relativo, tarjetas absolutas, pt del h2) lo aplica el JS — regla de oro
 * sin-JS: sin JS / móvil / reduce, filas verticales del markup.
 *
 * R6 (2026-10-15) — GEOMETRÍA DEL RECORRIDO, sin fronteras (shutter.ts fuera):
 *   end = travel + dwell + slide, todo en vh:
 *     travel = (N-1)·STACK.vhPerCard   → tarjetas 01→06
 *     dwell  = STACK.stackDwellVh (0.7) → tarjeta 06 quieta y legible
 *     slide  = REVEAL.slideLenVh (1.1)  → LA SECCIÓN ENTERA sale xPercent
 *              0 → -100 (power2.inOut) y debajo queda PROCESO.
 *
 * REVEAL DE PROCESO (R6-b, supersede el sticky emulado de R6): el panel
 * espera DEBAJO de Servicios (relative z-0 vs relative z-10 + bg opaco) y se
 * sostiene con un PIN GSAP NATURAL — el patrón estándar, sin clamps ni
 * onUpdate (QA R6: el y emulado no sostenía el panel y el rail acababa con
 * Proof en pantalla):
 *   1. initHScroll adelanta el WRAPPER EXTERIOR [data-proceso-under] con
 *      marginTop = -(100svh de la sección + slide) = -210svh (svh crudo,
 *      resize-proof: gsap.set hornearía px). Con el stack montado la sección
 *      mide EXACTAMENTE 100svh (minHeight por JS + stage flex que se encoge),
 *      así que el top del wrapper queda EXACTAMENTE en el inicio del slide
 *      (scroll = hscroll.end − slideLenVh): durante viaje+dwell el wrapper
 *      está bajo el fondo opaco de Servicios (invisible) y llega a "top top"
 *      justo cuando el slide arranca. El margen va FUERA del pin-target a
 *      propósito: GSAP envuelve [data-proceso-pin] en un pin-spacer y un
 *      margen dentro del pin-target se anularía al envolverlo.
 *   2. PIN NATURAL del div interior [data-proceso-pin]: start "top top"
 *      NATURAL (el margen ya lo adelantó — caso estándar de GSAP, cero
 *      saltos al enganchar ni al soltar), end = slide + rail (cubre TODO el
 *      slide de salida y TODO el dibujo del rail), id "proceso",
 *      refreshPriority 15 (= RAIL.priority; hscroll 19 refresca ANTES — su
 *      spacer ya está aplicado cuando este mide su "top top" — y circuit 10
 *      después). pinSpacing absorbe slide+rail: Proof conserva su posición
 *      natural sin parches (fuera el paddingBottom compensatorio de R6: con
 *      el pin la suma ya es neta 0). Al terminar, el panel continúa en flujo
 *      1:1 (liberación natural). El driver del rail (line-system.ts) sigue
 *      SIN pin: se encadena a hscroll.end FRESCO y dibuja mientras el panel
 *      está pineado.
 *   QA R6-b (docs/r6-captures/qa2): rect.top del panel = 0 en E+0.5/1.2/2.0vh,
 *   liberación natural tras el fin del rail, rewind reversible.
 *
 * CONTADOR: `01 / 06` (creado por JS) mapeado al tramo de VIAJE — durante
 * dwell y slide el 06/06 queda estático.
 *
 * ORDEN DE CREACIÓN (index.ts): initHScroll() → rail → circuit, con
 * refreshPriority 19 (STACK.priority) > 15 (pin "proceso" + driver "rail-grid")
 * > circuit 10 (GSAP 3.15.0: priority MAYOR refresca PRIMERO). El rail lee
 * hscroll.end FRESCO.
 *
 * OVERFLOW: el slide solo transforma la sección mientras está pineada
 * (position:fixed — no contribuye al scroll del documento) y en flujo acaba
 * en xPercent -100 (overflow IZQUIERDO, que no genera scrollbar). Cinturón:
 * html/body { overflow-x: clip } — vive en Layout.astro y aplica a TODOS los
 * breakpoints; `clip` no crea contenedor de scroll.
 *
 * P1-1/P1-2b (T3, 2026-10-28):
 *   - La <section> de Servicios es FULL-BLEED: el contenedor max-w-[1400px]
 *     bajó a un div interior [data-hscroll-inner] (mismo patrón que
 *     ProcessRail). Motivo: con el max-w en la propia sección, el slide
 *     xPercent:-100 solo la sacaba hasta x=20 y dejaba una franja de 20px
 *     visible en el borde izquierdo. Este módulo convierte ese div interior
 *     en la columna flex que reparte header + stage.
 *   - El borde y el padding de la tarjeta viven en el CSS del componente
 *     (ServicesIndex.astro), no aquí: así el tratamiento de tarjeta solo
 *     aplica con el stack montado.
 *   - data-hscroll-stack="true" (en la <section>) es la marca de "stack
 *     montado": la pone initHScroll() y la retira destroyHScroll(). El CSS
 *     del componente la usa como condición -> sin JS / móvil / reduced-motion
 *     el stack no se monta y el fallback vertical queda intacto.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { RAIL, REVEAL, STACK, STACK_MOBILE } from "./tokens";

interface StackState {
  timeline: gsap.core.Timeline | null;
  wrapper: HTMLElement | null;
  track: HTMLElement | null;
  section: HTMLElement | null;
  /** P1-2b (T3): div interior [data-hscroll-inner] (el max-w bajó a él; la
   *  section es full-bleed). En modo stack es la columna flex header+stage. */
  inner: HTMLElement | null;
  /** h2 del header (R3-4: su pt se neutraliza en modo stack; destroy restaura). */
  title: HTMLElement | null;
  cards: HTMLElement[];
  /** Overlays de oscurecimiento (R2), uno por tarjeta, creados por JS. */
  overlays: HTMLElement[];
  counter: HTMLElement | null;
  /** R6-b: wrapper de Proceso (su margen negativo lo aplica este módulo). */
  under: HTMLElement | null;
  /** R6-b: pin natural del panel (ScrollTrigger "proceso", creado aquí). */
  pinTrigger: ScrollTrigger | null;
  /** true mientras el stack esté montado (la consulta image-reveal.ts). */
  mounted: boolean;
  /** style inline del MARKUP de cada tarjeta (vars --card-*-col): clearProps
   *  "all" lo borraba entero y un remontaje tras cruzar breakpoint perdía las
   *  columnas del stack desktop. destroy lo restaura. */
  cardStyles: (string | null)[];
}

const state: StackState = {
  timeline: null,
  wrapper: null,
  track: null,
  section: null,
  inner: null,
  title: null,
  cards: [],
  overlays: [],
  counter: null,
  under: null,
  pinTrigger: null,
  mounted: false,
  cardStyles: [],
};

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * Escala final de la tarjeta j (R2): progresiva y SUTIL — la más enterrada
 * (j=0) acaba a STACK.minScale (0.94) y cada nivel de cercanía a la cima suma
 * STACK.scaleStep (con N=6: 0.94 → ~0.96).
 */
function targetScale(j: number): number {
  return STACK.minScale + j * STACK.scaleStep;
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
  const inner = section?.querySelector<HTMLElement>("[data-hscroll-inner]") ?? null;
  if (track === null || section === null || inner === null) return;
  const cards = Array.from(track.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  if (cards.length < 2) return;

  state.wrapper = wrapper;
  state.track = track;
  state.section = section;
  state.cards = cards;
  state.cardStyles = cards.map((card) => card.getAttribute("style"));
  state.mounted = true;
  state.inner = inner;
  // P1-1 (T3): marca de "stack montado". El tratamiento de tarjeta del
  // componente (ServicesIndex.astro) SOLO aplica con esta marca: sin JS, en
  // móvil o con reduced-motion el stack no se monta y el fallback vertical
  // queda intacto. destroyHScroll() la retira.
  section.dataset.hscrollStack = "true";

  // Layout de stage SOLO por JS (regla de oro sin-JS): la sección pasa a
  // capítulo a viewport completo (header + stage) y el stage a slot relativo
  // que acota las tarjetas absolutas.
  gsap.set(section, {
    minHeight: "100svh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  });
  // P1-2b (T3): el contenedor max-w-[1400px] bajó a un div interior -> ese
  // div es ahora la columna flex que reparte header + stage (la section sigue
  // siendo el flex container de 100svh).
  gsap.set(inner, { display: "flex", flexDirection: "column", flex: "1 1 auto" });
  gsap.set(wrapper, {
    position: "relative",
    overflow: "hidden",
    flex: "1 1 auto",
    width: "100%",
  });
  // R3-4: el mt-14 del markup (fallback vertical) COMÍA 56px del slot en modo
  // stack (inset:0 + margin-top encoge la caja por arriba) → tarjeta empujada
  // al límite inferior. Anulado en modo stack; destroy lo restaura.
  gsap.set(track, { position: "absolute", inset: "0", margin: "0" });

  // R3-4 (segunda palanca, misma causa): el pt del h2 en el markup (pt-24
  // móvil / lg:pt-32 desktop, pensado para el capítulo vertical) empuja el
  // stage hacia abajo — el centrado del stage no es el centrado del viewport.
  // En modo stack baja a 6rem (= pt-24): reparto vertical header ~96px +
  // tarjeta min(60svh,640px) centrada en el resto, con aire inferior real en
  // viewports de 800-943px de alto. SOLO en modo stack (layout por JS, regla
  // sin-JS); destroy lo restaura y el fallback vertical queda intacto. Layout
  // puro: nada de translate.
  const title = section.querySelector<HTMLElement>("h2");
  if (title !== null) {
    gsap.set(title, { paddingTop: "6rem" });
    state.title = title;
  }

  // Tarjetas: todas IGUALES (imprescindible para apilar), centradas por
  // LAYOUT (inset + margin:auto — nunca translate: GSAP lo hornea), con el
  // cromo del sistema (radio 12px = rounded-xl, --color-card). P1-1 (T3): el
  // borde y el padding de la tarjeta viven en el CSS del componente (solo
  // aplican con data-hscroll-stack). Sin hex nuevos: todo por vars
  // existentes. SIN will-change persistente: lo aplica/retira onToggle
  // (solo durante el pin).
  gsap.set(cards, {
    position: "absolute",
    inset: "0",
    margin: "auto",
    width: STACK.cardWidth,
    height: STACK.cardHeight,
    overflow: "hidden",
    borderRadius: "0.75rem",
    backgroundColor: "var(--color-card)",
  });
  // Ocultación inicial SOLO por gsap.set: las tarjetas 2..N esperan fuera del
  // stage (a la derecha); sin JS nunca se aplica → filas verticales visibles.
  gsap.set(cards.slice(1), { xPercent: STACK.enterXPercent });

  // R2 — Overlays de oscurecimiento: uno por tarjeta, ÚLTIMO hijo (pinta
  // encima del contenido; la tarjeta tiene overflow hidden). Artefactos de
  // animación creados por JS (regla sin-JS: sin JS no existen) → destroy los
  // remueve. SOLO opacity (nada de filter: transform/opacity).
  const overlays = cards.map((card) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-hscroll-dim", "");
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText =
      "position:absolute;inset:0;pointer-events:none;" +
      "background:var(--color-bg-alt);opacity:0;";
    card.appendChild(overlay);
    return overlay;
  });
  state.overlays = overlays;

  /** P1-1 (T3): la imagen en COLOR la lleva la tarjeta superior del stack (la
   *  que está en foco). Se marca con data-hscroll-top (lo lee el CSS del
   *  componente). El índice es el MISMO que el del contador 01/06 -> la
   *  imagen en color y el contador nunca se contradicen. */
  const setTopCard = (idx: number): void => {
    cards.forEach((card, j) => {
      if (j === idx) card.setAttribute("data-hscroll-top", "");
      else card.removeAttribute("data-hscroll-top");
    });
  };

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
    // P1-1 (T3): estado inicial correcto sin esperar al primer onUpdate
    // (imagen 01 en color, el resto en gris).
    setTopCard(0);
  }

  let lastIdx = -1;
  const total = pad2(cards.length);
  const updateCounter = (progress: number): void => {
    const idx = Math.min(
      cards.length - 1,
      Math.max(0, Math.round(progress * (cards.length - 1))),
    );
    if (idx === lastIdx) return;
    lastIdx = idx;
    const counter = state.counter;
    if (counter !== null) counter.textContent = `${pad2(idx + 1)} / ${total}`;
    setTopCard(idx);
  };

  const n = cards.length;

  // R6 — recorrido en vh: viaje + dwell de lectura + slide de salida.
  const travelVh = (n - 1) * STACK.vhPerCard;

  // UNA timeline scrubbed para TODO el recorrido (política rewind:
  // reversible). Start NATURAL "top top": la sección llega arriba y el pin
  // engancha (transición Thesis→Servicios continua, sin fronteras).
  // refreshPriority 19 (STACK.priority): en GSAP 3.15.0 el sort del refresh
  // es `(priority || 0) * -1e6` — priority MAYOR se refresca PRIMERO (19 >
  // rail 15 > circuit 10): el rail lee este end FRESCO en cada refresh.
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () =>
        "+=" +
        Math.round(
          (travelVh + STACK.stackDwellVh + REVEAL.slideLenVh) * window.innerHeight,
        ),
      pin: true,
      scrub: STACK.scrub,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      refreshPriority: STACK.priority,
      id: "hscroll",
      // will-change SOLO durante el pin: capas GPU permanentes en el resto de
      // la página = lag. R6: la sección entra en el ciclo (anima xPercent).
      onToggle: (self) => {
        if (self.isActive) {
          gsap.set(cards, { willChange: "transform" });
          gsap.set(overlays, { willChange: "opacity" });
          gsap.set(section, { willChange: "transform" });
        } else {
          gsap.set(cards, { clearProps: "willChange" });
          gsap.set(overlays, { clearProps: "willChange" });
          gsap.set(section, { clearProps: "willChange" });
        }
      },
      onUpdate: (self) => {
        // El contador vive SOLO en el tramo de VIAJE [0, travel]: durante el
        // dwell de lectura y el slide de salida el 06/06 queda estático.
        // (R6-b: fuera el sticky emulado del panel — lo sostiene el pin
        // natural "proceso", creado al final de esta función.)
        const range = self.end - self.start;
        if (range <= 0) return;
        const travelFrac = (travelVh * window.innerHeight) / range;
        const travel = self.progress / travelFrac;
        updateCounter(Math.min(1, Math.max(0, travel)));
      },
    },
  });

  // will-change inicial si el pin arranca ya activo (carga con el scroll
  // restaurado dentro del rango: onToggle puede no dispararse al crear).
  if (timeline.scrollTrigger?.isActive === true) {
    gsap.set(cards, { willChange: "transform" });
    gsap.set(overlays, { willChange: "opacity" });
    gsap.set(section, { willChange: "transform" });
  }

  // Coreografía por tarjeta: entrada desde la derecha con overshoot de
  // asentado (R2) + escala progresiva sutil + overlay de oscurecimiento +
  // deriva de profundidad. Todo menos la entrada con ease "none": el scroll
  // es el playhead. Rangos en unidades [j - 1, j] / [j, N - 1]; la cola
  // (dwell + slide) se añade después.
  cards.forEach((card, j) => {
    if (j > 0) {
      // Entrada: desliza desde la derecha y aterriza con leve overshoot
      // elegante (back.out(1.2)) que se asienta al final del rango.
      timeline.fromTo(
        card,
        { xPercent: STACK.enterXPercent },
        {
          xPercent: 0,
          duration: 1,
          ease: STACK.enterEase,
          immediateRender: false,
        },
        j - 1,
      );
    }
    if (j < n - 1) {
      // Escala progresiva hacia su target mientras las siguientes llegan.
      timeline.to(
        card,
        { scale: targetScale(j), duration: n - 1 - j, ease: "none" },
        j,
      );
      // R2: oscurecimiento de la tarjeta cubierta (mismo rango que la
      // escala: la profundidad se LEE con dos señales coherentes).
      timeline.to(
        overlays[j],
        { opacity: STACK.dimOpacity, duration: n - 1 - j, ease: "none" },
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

  // R6 — COLA del recorrido en unidades de timeline (1 unidad =
  // vhPerCard·vh px: el ritmo px/unidad del viaje se conserva en todo el
  // rango). (a) dwell de lectura de la tarjeta 06; (b) SLIDE final: la
  // SECCIÓN entera sale por la izquierda (power2.inOut) y revela Proceso
  // (pinneado z-0 debajo — ver cabecera: su pin cubre exactamente este slide
  // más el rango del rail).
  const dwellUnits = STACK.stackDwellVh / STACK.vhPerCard;
  const slideUnits = REVEAL.slideLenVh / STACK.vhPerCard;
  timeline.to({}, { duration: dwellUnits }, n - 1);
  timeline.fromTo(
    section,
    { xPercent: 0 },
    {
      xPercent: -100,
      duration: slideUnits,
      ease: "power2.inOut",
      immediateRender: false,
    },
    n - 1 + dwellUnits,
  );

  state.timeline = timeline;

  // R6-b — REVEAL DE PROCESO (ver cabecera): margen negativo en el WRAPPER
  // EXTERIOR (nunca en el pin-target: el pin-spacer lo anularía al envolver)
  // + PIN NATURAL del div interior [data-proceso-pin]. Va DESPUÉS de crear la
  // timeline: así el pin-spacer de hscroll ya está aplicado cuando el pin
  // mide su "top top" (el final ScrollTrigger.refresh() de index.ts lo
  // re-valida en cada ciclo). Estilos crudos con unidades svh (resize-proof;
  // gsap.set hornearía px). SOLO con el stack montado (regla sin-JS): sin JS
  // / móvil / reduced-motion el wrapper queda en flujo normal y sin pin.
  const under = document.querySelector<HTMLElement>("[data-proceso-under]");
  const pinEl = document.querySelector<HTMLElement>("[data-proceso-pin]");
  if (under !== null && pinEl !== null) {
    // -(100svh de la sección pineada + slideLenVh): deja el top del wrapper
    // en scroll = hscroll.end − slideLenVh = inicio EXACTO del slide → el pin
    // del panel engancha con "top top" NATURAL (cero saltos) y cubre
    // slide + rail. La sección mide 100svh exactos en modo stack (ver
    // cabecera), así que la fórmula no depende de N ni de vhPerCard.
    under.style.marginTop = `${-(100 + REVEAL.slideLenVh * 100)}svh`;
    state.under = under;
    state.pinTrigger = ScrollTrigger.create({
      trigger: pinEl,
      start: "top top",
      end: () =>
        "+=" +
        Math.round(
          (REVEAL.slideLenVh + RAIL.railLenVh) * window.innerHeight,
        ),
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      // 15 = RAIL.priority (hscroll 19 refresca antes; circuit 10 después).
      // Empata con el driver del rail ("rail-grid"): este se crea antes, y el
      // sort estable del refresh resuelve el empate por orden de creación.
      refreshPriority: RAIL.priority,
      id: "proceso",
    });
  }
}

/**
 * Variante VERTICAL (<lg + no-preference, STACK_MOBILE). Misma gramática que
 * desktop adaptada al eje Y y MISMO estado/limpieza (destroyHScroll):
 *   - La sección pinea a 100svh exactos (header + stage). Tarjetas absolutas
 *     en el stage (overflow hidden); la k entra con yPercent 100 → 0 desde el
 *     borde inferior del stage y la k-1 queda cubierta: scale 0.94 (origin
 *     arriba-centro), asomo de `peek` px y overlay de oscurecimiento.
 *   - Cola: dwell de lectura + `riseVh` de pin en el que PROCESO SUBE como una
 *     hoja: su wrapper [data-proceso-under] se adelanta -100svh y pinta encima
 *     (z-index 20 > z-10 de Servicios). Scroll NATURAL 1:1, sin transform: al
 *     acabar el pin Proceso cubre el viewport exacto y la página sigue en flujo
 *     (Servicios queda debajo, oculta). Sin pin "proceso" en móvil.
 *   - id "hscroll-m" (NO "hscroll"): el rail móvil y las anclas de Lenis
 *     siguen con su arranque natural (offsetTop ya incluye spacer y margen).
 */
export function initHScrollMobile(): void {
  destroyHScroll();
  const wrapper = document.querySelector<HTMLElement>("[data-hscroll]");
  if (wrapper === null || !window.matchMedia(STACK_MOBILE.mountQuery).matches) return;
  const track = wrapper.querySelector<HTMLElement>("[data-hscroll-track]");
  const section = wrapper.closest<HTMLElement>("section");
  const inner = section?.querySelector<HTMLElement>("[data-hscroll-inner]") ?? null;
  if (track === null || section === null || inner === null) return;
  const cards = Array.from(track.children).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  if (cards.length < 2) return;

  state.wrapper = wrapper;
  state.track = track;
  state.section = section;
  state.inner = inner;
  state.cards = cards;
  state.cardStyles = cards.map((card) => card.getAttribute("style"));
  state.mounted = true;
  // Marca distinta de desktop ("true"): el CSS de tarjeta de desktop no
  // aplica; el componente tiene su propio bloque para "mobile".
  section.dataset.hscrollStack = "mobile";

  // Layout SOLO por JS (regla sin-JS). Alto EXACTO 100svh (estilo crudo: svh
  // resize-proof) — la fórmula del margen de Proceso depende de ello.
  section.style.height = "100svh";
  gsap.set(section, { display: "flex", flexDirection: "column", overflow: "hidden" });
  gsap.set(inner, { display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 });
  gsap.set(wrapper, {
    position: "relative",
    overflow: "hidden",
    flex: "1 1 auto",
    minHeight: 0,
    width: "100%",
    marginBottom: STACK_MOBILE.stageGap,
  });
  gsap.set(track, { position: "absolute", inset: "0", margin: "0" });
  const title = section.querySelector<HTMLElement>("h2");
  if (title !== null) {
    gsap.set(title, { paddingTop: STACK_MOBILE.titlePad });
    state.title = title;
  }

  // Tarjetas: slot = stage menos el asomo superior (la cubierta sube `peek`
  // px y se ve por encima de la nueva). Ocultación inicial SOLO por gsap.set.
  gsap.set(cards, {
    position: "absolute",
    top: STACK_MOBILE.peek,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 0,
    overflow: "hidden",
    borderRadius: "0.75rem",
    backgroundColor: "var(--color-card)",
    transformOrigin: "50% 0%",
  });
  gsap.set(cards.slice(1), { yPercent: 100 });

  const overlays = cards.map((card) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-hscroll-dim", "");
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText =
      "position:absolute;inset:0;pointer-events:none;" +
      "background:var(--color-bg-alt);opacity:0;";
    card.appendChild(overlay);
    return overlay;
  });
  state.overlays = overlays;

  const header = section.querySelector<HTMLElement>("[data-hscroll-header]");
  const total = pad2(cards.length);
  if (header !== null) {
    const counter = document.createElement("p");
    counter.setAttribute("data-hscroll-progress", "");
    counter.setAttribute("aria-hidden", "true");
    counter.style.cssText =
      "position:absolute;right:0;bottom:0.25rem;" +
      "font-family:var(--font-mono);font-size:0.875rem;line-height:1.5;" +
      "font-variant-numeric:tabular-nums;color:var(--color-text-dark);";
    counter.textContent = `${pad2(1)} / ${total}`;
    header.appendChild(counter);
    state.counter = counter;
  }
  let lastIdx = 0;

  const n = cards.length;
  const travelVh = (n - 1) * STACK_MOBILE.vhPerCard;
  const setWillChange = (on: boolean): void => {
    if (on) {
      gsap.set(cards, { willChange: "transform" });
      gsap.set(overlays, { willChange: "opacity" });
    } else {
      gsap.set(cards, { clearProps: "willChange" });
      gsap.set(overlays, { clearProps: "willChange" });
    }
  };

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: () =>
        "+=" +
        Math.round(
          (travelVh + STACK_MOBILE.dwellVh + STACK_MOBILE.riseVh) * window.innerHeight,
        ),
      pin: true,
      scrub: STACK.scrub,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      refreshPriority: STACK.priority,
      id: "hscroll-m",
      onToggle: (self) => setWillChange(self.isActive),
      onUpdate: (self) => {
        const range = self.end - self.start;
        if (range <= 0) return;
        const travel = self.progress / ((travelVh * window.innerHeight) / range);
        const idx = Math.min(n - 1, Math.max(0, Math.round(Math.min(1, travel) * (n - 1))));
        if (idx === lastIdx) return;
        lastIdx = idx;
        if (state.counter !== null) state.counter.textContent = `${pad2(idx + 1)} / ${total}`;
      },
    },
  });
  if (timeline.scrollTrigger?.isActive === true) setWillChange(true);

  cards.forEach((card, j) => {
    if (j > 0) {
      timeline.fromTo(
        card,
        { yPercent: 100 },
        { yPercent: 0, duration: 1, ease: "power2.out", immediateRender: false },
        j - 1,
      );
    }
    if (j < n - 1) {
      // Cubierta por la j+1 mientras esta sube (mismo rango): escala, asomo y
      // oscurecimiento. Las más profundas quedan quietas detrás.
      timeline.to(
        card,
        { scale: STACK_MOBILE.coverScale, y: -STACK_MOBILE.peek, duration: 1, ease: "none" },
        j,
      );
      timeline.to(overlays[j], { opacity: STACK.dimOpacity, duration: 1, ease: "none" }, j);
    }
  });
  // Cola: dwell + subida de Proceso (scroll natural; tween vacío = longitud).
  timeline.to(
    {},
    { duration: (STACK_MOBILE.dwellVh + STACK_MOBILE.riseVh) / STACK_MOBILE.vhPerCard },
    n - 1,
  );
  state.timeline = timeline;

  // Proceso como hoja: -100svh (= alto de la sección pineada) deja su top en
  // el viewport-bottom al empezar la subida y en el top EXACTO al acabar el
  // pin. z-index por encima de Servicios (z-10). Estilos crudos, destroy los
  // retira.
  const under = document.querySelector<HTMLElement>("[data-proceso-under]");
  if (under !== null) {
    under.style.marginTop = "-100svh";
    under.style.zIndex = "20";
    state.under = under;
  }
}

/**
 * Limpieza total: mata timeline/trigger, el pin "proceso" y devuelve
 * section/wrapper/track/cards al estado del markup (filas verticales), retira
 * el margen del wrapper de Proceso y el contador. resetMotion() la llama
 * ANTES de media.revert(); idempotente. clearProps "all" en las tarjetas es
 * seguro: no tienen ningún estilo inline previo (el cromo lo puso este
 * módulo).
 *
 * REVERSIÓN EN TOGGLE EN VIVO (verificada en el fuente de GSAP 3.15,
 * Context.kill(revert)): al cruzar a reduce, matchMedia revierte el contexto
 * en dos fases — (1) los tweens grabados (los gsap.set de layout y el estado
 * inicial) se revierten en orden inverso de creación y cada propiedad vuelve
 * a su valor PRE-set (los estilos inline desaparecen); (2) DESPUÉS corre este
 * cleanup, cuyo clearProps remata cualquier resto. Resultado: tarjetas de
 * vuelta al flujo del markup (fallback vertical opera) y Proceso de vuelta a
 * flujo normal (sin margen ni pin). Al volver a no-preference el contexto se
 * recrea y initHScroll() remonta el stack (idempotente).
 */
export function destroyHScroll(): void {
  if (state.timeline !== null) {
    state.timeline.scrollTrigger?.kill();
    state.timeline.kill();
    state.timeline = null;
  }
  // P1-1/P1-2b (T3): fuera el estado de stack -> el CSS del componente deja de
  // aplicar y el fallback vertical del markup vuelve intacto.
  if (state.section !== null) state.section.removeAttribute("data-hscroll-stack");
  if (state.cards.length > 0) {
    state.cards.forEach((card) => card.removeAttribute("data-hscroll-top"));
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
    state.cards.forEach((card, j) => {
      const markup = state.cardStyles[j] ?? null;
      if (markup !== null) card.setAttribute("style", markup);
    });
    state.cardStyles = [];
  }
  if (state.overlays.length > 0) {
    // R2: los overlays son artefactos JS → mismos dos pasos que las tarjetas
    // (killTweensOf limpia propTweens residuales, remove los saca del DOM).
    gsap.killTweensOf(state.overlays);
    state.overlays.forEach((overlay) => overlay.remove());
    state.overlays = [];
  }
  if (state.track !== null) {
    gsap.set(state.track, { clearProps: "position,inset,margin" });
  }
  if (state.wrapper !== null) {
    gsap.set(state.wrapper, {
      clearProps: "position,overflow,flex,width,minHeight,marginBottom",
    });
  }
  if (state.section !== null) {
    // R6: killTweensOf también para la sección (el fromTo del slide es un
    // hijo anidado del timeline: mismo mecanismo de fuga que las tarjetas) y
    // xPercent en el clearProps.
    gsap.killTweensOf(state.section);
    gsap.set(state.section, {
      clearProps:
        "minHeight,height,overflow,display,flexDirection,justifyContent,xPercent,willChange",
    });
  }
  if (state.inner !== null) {
    // P1-2b (T3): el div interior recibió display/flexDirection/flex por
    // gsap.set -> mismos clearProps para volver al estado del markup.
    gsap.set(state.inner, { clearProps: "display,flexDirection,flex,minHeight" });
    state.inner = null;
  }
  if (state.pinTrigger !== null) {
    // R6-b: el pin del panel muere antes de retirar su margen (matar el
    // trigger desmonta su pin-spacer; al ir en ese orden no hay un refresh
    // intermedio que mida el layout a medio desmontar).
    state.pinTrigger.kill();
    state.pinTrigger = null;
  }
  if (state.under !== null) {
    // R6-b: el margen del wrapper lo aplicó este módulo con estilo crudo →
    // se retira a mano (matchMedia.revert() no deshace mutaciones de style).
    state.under.style.marginTop = "";
    state.under.style.zIndex = ""; // variante móvil (hoja sobre Servicios)
    state.under = null;
  }
  if (state.counter !== null) {
    state.counter.remove();
    state.counter = null;
  }
  if (state.title !== null) {
    // R3-4: devuelve el pt del markup (pt-24 / lg:pt-32) al fallback vertical.
    gsap.set(state.title, { clearProps: "paddingTop" });
    state.title = null;
  }
  state.cards = [];
  state.wrapper = null;
  state.track = null;
  state.section = null;
  state.inner = null;
  state.mounted = false;
}
