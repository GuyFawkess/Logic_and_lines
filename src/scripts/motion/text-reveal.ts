/**
 * Text reveals (SplitText) - phase F2 (docs/motion-plan.md, section 4).
 *
 * Titulares: split por LINEAS con mascara (`mask: "lines"` de SplitText 3.13+,
 * wrapper extra con overflow:clip) y `yPercent: 110 -> 0` con easing "ll-reveal".
 * Frases cortas: split por PALABRAS (fade + subida corta). Los CHARS quedan
 * excluidos de F2 (hover roll = F4).
 *
 * DECISION autoSplit vs ciclo manual: se usa `autoSplit: true` + `onSplit`.
 * Evidencia del propio fuente (node_modules/gsap/SplitText.js, 3.15.0):
 *   - re-split en `document.fonts` "loadingdone" (equivalente funcional a
 *     document.fonts.ready; puede dispararse mas de una vez si las fuentes
 *     llegan por lotes, y cada pasada es inocua porque preserva estado);
 *   - re-split en cambios de ANCHO medidos con ResizeObserver + debounce de
 *     200ms comparando offsetWidth (ignora cambios de altura);
 *   - ambos hooks solo se activan si `type` incluye "lines" (los limites de
 *     palabra son espacios: no dependen ni de las fuentes ni del ancho).
 * Cubre por tanto el ciclo pedido (fonts + resize 200ms solo-ancho + ruta/idioma
 * via astro:after-swap -> resetMotion). El estado "ya revelado" NO lo gestiona
 * SplitText: se persiste aqui en un WeakMap por elemento (robusto a re-splits)
 * para cumplir la regla critica de que un re-split jamas re-anima un titular
 * cuyo trigger ya paso: el split nuevo queda en estado final inmediato.
 *
 * DECISION deepSlice: `false` en los splits por lineas (el default `true`
 * subdividiria hijos anidados que envuelven varias lineas visuales clonandolos
 * por linea). El h1 del hero lleva el ritmo vertical F1 en el padding de sus
 * `span.block` (pb-1/pb-2): clonarlos por linea duplicaria ese padding entre
 * las lineas internas de cada frase y alteraria el diseno F1. Sin subdivision
 * cada frase es una unidad de mascara (2 en el hero) y el presupuesto de <=12
 * elementos por viewport se cumple (2 lineas + 8-9 palabras). Los hijos anidados
 * del resto (color en set:html, italic del h1) son de una palabra: no necesitan
 * subdivision y quedan intactos, color incluido.
 *
 * Mascaras: `mask: "lines"` envuelve cada linea en un clon con overflow:clip
 * (SplitText 3.13+). El aire de recorte lo da global.css con
 * `overflow-clip-margin` sobre `.ll-line-mask` para que dieresis, descendentes
 * e italic no se corten en estado final (ver comentario alli).
 *
 * Movil: la condicion se evalua por ventana (window.matchMedia, tokens
 * MOBILE_QUERY) en cada split y el resize de 200ms solo-ancho monta/desmonta
 * las palabras (en movil la keywords line queda estatica). Evita anidar un
 * gsap.matchMedia dentro del de index.ts con el mismo comportamiento.
 *
 * Ocultacion inicial SIEMPRE via gsap.set, jamas CSS: sin JS el contenido queda
 * 100% visible y sin mascaras (leccion de CLS heredada).
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DUR, MOBILE_QUERY, RESIZE_DEBOUNCE, STAGGER, WORDS_Y } from "./tokens";

type RevealMode = "lines" | "words";

interface RevealEntry {
  el: Element;
  mode: RevealMode;
  /** Split actual; se asigna justo despues de crearlo (onSplit corre dentro de create). */
  split: SplitText | null;
  tween: gsap.core.Tween | null;
  trigger: ScrollTrigger | null;
  /** true cuando el elemento ya paso su trigger: los re-splits no lo re-animan. */
  revealed: boolean;
  /** Numero de splits ejecutados (1 = inicial; >1 = re-split). */
  splits: number;
}

const entries = new Map<Element, RevealEntry>();

/**
 * Estado "revelado" que sobrevive al ciclo de vida de un entry (p.ej. al
 * recrear las palabras al volver de movil a desktop). Los nodos nuevos de una
 * navegacion VT empiezan sin memoria y se animan de nuevo.
 */
const revealedMemory = new WeakMap<Element, boolean>();

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let lastWidth = 0;
let refreshPending = false;
let refreshRafId: number | null = null;

