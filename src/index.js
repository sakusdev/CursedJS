import JavaScriptObfuscator from "javascript-obfuscator";
import { minify } from "terser";
import { commitAstCrimes } from "./ast-crimes.js";

const CANONICAL_LEVELS = ["0", "1", "2", "3", "4", "cursed", "abomination"];
const VALID_LEVELS = new Set([...CANONICAL_LEVELS, "brainfuck"]);

function normalizeLevel(level) {
  const normalized = String(level ?? "cursed").toLowerCase();
  return normalized === "brainfuck" ? "abomination" : normalized;
}

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

  if (level === "abomination") {
    return {
      ...base,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 1,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.35,
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
      stringArrayWrappersCount: 5,
      stringArrayWrappersChainedCalls: true,
      stringArrayWrappersParametersMaxCount: 5,
      stringArrayWrappersType: "function",
      transformObjectKeys: true,
      unicodeEscapeSequence: true
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

  const requestedLevel = String(options.level ?? "cursed").toLowerCase();
  if (!VALID_LEVELS.has(requestedLevel)) {
    throw new RangeError(
      `Unknown level "${requestedLevel}". Expected one of: 0, 1, 2, 3, 4, cursed, abomination (brainfuck alias).`
    );
  }

  const level = normalizeLevel(requestedLevel);
  const seed = Number.isFinite(Number(options.seed)) ? Number(options.seed) : 0;
  let code;
  let astCrimes = null;

  if (level === "0") {
    code = await oneLine(source);
  } else if (level === "1") {
    code = await oneLine(source, { compress: true, mangle: true });
  } else {
    let sacrificialSource = source;

    if (level === "abomination") {
      const committed = commitAstCrimes(source);
      sacrificialSource = committed.code;
      astCrimes = committed.stats;
    }

    code = JavaScriptObfuscator
      .obfuscate(sacrificialSource, obfuscatorOptions(level, seed))
      .getObfuscatedCode();

    // Obfuscation is already compact. This final pass exists for one sacred rule:
    // there can be only one line.
    code = await oneLine(code);
  }

  const inputBytes = Buffer.byteLength(source);
  const outputBytes = Buffer.byteLength(code);

  return {
    code,
    stats: {
      level,
      requestedLevel,
      inputBytes,
      outputBytes,
      ratio: inputBytes === 0 ? 0 : outputBytes / inputBytes,
      inputLines: source === "" ? 0 : source.split(/\r?\n/).length,
      outputLines: code === "" ? 0 : 1,
      astCrimes
    }
  };
}

export const levels = Object.freeze([...CANONICAL_LEVELS]);
export const aliases = Object.freeze({
  brainfuck: "abomination"
});
