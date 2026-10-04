/* ============================================================
   LINUXBOSS — Admin dashboard (admin.js)
   ------------------------------------------------------------
   TWO MODES:
   - ONLINE (js/config.js apiUrl set + API reachable): real JWT auth,
     all CRUD goes to MySQL via the Flask API. Edits go live globally.
   - DEMO (no API): browser-local localStorage demo auth + storage.
     NOT real security — edits affect this browser only.

   For production, always use ONLINE mode with Wasmer Secrets
   holding the real credentials (never in frontend code).
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Demo credentials (DEMO mode only) ---------- */
  const DEMO_EMAIL = "admin@linuxboss.local";
  const DEMO_PASSWORD = "boss-2026-demo";
  const SESSION_KEY = "lbx_admin_session";
  const TOKEN_KEY = "lbx_token";

  const store = (window.LB && window.LB.storage) || {
    get: (k, f) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
  };
  const esc = (window.LB && window.LB.esc) || (s => String(s == null ? "" : s));
  const icon = (window.LB && window.LB.icon) || (() => "");
  const apiBase = (window.LB && window.LB.apiBase) || (() => "");
  const fetchT = (window.LB && window.LB.fetchWithTimeout) || fetch;

  const ACTIVITY_KEY = "lbx_activity_v1";
  let ONLINE = false;
  let ADMIN_DATA = { profile: {}, projects: [], collaborations: [], settings: {} };
  const FILLERS = [];

  /* ---------- Helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function uid(prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  }
  function getToken() {
    try { return window.sessionStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
  }
  function setToken(t) {
    try {
      if (t) window.sessionStorage.setItem(TOKEN_KEY, t);
      else window.sessionStorage.removeItem(TOKEN_KEY);
    } catch { /* ignore */ }
  }

  function logActivity(msg) {
    const list = store.get(ACTIVITY_KEY, []);
    list.unshift({ t: new Date().toISOString(), msg: String(msg) });
    store.set(ACTIVITY_KEY, list.slice(0, 12));
    renderActivity();
  }
  function timeAgo(iso) {
    const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return s + "s ago";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  }

  let toastTimer = null;
  function toast(msg, ok) {
    const el = $("toast"), txt = $("toastText");
    if (!el || !txt) return;
    txt.textContent = msg;
    el.querySelector(".icon use").setAttribute("href", ok === false ? "#i-x" : "#i-check");
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* ---------- API client ---------- */
  async function api(path, options) {
    options = options || {};
    const headers = { "Content-Type": "application/json" };
    if (options.auth !== false) {
      const t = getToken();
      if (t) headers["Authorization"] = "Bearer " + t;
    }
    const res = await fetchT(apiBase() + path, 15000, {
      method: options.method || "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    if (!res.ok || !body || body.ok !== true) {
      const msg = (body && body.error) || ("Request failed (" + res.status + ")");
      const e = new Error(msg);
      e.status = res.status;
      throw e;
    }
    return body.data;
  }

  async function detectApi() {
    if (!apiBase()) return false;
    try {
      const res = await fetchT(apiBase() + "/api/health", 7000, { cache: "no-store" });
      return res.ok;
    } catch { return false; }
  }

  async function loadFromApi() {
    const bundle = await api("/api/public", { auth: false });
    ADMIN_DATA = {
      profile: bundle.profile || {},
      projects: bundle.projects || [],
      collaborations: bundle.collaborations || [],
      settings: bundle.settings || {}
    };
  }

  function data() {
    if (ONLINE) return ADMIN_DATA;
    return window.LBData ? window.LBData.get() : ADMIN_DATA;
  }

  function refreshAll() {
    FILLERS.forEach(fn => { try { fn(); } catch { /* ignore */ } });
    refreshDerived();
  }

  /* ---------- Auth ---------- */
  function isAuthedDemo() {
    try { return window.sessionStorage.getItem(SESSION_KEY) === "1"; }
    catch { return false; }
  }
  function setAuthedDemo(on) {
    try {
      if (on) window.sessionStorage.setItem(SESSION_KEY, "1");
      else window.sessionStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  }

  function showApp() {
    $("loginScreen").style.display = "none";
    $("adminApp").classList.add("show");
    bootForms();
    updateModeUI();
    refreshAll();
  }

  function updateModeUI() {
    const badge = $("modeBadge"), txt = $("modeBadgeText");
    if (badge && txt) {
      badge.classList.toggle("online", ONLINE);
      txt.textContent = ONLINE ? "ONLINE — EDITS GO LIVE" : "DEMO — BROWSER ONLY";
    }
    const pw = $("passwordCard");
    if (pw) pw.style.display = ONLINE ? "" : "none";
    const note = $("demoStorageNote");
    if (note) note.style.display = ONLINE ? "none" : "";
  }

  function bindLogin() {
    const form = $("loginForm");
    const err = $("loginError");
    const btn = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const email = $("loginEmail").value.trim().toLowerCase();
      const pass = $("loginPassword").value;
      err.classList.remove("show");
      btn.disabled = true;
      try {
        if (ONLINE) {
          // ---- REAL backend login ----
          const out = await api("/api/auth/login", {
            auth: false, method: "POST", body: { email, password: pass }
          });
          setToken(out.token);
          await loadFromApi();
          logActivity("Signed in (online mode) as " + email + ".");
          showApp();
          toast("Welcome back, boss. You're ONLINE.");
        } else {
          // ---- DEMO login ----
          if (email === DEMO_EMAIL && pass === DEMO_PASSWORD) {
            setAuthedDemo(true);
            logActivity("Signed in to the dashboard (demo session).");
            showApp();
            toast("Welcome back, boss. (Demo mode)");
          } else {
            throw new Error("demo");
          }
        }
      } catch (ex) {
        if (!ONLINE && ex.message === "demo") {
          err.querySelector("span").textContent = "Invalid email or password.";
        } else if (ONLINE) {
          err.querySelector("span").textContent = ex.message || "Login failed.";
        } else {
          err.querySelector("span").textContent = "Invalid email or password.";
        }
        err.classList.add("show");
        const card = $("loginCard");
        card.classList.remove("shake");
        void card.offsetWidth;
        card.classList.add("shake");
      } finally {
        btn.disabled = false;
      }
    });
    $("logoutBtn").addEventListener("click", () => {
      setToken("");
      setAuthedDemo(false);
      window.location.reload();
    });
  }

  /* ---------- Tabs ---------- */
  const TAB_TITLES = {
    overview: ["Overview", "A snapshot of your website."],
    profile: ["Profile", "Identity, hero content, photo and status."],
    projects: ["Projects", "Add, edit or remove showcased projects."],
    collabs: ["Collaborations", "Manage partnered and contributor projects."],
    contacts: ["Contacts", "Email, WhatsApp, GitHub and socials."],
    resume: ["Resume", "Resume file link and upload placeholder."],
    seo: ["SEO", "Titles, descriptions and social previews."],
    settings: ["Settings", "Theme, animations, visibility and maintenance."]
  };

  function bindTabs() {
    const links = Array.from(document.querySelectorAll(".side-link[data-tab]"));
    const panels = Array.from(document.querySelectorAll(".tab-panel"));
    links.forEach(link => {
      link.addEventListener("click", () => {
        const tab = link.dataset.tab;
        links.forEach(l => l.classList.toggle("active", l === link));
        panels.forEach(p => p.classList.toggle("active", p.id === "tab-" + tab));
        const [title, sub] = TAB_TITLES[tab] || ["Dashboard", ""];
        $("pageTitle").textContent = title;
        $("pageSub").textContent = sub;
        $("sidebar").classList.remove("open");
        $("scrim").classList.remove("show");
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
    $("sideToggle").addEventListener("click", () => {
      $("sidebar").classList.toggle("open");
      $("scrim").classList.toggle("show");
    });
    $("scrim").addEventListener("click", () => {
      $("sidebar").classList.remove("open");
      $("scrim").classList.remove("show");
    });
  }

  /* ---------- Overview ---------- */
  function renderActivity() {
    const list = $("activityList");
    if (!list) return;
    const items = store.get(ACTIVITY_KEY, []);
    list.innerHTML = items.length
      ? items.map(a => "<li>" + icon("zap") + "<div>" + esc(a.msg) + "<time>" + timeAgo(a.t) + "</time></div></li>").join("")
      : '<li class="activity-empty">No recent updates yet. Changes you save will appear here.</li>';
  }

  function refreshDerived() {
    const d = data();
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set("statProjects", (d.projects || []).length);
    set("statCollabs", (d.collaborations || []).length);
    set("statStatus", d.profile && d.profile.status ? "Live" : "Draft");
    set("statSite", ONLINE ? "Online" : (d.settings && d.settings.siteVisible === false ? "Hidden" : "Online"));
    renderActivity();
    renderProjectRows();
    renderCollabRows();
  }

  /* ---------- Generic modal ---------- */
  function openModal(title, bodyHTML, onSubmit, submitLabel) {
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = bodyHTML;
    $("modalSubmit").innerHTML = esc(submitLabel || "Save") + " " + icon("check");
    $("modalBackdrop").classList.add("open");
    const form = $("modalBody").querySelector("form");
    if (form && form.querySelector("[data-project-image-upload]")) bindProjectImageUpload(form);
    const submit = e => {
      if (e) e.preventDefault();
      const values = {};
      if (form) {
        form.querySelectorAll("[name]").forEach(el => {
          if (el.type === "checkbox") values[el.name] = el.checked;
          else if (el.type === "file") values[el.name] = values[el.name] || "";
          else values[el.name] = el.value.trim();
        });
      }
      onSubmit(values, form);
    };
    $("modalSubmit").onclick = submit;
    if (form) form.onsubmit = submit;
    const first = $("modalBody").querySelector("input, textarea, select");
    if (first) first.focus();
  }
  function closeModal() { $("modalBackdrop").classList.remove("open"); }

  function bindModal() {
    $("modalBackdrop").addEventListener("click", e => {
      if (e.target === $("modalBackdrop") || e.target.closest("[data-close-modal]")) closeModal();
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
  }

  function field(label, name, value, opts) {
    opts = opts || {};
    const type = opts.type || "text";
    const hint = opts.hint ? ' <span class="hint">' + esc(opts.hint) + "</span>" : "";
    if (type === "textarea") {
      return '<div class="field"><label>' + esc(label) + hint + "</label>" +
        '<textarea name="' + esc(name) + '" placeholder="' + esc(opts.placeholder || "") + '">' + esc(value || "") + "</textarea></div>";
    }
    if (type === "select") {
      return '<div class="field"><label>' + esc(label) + hint + "</label><select name=\"" + esc(name) + "\">" +
        (opts.options || []).map(o => '<option value="' + esc(o) + '"' + (o === value ? " selected" : "") + ">" + esc(o) + "</option>").join("") +
        "</select></div>";
    }
    const attrs = opts.attrs ? " " + String(opts.attrs) : "";
    return '<div class="field"><label>' + esc(label) + hint + "</label>" +
      '<input type="' + esc(type) + '" name="' + esc(name) + '" value="' + esc(value == null ? "" : value) + '" placeholder="' + esc(opts.placeholder || "") + '"' + attrs + "></div>";
  }

  /* ---------- Persist helpers (online vs demo) ---------- */
  async function persistProfile(patch, activityMsg) {
    if (ONLINE) {
      const current = data().profile || {};
      const next = Object.assign({}, current, patch);
      if (patch.socials) next.socials = Object.assign({}, current.socials || {}, patch.socials);
      ADMIN_DATA.profile = await api("/api/profile", { method: "PUT", body: next });
    } else {
      window.LBData.saveOverrides({ profile: patch });
    }
    logActivity(activityMsg + (ONLINE ? " (live)" : ""));
    refreshAll();
  }

  async function persistSettings(patch, activityMsg) {
    if (ONLINE) {
      const current = data().settings || {};
      const next = deepAssign(current, patch);
      ADMIN_DATA.settings = await api("/api/settings", { method: "PUT", body: next });
    } else {
      window.LBData.saveOverrides({ settings: patch });
    }
    logActivity(activityMsg + (ONLINE ? " (live)" : ""));
    refreshAll();
  }

  function deepAssign(base, patch) {
    const out = JSON.parse(JSON.stringify(base || {}));
    Object.keys(patch || {}).forEach(k => {
      if (patch[k] && typeof patch[k] === "object" && !Array.isArray(patch[k]) && out[k] && typeof out[k] === "object") {
        out[k] = Object.assign({}, out[k], patch[k]);
      } else out[k] = patch[k];
    });
    return out;
  }

  /* ---------- Projects CRUD ---------- */
  const FILTER_OPTIONS = ["web", "ai", "cybersecurity", "blockchain", "infrastructure"];

  function renderProjectRows() {
    const body = $("projectRows");
    if (!body) return;
    const list = (data().projects || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="4"><span class="cell-sub">No projects yet — click "Add Project" to create one.</span></td></tr>';
      return;
    }
    body.innerHTML = list.map(p =>
      "<tr><td><span class=\"cell-title\">" + esc(p.name) + (p.featured ? " ★" : "") + "</span>" +
      '<span class="cell-sub">' + esc(p.category || "") + " · order " + esc(p.order == null ? "—" : p.order) + "</span></td>" +
      '<td><span class="status-tag">' + esc(p.status || "In Development") + "</span></td>" +
      "<td><span class=\"cell-sub\">" + esc(isValid(p.liveUrl) ? "Live link set" : "No live link") + "</span></td>" +
      '<td><div class="row-actions">' +
        '<button class="mini-btn" data-edit-project="' + esc(p.id) + '" aria-label="Edit ' + esc(p.name) + '">' + icon("pencil") + "</button>" +
        '<button class="mini-btn danger" data-del-project="' + esc(p.id) + '" aria-label="Delete ' + esc(p.name) + '">' + icon("trash") + "</button>" +
      "</div></td></tr>"
    ).join("");
  }

  function isValid(u) { return typeof u === "string" && /^https?:\/\//i.test(u.trim()); }

  function projectFormHTML(p) {
    p = p || {};
    const filters = Array.isArray(p.filters) ? p.filters : [];
    const currentImage = p.image || "";
    return '<form id="projectForm">' +
      field("Project name", "name", p.name, { placeholder: "e.g. TRUSTOS" }) +
      '<div class="field-row">' +
        field("Category", "category", p.category, { placeholder: "e.g. Trust Infrastructure" }) +
        field("Status", "status", p.status || "In Development", { type: "select", options: ["Active Development", "Prototype", "In Development", "Paused", "Completed"] }) +
      "</div>" +
      field("Short description", "description", p.description, { type: "textarea", placeholder: "One or two honest sentences." }) +
      field("Long description (modal)", "longDescription", p.longDescription, { type: "textarea" }) +
      field("Vision / honesty note", "visionNote", p.visionNote, { placeholder: "Clarify what is vision vs. implemented." }) +
      '<div class="field-row">' +
        field("Live URL", "liveUrl", p.liveUrl, { type: "url", placeholder: "https://… (leave empty if none)" }) +
        field("GitHub URL", "githubUrl", p.githubUrl, { type: "url", placeholder: "https://github.com/… (optional)" }) +
      "</div>" +
      '<div class="field-row">' +
        field("Technologies", "tags", (p.tags || []).join(", "), { hint: "comma separated", placeholder: "HTML, CSS, JavaScript" }) +
        field("Image URL", "image", p.image, { hint: "paste a hosted image URL", placeholder: "https:// example.com/image.png", attrs: "data-project-image-url autocomplete=\"off\"" }) +
      "</div>" +
      '<div class="field">' +
        '<label>Upload cover image</label>' +
        '<input type="file" accept="image/*" data-project-image-upload>' +
        '<input type="hidden" name="imageData" value="' + esc(currentImage) + '">' +
        '<div class="field-sub">Upload a JPG/PNG/WebP under ~1.5MB. It is stored with the project and displayed on your live site (auto-cropped to fit).</div>' +
        '<div class="project-image-preview" data-project-image-preview>' +
          (currentImage ? '<img src="' + esc(currentImage) + '" alt="Project cover preview" style="max-width:100%;max-height:180px;border-radius:12px;display:block">' : '<span class="cell-sub">No image selected</span>') +
        '</div>' +
        '<button type="button" class="mini-btn" data-remove-project-image style="margin-top:8px">' + icon("trash") + " Remove image</button>" +
      '</div>' +
      '<div class="field-row">' +
        field("Display order", "order", p.order == null ? "" : p.order, { type: "number", hint: "lower shows first" }) +
        '<div class="field"><label>Flag</label><div class="check-row"><input type="checkbox" name="featured" ' + (p.featured ? "checked" : "") + '> Featured project</div></div>' +
      "</div>" +
      '<div class="field"><label>Filter categories</label>' +
        FILTER_OPTIONS.map(f => '<div class="check-row"><input type="checkbox" name="filter_' + f + '" ' + (filters.includes(f) ? "checked" : "") + "> " + f.toUpperCase() + "</div>").join("") +
      "</div>" +
      '<button type="submit" class="sr-only">Save</button></form>';
  }

  function bindProjectImageUpload(form) {
    if (!form) return;
    const fileInput = form.querySelector("[data-project-image-upload]");
    const hidden = form.querySelector("input[name='imageData']");
    const preview = form.querySelector("[data-project-image-preview]");
    const urlInput = form.querySelector("[data-project-image-url]");
    const removeBtn = form.querySelector("[data-remove-project-image]");
    if (!fileInput || !hidden || !preview) return;

    const isDataUrl = (v) => /^data:image\//i.test(String(v || ""));

    const showPreview = (src) => {
      if (!preview) return;
      preview.innerHTML = "";
      if (src) {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "Project cover preview";
        img.style.cssText = "max-width:100%;max-height:180px;border-radius:12px;display:block";
        img.addEventListener("error", () => {
          preview.innerHTML = '<span class="cell-sub">Could not load that image — check the URL or file.</span>';
        });
        preview.appendChild(img);
      } else {
        preview.innerHTML = '<span class="cell-sub">No image selected yet — upload a file or paste an image URL.</span>';
      }
      if (removeBtn) removeBtn.style.display = src ? "" : "none";
    };

    const syncFromUpload = (src) => {
      if (hidden) hidden.value = src || "";
      if (urlInput) urlInput.value = src || "";
      showPreview(src || "");
    };

    if (removeBtn) removeBtn.addEventListener("click", () => {
      fileInput.value = "";
      syncFromUpload("");
      toast("Image cleared — press Save to confirm.");
    });

    fileInput.addEventListener("change", e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) { toast("Please choose an image file.", false); return; }
      if (file.size > 1.5 * 1024 * 1024) { toast("Image too large (max ~1.5MB).", false); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result || "");
        syncFromUpload(src);
        toast("Project image ready — press Save.");
      };
      reader.readAsDataURL(file);
    });

    if (urlInput) {
      urlInput.addEventListener("input", () => {
        const v = urlInput.value.trim();
        if (isDataUrl(v) || !v) {
          if (!v) hidden.value = "";
          showPreview(v);
        } else {
          hidden.value = "";
          showPreview(v);
        }
      });
    }

    const initial = hidden.value || (urlInput && urlInput.value) || "";
    if (initial) showPreview(initial);
    else showPreview("");
  }

  function collectProject(values, existing) {
    const filters = FILTER_OPTIONS.filter(f => values["filter_" + f]);
    const imageValue = values.imageData || values.image || "";
    return {
      id: (existing && existing.id) || uid("proj"),
      name: values.name || "Untitled Project",
      category: values.category || "Project",
      filters,
      description: values.description || "",
      longDescription: values.longDescription || "",
      visionNote: values.visionNote || "",
      status: values.status || "In Development",
      tags: (values.tags || "").split(",").map(s => s.trim()).filter(Boolean),
      liveUrl: values.liveUrl || "",
      githubUrl: values.githubUrl || "",
      image: imageValue,
      featured: !!values.featured,
      order: values.order === "" ? 99 : parseInt(values.order, 10) || 99
    };
  }

  function bindProjects() {
    $("addProjectBtn").addEventListener("click", () => {
      openModal("Add Project", projectFormHTML(null), async values => {
        try {
          const obj = collectProject(values, null);
          if (ONLINE) {
            await api("/api/projects", { method: "POST", body: obj });
            await loadFromApi();
          } else {
            const list = (data().projects || []).slice();
            list.push(obj);
            window.LBData.saveOverrides({ projects: list });
          }
          logActivity("Added project “" + obj.name + "”." + (ONLINE ? " (live)" : ""));
          refreshAll();
          closeModal();
          toast(ONLINE ? "Project added — live now." : "Project added.");
        } catch (ex) { toast(ex.message || "Save failed.", false); }
      }, "Add Project");
    });
    $("projectRows").addEventListener("click", e => {
      const edit = e.target.closest("[data-edit-project]");
      const del = e.target.closest("[data-del-project]");
      const list = (data().projects || []).slice();
      if (edit) {
        const p = list.find(x => String(x.id) === edit.dataset.editProject);
        if (!p) return;
        openModal("Edit Project", projectFormHTML(p), async values => {
          try {
            const obj = collectProject(values, p);
            if (ONLINE) {
              await api("/api/projects/" + encodeURIComponent(p.id), { method: "PUT", body: obj });
              await loadFromApi();
            } else {
              window.LBData.saveOverrides({ projects: list.map(x => x.id === p.id ? obj : x) });
            }
            logActivity("Edited project “" + obj.name + "”." + (ONLINE ? " (live)" : ""));
            refreshAll();
            closeModal();
            toast(ONLINE ? "Project updated — live now." : "Project updated.");
          } catch (ex) { toast(ex.message || "Save failed.", false); }
        }, "Save Changes");
      }
      if (del) {
        const p = list.find(x => String(x.id) === del.dataset.delProject);
        if (!p) return;
        openModal("Delete Project", '<p style="color:var(--muted)">Delete <strong style="color:var(--text)">“' + esc(p.name) + '”</strong>?' + (ONLINE ? " This removes it from the <strong>live</strong> website immediately." : " This removes it from this browser.") + " This cannot be undone.</p>",
          async () => {
            try {
              if (ONLINE) {
                await api("/api/projects/" + encodeURIComponent(p.id), { method: "DELETE" });
                await loadFromApi();
              } else {
                window.LBData.saveOverrides({ projects: list.filter(x => x.id !== p.id) });
              }
              logActivity("Deleted project “" + p.name + "”." + (ONLINE ? " (live)" : ""));
              refreshAll();
              closeModal();
              toast("Project deleted.");
            } catch (ex) { toast(ex.message || "Delete failed.", false); }
          }, "Delete");
      }
    });
  }

  /* ---------- Collaborations CRUD ---------- */
  function renderCollabRows() {
    const body = $("collabRows");
    if (!body) return;
    const list = data().collaborations || [];
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="4"><span class="cell-sub">No collaborations yet — click "Add Collaboration".</span></td></tr>';
      return;
    }
    body.innerHTML = list.map(c =>
      "<tr><td><span class=\"cell-title\">" + esc(c.name) + "</span>" +
      '<span class="cell-sub">' + esc(c.description || "").slice(0, 80) + "</span></td>" +
      '<td><span class="status-tag">' + esc(c.role || "Collaborator") + "</span></td>" +
      "<td><span class=\"cell-sub\">" + esc(isValid(c.url) ? "Link set" : "Link coming soon") + "</span></td>" +
      '<td><div class="row-actions">' +
        '<button class="mini-btn" data-edit-collab="' + esc(c.id) + '" aria-label="Edit ' + esc(c.name) + '">' + icon("pencil") + "</button>" +
        '<button class="mini-btn danger" data-del-collab="' + esc(c.id) + '" aria-label="Delete ' + esc(c.name) + '">' + icon("trash") + "</button>" +
      "</div></td></tr>"
    ).join("");
  }

  function collabFormHTML(c) {
    c = c || {};
    return '<form id="collabForm">' +
      field("Project name", "name", c.name, { placeholder: "e.g. Zion AI" }) +
      '<div class="field-row">' +
        field("Role", "role", c.role || "Collaborator", { type: "select", options: ["Partnered Project", "Contributor", "Collaborator"] }) +
        field("Status", "status", c.status || "In Progress") +
      "</div>" +
      field("Description", "description", c.description, { type: "textarea", hint: "honest, no ownership claims" }) +
      '<div class="field-row">' +
        field("URL", "url", c.url, { type: "url", placeholder: "https://… (leave empty if none)" }) +
        field("Logo / image path", "logo", c.logo, { placeholder: "assets/images/collaborations/….png" }) +
      "</div>" +
      '<button type="submit" class="sr-only">Save</button></form>';
  }

  function bindCollabs() {
    $("addCollabBtn").addEventListener("click", () => {
      openModal("Add Collaboration", collabFormHTML(null), async values => {
        try {
          const obj = { id: uid("col"), name: values.name || "Untitled", role: values.role, status: values.status, description: values.description, url: values.url, logo: values.logo };
          if (ONLINE) {
            await api("/api/collaborations", { method: "POST", body: obj });
            await loadFromApi();
          } else {
            const list = (data().collaborations || []).slice();
            list.push(obj);
            window.LBData.saveOverrides({ collaborations: list });
          }
          logActivity("Added collaboration “" + obj.name + "”." + (ONLINE ? " (live)" : ""));
          refreshAll();
          closeModal();
          toast(ONLINE ? "Collaboration added — live now." : "Collaboration added.");
        } catch (ex) { toast(ex.message || "Save failed.", false); }
      }, "Add Collaboration");
    });
    $("collabRows").addEventListener("click", e => {
      const edit = e.target.closest("[data-edit-collab]");
      const del = e.target.closest("[data-del-collab]");
      const list = (data().collaborations || []).slice();
      if (edit) {
        const c = list.find(x => String(x.id) === edit.dataset.editCollab);
        if (!c) return;
        openModal("Edit Collaboration", collabFormHTML(c), async values => {
          try {
            const obj = { ...c, name: values.name, role: values.role, status: values.status, description: values.description, url: values.url, logo: values.logo };
            if (ONLINE) {
              await api("/api/collaborations/" + encodeURIComponent(c.id), { method: "PUT", body: obj });
              await loadFromApi();
            } else {
              window.LBData.saveOverrides({ collaborations: list.map(x => x.id === c.id ? obj : x) });
            }
            logActivity("Edited collaboration “" + obj.name + "”." + (ONLINE ? " (live)" : ""));
            refreshAll();
            closeModal();
            toast(ONLINE ? "Collaboration updated — live now." : "Collaboration updated.");
          } catch (ex) { toast(ex.message || "Save failed.", false); }
        }, "Save Changes");
      }
      if (del) {
        const c = list.find(x => String(x.id) === del.dataset.delCollab);
        if (!c) return;
        openModal("Delete Collaboration", '<p style="color:var(--muted)">Delete <strong style="color:var(--text)">“' + esc(c.name) + '”</strong>? This cannot be undone.</p>',
          async () => {
            try {
              if (ONLINE) {
                await api("/api/collaborations/" + encodeURIComponent(c.id), { method: "DELETE" });
                await loadFromApi();
              } else {
                window.LBData.saveOverrides({ collaborations: list.filter(x => x.id !== c.id) });
              }
              logActivity("Deleted collaboration “" + c.name + "”." + (ONLINE ? " (live)" : ""));
              refreshAll();
              closeModal();
              toast("Collaboration deleted.");
            } catch (ex) { toast(ex.message || "Delete failed.", false); }
          }, "Delete");
      }
    });
  }

  /* ---------- Profile / contacts / resume / SEO / settings forms ---------- */
  let photoDataUrl = "";

  function bindProfileForm() {
    const form = $("profileForm");
    const fill = () => {
      const p = data().profile || {};
      $("pfName").value = p.name || "";
      $("pfRole").value = p.role || "";
      $("pfBadge").value = p.badge || "";
      $("pfHeroTitle").value = p.heroTitle || "";
      $("pfHeroDesc").value = p.heroDescription || "";
      $("pfStatus").value = p.status || "";
      $("pfFocus").value = (p.focus || []).join(", ");
      $("pfBio").value = p.bio || "";
      $("pfBioExtra").value = p.bioExtra || "";
      $("pfPhilosophy").value = p.philosophy || "";
      $("pfPhoto").value = p.photo || "";
      photoDataUrl = p.photoData || "";
      renderPhotoPreview();
    };
    fill();
    FILLERS.push(fill);
    document.addEventListener("lb:data", () => { if (!ONLINE) fill(); });

    $("pfPhotoFile").addEventListener("change", e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) { toast("Please choose an image file.", false); return; }
      if (file.size > 1.5 * 1024 * 1024) { toast("Image too large (max ~1.5MB).", false); return; }
      const reader = new FileReader();
      reader.onload = () => { photoDataUrl = reader.result; renderPhotoPreview(); toast("Photo preview ready — press Save."); };
      reader.readAsDataURL(file);
    });
    $("pfPhotoClear").addEventListener("click", () => { photoDataUrl = ""; $("pfPhotoFile").value = ""; renderPhotoPreview(); });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      try {
        await persistProfile({
          name: $("pfName").value.trim(),
          role: $("pfRole").value.trim(),
          badge: $("pfBadge").value.trim(),
          heroTitle: $("pfHeroTitle").value.trim(),
          heroDescription: $("pfHeroDesc").value.trim(),
          status: $("pfStatus").value.trim(),
          focus: $("pfFocus").value.split(",").map(s => s.trim()).filter(Boolean),
          bio: $("pfBio").value.trim(),
          bioExtra: $("pfBioExtra").value.trim(),
          philosophy: $("pfPhilosophy").value.trim(),
          photo: $("pfPhoto").value.trim(),
          photoData: photoDataUrl
        }, "Updated profile information.");
        toast(ONLINE ? "Profile saved — live now." : "Profile saved — public site updated.");
      } catch (ex) { toast(ex.message || "Save failed.", false); }
    });
    $("profileReset").addEventListener("click", async () => {
      if (ONLINE) {
        toast("ONLINE mode: content lives in the database — edit or delete items instead.", false);
        return;
      }
      if (!confirm("Reset ALL demo changes back to the JSON defaults?")) return;
      window.LBData.resetOverrides();
      logActivity("Reset all demo content to defaults.");
      setTimeout(() => { refreshAll(); toast("Everything reset to defaults."); }, 150);
    });
  }

  function renderPhotoPreview() {
    let prev = $("photoPreview");
    if (!prev) return;
    const p = data().profile || {};
    const src = photoDataUrl || p.photoData || "";
    if (src) {
      if (prev.tagName !== "IMG") {
        const img = document.createElement("img");
        img.id = "photoPreview";
        img.className = "photo-preview";
        img.style.width = "100%";
        prev.replaceWith(img);
        prev = img;
      }
      prev.src = src;
      prev.alt = "Profile photo preview";
    } else {
      const name = (p.heroTitle || p.name || "LB");
      const words = String(name).trim().split(/\s+/);
      const text = words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : String(name).slice(0, 2).toUpperCase();
      if (prev.tagName === "IMG") {
        const div = document.createElement("div");
        div.id = "photoPreview";
        div.className = "photo-preview";
        prev.replaceWith(div);
        prev = div;
      }
      prev.textContent = text;
    }
  }

  function bindContactForm() {
    const fill = () => {
      const p = data().profile || {};
      $("cfEmail").value = p.email || "";
      $("cfWhatsapp").value = p.whatsapp || "";
      $("cfGithub").value = p.github || "";
      $("cfLinkedin").value = (p.socials && p.socials.linkedin) || "";
      $("cfTwitter").value = (p.socials && p.socials.twitter) || "";
      $("cfInstagram").value = (p.socials && p.socials.instagram) || "";
    };
    fill();
    FILLERS.push(fill);
    document.addEventListener("lb:data", () => { if (!ONLINE) fill(); });
    $("contactForm").addEventListener("submit", async e => {
      e.preventDefault();
      try {
        await persistProfile({
          email: $("cfEmail").value.trim(),
          whatsapp: $("cfWhatsapp").value.trim(),
          github: $("cfGithub").value.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, ""),
          socials: { linkedin: $("cfLinkedin").value.trim(), twitter: $("cfTwitter").value.trim(), instagram: $("cfInstagram").value.trim() }
        }, "Updated contact information.");
        toast(ONLINE ? "Contacts saved — live now." : "Contacts saved — public site updated.");
      } catch (ex) { toast(ex.message || "Save failed.", false); }
    });
  }

  function bindResumeForm() {
    const fill = () => {
      const r = (data().settings && data().settings.resume) || {};
      $("rsFilename").value = r.filename || "";
      $("rsUrl").value = r.url || "";
    };
    fill();
    FILLERS.push(fill);
    document.addEventListener("lb:data", () => { if (!ONLINE) fill(); });
    $("resumeForm").addEventListener("submit", async e => {
      e.preventDefault();
      try {
        await persistSettings({ resume: { filename: $("rsFilename").value.trim(), url: $("rsUrl").value.trim() } }, "Updated resume link.");
        toast("Resume settings saved.");
      } catch (ex) { toast(ex.message || "Save failed.", false); }
    });
    $("resumeUploadBtn").addEventListener("click", () => {
      toast(ONLINE ? "Link a hosted file URL above (Drive/Docs). Direct uploads need object storage." : "Upload placeholder — connect storage in the backend phase.", false);
    });
  }

  function bindSeoForm() {
    const fill = () => {
      const s = data().settings || {};
      $("seoTitle").value = s.siteTitle || "";
      $("seoDesc").value = s.metaDescription || "";
      $("seoKeywords").value = s.keywords || "";
      $("seoOgTitle").value = s.ogTitle || "";
      $("seoOgDesc").value = s.ogDescription || "";
      $("seoOgImage").value = s.ogImage || "";
    };
    fill();
    FILLERS.push(fill);
    document.addEventListener("lb:data", () => { if (!ONLINE) fill(); });
    $("seoForm").addEventListener("submit", async e => {
      e.preventDefault();
      try {
        await persistSettings({
          siteTitle: $("seoTitle").value.trim(),
          metaDescription: $("seoDesc").value.trim(),
          keywords: $("seoKeywords").value.trim(),
          ogTitle: $("seoOgTitle").value.trim(),
          ogDescription: $("seoOgDesc").value.trim(),
          ogImage: $("seoOgImage").value.trim()
        }, "Updated SEO settings.");
        toast("SEO saved — applies on next visit.");
      } catch (ex) { toast(ex.message || "Save failed.", false); }
    });
  }

  function bindSettingsForm() {
    const fill = () => {
      const s = data().settings || {};
      $("setTheme").value = s.theme || "dark";
      $("setAnimations").checked = s.animations !== false;
      $("setMaintenance").checked = s.maintenanceMode === true;
      $("setVisible").checked = s.siteVisible !== false;
    };
    fill();
    FILLERS.push(fill);
    document.addEventListener("lb:data", () => { if (!ONLINE) fill(); });
    $("settingsForm").addEventListener("submit", async e => {
      e.preventDefault();
      try {
        const theme = $("setTheme").value;
        document.documentElement.setAttribute("data-theme", theme);
        await persistSettings({
          theme,
          animations: $("setAnimations").checked,
          maintenanceMode: $("setMaintenance").checked,
          siteVisible: $("setVisible").checked
        }, "Updated site settings.");
        toast("Settings saved.");
      } catch (ex) { toast(ex.message || "Save failed.", false); }
    });
    $("exportBtn").addEventListener("click", () => {
      const payload = ONLINE ? ADMIN_DATA : window.LBData.getOverrides();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = ONLINE ? "linuxboss-database-export.json" : "linuxboss-overrides.json";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Backup downloaded as JSON.");
    });
  }

  function bindPasswordForm() {
    const form = $("passwordForm");
    if (!form) return;
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const cur = $("pwCurrent").value, nw = $("pwNew").value, cf = $("pwConfirm").value;
      if (nw !== cf) { toast("New passwords don't match.", false); return; }
      if (nw.length < 10) { toast("New password must be at least 10 characters.", false); return; }
      try {
        await api("/api/auth/change-password", { method: "POST", body: { current: cur, new: nw } });
        form.reset();
        logActivity("Changed admin password. (live)");
        toast("Password changed.");
      } catch (ex) { toast(ex.message || "Change failed.", false); }
    });
  }

  /* ---------- Boot ---------- */
  function bootForms() {
    if (bootForms.done) return;
    bootForms.done = true;
    bindProfileForm();
    bindContactForm();
    bindResumeForm();
    bindSeoForm();
    bindSettingsForm();
    bindPasswordForm();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    bindLogin();
    bindTabs();
    bindModal();
    bindProjects();
    bindCollabs();
    try {
      const o = JSON.parse(window.localStorage.getItem("lbx_overrides_v1") || "{}");
      if (o.settings && o.settings.theme) document.documentElement.setAttribute("data-theme", o.settings.theme);
    } catch { /* ignore */ }

    // Detect ONLINE vs DEMO mode first (fast health check).
    ONLINE = await detectApi();

    // Demo-mode data layer (used when offline).
    if (!ONLINE && window.LBData) {
      try {
        await window.LBData.init();
        const s = window.LBData.get().settings || {};
        if (s.theme) document.documentElement.setAttribute("data-theme", s.theme);
      } catch { /* ignore */ }
    }

    // Session restore.
    if (ONLINE && getToken()) {
      try {
        await api("/api/auth/me");
        await loadFromApi();
        showApp();
        return;
      } catch { setToken(""); /* fall through to login */ }
    }
    if (!ONLINE && isAuthedDemo()) showApp();

    const year = $("adminYear");
    if (year) year.textContent = String(new Date().getFullYear());
  });
})();
