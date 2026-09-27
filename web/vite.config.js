import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

const webRoot = fileURLToPath(new URL("./", import.meta.url));
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const browserObfuscator = fileURLToPath(
  new URL("../node_modules/javascript-obfuscator/dist/index.browser.js", import.meta.url)
);

export default defineConfig({
  root: webRoot,
  base: "./",
  resolve: {
    alias: {
      "javascript-obfuscator": browserObfuscator
    }
  },
  server: {
    open: "/",
    fs: {
      allow: [repoRoot]
    }
  },
  build: {
    outDir: fileURLToPath(new URL("../dist-web", import.meta.url)),
    emptyOutDir: true
  }
});
