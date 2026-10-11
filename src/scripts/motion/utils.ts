/**
 * Helpers compartidos del sistema de motion (F3-v2).
 *
 * Deduplicación (review M2/M4): `isPast` estaba triplicado (line-system,
 * image-reveal, circuit), `SVG_NS` triplicado (line-system, shutter, circuit)
 * y el anillo del pop de nodo duplicado (line-system, circuit). Los TWEENS no
 * se tocan: cada módulo conserva su propio driver (one-shot vs scrubbed).
 */
import { LINE } from "./tokens";

/** true cuando el elemento ya cruzó hacia arriba la línea `fraction` del viewport. */
export function isPast(el: Element, fraction: number): boolean {
  return el.getBoundingClientRect().top < window.innerHeight * fraction;
}

/** Namespace SVG para createElementNS (compartido por los módulos SVG). */
export const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Anillo efímero del pop de un nodo (artefacto de animación creado por JS:
 * sin JS el markup queda como el diseño F1). Devuelve el <circle> SIN montar:
 * el consumidor lo añade a su svg (el orden de montaje es parte del
 * comportamiento). El stroke va por style porque var() no funciona en
 * atributos SVG.
 */
export function buildNodeRing(
  node: { cx: string; cy: string; r: number },
  doc: Document,
): SVGCircleElement {
  const ring = doc.createElementNS(SVG_NS, "circle");
  ring.setAttribute("cx", node.cx);
  ring.setAttribute("cy", node.cy);
  ring.setAttribute("r", String(node.r + LINE.nodeRingRadiusDelta));
  ring.style.fill = "none";
  ring.style.stroke = "var(--color-primary)";
  ring.style.strokeWidth = String(LINE.nodeRingStroke);
  return ring;
}
