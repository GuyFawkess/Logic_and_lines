/**
 * Line-wipe de las imágenes de servicio (F3-v2 + F4-t2) — técnica 4 del
 * catálogo (docs/research-v4/2026-10-11-catalogo-motion-trionn.md).
 *
 * Cada `figure[data-image-wipe]` de ServicesIndex se revela con:
 *  - clip-path inset sobre el FIGURE (no sobre el img: así el borde del clip
 *    y la línea guía viven en el mismo espacio y quedan sincronizados; el
 *    inner-parallax del img escala por debajo sin desplazar el borde).
 *  - Línea guía ámbar de 2px (creada por JS, regla de oro sin-JS) que viaja EN
 *    SINCRONÍA con el borde del clip (misma timeline, misma duración y ease).
 *  - Inner-parallax: la imagen scale 1.15 → 1 en la misma timeline (acaba en
 *    scale 1 EXACTO).
 *
 * DIRECCIÓN (decidida y documentada): el wipe ENTRA desde el lado del TEXTO
 * hacia la imagen — el borde del reveal nace en el borde de la imagen
 * colindante a la columna de texto y viaja hacia fuera (dirección C: la línea
 * llega desde el contenido, y el wipe sigue el orden de lectura texto→imagen).
 *   - dir="ltr": el clip se abre de izquierda a derecha
 *     (`inset(0% 100% 0% 0%)` → `inset(0% 0% 0% 0%)`).
 *   - dir="rtl": espejo (`inset(0% 0% 0% 100%)` → `inset(0% 0% 0% 0%)`).
 * La alternación por fila se conserva en ambos modos: es la gramática interna
 * del panel, no del eje de scroll.
 *
 * DOS MODOS (F4-t2, política rewind — TODO scrub, reversible en ambos):
 *  - HORIZONTAL (lg + no-preference, con el hscroll de hscroll.ts montado):
 *    el trigger usa containerAnimation = el tween del track (getScrollTween())
 *    con start/end en espacio HORIZONTAL ("left 90%" → "left 40%"): cada
 *    panel dispara su wipe al ENTRAR por la derecha y el progreso va ligado
 *    al del contenedor (scrub: true — el contenedor ya suaviza con scrub 0.8;
 *    un segundo scrub numérico añadiría lag doble). Pin y snap NO existen
 *    dentro de un containerAnimation (limitación documentada de GSAP): no se
 *    usan aquí. Los paneles ya visibles al arrancar el pin (1 y 2) quedan con
 *    el trigger en progreso 1 (pasado): revelados sin animación — solo los
 *    paneles que ENTRAN por la derecha wipean.
 *  - VERTICAL (móvil <lg, o páginas sin hscroll): trigger de scroll vertical
 *    "top 80%" → "top 35%" con scrub 0.8: el wipe corre (y se rebobina) con
 *    el scroll. Sin pinnedContainer: en móvil no hay ningún pin delante (la
 *    persiana vertical y el hscroll son solo lg) y en desktop este modo no
 *    existe.
 *
 * REDUCED-MOTION: el módulo solo corre en la rama no-preference (index.ts) —
 * estado final del markup, sin clip.
 *
 * Ocultación inicial SOLO por gsap.set (sin JS = imágenes visibles sin clip).
 * En modo scrub la timeline NO lleva onComplete ni paused: el playhead lo
 * gobierna el scroll; la línea guía se queda en el DOM (autoAlpha 0 al
 * completar = visibility:hidden, coste de pintado cero) y will-change se
 * libera en el destroy — el scrub puede reactivar el wipe en cualquier
 * momento mientras el trigger esté en rango. destroyImageReveal() retira las
 * líneas y devuelve figures/imgs al estado del markup.
 *
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
  /** Línea guía creada por JS (se retira en el destroy). */
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
function setupWipe(figure: HTMLElement, scrollTween: gsap.core.Tween | null): WipeRecord | null {
  const img = figure.querySelector<HTMLImageElement>("img");
  const holder = figure.parentElement;
  if (img === null || holder === null) return null;
  const dir: WipeDir = figure.getAttribute("data-image-wipe") === "rtl" ? "rtl" : "ltr";
  const horizontal = scrollTween !== null;

  // ¿Ya pasó la sección al inicializar (VT a ancla, resize por debajo)? El
  // markup ya está en estado final: no se prepara ni se re-anima nada. Guard
  // SOLO en vertical: dentro del pin horizontal la posición vertical de la
  // figura no significa nada (el estado lo dicta el progreso del contenedor,
  // que el scrub sincroniza en el refresh).
  if (!horizontal && isPast(figure, IMAGE_WIPE.start)) return null;

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
  // (invalidateOnRefresh) para seguir siendo exacta si el ancho cambia.
  const travel = (): number => Math.max(holder.offsetWidth - IMAGE_WIPE.lineWidth, 0);

  /** Tweens del wipe (comunes a ambos modos): clip + parallax + línea + fade. */
  const addWipeTweens = (tl: gsap.core.Timeline): void => {
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
  };

  if (horizontal) {
    // Dentro del scroll horizontal: espacio de triggers horizontal, progreso
    // ligado al contenedor (scrub reversible; el contenedor ya suaviza).
    const tl = gsap.timeline({
      scrollTrigger: {
        containerAnimation: scrollTween,
        trigger: figure,
        start: IMAGE_WIPE.hStart,
        end: IMAGE_WIPE.hEnd,
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
    record.timeline = tl;
    record.trigger = tl.scrollTrigger ?? null;
    addWipeTweens(tl);
    return record;
  }

  // Vertical: scrub ligado al scroll (política rewind F4-t2, reversible en
  // ambos sentidos). La línea guía se queda en el DOM (autoAlpha 0 al
  // completar) y will-change se libera en el destroy: el scrub puede
  // reactivar el wipe en cualquier momento mientras el trigger esté en rango.
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: figure,
      start: `top ${Math.round(IMAGE_WIPE.start * 100)}%`,
      end: `top ${Math.round(IMAGE_WIPE.end * 100)}%`,
      scrub: IMAGE_WIPE.scrub,
      invalidateOnRefresh: true,
    },
  });
  record.timeline = tl;
  record.trigger = tl.scrollTrigger ?? null;
  addWipeTweens(tl);

  return record;
}

/**
 * Line-wipe para todas las `figure[data-image-wipe]` de la página. Idempotente:
 * destruye lo anterior antes de montar (la ruta nueva trae DOM nuevo). Se
 * llama en la rama no-preference del matchMedia de index.ts, después de
 * initLineSystem() y con el hscroll ya montado: en desktop recibe su tween
 * como containerAnimation (getScrollTween()); en móvil recibe null (vertical).
 */
export function initImageReveal(scrollTween: gsap.core.Tween | null = null): void {
  destroyImageReveal();
  document.querySelectorAll<HTMLElement>("figure[data-image-wipe]").forEach((figure) => {
    const record = setupWipe(figure, scrollTween);
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
