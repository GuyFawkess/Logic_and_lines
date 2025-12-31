// Persistent initialization for the Hero split-panel animation.
// Re-runs on every client-side navigation and avoids double-binding global listeners.

(function () {
  let leftSide = null;
  let dragHandle = null;
  let isDragging = false;
  let fadeTimeout;

  const refreshRefs = () => {
    leftSide = document.getElementById("left-side");
    dragHandle = document.getElementById("drag-handle");
  };

  const handleMove = (clientX) => {
    const percentage = (clientX / window.innerWidth) * 100;
    const clamped = Math.max(0, Math.min(100, percentage));

    if (leftSide) {
      leftSide.style.width = `${clamped}%`;
    }

    if (dragHandle && window.innerWidth <= 768) {
      dragHandle.style.left = `${clamped}%`;
    }
  };

  const bindDragHandle = () => {
    if (!dragHandle) return;

    dragHandle.addEventListener("touchstart", () => {
      isDragging = true;
      dragHandle.style.opacity = "1";
    });

    dragHandle.addEventListener("touchend", () => {
      isDragging = false;
    });

    dragHandle.addEventListener("mousedown", (e) => {
      if (window.innerWidth <= 768) {
        isDragging = true;
        e.preventDefault();
      }
    });
  };

  const setupFadeOut = () => {
    if (dragHandle && window.innerWidth <= 768) {
      clearTimeout(fadeTimeout);
      dragHandle.style.opacity = "1";
      fadeTimeout = setTimeout(() => {
        if (!isDragging) {
          dragHandle.style.opacity = "0.4";
        }
      }, 3000);
    }
  };

  const attachGlobalListenersOnce = () => {
    if (window.__heroGlobalListenersAttached) return;
    window.__heroGlobalListenersAttached = true;

    // Desktop move
    document.addEventListener("mousemove", (e) => {
      if (window.innerWidth > 768) {
        handleMove(e.clientX);
      }
    });

    // Mobile drag move
    document.addEventListener(
      "touchmove",
      (e) => {
        if (isDragging && e.touches.length > 0) {
          e.preventDefault();
          handleMove(e.touches[0].clientX);
        }
      },
      { passive: false }
    );

    // Mouse up to stop drag
    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // Mobile mouse dragging support
    document.addEventListener("mousemove", (e) => {
      if (isDragging && window.innerWidth <= 768) {
        handleMove(e.clientX);
      }
    });

    // Fade hint on touch
    document.addEventListener("touchstart", setupFadeOut);
  };

  const initHero = () => {
    refreshRefs();
    // If we are not on a page with the hero, do nothing
    if (!leftSide) return;

    bindDragHandle();
    setupFadeOut();
  };

  attachGlobalListenersOnce();

  document.addEventListener("DOMContentLoaded", initHero);
  document.addEventListener("astro:page-load", initHero);
})();