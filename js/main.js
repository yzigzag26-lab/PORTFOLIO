/* ============================================================
   LINUXBOSS — Public site behavior (main.js)
   Theme, navigation, mobile menu, active links, footer year,
   copy-email, maintenance banner, back-to-top.
   ============================================================ */
(function () {
  "use strict";

  const THEME_KEY = "lbx_theme";
  const store = (window.LB && window.LB.storage) || {
    get: (k, f) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }
  };

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  /* ---------- Theme toggle (persisted, respects system default) ---------- */
  function initTheme() {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { window.localStorage.setItem(THEME_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      btn.setAttribute("aria-label", next === "dark" ? "Switch to light mode" : "Switch to dark mode");
    });
  }

  /* ---------- Sticky nav refinement on scroll ---------- */
  function initNav() {
    const nav = document.getElementById("siteNav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  function initMobileMenu() {
    const btn = document.getElementById("menuBtn");
    const links = document.getElementById("navLinks");
    if (!btn || !links) return;
    const setOpen = (open) => {
      links.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    btn.addEventListener("click", () => setOpen(!links.classList.contains("open")));
    links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
  }

  /* ---------- Active section highlight ---------- */
  function initActiveLinks() {
    const links = Array.from(document.querySelectorAll("#navLinks a[href^='#']"));
    const sections = links
      .map(a => document.querySelector(a.getAttribute("href")))
      .filter(Boolean);
    if (!links.length || !sections.length || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = "#" + entry.target.id;
        links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === id));
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(s => obs.observe(s));
  }

  /* ---------- Footer year (never hardcoded) ---------- */
  function initYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------- Tiny toast ---------- */
  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById("toast");
    const txt = document.getElementById("toastText");
    if (!el || !txt) return;
    txt.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  /* ---------- Copy email ---------- */
  function initCopyEmail() {
    const btn = document.getElementById("btnCopyEmail");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const data = window.LBData ? window.LBData.get() : null;
      const email = (data && data.profile && data.profile.email) || "yzigzag@gmail.com";
      try {
        await navigator.clipboard.writeText(email);
        toast("Email copied to clipboard");
      } catch {
        toast(email);
      }
    });
  }

  /* ---------- Maintenance banner dismiss ---------- */
  function initMaintenance() {
    const btn = document.getElementById("maintenanceDismiss");
    const banner = document.getElementById("maintenanceBanner");
    if (!btn || !banner) return;
    btn.addEventListener("click", () => banner.classList.remove("show"));
  }

  /* ---------- Card spotlight (subtle, pointer-driven) ---------- */
  function initSpotlight() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.addEventListener("pointermove", e => {
      const card = e.target.closest && e.target.closest(".project-card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initNav();
    initMobileMenu();
    initActiveLinks();
    initYear();
    initCopyEmail();
    initMaintenance();
    initSpotlight();
  });
})();
