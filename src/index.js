import JavaScriptObfuscator from "javascript-obfuscator";
import {
  curseWithObfuscator,
  levels,
  aliases
} from "./core.js";

export async function curse(source, options = {}) {
  return curseWithObfuscator(JavaScriptObfuscator, source, options);
}

export { levels, aliases };
