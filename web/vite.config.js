import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

export default defineConfig({
  root: repoRoot,
  base: "./",
  server: {
    open: "/web/",
    fs: {
      allow: [repoRoot]
    }
  },
  build: {
    outDir: "dist-web",
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./index.html", import.meta.url))
    }
  }
});
