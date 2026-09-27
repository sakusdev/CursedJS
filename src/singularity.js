import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { generate } from "@babel/generator";
import * as t from "@babel/types";

const traverse = traverseModule.default ?? traverseModule;

function hashString(value) {
  let hash = 0x811c9dc5;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 0x100000000;
  };
}

function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

function saltedNoise(random) {
  const a = randomInt(random, 0x1000, 0x7fffffff);
  const b = randomInt(random, 0x1000, 0x7fffffff);
  const style = randomInt(random, 0, 2);

  let expression;

  if (style === 0) {
    expression = t.binaryExpression(
      "+",
      t.binaryExpression("^", t.numericLiteral(a), t.numericLiteral(a)),
      t.binaryExpression("-", t.numericLiteral(b), t.numericLiteral(b))
    );
  } else if (style === 1) {
    expression = t.conditionalExpression(
      t.binaryExpression("===", t.numericLiteral(a), t.numericLiteral(a)),
      t.binaryExpression("^", t.numericLiteral(b), t.numericLiteral(b)),
      t.numericLiteral(1)
    );
  } else {
    expression = t.binaryExpression(
      "|",
      t.binaryExpression("&", t.numericLiteral(a), t.numericLiteral(0)),
      t.binaryExpression("&", t.numericLiteral(b), t.numericLiteral(0))
    );
  }

  return t.expressionStatement(t.unaryExpression("void", expression, true));
}

function insertNoise(container, random, stats, density, force = false) {
  if (!Array.isArray(container.body) || container.body.length === 0) return;
  if (!force && random() > density) return;

  const count = randomInt(random, 1, 3);
  const nodes = Array.from({ length: count }, () => saltedNoise(random));
  const index = randomInt(random, 0, Math.min(container.body.length, 3));

  container.body.splice(index, 0, ...nodes);
  stats.noiseExpressions += count;
  stats.touchedBlocks += 1;
}

export function singularitySeed(salt) {
  return hashString(String(salt));
}

export function saltFingerprint(salt) {
  return singularitySeed(salt).toString(16).padStart(8, "0");
}

export function commitSingularityCrimes(source, options = {}) {
  const salt = String(options.salt ?? "");
  const seed = singularitySeed(salt);
  const random = mulberry32(seed ^ 0xa5a5f00d);
  const density = Math.max(0, Math.min(1, Number(options.density ?? 0.72)));

  const ast = parse(source, {
    sourceType: "unambiguous",
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true
  });

  const stats = {
    saltFingerprint: saltFingerprint(salt),
    noiseExpressions: 0,
    touchedBlocks: 0,
    density
  };

  insertNoise(ast.program, random, stats, density, true);

  traverse(ast, {
    BlockStatement(path) {
      insertNoise(path.node, random, stats, density);
    }
  });

  const result = generate(ast, {
    comments: false,
    compact: true,
    minified: true
  });

  return {
    code: result.code,
    stats,
    seed
  };
}
