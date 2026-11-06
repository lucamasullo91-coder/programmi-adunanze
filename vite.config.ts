import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// One self-contained script (images and styles inside), loaded by the Apps Script page.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsInlineLimit: 10_000_000,
    cssCodeSplit: false,
    rollupOptions: { input: "src/main.tsx", output: {
        format: "iife",
        entryFileNames: "app.js",
        inlineDynamicImports: true,
        // Runs before everything else: shows on the page (and saves in the sheet) any error, so a failure is never a blank page.
        banner: `window.__paAvviata=true;(function(){var seg=function(m){try{var d=document.createElement("pre");d.style.cssText="white-space:pre-wrap;margin:16px;padding:12px;border:1px solid #A8432B;color:#A8432B;font:13px monospace;background:#fff";d.textContent="Errore: "+m;(document.body||document.documentElement).appendChild(d);}catch(e){}try{google.script.run.salva("diag-tutto:"+Date.now(),String(m).slice(0,500));}catch(e){}};window.__segnala=seg;window.addEventListener("error",function(e){seg(e.message+" ("+e.lineno+":"+e.colno+")");});window.addEventListener("unhandledrejection",function(e){seg("promise: "+(e.reason&&e.reason.message||e.reason));});try{google.script.run.salva("diag-tutto:avvio","JS avviato "+new Date().toISOString());}catch(e){}})();`,
      } },
  },
});
