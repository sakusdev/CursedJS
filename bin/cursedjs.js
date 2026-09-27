#!/usr/bin/env node

import { readFile, writeFile, rm } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { curse, levels } from "../src/index.js";

function usage() {
  return `
CursedJS — Technically valid JavaScript.

Usage:
  cursedjs <input.js|-> [options]

Options:
  -o, --output <file>       Write output to a file (default: stdout)
  -l, --level <level>       0 | 1 | 2 | 3 | 4 | cursed | abomination | eldritch
      --brainfuck           Alias for --level abomination
      --abomination         Maximum classic AST damage
      --eldritch            JS coercion / character-mining mode
      --seed <number>       Deterministic obfuscator seed (default: 0)
      --stats               Print size/readability damage report to stderr
      --verify              Execute original + cursed code and compare results
  -h, --help                Show this help

Examples:
  cursedjs app.js -o app.cursed.js
  cursedjs app.js --level cursed --stats
  cursedjs app.js --brainfuck --verify -o regret.js
  cursedjs app.js --eldritch --stats -o forbidden.js
  cat app.js | cursedjs - --level 3
`.trim();
}

function parseArgs(argv) {
  const out = {
    input: null,
    output: null,
    level: "cursed",
    seed: 0,
    stats: false,
    verify: false,
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      out.help = true;
    } else if (arg === "-o" || arg === "--output") {
      out.output = argv[++i];
      if (!out.output) throw new Error(`${arg} requires a file path`);
    } else if (arg === "-l" || arg === "--level") {
      const raw = String(argv[++i] ?? "").toLowerCase();
      out.level = raw === "brainfuck" ? "abomination" : raw;
      if (!levels.includes(out.level)) {
        throw new Error(`Invalid level "${raw}"`);
      }
    } else if (arg === "--brainfuck" || arg === "--abomination") {
      out.level = "abomination";
    } else if (arg === "--eldritch") {
      out.level = "eldritch";
    } else if (arg === "--seed") {
      const raw = argv[++i];
      if (raw === undefined || !Number.isFinite(Number(raw))) {
        throw new Error("--seed requires a number");
      }
      out.seed = Number(raw);
    } else if (arg === "--stats") {
      out.stats = true;
    } else if (arg === "--verify") {
      out.verify = true;
    } else if (!out.input) {
      out.input = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return out;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function runFile(filename, cwd) {
  const result = spawnSync(process.execPath, [filename], {
    cwd,
    encoding: "utf8",
    timeout: 5000,
    env: process.env
  });

  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error?.message ?? null
  };
}

async function verifyEquivalent(original, cursed, inputPath) {
  const baseDir = inputPath && inputPath !== "-"
    ? dirname(resolve(inputPath))
    : process.cwd();
  const extension = inputPath && inputPath !== "-"
    ? (extname(inputPath) || ".js")
    : ".js";

  const token = `${process.pid}-${Date.now()}`;
  const originalPath = resolve(baseDir, `.cursedjs-${token}-original${extension}`);
  const cursedPath = resolve(baseDir, `.cursedjs-${token}-cursed${extension}`);

  try {
    await writeFile(originalPath, original, "utf8");
    await writeFile(cursedPath, cursed, "utf8");

    const before = runFile(originalPath, baseDir);
    const after = runFile(cursedPath, baseDir);

    const equal =
      before.status === after.status &&
      before.signal === after.signal &&
      before.stdout === after.stdout &&
      before.stderr === after.stderr &&
      before.error === after.error;

    return { equal, before, after };
  } finally {
    await Promise.allSettled([
      rm(originalPath, { force: true }),
      rm(cursedPath, { force: true })
    ]);
  }
}

function readability(level) {
  if (level === "eldritch") return "language privileges revoked";
  if (level === "abomination") return "beyond recovery";
  return "legally deceased";
}

function printStats(stats) {
  const pct = stats.inputBytes === 0
    ? "n/a"
    : `${(stats.ratio * 100).toFixed(1)}%`;

  console.error("");
  console.error("CursedJS damage report");
  console.error(`  level        ${stats.level}`);
  console.error(`  input        ${stats.inputBytes} bytes / ${stats.inputLines} line(s)`);
  console.error(`  output       ${stats.outputBytes} bytes / ${stats.outputLines} line(s)`);
  console.error(`  size ratio   ${pct}`);

  if (stats.astCrimes) {
    console.error(
      `  AST crimes   ${stats.astCrimes.numbers} numbers, ` +
      `${stats.astCrimes.booleans} booleans, ` +
      `${stats.astCrimes.strings} strings, ` +
      `${stats.astCrimes.properties} properties`
    );
  }

  if (stats.eldritchCrimes) {
    console.error(
      `  glyph mining ${stats.eldritchCrimes.minedCharacters}/` +
      `${stats.eldritchCrimes.characters} chars mined from coercion`
    );
    console.error(
      `  fallbacks    ${stats.eldritchCrimes.codePointFallbacks} String.fromCodePoint calls`
    );
  }

  console.error(`  readability  ${readability(stats.level)}`);
}

async function main() {
  let args;

  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`cursedjs: ${error.message}`);
    console.error("Run cursedjs --help for usage.");
    process.exitCode = 2;
    return;
  }

  if (args.help) {
    console.log(usage());
    return;
  }

  if (!args.input) {
    console.error("cursedjs: missing input file");
    console.error("Run cursedjs --help for usage.");
    process.exitCode = 2;
    return;
  }

  const source = args.input === "-"
    ? await readStdin()
    : await readFile(resolve(args.input), "utf8");

  const result = await curse(source, {
    level: args.level,
    seed: args.seed
  });

  if (args.verify) {
    console.error(
      "cursedjs: --verify executes the input program and transformed program once each."
    );

    const verification = await verifyEquivalent(source, result.code, args.input);
    if (!verification.equal) {
      console.error("cursedjs: verification FAILED");
      console.error(JSON.stringify(verification, null, 2));
      process.exitCode = 1;
      return;
    }

    console.error("cursedjs: verification passed");
  }

  if (args.output) {
    await writeFile(resolve(args.output), result.code, "utf8");
  } else {
    process.stdout.write(result.code);
    if (process.stdout.isTTY) process.stdout.write("\n");
  }

  if (args.stats) printStats(result.stats);
}

main().catch((error) => {
  console.error(`cursedjs: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
