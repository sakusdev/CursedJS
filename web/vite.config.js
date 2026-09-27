import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";

const webRoot = fileURLToPath(new URL("./", import.meta.url));
const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const browserObfuscator = fileURLToPath(
  new URL("../node_modules/javascript-obfuscator/dist/index.browser.js", import.meta.url)
);
const browserObfuscatorSource = readFileSync(browserObfuscator);

function rawBrowserObfuscator() {
  return {
    name: "raw-browser-obfuscator",

    configureServer(server) {
      server.middlewares.use(
        "/vendor/javascript-obfuscator.js",
        (_req, res) => {
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/javascript; charset=utf-8");
          res.end(browserObfuscatorSource);
        }
      );
    },

    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "vendor/javascript-obfuscator.js",
        source: browserObfuscatorSource
      });
    }
  };
}

export default defineConfig({
  root: webRoot,
  base: "./",
  plugins: [rawBrowserObfuscator()],
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
