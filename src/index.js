import JavaScriptObfuscator from "javascript-obfuscator";
import { minify } from "terser";

const VALID_LEVELS = new Set(["0", "1", "2", "3", "4", "cursed"]);

function looksLikeModule(source) {
  return /(^|\n)\s*(import\s|export\s)/m.test(source);
}

function obfuscatorOptions(level, seed) {
  const base = {
    compact: true,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: "hexadecimal",
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    seed
  };

  if (level === "2") {
    return {
      ...base,
      numbersToExpressions: true,
      stringArray: false
    };
  }

  if (level === "3") {
    return {
      ...base,
      numbersToExpressions: true,
      splitStrings: true,
      splitStringsChunkLength: 6,
      stringArray: true,
      stringArrayEncoding: ["base64"],
      stringArrayThreshold: 0.75
    };
  }

  if (level === "4") {
    return {
      ...base,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.55,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.12,
      numbersToExpressions: true,
      splitStrings: true,
      splitStringsChunkLength: 4,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayCallsTransformThreshold: 0.6,
      stringArrayEncoding: ["base64"],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayThreshold: 0.9,
      transformObjectKeys: true
    };
  }

  return {
    ...base,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.25,
    numbersToExpressions: true,
    splitStrings: true,
    splitStringsChunkLength: 2,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 1,
    stringArrayEncoding: ["rc4"],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayThreshold: 1,
    stringArrayWrappersCount: 3,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 5,
    stringArrayWrappersType: "function",
    transformObjectKeys: true,
    unicodeEscapeSequence: true
  };
}

async function oneLine(source, { compress = false, mangle = false } = {}) {
  const result = await minify(source, {
    compress,
    mangle,
    module: looksLikeModule(source),
    format: {
      beautify: false,
      comments: false,
      semicolons: true
    }
  });

  if (typeof result.code !== "string") {
    throw new Error("Terser produced no output.");
  }

  return result.code.replace(/[\r\n]+/g, "");
}

export async function curse(source, options = {}) {
  if (typeof source !== "string") {
    throw new TypeError("source must be a string");
  }

  const level = String(options.level ?? "cursed").toLowerCase();
  const seed = Number.isFinite(Number(options.seed)) ? Number(options.seed) : 0;

  if (!VALID_LEVELS.has(level)) {
    throw new RangeError(
      `Unknown level "${level}". Expected one of: 0, 1, 2, 3, 4, cursed.`
    );
  }

  let code;

  if (level === "0") {
    code = await oneLine(source);
  } else if (level === "1") {
    code = await oneLine(source, { compress: true, mangle: true });
  } else {
    code = JavaScriptObfuscator
      .obfuscate(source, obfuscatorOptions(level, seed))
      .getObfuscatedCode();

    // Obfuscation is already compact. This final pass exists for one sacred rule:
    // there can be only one line.
    code = await oneLine(code);
  }

  return {
    code,
    stats: {
      level,
      inputBytes: Buffer.byteLength(source),
      outputBytes: Buffer.byteLength(code),
      ratio: source.length === 0 ? 0 : code.length / source.length,
      inputLines: source === "" ? 0 : source.split(/\r?\n/).length,
      outputLines: code === "" ? 0 : 1
    }
  };
}

export const levels = Object.freeze(["0", "1", "2", "3", "4", "cursed"]);
