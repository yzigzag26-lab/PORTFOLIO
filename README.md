# LINUXBOSS — Personal Portfolio & Founder Website

> **Student Developer. Future Ethical Hacker. Technology Founder.**
> Building technology, exploring systems, and working toward infrastructure for Africa's digital future.

**BUILD. SECURE. VERIFY. SCALE.**

A premium, dark-first personal technology headquarters: developer portfolio + founder profile +
cybersecurity identity + project showcase + vision platform + future-ready admin dashboard.
Built with **HTML5 + CSS3 + vanilla JavaScript only** — no frameworks, no build step.

---

## Folder structure

```
LINUXBOSS/
├── index.html              # Public website (all sections)
├── admin.html              # Private-style admin dashboard (demo auth)
├── css/
│   ├── style.css           # Public site design system (dark + light)
│   └── admin.css           # Admin dashboard styles
├── js/
│   ├── main.js             # Theme, nav, mobile menu, active links, year, toast
│   ├── projects.js         # Data layer + public rendering (projects, collabs, contact, SEO)
│   ├── animations.js       # Scroll-reveal engine (respects reduced-motion)
│   └── admin.js            # Admin auth, tabs, CRUD, settings (demo only)
├── assets/
│   ├── images/
│   │   ├── profile.png         # <-- PUT YOUR PHOTO HERE (see below)
│   │   ├── projects/           # Project cover images
│   │   └── collaborations/     # Collaboration logos (optional)
│   ├── icons/
│   └── resume/
├── data/
│   ├── profile.json        # Identity, hero, bio, contacts, socials
│   ├── projects.json       # Showcased projects
│   ├── collaborations.json # Partnered / contributor projects
│   └── settings.json       # SEO, resume, theme, maintenance flags
└── README.md
```

---

## How to run locally

**Option A — just open it (works offline):**

Open `index.html` in any modern browser. The site ships with built-in fallback data,
so it renders fully even from `file://` (JSON `fetch` is blocked on `file://` in most
browsers — the fallback covers that automatically).

**Option B — local server (recommended, enables the JSON files):**

```bash
cd LINUXBOSS
python3 -m http.server 8000
# then visit http://localhost:8000
```

Any static server works (`npx serve`, VS Code Live Server, etc.).

---

## How to edit content

There are **three** ways, in increasing power:

1. **Edit the JSON files** in `data/` — the source of truth for the public site
   (requires serving over HTTP, see Option B).
2. **Use the admin dashboard** (`admin.html`) — edits save to the browser's
   localStorage and override the JSON instantly.
3. **Edit `index.html` directly** — for static sections (Vision, Skills, Journey).

> If the JSON files can't load (offline / `file://`), the site falls back to the
> built-in defaults in `js/projects.js`, then applies admin overrides on top.

---

## How the admin demo works

Open `admin.html` → log in → manage content across tabs:

**Overview · Profile · Projects · Collaborations · Contacts · Resume · SEO · Settings**

- **Profile** — name, role, hero text, bio, philosophy, status, focus, photo.
- **Projects** — full CRUD with modal forms (name, category, description, status,
  live/GitHub URLs, tags, image, featured flag, display order, filter categories).
  Deleting asks for confirmation.
- **Collaborations** — full CRUD (name, role, description, URL, status, logo).
- **Contacts** — email, WhatsApp, GitHub, LinkedIn, X, Instagram.
  Empty fields are hidden publicly — never invented.
- **Resume** — filename + hosted URL. The public Resume button only appears when a
  URL is set. “Upload” is a placeholder for the backend phase.
- **SEO** — site title, meta description, keywords, OG tags (applied on next visit).
- **Settings** — default theme, animations on/off, site visibility,
  maintenance mode (shows a banner publicly), plus **Export Overrides (JSON)**.

Recent changes appear under **Overview → Recent Updates**.

### Demo credentials (demo/offline mode only)

```
Email:    admin@linuxboss.local
Password: boss-2026-demo
```

> ⚠️ **SECURITY WARNING:** These demo credentials unlock a **browser-local**
> dashboard only. The admin uses `sessionStorage`/`localStorage` demo auth, which is
> **NOT real security**. For production, use **online mode** (below) with real
> authentication. Never put API secrets, database passwords, private keys, or
> service-role keys in frontend JavaScript.

---

## Backend phase (IMPLEMENTED) — Flask API + MySQL on Wasmer Edge

The backend is built and lives in `backend/`. Full guide: **`backend/README.md`**.

```
Browser → Static site (Wasmer) → Flask API app (Wasmer) → MySQL (Wasmer)
```

- **API:** `backend/src/main.py` — public reads + JWT-protected CRUD + one-time setup.
- **Tables:** `backend/schema.sql` (`users`, `docs`, `projects`, `collaborations`).
- **Seed:** `backend/src/seed.json` auto-loaded by `POST /api/setup` (runs once).
- **Deploy config:** `backend/wasmer.toml` + `backend/app.yaml` (replace
  `YOUR-WASMER-USERNAME` first) + `backend/deps/` (via `pip install --target=deps`).
