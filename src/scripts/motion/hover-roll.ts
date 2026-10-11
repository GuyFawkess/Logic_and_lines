/**
 * Hover roll de chars (F4) — técnica 9 del catálogo
 * (docs/research-v4/2026-10-11-catalogo-motion-trionn.md): el label se
 * desliza hacia arriba char a char y entra una copia desde abajo. Trionn lo
 * aplica a TODA su UI; aquí, a los CTAs/links clave:
 *
 *   - los 6 "Ver servicio" de ServicesIndex  -> [data-gtm-event="service_click"]
 *   - el CTA de BookingClose                 -> [data-cal-link]
 *   - las anclas del nav desktop (SiteHeader) -> header nav ul a
 *   - el CTA del header (SiteHeader)          -> [data-gtm-event="cta_click"]
 *
 * (ES/EN por igual: los selectores son de atributos/estructura, no de texto.)
 *
 * Patrón: el label (el `<span>` del texto) se convierte en máscara
 * (overflow:hidden) con DOS capas apiladas: la capa 1 con los chars del split
 * y la capa 2 — clon exacto, absolute top:100% — oculta bajo el clip. Hover:
 * ambas capas suben `yPercent -100` sincronizadas por índice (stagger 0.02,
 * power4.out). Salida: `reverse()` del timeline = ola inversa (el último char
 * vuelve primero) e interrumpible a mitad de camino (Emil: play/reverse sobre
 * UN timeline, sin overwrite ni re-creación por evento).
 *
 * A11y: SplitText aria "auto" (default) pone aria-label en el label y
 * aria-hidden en los chars; los `<a>` objetivo conservan su nombre accesible
 * (los de servicio ya traen aria-label propio, que tiene precedencia). La
 * capa clonada lleva aria-hidden explícito.
 *
 * Puerta: SOLO (hover:hover) and (pointer:fine) + no-preference — la rama
 * compuesta vive en index.ts; reduced-motion y táctil ven el texto normal.
 *
 * DECISIÓN de módulo: módulo NUEVO hover-roll.ts (no magnetic.ts): el roll y
 * el magnetic son interacciones distintas con ciclos de vida distintos; el
 * stub magnetic.ts queda para el magnetic (F5 decide si sigue en plan).
 */
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ROLL } from "./tokens";

/** Selectores de los targets (hooks existentes: sin markup nuevo). */
const TARGETS = [
  '[data-gtm-event="service_click"]',
  "[data-cal-link]",
  "header nav ul a",
  '[data-gtm-event="cta_click"][data-gtm-location="header_desktop"]',
].join(", ");

interface RollEntry {
  el: HTMLElement;
  label: HTMLElement;
  originalText: string;
  split: SplitText;
  tl: gsap.core.Timeline;
  onEnter: () => void;
  onLeave: () => void;
}

const entries = new Map<HTMLElement, RollEntry>();

/** Localiza (o crea) el elemento label: el `<span>` del texto dentro del target. */
function resolveLabel(el: HTMLElement): { label: HTMLElement; created: boolean } {
  const existing = el.querySelector<HTMLElement>("span");
  if (existing !== null) return { label: existing, created: false };
  // CTAs con texto pelado (BookingClose, CTA del header): envolver en un span
  // para que la máscara y las capas tengan geometría exacta (el contenedor es
  // inline-flex: los chars como items flex romperían el centrado).
  const label = document.createElement("span");
  while (el.firstChild !== null) {
    label.appendChild(el.firstChild);
  }
  el.appendChild(label);
  return { label, created: true };
}

/** Monta el roll sobre un target. Silencioso si el target ya tiene entrada viva. */
function setupRoll(el: HTMLElement): void {
  const { label } = resolveLabel(el);
  // Guard de idempotencia: el Map `entries` SÍ se vacía en destroyHoverRoll,
  // así que un re-init sobre el mismo DOM re-procesa todo (un WeakSet de
  // labels sobreviviría al destroy y mataría el roll en silencio).
  if (entries.has(el)) return;

  const originalText = label.textContent ?? "";

  // Máscara: el label recorta; las capas viven dentro. Los labels objetivo son
  // de una línea y sin descendentes (verificados), y el line-height de text-sm
  // deja aire sobrado en el clip box.
  label.style.position = "relative";
  label.style.overflow = "hidden";
  label.style.whiteSpace = "nowrap";

  const split = SplitText.create(label, { type: "chars", charsClass: "ll-roll-char" });

  // Capa 1: los chars del split. Capa 2: clon exacto, absolute top:100% —
  // queda fuera del clip box (una altura de línea bajo el label) y al animar
  // yPercent -100 recorre EXACTAMENTE la misma distancia que la capa 1:
  // alineación perfecta sin px mágicos.
  const layer1 = document.createElement("span");
  layer1.style.display = "block";
  label.appendChild(layer1);
  Array.from(label.childNodes).forEach((node) => {
    if (node !== layer1) layer1.appendChild(node);
  });
  const layer2 = layer1.cloneNode(true) as HTMLElement;
  layer2.setAttribute("aria-hidden", "true");
  layer2.style.display = "block";
  layer2.style.position = "absolute";
  layer2.style.top = "100%";
  layer2.style.left = "0";
  label.appendChild(layer2);

  const chars1 = Array.from(layer1.children) as HTMLElement[];
  const chars2 = Array.from(layer2.children) as HTMLElement[];

  // UN timeline por link, pausado: play al entrar, reverse al salir (la
  // reversión invierte el stagger = ola inversa del brief).
  const tl = gsap.timeline({ paused: true });
  tl.to(
    chars1,
    { yPercent: -100, duration: ROLL.dur, ease: "power4.out", stagger: ROLL.stagger },
    0,
  );
  tl.to(
    chars2,
    { yPercent: -100, duration: ROLL.dur, ease: "power4.out", stagger: ROLL.stagger },
    0,
  );

  const onEnter = (): void => {
    tl.play();
  };
  const onLeave = (): void => {
    tl.reverse();
  };
  el.addEventListener("mouseenter", onEnter);
  el.addEventListener("mouseleave", onLeave);

  entries.set(el, { el, label, originalText, split, tl, onEnter, onLeave });
}

/** Monta el roll en todos los targets. Idempotente (destruye lo anterior). */
export function initHoverRoll(): void {
  destroyHoverRoll();
  document.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
    setupRoll(el);
  });
}

/**
 * Limpieza total: listeners fuera, timeline muerto, split revertido y texto
 * restaurado de forma determinista (los labels objetivo son texto plano; el
 * force cubre cualquier resto de las capas añadidas tras el split).
 * Idempotente.
 */
export function destroyHoverRoll(): void {
  entries.forEach((entry) => {
    entry.el.removeEventListener("mouseenter", entry.onEnter);
    entry.el.removeEventListener("mouseleave", entry.onLeave);
    entry.tl.kill();
    entry.split.revert();
    if (entry.label.textContent !== entry.originalText) {
      entry.label.textContent = entry.originalText;
    }
    entry.label.style.position = "";
    entry.label.style.overflow = "";
    entry.label.style.whiteSpace = "";
  });
  entries.clear();
}
