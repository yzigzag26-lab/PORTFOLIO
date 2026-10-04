# 🤖 Copilot Task Prompt — Finish the LINUXBOSS Backend on Wasmer (copy everything below the line)

---

You are an expert full-stack engineer working in an agent terminal (VS Code Copilot / similar) with the project folder open. Complete the following deployment task **fully, end-to-end**. Do not stop after planning — run the commands, edit the files, verify each step, and only ask the user for the specific inputs listed below.

## PROJECT CONTEXT

- **LINUXBOSS**: a static portfolio website (HTML/CSS/vanilla JS) already live on **Wasmer Edge**.
- Folder layout:
  - `index.html`, `admin.html`, `css/`, `js/`, `data/`, `assets/` → the frontend
  - `Staticfile`, `settings/config.toml`, `public/` (built by `build-public.sh` / `build-public.bat`) → frontend Wasmer deploy
  - `backend/` → a finished **Flask + MySQL REST API** (`src/main.py`, `requirements.txt`, `wasmer.toml`, `app.yaml`, `schema.sql`, `src/seed.json`, `.env.example`, `db_setup.py`, `README.md`)
- **ALREADY DONE — do not redo:** MySQL tables exist (`users`, `docs`, `projects`, `collaborations`); the admin account (`linuxboss@beast.com`) exists; content is seeded (profile, settings, 2 projects, 5 collaborations).
- **Do NOT touch the `users` table and do NOT call `POST /api/setup`** (it will refuse with "Already initialized" — that is expected, not an error).
- Goal: deploy the API to **Wasmer Edge**, attach secrets, wire `js/config.js` to the API, rebuild + redeploy the frontend IN PLACE so the admin dashboard runs in **ONLINE mode** (real JWT auth, edits stored in MySQL and visible globally).

## STRICT SECRETS RULES

1. NEVER print, repeat, or log any secret (DB password, JWT_SECRET, SETUP_TOKEN).
2. Secrets may ONLY be written into `backend/.env` (gitignored) and into Wasmer Secrets.
3. NEVER commit `backend/.env`, never put secrets in code, never `cat backend/.env` after filling it, never run any "reveal secrets" command.
4. Ask the user for these inputs (all together, up front):
   - The **DB password** (write it straight into `backend/.env` — never display it)
   - Their **Wasmer username** (for `backend/wasmer.toml`)
   - The **existing frontend app name** on Wasmer (from their live site URL — so the final redeploy UPDATES the live site instead of creating a new app)
5. You do NOT need the admin email/password — the admin already exists. Never ask for it. Login verification is the user's job at the end.

## STEP-BY-STEP EXECUTION

**0. Inspect first.** List the project; read `backend/README.md`, `backend/.env.example`, `backend/wasmer.toml`, `backend/app.yaml`, and `js/config.js`.

**1. Check prerequisites.** Verify `python --version` (need 3.11+), `pip --version`, `wasmer --version`, `curl --version`. Check Wasmer login. If not logged in, run `wasmer login` and STOP for the user to complete the browser step, then continue.

**2. Generate secrets.** Run `python -c "import secrets; print(secrets.token_hex(32))"` twice → JWT_SECRET + SETUP_TOKEN. Keep them only in memory + `.env` + Wasmer Secrets.

**3. Create `backend/.env`** from `backend/.env.example`, filled EXACTLY:
```
DB_HOST=db.fr-roub1.bengt.wasmernet.com
DB_PORT=20184
DB_NAME=PORTFOLIO
DB_USER=user_9eb205cc
DB_PASSWORD=<user's DB password>
DB_SSL=true
JWT_SECRET=<generated>
JWT_HOURS=12
SETUP_TOKEN=<generated>
CORS_ORIGINS=*
```

**4. Verify DB connectivity (safe, idempotent).** Run `pip install pymysql`, then `python backend/db_setup.py` from the project root (it auto-loads `backend/.env`). Expect `SUCCESS: all required tables exist.` If SSL fails, set `DB_SSL=false` in `.env`, retry once, and keep whichever works.

**5. Vendor deps.** From `backend/`: `pip install --target=deps -r requirements.txt`. Confirm `backend/deps/` contains `flask`, `pymysql`, `jwt`.

**6. Namespace.** Replace `YOUR-WASMER-USERNAME` in `backend/wasmer.toml` with the user's real Wasmer username.

**7. Deploy the API.** From `backend/`: `wasmer deploy` (app name `linuxboss-api`). Capture the API URL (e.g. `https://linuxboss-api-<user>.wasmer.app`).

**8. Secrets + redeploy (mandatory — secrets only activate after redeploy).** From `backend/`:
```
wasmer app secrets create --from-file=.env
wasmer deploy
```

**9. Verify the API.** With `curl`:
- `GET https://<API>/api/health` → expect `{"ok":true,...}`
- `GET https://<API>/api/ready` → expect `"db":"up"`
- If `ready` fails: verify secret NAMES match `.env` keys via the app dashboard (Settings → Secrets, names only — do not reveal values), fix, redeploy, retest. SSL trouble → set the `DB_SSL` secret to `false` and redeploy.

**10. Confirm live data (no password needed).** `GET https://<API>/api/public` must return a bundle whose `projects` include TRUSTOS and Pharma Near Me. This proves API + database wiring without touching auth. (Skip `/api/setup` entirely — the DB is pre-seeded.)

**11. Wire the frontend.** Set `apiUrl` in `js/config.js` to the API URL with NO trailing slash.

**12. Rebuild.** From project root: `chmod +x build-public.sh` (Mac/Linux) then `./build-public.sh`, or `build-public.bat` on Windows. Confirm `public/js/config.js` contains the API URL.

**13. Redeploy frontend IN PLACE.** From project root: `wasmer deploy`, updating the EXISTING live frontend app (use the app name the user gave you; if the CLI wants to create a brand-new app instead, stop and confirm with the user first).

**14. Report.** API URL, website URL, admin URL (`<site>/admin.html`), admin login email `linuxboss@beast.com`. Tell the user to: (1) log in with their own password, (2) confirm the topbar badge shows **● ONLINE**, (3) make one small test edit and confirm it appears on the live site.

## TROUBLESHOOTING RULES

- Package-name deploy error → `wasmer.toml` username placeholder not replaced; fix, retry.
- `/api/ready` DB unreachable → secret typo or SSL mismatch; fix, redeploy, retest.
- "Already initialized" anywhere → NOT an error; the DB was pre-seeded. Continue.
- Frontend shows demo data → `js/config.js` URL wrong/trailing slash, or `public/` not rebuilt; fix, redeploy frontend.
- Never hardcode secrets, disable auth, delete data, or re-seed to "fix" things. If truly blocked: stop, explain what failed, what you tried, and what you need.

## DONE CRITERIA

Complete ONLY when: API health + ready pass, `/api/public` returns the seeded bundle (TRUSTOS present), frontend redeployed with the API URL. End with URLs + login email (never any password) + the 3 user confirmation steps.
