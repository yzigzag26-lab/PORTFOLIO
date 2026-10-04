/* ============================================================
   LINUXBOSS — Data layer + public rendering (projects.js)
   ------------------------------------------------------------
   How data flows (backend-ready):

     1) ONLINE MODE (js/config.js apiUrl is set + API reachable):
          Flask API (/api/public) --> live database content.
          Local JSON + localStorage are IGNORED (the DB is truth).
     2) FILE MODE (served over HTTP, no API):
          data/*.json files.
     3) FALLBACK (file:// or offline):
          LB_DEFAULTS built into this file.

   In modes 2-3, admin localStorage overrides apply on top.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Safe storage wrapper (works even if blocked) ---------- */
  const storage = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch { return fallback; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch { return false; }
    },
    remove(key) {
      try { window.localStorage.removeItem(key); } catch { /* ignore */ }
    }
  };

  const OVERRIDES_KEY = "lbx_overrides_v1";

  /* ---------- API config ---------- */
  function apiBase() {
    const raw = (window.LB_CONFIG && window.LB_CONFIG.apiUrl) || "";
    return String(raw).trim().replace(/\/+$/, "");
  }

  function fetchWithTimeout(url, ms, options) {
    const ctrl = ("AbortController" in window) ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), ms || 9000) : null;
    const opts = Object.assign({}, options || {});
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(url, opts).finally(() => { if (timer) clearTimeout(timer); });
  }

  /* ---------- Built-in defaults (mirror of data/*.json) ---------- */
  const LB_DEFAULTS = {
    profile: {
      name: "LINUXBOSS",
      role: "Student Developer • Future Ethical Hacker • Technology Founder",
      badge: "STUDENT DEVELOPER • TECHNOLOGY BUILDER",
      heroTitle: "LINUXBOSS",
      heroLines: ["Student Developer.", "Future Ethical Hacker.", "Technology Founder."],
      heroDescription: "I build digital products, explore emerging technologies, and develop ideas that can grow into meaningful infrastructure.",
      status: "Currently building",
      focus: ["AI", "Cybersecurity", "Web Development", "Infrastructure"],
      photo: "assets/images/profile.png",
      photoData: "",
      bio: "I'm LINUXBOSS — a student developer interested in software, artificial intelligence, cybersecurity, blockchain, and digital infrastructure. I spend my time learning how systems work, building web products, and experimenting with ideas that could one day grow into useful technology for real people.",
      bioExtra: "My current focus is simple: learn deeply, build consistently, and document the journey. Every project I ship — from prototypes to infrastructure concepts — is a step toward building dependable systems, with a long-term eye on Africa's digital future.",
      philosophy: "I don't want to only use technology. I want to understand how systems work, build my own systems, and eventually create infrastructure that other people can depend on.",
      email: "yzigzag@gmail.com",
      whatsapp: "07072585292",
      github: "yzigzag26-lab",
      socials: { linkedin: "", twitter: "", instagram: "" }
    },
    projects: [
      {
        id: "trustos",
        name: "TRUSTOS",
        category: "Trust Infrastructure / Blockchain",
        filters: ["blockchain", "infrastructure", "ai"],
        description: "A trust verification infrastructure concept designed to verify digital information, blockchain transactions, identities, credentials, ownership, provenance, authorization, and eventually AI agents.",
        longDescription: "TRUSTOS is an early-stage exploration into digital trust infrastructure. The concept covers verification of digital information, blockchain transactions, identities, credentials, ownership, provenance, and authorization — with AI-agent verification as part of the long-term vision. It is being designed and prototyped in the open as a learning-driven infrastructure project.",
        visionNote: "Some capabilities listed are part of the long-term vision and are still being researched and designed — not all of them are implemented yet.",
        status: "Active Development",
        tags: ["Blockchain", "Verification", "Infrastructure", "Security", "AI"],
        liveUrl: "https://trustos.wasmer.app/",
        githubUrl: "",
        image: "assets/images/projects/trustos.png",
        featured: true,
        order: 1
      },
      {
        id: "pharma-near-me",
        name: "Pharma Near Me",
        category: "Healthcare Technology",
        filters: ["web"],
        description: "A healthcare technology prototype designed to help users locate pharmacies and medicines while providing useful tools and dashboards for healthcare providers.",
        longDescription: "Pharma Near Me is a healthcare technology prototype exploring how people can quickly locate nearby pharmacies and medicines. It also experiments with dashboards and tools for healthcare providers. This is a prototype for learning and demonstration — it does not provide medical advice.",
        visionNote: "Prototype for learning and demonstration purposes. It does not provide medical advice, diagnosis, or treatment.",
        status: "Prototype",
        tags: ["Healthcare", "Web App", "Search", "Dashboard"],
        liveUrl: "https://phama-near-me.wasmer.app/",
        githubUrl: "",
        image: "assets/images/projects/pharma-near-me.png",
        featured: true,
        order: 2
      }
    ],
    collaborations: [
      { id: "zion-ai", name: "Zion AI", role: "Collaborator", description: "An AI-focused build LINUXBOSS contributes to and collaborates on. Details and public links will be added as the collaboration evolves.", url: "", status: "In Progress", logo: "" },
      { id: "zion-chat", name: "Zion Chat", role: "Collaborator", description: "A chat/messaging-oriented project LINUXBOSS collaborates on. Public link coming soon.", url: "", status: "In Progress", logo: "" },
      { id: "farmconnect-nigeria", name: "FarmConnect Nigeria", role: "Contributor", description: "An agriculture-connectivity initiative in Nigeria that LINUXBOSS contributes to. Public link coming soon.", url: "", status: "In Progress", logo: "" },
      { id: "prepare-ai", name: "Prepare AI", role: "Partnered Project", description: "An AI preparation/learning project partnered with LINUXBOSS. Public link coming soon.", url: "", status: "In Progress", logo: "" },
      { id: "taxi-creative-design", name: "Taxi Creative Design", role: "Contributor", description: "A creative/design project LINUXBOSS contributes to. Public link coming soon.", url: "", status: "In Progress", logo: "" }
    ],
    settings: {
      siteTitle: "LINUXBOSS — Developer & Technology Founder",
      metaDescription: "LINUXBOSS is a student developer and future ethical hacker building technology projects across AI, cybersecurity, blockchain, and digital infrastructure.",
      keywords: "LINUXBOSS, student developer, ethical hacker, technology founder, AI, cybersecurity, blockchain, TRUSTOS, Africa tech",
      ogTitle: "LINUXBOSS — Developer & Technology Founder",
      ogDescription: "Building technology, exploring systems, and working toward infrastructure for Africa's digital future.",
      ogImage: "assets/images/profile.png",
      resume: { filename: "", url: "" },
      theme: "dark",
      animations: true,
      maintenanceMode: false,
      siteVisible: true
    }
  };

  /* ---------- Base JSON loading (works over http; falls back silently) ---------- */
  async function fetchJSON(path) {
    const res = await fetchWithTimeout(path, 8000, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  async function fetchBaseData() {
    // NOTE: fetch() fails on file:// in most browsers — that is expected.
    const [profile, projects, collaborations, settings] = await Promise.all([
      fetchJSON("data/profile.json"),
      fetchJSON("data/projects.json"),
      fetchJSON("data/collaborations.json"),
      fetchJSON("data/settings.json")
    ]);
    return { profile, projects, collaborations, settings };
  }

  async function fetchApiBundle(base) {
    const res = await fetchWithTimeout(base + "/api/public", 9000, { cache: "no-store" });
    if (!res.ok) throw new Error("API HTTP " + res.status);
    const body = await res.json();
    if (!body || body.ok !== true || !body.data) throw new Error("Bad API response");
    const d = body.data;
    // Light validation: projects/collabs must be arrays, profile/settings objects.
    if (!Array.isArray(d.projects) || !Array.isArray(d.collaborations)) throw new Error("Bad bundle");
    return {
      profile: d.profile && typeof d.profile === "object" ? d.profile : {},
      projects: d.projects,
      collaborations: d.collaborations,
      settings: d.settings && typeof d.settings === "object" ? d.settings : {}
    };
  }

  function deepMerge(base, patch) {
    if (Array.isArray(patch)) return patch.slice();
    if (patch && typeof patch === "object" && base && typeof base === "object") {
      const out = Array.isArray(base) ? base.slice() : { ...base };
      for (const key of Object.keys(patch)) {
        out[key] = deepMerge(base[key], patch[key]);
      }
      return out;
    }
    return patch === undefined ? base : patch;
  }

  function applyOverrides(base) {
    const overrides = storage.get(OVERRIDES_KEY, {});
    const data = JSON.parse(JSON.stringify(base)); // clone
    if (overrides.profile) data.profile = deepMerge(data.profile, overrides.profile);
    if (Array.isArray(overrides.projects)) data.projects = overrides.projects;
    if (Array.isArray(overrides.collaborations)) data.collaborations = overrides.collaborations;
    if (overrides.settings) data.settings = deepMerge(data.settings, overrides.settings);
    return data;
  }

  /* ---------- Public store ---------- */
  const LBData = {
    data: JSON.parse(JSON.stringify(LB_DEFAULTS)),
    ready: false,
    apiMode: false,

    async init() {
      const base = apiBase();

      // 1) ONLINE MODE: live database content wins over everything.
      if (base) {
        try {
          const bundle = await fetchApiBundle(base);
          this.data = bundle;
          this.apiMode = true;
          this.ready = true;
          document.dispatchEvent(new CustomEvent("lb:data", { detail: this.data }));
          document.dispatchEvent(new CustomEvent("lb:mode", { detail: { apiMode: true } }));
          return this.data;
        } catch (e) {
          // API configured but unreachable — fall through to file/defaults
          // so the site NEVER shows a blank page. Admin will show DEMO mode.
          this.apiMode = false;
        }
      }

      // 2) Start with defaults + any admin overrides (instant, offline-safe)
      this.data = applyOverrides(LB_DEFAULTS);
      this.ready = true;
      document.dispatchEvent(new CustomEvent("lb:data", { detail: this.data }));
      document.dispatchEvent(new CustomEvent("lb:mode", { detail: { apiMode: false } }));

      // 3) Try to load the JSON files and re-render with fresher base data
      try {
        const fresh = await fetchBaseData();
        this.data = applyOverrides(fresh);
        document.dispatchEvent(new CustomEvent("lb:data", { detail: this.data }));
      } catch {
        // Expected when opened via file:// — defaults are already rendered.
      }
      return this.data;
    },

    async refresh() {
      // Re-run init (used by admin after API saves).
      this.ready = false;
      return this.init();
    },

    get() { return this.data; },
    isApiMode() { return this.apiMode; },
    getOverrides() { return storage.get(OVERRIDES_KEY, {}); },
    saveOverrides(patch) {
      const current = storage.get(OVERRIDES_KEY, {});
      const next = deepMerge(current, patch);
      storage.set(OVERRIDES_KEY, next);
      if (!this.apiMode) {
        this.data = applyOverrides(this.data);
        document.dispatchEvent(new CustomEvent("lb:data", { detail: this.data }));
      }
      return next;
    },
    resetOverrides() {
      storage.remove(OVERRIDES_KEY);
      this.init();
    }
  };

  /* ---------- Helpers ---------- */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || "") + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  }

  function whatsappLink(number) {
    const digits = String(number || "").replace(/\D/g, "");
    if (!digits) return "";
    // Local NG format (070...) -> international wa.me format
    const intl = digits.startsWith("0") ? "234" + digits.slice(1) : digits;
    return "https://wa.me/" + intl;
  }

  function isValidUrl(u) {
    return typeof u === "string" && /^https?:\/\//i.test(u.trim());
  }

  // Global image fallback: hides broken images to reveal styled placeholders.
  function armImageFallbacks(root) {
    (root || document).querySelectorAll("img[data-fallback]").forEach(img => {
      img.addEventListener("error", () => img.classList.add("hidden"), { once: true });
      if (img.complete && img.naturalWidth === 0) img.classList.add("hidden");
    });
  }

  /* ---------- Render: hero + about + identity ---------- */
  function renderIdentity(profile) {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el && value !== undefined) el.textContent = value;
    };
    set("heroBadgeText", profile.badge);
    set("heroTitle", profile.heroTitle);
    set("heroDesc", profile.heroDescription);
    set("navStatusText", profile.status);
    set("aboutBio", profile.bio);
    set("aboutBioExtra", profile.bioExtra);
    set("aboutPhilosophy", profile.philosophy ? "\u201C" + profile.philosophy + "\u201D" : "");

    const roles = document.getElementById("heroRoles");
    if (roles && Array.isArray(profile.heroLines)) {
      roles.innerHTML = profile.heroLines.map((line, i) =>
        "<span class=\"" + (i === 1 ? "role-accent" : "") + "\">" + esc(line) + "</span>"
      ).join("<br>");
    }
    const focus = document.getElementById("focusList");
    if (focus && Array.isArray(profile.focus)) {
      focus.innerHTML = profile.focus.map(f =>
        "<li>" + icon("check") + esc(f) + "</li>"
      ).join("");
    }
    const photo = document.getElementById("heroPhoto");
    if (photo) {
      const src = profile.photoData || profile.photo;
      photo.classList.remove("hidden");
      if (src) photo.setAttribute("src", src);
      photo.setAttribute("alt", (profile.name || "LINUXBOSS") + " — profile photograph");
    }
    const floatStatus = document.getElementById("floatStatusText");
    if (floatStatus) floatStatus.textContent = (profile.status || "BUILDING").toUpperCase();
  }

  /* ---------- Render: projects ---------- */
  let activeFilter = "all";

  function projectCard(p) {
    const cats = Array.isArray(p.filters) ? p.filters.join(" ") : "";
    const tags = Array.isArray(p.tags) ? p.tags : [];
    const hasLive = isValidUrl(p.liveUrl);
    const hasGh = isValidUrl(p.githubUrl);
    return (
      '<article class="project-card reveal" data-cats="' + esc(cats.toLowerCase()) + '" data-id="' + esc(p.id) + '">' +
        '<div class="project-media">' +
          '<div class="media-fallback" aria-hidden="true">' + esc(initials(p.name)) + "</div>" +
          (p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + ' — project cover" loading="lazy" data-fallback>' : "") +
          '<div class="project-badges">' +
            (p.featured ? '<span class="pill live">Featured</span>' : "<span></span>") +
            '<span class="pill"><span class="dot"></span>' + esc(p.status || "In Development") + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="project-body">' +
          '<span class="project-cat">' + esc(p.category || "Project") + "</span>" +
          "<h3>" + esc(p.name) + " " + icon("arrow-up-right") + "</h3>" +
          "<p>" + esc(p.description || "") + "</p>" +
          '<div class="tag-row">' + tags.map(t => '<span class="tag">' + esc(t) + "</span>").join("") + "</div>" +
          '<div class="project-actions">' +
            (hasLive
              ? '<a class="btn btn-primary btn-sm" href="' + esc(p.liveUrl) + '" target="_blank" rel="noopener">Live Project ' + icon("external") + "</a>"
              : '<span class="soon">LINK COMING SOON</span>') +
            '<button class="btn btn-ghost btn-sm" data-details="' + esc(p.id) + '">Details ' + icon("arrow-right") + "</button>" +
            (hasGh ? '<a class="btn btn-ghost btn-sm" href="' + esc(p.githubUrl) + '" target="_blank" rel="noopener" aria-label="' + esc(p.name) + ' on GitHub">' + icon("github", "fill") + "</a>" : "") +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderProjects(projects) {
    const grid = document.getElementById("projectGrid");
    if (!grid) return;
    const list = Array.isArray(projects) ? projects.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
    if (!list.length) {
      grid.innerHTML = '<div class="empty-state">' + icon("folder") +
        "<p><strong>No projects published yet.</strong><br>New builds will appear here — check back soon.</p></div>";
      return;
    }
    grid.innerHTML = list.map(projectCard).join("");
    armImageFallbacks(grid);
    applyFilter(activeFilter, grid);
    if (window.LBAnim) window.LBAnim.observe(grid);
  }

  function applyFilter(filter, grid) {
    activeFilter = (filter || "all").toLowerCase();
    grid = grid || document.getElementById("projectGrid");
    document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.filter === activeFilter);
      btn.setAttribute("aria-pressed", btn.dataset.filter === activeFilter ? "true" : "false");
    });
    if (!grid) return;
    let visible = 0;
    grid.querySelectorAll(".project-card").forEach(card => {
      const cats = (card.dataset.cats || "").split(/\s+/);
      const show = activeFilter === "all" || cats.includes(activeFilter);
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });
    let empty = grid.querySelector("[data-filter-empty]");
    if (!visible) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "empty-state";
        empty.setAttribute("data-filter-empty", "true");
        empty.innerHTML = icon("search") + "<p><strong>Nothing in this category yet.</strong><br>Try another filter.</p>";
        grid.appendChild(empty);
      }
      empty.style.display = "";
    } else if (empty) {
      empty.style.display = "none";
    }
  }

  function bindFilters() {
    document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.addEventListener("click", () => applyFilter(btn.dataset.filter));
    });
  }

  /* ---------- Project details modal ---------- */
  function openProjectModal(id) {
    const p = (LBData.get().projects || []).find(x => String(x.id) === String(id));
    if (!p) return;
    const backdrop = document.getElementById("projectModal");
    if (!backdrop) return;
    const tags = Array.isArray(p.tags) ? p.tags : [];
    const set = (mid, html) => { const el = document.getElementById(mid); if (el) el.innerHTML = html; };
    set("modalCat", esc(p.category || "Project"));
    set("modalName", esc(p.name || ""));
    set("modalDesc", esc(p.longDescription || p.description || ""));
    set("modalTags", tags.map(t => '<span class="tag">' + esc(t) + "</span>").join(""));

    const note = document.getElementById("modalNote");
    if (note) {
      if (p.visionNote) { note.style.display = ""; set("modalNoteText", esc(p.visionNote)); }
      else note.style.display = "none";
    }
    const media = document.getElementById("modalMediaImg");
    const mediaFallback = document.getElementById("modalMediaFallback");
    if (media) {
      media.classList.remove("hidden");
      if (p.image) { media.setAttribute("src", p.image); media.setAttribute("alt", p.name + " — project cover"); }
      else media.classList.add("hidden");
    }
    if (mediaFallback) mediaFallback.textContent = initials(p.name);

    const meta = document.getElementById("modalMeta");
    if (meta) {
      meta.innerHTML = '<span class="pill"><span class="dot"></span>' + esc(p.status || "In Development") + "</span>" +
        (p.featured ? '<span class="pill live">Featured</span>' : "");
    }
    const actions = document.getElementById("modalActions");
    if (actions) {
      let html = "";
      if (isValidUrl(p.liveUrl)) html += '<a class="btn btn-primary" href="' + esc(p.liveUrl) + '" target="_blank" rel="noopener">Open Live Project ' + icon("external") + "</a>";
      else html += '<span class="soon">LINK COMING SOON</span>';
      if (isValidUrl(p.githubUrl)) html += '<a class="btn btn-ghost" href="' + esc(p.githubUrl) + '" target="_blank" rel="noopener">' + icon("github", "fill") + " GitHub</a>";
      actions.innerHTML = html;
    }
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
    const close = backdrop.querySelector(".modal-close");
    if (close) close.focus({ preventScroll: true });
  }

  function closeProjectModal() {
    const backdrop = document.getElementById("projectModal");
    if (!backdrop) return;
    backdrop.classList.remove("open");
    document.body.style.overflow = "";
  }

  function bindModal() {
    const grid = document.getElementById("projectGrid");
    if (grid) {
      grid.addEventListener("click", e => {
        const btn = e.target.closest("[data-details]");
        if (btn) openProjectModal(btn.getAttribute("data-details"));
      });
    }
    const backdrop = document.getElementById("projectModal");
    if (backdrop) {
      backdrop.addEventListener("click", e => {
        if (e.target === backdrop || e.target.closest(".modal-close")) closeProjectModal();
      });
    }
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeProjectModal();
    });
  }

  /* ---------- Render: collaborations ---------- */
  function collabCard(c) {
    const hasUrl = isValidUrl(c.url);
    return (
      '<article class="collab-card reveal">' +
        '<div class="collab-logo" aria-hidden="true">' + esc(initials(c.name)) +
          (c.logo ? '<img src="' + esc(c.logo) + '" alt="" loading="lazy" data-fallback>' : "") +
        "</div>" +
        '<div class="collab-info">' +
          "<h3>" + esc(c.name) + ' <span class="role-badge">' + esc(c.role || "Collaborator") + "</span></h3>" +
          "<p>" + esc(c.description || "") + "</p>" +
        "</div>" +
        '<div class="collab-side">' +
          (hasUrl
            ? '<a class="btn btn-ghost btn-sm" href="' + esc(c.url) + '" target="_blank" rel="noopener">Visit ' + icon("external") + "</a>"
            : '<span class="soon">LINK COMING SOON</span>') +
        "</div>" +
      "</article>"
    );
  }

  function renderCollaborations(list) {
    const wrap = document.getElementById("collabList");
    if (!wrap) return;
    const items = Array.isArray(list) ? list : [];
    if (!items.length) {
      wrap.innerHTML = '<div class="empty-state">' + icon("users") +
        "<p><strong>No collaborations listed yet.</strong><br>Partnerships will appear here when they are ready to share.</p></div>";
      return;
    }
    wrap.innerHTML = items.map(collabCard).join("");
    armImageFallbacks(wrap);
    if (window.LBAnim) window.LBAnim.observe(wrap);
  }

  /* ---------- Render: contact ---------- */
  function renderContact(profile, settings) {
    const email = profile.email || "";
    const wa = profile.whatsapp || "";
    const gh = profile.github || "";
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || "Not added yet"; };
    setText("contactEmail", email);
    setText("contactWhatsapp", wa);
    setText("contactGithub", gh ? "github.com/" + gh : "");

    const setHref = (id, href) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (href) { el.setAttribute("href", href); el.removeAttribute("aria-disabled"); el.classList.remove("is-disabled"); }
      else { el.removeAttribute("href"); el.setAttribute("aria-disabled", "true"); }
    };
    setHref("btnEmail", email ? "mailto:" + email : "");
    setHref("btnWhatsapp", wa ? whatsappLink(wa) : "");
    setHref("btnGithub", gh ? "https://github.com/" + gh : "");
    setHref("heroGithub", gh ? "https://github.com/" + gh : "");
    setHref("heroWhatsapp", wa ? whatsappLink(wa) : "");

    // Optional socials — only rendered when configured (never invented).
    const socials = profile.socials || {};
    const defs = [
      { key: "linkedin", label: "LinkedIn", icon: "linkedin", prefix: "https://linkedin.com/in/" },
      { key: "twitter", label: "X (Twitter)", icon: "x-social", prefix: "https://x.com/" },
      { key: "instagram", label: "Instagram", icon: "instagram", prefix: "https://instagram.com/" }
    ];
    const row = document.getElementById("socialRow");
    if (row) {
      row.innerHTML = defs.filter(d => (socials[d.key] || "").trim()).map(d => {
        const raw = socials[d.key].trim();
        const href = isValidUrl(raw) ? raw : d.prefix + raw.replace(/^@/, "");
        return '<a class="icon-btn" href="' + esc(href) + '" target="_blank" rel="noopener" aria-label="' + d.label + '">' + icon(d.icon) + "</a>";
      }).join("");
    }

    // Resume button (visible only when configured)
    const resumeBtn = document.getElementById("btnResume");
    const resumeUrl = settings && settings.resume && settings.resume.url;
    if (resumeBtn) resumeBtn.style.display = resumeUrl ? "" : "none";
    if (resumeBtn && resumeUrl) resumeBtn.setAttribute("href", resumeUrl);
  }

  /* ---------- Apply SEO + site settings ---------- */
  function applySettings(settings) {
    if (!settings) return;
    if (settings.siteTitle) document.title = settings.siteTitle;
    const meta = (selector, attr, value) => {
      if (!value) return;
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };
    meta('meta[name="description"]', "content", settings.metaDescription);
    meta('meta[name="keywords"]', "content", settings.keywords);
    meta('meta[property="og:title"]', "content", settings.ogTitle);
    meta('meta[property="og:description"]', "content", settings.ogDescription);
    meta('meta[property="og:image"]', "content", settings.ogImage);
    meta('meta[name="twitter:title"]', "content", settings.ogTitle);
    meta('meta[name="twitter:description"]', "content", settings.ogDescription);

    // Maintenance mode is implemented visually for future backend integration.
    const banner = document.getElementById("maintenanceBanner");
    if (banner) banner.classList.toggle("show", settings.maintenanceMode === true);
  }

  /* ---------- Boot (public site only) ---------- */
  function renderAll(data) {
    renderIdentity(data.profile || {});
    renderProjects(data.projects || []);
    renderCollaborations(data.collaborations || []);
    renderContact(data.profile || {}, data.settings || {});
    applySettings(data.settings || {});
  }

  // Expose a small public API for main.js / admin.js
  window.LBData = LBData;
  window.LB = {
    esc, icon, initials, whatsappLink, isValidUrl,
    armImageFallbacks, storage, apiBase, fetchWithTimeout,
    openProjectModal, closeProjectModal, applyFilter
  };

  document.addEventListener("DOMContentLoaded", () => {
    // Only auto-render on the public site (admin.html renders its own UI).
    if (!document.getElementById("projectGrid")) return;
    bindFilters();
    bindModal();
    armImageFallbacks(document);
    document.addEventListener("lb:data", e => renderAll(e.detail));
    LBData.init();
  });
})();