function isMobile(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

/** Mata tween + ScrollTrigger de un entry (el markup lo gestiona SplitText). */
function disposeAnimation(entry: RevealEntry): void {
  entry.trigger?.kill();
  entry.trigger = null;
  entry.tween?.kill();
  entry.tween = null;
}

/**
 * UN ScrollTrigger.refresh() tras un re-split con geometria nueva, agrupado en
 * un solo frame (varios onSplit del mismo lote = un solo refresh).
 * requestAnimationFrame, nunca setTimeout(0) (leccion Lenis+pins, motion-plan 6).
 */
function scheduleRefresh(): void {
  if (refreshPending) return;
  refreshPending = true;
  refreshRafId = requestAnimationFrame(() => {
    refreshRafId = null;
    refreshPending = false;
    ScrollTrigger.refresh();
  });
}

/** Configura ocultacion inicial + tween pausado + trigger one-shot. */
function handleSplit(entry: RevealEntry, self: SplitText): void {
  entry.splits += 1;

  // Si el re-split (autoSplit por fuentes loadingdone o ResizeObserver) cae
  // MIENTRAS el tween de reveal esta en vuelo sobre un entry ya revelado,
  // la geometria anterior muere con disposeAnimation y el early-return
  // dejaria las lineas nuevas en estado final (transform: none) sin
  // animacion visible: en la carga inicial no se nota porque el re-split
  // suele caer despues de los 800ms del tween, pero tras una navegacion
  // VT a una ruta con el titular dentro del viewport (caso del h1 del
  // hero, top 85% ya pasado al crear el trigger), el onEnter dispara
  // gsap.play() y el re-split de autoSplit cae en el siguiente microtask
  // matando el tween a los pocos ms. La unica forma de evitar el salto
  // visual a estado final es capturar la posicion actual del tween ANTES
  // de matarlo y montar el split nuevo como continuacion del mismo viaje.
  // Si el tween ya completo (progress >= 1) o nunca existio (caso reduce
  // toggle: destroyTextReveal ya limpio entries), el comportamiento
  // conservador se mantiene: lineas nuevas en estado final, sin re-animar.
  let captured: { yPercent: number } | { y: number; autoAlpha: number } | null = null;
  if (entry.revealed && entry.tween && entry.tween.progress() < 1) {
    const target = entry.tween.targets()[0] as Element | undefined;
    if (target) {
      if (entry.mode === "lines") {
        const yp = gsap.getProperty(target, "yPercent") as number;
        if (Number.isFinite(yp)) captured = { yPercent: yp };
      } else {
        const y = gsap.getProperty(target, "y") as number;
        const aa = gsap.getProperty(target, "autoAlpha") as number;
        if (Number.isFinite(y) && Number.isFinite(aa)) captured = { y, autoAlpha: aa };
      }
      // Reset del flag para que el re-split vuelva a pasar por el flujo
      // normal (gsap.set + tween + trigger). Sin esto, el early-return
      // siguiente haria un segundo snap a estado final.
      entry.revealed = false;
      revealedMemory.delete(entry.el);
    }
  }

  // Un re-split sustituye a la geometria anterior: el tween/trigger previos mueren.
  disposeAnimation(entry);

  if (entry.revealed) {
    // REGLA CRITICA: si el trigger ya paso y el tween ya completo, el split
    // nuevo queda en estado final inmediato, sin ocultar y sin tween.
    // Esto preserva el comportamiento verificado por QA: toggle reduce
    // (destroyTextReveal limpia entries, al restaurar initTextReveal ve
    // revealed=true sin tween asociado y deja el estado final) y re-splits
    // de resize sobre un reveal ya completo (progress >= 1).
    return;
  }

  const mobile = isMobile();

  if (entry.mode === "lines") {
    const lines = self.lines;
    // Ocultacion inicial POR gsap.set, jamas CSS. Si el re-split capturo
    // un punto intermedio del tween anterior, las lineas nuevas arrancan
    // en ese mismo punto (sin salto) y el tween continua hasta yPercent 0.
    const startYPercent = captured && "yPercent" in captured ? captured.yPercent : 110;
    gsap.set(lines, { yPercent: startYPercent });
    entry.tween = gsap.to(lines, {
      yPercent: 0,
      duration: DUR.base,
      ease: "ll-reveal",
      stagger: mobile ? STAGGER.textMobile : STAGGER.text,
      paused: true,
    });
  } else {
    const words = self.words;
    const startY = captured && "y" in captured ? captured.y : WORDS_Y;
    const startAutoAlpha = captured && "autoAlpha" in captured ? captured.autoAlpha : 0;
    gsap.set(words, { y: startY, autoAlpha: startAutoAlpha });
    entry.tween = gsap.to(words, {
      y: 0,
      autoAlpha: 1,
      duration: DUR.base,
      ease: "ll-reveal",
      stagger: STAGGER.text,
      paused: true,
    });
  }

  entry.trigger = ScrollTrigger.create({
    trigger: entry.el,
    start: "top 85%",
    once: true,
    onEnter: () => {
      entry.revealed = true;
      revealedMemory.set(entry.el, true);
      entry.tween?.play();
    },
  });

  // Re-split (no el split inicial): refrescar triggers una vez por lote.
  if (entry.splits > 1) scheduleRefresh();
}

function setupReveal(el: Element, mode: RevealMode): void {
  const entry: RevealEntry = {
    el,
    mode,
    split: null,
    tween: null,
    trigger: null,
    revealed: revealedMemory.get(el) ?? false,
    splits: 0,
  };
  entries.set(el, entry);

  if (mode === "lines") {
    entry.split = SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "ll-line",
      // Sin subdivision de hijos anidados: preserva el ritmo F1 (ver cabecera).
      deepSlice: false,
      autoSplit: true,
      onSplit: (self) => {
        handleSplit(entry, self);
      },
    });
  } else {
    entry.split = SplitText.create(el, {
      type: "words",
      wordsClass: "ll-word",
      onSplit: (self) => {
        handleSplit(entry, self);
      },
    });
  }
}

