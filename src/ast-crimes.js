import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { generate } from "@babel/generator";
import * as t from "@babel/types";\n\nconst traverse = traverseModule.default ?? traverseModule;




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
  const negative = value < 0;
  let remaining = Math.abs(value);

  if (remaining === 0) return zero();

  const terms = [];
  let bit = 0;

  while (remaining > 0) {
    if ((remaining & 1) === 1) {
      terms.push(
        bit === 0
          ? one()
          : t.binaryExpression("<<", one(), tinyInteger(bit))
      );
    }
    remaining >>>= 1;
    bit += 1;
  }

  let expression = terms[0];
  for (let i = 1; i < terms.length; i += 1) {
    expression = t.binaryExpression("+", expression, terms[i]);
  }

  return negative ? t.unaryExpression("-", expression, true) : expression;
}

function splitString(value) {
  const chars = Array.from(value);
  if (chars.length < 2) return t.stringLiteral(value);

  let expression = t.stringLiteral(chars[0]);
  for (let i = 1; i < chars.length; i += 1) {
    expression = t.binaryExpression("+", expression, t.stringLiteral(chars[i]));
  }
  return expression;
}

function isStaticKey(path) {
  const parent = path.parentPath;

  if (
    (parent.isObjectProperty() ||
      parent.isObjectMethod() ||
      parent.isClassMethod() ||
      parent.isClassProperty?.() ||
      parent.isClassPrivateProperty?.()) &&
    parent.node.key === path.node &&
    !parent.node.computed
  ) {
    return true;
  }

  return false;
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

function curseMember(path, stats) {
  if (path.node.computed || !t.isIdentifier(path.node.property)) return;

  path.node.property = t.stringLiteral(path.node.property.name);
  path.node.computed = true;
  stats.properties += 1;
}

export function commitAstCrimes(source) {
  const ast = parse(source, {
    sourceType: "unambiguous",
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true
  });

  const stats = {
    numbers: 0,
    booleans: 0,
    strings: 0,
    properties: 0
  };

  traverse(ast, {
    MemberExpression(path) {
      curseMember(path, stats);
    },

    OptionalMemberExpression(path) {
      curseMember(path, stats);
    },

    NumericLiteral(path) {
      const value = path.node.value;

      if (
        isStaticKey(path) ||
        !Number.isSafeInteger(value) ||
        Math.abs(value) > 0x3fffffff
      ) {
        return;
      }

      path.replaceWith(integerExpression(value));
      stats.numbers += 1;
      path.skip();
    },

    BooleanLiteral(path) {
      if (isStaticKey(path)) return;

      path.replaceWith(
        path.node.value
          ? t.unaryExpression(
              "!",
              t.unaryExpression("!", t.arrayExpression([]), true),
              true
            )
          : t.unaryExpression("!", t.arrayExpression([]), true)
      );
      stats.booleans += 1;
      path.skip();
    },

    StringLiteral(path) {
      if (
        isStaticKey(path) ||
        isModuleSpecifier(path) ||
        path.node.value.length < 2
      ) {
        return;
      }

      path.replaceWith(splitString(path.node.value));
      stats.strings += 1;
      path.skip();
    }
  });

  const result = generate(ast, {
    comments: false,
    compact: true,
    minified: true
  });

  return {
    code: result.code,
    stats
  };
}
