import { curse } from "../../src/index.js";

self.addEventListener("message", async (event) => {
  const { id, source, level, seed } = event.data;

  try {
    const result = await curse(source, { level, seed });
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error?.stack || error?.message || String(error)
    });
  }
});
