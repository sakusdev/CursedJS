import { minify } from "terser";
import { commitAstCrimes } from "./ast-crimes.js";
import { commitEldritchCrimes } from "./eldritch.js";
import { commitApocalypseCrimes } from "./apocalypse.js";
import { commitSingularityCrimes, singularitySeed } from "./singularity.js";

const CANONICAL_LEVELS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "cursed",
  "abomination",
  "eldritch",
  "apocalypse",
  "singularity"
];

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
    return { ...base, numbersToExpressions: true, stringArray: false };
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

  if (level === "apocalypse" || level === "singularity") {
    return {
      ...base,
      simplify: false,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      numbersToExpressions: false,
      splitStrings: false,
      stringArray: false,
      transformObjectKeys: false,
      unicodeEscapeSequence: false
    };
  }

  if (level === "eldritch") {
    return {
      ...base,
      simplify: false,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.8,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.15,
      numbersToExpressions: false,
      splitStrings: false,
      stringArray: false,
      transformObjectKeys: false,
      unicodeEscapeSequence: false
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

function byteLength(value) {
  if (typeof Buffer !== "undefined") {
    return Buffer.byteLength(value);
  }
  return new TextEncoder().encode(value).byteLength;
}

function randomSalt() {
  const bytes = new Uint8Array(16);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  return [...bytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function curseWithObfuscator(
  JavaScriptObfuscator,
  source,
  options = {}
) {
  if (!JavaScriptObfuscator?.obfuscate) {
    throw new TypeError("A JavaScriptObfuscator implementation is required.");
  }

  if (typeof source !== "string") {
    throw new TypeError("source must be a string");
  }

  const requestedLevel = String(options.level ?? "cursed").toLowerCase();
  if (!VALID_LEVELS.has(requestedLevel)) {
    throw new RangeError(
      `Unknown level "${requestedLevel}". Expected one of: 0, 1, 2, 3, 4, cursed, abomination, eldritch, apocalypse, singularity (brainfuck alias).`
    );
  }

  const level = normalizeLevel(requestedLevel);
  const seed = Number.isFinite(Number(options.seed)) ? Number(options.seed) : 0;
  const buildSalt = level === "singularity"
    ? (
        options.salt === undefined ||
        options.salt === null ||
        String(options.salt).toLowerCase() === "random"
          ? randomSalt()
          : String(options.salt)
      )
    : null;
  const effectiveSeed = level === "singularity"
    ? ((singularitySeed(buildSalt) ^ (seed >>> 0)) >>> 0)
    : seed;

  let code;
  let astCrimes = null;
  let eldritchCrimes = null;
  let apocalypseCrimes = null;
  let singularityCrimes = null;

  if (level === "0") {
    code = await oneLine(source);
  } else if (level === "1") {
    code = await oneLine(source, { compress: true, mangle: true });
  } else {
    let sacrificialSource = source;

    if (level === "singularity") {
      const salted = commitSingularityCrimes(sacrificialSource, {
        salt: buildSalt
      });
      sacrificialSource = salted.code;
      singularityCrimes = salted.stats;
    }

    if (
      level === "abomination" ||
      level === "eldritch" ||
      level === "apocalypse" ||
      level === "singularity"
    ) {
      const committed = commitAstCrimes(sacrificialSource);
      sacrificialSource = committed.code;
      astCrimes = committed.stats;
    }

    if (level === "eldritch") {
      const encoded = commitEldritchCrimes(sacrificialSource);
      sacrificialSource = encoded.code;
      eldritchCrimes = encoded.stats;
    }

    if (level === "apocalypse" || level === "singularity") {
      const encoded = commitApocalypseCrimes(sacrificialSource);
      sacrificialSource = encoded.code;
      apocalypseCrimes = encoded.stats;
    }

    code = JavaScriptObfuscator
      .obfuscate(sacrificialSource, obfuscatorOptions(level, effectiveSeed))
      .getObfuscatedCode();

    code = await oneLine(code);
  }

  const inputBytes = byteLength(source);
  const outputBytes = byteLength(code);

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
      astCrimes,
      eldritchCrimes,
      apocalypseCrimes,
      singularityCrimes
    }
  };
}

export const levels = Object.freeze([...CANONICAL_LEVELS]);
export const aliases = Object.freeze({
  brainfuck: "abomination"
});
