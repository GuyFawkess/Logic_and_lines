// public/scroll-animate.js
document.addEventListener("DOMContentLoaded", initAnimations);

// Also listen for Astro's page navigation events
document.addEventListener('astro:page-load', initAnimations);

function initAnimations() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;

          // Get custom duration from data attribute or use default
          const duration = el.dataset.duration || "1000";

          // Clear any existing transition styles
          el.style.transition = "";

          // Set the transition with the specific duration
          // Important: Set this BEFORE making any class changes
          el.style.transition = `all ${duration}ms ease-out`;

          // Apply animation effect
          const animation = el.dataset.animate;
          switch (animation) {
            case "fade-up":
              el.classList.remove("translate-y-10");
              el.classList.add("translate-y-0");
              break;
            case "fade-left":
              el.classList.remove("-translate-x-10");
              el.classList.add("translate-x-0");
              break;
            case "fade-right":
              el.classList.remove("translate-x-10");
              el.classList.add("translate-x-0");
              break;
            case "zoom-in":
              el.classList.remove("scale-90");
              el.classList.add("scale-100");
              break;
          }

          // Remove opacity-0 to trigger the animation
          el.classList.remove("opacity-0");
          el.classList.add("opacity-100");

          // Stop observing once it's animated
          observer.unobserve(el);

          // Optional: Remove the inline transition style after animation completes
          setTimeout(() => {
            el.style.transition = "";
          }, parseInt(duration) + 100);
        }
      });
    },
    { threshold: 0.1 }
  );

  // Reset animations first
  document.querySelectorAll("[data-animate]").forEach(el => {
    // Reset to initial state based on animation type
    const animation = el.dataset.animate;
    el.classList.add("opacity-0");

    // Remove any lingering transition styles
    el.style.transition = "";

    switch (animation) {
      case "fade-up":
        el.classList.add("translate-y-10");
        el.classList.remove("translate-y-0", "opacity-100");
        break;
      case "fade-left":
        el.classList.add("-translate-x-10");
        el.classList.remove("translate-x-0", "opacity-100");
        break;
      case "fade-right":
        el.classList.add("translate-x-10");
        el.classList.remove("translate-x-0", "opacity-100");
        break;
      case "zoom-in":
        el.classList.add("scale-90");
        el.classList.remove("scale-100", "opacity-100");
        break;
    }

    // Observe the element again
    observer.observe(el);
  });
}
