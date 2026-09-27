import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { generate } from "@babel/generator";
import * as t from "@babel/types";

const traverse = traverseModule.default ?? traverseModule;

function one() {
  return t.unaryExpression(
    "+",
    t.unaryExpression(
      "!",
      t.unaryExpression("!", t.arrayExpression([]), true),
      true
    ),
    true
  );
}

function zero() {
  return t.unaryExpression("+", t.arrayExpression([]), true);
}

function tinyInteger(value) {
  if (value === 0) return zero();

  let expression = one();
  for (let i = 1; i < value; i += 1) {
    expression = t.binaryExpression("+", expression, one());
  }
  return expression;
}

function integerExpression(value) {
  if (!Number.isSafeInteger(value)) {
    return t.numericLiteral(value);
  }

  const negative = value < 0;
  let remaining = Math.abs(value);

  if (remaining === 0) return zero();

  const terms = [];
  let bit = 0;

  while (remaining > 0) {
    if (remaining % 2 === 1) {
      terms.push(
        bit === 0
          ? one()
          : t.binaryExpression("<<", one(), tinyInteger(bit))
      );
    }

    remaining = Math.floor(remaining / 2);
    bit += 1;
  }

  let expression = terms[0];
  for (let i = 1; i < terms.length; i += 1) {
    expression = t.binaryExpression("+", expression, terms[i]);
  }

  return negative ? t.unaryExpression("-", expression, true) : expression;
}

function falseString() {
  return t.binaryExpression(
    "+",
    t.unaryExpression("!", t.arrayExpression([]), true),
    t.arrayExpression([])
  );
}

function trueString() {
  return t.binaryExpression(
    "+",
    t.unaryExpression(
      "!",
      t.unaryExpression("!", t.arrayExpression([]), true),
      true
    ),
    t.arrayExpression([])
  );
}

function undefinedString() {
  return t.binaryExpression(
    "+",
    t.memberExpression(
      t.arrayExpression([]),
      t.arrayExpression([]),
      true
    ),
    t.arrayExpression([])
  );
}

function nanString() {
  return t.binaryExpression(
    "+",
    t.unaryExpression("+", t.objectExpression([]), true),
    t.arrayExpression([])
  );
}

function objectString() {
  return t.binaryExpression(
    "+",
    t.objectExpression([]),
    t.arrayExpression([])
  );
}

const MINES = [
  ["false", falseString],
  ["true", trueString],
  ["undefined", undefinedString],
  ["NaN", nanString],
  ["[object Object]", objectString]
];

const CHAR_MINES = new Map();

for (const [text, factory] of MINES) {
  for (const [index, char] of Array.from(text).entries()) {
    if (!CHAR_MINES.has(char)) {
      CHAR_MINES.set(char, { factory, index });
    }
  }
}

function minedCharacter(char) {
  const mine = CHAR_MINES.get(char);
  if (!mine) return null;

  return t.memberExpression(
    mine.factory(),
    integerExpression(mine.index),
    true
  );
}

function fromCodePoint(char) {
  const codePoint = char.codePointAt(0);

  return t.callExpression(
    t.memberExpression(
      t.identifier("String"),
      t.identifier("fromCodePoint"),
      false
    ),
    [integerExpression(codePoint)]
  );
}

function encodeString(value, stats) {
  const chars = Array.from(value);

  if (chars.length === 0) {
    stats.emptyStrings += 1;
    return t.binaryExpression(
      "+",
      t.arrayExpression([]),
      t.arrayExpression([])
    );
  }

  const pieces = chars.map((char) => {
    const mined = minedCharacter(char);

    if (mined) {
      stats.minedCharacters += 1;
      return mined;
    }

    stats.codePointFallbacks += 1;
    return fromCodePoint(char);
  });

  let expression = pieces[0];
  for (let i = 1; i < pieces.length; i += 1) {
    expression = t.binaryExpression("+", expression, pieces[i]);
  }

  return expression;
}

function isStaticKey(path) {
  const parent = path.parentPath;

  return (
    (parent.isObjectProperty() ||
      parent.isObjectMethod() ||
      parent.isClassMethod() ||
      parent.isClassProperty?.()) &&
    parent.node.key === path.node &&
    !parent.node.computed
  );
}

function isModuleSpecifier(path) {
  const parent = path.parentPath;

  return (
    (parent.isImportDeclaration() ||
      parent.isExportNamedDeclaration() ||
      parent.isExportAllDeclaration()) &&
    parent.node.source === path.node
  );
}

function isDirective(path) {
  return path.parentPath?.isExpressionStatement() &&
    typeof path.parentPath.node.directive === "string";
}

export function commitEldritchCrimes(source) {
  const ast = parse(source, {
    sourceType: "unambiguous",
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true
  });

  const stats = {
    strings: 0,
    characters: 0,
    minedCharacters: 0,
    codePointFallbacks: 0,
    emptyStrings: 0
  };

  traverse(ast, {
    StringLiteral(path) {
      if (
        isStaticKey(path) ||
        isModuleSpecifier(path) ||
        isDirective(path)
      ) {
        return;
      }

      const value = path.node.value;
      stats.strings += 1;
      stats.characters += Array.from(value).length;
      path.replaceWith(encodeString(value, stats));
      path.skip();
    }
  });

  const result = generate(ast, {
    comments: false,
    compact: true,
    minified: true,
    jsescOption: {
      minimal: true
    }
  });

  return {
    code: result.code,
    stats
  };
}

export function eldritchAlphabet() {
  return Object.freeze([...CHAR_MINES.keys()].sort());
}
