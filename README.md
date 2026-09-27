# CursedJS

> **Technically valid JavaScript.**

CursedJS takes JavaScript, crushes it into **one line**, and progressively destroys its usefulness to human readers.

```js
function greet(name) {
  console.log("Hello, " + name);
}
greet("World");
```

becomes something your runtime can understand and your coworkers cannot.

## Why?

No.

## Install

```bash
npm install
npm link
```

Requires Node.js 20+.

## Usage

```bash
cursedjs input.js -o output.js
```

The default is **`--level cursed`** because this project has priorities.

```bash
cursedjs input.js -o output.js --level 0
cursedjs input.js -o output.js --level 1
cursedjs input.js -o output.js --level 2
cursedjs input.js -o output.js --level 3
cursedjs input.js -o output.js --level 4
cursedjs input.js -o output.js --level cursed
cursedjs input.js -o output.js --level abomination
```

| Level | Crime |
| --- | --- |
| `0` | One-line formatting only |
| `1` | Minify + mangle |
| `2` | Hex-ish identifiers + numeric nonsense |
| `3` | String arrays + split strings |
| `4` | Control-flow flattening + dead-code injection |
| `cursed` | Readability is no longer a project goal |
| `abomination` | Custom AST crimes, then everything above |

## Abomination mode

This is where CursedJS stops being just an obfuscator configuration.

Before the normal obfuscation pipeline, CursedJS parses your program into an AST and deliberately rewrites harmless-looking syntax into worse JavaScript.

For example, a number such as:

```js
42
```

is structurally rewritten toward expressions built from JavaScript coercion and bit shifts:

```js
(+!![] << (+!![] + +!![] + +!![] + +!![] + +!![])) +
(+!![] << (+!![] + +!![] + +!![])) +
(+!![] << +!![])
```

and:

```js
object.property
```

becomes:

```js
object["property"]
```

before the property string itself is fed into the rest of the destruction pipeline.

Boolean literals become array/coercion expressions, multi-character strings are split into concatenation trees, numeric literals are decomposed, and ordinary member access becomes computed access.

Then `javascript-obfuscator` gets the remains.

### Maximum regret shortcut

```bash
cursedjs app.js --abomination -o app.cursed.js
```

For the bit:

```bash
cursedjs app.js --brainfuck -o app.cursed.js
```

`--brainfuck` is intentionally just an alias for `abomination`; CursedJS still emits JavaScript, not the Brainfuck language.

## Damage report

```bash
cursedjs app.js --abomination --stats -o app.cursed.js
```

Abomination mode also reports how many AST nodes were harmed:

```text
CursedJS damage report
  level        abomination
  input        1240 bytes / 48 line(s)
  output       28193 bytes / 1 line(s)
  size ratio   2273.6%
  AST crimes   19 numbers, 4 booleans, 12 strings, 31 properties
  readability  beyond recovery
```

Yes, "compression" can make the file dramatically larger. That's part of the joke.

## Differential-ish verification

```bash
cursedjs app.js --abomination --verify -o app.cursed.js
```

This executes the original program and the transformed program and compares exit status, stdout, and stderr.

**Warning:** `--verify` runs your program **twice**. Do not use it on code with destructive, external, expensive, or irreversible side effects.

## stdin

```bash
echo 'console.log("help")' | cursedjs - --brainfuck
```

## Programmatic API

```js
import { curse } from "@sakusdev/cursedjs";

const result = await curse(`console.log("hello", 42)`, {
  level: "abomination",
  seed: 1337
});

console.log(result.code);
console.log(result.stats);
```

The programmatic API also accepts `level: "brainfuck"` as an alias.

## Design

```text
JavaScript
   ↓
CursedJS AST crimes        (abomination)
   ↓
numeric decomposition
string splitting
boolean coercion
computed property access
   ↓
identifier mangling
string arrays
control-flow flattening
dead-code injection
   ↓
one-line printer
   ↓
regret
```

CursedJS uses Babel for its custom AST pass, then Terser and javascript-obfuscator for the rest of the pipeline.

## Non-goals

- Security through obscurity
- DRM
- Making JavaScript impossible to reverse
- Good life choices

Obfuscation is not encryption. Do not put secrets in client-side JavaScript and expect CursedJS to protect them.

## License

MIT
