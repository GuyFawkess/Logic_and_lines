/**
 * Line-wipe de las imágenes de servicio (F3-v2) — técnica 4 del catálogo
 * (docs/research-v4/2026-10-11-catalogo-motion-trionn.md).
 *
 * Cada `figure[data-image-wipe]` de ServicesIndex se revela con:
 *  - clip-path inset sobre el FIGURE (no sobre el img: así el borde del clip
 *    y la línea guía viven en el mismo espacio y quedan sincronizados; el
 *    inner-parallax del img escala por debajo sin desplazar el borde).
 *  - Línea guía ámbar de 2px (creada por JS, regla de oro sin-JS) que viaja EN
 *    SINCRONÍA con el borde del clip (misma timeline, misma duración y ease)
 *    y se desvanece 0.2s al terminar: no queda residuo.
 *  - Inner-parallax: la imagen scale 1.15 → 1 en la misma timeline (acaba en
 *    scale 1 EXACTO).
 *
 * DIRECCIÓN (decidida y documentada): el wipe ENTRA desde el lado del TEXTO
 * hacia la imagen — el borde del reveal nace en el borde de la imagen
 * colindante a la columna de texto y viaja hacia fuera (dirección C: la línea
 * llega desde el contenido, y el wipe sigue el orden de lectura texto→imagen).
 *   - dir="ltr" (filas pares: texto izquierda / imagen derecha): el clip se
 *     abre de izquierda a derecha (`inset(0% 100% 0% 0%)` → `inset(0% 0% 0% 0%)`).
 *   - dir="rtl" (filas impares: imagen izquierda / texto derecha): espejo
 *     (`inset(0% 0% 0% 100%)` → `inset(0% 0% 0% 0%)`).
 * En móvil el grid colapsa a una columna (imagen arriba del texto): se
 * conserva la dirección por fila — el wipe es horizontal y barato, misma
 * gramática en ambos viewports (spec F3-v2).
 *
 * INTERACCIÓN CON LA PERSIANA (shutter.ts): las 6 filas viven dentro del
 * wrapper `<div data-shutter>` pineado. Sus triggers llevan `pinnedContainer`
 * apuntando a ese wrapper para que ScrollTrigger desplace su start por el
 * pin-spacer (fuente GSAP: el refresh acumula el offset de pins previos);
 * sin él, las filas profundas dispararían ~1.5vh tarde (imagen visible pero
 * aún recortada). La fila 1 dispara así a mitad del pin: su wipe corre
 * mientras las lamas se abren alrededor — la persiana y el wipe se reparten
 * el reveal sin animación doble en el primer frame (al entrar el pin todo
 * está aún tapado).
 *
 * Ocultación inicial SOLO por gsap.set (sin JS = imágenes visibles sin clip).
 * Reduced-motion: el módulo solo corre en la rama no-preference (index.ts).
 * Patrón init/destroy: idéntico a line-system.ts (destroy desde resetMotion()
 * ANTES de media.revert() + cleanup del contexto, ambos idempotentes).
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IMAGE_WIPE } from "./tokens";
import { isPast } from "./utils";

type WipeDir = "ltr" | "rtl";

interface WipeRecord {
  figure: HTMLElement;
  img: HTMLImageElement;
  dir: WipeDir;
  /** Línea guía creada por JS (null tras retirarse). */
  line: HTMLSpanElement | null;
  timeline: gsap.core.Timeline | null;
  trigger: ScrollTrigger | null;
}

const records: WipeRecord[] = [];

/** Clip inicial según dirección: el reveal nace en el lado del texto. */
function clipFrom(dir: WipeDir): string {
  return dir === "ltr" ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)";
}

