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
| `eldritch` | Rebuild strings from JavaScript coercion and character mining |

## Eldritch mode

`eldritch` is CursedJS's JSFuck-inspired mode.

It does **not** output the Brainfuck language and it is not a strict JSFuck implementation. Instead, it abuses JavaScript coercion as a character source.

For example:

```js
![] + []
```

evaluates to:

```text
false
```

so CursedJS can mine characters from that result:

```js
(![] + [])[+[]]
```

produces:

```text
f
```

CursedJS also mines characters from coercion-generated strings such as:

```text
false
true
undefined
NaN
[object Object]
```

and stitches those characters back together into your original strings.

Characters that cannot be mined are reconstructed with deliberately cursed numeric expressions passed to `String.fromCodePoint(...)`. That means Japanese text and emoji still survive the transformation.

```bash
cursedjs app.js --eldritch --stats -o forbidden.js
```

Pipeline:

```text
JavaScript
   ↓
AST crimes
   ↓
"hello"
   ↓
character mining
   ├─ coercion source available → (![]+[])[...]
   └─ otherwise → String.fromCodePoint(cursed-number)
   ↓
identifier + control-flow obfuscation
   ↓
ONE LINE
   ↓
forbidden knowledge
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

## Damage report

```bash
cursedjs app.js --eldritch --stats -o app.cursed.js
```

Example:

```text
CursedJS damage report
  level        eldritch
  input        1240 bytes / 48 line(s)
  output       43812 bytes / 1 line(s)
  size ratio   3533.2%
  AST crimes   19 numbers, 4 booleans, 12 strings, 31 properties
  glyph mining 74/103 chars mined from coercion
  fallbacks    29 String.fromCodePoint calls
  readability  language privileges revoked
```

Yes, "compression" can make the file dramatically larger. That's part of the joke.

## Differential-ish verification

```bash
cursedjs app.js --eldritch --verify -o app.cursed.js
```

This executes the original program and the transformed program and compares exit status, stdout, and stderr.

**Warning:** `--verify` runs your program **twice**. Do not use it on code with destructive, external, expensive, or irreversible side effects.

## stdin

```bash
echo 'console.log("help")' | cursedjs - --eldritch
```

## Programmatic API

```js
import { curse } from "@sakusdev/cursedjs";

const result = await curse(`console.log("hello", 42)`, {
  level: "eldritch",
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
optional coercion glyph mining       (eldritch)
   ↓
identifier mangling
control-flow flattening
dead-code injection
   ↓
one-line printer
   ↓
regret
```

CursedJS uses Babel for its custom AST passes, then Terser and javascript-obfuscator for the rest of the pipeline.

## Non-goals

- Security through obscurity
- DRM
- Making JavaScript impossible to reverse
- Good life choices

Obfuscation is not encryption. Do not put secrets in client-side JavaScript and expect CursedJS to protect them.

## License

MIT
