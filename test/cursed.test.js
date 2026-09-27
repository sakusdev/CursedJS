import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { curse, levels } from "../src/index.js";

function execute(code) {
  return spawnSync(process.execPath, ["-e", code], {
    encoding: "utf8",
    timeout: 5000
  });
}

test("exports all curse levels", () => {
  assert.deepEqual(levels, ["0", "1", "2", "3", "4", "cursed"]);
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
