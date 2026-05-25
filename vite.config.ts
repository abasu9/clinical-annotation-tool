import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { cloudflare } from "@cloudflare/vite-plugin";

// Using a relative base so the same build works on GitHub Pages
// (any project subpath) and on root hosts like Vercel/Netlify.
export default defineConfig({
  base: "./",
  plugins: [react(), cloudflare()],
  server: {
    port: 5173,
    strictPort: false,
    open: true,
  },
});