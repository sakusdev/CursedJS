import { curseWithObfuscator } from "../../src/core.js";

export async function curseBrowser(source, options = {}) {
  if (!globalThis.JavaScriptObfuscator?.obfuscate) {
    throw new ReferenceError("JavaScriptObfuscator browser bundle is not loaded.");
  }

  return curseWithObfuscator(
    globalThis.JavaScriptObfuscator,
    source,
    options
  );
}
