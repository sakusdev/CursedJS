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
```

| Level | Crime |
| --- | --- |
| `0` | One-line formatting only |
| `1` | Minify + mangle |
| `2` | Hex-ish identifiers + numeric nonsense |
| `3` | String arrays + split strings |
| `4` | Control-flow flattening + dead-code injection |
| `cursed` | Readability is no longer a project goal |

### Damage report

```bash
cursedjs app.js -o app.cursed.js --stats
```

### Differential-ish verification

```bash
cursedjs app.js -o app.cursed.js --verify
```

This executes the original program and the transformed program and compares exit status, stdout, and stderr.

**Warning:** `--verify` runs your program **twice**. Do not use it on code with destructive or irreversible side effects.

### stdin

```bash
echo 'console.log("help")' | cursedjs - --level cursed
```

## Programmatic API

```js
import { curse } from "@sakusdev/cursedjs";

const result = await curse(`console.log("hello")`, {
  level: "cursed",
  seed: 1337
});

console.log(result.code);
console.log(result.stats);
```

## Design

```text
JavaScript
   ↓
minification / identifier mangling
   ↓
literal + string transformations
   ↓
control-flow flattening
   ↓
dead-code injection
   ↓
one-line printer
   ↓
regret
```

CursedJS currently builds on [Terser](https://github.com/terser/terser) and [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator). The public API is intentionally small so custom AST crimes can be added later.

## Non-goals

- Security through obscurity
- DRM
- Making JavaScript impossible to reverse
- Good life choices

## License

MIT
