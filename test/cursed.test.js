import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { curse, levels } from "../src/index.js";
import { commitAstCrimes } from "../src/ast-crimes.js";

function execute(code) {
  return spawnSync(process.execPath, ["-e", code], {
    encoding: "utf8",
    timeout: 5000
  });
}

test("exports all canonical curse levels", () => {
  assert.deepEqual(levels, ["0", "1", "2", "3", "4", "cursed", "abomination"]);
});

test("level 0 collapses JavaScript to one line", async () => {
  const input = `
    const answer = 6 * 7;
    console.log(answer);
  `;

  const { code, stats } = await curse(input, { level: 0 });

  assert.equal(code.includes("\n"), false);
  assert.equal(stats.outputLines, 1);
  assert.equal(execute(code).stdout, "42\n");
});

test("cursed mode remains executable and one-line", async () => {
  const input = `
    function greet(name) {
      const message = "Hello, " + name;
      console.log(message);
    }
    greet("World");
  `;

  const { code } = await curse(input, { level: "cursed", seed: 1337 });
  const result = execute(code);

  assert.equal(code.includes("\n"), false);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "Hello, World\n");
});

test("seeded cursed output is deterministic", async () => {
  const source = `console.log("regret")`;
  const a = await curse(source, { level: "cursed", seed: 69 });
  const b = await curse(source, { level: "cursed", seed: 69 });

  assert.equal(a.code, b.code);
});

test("AST crimes preserve ordinary program output", () => {
  const source = `
    const answer = 42;
    const yes = true;
    const thing = { message: "hello" };
    console.log(answer, yes, thing.message);
  `;

  const transformed = commitAstCrimes(source);
  const before = execute(source);
  const after = execute(transformed.code);

  assert.equal(after.status, 0);
  assert.equal(after.stdout, before.stdout);
  assert.ok(transformed.stats.numbers > 0);
  assert.ok(transformed.stats.booleans > 0);
  assert.ok(transformed.stats.strings > 0);
  assert.ok(transformed.stats.properties > 0);
});

test("abomination mode commits AST crimes and stays executable", async () => {
  const source = `
    const answer = 42;
    const data = { value: "hello" };
    console.log(data.value, answer, false);
  `;

  const { code, stats } = await curse(source, {
    level: "abomination",
    seed: 404
  });
  const result = execute(code);

  assert.equal(code.includes("\n"), false);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "hello 42 false\n");
  assert.equal(stats.level, "abomination");
  assert.ok(stats.astCrimes.numbers > 0);
  assert.ok(stats.astCrimes.properties > 0);
});

test("brainfuck is an alias for abomination", async () => {
  const source = `console.log(42)`;
  const result = await curse(source, { level: "brainfuck", seed: 1 });

  assert.equal(result.stats.level, "abomination");
  assert.equal(result.stats.requestedLevel, "brainfuck");
  assert.equal(execute(result.code).stdout, "42\n");
});
