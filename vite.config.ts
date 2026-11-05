import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// One self-contained script (images and styles inside), loaded by the Apps Script page.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    assetsInlineLimit: 10_000_000,
    cssCodeSplit: false,
    rollupOptions: { input: "src/main.tsx", output: { format: "iife", entryFileNames: "app.js", inlineDynamicImports: true } },
  },
});
