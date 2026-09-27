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

const CHAR_MINES = new Map();

function registerMine(text, factory, kind) {
  Array.from(text).forEach((char, index) => {
    if (!CHAR_MINES.has(char)) {
      CHAR_MINES.set(char, { factory, index, kind });
    }
  });
}

registerMine("false", falseString, "coercion");
registerMine("true", trueString, "coercion");
registerMine("undefined", undefinedString, "coercion");
registerMine("NaN", nanString, "coercion");
registerMine("[object Object]", objectString, "coercion");

function minedCharacter(char, stats = null) {
  const mine = CHAR_MINES.get(char);
  if (!mine) return null;

  if (stats) {
    stats.minedCharacters += 1;
    if (mine.kind === "native") stats.nativeMinedCharacters += 1;
  }

  return t.memberExpression(
    mine.factory(),
    integerExpression(mine.index),
    true
  );
}

function encodeMinedString(value, stats = null) {
  const chars = Array.from(value);

  if (chars.length === 0) {
    return t.binaryExpression(
      "+",
      t.arrayExpression([]),
      t.arrayExpression([])
    );
  }

  const pieces = chars.map((char) => {
    const expression = minedCharacter(char, stats);
    if (!expression) {
      throw new Error(
        `Apocalypse bootstrap alphabet cannot encode ${JSON.stringify(char)} in ${JSON.stringify(value)}`
      );
    }
    return expression;
  });

  let expression = pieces[0];
  for (let i = 1; i < pieces.length; i += 1) {
    expression = t.binaryExpression("+", expression, pieces[i]);
  }

  return expression;
}

function regexpConstructorString() {
  return t.binaryExpression(
    "+",
    t.memberExpression(
      t.regExpLiteral("(?:)", ""),
      encodeMinedString("constructor"),
      true
    ),
    t.arrayExpression([])
  );
}

// V8/modern engines expose native functions using NativeFunction syntax.
// RegExp contributes the missing "p" required to bootstrap escape/unescape.
registerMine(
  "function RegExp() { [native code] }",
  regexpConstructorString,
  "native"
);

function functionConstructor() {
  return t.memberExpression(
    t.memberExpression(
      t.arrayExpression([]),
      encodeMinedString("filter"),
      true
    ),
    encodeMinedString("constructor"),
    true
  );
}

function globalFunction(name) {
  return t.callExpression(
    t.callExpression(
      functionConstructor(),
      [encodeMinedString(`return ${name}`)]
    ),
    []
  );
}

function percentCharacter(stats) {
  stats.percentMines += 1;

  const escapedSpace = t.callExpression(
    globalFunction("escape"),
    [encodeMinedString(" ")]
  );

  return t.memberExpression(
    escapedSpace,
    zero(),
    true
  );
}

function digitString(digit) {
  return t.binaryExpression(
    "+",
    integerExpression(Number(digit)),
    t.arrayExpression([])
  );
}

function encodedEscapeSequenceForCodeUnit(codeUnit, stats) {
  const hex = codeUnit.toString(16).padStart(4, "0");
  const pieces = [
    percentCharacter(stats),
    minedCharacter("u", stats)
  ];

  for (const char of hex) {
    if (/^[0-9]$/.test(char)) {
      pieces.push(digitString(char));
    } else {
      pieces.push(minedCharacter(char, stats));
    }
  }

  let expression = pieces[0];
  for (let i = 1; i < pieces.length; i += 1) {
    expression = t.binaryExpression("+", expression, pieces[i]);
  }

  return expression;
}

function encodeFallbackCharacter(char, stats) {
  stats.escapedCharacters += 1;

  const sequences = [];
  for (let i = 0; i < char.length; i += 1) {
    sequences.push(
      encodedEscapeSequenceForCodeUnit(char.charCodeAt(i), stats)
    );
    stats.unicodeCodeUnits += 1;
  }

  let escaped = sequences[0];
  for (let i = 1; i < sequences.length; i += 1) {
    escaped = t.binaryExpression("+", escaped, sequences[i]);
  }

  return t.callExpression(
    globalFunction("unescape"),
    [escaped]
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
    const mined = minedCharacter(char, stats);
    if (mined) return mined;
    return encodeFallbackCharacter(char, stats);
  });

  let expression = pieces[0];
  for (let i = 1; i < pieces.length; i += 1) {
    expression = t.binaryExpression("+", expression, pieces[i]);
  }

  return expression;
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

function isStaticPropertyKey(path) {
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

function makeComputedStaticKey(path, encoded) {
  const parent = path.parentPath;

  if (parent.isObjectProperty()) {
    parent.node.key = encoded;
    parent.node.computed = true;
    return true;
  }

  return false;
}

export function commitApocalypseCrimes(source) {
  const ast = parse(source, {
    sourceType: "unambiguous",
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true
  });

  const stats = {
    strings: 0,
    characters: 0,
    minedCharacters: 0,
    nativeMinedCharacters: 0,
    escapedCharacters: 0,
    unicodeCodeUnits: 0,
    percentMines: 0,
    emptyStrings: 0,
    computedKeys: 0
  };

  traverse(ast, {
    StringLiteral(path) {
      if (isModuleSpecifier(path) || isDirective(path)) {
        return;
      }

      const value = path.node.value;
      const encoded = encodeString(value, stats);

      stats.strings += 1;
      stats.characters += Array.from(value).length;

      if (isStaticPropertyKey(path)) {
        if (makeComputedStaticKey(path, encoded)) {
          stats.computedKeys += 1;
        }
        return;
      }

      path.replaceWith(encoded);
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

export function apocalypseAlphabet() {
  return Object.freeze([...CHAR_MINES.keys()].sort());
}
