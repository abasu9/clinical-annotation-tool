import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Using a relative base so the same build works on GitHub Pages
// (any project subpath) and on root hosts like Vercel/Netlify.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 3000,
  },
});
