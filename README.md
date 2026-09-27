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
cursedjs input.js -o output.js --level eldritch
cursedjs input.js -o output.js --level apocalypse
```

| Level | Crime |
| --- | --- |
| `0` | One-line formatting only |
| `1` | Minify + mangle |
| `2` | Hex-ish identifiers + numeric nonsense |
| `3` | String arrays + split strings |
| `4` | Control-flow flattening + dead-code injection |
| `cursed` | Readability is no longer a project goal |
| `abomination` | Custom AST crimes, then aggressive obfuscation |
| `eldritch` | Rebuild strings from coercion + `String.fromCodePoint` fallback |
| `apocalypse` | Ban `String.fromCodePoint`; bootstrap missing glyphs from JavaScript itself |

## Apocalypse mode

`apocalypse` is the current maximum-regret mode.

```bash
cursedjs app.js --apocalypse --stats --verify -o aftermath.js
```

Unlike `eldritch`, it **does not use `String.fromCodePoint`**.

It begins with boring JavaScript coercions:

```js
![] + []        // "false"
!![] + []       // "true"
[][[]] + []     // "undefined"
+{} + []        // "NaN"
{} + []         // "[object Object]" in expression context
```

Those strings provide most of the bootstrap alphabet.

There is one especially annoying problem: the letter **`p`** is missing.

So CursedJS commits a more serious offense.

A RegExp constructor stringifies to native-function text:

```text
function RegExp() { [native code] }
```

which contains a `p`.

Once `p` exists, CursedJS can build the words:

```text
escape
unescape
```

without writing those words as source string literals.

Then it obtains the legacy global functions through a dynamically constructed `Function`, mines `%` from `escape(" ")`, and reconstructs arbitrary UTF-16 code units as generated `%uXXXX` sequences.

Conceptually:

```text
JavaScript
   ↓
AST crimes
   ↓
false / true / undefined / NaN / [object Object]
   ↓
bootstrap alphabet
   ↓
RegExp native-function text
   ↓
mine the missing "p"
   ↓
construct "return escape" / "return unescape"
   ↓
mine "%"
   ↓
build %uXXXX without source string literals
   ↓
unescape(...)
   ↓
arbitrary Unicode
   ↓
ONE LINE
   ↓
civilization ended
```

Even:

```js
console.log("Hello, 世界 🌎");
```

survives the transformation.

### Damage report

```text
CursedJS damage report
  level        apocalypse
  input        ...
  output       ... / 1 line(s)
  size ratio   ...
  AST crimes   ...
  glyph mining ...
  native mine  ...
  escapes      ...
  fromCodePoint 0 (banned)
  readability  civilization ended
```

### Portability note

`apocalypse` deliberately abuses legacy `escape` / `unescape` globals and native-function stringification. It is tested in CI on Node.js 20 and Node.js 22.

This mode is a joke compiler experiment, not a compatibility strategy.

## Eldritch mode

`eldritch` is the less apocalyptic JSFuck-inspired mode.

It mines characters from:

```text
false
true
undefined
NaN
[object Object]
```

and uses deliberately cursed `String.fromCodePoint(...)` expressions when a character cannot be mined.

```bash
cursedjs app.js --eldritch --stats -o forbidden.js
```

## Abomination mode

Before the normal obfuscation pipeline, CursedJS parses your program into an AST and deliberately rewrites harmless-looking syntax into worse JavaScript.

For example:

```js
42
```

is structurally rewritten toward expressions built from coercion and bit shifts:

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

### Maximum classic regret shortcut

```bash
cursedjs app.js --abomination -o app.cursed.js
```

For the bit:

```bash
cursedjs app.js --brainfuck -o app.cursed.js
```

`--brainfuck` remains an alias for `abomination`.

## Differential-ish verification

```bash
cursedjs app.js --apocalypse --verify -o app.cursed.js
```

This executes the original program and the transformed program and compares exit status, stdout, and stderr.

**Warning:** `--verify` runs your program **twice**. Do not use it on code with destructive, external, expensive, or irreversible side effects.

## stdin

```bash
echo 'console.log("help")' | cursedjs - --apocalypse
```

## Programmatic API

```js
import { curse } from "@sakusdev/cursedjs";

const result = await curse(`console.log("hello", 42)`, {
  level: "apocalypse",
  seed: 1337
});

console.log(result.code);
console.log(result.stats);
```

## Design

```text
JavaScript
   ↓
CursedJS AST crimes
   ↓
coercion glyph mining
   ↓
native-function glyph mining        (apocalypse)
   ↓
UTF-16 escape reconstruction        (apocalypse)
   ↓
identifier mangling / obfuscation
   ↓
one-line printer
   ↓
regret
```

CursedJS uses Babel for its custom AST passes, then Terser and javascript-obfuscator for the rest of the pipeline.

See [docs/APOCALYPSE.md](docs/APOCALYPSE.md) for the v0.4 bootstrap chain.

## Non-goals

- Security through obscurity
- DRM
- Making JavaScript impossible to reverse
- Good life choices

Obfuscation is not encryption. Do not put secrets in client-side JavaScript and expect CursedJS to protect them.

## License

MIT