- **Secrets:** production credentials go in **Wasmer Secrets**
  (`wasmer app secrets create --from-file=.env`, then redeploy). Local dev uses
  `backend/.env` (never committed — see `.env.example`).
- **Frontend wiring:** set `apiUrl` in `js/config.js`, rebuild (`build-public.sh`
  / `.bat`), redeploy the frontend. With no `apiUrl` (or API down), the site
  gracefully falls back to `data/*.json` + demo admin mode — it never breaks.
- **Admin modes:** topbar badge shows **ONLINE** (real JWT login, edits go live
  globally) or **DEMO** (browser-only). Includes real change-password in online mode.

---

## How to replace the profile image

1. Save your photo as `assets/images/profile.png`
   (JPG also works — update the `photo` field in `data/profile.json`).
2. Recommended: square-ish portrait, at least **800×1000px**.
3. Reload — the hero swaps the monogram placeholder for your photo automatically.
4. If the file is missing, a styled **LB monogram** shows instead of a broken image.
5. Alternative: upload via **Admin → Profile → Choose Photo** (browser-local preview,
   max ~1.5MB — real uploads arrive with the backend phase).

---

## How to add projects

**Via admin (easiest):** `admin.html` → Projects → **Add Project** → fill the form →
save. It appears on the homepage immediately, in this browser.

**Via JSON (permanent):** add an object to `data/projects.json`:

```json
{
  "id": "my-project",
  "name": "My Project",
  "category": "Web App",
  "filters": ["web"],
  "description": "One or two honest sentences.",
  "longDescription": "Longer overview for the details modal.",
  "visionNote": "Clarify what is vision vs. implemented.",
  "status": "Prototype",
  "tags": ["HTML", "CSS", "JavaScript"],
  "liveUrl": "https://example.com/",
  "githubUrl": "",
  "image": "assets/images/projects/my-project.png",
  "featured": false,
  "order": 3
}
```

Valid `filters`: `web`, `ai`, `cybersecurity`, `blockchain`, `infrastructure`.
Leave `liveUrl` empty to show **LINK COMING SOON** instead of inventing a URL.

---

## How to deploy

This is a **static site** — deploy anywhere static hosting works:

### Wasmer Edge (used for this project)

The project ships Wasmer-ready: `Staticfile`, `settings/config.toml`, branded
`404.html` / `50x.html`, and a `public/` folder builder.

```bash
cd LINUXBOSS

# 1) (Re)build the deploy folder whenever you change the site.
#    Mac/Linux:
./build-public.sh
#    Windows:
build-public.bat

# 2) Log in once (opens your browser):
wasmer login

# 3) Deploy:
wasmer deploy
# Pick an app name like `linuxboss` when asked.
# You'll get a live URL like https://linuxboss-<you>.wasmer.app
```

To publish updates later: edit the site → re-run the build script → `wasmer deploy`.

> Don't have the Wasmer CLI? Install it: `curl https://get.wasmer.io -sSfL | sh`
> (Windows: `winget install Wasmer.Wasmer`), then restart your terminal.
>
> ⚠️ The deployed `admin.html` is visible to anyone with the link (it's a static
> file). That's acceptable for this demo because admin edits only affect each
> visitor's own browser — but don't treat it as private until the backend phase
> adds real authentication.

### Other hosts

- **Vercel / Netlify / Cloudflare Pages / GitHub Pages:** point the
  project at this folder; no build command needed.
- Any web server: copy the `LINUXBOSS/` folder to the web root.

Remember: admin overrides live in each visitor's own browser. To make dashboard
edits visible to *everyone*, complete the backend phase below.

---

## Future backend architecture

```
Frontend (this project)
  ↓
Secure Authentication (sessions / JWT, hashed passwords)
  ↓
Backend API (Node.js + Express, or Supabase)
  ↓
Database (PostgreSQL / Supabase)
  ↓
Storage (Supabase Storage / S3 — photos, resume, uploads)
```

Migration path (already prepared):

- `js/projects.js → fetchBaseData()` is the **single seam** — replace the
  `fetch("data/*.json")` calls with API calls; every render function keeps working.
- `js/admin.js` CRUD functions map 1:1 to REST endpoints
  (`GET/POST/PATCH/DELETE /api/projects`, etc.).
- Demo auth in `admin.js` must be **deleted** and replaced with real login
  (httpOnly cookies, server-side sessions). Never ship the demo gate publicly
  as “protection” — it only hides UI in the browser.
- SEO fields should be rendered **server-side** in production so crawlers see them.

---

## Content rules (followed throughout)

- No invented awards, companies, clients, investors, revenue, users, certificates,
  degrees, job titles, followers, or social accounts.
- Collaborations are labeled **Partnered Project / Contributor / Collaborator** —
  never claimed as owned companies.
- TRUSTOS capabilities beyond the prototype are framed as **long-term vision**.
- Pharma Near Me makes **no medical claims**.
- Skills use **Exploring / Learning / Building / Developing** — no fake percentages.
- Missing links show **LINK COMING SOON** / **Not Added**, editable in admin.
- Footer year is automatic via JavaScript — never hardcoded.

---

© LINUXBOSS — Built with curiosity. **BUILD. SECURE. VERIFY. SCALE.**
