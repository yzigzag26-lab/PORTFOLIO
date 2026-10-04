/* ============================================================
   LINUXBOSS — Animation engine (animations.js)
   Scroll-reveal via IntersectionObserver + stagger support.
   Fully respects prefers-reduced-motion and the admin
   "animations" setting (lbx_overrides_v1.settings.animations).
   ============================================================ */
(function () {
  "use strict";

  function animationsAllowed() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    try {
      const raw = window.localStorage.getItem("lbx_overrides_v1");
      if (raw) {
        const o = JSON.parse(raw);
        if (o && o.settings && o.settings.animations === false) return false;
      }
    } catch { /* ignore — default to allowed */ }
    return true;
  }

  let observer = null;

  function revealAll(root) {
    (root || document).querySelectorAll(".reveal:not(.in)").forEach(el => el.classList.add("in"));
  }

  function observe(root) {
    const scope = root || document;
    if (!animationsAllowed() || !("IntersectionObserver" in window)) {
      revealAll(scope);
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = parseInt(el.getAttribute("data-delay") || "0", 10);
          if (delay > 0) el.style.transitionDelay = Math.min(delay, 600) + "ms";
          el.classList.add("in");
          observer.unobserve(el);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    }
    scope.querySelectorAll(".reveal:not(.in)").forEach(el => observer.observe(el));
  }

  // Re-evaluate if the admin toggles animations in another tab.
  window.addEventListener("storage", e => {
    if (e.key === "lbx_overrides_v1" && !animationsAllowed()) revealAll(document);
  });

  document.addEventListener("DOMContentLoaded", () => observe(document));

  // Public API used by projects.js after dynamic renders.
  window.LBAnim = { observe, revealAll, animationsAllowed };
})();