/**
 * Solo-cambios-de-ancho, debounced 200ms (misma tolerancia que autoSplit).
 * Su unico trabajo extra es el toggle de palabras entre movil y desktop: los
 * cortes de linea ya los re-split autoSplit.
 */
function onResize(): void {
  if (resizeTimer !== null) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeTimer = null;
    const width = window.innerWidth;
    if (width === lastWidth) return;
    lastWidth = width;

    const wordEntries: RevealEntry[] = [];
    entries.forEach((entry) => {
      if (entry.mode === "words") wordEntries.push(entry);
    });

    if (isMobile()) {
      // Movil: las palabras quedan estaticas, sin split ni tween.
      wordEntries.forEach((entry) => {
        disposeAnimation(entry);
        entry.split?.revert();
        entries.delete(entry.el);
      });
    } else if (wordEntries.length === 0) {
      // Vuelta a desktop: se recrean conservando el estado revelado.
      document.querySelectorAll<HTMLElement>('[data-reveal="words"]').forEach((el) => {
        setupReveal(el, "words");
      });
    }
  }, RESIZE_DEBOUNCE);
}

/**
 * Splits + reveals para todos los `[data-reveal]` de la pagina. Idempotente:
 * destruye lo anterior antes de montar (la ruta nueva trae DOM nuevo).
 */
export function initTextReveal(): void {
  destroyTextReveal();

  lastWidth = window.innerWidth;

  document.querySelectorAll<HTMLElement>('[data-reveal="lines"]').forEach((el) => {
    setupReveal(el, "lines");
  });

  // Palabras SOLO en desktop: en movil la keywords line queda estatica.
  if (!isMobile()) {
    document.querySelectorAll<HTMLElement>('[data-reveal="words"]').forEach((el) => {
      setupReveal(el, "words");
    });
  }

  window.addEventListener("resize", onResize);
}

/**
 * Limpieza total: reverte todos los SplitText (sin wrappers ni mascaras),
 * mata tweens/ScrollTriggers y listeners, y cancela el rAF pendiente.
 * resetMotion() llama esto ANTES de media.revert() porque matchMedia.revert()
 * NO revierte las mutaciones DOM de SplitText: sin este revert explicito
 * habria fugas de wrappers entre navegaciones VT. Doble revert es inocuo
 * (revert() esta guardado por isSplit).
 */
export function destroyTextReveal(): void {
  window.removeEventListener("resize", onResize);
  if (resizeTimer !== null) {
    clearTimeout(resizeTimer);
    resizeTimer = null;
  }
  // Cancela el rAF pendiente de scheduleRefresh: sin esto un refresh()
  // huerfano de ScrollTrigger correria tras la destruccion (p.ej. navegacion
  // VT) midiendo un DOM que ya no existe. Guard + null = idempotente.
  if (refreshRafId !== null) {
    cancelAnimationFrame(refreshRafId);
    refreshRafId = null;
  }
  refreshPending = false;
  entries.forEach((entry) => {
    disposeAnimation(entry);
    entry.split?.revert();
  });
  entries.clear();
  // revealedMemory NO se limpia a proposito (ver su comentario).
}
