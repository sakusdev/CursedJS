let curseBrowser = null;
let ready = false;

async function initialize(obfuscatorUrl) {
  if (ready) return;

  importScripts(obfuscatorUrl);

  if (!self.JavaScriptObfuscator?.obfuscate) {
    throw new ReferenceError(
      "JavaScriptObfuscator UMD bundle loaded without exposing JavaScriptObfuscator."
    );
  }

  const module = await import("./browser-core.js");
  curseBrowser = module.curseBrowser;
  ready = true;
  self.postMessage({ type: "ready" });
}

self.addEventListener("message", async (event) => {
  const data = event.data ?? {};

  if (data.type === "init") {
    try {
      await initialize(data.obfuscatorUrl);
    } catch (error) {
      self.postMessage({
        type: "init-error",
        error: error?.stack || error?.message || String(error)
      });
    }
    return;
  }

  const { id, source, level, seed } = data;

  if (!ready || !curseBrowser) {
    self.postMessage({
      id,
      ok: false,
      error: "Transformer worker is not initialized."
    });
    return;
  }

  try {
    const startedAt = performance.now();
    const result = await curseBrowser(source, { level, seed });
    self.postMessage({
      id,
      ok: true,
      result,
      elapsedMs: performance.now() - startedAt
    });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error?.stack || error?.message || String(error)
    });
  }
});