/** Prepara y anima una figura. Devuelve el registro (o null si ya pasó). */
function setupWipe(figure: HTMLElement): WipeRecord | null {
  const img = figure.querySelector<HTMLImageElement>("img");
  const holder = figure.parentElement;
  if (img === null || holder === null) return null;
  const dir: WipeDir = figure.getAttribute("data-image-wipe") === "rtl" ? "rtl" : "ltr";

  // ¿Ya pasó la sección al inicializar (VT a ancla, resize por debajo)? El
  // markup ya está en estado final: no se prepara ni se re-anima nada.
  if (isPast(figure, IMAGE_WIPE.start)) return null;

  const record: WipeRecord = { figure, img, dir, line: null, timeline: null, trigger: null };

  // Ocultación inicial SOLO por gsap.set: sin JS el markup (visible) manda.
  gsap.set(figure, { clipPath: clipFrom(dir), willChange: "clip-path" });
  gsap.set(img, { scale: IMAGE_WIPE.scaleFrom, willChange: "transform" });

  // Línea guía: artefacto de animación creado por JS (sin JS no existe).
  const line = document.createElement("span");
  line.style.cssText =
    `position:absolute;top:0;bottom:0;left:0;width:${IMAGE_WIPE.lineWidth}px;` +
    "background:var(--color-primary);pointer-events:none;";
  holder.appendChild(line);
  record.line = line;

  // Recorrido de la línea: todo el ancho del holder, sincronizada con el
  // borde del clip (misma duración y ease). Función re-medida en refresh
  // (invalidateOnRefresh) para seguir siendo exacta si el ancho cambia antes
  // de disparar.
  const travel = (): number => Math.max(holder.offsetWidth - IMAGE_WIPE.lineWidth, 0);

  const tl = gsap.timeline({
    paused: true,
    onComplete: () => {
      // La línea se retira (no queda residuo) y se libera will-change.
      line.remove();
      gsap.set([figure, img], { clearProps: "willChange" });
    },
  });
  record.timeline = tl;

  tl.to(figure, { clipPath: "inset(0% 0% 0% 0%)", duration: IMAGE_WIPE.dur, ease: "power4.inOut" }, 0);
  tl.to(img, { scale: 1, duration: IMAGE_WIPE.dur, ease: "power4.inOut" }, 0);
  tl.fromTo(
    line,
    { x: () => (dir === "ltr" ? 0 : travel()) },
    { x: () => (dir === "ltr" ? travel() : 0), duration: IMAGE_WIPE.dur, ease: "power4.inOut" },
    0,
  );
  tl.to(
    line,
    { autoAlpha: 0, duration: IMAGE_WIPE.lineFade, ease: "power1.out" },
    IMAGE_WIPE.dur - IMAGE_WIPE.lineFade,
  );

  record.trigger = ScrollTrigger.create({
    trigger: figure,
    start: `top ${Math.round(IMAGE_WIPE.start * 100)}%`,
    once: true,
    // Las filas viven dentro del wrapper pineado por la persiana: sin
    // pinnedContainer las filas profundas dispararían ~1.5vh tarde (imagen
    // visible pero aún recortada). GSAP desplaza el start por el pin-spacer.
    pinnedContainer: figure.closest("[data-shutter]"),
    onEnter: () => {
      record.timeline?.play();
    },
  });

  return record;
}

/**
 * Line-wipe para todas las `figure[data-image-wipe]` de la página. Idempotente:
 * destruye lo anterior antes de montar (la ruta nueva trae DOM nuevo). Se
 * llama en la rama no-preference del matchMedia de index.ts, después de
 * initLineSystem() (y tras la condición de la persiana: sus triggers necesitan
 * el pin ya creado para pinnedContainer).
 */
export function initImageReveal(): void {
  destroyImageReveal();
  document.querySelectorAll<HTMLElement>("figure[data-image-wipe]").forEach((figure) => {
    const record = setupWipe(figure);
    if (record !== null) records.push(record);
  });
}

/**
 * Limpieza total: mata triggers/timelines, retira las líneas guía creadas por
 * JS y devuelve figures/imgs al estado del markup (sin clip, sin escala, sin
 * will-change). resetMotion() la llama ANTES de media.revert() porque
 * matchMedia.revert() no deshace mutaciones DOM (los spans); el doble pase con
 * el cleanup del contexto es inocuo.
 */
export function destroyImageReveal(): void {
  records.forEach((record) => {
    record.trigger?.kill();
    record.trigger = null;
    if (record.timeline !== null) {
      record.timeline.kill();
      record.timeline = null;
    }
    if (record.line !== null) {
      record.line.remove();
      record.line = null;
    }
    gsap.set([record.figure, record.img], {
      clearProps: "clipPath,transform,scale,willChange,opacity,visibility",
    });
  });
  records.length = 0;
}
