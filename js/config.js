/* ============================================================
   LINUXBOSS — Site configuration (config.js)
   ------------------------------------------------------------
   Paste your deployed backend API URL below (no trailing slash),
   then rebuild (build-public.sh / .bat) and redeploy the frontend.

     apiUrl: "https://linuxboss-api.wasmer.app/"

   Leave it empty ("") to run in DEMO/OFFLINE mode:
   the site reads data/*.json + built-in defaults, and the admin
   dashboard uses browser-local demo storage.

   NOTE: this file is PUBLIC (shipped to browsers). Never put
   secrets, passwords, or tokens in here — the API URL is fine.
   ============================================================ */
window.LB_CONFIG = {
  apiUrl: "https://linuxboss-api.wasmer.app"
};
