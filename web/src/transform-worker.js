import { curse } from "../../src/index.js";

self.postMessage({ type: "ready" });

self.addEventListener("message", async (event) => {
  const { id, source, level, seed } = event.data;

  try {
    const startedAt = performance.now();
    const result = await curse(source, { level, seed });
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
